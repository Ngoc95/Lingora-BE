import { Request, Response } from 'express'
import { BadRequestError } from '~/core/error.response'
import { OK } from '~/core/success.response'
import { AdjustXpBodyReq } from '~/dtos/req/ranking/adjustXpBody.req'
import { GetClassroomLeaderboardQueryReq } from '~/dtos/req/ranking/getClassroomLeaderboardQuery.req'
import { GetGlobalLeaderboardQueryReq } from '~/dtos/req/ranking/getGlobalLeaderboardQuery.req'
import { GetMyRankQueryReq } from '~/dtos/req/ranking/getMyRankQuery.req'
import { GetXpHistoryQueryReq } from '~/dtos/req/ranking/getXpHistoryQuery.req'
import { User } from '~/entities/user.entity'
import { RankingPeriod, RankingScope } from '~/enums/rankingPeriod.enum'
import { XpActionType } from '~/enums/xpActionType.enum'
import { rankingService } from '~/services/ranking.service'

class RankingController {
    // ──────────────── Me ────────────────

    getMyStats = async (req: Request, res: Response) => {
        const userId = (req.user as User).id

        return new OK({
            message: 'Get my ranking stats successfully',
            metaData: await rankingService.getMyStats(userId)
        }).send(res)
    }

    getMyRank = async (req: Request, res: Response) => {
        const userId = (req.user as User).id

        const query: GetMyRankQueryReq = {
            period: (req.query.period as RankingPeriod) || RankingPeriod.WEEKLY,
            scope: (req.query.scope as RankingScope) || RankingScope.GLOBAL,
            classroomId: req.query.classroomId ? parseInt(req.query.classroomId as string) : undefined
        }

        if (query.scope === RankingScope.CLASSROOM && !query.classroomId) {
            throw new BadRequestError({ message: 'classroomId is required when scope=classroom' })
        }

        return new OK({
            message: 'Get my rank successfully',
            metaData: await rankingService.getMyRank(userId, query)
        }).send(res)
    }

    getMyXpHistory = async (req: Request, res: Response) => {
        const userId = (req.user as User).id

        const query: GetXpHistoryQueryReq = {
            ...req.parseQueryPagination,
            actionType: req.query.actionType as XpActionType | undefined,
            classroomId: req.query.classroomId ? parseInt(req.query.classroomId as string) : undefined
        }

        return new OK({
            message: 'Get my XP history successfully',
            metaData: await rankingService.getXpHistory(userId, query)
        }).send(res)
    }

    // ──────────────── Leaderboards ────────────────

    getGlobalLeaderboard = async (req: Request, res: Response) => {
        const query: GetGlobalLeaderboardQueryReq = {
            ...req.parseQueryPagination,
            period: (req.query.period as RankingPeriod) || RankingPeriod.WEEKLY
        }

        return new OK({
            message: 'Get global leaderboard successfully',
            metaData: await rankingService.getGlobalLeaderboard(query)
        }).send(res)
    }

    getClassroomLeaderboard = async (req: Request, res: Response) => {
        const classroomId = parseInt(req.params.classroomId)

        const query: GetClassroomLeaderboardQueryReq = {
            ...req.parseQueryPagination,
            period: (req.query.period as RankingPeriod) || RankingPeriod.WEEKLY
        }

        return new OK({
            message: 'Get classroom leaderboard successfully',
            metaData: await rankingService.getClassroomLeaderboard(classroomId, query)
        }).send(res)
    }

    getMyClassroomRank = async (req: Request, res: Response) => {
        const userId = (req.user as User).id
        const classroomId = parseInt(req.params.classroomId)

        return new OK({
            message: 'Get my classroom ranking stats successfully',
            metaData: await rankingService.getMyClassroomStats(userId, classroomId)
        }).send(res)
    }

    // ──────────────── Admin ────────────────

    adjustXp = async (req: Request, res: Response) => {
        const body = req.body as AdjustXpBodyReq

        if (!body?.userId || typeof body.xpAmount !== 'number') {
            throw new BadRequestError({ message: 'userId and xpAmount are required' })
        }

        return new OK({
            message: 'Adjust XP successfully',
            metaData: await rankingService.adjustXp(body)
        }).send(res)
    }

    recompute = async (req: Request, res: Response) => {
        const scope = (req.query.scope as RankingScope) || RankingScope.GLOBAL
        const period = (req.query.period as RankingPeriod) || RankingPeriod.WEEKLY
        const classroomId = req.query.classroomId ? parseInt(req.query.classroomId as string) : undefined

        if (scope === RankingScope.CLASSROOM && !classroomId) {
            throw new BadRequestError({ message: 'classroomId is required when scope=classroom' })
        }

        await rankingService.recomputeRanks({ scope, period, classroomId })

        return new OK({
            message: 'Recompute ranking successfully',
            metaData: { scope, period, classroomId }
        }).send(res)
    }
}

export const rankingController = new RankingController()
