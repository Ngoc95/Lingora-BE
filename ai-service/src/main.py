from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from src.rag import get_answer
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Lingora AI Service 🤖")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cho phép mọi nguồn (Frontend) gọi vào. Khi ra production nên đổi thành ["https://your-frontend.com"]
    allow_credentials=True,
    allow_methods=["*"],  # Cho phép tất cả các method (POST, GET...)
    allow_headers=["*"],
)
# Định nghĩa dữ liệu đầu vào (Request Body)
class HistoryMessage(BaseModel):
    sender: str
    content: str

class ChatRequest(BaseModel):
    question: str
    type: Optional[str] = None
    session_id: Optional[str] = None
    history: Optional[List[HistoryMessage]] = None

@app.get("/")
def read_root():
    return {"message": "Lingora AI Service is Running! 🚀"}

@app.post("/chat")
def chat_endpoint(request: ChatRequest):
    """
    API nhận câu hỏi và trả về câu trả lời từ AI.
    Ví dụ body:
    {
        "question": "Thì hiện tại đơn dùng khi nào?",
        "type": "grammar"
    }
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # Gọi hàm logic bên file rag.py
    answer = get_answer(
        question=request.question,
        type=request.type,
        session_id=request.session_id or "default",
        history=request.history,
    )
    
    return {"answer": answer}
class TitleRequest(BaseModel):
    question: str

@app.post("/generate-title")
def title_endpoint(request: TitleRequest):
    from src.rag import generate_chat_title
    title = generate_chat_title(request.question)
    return {"title": title}

class GradeWritingRequest(BaseModel):
    question: str
    answer: str

class GradeSpeakingRequest(BaseModel):
    question: str
    audio_url: str

@app.post("/score/writing")
def score_writing_endpoint(request: GradeWritingRequest):
    from src.grading import grade_writing
    result = grade_writing(request.question, request.answer)
    return result

@app.post("/score/speaking")
def score_speaking_endpoint(request: GradeSpeakingRequest):
    from src.grading import transcribe_audio, grade_speaking
    
    # 1. Transcribe the audio
    transcript = transcribe_audio(request.audio_url)
    if not transcript:
        raise HTTPException(status_code=400, detail="Failed to transcribe audio")
        
    # 2. Grade the transcript
    result = grade_speaking(request.question, transcript)
    
    # 3. Return combined result
    return {
        "score": result.score,
        "feedback": result.feedback,
        "corrected_version": result.corrected_version,
        "transcript": transcript
    }

class ModerationRequest(BaseModel):
    text: str

@app.post("/moderate")
def moderate_endpoint(request: ModerationRequest):
    from src.moderation import moderate_content
    result = moderate_content(request.text)
    return result


class OpeningRequest(BaseModel):
    """Request body cho tạo câu chào đầu tiên."""
    system_prompt: str       # Lấy từ conversation_context.system_prompt (DB)
    context: str             # Tên context (vd: "Travel")
    difficulty: str = "BEGINNER"

@app.post("/chat/conversation/opening")
def conversation_opening_endpoint(request: OpeningRequest):
    """
    AI tạo câu chào đầu tiên khi user vừa chọn context.
    Được gọi bởi Express BE khi tạo session mới.

    Returns:
        {
            "response": "Welcome! How can I help?",
            "suggestions": ["I'd like to check in", "..."]
        }
    """
    from src.conversation import generate_opening_message

    result = generate_opening_message(
        system_prompt=request.system_prompt,
        context=request.context,
        difficulty=request.difficulty,
    )
    return result


class ConversationRequest(BaseModel):
    """Request body cho endpoint luyện hội thoại."""
    question: str                                    # Câu user gõ
    system_prompt: str                               # Lấy từ conversation_context.system_prompt (DB)
    context: str                                     # Tên/mô tả context (vd: "Travel")
    difficulty: str = "BEGINNER"                     # BEGINNER / INTERMEDIATE / ADVANCED
    current_phase: str = "opening"                   # opening / developing / closing
    history: Optional[List[HistoryMessage]] = None   # Lịch sử chat

@app.post("/chat/conversation")
def conversation_endpoint(request: ConversationRequest):
    """
    API cho chatbot luyện hội thoại — sử dụng multi-chain pipeline.

    Pipeline gồm 4 chains (2 bước song song):
      Bước 1 (song song): Error Detection + Response Generation
      Bước 2 (song song): Suggestion Engine + Expression Improvement

    Returns:
        {
            "response": "AI reply",
            "correction": {"has_error": bool, "errors": [{"wrong": "", "correct": "", "explanation": ""}]},
            "suggestions": ["suggestion 1", "suggestion 2"],
            "improvement": {"has_improvement": bool, "original": "", "improved": "", "explanation": ""},
            "next_phase": "developing" | ""
        }
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    from src.conversation import get_conversation_answer

    # Convert history sang format dict (nếu là Pydantic model)
    history_dicts = None
    if request.history:
        history_dicts = [{"sender": h.sender, "content": h.content} for h in request.history]

    result = get_conversation_answer(
        question=request.question,
        system_prompt=request.system_prompt,
        context=request.context,
        difficulty=request.difficulty,
        current_phase=request.current_phase,
        history=history_dicts,
    )

    return result


# ============================================================================
# SESSION SCORING — Chấm điểm tổng kết phiên
# ============================================================================

class SessionScoreRequest(BaseModel):
    """Request body cho endpoint chấm điểm session."""
    context: str                # Tên context (vd: "Du lịch")
    total_messages: int         # Tổng số tin nhắn
    error_count: int            # Số lỗi grammar
    transcript: str             # Nội dung cuộc hội thoại

@app.post("/score/conversation-session")
def score_session_endpoint(request: SessionScoreRequest):
    """
    API chấm điểm tổng kết 1 phiên conversation.
    Được gọi khi user kết thúc phiên hoặc phase = completed.

    Returns:
        {
            "grammar_score": 85.0,
            "fluency_score": 78.0,
            "overall_score": 81.0,
            "feedback": "Bạn sử dụng ngữ pháp khá tốt..."
        }
    """
    from src.scoring import score_conversation_session

    result = score_conversation_session(
        context=request.context,
        total_messages=request.total_messages,
        error_count=request.error_count,
        transcript=request.transcript,
    )

    return result