from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
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
class ChatRequest(BaseModel):
    question: str
    type: Optional[str] = None

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
    if request.type not in ["grammar", "vocab"]:
        raise HTTPException(status_code=400, detail="Type must be 'grammar' or 'vocab'")
    
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # Gọi hàm logic bên file rag.py
    answer = get_answer(request.question, request.type)
    
    return {"answer": answer}