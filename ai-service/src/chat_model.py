import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("❌ Chưa có API Key trong file .env")
else:
    genai.configure(api_key=api_key)
    print("📋 Danh sách các model bạn được phép dùng:")
    try:
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f" - {m.name}")
    except Exception as e:
        print(f"❌ Lỗi khi lấy danh sách: {e}")