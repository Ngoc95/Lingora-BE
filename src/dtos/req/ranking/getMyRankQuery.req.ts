import { RankingPeriod, RankingScope } from '~/enums/rankingPeriod.enum'

export interface GetMyRankQueryReq {
  period?: RankingPeriod
  scope?: RankingScope
  classroomId?: number
}
