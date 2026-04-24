import { XpActionType, XpReferenceType } from '~/enums/xpActionType.enum'

/**
 * Internal payload used by rankingService.awardXp. Not exposed as an HTTP DTO.
 * Services / event listeners construct this and hand it to the ranking service.
 */
export interface AwardXpReq {
  userId: number
  actionType: XpActionType
  classroomId?: number | null
  referencedId?: number | null
  referenceType?: XpReferenceType | string | null
  /** Overrides XP_REWARDS[actionType] if provided. Used for ADMIN_ADJUSTMENT. */
  customAmount?: number
  description?: string
}
