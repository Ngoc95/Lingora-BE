from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_tavily import TavilySearch
from langchain_core.tools import tool
from langchain_classic.agents import create_openai_tools_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.globals import set_llm_cache
from langchain_community.cache import InMemoryCache
from src.config.env import settings
from typing import Any, Iterable, Optional, Sequence
import os

# --- 1. CẤU HÌNH CƠ BẢN ---
# Setup Tavily Key
os.environ["TAVILY_API_KEY"] = settings.TAVILY_API_KEY

set_llm_cache(InMemoryCache())

# Setup Embeddings
embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    model_kwargs={'device': 'cpu'}
)

# Setup LLM (Gemini)
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash", # Hoặc 1.5-flash
    google_api_key=settings.GOOGLE_API_KEY,
    temperature=0 # Để Agent ra quyết định chính xác, nên để temp thấp
)

# --- 2. BỘ NHỚ (MEMORY) ---
# Vẫn dùng cách lưu dictionary đơn giản của bạn, nhưng tí nữa sẽ convert
CHAT_HISTORY = {}

def get_chat_history(session_id):
    return CHAT_HISTORY.get(session_id, [])

def save_chat_history(session_id, question, answer):
    if session_id not in CHAT_HISTORY: CHAT_HISTORY[session_id] = []
    CHAT_HISTORY[session_id].append((question, answer))
    if len(CHAT_HISTORY[session_id]) > 10: CHAT_HISTORY[session_id].pop(0)

def build_langchain_history(history_payload: Optional[Iterable[Any]], session_id: str):
    lc_history = []

    if history_payload:
        for entry in history_payload:
            sender = None
            content = None

            if isinstance(entry, dict):
                sender = entry.get("sender")
                content = entry.get("content")
            else:
                sender = getattr(entry, "sender", None)
                content = getattr(entry, "content", None)

            if not content:
                continue

            if str(sender).upper() == "USER":
                lc_history.append(HumanMessage(content=content))
            else:
                lc_history.append(AIMessage(content=content))

    else:
        raw_history = get_chat_history(session_id)
        for q, a in raw_history:
            lc_history.append(HumanMessage(content=q))
            lc_history.append(AIMessage(content=a))

    return lc_history[-6:]

# --- 3. ĐỊNH NGHĨA CÔNG CỤ (TOOLS) ---
# Agent sẽ nhìn vào docstring ("""...""") để biết khi nào dùng tool nào.

@tool
def lookup_grammar_book(query: str):
    """
    Dùng công cụ này để tra cứu kiến thức về Ngữ pháp Tiếng Anh (Grammar), 
    cấu trúc câu (Sentence Structure), các thì (Tenses) trong sách giáo khoa.
    """
    print(f"📘 [Tool] Đang tra sách Ngữ pháp: {query}")
    try:
        vector_store = Chroma(
            persist_directory=settings.CHROMA_DB_DIR,
            embedding_function=embedding_model,
            collection_name="grammar_collection"
        )
        retriever = vector_store.as_retriever(search_kwargs={"k": 4})
        docs = retriever.invoke(query)
        return "\n\n".join([doc.page_content for doc in docs])
    except Exception as e:
        print(f"❌ Lỗi khi tra sách Ngữ pháp: {e}")
        return "Sách giáo khoa không đề cập chi tiết. Hãy sử dụng kiến thức chuyên môn của bạn để giải thích đầy đủ cho học viên."

@tool
def lookup_vocab_book(query: str):
    """
    Dùng công cụ này để tra cứu Từ vựng (Vocabulary), định nghĩa từ (Definition),
    thành ngữ (Idioms) hoặc cụm từ trong sách giáo khoa.
    """
    print(f"📗 [Tool] Đang tra sách Từ vựng: {query}")
    try:
        vector_store = Chroma(
            persist_directory=settings.CHROMA_DB_DIR,
            embedding_function=embedding_model,
            collection_name="vocab_collection"
        )
        retriever = vector_store.as_retriever(search_kwargs={"k": 4})
        docs = retriever.invoke(query)
        return "\n\n".join([doc.page_content for doc in docs])
    except Exception as e:
        print(f"❌ Lỗi khi tra sách Từ vựng: {e}")
        return "Sách giáo khoa không đề cập chi tiết. Hãy sử dụng kiến thức chuyên môn của bạn để giải thích đầy đủ cho học viên."

# Tool Search Google (Tavily)
search_web_tool = TavilySearch(
    max_results=3,
    description="Dùng công cụ này để tìm kiếm thông tin KHÔNG có trong sách giáo khoa, kiến thức xã hội, hoặc các từ lóng (slang) mới nhất."
)

# Gom tất cả tools lại
tools = [lookup_grammar_book, lookup_vocab_book, search_web_tool]

# --- 4. TẠO AGENT ---
def create_lingora_agent():
    # Prompt System cho Agent
    system_prompt = """
    Bạn là LingoraBot - Trợ lý ảo dạy Tiếng Anh.
    Bạn có 3 công cụ: Sách Ngữ Pháp, Sách Từ Vựng, Google Search.

    NHIỆM VỤ DUY NHẤT:
    - Xử lý và trả lời câu hỏi MỚI NHẤT của người dùng (nằm trong biến input).

    🔴 QUY TẮC "VÀNG" KHI DÙNG LỊCH SỬ (IGNORE HISTORY CONTENT):
    1. **IGNORE PREVIOUS ANSWERS:** Lịch sử chat chỉ để bạn hiểu ngữ cảnh (ví dụ user nói "nó là gì" thì tìm trong lịch sử xem "nó" là gì).
    2. **CẤM LẶP LẠI:** Tuyệt đối KHÔNG nhắc lại, không tóm tắt, không copy-paste bất kỳ nội dung nào của các câu trả lời trước đó.
    3. **CÂU TRẢ LỜI ĐỘC LẬP:** Câu trả lời của bạn phải mới hoàn toàn, đi thẳng vào vấn đề của câu hỏi mới. Không bắt đầu bằng "Như đã nói...", "Về câu hỏi trước...".

    QUY TẮC KHÁC:
    - Trả lời bằng Tiếng Việt tự nhiên, thân thiện.
    - Nếu sách không có, dùng kiến thức của bạn, KHÔNG được xin lỗi.
    - Không nhắc tên công cụ (lookup...).
    """
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="chat_history"), # Nơi nhét lịch sử vào
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"), # Nơi Agent suy nghĩ
    ])

    # Tạo Agent
    agent = create_openai_tools_agent(llm, tools, prompt)
    
    # Executor là bộ máy chạy Agent
    agent_executor = AgentExecutor(
        agent=agent, 
        tools=tools, 
        verbose=True, # Bật True để nhìn thấy suy nghĩ của Agent trên terminal
        handle_parsing_errors=True
    )
    return agent_executor

# Khởi tạo 1 lần dùng chung
lingora_agent = create_lingora_agent()

# --- 5. HÀM CHÍNH (ĐƯỢC GỌI TỪ API) ---
def get_answer(question: str, type: str = None, session_id: str = "default", history: Optional[Sequence[dict]] = None):
    lc_history = build_langchain_history(history, session_id)
    
    print(f"🤖 Agent đang suy nghĩ cho session: {session_id}...; có history: {len(lc_history)}")

    try:
        # 3. Chạy Agent
        print(f"question: {question}")
        result = lingora_agent.invoke({
            "input": question,
            "chat_history": lc_history
        })
        print(f"result: {result}")
        raw_output = result['output']
        final_response = ""
        # Trường hợp 1: Nó trả về chuỗi bình thường (Ngon)
        if isinstance(raw_output, str):
            final_response = raw_output
            
        # Trường hợp 2: Nó trả về List (như cái lỗi bạn gặp)
        elif isinstance(raw_output, list):
            for part in raw_output:
                # Nếu là chuỗi thì cộng vào
                if isinstance(part, str):
                    final_response += part
                # Nếu là Dictionary (có chứa 'text') thì lấy phần text
                elif isinstance(part, dict) and 'text' in part:
                    final_response += part['text']
        
        # Trường hợp 3: Nó trả về Object lạ -> Ép sang string
        else:
            final_response = str(raw_output)
        # 4. Lưu lại lịch sử
        if history is None:
            save_chat_history(session_id, question, final_response)
        
        return final_response

    except Exception as e:
        print(f"❌ Agent Error: {e}")
        return "Xin lỗi, hệ thống đang gặp chút trục trặc khi suy nghĩ. Bạn hỏi lại thử xem?"

def generate_chat_title(question: str):
    prompt = f"""
    Nhiệm vụ: Tóm tắt câu hỏi sau thành một TIÊU ĐỀ ngắn gọn, súc tích (dưới 6 từ).
    Yêu cầu:
    - Bỏ các từ thừa như "cho mình hỏi", "làm sao để", "là gì".
    - Giữ lại từ khóa chính.
    - Viết hoa chữ cái đầu.
    - Ví dụ: "Thì hiện tại đơn dùng khi nào" -> "Cách dùng thì Hiện tại đơn"
    
    Câu hỏi: "{question}"
    
    Tiêu đề:
    """
    try:
        # Gọi LLM (dùng biến llm đã khai báo ở trên)
        title = llm.invoke(prompt).content
        
        # Làm sạch chuỗi (bỏ ngoặc kép, khoảng trắng thừa)
        return title.strip().replace('"', '').replace("'", "")
    except Exception:
        # Fallback nếu AI lỗi: Cắt chuỗi thủ công
        return question[:50] + "..."