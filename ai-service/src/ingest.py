import os
import shutil
from langchain_openai import OpenAIEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from src.config.env import settings

# --- CẤU HÌNH ---
FILES_TO_PROCESS = {
    "english_grammar_in_use.pdf": "grammar_collection",
    "english_vocabulary_in_use.pdf": "vocab_collection"
}

def ensure_pdf_exists(file_name: str) -> bool:
    """Kiểm tra và tải PDF nếu chưa có"""
    file_path = os.path.join(settings.DATA_PATH, file_name)
    
    if os.path.exists(file_path):
        return True
    
    print(f"⚠️  File {file_name} không tìm thấy. Đang thử tải từ Google Drive...")
    try:
        # Import và chạy download script
        from scripts.download_data import download_file, PDF_URLS, convert_google_drive_link
        
        if file_name in PDF_URLS and PDF_URLS[file_name]:
            url = PDF_URLS[file_name]
            download_file(convert_google_drive_link(url), file_path)
            return True
        else:
            print(f"❌ Không có URL cho {file_name} trong .env")
            print(f"   Vui lòng set {'GRAMMAR_PDF_URL' if 'grammar' in file_name else 'VOCAB_PDF_URL'} trong .env")
            return False
    except Exception as e:
        print(f"❌ Lỗi khi tải {file_name}: {e}")
        return False

def process_pdf(file_name, collection_name):
    # Kiểm tra và tải PDF nếu cần
    if not ensure_pdf_exists(file_name):
        print(f"⏭️  Bỏ qua {file_name}")
        return
    
    file_path = os.path.join(settings.DATA_PATH, file_name)
    
    print(f"\n🔄 Đang xử lý: {file_name} -> Collection: {collection_name}")

    # 1. Load PDF
    loader = PyPDFLoader(file_path)
    documents = loader.load()
    print(f"   - Đã đọc xong {len(documents)} trang.")

    # 2. Cắt nhỏ văn bản (Chunking)
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", " ", ""]
    )
    chunks = text_splitter.split_documents(documents)
    print(f"   - Đã chia thành {len(chunks)} đoạn nhỏ.")

    # 3. Tạo Embeddings (DÙNG OPENAI)
    print("   - Đang tạo embeddings với OpenAI...")
    embeddings = OpenAIEmbeddings(
        openai_api_key=settings.OPENAI_API_KEY,
        model="text-embedding-3-small"  # Hoặc "text-embedding-ada-002" (rẻ hơn) hoặc "text-embedding-3-large" (tốt hơn)
    )

    # 4. Lưu vào ChromaDB
    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=settings.CHROMA_DB_DIR,
        collection_name=collection_name
    )
    
    print(f"✅ Đã lưu thành công vào ChromaDB tại: {settings.CHROMA_DB_DIR}")

def main():
    print("🚀 BẮT ĐẦU QUÁ TRÌNH NẠP DỮ LIỆU...")
    
    # Xóa DB cũ nếu đổi từ HuggingFace sang OpenAI (vì embeddings khác nhau)
    # if os.path.exists(settings.CHROMA_DB_DIR):
    #     print("⚠️  Phát hiện ChromaDB cũ. Vì đã đổi sang OpenAI embeddings,")
    #     print("   cần nạp lại từ đầu. Đang xóa DB cũ...")
    #     shutil.rmtree(settings.CHROMA_DB_DIR)
    #     print("✅ Đã xóa DB cũ.")
    
    for file_name, collection_name in FILES_TO_PROCESS.items():
        process_pdf(file_name, collection_name)

    print("\n🎉 HOÀN TẤT! Dữ liệu đã sẵn sàng.")

if __name__ == "__main__":
    main()