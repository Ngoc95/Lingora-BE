"""
conversation.py - Multi-Chain Pipeline cho Chatbot Luyện Hội Thoại

Kiến trúc Pipeline (4 chains, 2 bước):
    User Input
        │
        ├──→ [Chain 1: Error Detection]         ← Sửa lỗi sai
        ├──→ [Chain 2: Response Generation]      ← AI trả lời
        │         (BƯỚC 1: chạy SONG SONG)
        │
        ├──→ [Chain 3: Suggestion Engine]        ← Gợi ý câu tiếp theo
        └──→ [Chain 4: Expression Improvement]   ← Gợi ý cách nói hay hơn
                  (BƯỚC 2: chạy SONG SONG, sau bước 1)

Công nghệ LangChain sử dụng:
    - LCEL (LangChain Expression Language): `prompt | llm` chain composition
    - Pydantic Structured Output: ép LLM trả đúng schema
    - RunnableParallel: 2 lần parallel (Step1: Chain 1+2, Step2: Chain 3+4)
    - ChatPromptTemplate + MessagesPlaceholder: dynamic prompt injection
"""

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnableParallel
from langchain_core.messages import HumanMessage, AIMessage
from pydantic import BaseModel, Field
from typing import List, Optional
from src.config.env import settings


# ============================================================================
# 1. KHỞI TẠO LLM
# ============================================================================
# Dùng chung model với rag.py, nhưng temperature cao hơn cho hội thoại tự nhiên
conversation_llm = ChatOpenAI(
    model="gpt-4.1-nano",
    openai_api_key=settings.OPENAI_API_KEY,
    temperature=0.7,  # Cao hơn (0.7) so với Q&A (0) → câu trả lời đa dạng, tự nhiên
)


# ============================================================================
# 2. PYDANTIC MODELS — Định nghĩa schema output cho từng chain
# ============================================================================
# LLM sẽ bị ÉP phải trả về đúng format này (không trả text tự do)

class ErrorDetail(BaseModel):
    """Chi tiết 1 lỗi cụ thể — hiển thị trên FE dạng list."""
    wrong: str = Field(description="Phần bị sai trong câu (chỉ trích đoạn ngắn, không copy cả câu)")
    correct: str = Field(description="Cách viết đúng")
    explanation: str = Field(description="Giải thích ngắn bằng tiếng Việt")


class CorrectionResult(BaseModel):
    """Output của Chain 1: Error Detection — phát hiện lỗi ngữ pháp."""
    has_error: bool = Field(
        description="True nếu có lỗi ngữ pháp/cấu trúc câu cần sửa"
    )
    errors: List[ErrorDetail] = Field(
        default=[],
        description="Danh sách các lỗi cụ thể (rỗng nếu has_error = false)"
    )


class ConversationResponse(BaseModel):
    """Output của Chain 2: Response Generation — AI trả lời hội thoại."""
    response: str = Field(
        description="Câu trả lời hội thoại tự nhiên bằng tiếng Anh"
    )
    vocabulary_highlight: str = Field(
        default="",
        description="1 từ/cụm từ HỮU ÍCH trong response mà learner nên học (để trống nếu không có)"
    )
    vocabulary_meaning: str = Field(
        default="",
        description="Nghĩa tiếng Việt ngắn gọn của vocabulary_highlight"
    )
    next_phase: str = Field(
        default="",
        description="Phase tiếp theo nếu cần chuyển (opening/developing/closing/completed), "
                    "để trống nếu giữ nguyên phase hiện tại"
    )


class SuggestionResult(BaseModel):
    """Output của Chain 3: Suggestion Engine — gợi ý câu trả lời cho user."""
    suggestions: List[str] = Field(
        description="2-3 câu gợi ý trả lời phù hợp với context và độ khó"
    )
    vocabulary_highlight: str = Field(
        default="",
        description="1 từ/cụm từ HỮU ÍCH trong câu trả lời của AI mà learner nên học (để trống nếu không có)"
    )
    vocabulary_meaning: str = Field(
        default="",
        description="Nghĩa tiếng Việt ngắn gọn của vocabulary_highlight"
    )
    next_phase: str = Field(
        default="",
        description="Phase tiếp theo nếu cần chuyển (opening/developing/closing/completed), "
                    "để trống nếu giữ nguyên phase hiện tại"
    )


class ImprovementResult(BaseModel):
    """Output của Chain 4: Expression Improvement — gợi ý cách nói hay hơn."""
    has_improvement: bool = Field(
        description="True nếu có thể gợi ý cách diễn đạt tốt hơn"
    )
    original: str = Field(
        default="",
        description="Phần câu gốc có thể cải thiện (trích đoạn ngắn)"
    )
    improved: str = Field(
        default="",
        description="Cách nói tự nhiên/hay hơn"
    )
    explanation: str = Field(
        default="",
        description="Giải thích ngắn bằng tiếng Việt tại sao cách nói mới tốt hơn"
    )


# ============================================================================
# 3. CHAIN 1: ERROR DETECTION — Phát hiện lỗi ngữ pháp/từ vựng
# ============================================================================
# Chain này CHUYÊN kiểm tra lỗi, không làm gì khác
# → Prompt nhỏ, tập trung → kết quả chính xác hơn

error_detection_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "You are an English grammar checker for CONVERSATION PRACTICE (not writing).\n"
     "Context: {context}\n"
     "Difficulty level: {difficulty}\n\n"
     "FOCUS ON (important errors):\n"
     "- Wrong tense: 'I go yesterday' → 'I went yesterday'\n"
     "- Missing/wrong articles: 'I want room' → 'I want a room'\n"
     "- Wrong word order: 'How much it cost?' → 'How much does it cost?'\n"
     "- Subject-verb agreement: 'She don't' → 'She doesn't'\n"
     "- Wrong preposition: 'good in math' → 'good at math'\n"
     "- Missing plural: 'many project' → 'many projects'\n\n"
     "ABSOLUTELY IGNORE (NEVER flag these):\n"
     "- Capitalization of ANY kind (nodejs, reactjs, git, python — ALL OK)\n"
     "- Proper noun capitalization (university, vietnam — ALL OK)\n"
     "- Missing periods, commas, or any punctuation\n"
     "- Contractions WITHOUT apostrophes: dont, cant, im, wont, didnt, isnt, \n"
     "  wasnt, havent, wouldnt, couldnt, shouldnt — ALL OK, NEVER flag these\n"
     "- Informal style (wanna, gonna, gotta, lemme, kinda, sorta)\n"
     "- Common informal expressions (long time no see, how are you going, etc)\n"
     "- Spoken idioms and casual phrases\n\n"
     "OUTPUT FORMAT:\n"
     "- CRITICAL: If wrong == correct (no actual change), do NOT include it in errors\n"
     "- CRITICAL: If you can't suggest a different corrected version, it's NOT an error\n"
     "- Each error must have a DIFFERENT 'wrong' vs 'correct' — never the same text\n"
     "- Keep 'wrong' SHORT (just the problematic part, not full sentence)\n"
     "- If ONLY capitalization/punctuation/style issues exist → has_error = false, errors = []\n"
     "- Explanation in Vietnamese, 1 sentence max"),
    ("human", "{user_message}"),
])

error_chain = error_detection_prompt | conversation_llm.with_structured_output(CorrectionResult)


# ============================================================================
# 4. CHAIN 2: RESPONSE GENERATION — AI trả lời hội thoại (có dialogue state)
# ============================================================================
# Chain này nhận system_prompt TỪ DATABASE (conversation_context.system_prompt)
# → Mỗi context (Du lịch, Phỏng vấn...) có prompt khác nhau
# → Linh hoạt thay đổi prompt từ DB mà không cần deploy lại code

response_generation_prompt = ChatPromptTemplate.from_messages([
    ("system",
     # system_prompt lấy từ conversation_context.system_prompt trong DB
     "{system_prompt}\n\n"
     # Dialogue State Management — AI biết đang ở phase nào để hành xử phù hợp
     "=== DIALOGUE STATE ===\n"
     "Current phase: {current_phase}\n"
     "Phase behaviors:\n"
     "- 'opening': Greet warmly, introduce the situation naturally. Keep it brief.\n"
     "- 'developing': Main conversation. Respond naturally, "
     "keep the conversation flowing. This is the longest phase.\n"
     "- 'closing': The learner wants to end. Wrap up naturally, say goodbye.\n\n"
     "Phase transition rules:\n"
     "- Set next_phase='developing' after 1-2 greeting exchanges\n"
     "- Set next_phase='closing' when learner says goodbye/thanks or after ~10 turns\n"
     "- Set next_phase='completed' after your farewell message\n"
     "- Leave next_phase empty ('') to stay in current phase\n\n"
     "=== OBJECTIVES / EXPECTED LEARNER RESPONSES ===\n"
     "Here are some target phrases the learner is expected to practice in this phase:\n"
     "{templates}\n"
     "If applicable, try to naturally steer the conversation or ask questions to encourage the learner to use these phrases or similar ones.\n\n"
     "=== CONVERSATION STYLE ===\n"
     "Speak like a REAL PERSON in casual spoken English:\n"
     "- Use casual words: 'yeah' not 'yes', 'pretty good' not 'very good',\n"
     "  'awesome' not 'that is great', 'gonna' is OK\n"
     "- Do NOT always end with a question. Sometimes just comment or react.\n"
     "- Vary your style: sometimes ask, sometimes share, sometimes react.\n"
     "- If the learner says multiple things, respond to what's interesting.\n"
     "- Use natural reactions: 'Oh nice!', 'No way!', 'Haha yeah'\n"
     "- Keep responses MEDIUM (2-4 sentences). Sound like texting a friend.\n\n"
     "=== VOCABULARY HIGHLIGHT ===\n"
     "Pick 1-3 useful words/phrases from YOUR response that the learner should learn.\n"
     "Examples: 'check in', 'reservation', 'nearby', 'available'\n"
     "Set vocabulary_meaning to its Vietnamese meaning and example sentences.\n"
     "If no interesting vocabulary, leave both empty."),
    # Chat history — các tin nhắn trước đó
    MessagesPlaceholder("history"),
    # Tin nhắn mới nhất của user
    ("human", "{user_message}"),
])

response_chain = response_generation_prompt | conversation_llm.with_structured_output(ConversationResponse)


# ============================================================================
# 5. CHAIN 3: SUGGESTION ENGINE — Gợi ý câu trả lời
# ============================================================================
# Chain này chạy SAU Chain 2, dùng response của AI để tạo gợi ý phù hợp
# → User không biết trả lời gì → bấm gợi ý → fill vào input

suggestion_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "You are a helpful English learning assistant.\n"
     "Generate natural reply suggestions and extract metadata for a {difficulty} level learner.\n"
     "Context: {context}\n"
     "Current conversation phase: {current_phase}\n\n"
     "RULES FOR SUGGESTIONS:\n"
     "- ALL suggestions MUST be in ENGLISH only. NEVER write suggestions in Vietnamese or any other language.\n"
     "- Suggestions must be appropriate responses to what the AI just said\n"
     "- Match the difficulty level: BEGINNER (5-8 words), INTERMEDIATE (8-12 words), ADVANCED (Complex)\n"
     "RULES FOR VOCABULARY:\n"
     "- Pick 1-3 useful words/phrases from the AI's response that the learner should learn.\n"
     "RULES FOR NEXT PHASE:\n"
     "- Set next_phase='developing' after 1-2 greeting exchanges\n"
     "- Set next_phase='closing' when learner says goodbye/thanks or after ~10 turns\n"
     "- Set next_phase='completed' after farewell message\n"
     "- Leave next_phase empty ('') to stay in current phase"),
    ("human", "The AI conversation partner just said: \"{ai_response}\"\n\n"
              "Generate reply suggestions for the learner, extract vocabulary, and determine the next phase:"),
])

suggestion_chain = suggestion_prompt | conversation_llm.with_structured_output(SuggestionResult)


# ============================================================================
# 6. CHAIN 4: EXPRESSION IMPROVEMENT — Gợi ý cách nói hay hơn
# ============================================================================
# Chain này phân biệt với Chain 1 (Error Detection):
#   - Chain 1: sửa lỗi SAI → "I go yesterday" ✗
#   - Chain 4: gợi ý HAY HƠN → "I want to get a room" → "I'd like to book a room" ✓
# Giúp user không chỉ nói ĐÚNG mà còn nói TỰ NHIÊN như người bản xứ

improvement_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "You are an English expression coach for conversation practice.\n"
     "Context: {context}\n"
     "Difficulty level: {difficulty}\n\n"
     "YOUR TASK:\n"
     "Suggest a MORE NATURAL or BETTER way to express what the learner said.\n"
     "This is NOT about grammar errors (another system handles that).\n"
     "This is about making the learner sound more NATIVE and FLUENT.\n\n"
     "EXAMPLES:\n"
     "- 'I want to get a room' → 'I'd like to book a room' (more polite)\n"
     "- 'The food is very good' → 'The food is delicious' (richer vocabulary)\n"
     "- 'I am good at making websites' → 'I specialize in web development' (more professional)\n"
     "- 'Can you say that again?' → 'Could you repeat that, please?' (more natural)\n\n"
     "RULES:\n"
     "- Only suggest if there's a MEANINGFUL improvement\n"
     "- If the learner's expression is already good → has_improvement = false\n"
     "- Keep 'original' SHORT (just the part to improve, not full sentence)\n"
     "- Explanation in Vietnamese, 1 sentence max\n"
     "- Match difficulty: don't suggest advanced idioms for BEGINNER"),
    ("human", "{user_message}"),
])

improvement_chain = improvement_prompt | conversation_llm.with_structured_output(ImprovementResult)


# ============================================================================
# 6. HELPER — Convert history sang format LangChain
# ============================================================================

def _build_history(history: Optional[list] = None) -> list:
    """
    Chuyển đổi history từ format API (list of dict) sang format LangChain.
    
    Input format (từ Express BE):
        [{"sender": "USER", "content": "Hello"}, {"sender": "AI", "content": "Hi!"}]
    
    Output format (LangChain):
        [HumanMessage("Hello"), AIMessage("Hi!")]
    """
    if not history:
        return []

    lc_messages = []
    for entry in history:
        # Hỗ trợ cả dict và Pydantic model
        if isinstance(entry, dict):
            sender = entry.get("sender", "")
            content = entry.get("content", "")
        else:
            sender = getattr(entry, "sender", "")
            content = getattr(entry, "content", "")

        if not content:
            continue

        if str(sender).upper() == "USER":
            lc_messages.append(HumanMessage(content=content))
        else:
            lc_messages.append(AIMessage(content=content))

    # Giới hạn 10 messages gần nhất (5 lượt qua lại) để tránh tốn token
    return lc_messages[-10:]


# ============================================================================
# 7. PIPELINE CHÍNH — Kết hợp 3 chains
# ============================================================================

def get_conversation_answer(
    question: str,
    system_prompt: str,
    context: str,
    difficulty: str,
    current_phase: str,
    history: Optional[list] = None,
    templates: Optional[list] = None,
) -> dict:
    """
    Xử lý 1 lượt hội thoại qua pipeline 3 chains.

    Args:
        question:       Câu user gõ (tiếng Anh)
        system_prompt:  Prompt từ conversation_context.system_prompt trong DB
        context:        Tên/mô tả context (vd: "Travel", "Job Interview")
        difficulty:     Độ khó: "BEGINNER" / "INTERMEDIATE" / "ADVANCED"
        current_phase:  Phase hiện tại: "opening" / "developing" / "closing"
        history:        Lịch sử chat [{"sender": "USER/AI", "content": "..."}]

    Returns:
        {
            "response":    "AI reply in English",
            "correction":  {"has_error": bool, "original": "", "corrected": "", "explanation": ""},
            "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
            "next_phase":  "developing" | "" (trống = giữ nguyên)
        }
    """
    # Convert history sang format LangChain
    lc_history = _build_history(history)

    # Chuẩn bị input chung cho các chains
    shared_input = {
        "user_message": question,
        "system_prompt": system_prompt,
        "context": context,
        "difficulty": difficulty,
        "current_phase": current_phase,
        "history": lc_history,
        "templates": "\n".join([f"- {t}" for t in templates]) if templates else "No specific objectives.",
    }

    try:
        # ──────────────────────────────────────────────────────────────────
        # BƯỚC 1: Chạy SONG SONG — Error Detection + Response Generation
        # ──────────────────────────────────────────────────────────────────
        # RunnableParallel gửi 2 request LLM cùng lúc → giảm ~40% latency

        step1_chains = RunnableParallel(
            correction=error_chain,       # Chain 1: kiểm tra lỗi
            conversation=response_chain,  # Chain 2: tạo response
        )

        step1_result = step1_chains.invoke(shared_input)

        ai_response = step1_result["conversation"].response
        next_phase = step1_result["conversation"].next_phase
        vocab_highlight = step1_result["conversation"].vocabulary_highlight
        vocab_meaning = step1_result["conversation"].vocabulary_meaning
        correction = step1_result["correction"]

        print(f"✅ Step 1 done — Response: {ai_response[:50]}... | Phase: {next_phase or 'giữ nguyên'}")

        # ──────────────────────────────────────────────────────────────────
        # BƯỚC 2: Chạy SONG SONG — Suggestion + Improvement
        # ──────────────────────────────────────────────────────────────────
        # Chain 3 cần response AI (từ bước 1) → gợi ý câu tiếp theo
        # Chain 4 cần user_message → gợi ý cách nói hay hơn
        # Cả 2 KHÔNG phụ thuộc nhau → chạy song song!

        step2_chains = RunnableParallel(
            suggestions=suggestion_chain,     # Chain 3: gợi ý câu tiếp
            improvement=improvement_chain,    # Chain 4: cải thiện diễn đạt
        )

        step2_result = step2_chains.invoke({
            # Input cho Chain 3
            "ai_response": ai_response,
            "context": context,
            "difficulty": difficulty,
            "current_phase": next_phase or current_phase,
            # Input cho Chain 4
            "user_message": question,
        })

        suggestions = step2_result["suggestions"].suggestions
        improvement = step2_result["improvement"]

        print(f"✅ Step 2 done — Suggestions: {suggestions}")
        if improvement.has_improvement:
            print(f"✅ Improvement: '{improvement.original}' → '{improvement.improved}'")

        # ──────────────────────────────────────────────────────────────────
        # KẾT QUẢ: Gom 4 outputs lại
        # ──────────────────────────────────────────────────────────────────

        return {
            "response": ai_response,
            "correction": correction.model_dump(),
            "suggestions": suggestions,
            "improvement": improvement.model_dump(),
            "vocabulary_highlight": vocab_highlight,
            "vocabulary_meaning": vocab_meaning,
            "next_phase": next_phase or "",
        }

    except Exception as e:
        print(f"❌ Conversation Pipeline Error: {e}")
        return {
            "response": "I'm sorry, could you say that again? I didn't quite catch that.",
            "correction": {"has_error": False, "errors": []},
            "suggestions": ["Could you repeat that?", "Let me try again."],
            "improvement": {"has_improvement": False, "original": "", "improved": "", "explanation": ""},
            "vocabulary_highlight": "",
            "vocabulary_meaning": "",
        }

# ============================================================================
# 8. OPENING MESSAGE — AI chào đầu tiên khi tạo session
# ============================================================================

def generate_opening_message(
    system_prompt: str,
    context: str,
    difficulty: str,
    templates: Optional[list] = None,
) -> dict:
    """
    AI tạo câu chào mở đầu khi user vừa chọn context và tạo session.
    Được gọi bởi BE khi POST /conversation/sessions.

    Chỉ dùng Chain 2 (Response) + Chain 3 (Suggestions).
    KHÔNG dùng Chain 1 (Error Detection) vì user chưa nói gì.

    Args:
        system_prompt:  Prompt từ conversation_context.system_prompt
        context:        Tên context (vd: "Travel")
        difficulty:     Độ khó

    Returns:
        {
            "response":    "Welcome to our hotel! How can I help you?",
            "suggestions": ["I'd like to check in", "Do you have rooms?", "..."],
        }
    """
    try:
        # Chain 2: AI tạo lời chào (phase = opening, chưa có history)
        greeting = response_chain.invoke({
            "user_message": "[The learner just joined. Start the conversation with a greeting.]",
            "system_prompt": system_prompt,
            "context": context,
            "difficulty": difficulty,
            "current_phase": "opening",
            "history": [],
            "templates": "\n".join([f"- {t}" for t in templates]) if templates else "No specific objectives.",
        })

        print(f"✅ Opening message: {greeting.response[:50]}...")

        # Chain 3: Gợi ý câu trả lời đầu tiên cho user
        suggestions = suggestion_chain.invoke({
            "ai_response": greeting.response,
            "context": context,
            "difficulty": difficulty,
            "current_phase": "opening",
        })

        print(f"✅ Opening suggestions: {suggestions.suggestions}")

        return {
            "response": greeting.response,
            "suggestions": suggestions.suggestions,
        }

    except Exception as e:
        print(f"❌ Opening Message Error: {e}")
        return {
            "response": "Hello! Nice to meet you. How can I help you today?",
            "suggestions": ["Hi! Nice to meet you too.", "Hello! I need some help."],
        }
