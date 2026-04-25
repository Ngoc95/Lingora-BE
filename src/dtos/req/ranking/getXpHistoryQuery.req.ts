import { XpActionType } from '~/enums/xpActionType.enum'

export interface GetXpHistoryQueryReq {
  page?: number
  limit?: number
  actionType?: XpActionType
  classroomId?: number
}
