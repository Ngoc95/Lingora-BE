import eventBus from '~/events-handler/eventBus'
import { EVENTS } from '~/events-handler/constants'
import { rankingService } from '~/services/ranking.service'
import { XpActionType, XpReferenceType } from '~/enums/xpActionType.enum'

/**
 * Central XP-award dispatcher. Each producer service only needs to call
 *     eventBus.emit(EVENTS.XXX, { userId, classroomId?, referencedId? })
 * and this listener routes it to `rankingService.awardXp` with the correct
 * `XpActionType` and reference metadata. Every handler is isolated in its own
 * try/catch so a ranking failure can never break the primary business flow.
 */

type BasePayload = {
    userId: number
    classroomId?: number | null
    referencedId?: number | null
    description?: string
}

type ExamCompletedPayload = BasePayload & { isPass?: boolean; score?: number }
type ClassroomQuizPayload = BasePayload & { isPass?: boolean; score?: number }
type ConversationEndedPayload = BasePayload & { messageCount?: number }

const safeAward = async (
    payload: BasePayload,
    actionType: XpActionType,
    referenceType: XpReferenceType,
    extraDescription?: string
) => {
    try {
        await rankingService.awardXp({
            userId: payload.userId,
            actionType,
            classroomId: payload.classroomId ?? null,
            referencedId: payload.referencedId ?? null,
            referenceType,
            description: payload.description ?? extraDescription
        })
    } catch (err) {
        // Ranking should never break a primary action. Log and swallow.
         
        console.error(`[ranking.listener] awardXp failed for ${actionType}:`, err)
    }
}

// ─── Learning (global / personal) ─────────────────────────────────

eventBus.on(EVENTS.FLASHCARD_LEARNED, async (payload: BasePayload) => {
    await safeAward(payload, XpActionType.FLASHCARD_LEARNED, XpReferenceType.FLASHCARD)
})

eventBus.on(EVENTS.WORD_MASTERED, async (payload: BasePayload) => {
    await safeAward(payload, XpActionType.WORD_MASTERED, XpReferenceType.WORD)
})

eventBus.on(EVENTS.QUIZ_COMPLETED, async (payload: BasePayload) => {
    await safeAward(payload, XpActionType.QUIZ_COMPLETED, XpReferenceType.QUIZ)
})

eventBus.on(EVENTS.EXAM_COMPLETED, async (payload: ExamCompletedPayload) => {
    await safeAward(
        payload,
        XpActionType.EXAM_COMPLETED,
        XpReferenceType.EXAM_ATTEMPT,
        payload.score !== undefined ? `Điểm: ${payload.score}` : undefined
    )
})

// ─── Classroom-scoped ─────────────────────────────────────────────

eventBus.on(EVENTS.LESSON_COMPLETED, async (payload: BasePayload) => {
    await safeAward(payload, XpActionType.LESSON_COMPLETED, XpReferenceType.LESSON)
})

eventBus.on(EVENTS.CLASSROOM_QUIZ_SUBMITTED, async (payload: ClassroomQuizPayload) => {
    await safeAward(
        payload,
        XpActionType.CLASSROOM_QUIZ,
        XpReferenceType.CLASSROOM_QUIZ_ATTEMPT,
        payload.score !== undefined ? `Điểm: ${payload.score}` : undefined
    )
})

eventBus.on(EVENTS.CLASSROOM_CHAT_SENT, async (payload: BasePayload) => {
    await safeAward(payload, XpActionType.CLASSROOM_CHAT, XpReferenceType.CLASSROOM_CHAT_MESSAGE)
})

// ─── Conversation (AI chatbot) ────────────────────────────────────

eventBus.on(EVENTS.CONVERSATION_ENDED, async (payload: ConversationEndedPayload) => {
    await safeAward(
        payload,
        XpActionType.CONVERSATION_ENDED,
        XpReferenceType.CONVERSATION_SESSION,
        payload.messageCount !== undefined ? `${payload.messageCount} tin nhắn` : undefined
    )
})

// ─── Community ────────────────────────────────────────────────────

eventBus.on(EVENTS.POST_CREATED, async (payload: BasePayload) => {
    await safeAward(payload, XpActionType.POST_CREATED, XpReferenceType.POST)
})

// ─── Daily login ──────────────────────────────────────────────────

eventBus.on(EVENTS.DAILY_LOGIN, async (payload: BasePayload) => {
    await safeAward(payload, XpActionType.DAILY_LOGIN, XpReferenceType.SYSTEM)
})
