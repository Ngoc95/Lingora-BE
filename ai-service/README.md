# 🦉 Lingora AI Service (Backend)

**Lingora-BE** là dịch vụ Backend cung cấp trí tuệ nhân tạo cho ứng dụng học Tiếng Anh Lingora. Hệ thống sử dụng kiến trúc **RAG (Retrieval-Augmented Generation)** để trả lời câu hỏi của người dùng dựa trên giáo trình chuẩn (Cambridge English Grammar/Vocabulary in Use) kết hợp với khả năng hội thoại tự nhiên của **Google Gemini**.

## ✨ Tính năng nổi bật

- **📚 RAG (Tra cứu thông minh):** Tìm kiếm kiến thức chính xác từ file PDF giáo trình thay vì trả lời bịa đặt.
- **🧠 Smart Router (Phân loại ý định):** Tự động nhận diện câu hỏi thuộc về _Ngữ pháp_, _Từ vựng_ hay _Xã giao (Chitchat)_ để có chiến lược trả lời phù hợp.
- **💬 Contextual Memory (Nhớ ngữ cảnh):** Có khả năng nhớ lịch sử trò chuyện để trả lời các câu hỏi nối tiếp (Ví dụ: "Cho ví dụ về nó đi").
- **⚡ OpenAI Embeddings:** Sử dụng OpenAI embeddings (`text-embedding-3-small`) để mã hóa dữ liệu, nhanh chóng và chính xác.
- **🗣️ Natural Persona:** Bot đóng vai giáo viên thân thiện, không trả lời máy móc kiểu "Sách nói rằng...".
- **🐳 Docker Support:** Hỗ trợ chạy với Docker, tự động tải dataset và setup khi cần.

## 🛠️ Tech Stack

- **Language:** Python 3.10+
- **Framework:** FastAPI
- **LLM Orchestration:** LangChain
- **AI Model:** Google Gemini 2.5 Flash (via Google GenAI)
- **Embeddings:** OpenAI (`text-embedding-3-small`)
- **Vector DB:** ChromaDB (Persistent Storage)

---

## 🚀 Cài đặt & Triển khai

### 1. Yêu cầu tiên quyết

- Python 3.10 trở lên
- API Key của Google Gemini (Lấy tại [Google AI Studio](https://makersuite.google.com/app/apikey))
- API Key của OpenAI (Lấy tại [OpenAI Platform](https://platform.openai.com/api-keys))

### 2. Thiết lập môi trường

```bash
# Clone dự án
git clone https://github.com/Ngoc95/Lingora-BE.git
cd ai-service

# Tạo môi trường ảo (Khuyên dùng)
python3 -m venv venv
source venv/bin/activate  # MacOS/Linux
# .\venv\Scripts\activate  # Windows

# Cài đặt thư viện
pip install -r requirements.txt
```

### 3. Cấu hình (.env)

Tạo file `.env` tại thư mục gốc và điền thông tin:

```env
# API Keys
GOOGLE_API_KEY="AIzaSyD..."
OPENAI_API_KEY="sk-..."
TAVILY_API_KEY="your_tavily_key"

# Paths
CHROMA_DB_DIR="chroma_db_store"
DATA_PATH="data"

# Google Drive URLs (sharing links)
GRAMMAR_PDF_URL="https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing"
VOCAB_PDF_URL="https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing"
```

**Lưu ý về Google Drive URLs:**

1. Upload PDF lên Google Drive
2. Right-click → Share → Chọn "Anyone with the link"
3. Copy link và paste vào `.env`

---

## 💾 Nạp dữ liệu (Ingestion Pipeline)

### Cách 1: Tự động tải từ Google Drive (Khuyến nghị)

```bash
# Tự động tải PDF files từ Google Drive
python3 -m scripts.download_data

# Nạp vào ChromaDB
python3 -m src.ingest
```

### Cách 2: Tải thủ công

1. Download 2 file PDF:

   - `english_grammar_in_use.pdf`
   - `english_vocabulary_in_use.pdf`

2. Copy vào thư mục `data/`

3. Chạy ingestion:

```bash
python3 -m src.ingest
```

**Lưu ý:**

- Quá trình này sẽ cắt nhỏ file PDF, tạo vector embeddings và lưu vào folder `chroma_db_store`
- Chỉ cần chạy 1 lần đầu tiên hoặc khi có sách mới
- Script `ingest.py` sẽ tự động tải PDF từ Google Drive nếu file chưa có

---

## 🐳 Chạy với Docker

### Yêu cầu:

- Docker và Docker Compose đã cài đặt
- File `.env` với các API keys và Google Drive URLs

### Cách chạy:

```bash
# Build và chạy
docker-compose up --build

# Hoặc chạy ở background
docker-compose up -d --build

# Xem logs
docker-compose logs -f

# Dừng
docker-compose down
```

### Lần đầu chạy:

- ✅ Container sẽ tự động tải PDF từ Google Drive
- ✅ Tự động chạy ingestion pipeline
- ✅ Tạo ChromaDB và lưu vào volume

### Lần sau chạy:

- ✅ Container sẽ **KHÔNG** chạy ingestion lại
- ✅ ChromaDB được persist qua volumes
- ✅ Chỉ khởi động server ngay

### Nếu muốn nạp lại data:

```bash
# Xóa volume ChromaDB
rm -rf chroma_db_store/

# Restart container
docker-compose restart
```

### Volumes:

- `./chroma_db_store` → Persist ChromaDB
- `./data` → Persist PDF files

Cả 2 volumes được mount từ host, nên data được giữ lại khi container restart/rebuild.

---

## ▶️ Chạy Server (API)

### Local Development:

```bash
uvicorn src.main:app --reload
```

### Production:

```bash
uvicorn src.main:app --host 0.0.0.0 --port 8000
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
├── data/                   # Chứa file PDF đầu vào (tự động tải từ Google Drive)
├── chroma_db_store/        # Cơ sở dữ liệu Vector (Tự sinh ra)
├── scripts/                # Scripts hỗ trợ
│   ├── download_data.py    # Tải PDF từ Google Drive
│   ├── check_db.py         # Kiểm tra ChromaDB
│   └── entrypoint.sh       # Docker entrypoint script
├── src/
│   ├── config/             # Cấu hình biến môi trường
│   ├── ingest.py           # Script nạp & xử lý dữ liệu (ETL)
│   ├── rag.py              # Logic chính (Brain): Search, Prompt, History
│   └── main.py             # API Gateway (FastAPI)
├── .env                    # Biến môi trường (Secrets) - KHÔNG commit
├── .env.example            # Template cho .env
├── requirements.txt        # Danh sách thư viện
├── Dockerfile              # Docker image configuration
├── docker-compose.yml      # Docker Compose configuration
├── test_rag.py             # Tool test CLI
└── README.md               # Tài liệu hướng dẫn
```

---

## 🔧 Troubleshooting

### Lỗi khi tải PDF từ Google Drive:

- Kiểm tra URL trong `.env` có đúng format không
- Đảm bảo file đã được share với "Anyone with the link"
- Thử copy link trực tiếp từ Google Drive

### ChromaDB không được persist:

- Kiểm tra volumes trong `docker-compose.yml`
- Đảm bảo folder `chroma_db_store/` có quyền write

### Ingestion chạy mỗi lần restart:

- Xóa ChromaDB cũ: `rm -rf chroma_db_store/`
- Restart container để tạo lại

---

## 🤝 Đóng góp

Vui lòng tạo Pull Request hoặc mở Issue nếu bạn tìm thấy lỗi.

---

**Developed for Lingora Project.**
