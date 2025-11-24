from dotenv import load_dotenv
import os
load_dotenv()
class Settings:
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    # Đường dẫn lưu dữ liệu Vector DB (nằm ở root folder)
    CHROMA_DB_DIR = os.path.join(os.getcwd(), os.getenv("CHROMA_DB_DIR", "chroma_db_store"))
    
    # Đường dẫn tới folder data chứa PDF
    DATA_PATH = os.path.join(os.getcwd(), os.getenv("DATA_PATH", "data"))

settings = Settings()