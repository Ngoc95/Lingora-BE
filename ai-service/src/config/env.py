from dotenv import load_dotenv
import os
load_dotenv()

def get_path(env_var: str, default: str) -> str:
    """
    Lấy path từ environment variable.
    Nếu là absolute path thì dùng trực tiếp, nếu relative thì join với cwd.
    """
    path = os.getenv(env_var, default)
    
    # Nếu là absolute path (bắt đầu với /)
    if os.path.isabs(path):
        return path
    
    # Nếu là relative path, join với current working directory
    return os.path.join(os.getcwd(), path)
class Settings:
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    
    # Google Drive URLs để download PDF files
    GRAMMAR_PDF_URL = os.getenv("GRAMMAR_PDF_URL", "")
    VOCAB_PDF_URL = os.getenv("VOCAB_PDF_URL", "")
    
    CHROMA_DB_DIR = get_path("CHROMA_DB_DIR", "chroma_db_store")
    
    # Đường dẫn tới folder data chứa PDF
    DATA_PATH = get_path("DATA_PATH", "data")

settings = Settings()