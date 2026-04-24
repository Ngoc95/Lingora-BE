import { RankingPeriod } from '~/enums/rankingPeriod.enum'

export interface GetGlobalLeaderboardQueryReq {
  page?: number
  limit?: number
  period?: RankingPeriod
}
