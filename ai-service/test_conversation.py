"""
test_conversation.py - Test script cho conversation pipeline (4 chains)

Chạy trực tiếp trong terminal, KHÔNG cần chạy FastAPI server.
Dùng để kiểm tra 4 chains hoạt động đúng trước khi integrate với Express BE.

Cách chạy:
    cd ai-service
    python test_conversation.py             # Chạy tất cả
    python test_conversation.py error       # Chỉ test Chain 1
    python test_conversation.py improvement # Chỉ test Chain 4

Yêu cầu:
    - File .env phải có OPENAI_API_KEY
    - Đã cài đủ packages (xem requirements.txt)
"""

import sys
import time

# ============================================================================
# TEST 1: Chain 1 — Error Detection
# ============================================================================

def test_error_chain():
    """Test Chain 1: Error Detection — phát hiện lỗi ngữ pháp."""
    print("\n" + "=" * 60)
    print("🔍 TEST 1: Error Detection Chain")
    print("=" * 60)

    from src.conversation import error_chain

    # Test case 1: Câu có lỗi
    print("\n📝 Test case 1: Câu có lỗi — 'I are very hungry'")
    result = error_chain.invoke({
        "user_message": "I are very hungry",
        "context": "Travel",
        "difficulty": "BEGINNER",
    })
    print(f"   has_error: {result.has_error}")
    if result.has_error:
        for err in result.errors:
            print(f"   ❌ {err.wrong} → ✅ {err.correct}")
            print(f"   📝 {err.explanation}")
    assert result.has_error == True, "❌ Phải phát hiện lỗi!"
    print("   ✅ PASSED")

    # Test case 2: Câu đúng
    print("\n📝 Test case 2: Câu ĐÚNG — 'I am very hungry'")
    result = error_chain.invoke({
        "user_message": "I am very hungry",
        "context": "Travel",
        "difficulty": "BEGINNER",
    })
    print(f"   has_error: {result.has_error}")
    assert result.has_error == False, "❌ Câu đúng mà bảo sai!"
    print("   ✅ PASSED")

    # Test case 3: Chỉ lỗi viết hoa — PHẢI bỏ qua
    print("\n📝 Test case 3: Chỉ lỗi viết hoa — 'I use nodejs and reactjs'")
    result = error_chain.invoke({
        "user_message": "I use nodejs and reactjs",
        "context": "Interview",
        "difficulty": "INTERMEDIATE",
    })
    print(f"   has_error: {result.has_error}")
    if not result.has_error:
        print("   ✅ PASSED — Đúng, bỏ qua lỗi viết hoa!")
    else:
        print("   ⚠️ AI vẫn bắt lỗi viết hoa (chấp nhận được, nhưng không lý tưởng)")


# ============================================================================
# TEST 2: Chain 2 — Response Generation
# ============================================================================

def test_response_chain():
    """Test Chain 2: Response Generation — AI trả lời hội thoại."""
    print("\n" + "=" * 60)
    print("💬 TEST 2: Response Generation Chain")
    print("=" * 60)

    from src.conversation import response_chain

    system_prompt = (
        "You are a friendly hotel receptionist. Help the traveler check in. "
        "Keep responses short and natural."
    )

    print("\n📝 Test: Opening phase — User chào hỏi")
    result = response_chain.invoke({
        "user_message": "Hi! I'd like to check in, please.",
        "system_prompt": system_prompt,
        "context": "Travel",
        "difficulty": "BEGINNER",
        "current_phase": "opening",
        "history": [],
    })
    print(f"   response:   {result.response}")
    print(f"   next_phase: {result.next_phase or '(giữ nguyên)'}")
    assert len(result.response) > 0, "❌ Response rỗng!"
    print("   ✅ PASSED")


# ============================================================================
# TEST 3: Chain 3 — Suggestion Engine
# ============================================================================

def test_suggestion_chain():
    """Test Chain 3: Suggestion Engine — gợi ý câu trả lời."""
    print("\n" + "=" * 60)
    print("💡 TEST 3: Suggestion Engine Chain")
    print("=" * 60)

    from src.conversation import suggestion_chain

    print("\n📝 Test: AI vừa hỏi 'Would you like a room with a view?'")
    result = suggestion_chain.invoke({
        "ai_response": "Sure! Would you like a room with a view? We have ocean view and garden view available.",
        "context": "Travel",
        "difficulty": "BEGINNER",
        "current_phase": "developing",
    })
    print(f"   suggestions: {result.suggestions}")
    assert len(result.suggestions) >= 2, "❌ Phải có ít nhất 2 gợi ý!"
    print("   ✅ PASSED")


# ============================================================================
# TEST 4: Chain 4 — Expression Improvement (MỚI)
# ============================================================================

def test_improvement_chain():
    """Test Chain 4: Expression Improvement — gợi ý cách nói hay hơn."""
    print("\n" + "=" * 60)
    print("✨ TEST 4: Expression Improvement Chain")
    print("=" * 60)

    from src.conversation import improvement_chain

    # Test case 1: Câu basic có thể cải thiện
    print("\n📝 Test case 1: Câu basic — 'I want to get a room'")
    result = improvement_chain.invoke({
        "user_message": "I want to get a room with ocean view please",
        "context": "Travel",
        "difficulty": "BEGINNER",
    })
    print(f"   has_improvement: {result.has_improvement}")
    if result.has_improvement:
        print(f"   💬 Original: {result.original}")
        print(f"   ✨ Improved: {result.improved}")
        print(f"   📝 {result.explanation}")
    print("   ✅ PASSED")

    # Test case 2: Câu đã hay rồi
    print("\n📝 Test case 2: Câu đã tốt — 'I'd like to book an ocean view room, please'")
    result = improvement_chain.invoke({
        "user_message": "I'd like to book an ocean view room, please",
        "context": "Travel",
        "difficulty": "BEGINNER",
    })
    print(f"   has_improvement: {result.has_improvement}")
    if not result.has_improvement:
        print("   ✅ Đúng — câu đã tốt, không cần cải thiện!")
    else:
        print(f"   💬 Original: {result.original}")
        print(f"   ✨ Improved: {result.improved}")
        print(f"   📝 {result.explanation}")
    print("   ✅ PASSED")


# ============================================================================
# TEST 5: Full Pipeline — 4 chains kết hợp
# ============================================================================

def test_full_pipeline():
    """Test pipeline đầy đủ — giả lập 1 cuộc hội thoại ngắn."""
    print("\n" + "=" * 60)
    print("🚀 TEST 5: Full Pipeline — 4-Chain Multi-turn Conversation")
    print("=" * 60)

    from src.conversation import get_conversation_answer

    system_prompt = (
        "You are a friendly hotel receptionist at a beach resort in Da Nang. "
        "Help the traveler with check-in and local recommendations. "
        "Keep responses SHORT (1-2 sentences). Be warm and welcoming."
    )

    # --- Turn 1: Opening ---
    print("\n--- Turn 1: Opening ---")
    start = time.time()
    result1 = get_conversation_answer(
        question="Hello! I have a reservation. My name is Minh.",
        system_prompt=system_prompt,
        context="Travel - Hotel check-in",
        difficulty="BEGINNER",
        current_phase="opening",
        history=[],
    )
    elapsed = time.time() - start
    print(f"   AI:          {result1['response']}")
    print(f"   Correction:  {result1['correction']}")
    print(f"   Suggestions: {result1['suggestions']}")
    print(f"   Improvement: {result1['improvement']}")
    print(f"   Next phase:  {result1['next_phase'] or '(giữ nguyên)'}")
    print(f"   ⏱️ Thời gian: {elapsed:.1f}s")

    # --- Turn 2: Developing (câu có lỗi grammar + có thể improve) ---
    print("\n--- Turn 2: Developing (có lỗi + có thể improve) ---")
    history = [
        {"sender": "USER", "content": "Hello! I have a reservation. My name is Minh."},
        {"sender": "AI", "content": result1["response"]},
    ]
    start = time.time()
    result2 = get_conversation_answer(
        question="I want room with ocean view. How much it cost?",
        system_prompt=system_prompt,
        context="Travel - Hotel check-in",
        difficulty="BEGINNER",
        current_phase=result1["next_phase"] or "developing",
        history=history,
    )
    elapsed = time.time() - start
    print(f"   AI:          {result2['response']}")
    print(f"   Suggestions: {result2['suggestions']}")
    print(f"   Next phase:  {result2['next_phase'] or '(giữ nguyên)'}")
    print(f"   ⏱️ Thời gian: {elapsed:.1f}s")

    # Correction
    if result2["correction"]["has_error"]:
        print(f"   ✅ Phát hiện lỗi:")
        for err in result2["correction"]["errors"]:
            print(f"      ❌ {err['wrong']} → ✅ {err['correct']}")
    else:
        print("   ⚠️ Không phát hiện lỗi")

    # Improvement
    if result2["improvement"]["has_improvement"]:
        print(f"   ✅ Gợi ý hay hơn:")
        print(f"      💬 {result2['improvement']['original']}")
        print(f"      ✨ {result2['improvement']['improved']}")
    else:
        print("   ℹ️ Không có gợi ý cải thiện")

    print("\n" + "=" * 60)
    print("✅ TEST 5 COMPLETED — Full 4-chain pipeline hoạt động!")
    print("=" * 60)


# ============================================================================
# TEST 6: Session Scoring
# ============================================================================

def test_scoring():
    """Test scoring chain — chấm điểm tổng kết session."""
    print("\n" + "=" * 60)
    print("📊 TEST 6: Session Scoring")
    print("=" * 60)

    from src.scoring import score_conversation_session

    transcript = (
        "User: Hello! I want to check in please.\n"
        "AI: Welcome! Sure, may I have your name?\n"
        "User: My name is Minh. I have reservation.\n"
        "AI: Found it! Mr. Minh, 2 nights in an ocean view room, correct?\n"
        "User: Yes, that right. How much it cost?\n"
        "AI: It's $120 per night. Would you like to proceed?\n"
        "User: OK, I take it. Thank you!\n"
        "AI: Great! Here's your key card. Enjoy your stay!"
    )

    result = score_conversation_session(
        context="Travel - Hotel check-in",
        total_messages=8,
        error_count=2,
        transcript=transcript,
    )

    print(f"   Grammar:  {result['grammar_score']}/100")
    print(f"   Fluency:  {result['fluency_score']}/100")
    print(f"   Overall:  {result['overall_score']}/100")
    print(f"   Feedback: {result['feedback']}")
    assert 0 <= result["grammar_score"] <= 100, "Score ngoài phạm vi!"
    print("   ✅ PASSED")


# ============================================================================
# MAIN — Chọn test nào chạy
# ============================================================================

if __name__ == "__main__":
    print("🧪 LINGORA CONVERSATION ENGINE — TEST SUITE (4 Chains)")
    print("=" * 60)

    test_name = sys.argv[1] if len(sys.argv) > 1 else "all"

    tests = {
        "error":       test_error_chain,
        "response":    test_response_chain,
        "suggestion":  test_suggestion_chain,
        "improvement": test_improvement_chain,
        "pipeline":    test_full_pipeline,
        "scoring":     test_scoring,
    }

    if test_name == "all":
        for name, test_fn in tests.items():
            try:
                test_fn()
            except Exception as e:
                print(f"\n❌ TEST '{name}' FAILED: {e}")
    elif test_name in tests:
        tests[test_name]()
    else:
        print(f"❌ Test '{test_name}' không tồn tại.")
        print(f"   Có thể chạy: {', '.join(tests.keys())}, all")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("🎉 DONE! Tất cả tests đã chạy xong.")
    print("=" * 60)
