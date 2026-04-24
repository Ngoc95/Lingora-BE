import { XpActionType } from '~/enums/xpActionType.enum'

/**
 * Base XP reward per action. Used when awardXp does not receive an explicit
 * customAmount. Tuned so that a fully engaged learner gains ~1 level/day.
 */
export const XP_REWARDS: Record<XpActionType, number> = {
    [XpActionType.FLASHCARD_LEARNED]: 2,
    [XpActionType.WORD_MASTERED]: 5,
    [XpActionType.QUIZ_COMPLETED]: 20,
    [XpActionType.EXAM_COMPLETED]: 50,
    [XpActionType.LESSON_COMPLETED]: 15,
    [XpActionType.CLASSROOM_QUIZ]: 25,
    [XpActionType.CLASSROOM_CHAT]: 1,
    [XpActionType.CONVERSATION_ENDED]: 30,
    [XpActionType.DAILY_LOGIN]: 5,
    [XpActionType.STREAK_BONUS]: 10,
    [XpActionType.POST_CREATED]: 3,
    [XpActionType.ADMIN_ADJUSTMENT]: 0
}

/**
 * Anti-spam daily caps. If a user already earned `>= cap` XP for a given
 * action on the current calendar day, further awards for that action are
 * ignored. Actions not listed here have no cap.
 */
export const DAILY_XP_CAPS: Partial<Record<XpActionType, number>> = {
    [XpActionType.FLASHCARD_LEARNED]: 60,
    [XpActionType.CLASSROOM_CHAT]: 10,
    [XpActionType.POST_CREATED]: 15,
    [XpActionType.DAILY_LOGIN]: 5
}

/**
 * Actions that count as "learning activity" and should also bump the user's
 * daily streak via streakService.recordActivity().
 */
export const LEARNING_ACTIONS: ReadonlySet<XpActionType> = new Set([
    XpActionType.FLASHCARD_LEARNED,
    XpActionType.WORD_MASTERED,
    XpActionType.QUIZ_COMPLETED,
    XpActionType.EXAM_COMPLETED,
    XpActionType.LESSON_COMPLETED,
    XpActionType.CLASSROOM_QUIZ,
    XpActionType.CONVERSATION_ENDED
])

/**
 * XP required to complete each level. Formula: level N → (N - 1) * 100 XP.
 * Ex: level 1 starts at 0 XP, level 2 at 100 XP, level 5 at 400 XP.
 */
export const XP_PER_LEVEL = 100

export const xpToLevel = (totalXp: number): number => {
    if (totalXp <= 0) return 1
    return Math.floor(totalXp / XP_PER_LEVEL) + 1
}

export const xpForNextLevel = (totalXp: number): { current: number; needed: number; progress: number } => {
    const level = xpToLevel(totalXp)
    const current = totalXp - (level - 1) * XP_PER_LEVEL
    const needed = XP_PER_LEVEL
    return {
        current,
        needed,
        progress: Math.min(1, current / needed)
    }
}
