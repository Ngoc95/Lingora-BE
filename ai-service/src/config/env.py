from dotenv import load_dotenv
import os
load_dotenv()
class Settings:
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    
    # Google Drive URLs để download PDF files
    GRAMMAR_PDF_URL = os.getenv("GRAMMAR_PDF_URL", "")
    VOCAB_PDF_URL = os.getenv("VOCAB_PDF_URL", "")
    
    # Đường dẫn lưu dữ liệu Vector DB
    CHROMA_DB_DIR = os.path.join(os.getcwd(), os.getenv("CHROMA_DB_DIR", "chroma_db_store"))
    
    # Đường dẫn tới folder data chứa PDF
    DATA_PATH = os.path.join(os.getcwd(), os.getenv("DATA_PATH", "data"))

settings = Settings()