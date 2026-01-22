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