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