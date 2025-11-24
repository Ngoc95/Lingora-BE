import os
import shutil
# Import mới cho Local Embeddings
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from src.config.env import settings

# --- CẤU HÌNH ---
FILES_TO_PROCESS = {
    "english_grammar_in_use.pdf": "grammar_collection",
    "english_vocabulary_in_use.pdf": "vocab_collection"
}

def process_pdf(file_name, collection_name):
    file_path = os.path.join(settings.DATA_PATH, file_name)
    
    if not os.path.exists(file_path):
        print(f"⚠️  Không tìm thấy file: {file_path}")
        return

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

    # 3. Tạo Embeddings (DÙNG LOCAL - KHÔNG CẦN GOOGLE KEY)
    print("   - Đang tải model Embeddings (chạy lần đầu sẽ tốn vài giây)...")
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        model_kwargs={'device': 'cpu'} # Chạy bằng CPU, nếu có GPU đổi thành 'cuda'
    )

    # 4. Lưu vào ChromaDB
    # Vì chạy local nên ChromaDB xử lý theo lô (batch) rất nhanh, không lo rate limit
    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=settings.CHROMA_DB_DIR,
        collection_name=collection_name
    )
    
    print(f"✅ Đã lưu thành công vào ChromaDB tại: {settings.CHROMA_DB_DIR}")

def main():
    print("🚀 BẮT ĐẦU QUÁ TRÌNH NẠP DỮ LIỆU (CHẾ ĐỘ OFFLINE)...")
    
    # (Tuỳ chọn) Xoá DB cũ để tránh lẫn lộn giữa Embeddings của Google và Local
    # Vì Embeddings của Google khác format với HuggingFace, nên nạp lại từ đầu là tốt nhất.
    # if os.path.exists(settings.CHROMA_DB_DIR):
    #     print("🗑️  Phát hiện DB cũ, đang dọn dẹp để nạp mới...")
    #     shutil.rmtree(settings.CHROMA_DB_DIR)

    for file_name, collection_name in FILES_TO_PROCESS.items():
        process_pdf(file_name, collection_name)

    print("\n🎉 HOÀN TẤT! Dữ liệu đã sẵn sàng.")

if __name__ == "__main__":
    main()