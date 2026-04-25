import { Router } from 'express'
import { rankingController } from '~/controllers/ranking.controller'
import { Resource } from '~/enums/resource.enum'
import { accessTokenValidation, checkPermission } from '~/middlewares/auth.middlewares'
import { checkParamMiddleware, checkQueryMiddleware } from '~/middlewares/common.middlewares'
import { wrapRequestHandler } from '~/utils/handler'

const rankingRouter = Router()

// access token validation
rankingRouter.use(accessTokenValidation)

// ──────────────── Me ────────────────

/**
 * @description : Get the caller's global ranking stats (level, XP, streak, ...)
 * @method : GET
 * @path : /rankings/me
 * @header : Authorization
 */
rankingRouter.get(
    '/me',
    wrapRequestHandler(checkPermission('readOwn', Resource.RANKING)),
    wrapRequestHandler(rankingController.getMyStats)
)

/**
 * @description : Get the caller's rank + neighbors for a given period/scope
 * @method : GET
 * @path : /rankings/me/rank?period=weekly|monthly|alltime&scope=global|classroom&classroomId=?
 * @header : Authorization
 */
rankingRouter.get(
    '/me/rank',
    wrapRequestHandler(checkPermission('readOwn', Resource.RANKING)),
    wrapRequestHandler(rankingController.getMyRank)
)

/**
 * @description : Get the caller's XP history (audit log)
 * @method : GET
 * @path : /rankings/me/history?limit=&page=&actionType=&classroomId=
 * @header : Authorization
 */
rankingRouter.get(
    '/me/history',
    wrapRequestHandler(checkPermission('readOwn', Resource.RANKING)),
    checkQueryMiddleware(),
    wrapRequestHandler(rankingController.getMyXpHistory)
)

// ──────────────── Global leaderboard ────────────────

/**
 * @description : Global leaderboard across all users
 * @method : GET
 * @path : /rankings/global?period=weekly|monthly|alltime&limit=&page=
 * @header : Authorization
 */
rankingRouter.get(
    '/global',
    wrapRequestHandler(checkPermission('readAny', Resource.RANKING)),
    checkQueryMiddleware(),
    wrapRequestHandler(rankingController.getGlobalLeaderboard)
)

// ──────────────── Classroom leaderboard ────────────────

/**
 * @description : Leaderboard scoped to a single classroom
 * @method : GET
 * @path : /rankings/classrooms/:classroomId?period=weekly|monthly|alltime&limit=&page=
 * @header : Authorization
 * @params : classroomId (number)
 */
rankingRouter.get(
    '/classrooms/:classroomId',
    wrapRequestHandler(checkPermission('readAny', Resource.RANKING)),
    checkParamMiddleware('classroomId'),
    checkQueryMiddleware(),
    wrapRequestHandler(rankingController.getClassroomLeaderboard)
)

/**
 * @description : The caller's ranking stats inside a single classroom
 * @method : GET
 * @path : /rankings/classrooms/:classroomId/me
 * @header : Authorization
 * @params : classroomId (number)
 */
rankingRouter.get(
    '/classrooms/:classroomId/me',
    wrapRequestHandler(checkPermission('readOwn', Resource.RANKING)),
    checkParamMiddleware('classroomId'),
    wrapRequestHandler(rankingController.getMyClassroomRank)
)

// ──────────────── Admin ────────────────

/**
 * @description : Manually adjust XP for a user (admin only)
 * @method : POST
 * @path : /rankings/admin/adjust
 * @header : Authorization
 * @body : { userId, xpAmount, classroomId?, description? }
 */
rankingRouter.post(
    '/admin/adjust',
    wrapRequestHandler(checkPermission('updateAny', Resource.RANKING)),
    wrapRequestHandler(rankingController.adjustXp)
)

/**
 * @description : Trigger rank recomputation (admin only)
 * @method : POST
 * @path : /rankings/admin/recompute?scope=global|classroom&period=weekly|monthly|alltime&classroomId=?
 * @header : Authorization
 */
rankingRouter.post(
    '/admin/recompute',
    wrapRequestHandler(checkPermission('updateAny', Resource.RANKING)),
    wrapRequestHandler(rankingController.recompute)
)

export default rankingRouter
