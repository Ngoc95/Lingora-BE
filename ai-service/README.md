# 🦉 Lingora AI Service (Backend)

**Lingora-BE** là dịch vụ Backend cung cấp trí tuệ nhân tạo cho ứng dụng học Tiếng Anh Lingora. Hệ thống sử dụng kiến trúc **RAG (Retrieval-Augmented Generation)** để trả lời câu hỏi của người dùng dựa trên giáo trình chuẩn (Cambridge English Grammar/Vocabulary in Use) kết hợp với khả năng hội thoại tự nhiên của **Google Gemini**.

## ✨ Tính năng nổi bật

- **📚 RAG (Tra cứu thông minh):** Tìm kiếm kiến thức chính xác từ file PDF giáo trình thay vì trả lời bịa đặt.
- **🧠 Smart Router (Phân loại ý định):** Tự động nhận diện câu hỏi thuộc về _Ngữ pháp_, _Từ vựng_ hay _Xã giao (Chitchat)_ để có chiến lược trả lời phù hợp.
- **💬 Contextual Memory (Nhớ ngữ cảnh):** Có khả năng nhớ lịch sử trò chuyện để trả lời các câu hỏi nối tiếp (Ví dụ: "Cho ví dụ về nó đi").
- **⚡ Local Embeddings:** Sử dụng model `HuggingFace` chạy offline (CPU) để mã hóa dữ liệu, giúp tiết kiệm chi phí và không lo giới hạn Quota API.
- **🗣️ Natural Persona:** Bot đóng vai giáo viên thân thiện, không trả lời máy móc kiểu "Sách nói rằng...".

## 🛠️ Tech Stack

- **Language:** Python 3.10+
- **Framework:** FastAPI
- **LLM Orchestration:** LangChain
- **AI Model:** Google Gemini 1.5 Flash (via Google GenAI)
- **Embeddings:** Sentence-Transformers (`paraphrase-multilingual-MiniLM-L12-v2`)
- **Vector DB:** ChromaDB (Persistent Storage)

---

## 🚀 Cài đặt & Triển khai

### 1\. Yêu cầu tiên quyết

- Python 3.10 trở lên.
- API Key của Google Gemini (Lấy tại Google AI Studio).

### 2\. Thiết lập môi trường

```bash
# Clone dự án
git clone https://github.com/Ngoc95/Lingora-BE.git
cd ai-service

# Tạo môi trường ảo (Khuyên dùng)
python3 -m venv venv
source venv/bin/activate  # MacOS/Linux
# .\venv\Scripts\activate  # Windows

# Cài đặt thư viện (Bản CPU cho nhẹ)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
```

### 3\. Cấu hình (.env)

Tạo file `.env` tại thư mục gốc và điền thông tin:

```env
GOOGLE_API_KEY="AIzaSyD..."  <-- Dán Key của bạn vào đây
CHROMA_DB_DIR="chroma_db_store"
DATA_PATH="data"
```

---

## 💾 Nạp dữ liệu (Ingestion Pipeline)

Trước khi chạy bot, bạn cần nạp kiến thức từ sách PDF vào ChromaDB.

1.  Copy file PDF (ví dụ: `english_grammar_in_use.pdf`) vào thư mục `data/`.
2.  Chạy lệnh nạp dữ liệu:

<!-- end list -->

```bash
python3 -m src.ingest
```

_Lưu ý: Quá trình này sẽ cắt nhỏ file PDF, tạo vector embeddings và lưu vào folder `chroma_db_store`. Chỉ cần chạy 1 lần đầu tiên hoặc khi có sách mới._

---

## ▶️ Chạy Server (API)

Khởi động FastAPI server:

```bash
uvicorn src.main:app --reload
```

Server sẽ chạy tại: `http://localhost:8000`
Tài liệu API (Swagger UI): `http://localhost:8000/docs`

### Ví dụ gọi API

**Endpoint:** `POST /chat`

```json
{
  "question": "Thì hiện tại hoàn thành dùng khi nào?",
  "session_id": "user_12345",
  "type": "auto"
}
```

- `type`: Có thể là `"grammar"`, `"vocab"` hoặc `"auto"` (để AI tự đoán).
- `session_id`: Chuỗi định danh phiên chat để bot nhớ ngữ cảnh.

---

## 🧪 Công cụ Test nhanh (CLI)

Để kiểm tra logic của Bot ngay trên Terminal mà không cần bật Server:

```bash
python3 test_rag.py
```

---

## 📂 Cấu trúc dự án

```text
ai-service/
├── data/                   # Chứa file PDF đầu vào
├── chroma_db_store/        # Cơ sở dữ liệu Vector (Tự sinh ra)
├── src/
│   ├── config/             # Cấu hình biến môi trường
│   ├── ingest.py           # Script nạp & xử lý dữ liệu (ETL)
│   ├── rag.py              # Logic chính (Brain): Search, Prompt, History
│   └── main.py             # API Gateway (FastAPI)
├── .env                    # Biến môi trường (Secrets)
├── requirements.txt        # Danh sách thư viện
├── test_rag.py             # Tool test CLI
└── README.md               # Tài liệu hướng dẫn
```

## 🤝 Đóng góp

Vui lòng tạo Pull Request hoặc mở Issue nếu bạn tìm thấy lỗi.

---

**Developed for Lingora Project.**
