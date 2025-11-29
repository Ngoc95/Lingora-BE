# ai-service/scripts/check_db.py
import os
import sys
from pathlib import Path
from src.config.env import settings

def check_chromadb_exists() -> bool:
    """Kiểm tra ChromaDB đã được tạo và có collections chưa"""
    db_path = Path(settings.CHROMA_DB_DIR)
    
    if not db_path.exists():
        return False
    
    # Kiểm tra có file/directory bên trong không
    contents = list(db_path.iterdir())
    if not contents:
        return False
    
    # Kiểm tra xem có collection nào không (ChromaDB thường có subdirectories)
    for item in contents:
        if item.is_dir() and (item / "chroma.sqlite3").exists():
            return True
    
    return False

if __name__ == "__main__":
    exists = check_chromadb_exists()
    sys.exit(0 if exists else 1)