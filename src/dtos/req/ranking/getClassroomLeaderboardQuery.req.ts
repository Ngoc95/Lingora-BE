import { RankingPeriod } from '~/enums/rankingPeriod.enum'

export interface GetClassroomLeaderboardQueryReq {
  page?: number
  limit?: number
  period?: RankingPeriod
}
