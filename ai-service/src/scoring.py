"""
scoring.py - Scoring Chain cho tổng kết phiên luyện tập

Chức năng:
    Khi user kết thúc 1 conversation session, chain này phân tích toàn bộ
    cuộc hội thoại và cho điểm tổng kết theo 3 tiêu chí:
    - Grammar Score:  Điểm ngữ pháp (0-100)
    - Fluency Score:  Điểm lưu loát (0-100)
    - Overall Score:  Điểm tổng hợp (0-100)

Khi nào được gọi:
    - User bấm "Kết thúc phiên" trên app
    - Hoặc phase tự động chuyển sang "completed"
    - BE gọi endpoint POST /score/conversation-session
"""

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from src.config.env import settings


# ============================================================================
# 1. KHỞI TẠO LLM
# ============================================================================
# Temperature thấp (0.3) → cho điểm ổn định, không quá dao động
scoring_llm = ChatOpenAI(
    model="gpt-4.1-nano",
    openai_api_key=settings.OPENAI_API_KEY,
    temperature=0.3,
)


# ============================================================================
# 2. PYDANTIC MODEL — Schema cho kết quả scoring
# ============================================================================

class SessionScoreResult(BaseModel):
    """Kết quả chấm điểm tổng kết 1 phiên luyện tập."""
    grammar_score: float = Field(
        description="Grammar accuracy score from 0 to 100"
    )
    fluency_score: float = Field(
        description="Fluency and naturalness score from 0 to 100"
    )
    overall_score: float = Field(
        description="Overall performance score from 0 to 100"
    )
    feedback: str = Field(
        description="Brief feedback summary in Vietnamese (2-3 sentences)"
    )


# ============================================================================
# 3. SCORING CHAIN
# ============================================================================

scoring_prompt = ChatPromptTemplate.from_template(
    "You are an English language proficiency evaluator.\n"
    "Analyze the following conversation practice session and provide scores.\n\n"
    "Context: {context}\n"
    "Total messages exchanged: {total_messages}\n"
    "Grammar errors detected: {error_count}\n\n"
    "Conversation transcript:\n"
    "{transcript}\n\n"
    "SCORING CRITERIA:\n"
    "- grammar_score (0-100): Based on error count relative to total messages. "
    "0 errors = 95-100, 1-2 errors = 80-90, 3-5 errors = 60-80, 6+ errors = below 60.\n"
    "- fluency_score (0-100): How natural and flowing the conversation was. "
    "Consider response variety, sentence length, and appropriateness.\n"
    "- overall_score (0-100): Weighted average considering all factors.\n"
    "- feedback: Brief feedback in Vietnamese, highlight strengths and areas to improve.\n\n"
    "Be encouraging but honest. This is a practice session, not an exam."
)

scoring_chain = scoring_prompt | scoring_llm.with_structured_output(SessionScoreResult)


# ============================================================================
# 4. HÀM CHÍNH — Chấm điểm session
# ============================================================================

def score_conversation_session(
    context: str,
    total_messages: int,
    error_count: int,
    transcript: str,
) -> dict:
    """
    Chấm điểm tổng kết 1 phiên conversation.

    Args:
        context:         Tên context (vd: "Du lịch", "Phỏng vấn")
        total_messages:  Tổng số tin nhắn (cả user + AI)
        error_count:     Số lỗi grammar AI đã phát hiện
        transcript:      Nội dung cuộc hội thoại dạng text

    Returns:
        {
            "grammar_score":  85.0,
            "fluency_score":  78.0,
            "overall_score":  81.0,
            "feedback":       "Bạn sử dụng ngữ pháp khá tốt..."
        }
    """
    try:
        result = scoring_chain.invoke({
            "context": context,
            "total_messages": total_messages,
            "error_count": error_count,
            "transcript": transcript,
        })

        print(f"✅ Scoring done — Grammar: {result.grammar_score}, "
              f"Fluency: {result.fluency_score}, Overall: {result.overall_score}")

        return result.model_dump()

    except Exception as e:
        print(f"❌ Scoring Error: {e}")
        # Fallback: tính điểm đơn giản dựa trên error_count
        user_turns = max(total_messages // 2, 1)
        error_rate = error_count / user_turns
        fallback_grammar = max(0, 100 - (error_rate * 30))

        return {
            "grammar_score": round(fallback_grammar, 1),
            "fluency_score": 70.0,
            "overall_score": round((fallback_grammar + 70) / 2, 1),
            "feedback": "Không thể chấm điểm chi tiết lúc này. Hãy thử lại sau.",
        }
