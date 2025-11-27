import os
import sys
import time
from src.rag import get_answer

# --- MÀU SẮC CHO ĐẸP (ANSI Codes) ---
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def main():
    # Kiểm tra biến môi trường
    if not os.getenv("GOOGLE_API_KEY"):
        # Load lại nếu chưa có (phòng trường hợp chạy trực tiếp script)
        from src.config.env import settings
    
    print(f"{Colors.HEADER}{Colors.BOLD}" + "="*50)
    print("🤖  TEST TOOL CHO RAG CHATBOT (LINGORA)")
    print("="*50 + f"{Colors.ENDC}")
    print("Gõ 'exit' hoặc 'quit' để thoát.\n")

    while True:
        try:
            # 1. Nhập câu hỏi
            question = input(f"\n{Colors.BOLD}❓ Bạn hỏi: {Colors.ENDC}").strip()
            
            if not question: continue
            if question.lower() in ['exit', 'quit']: break

            # 3. Gọi hàm xử lý (Đo thời gian)
            print(f"\n{Colors.WARNING}⏳ Bot đang suy nghĩ...{Colors.ENDC}")
            start_time = time.time()
            
            # --- GỌI HÀM LOGIC ---
            answer = get_answer(question)
            # ---------------------
            
            end_time = time.time()
            duration = end_time - start_time

            # 4. In kết quả
            print("-" * 50)
            print(f"{Colors.GREEN}💡 TRẢ LỜI:{Colors.ENDC}")
            print(answer)
            print("-" * 50)
            print(f"⏱️  Thời gian xử lý: {duration:.2f} giây\n")

        except KeyboardInterrupt:
            print("\n👋 Đã dừng chương trình.")
            break
        except Exception as e:
            print(f"\n{Colors.FAIL}❌ LỖI: {e}{Colors.ENDC}")

if __name__ == "__main__":
    main()