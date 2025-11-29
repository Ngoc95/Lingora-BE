#!/bin/bash
set -e

echo "🚀 Starting Lingora AI Service..."

# Tạo thư mục nếu chưa có
mkdir -p "${DATA_PATH:-/app/data}" "${CHROMA_DB_DIR:-/app/chroma_db_store}"

# Export environment variables cho Python scripts
export DATA_PATH="${DATA_PATH:-/app/data}"
export CHROMA_DB_DIR="${CHROMA_DB_DIR:-/app/chroma_db_store}"

# Debug: Hiển thị environment variables
echo "📋 Environment:"
echo "   DATA_PATH=$DATA_PATH"
echo "   CHROMA_DB_DIR=$CHROMA_DB_DIR"
echo "   Working directory: $(pwd)"

# Kiểm tra ChromaDB đã có chưa
echo "🔍 Đang kiểm tra ChromaDB..."

if python3 -m scripts.check_db; then
    echo "✅ ChromaDB đã tồn tại, bỏ qua ingestion"
    echo "💡 Nếu muốn nạp lại data, xóa folder chroma_db_store và restart container"
else
    echo "📥 ChromaDB chưa có, bắt đầu setup..."
    
    # Tải PDF files nếu chưa có
    missing_pdfs=false
    if [ ! -f "$DATA_PATH/english_grammar_in_use.pdf" ]; then
        echo "⚠️  Thiếu: english_grammar_in_use.pdf"
        missing_pdfs=true
    fi
    if [ ! -f "$DATA_PATH/english_vocabulary_in_use.pdf" ]; then
        echo "⚠️  Thiếu: english_vocabulary_in_use.pdf"
        missing_pdfs=true
    fi
    
    if [ "$missing_pdfs" = true ]; then
        echo "⬇️  Đang tải PDF files từ Google Drive..."
        if ! python3 -m scripts.download_data; then
            echo "❌ Lỗi khi tải PDF files."
            echo "💡 Vui lòng kiểm tra:"
            echo "   1. URLs trong file .env (GRAMMAR_PDF_URL, VOCAB_PDF_URL)"
            echo "   2. Hoặc copy PDF files vào folder data/ và restart container"
            exit 1
        fi
    fi
    
    # Chạy ingestion
    echo "🔄 Đang chạy ingestion pipeline..."
    if ! python3 -m src.ingest; then
        echo "❌ Lỗi khi chạy ingestion"
        exit 1
    fi
    
    echo "✅ Ingestion hoàn tất!"
fi

# Chạy lệnh được truyền vào (CMD)
echo "🚀 Khởi động FastAPI server..."
exec "$@"