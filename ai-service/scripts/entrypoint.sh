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

# ==================================================================================
# LOGIC KIỂM TRA & NẠP DATA
# - Production: Data đã được bake vào image -> Folder có data -> Skip.
# - Development: Mount volume từ ngoài vào (thường là rỗng) -> Folder rỗng -> Run Ingest.
# ==================================================================================

echo "🔍 Đang kiểm tra ChromaDB tại: $CHROMA_DB_DIR"
echo "📂 Listing files in $CHROMA_DB_DIR:"
ls -laR "$CHROMA_DB_DIR" || echo "❌ Cannot list directory"

# Kiểm tra xem folder có tồn tại và có file bên trong không

# Kiểm tra xem folder có tồn tại và có file bên trong không
if [ -d "$CHROMA_DB_DIR" ] && [ "$(ls -A $CHROMA_DB_DIR)" ]; then
    echo "✅ ChromaDB đã tồn tại (Baked in Image or Mounted Volume with Data)."
    echo "⏩ Skipping ingestion."
else
    echo "⚠️  ChromaDB chưa có hoặc rỗng. Bắt đầu quy trình nạp dữ liệu (Ingestion Flow)..."
    
    # OLD LOGIC: Tải PDF & Ingest
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