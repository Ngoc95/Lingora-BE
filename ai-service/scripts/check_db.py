# ai-service/scripts/check_db.py
import os
import sys
from pathlib import Path

# Import settings để lấy path
try:
    from src.config.env import settings
    db_dir = settings.CHROMA_DB_DIR
except:
    # Fallback nếu không import được
    db_dir = os.getenv("CHROMA_DB_DIR", "/app/chroma_db_store")

def check_chromadb_exists() -> bool:
    """Kiểm tra ChromaDB đã được tạo và có collections chưa"""
    db_path = Path(db_dir)
    
    # Debug info
    print(f"🔍 Checking ChromaDB at: {db_path}")
    print(f"   Path exists: {db_path.exists()}")
    print(f"   Absolute path: {db_path.absolute()}")
    
    if not db_path.exists():
        print(f"   ❌ Directory does not exist")
        return False
    
    # Kiểm tra có file/directory bên trong không
    try:
        contents = list(db_path.iterdir())
        print(f"   Found {len(contents)} items in directory")
        
        if not contents:
            print(f"   ❌ Directory is empty")
            return False
        
        # Liệt kê nội dung để debug
        for item in contents:
            print(f"   - {item.name} ({'dir' if item.is_dir() else 'file'})")
        
        # Kiểm tra xem có collection nào không
        # ChromaDB có thể có:
        # 1. Subdirectories với chroma.sqlite3
        # 2. Hoặc chroma.sqlite3 trực tiếp trong root
        # 3. Hoặc các file .bin, .parquet
        
        # Check for chroma.sqlite3 in subdirectories
        for item in contents:
            if item.is_dir():
                sqlite_file = item / "chroma.sqlite3"
                if sqlite_file.exists():
                    print(f"   ✅ Found collection: {item.name}")
                    return True
        
        # Check for chroma.sqlite3 in root
        root_sqlite = db_path / "chroma.sqlite3"
        if root_sqlite.exists():
            print(f"   ✅ Found chroma.sqlite3 in root")
            return True
        
        # Check for any .bin or .parquet files (ChromaDB data files)
        has_data_files = any(
            f.suffix in ['.bin', '.parquet'] or f.name.startswith('data_level')
            for f in contents if f.is_file()
        )
        
        if has_data_files:
            print(f"   ✅ Found ChromaDB data files")
            return True
        
        # Nếu có subdirectories (collections), coi như đã có DB
        has_dirs = any(item.is_dir() for item in contents)
        if has_dirs:
            print(f"   ✅ Found subdirectories (likely collections)")
            return True
        
        print(f"   ❌ No valid ChromaDB structure found")
        return False
        
    except Exception as e:
        print(f"   ❌ Error checking directory: {e}")
        return False

if __name__ == "__main__":
    exists = check_chromadb_exists()
    sys.exit(0 if exists else 1)