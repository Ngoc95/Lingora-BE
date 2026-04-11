"""
chat_demo.py - Demo chatbot hội thoại trong terminal

Chạy:
    cd ai-service
    python chat_demo.py

Flow:
    1. Chọn context (Du lịch, Phỏng vấn...)
    2. AI chào trước
    3. Chat qua lại — xem phase tự chuyển đổi
    4. Gõ 'quit' để kết thúc → hiện điểm tổng kết
    5. Hoặc chat đến khi AI tự kết thúc

Tips:
    - Gõ số 1/2/3 để chọn suggestion
    - Gõ 'hint' để xem câu mẫu gợi ý cho context hiện tại
    - Gõ 'quit' hoặc 'q' để kết thúc
"""

import time
from src.conversation import get_conversation_answer, generate_opening_message
from src.scoring import score_conversation_session

# ============================================================================
# CONTEXTS — Giả lập data sẽ lưu trong DB (conversation_context)
# ============================================================================

CONTEXTS = {
    "1": {
        "name": "🏠 Giao tiếp hàng ngày",
        "slug": "daily",
        "difficulty": "BEGINNER",
        "description": "Luyện giao tiếp trong các tình huống thường ngày: chào hỏi, mua sắm, hỏi đường...",
        "system_prompt": (
            "You are a friendly neighbor in an apartment building. "
            "You just met the learner in the elevator. "
            "Have a casual, everyday conversation. "
            "Topics: weather, weekend plans, local restaurants, hobbies. "
            "Keep responses SHORT (1-2 sentences). Be warm and natural. "
            "Difficulty: BEGINNER — use simple words and short sentences."
        ),
        "example_inputs": [
            "Hi! How are you today?",
            "The weather is really nice today, right?",
            "Do you know any good restaurant around here?",
            "I like Vietnamese food. What about you?",
            "What do you usually do on weekends?",
            "I like to go to the park and play badminton",
            "Do you want to play together sometime?",
            "Ok sounds good! See you this weekend then",
            "Have a nice day! Bye!",
        ],
    },
    "2": {
        "name": "✈️ Du lịch",
        "slug": "travel",
        "difficulty": "BEGINNER",
        "description": "Luyện giao tiếp khi du lịch: check-in khách sạn, gọi đồ ăn, hỏi đường...",
        "system_prompt": (
            "You are a friendly hotel receptionist at a beach resort in Da Nang, Vietnam. "
            "Help the traveler with check-in, room selection, and local recommendations. "
            "Keep responses SHORT (1-2 sentences). Be professional but warm. "
            "Difficulty: BEGINNER — use simple words."
        ),
        "example_inputs": [
            "Hello! I have a reservation under the name Minh",
            "I want a room with ocean view please",
            "How much it cost per night?",
            "That sound good. I take it",
            "Is breakfast included?",
            "What time is the breakfast?",
            "Can you recommend some place to visit near here?",
            "How do I get to the beach from this hotel?",
            "Is there a pool in the hotel?",
            "Thank you so much! You are very helpful",
            "I really enjoy my stay here. Goodbye!",
        ],
    },
    "3": {
        "name": "💼 Phỏng vấn xin việc",
        "slug": "interview",
        "difficulty": "INTERMEDIATE",
        "description": "Luyện phỏng vấn tiếng Anh: giới thiệu bản thân, điểm mạnh/yếu, kinh nghiệm...",
        "system_prompt": (
            "You are a hiring manager at a tech company interviewing the learner "
            "for a Junior Developer position. "
            "Ask professional interview questions one at a time. "
            "Start with introduction, then skills, then experience, then motivation. "
            "Keep responses SHORT. Be professional and encouraging. "
            "Difficulty: INTERMEDIATE — expect more complex responses."
        ),
        "example_inputs": [
            "Thank you for having me. I'm excited to be here",
            "My name is Minh, I'm a third-year student at UIT majoring in software engineering",
            "I'm most experienced in nodejs and reactjs. I also learn about python and AI",
            "My biggest strength is that I can learn new technology very fast",
            "My weakness is that sometimes I spend too much time on small details",
            "I built a coffee shop management system with my team. It have POS, inventory, and staff management",
            "The most challenge was making the real-time order updates work smoothly",
            "I use socket.io for real-time and it was very difficult at first but I figure it out",
            "I want to work here because I want to grow as a developer and learn from experienced people",
            "I see myself becoming a senior developer in the next five years",
            "When I have conflict with teammate, I try to listen first and find a solution together",
            "Do you have any question for me? I want to know about the team culture",
            "Thank you so much for your time. It was a great conversation",
        ],
    },
    "4": {
        "name": "📚 Học tập & Lớp học",
        "slug": "study",
        "difficulty": "INTERMEDIATE",
        "description": "Luyện giao tiếp trong môi trường học tập: thảo luận nhóm, hỏi giáo viên...",
        "system_prompt": (
            "You are a classmate working on a group project about climate change. "
            "Discuss ideas, divide tasks, and plan the presentation together. "
            "Keep responses SHORT (1-2 sentences). Be collaborative. "
            "Difficulty: INTERMEDIATE."
        ),
        "example_inputs": [
            "Hey! Are you ready to work on our project today?",
            "I think we should focus on how climate change affect Vietnam specifically",
            "I can do the research part about sea level rising in Mekong Delta",
            "How many slides do you think we need for the presentation?",
            "I think 15 slides is enough. We don't want to make it too long",
            "Should we include some videos or just use images?",
            "I found some really good data from NASA website about temperature changes",
            "When is the deadline again? I forgot",
            "Ok let's meet again on Friday to combine everything",
            "I will finish my part by Thursday night so you can review it",
            "Do you think our professor will like this topic?",
            "Thanks for working hard on this. We make a good team!",
        ],
    },
}

# Giới hạn số turn tối đa (1 turn = 1 user + 1 AI message)
MAX_TURNS = 15

# ============================================================================
# HELPER — Hiển thị đẹp
# ============================================================================

def print_header(text):
    print(f"\n{'=' * 60}")
    print(f"  {text}")
    print(f"{'=' * 60}")

def print_phase(phase):
    icons = {
        "opening": "🟢 Opening — Chào hỏi, làm quen",
        "developing": "🔵 Developing — Hội thoại chính",
        "closing": "🟡 Closing — Kết thúc cuộc trò chuyện",
        "completed": "✅ Completed — Đã hoàn thành",
    }
    print(f"\n  📍 Phase: {icons.get(phase, phase)}")

def print_correction(correction):
    if correction.get("has_error") and correction.get("errors"):
        errors = correction["errors"]
        print(f"\n  ┌─ 💡 Sửa lỗi ({len(errors)} lỗi) ─────────────────────┐")
        for i, err in enumerate(errors, 1):
            print(f"  │ {i}. ❌ {err['wrong']}")
            print(f"  │    ✅ {err['correct']}")
            print(f"  │    📝 {err['explanation']}")
            if i < len(errors):
                print(f"  │")
        print(f"  └─────────────────────────────────────────────┘")

def print_suggestions(suggestions):
    if suggestions:
        print(f"\n  💡 Gợi ý trả lời:")
        for i, s in enumerate(suggestions, 1):
            print(f"     {i}. {s}")

def print_improvement(improvement):
    """Hiển thị gợi ý cải thiện diễn đạt (Chain 4)."""
    if improvement.get("has_improvement"):
        print(f"\n  ┌─ ✨ Cách nói hay hơn ────────────────────────┐")
        print(f"  │ 💬 {improvement['original']}")
        print(f"  │ ✨ {improvement['improved']}")
        print(f"  │ 📝 {improvement['explanation']}")
        print(f"  └─────────────────────────────────────────────┘")

def print_examples(ctx):
    """Hiển thị câu mẫu cho context hiện tại."""
    examples = ctx.get("example_inputs", [])
    if examples:
        print(f"\n  📖 Câu mẫu cho {ctx['name']}:")
        print(f"  (Copy-paste 1 câu vào input để thử)\n")
        for i, ex in enumerate(examples, 1):
            print(f"     {i:2d}. {ex}")
        print()

# ============================================================================
# MAIN
# ============================================================================

def main():
    print_header("🤖 LINGORA — Luyện Hội Thoại Tiếng Anh")
    print("\n  Chọn ngữ cảnh luyện tập:\n")
    for key, ctx in CONTEXTS.items():
        print(f"    [{key}] {ctx['name']}")
        print(f"        {ctx['description']}")
        print(f"        Độ khó: {ctx['difficulty']}")
        print(f"        Có {len(ctx.get('example_inputs', []))} câu mẫu để thử\n")

    # Chọn context
    choice = input("  👉 Nhập số (1-4): ").strip()
    if choice not in CONTEXTS:
        print("❌ Lựa chọn không hợp lệ!")
        return

    ctx = CONTEXTS[choice]
    print_header(f"Bắt đầu: {ctx['name']}")
    print(f"  Lệnh:")
    print(f"    'quit'  — kết thúc phiên & xem điểm")
    print(f"    'hint'  — xem câu mẫu cho context này")
    print(f"    1/2/3   — chọn nhanh gợi ý")

    # State
    current_phase = "opening"
    history = []
    error_count = 0
    turn_count = 0  # 1 turn = user nói + AI trả lời
    total_messages = 0
    transcript_lines = []
    last_suggestions = []

    print_phase(current_phase)

    # ── AI CHÀO TRƯỚC ──
    print("\n  ⏳ AI đang chuẩn bị...")
    opening = generate_opening_message(
        system_prompt=ctx["system_prompt"],
        context=ctx["name"],
        difficulty=ctx["difficulty"],
    )
    ai_greeting = opening["response"]
    last_suggestions = opening["suggestions"]

    # Lưu vào history + transcript
    history.append({"sender": "AI", "content": ai_greeting})
    total_messages += 1
    transcript_lines.append(f"AI: {ai_greeting}")

    print(f"\n  🤖 AI: {ai_greeting}")
    print_suggestions(last_suggestions)

    # Chat loop
    while True:
        # Input
        user_input = input(f"\n  You: ").strip()

        if not user_input:
            continue

        # Lệnh đặc biệt
        if user_input.lower() == "hint":
            print_examples(ctx)
            continue

        # Chọn suggestion bằng số
        if user_input in ("1", "2", "3") and last_suggestions:
            idx = int(user_input) - 1
            if idx < len(last_suggestions):
                user_input = last_suggestions[idx]
                print(f"  You: {user_input}")

        # Thoát
        if user_input.lower() in ("quit", "exit", "q"):
            break

        # Gọi pipeline
        start = time.time()
        result = get_conversation_answer(
            question=user_input,
            system_prompt=ctx["system_prompt"],
            context=ctx["name"],
            difficulty=ctx["difficulty"],
            current_phase=current_phase,
            history=history,
        )
        elapsed = time.time() - start

        # Cập nhật state
        ai_response = result["response"]
        correction = result["correction"]
        suggestions = result["suggestions"]
        improvement = result.get("improvement", {})
        next_phase = result.get("next_phase", "")

        history.append({"sender": "USER", "content": user_input})
        history.append({"sender": "AI", "content": ai_response})
        total_messages += 2
        turn_count += 1
        if correction.get("has_error"):
            error_count += 1

        transcript_lines.append(f"User: {user_input}")
        transcript_lines.append(f"AI: {ai_response}")

        # Hiển thị
        print(f"\n  🤖 AI: {ai_response}")

        # Vocabulary highlight
        vocab = result.get("vocabulary_highlight", "")
        vocab_meaning = result.get("vocabulary_meaning", "")
        if vocab and vocab_meaning:
            print(f"  📚 Từ mới: \"{vocab}\" — {vocab_meaning}")

        print(f"  ⏱️  {elapsed:.1f}s | Turn: {turn_count}/{MAX_TURNS}")

        print_correction(correction)
        print_improvement(improvement)

        # Phase change
        if next_phase and next_phase != current_phase:
            current_phase = next_phase
            print_phase(current_phase)

        # Check completed
        if current_phase == "completed":
            print("\n  🎉 Cuộc hội thoại đã kết thúc tự nhiên!")
            break

        # Cảnh báo khi gần hết turns
        if turn_count >= MAX_TURNS:
            print(f"\n  ⚠️  Đã đạt giới hạn {MAX_TURNS} lượt! Phiên tự động kết thúc.")
            break
        elif turn_count == MAX_TURNS - 2:
            print(f"\n  ⚠️  Còn 2 lượt nữa! Hãy kết thúc cuộc hội thoại tự nhiên.")

        last_suggestions = suggestions
        print_suggestions(suggestions)

    # ── Tổng kết ──
    print_header("📊 Tổng kết phiên luyện tập")
    print(f"  Ngữ cảnh:     {ctx['name']}")
    print(f"  Số lượt chat:  {total_messages} tin nhắn ({turn_count} turns)")
    print(f"  Lỗi phát hiện: {error_count}")

    if total_messages >= 4:
        print("\n  ⏳ Đang chấm điểm...")
        transcript = "\n".join(transcript_lines)
        scores = score_conversation_session(
            context=ctx["name"],
            total_messages=total_messages,
            error_count=error_count,
            transcript=transcript,
        )
        print(f"\n  📊 Grammar:  {scores['grammar_score']}/100")
        print(f"  📊 Fluency:  {scores['fluency_score']}/100")
        print(f"  📊 Overall:  {scores['overall_score']}/100")
        print(f"\n  💬 Feedback: {scores['feedback']}")
    else:
        print("\n  ⚠️ Chat quá ít để chấm điểm (cần ít nhất 4 tin nhắn)")

    print(f"\n{'=' * 60}")
    print(f"  Cảm ơn bạn đã luyện tập! 🎉")
    print(f"{'=' * 60}\n")


if __name__ == "__main__":
    main()
