# ai-service/scripts/download_data.py
import os
import requests
import re
from pathlib import Path
from src.config.env import settings

def convert_google_drive_link(url: str) -> str:
    """
    Convert Google Drive sharing link sang direct download link
    
    Input: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    Output: https://drive.google.com/uc?export=download&id=FILE_ID
    """
    if "drive.google.com" not in url:
        return url
    
    # Nếu đã là direct link format
    if "/uc?export=download&id=" in url:
        return url
    
    # Extract file ID từ sharing link
    try:
        if "/file/d/" in url:
            file_id = url.split("/file/d/")[1].split("/")[0]
        elif "id=" in url:
            file_id = url.split("id=")[1].split("&")[0]
        else:
            return url
        
        return f"https://drive.google.com/uc?export=download&id={file_id}"
    except:
        return url

# URLs của PDF files
PDF_URLS = {
    "english_grammar_in_use.pdf": settings.GRAMMAR_PDF_URL,
    "english_vocabulary_in_use.pdf": settings.VOCAB_PDF_URL
}

def download_file(url: str, file_path: str):
    """Download file from URL với progress bar"""
    print(f"⬇️  Đang tải: {os.path.basename(file_path)}")
    
    # Convert Google Drive link nếu cần
    direct_url = convert_google_drive_link(url)
    
    # Download với session để handle Google Drive large files warning
    session = requests.Session()
    response = session.get(direct_url, stream=True)
    
    # Handle Google Drive virus scan warning cho file lớn
    if response.headers.get('Content-Type') == 'text/html; charset=utf-8':
        # File lớn cần confirm, parse HTML để lấy download link
        matches = re.findall(r'href="(/uc\?export=download[^"]+)', response.text)
        if matches:
            confirm_url = "https://drive.google.com" + matches[0].replace('&amp;', '&')
            response = session.get(confirm_url, stream=True)
    
    response.raise_for_status()
    
    total_size = int(response.headers.get('content-length', 0))
    downloaded = 0
    
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    with open(file_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)
                downloaded += len(chunk)
                if total_size > 0:
                    percent = (downloaded / total_size) * 100
                    print(f"\r   Progress: {percent:.1f}% ({downloaded / (1024*1024):.1f} MB)", end='', flush=True)
    
    print(f"\n✅ Đã tải xong: {os.path.basename(file_path)} ({downloaded / (1024*1024):.1f} MB)")

def main():
    print("🚀 BẮT ĐẦU TẢI DATASET PDFs TỪ GOOGLE DRIVE...\n")
    
    data_dir = Path(settings.DATA_PATH)
    data_dir.mkdir(exist_ok=True)
    
    missing_files = []
    missing_urls = []
    
    for file_name, url in PDF_URLS.items():
        file_path = data_dir / file_name
        
        if file_path.exists():
            file_size = file_path.stat().st_size / (1024*1024)
            print(f"✓ File đã tồn tại: {file_name} ({file_size:.1f} MB) - Bỏ qua")
            continue
        
        if not url:
            print(f"⚠️  Chưa có URL cho: {file_name}")
            missing_urls.append(file_name)
            continue
        
        try:
            download_file(url, str(file_path))
        except Exception as e:
            print(f"❌ Lỗi khi tải {file_name}: {e}")
            missing_files.append(file_name)
    
    print("\n" + "="*50)
    
    if missing_urls:
        print(f"\n⚠️  Chưa có URL cho các file sau:")
        for file_name in missing_urls:
            print(f"   - {file_name}")
        print("\n💡 Hướng dẫn:")
        print("   1. Upload file lên Google Drive")
        print("   2. Share với 'Anyone with the link'")
        print("   3. Copy link và set trong file .env:")
        print("      GRAMMAR_PDF_URL=\"https://drive.google.com/file/d/.../view\"")
        print("      VOCAB_PDF_URL=\"https://drive.google.com/file/d/.../view\"")
    
    if missing_files:
        print(f"\n❌ Không tải được các file: {missing_files}")
        print("   Vui lòng kiểm tra lại URL hoặc quyền truy cập.")
    
    if not missing_files and not missing_urls:
        print("\n🎉 Hoàn tất! Tất cả PDF files đã sẵn sàng.")
        print("   Bước tiếp theo: python3 -m src.ingest")
        return True
    
    return False

if __name__ == "__main__":
    main()