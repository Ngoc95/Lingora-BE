from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_classic.chains import RetrievalQA
from config.env import settings
import os
from typing import Optional
# Cấu hình Embeddings (Phải GIỐNG HỆT lúc nạp dữ liệu)
embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    model_kwargs={'device': 'cpu'}
)

# Cấu hình LLM (Gemini)
# Temperature = 0.3 để câu trả lời chính xác, ít bịa đặt
llm = GoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key=settings.GOOGLE_API_KEY,
    temperature=0.4
)
# --- 2. BỘ NHỚ (MEMORY) ---
CHAT_HISTORY = {}

def get_chat_history(session_id):
    return CHAT_HISTORY.get(session_id, [])

def save_chat_history(session_id, question, answer):
    if session_id not in CHAT_HISTORY: CHAT_HISTORY[session_id] = []
    CHAT_HISTORY[session_id].append((question, answer))
    if len(CHAT_HISTORY[session_id]) > 5: CHAT_HISTORY[session_id].pop(0)

# --- 3. XỬ LÝ XÃ GIAO (CHITCHAT) - QUAN TRỌNG ---
def is_chitchat(question):
    """
    Dùng AI để phân loại xem đây là câu chào hỏi xã giao (Chitchat) 
    hay là câu hỏi cần tra cứu kiến thức (Learning).
    """
    prompt = f"""
    Classify the user input into one of two categories: 'chitchat' or 'learning'.
    
    Definitions:
    - 'chitchat': Greetings (Hello, Hi), personal questions about the bot (Who are you?), closing (Bye), gratitude (Thanks), or general small talk.
    - 'learning': Questions asking for knowledge about English, Grammar, Vocabulary, definitions, examples, translations, or how to use words.
    
    CRITICAL RULE: 
    If the input contains BOTH a greeting and a learning question (e.g., "Hello, what is a noun?"), classify it as 'learning'.
    
    Input: "{question}"
    
    Return ONLY one word: 'chitchat' or 'learning'.
    """
    try:
        # Gọi Gemini để phân loại (nhanh gọn)
        result = llm.invoke(prompt).strip().lower()
        
        # In ra log để bạn theo dõi nó quyết định thế nào
        print(f"🤖 Intent Classifier: '{question}' -> {result.upper()}")
        
        if "chitchat" in result:
            return True
        return False # Mặc định là 'learning' để đi tra sách
    except Exception as e:
        print(f"⚠️ Lỗi phân loại, mặc định tra sách: {e}")
        return False

def handle_chitchat(question, history):
    """Trả lời xã giao thân thiện"""
    history_text = "\n".join([f"User: {q}\nBot: {a}" for q, a in history])
    
    prompt = f"""
    Bạn là trợ lý ảo học tập tên là "Lingora". Tính cách: Thân thiện, hài hước, lễ phép.
    
    [Lịch sử chat]:
    {history_text}
    
    [User nói]: "{question}"
    
    Hãy trả lời người dùng một cách tự nhiên bằng tiếng Việt (không cần tra kiến thức).
    Nếu họ chào, hãy chào lại và mời họ đặt câu hỏi về Tiếng Anh.
    """
    return llm.invoke(prompt)

# --- 4. HÀM VIẾT LẠI CÂU HỎI & DETECT INTENT (Giữ nguyên logic cũ) ---
def contextualize_query(question, history):
    if not history: return question
    
    # Chỉ lấy 2 lượt hỏi đáp gần nhất để tránh nhiễu thông tin quá cũ
    recent_history = history[-2:] 
    history_str = "\n".join([f"User: {q}\nAI: {a}" for q, a in recent_history])
    
    prompt = f"""
    [Chat History]:
    {history_str}
    
    [User's Input]:
    {question}
    
    TASK: Rewrite the User's Input to be a standalone question that can be understood without the chat history.
    RULE: Keep the original intent EXACTLY. Do not narrow down the scope unless the user explicitly asks to.
    
    [Rewritten Question]:
    """
    try:
        return llm.invoke(prompt).strip()
    except:
        return question

def detect_intent(question):
    # Logic cũ
    keywords = ["nghĩa", "mean", "vocab", "từ vựng", "định nghĩa"]
    for k in keywords: 
        if k in question.lower(): return "vocab"
    return "grammar"

# --- 5. LOGIC CHÍNH ĐÃ NÂNG CẤP ---
def get_answer(question: str, type: str = None, session_id: str = "default"):
    history = get_chat_history(session_id)
    
    # --- CHECK 1: CÓ PHẢI XÃ GIAO KHÔNG? ---
    if is_chitchat(question):
        print("💬 Mode: Chitchat (Không tốn công tra sách)")
        response = handle_chitchat(question, history)
        save_chat_history(session_id, question, response)
        return response
    # ----------------------------------------

    # Nếu không phải xã giao -> Quy trình RAG bình thường
    refined_question = contextualize_query(question, history)
    
    if not type or type == "auto":
        type = detect_intent(refined_question)
    
    collection_name = "grammar_collection" if type == "grammar" else "vocab_collection"
    print(f"🔍 Tìm kiếm '{refined_question}' trong {collection_name}")

    vector_store = Chroma(
        persist_directory=settings.CHROMA_DB_DIR,
        embedding_function=embedding_model,
        collection_name=collection_name
    )
    # Tăng k=10 để tìm sâu hơn
    retriever = vector_store.as_retriever(search_kwargs={"k": 10})
    
    # Lấy tài liệu
    docs = retriever.invoke(refined_question)
    context_text = "\n\n".join([doc.page_content for doc in docs])
    
    # Prompt RAG
    final_prompt = f"""
    Bạn là Lingora - một giáo viên Tiếng Anh chuyên nghiệp, thân thiện và am hiểu sâu sắc.
    Nhiệm vụ của bạn là giải thích câu hỏi cho học viên dựa trên kiến thức được cung cấp.

    🔴 QUY TẮC GIAO TIẾP (BẮT BUỘC):
    1. **PHONG CÁCH TỰ NHIÊN:** Trả lời như kiến thức của chính bạn. TUYỆT ĐỐI KHÔNG nói các câu như: "Dựa vào sách", "Theo tài liệu", "Trang 295", "Sách không đề cập".
    2. **XỬ LÝ THIẾU THÔNG TIN:** Nếu ngữ cảnh được cung cấp không đủ, hãy TỰ ĐỘNG bổ sung bằng kiến thức chuyên môn của bạn một cách trôi chảy. Đừng báo cáo "Sách thiếu thông tin".
    3. **KHÔNG TRÍCH DẪN SỐ TRANG:** Hãy loại bỏ mọi số trang, tên chương ra khỏi câu trả lời.
    4. **CẤU TRÚC:** Trình bày ngắn gọn, dễ hiểu, dùng Bullet point nếu liệt kê.

    [Kiến thức nền (để bạn tham khảo)]:
    {context_text}

    [Câu hỏi của học viên]:
    {refined_question}

    👉 Hãy trả lời học viên ngay (Tiếng Việt):
    """
    
    try:
        response_text = llm.invoke(final_prompt)
        save_chat_history(session_id, question, response_text)
        return response_text
    except Exception as e:
        return f"Lỗi hệ thống: {str(e)}"