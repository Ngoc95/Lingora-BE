import { EntityManager, FindOptionsWhere } from 'typeorm'
import { BadRequestError, ForbiddenRequestError, NotFoundRequestError } from '~/core/error.response'
import { AdjustXpBodyReq } from '~/dtos/req/ranking/adjustXpBody.req'
import { AwardXpReq } from '~/dtos/req/ranking/awardXp.internal.req'
import { GetClassroomLeaderboardQueryReq } from '~/dtos/req/ranking/getClassroomLeaderboardQuery.req'
import { GetGlobalLeaderboardQueryReq } from '~/dtos/req/ranking/getGlobalLeaderboardQuery.req'
import { GetMyRankQueryReq } from '~/dtos/req/ranking/getMyRankQuery.req'
import { GetXpHistoryQueryReq } from '~/dtos/req/ranking/getXpHistoryQuery.req'
import { Classroom } from '~/entities/classroom.entity'
import { ClassroomMember } from '~/entities/classroomMember.entity'
import { User } from '~/entities/user.entity'
import { UserClassroomRankingStats } from '~/entities/userClassroomRankingStats.entity'
import { UserRankingStats } from '~/entities/userRankingStats.entity'
import { UserXpLog } from '~/entities/userXpLog.entity'
import { ClassroomMemberStatus } from '~/enums/classroomMemberStatus.enum'
import { RankingPeriod, RankingScope } from '~/enums/rankingPeriod.enum'
import { XpActionType } from '~/enums/xpActionType.enum'
import {
    DAILY_XP_CAPS,
    LEARNING_ACTIONS,
    XP_PER_LEVEL,
    XP_REWARDS,
    xpForNextLevel,
    xpToLevel
} from '~/constants/xpRules'
import { startOfDay, startOfIsoWeek, startOfMonth, startOfTomorrow } from '~/utils/date'
import { DatabaseService } from './database.service'
import { streakService } from './streak.service'

/**
 * Ranking service — Phase 2.
 *
 * Implements XP awarding (atomic, with daily caps, period rollover, streak
 * sync), personal stats, global leaderboard, and personal XP history.
 * Classroom reads / rank recomputation / rollover jobs land in Phase 3+.
 */
class RankingService {
    private db = DatabaseService.getInstance()

    // ──────────────── Write ────────────────

    /**
     * Grant XP to a user for a single action. Runs inside a transaction so that
     * the audit log + both snapshot tables stay consistent.
     *
     * Behaviour:
     *  - Resolves xp amount from XP_REWARDS unless `customAmount` is provided.
     *  - Enforces per-action daily caps (DAILY_XP_CAPS) using the `user_xp_log`
     *    rows created for the current calendar day. If already capped, no row
     *    is inserted and no stats are touched (silent no-op).
     *  - Inserts a `user_xp_log` row with optional classroom + reference.
     *  - Upserts the global `user_ranking_stats` snapshot, rolling over the
     *    weekly / monthly counters if the stored `*PeriodStart` is stale.
     *  - If `classroomId` is provided, upserts the per-classroom snapshot with
     *    the same period-rollover logic.
     *  - For "learning" actions, piggy-backs `streakService.recordActivity()`
     *    so callers don't need to double-call it.
     */
    awardXp = async (payload: AwardXpReq): Promise<UserXpLog | null> => {
        const {
            userId,
            actionType,
            classroomId = null,
            referencedId = null,
            referenceType = null,
            customAmount,
            description = null
        } = payload

        const baseAmount = typeof customAmount === 'number' ? customAmount : XP_REWARDS[actionType]
        if (!Number.isFinite(baseAmount) || baseAmount === 0) return null

        const userRepo = await this.db.getRepository(User)
        const user = await userRepo.findOne({ where: { id: userId }, select: ['id'] })
        if (!user) return null

        const now = new Date()
        const weekStart = startOfIsoWeek(now)
        const monthStart = startOfMonth(now)
        const todayStart = startOfDay(now)
        const tomorrowStart = startOfTomorrow(now)

        const result = await this.db.dataSource.transaction(async (manager) => {
            // 1. Daily cap check — count XP already earned today for this action.
            const cap = DAILY_XP_CAPS[actionType]
            let xpToAward = baseAmount

            if (typeof cap === 'number' && cap > 0 && baseAmount > 0) {
                const { sum } = (await manager
                    .getRepository(UserXpLog)
                    .createQueryBuilder('log')
                    .select('COALESCE(SUM(log.xpAmount), 0)', 'sum')
                    .where('log.userId = :userId', { userId })
                    .andWhere('log.actionType = :actionType', { actionType })
                    .andWhere('log.createdAt >= :from AND log.createdAt < :to', {
                        from: todayStart,
                        to: tomorrowStart
                    })
                    .getRawOne<{ sum: string }>()) ?? { sum: '0' }

                const alreadyEarned = parseInt(sum, 10) || 0
                const remaining = cap - alreadyEarned
                if (remaining <= 0) return null
                xpToAward = Math.min(baseAmount, remaining)
            }

            if (xpToAward <= 0) return null

            // 2. Insert audit log row.
            const logRepo = manager.getRepository(UserXpLog)
            const logRow = logRepo.create({
                user: { id: userId } as User,
                classroom: classroomId ? ({ id: classroomId } as any) : null,
                xpAmount: xpToAward,
                actionType,
                referencedId: referencedId ?? null,
                referenceType: referenceType ?? null,
                description: description ?? null
            })
            const savedLog = await logRepo.save(logRow)

            // 3. Upsert global stats.
            await this.upsertGlobalStats(manager, userId, xpToAward, weekStart, monthStart)

            // 4. Upsert classroom stats (only if action is tied to a class).
            if (classroomId) {
                await this.upsertClassroomStats(manager, userId, classroomId, xpToAward, weekStart, monthStart)
            }

            return savedLog
        })

        // 5. Post-commit side-effect: streak for learning actions.
        if (result && LEARNING_ACTIONS.has(actionType)) {
            await streakService.recordActivity(userId).catch(() => void 0)
            // Mirror latest streak into the ranking snapshot so getMyStats is in sync.
            await this.syncStreakToStats(userId)
        }

        return result
    }

    /**
     * Make sure the (user, classroom) row exists in user_classroom_ranking_stats.
     * Called when a user is admitted into a classroom so their leaderboard entry
     * shows up with 0 XP instead of being missing.
     */
    ensureClassroomStatsRow = async (userId: number, classroomId: number): Promise<void> => {
        const repo = await this.db.getRepository(UserClassroomRankingStats)
        const existing = await repo.findOne({
            where: { user: { id: userId }, classroom: { id: classroomId } }
        })
        if (existing) return

        const row = repo.create({
            user: { id: userId } as User,
            classroom: { id: classroomId } as any,
            totalXp: 0,
            weeklyXp: 0,
            monthlyXp: 0,
            weeklyPeriodStart: startOfIsoWeek(),
            monthlyPeriodStart: startOfMonth()
        })
        await repo.save(row)
    }

    // ──────────────── Read ────────────────

    /**
     * Global ranking card for the caller. Always returns a row — creates an
     * empty snapshot on first call so the UI has something to render.
     */
    getMyStats = async (userId: number) => {
        const stats = await this.getOrCreateGlobalStats(userId)
        const progress = xpForNextLevel(stats.totalXp)

        return {
            userId,
            level: stats.level,
            totalXp: stats.totalXp,
            weeklyXp: this.coerceForPeriod(stats.weeklyXp, stats.weeklyPeriodStart, 'weekly'),
            monthlyXp: this.coerceForPeriod(stats.monthlyXp, stats.monthlyPeriodStart, 'monthly'),
            streak: stats.streak,
            activityScore: stats.activityScore,
            rankWeekly: stats.rankWeekly ?? null,
            rankMonthly: stats.rankMonthly ?? null,
            rankAlltime: stats.rankAlltime ?? null,
            xpPerLevel: XP_PER_LEVEL,
            levelProgress: progress,
            updatedAt: stats.updatedAt
        }
    }

    /**
     * Classroom ranking card for the caller inside a single classroom.
     * Auto-creates an empty row on first call — same shape as `getMyStats`
     * but scoped to `(user, classroom)`.
     */
    getMyClassroomStats = async (userId: number, classroomId: number) => {
        await this.assertClassroomAccess(userId, classroomId)

        const row = await this.getOrCreateClassroomStats(userId, classroomId)

        return {
            userId,
            classroomId,
            totalXp: row.totalXp,
            weeklyXp: this.coerceForPeriod(row.weeklyXp, row.weeklyPeriodStart, 'weekly'),
            monthlyXp: this.coerceForPeriod(row.monthlyXp, row.monthlyPeriodStart, 'monthly'),
            rankWeekly: row.rankWeekly ?? null,
            rankMonthly: row.rankMonthly ?? null,
            rankAlltime: row.rankAlltime ?? null,
            updatedAt: row.updatedAt
        }
    }

    /**
     * Paginated global leaderboard. The `rank` on each entry is computed from
     * the stable sort position — no reliance on the snapshot `rank*` columns
     * (those are filled asynchronously by the recompute job in Phase 4).
     *
     * For WEEKLY / MONTHLY we exclude rows whose stored `*PeriodStart` is
     * older than the current period — those users have not been active in
     * the period and effectively have 0 XP.
     */
    getGlobalLeaderboard = async (query: GetGlobalLeaderboardQueryReq) => {
        const period = query.period ?? RankingPeriod.WEEKLY
        const page = Math.max(1, query.page ?? 1)
        const limit = Math.min(100, Math.max(1, query.limit ?? 20))

        const repo = await this.db.getRepository(UserRankingStats)
        const qb = repo
            .createQueryBuilder('stats')
            .innerJoinAndSelect('stats.user', 'user')

        const currentWeek = startOfIsoWeek()
        const currentMonth = startOfMonth()

        if (period === RankingPeriod.WEEKLY) {
            qb.andWhere('stats.weeklyPeriodStart = :currentWeek', { currentWeek })
                .andWhere('stats.weeklyXp > 0')
                .orderBy('stats.weeklyXp', 'DESC')
        } else if (period === RankingPeriod.MONTHLY) {
            qb.andWhere('stats.monthlyPeriodStart = :currentMonth', { currentMonth })
                .andWhere('stats.monthlyXp > 0')
                .orderBy('stats.monthlyXp', 'DESC')
        } else {
            qb.andWhere('stats.totalXp > 0').orderBy('stats.totalXp', 'DESC')
        }

        qb.addOrderBy('stats.updatedAt', 'ASC')
            .addOrderBy('user.id', 'ASC')
            .skip((page - 1) * limit)
            .take(limit)

        const [rows, total] = await qb.getManyAndCount()

        const items = rows.map((r, i) => this.toLeaderboardEntry(r, period, (page - 1) * limit + i + 1))

        return { items, page, limit, total, period }
    }

    /**
     * Leaderboard scoped to one classroom. Only ACTIVE members are included
     * so kicked / pending members don't pollute the ranking. Ordering /
     * period-filtering mirror `getGlobalLeaderboard` but over the
     * `user_classroom_ranking_stats` table.
     */
    getClassroomLeaderboard = async (classroomId: number, query: GetClassroomLeaderboardQueryReq) => {
        const period = query.period ?? RankingPeriod.WEEKLY
        const page = Math.max(1, query.page ?? 1)
        const limit = Math.min(100, Math.max(1, query.limit ?? 20))

        // Make sure the classroom exists before running the leaderboard query.
        const classroomRepo = await this.db.getRepository(Classroom)
        const classroom = await classroomRepo.findOne({ where: { id: classroomId } })
        if (!classroom) throw new NotFoundRequestError('Classroom not found')

        const repo = await this.db.getRepository(UserClassroomRankingStats)
        const qb = repo
            .createQueryBuilder('stats')
            .innerJoinAndSelect('stats.user', 'user')
            .innerJoin(
                ClassroomMember,
                'member',
                'member.user = user.id AND member.classroom = stats.classroom AND member.status = :active',
                { active: ClassroomMemberStatus.ACTIVE }
            )
            .where('stats.classroom = :classroomId', { classroomId })

        const currentWeek = startOfIsoWeek()
        const currentMonth = startOfMonth()

        if (period === RankingPeriod.WEEKLY) {
            qb.andWhere('stats.weeklyPeriodStart = :currentWeek', { currentWeek })
                .andWhere('stats.weeklyXp > 0')
                .orderBy('stats.weeklyXp', 'DESC')
        } else if (period === RankingPeriod.MONTHLY) {
            qb.andWhere('stats.monthlyPeriodStart = :currentMonth', { currentMonth })
                .andWhere('stats.monthlyXp > 0')
                .orderBy('stats.monthlyXp', 'DESC')
        } else {
            qb.andWhere('stats.totalXp > 0').orderBy('stats.totalXp', 'DESC')
        }

        qb.addOrderBy('stats.updatedAt', 'ASC')
            .addOrderBy('user.id', 'ASC')
            .skip((page - 1) * limit)
            .take(limit)

        const [rows, total] = await qb.getManyAndCount()

        const items = rows.map((r, i) =>
            this.toClassroomLeaderboardEntry(r, period, (page - 1) * limit + i + 1)
        )

        return {
            items,
            page,
            limit,
            total,
            period,
            classroom: { id: classroom.id, name: classroom.name, code: classroom.code }
        }
    }

    /**
     * Return the caller's rank + immediate neighbors (one above, self, one
     * below) for the given scope/period. If the caller isn't in the
     * leaderboard yet (no XP / wrong period), `rank` is null and
     * `neighbors` only contains `self` with rank null.
     */
    getMyRank = async (userId: number, query: GetMyRankQueryReq) => {
        const period = query.period ?? RankingPeriod.WEEKLY
        const scope = query.scope ?? RankingScope.GLOBAL

        if (scope === RankingScope.CLASSROOM) {
            if (!query.classroomId) {
                throw new BadRequestError({ message: 'classroomId is required when scope=classroom' })
            }
            await this.assertClassroomAccess(userId, query.classroomId)
            return await this.computeRankWithNeighbors({
                userId,
                period,
                scope,
                classroomId: query.classroomId
            })
        }

        return await this.computeRankWithNeighbors({ userId, period, scope })
    }

    /**
     * Paginated audit log of XP earned / deducted by the caller.
     */
    getXpHistory = async (userId: number, query: GetXpHistoryQueryReq) => {
        const page = Math.max(1, query.page ?? 1)
        const limit = Math.min(100, Math.max(1, query.limit ?? 20))

        const repo = await this.db.getRepository(UserXpLog)
        const where: FindOptionsWhere<UserXpLog> = { user: { id: userId } }
        if (query.actionType) where.actionType = query.actionType
        if (query.classroomId) where.classroom = { id: query.classroomId } as any

        const [rows, total] = await repo.findAndCount({
            where,
            relations: { classroom: true },
            order: { createdAt: 'DESC', id: 'DESC' },
            skip: (page - 1) * limit,
            take: limit
        })

        const items = rows.map((r) => ({
            id: r.id,
            xpAmount: r.xpAmount,
            actionType: r.actionType,
            referencedId: r.referencedId ?? null,
            referenceType: r.referenceType ?? null,
            description: r.description ?? null,
            classroomId: r.classroom?.id ?? null,
            classroomName: r.classroom?.name ?? null,
            createdAt: r.createdAt
        }))

        return { items, page, limit, total }
    }

    // ──────────────── Admin / jobs ────────────────

    adjustXp = async (_payload: AdjustXpBodyReq) => {
        // TODO(phase-7)
        throw new BadRequestError({ message: 'Admin XP adjustment — available in Phase 7' })
    }

    /**
     * Recompute the cached `rank*` columns on the snapshot tables using a
     * single `ROW_NUMBER()` window UPDATE. Designed to be cheap enough to run
     * every hour.
     *
     *  - `scope = GLOBAL`    → rewrites ranks on `user_ranking_stats`.
     *  - `scope = CLASSROOM` → rewrites ranks on `user_classroom_ranking_stats`,
     *    partitioned per classroom. If `classroomId` is provided, only that
     *    one classroom is touched; otherwise all classrooms are recomputed
     *    in a single statement.
     *
     * Rows that don't qualify for the current period (stale `*PeriodStart` /
     * 0 XP) have their rank NULLed out so they never look stale on the UI.
     */
    recomputeRanks = async (opts: {
        scope: RankingScope
        period: RankingPeriod
        classroomId?: number
    }): Promise<void> => {
        const { scope, period, classroomId } = opts

        const ds = this.db.dataSource
        const esc = (s: string) => ds.driver.escape(s)

        const statsEntity =
            scope === RankingScope.CLASSROOM ? UserClassroomRankingStats : UserRankingStats
        const meta = ds.getMetadata(statsEntity)

        const colName = (propertyPath: string): string => {
            const col = meta.findColumnWithPropertyPath(propertyPath)
            if (col) return esc(col.databaseName)
            const rel = meta.findRelationWithPropertyPath(propertyPath)
            if (rel && rel.joinColumns.length > 0) return esc(rel.joinColumns[0].databaseName)
            throw new Error(`Unknown property ${propertyPath} on ${meta.tableName}`)
        }

        const table = esc(meta.tableName)
        const idCol = colName('id')
        const updatedAtCol = colName('updatedAt')

        const rankProp =
            period === RankingPeriod.WEEKLY
                ? 'rankWeekly'
                : period === RankingPeriod.MONTHLY
                    ? 'rankMonthly'
                    : 'rankAlltime'
        const xpProp =
            period === RankingPeriod.WEEKLY
                ? 'weeklyXp'
                : period === RankingPeriod.MONTHLY
                    ? 'monthlyXp'
                    : 'totalXp'

        const rankCol = colName(rankProp)
        const xpCol = colName(xpProp)

        const periodStartCol =
            period === RankingPeriod.WEEKLY
                ? colName('weeklyPeriodStart')
                : period === RankingPeriod.MONTHLY
                    ? colName('monthlyPeriodStart')
                    : null

        const classroomCol = scope === RankingScope.CLASSROOM ? colName('classroom') : null

        const params: any[] = []
        const pushParam = (val: unknown): string => {
            params.push(val)
            return `$${params.length}`
        }

        const currentPeriodStart =
            period === RankingPeriod.WEEKLY
                ? startOfIsoWeek()
                : period === RankingPeriod.MONTHLY
                    ? startOfMonth()
                    : null

        // Build the filter that selects rows qualifying for ranking.
        const qualifyParts: string[] = [`${xpCol} > 0`]
        if (periodStartCol && currentPeriodStart) {
            qualifyParts.push(`${periodStartCol} = ${pushParam(currentPeriodStart)}`)
        }
        if (scope === RankingScope.CLASSROOM && classroomId && classroomCol) {
            qualifyParts.push(`${classroomCol} = ${pushParam(classroomId)}`)
        }
        const qualifyClause = qualifyParts.join(' AND ')

        const partitionClause =
            scope === RankingScope.CLASSROOM && classroomCol
                ? `PARTITION BY ${classroomCol}`
                : ''

        const updateSql = `
            UPDATE ${table} AS t
            SET ${rankCol} = r.rn
            FROM (
                SELECT ${idCol} AS id,
                       ROW_NUMBER() OVER (
                           ${partitionClause}
                           ORDER BY ${xpCol} DESC, ${updatedAtCol} ASC, ${idCol} ASC
                       )::int AS rn
                FROM ${table}
                WHERE ${qualifyClause}
            ) r
            WHERE t.${idCol} = r.id
        `

        await ds.query(updateSql, params)

        // NULL out ranks for rows that no longer qualify (0 XP or stale period
        // or, for classroom scope with a classroomId filter, other classrooms
        // are left untouched).
        const disqualifyParts: string[] = [`${xpCol} <= 0`]
        const disqualifyParams: any[] = []
        const pushDisqualifyParam = (val: unknown): string => {
            disqualifyParams.push(val)
            return `$${disqualifyParams.length}`
        }

        if (periodStartCol && currentPeriodStart) {
            disqualifyParts.push(
                `(${periodStartCol} IS NULL OR ${periodStartCol} <> ${pushDisqualifyParam(
                    currentPeriodStart
                )})`
            )
        }

        let scopeFilter = ''
        if (scope === RankingScope.CLASSROOM && classroomId && classroomCol) {
            scopeFilter = `${classroomCol} = ${pushDisqualifyParam(classroomId)} AND `
        }

        const nullifySql = `
            UPDATE ${table}
            SET ${rankCol} = NULL
            WHERE ${scopeFilter}${rankCol} IS NOT NULL
              AND (${disqualifyParts.join(' OR ')})
        `
        await ds.query(nullifySql, disqualifyParams)
    }

    /**
     * Zero out `weeklyXp` on every snapshot row whose `weeklyPeriodStart` is
     * older than the current ISO-week boundary. Idempotent: safe to run
     * repeatedly. Does NOT touch `totalXp`.
     *
     * Note: XP awarded via `awardXp` also rolls over lazily per-user, so this
     * job mainly exists to keep leaderboards correct for users who were not
     * active at all during the new period.
     */
    rollWeeklyReset = async (): Promise<void> => {
        const currentWeek = startOfIsoWeek()
        await this.rollResetFor(UserRankingStats, 'weekly', currentWeek)
        await this.rollResetFor(UserClassroomRankingStats, 'weekly', currentWeek)
    }

    /**
     * Zero out `monthlyXp` on every snapshot row whose `monthlyPeriodStart`
     * is older than the current month boundary. Idempotent.
     */
    rollMonthlyReset = async (): Promise<void> => {
        const currentMonth = startOfMonth()
        await this.rollResetFor(UserRankingStats, 'monthly', currentMonth)
        await this.rollResetFor(UserClassroomRankingStats, 'monthly', currentMonth)
    }

    /**
     * Recompute the last-7-days activity score for a user based on how many
     * distinct calendar days have an XP-log row. Value is normalised to the
     * range `[0, 20]` to match the ranking formula bonus.
     */
    computeActivityScore = async (userId: number): Promise<number> => {
        const repo = await this.db.getRepository(UserXpLog)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
        const from = startOfDay(sevenDaysAgo)

        const result = await repo
            .createQueryBuilder('log')
            .select('COUNT(DISTINCT DATE(log.createdAt))', 'days')
            .where('log.userId = :userId', { userId })
            .andWhere('log.createdAt >= :from', { from })
            .getRawOne<{ days: string }>()

        const distinctDays = parseInt(result?.days ?? '0', 10) || 0
        const score = (distinctDays / 7) * 20
        return Math.max(0, Math.min(20, Math.round(score * 100) / 100))
    }

    /**
     * Recompute activityScore for every user whose stats row was updated in
     * the last 24h (plus anyone with a recent XP log). Used by the hourly
     * cron job — avoids a full-table sweep by filtering on recent activity.
     */
    recomputeActivityScores = async (): Promise<void> => {
        const ds = this.db.dataSource
        const esc = (s: string) => ds.driver.escape(s)
        const logMeta = ds.getMetadata(UserXpLog)

        const logTable = esc(logMeta.tableName)
        const userCol = esc(
            logMeta.findRelationWithPropertyPath('user')!.joinColumns[0].databaseName
        )
        const createdAtCol = esc(
            logMeta.findColumnWithPropertyPath('createdAt')!.databaseName
        )

        const since = new Date()
        since.setHours(since.getHours() - 24)

        // Find users who had any XP log in the last 24h — those are the only
        // ones whose activityScore can change.
        const rows: Array<{ userId: number }> = await ds.query(
            `SELECT DISTINCT ${userCol} AS "userId"
               FROM ${logTable}
              WHERE ${createdAtCol} >= $1`,
            [since]
        )

        if (rows.length === 0) return

        const statsRepo = await this.db.getRepository(UserRankingStats)
        for (const { userId } of rows) {
            const score = await this.computeActivityScore(userId)
            await statsRepo.update({ user: { id: userId } }, { activityScore: score })
        }
    }

    // ──────────────── Internal helpers ────────────────

    /**
     * Shared implementation for `rollWeeklyReset` / `rollMonthlyReset`: zero
     * out the relevant XP counter on rows whose `*PeriodStart` is stale and
     * refresh the period-start marker so later reads show a clean slate.
     */
    private async rollResetFor(
        statsEntity: typeof UserRankingStats | typeof UserClassroomRankingStats,
        period: 'weekly' | 'monthly',
        currentPeriodStart: Date
    ): Promise<void> {
        const ds = this.db.dataSource
        const esc = (s: string) => ds.driver.escape(s)

        const meta = ds.getMetadata(statsEntity)
        const colName = (propertyPath: string): string => {
            const col = meta.findColumnWithPropertyPath(propertyPath)
            if (!col) throw new Error(`Unknown property ${propertyPath} on ${meta.tableName}`)
            return esc(col.databaseName)
        }

        const table = esc(meta.tableName)
        const xpCol = colName(period === 'weekly' ? 'weeklyXp' : 'monthlyXp')
        const periodStartCol = colName(
            period === 'weekly' ? 'weeklyPeriodStart' : 'monthlyPeriodStart'
        )
        const rankCol = colName(period === 'weekly' ? 'rankWeekly' : 'rankMonthly')

        await ds.query(
            `UPDATE ${table}
                SET ${xpCol} = 0,
                    ${rankCol} = NULL,
                    ${periodStartCol} = $1
              WHERE ${periodStartCol} IS NULL
                 OR ${periodStartCol} <> $1`,
            [currentPeriodStart]
        )
    }

    /** Atomically upsert the global stats row for a user. */
    private async upsertGlobalStats(
        manager: EntityManager,
        userId: number,
        xpDelta: number,
        weekStart: Date,
        monthStart: Date
    ): Promise<UserRankingStats> {
        const repo = manager.getRepository(UserRankingStats)
        let row = await repo.findOne({ where: { user: { id: userId } } })

        if (!row) {
            row = repo.create({
                user: { id: userId } as User,
                totalXp: 0,
                weeklyXp: 0,
                monthlyXp: 0,
                level: 1,
                activityScore: 0,
                streak: 0,
                weeklyPeriodStart: weekStart,
                monthlyPeriodStart: monthStart
            })
        }

        const weeklyStillCurrent = this.samePeriodDate(row.weeklyPeriodStart, weekStart)
        const monthlyStillCurrent = this.samePeriodDate(row.monthlyPeriodStart, monthStart)

        row.totalXp = row.totalXp + xpDelta
        row.weeklyXp = (weeklyStillCurrent ? row.weeklyXp : 0) + xpDelta
        row.monthlyXp = (monthlyStillCurrent ? row.monthlyXp : 0) + xpDelta
        row.weeklyPeriodStart = weekStart
        row.monthlyPeriodStart = monthStart
        row.level = xpToLevel(row.totalXp)

        return await repo.save(row)
    }

    /** Atomically upsert the per-classroom stats row for a user. */
    private async upsertClassroomStats(
        manager: EntityManager,
        userId: number,
        classroomId: number,
        xpDelta: number,
        weekStart: Date,
        monthStart: Date
    ): Promise<UserClassroomRankingStats> {
        const repo = manager.getRepository(UserClassroomRankingStats)
        let row = await repo.findOne({
            where: { user: { id: userId }, classroom: { id: classroomId } }
        })

        if (!row) {
            row = repo.create({
                user: { id: userId } as User,
                classroom: { id: classroomId } as any,
                totalXp: 0,
                weeklyXp: 0,
                monthlyXp: 0,
                weeklyPeriodStart: weekStart,
                monthlyPeriodStart: monthStart
            })
        }

        const weeklyStillCurrent = this.samePeriodDate(row.weeklyPeriodStart, weekStart)
        const monthlyStillCurrent = this.samePeriodDate(row.monthlyPeriodStart, monthStart)

        row.totalXp = row.totalXp + xpDelta
        row.weeklyXp = (weeklyStillCurrent ? row.weeklyXp : 0) + xpDelta
        row.monthlyXp = (monthlyStillCurrent ? row.monthlyXp : 0) + xpDelta
        row.weeklyPeriodStart = weekStart
        row.monthlyPeriodStart = monthStart

        return await repo.save(row)
    }

    /** Ensure a global-stats row exists for this user. */
    private async getOrCreateGlobalStats(userId: number): Promise<UserRankingStats> {
        const repo = await this.db.getRepository(UserRankingStats)
        const existing = await repo.findOne({ where: { user: { id: userId } } })
        if (existing) return existing

        const user = await (await this.db.getRepository(User)).findOne({
            where: { id: userId },
            select: ['id']
        })
        if (!user) throw new NotFoundRequestError('User not found')

        const row = repo.create({
            user: { id: userId } as User,
            totalXp: 0,
            weeklyXp: 0,
            monthlyXp: 0,
            level: 1,
            activityScore: 0,
            streak: 0,
            weeklyPeriodStart: startOfIsoWeek(),
            monthlyPeriodStart: startOfMonth()
        })
        return await repo.save(row)
    }

    /** Mirror the latest User.currentStreak into the global stats snapshot. */
    private async syncStreakToStats(userId: number): Promise<void> {
        const userRepo = await this.db.getRepository(User)
        const user = await userRepo.findOne({
            where: { id: userId },
            select: ['id', 'currentStreak']
        })
        if (!user) return

        const statsRepo = await this.db.getRepository(UserRankingStats)
        await statsRepo.update({ user: { id: userId } }, { streak: user.currentStreak })
    }

    /** TypeORM stores `type: 'date'` as a string ("YYYY-MM-DD") on read. */
    private samePeriodDate(stored: Date | string | null | undefined, target: Date): boolean {
        if (!stored) return false
        const storedDate = typeof stored === 'string' ? new Date(stored) : stored
        return startOfDay(storedDate).getTime() === startOfDay(target).getTime()
    }

    /** Zero-out a weekly/monthly counter when its stored period is stale. */
    private coerceForPeriod(
        value: number,
        periodStart: Date | string | null | undefined,
        period: 'weekly' | 'monthly'
    ): number {
        const current = period === 'weekly' ? startOfIsoWeek() : startOfMonth()
        return this.samePeriodDate(periodStart, current) ? value : 0
    }

    private toLeaderboardEntry(row: UserRankingStats, period: RankingPeriod, rank: number) {
        const xp =
            period === RankingPeriod.WEEKLY
                ? row.weeklyXp
                : period === RankingPeriod.MONTHLY
                    ? row.monthlyXp
                    : row.totalXp

        return {
            rank,
            userId: row.user.id,
            username: row.user.username,
            avatar: row.user.avatar ?? null,
            level: row.level,
            streak: row.streak,
            totalXp: row.totalXp,
            weeklyXp: row.weeklyXp,
            monthlyXp: row.monthlyXp,
            xp
        }
    }

    private toClassroomLeaderboardEntry(
        row: UserClassroomRankingStats,
        period: RankingPeriod,
        rank: number
    ) {
        const xp =
            period === RankingPeriod.WEEKLY
                ? row.weeklyXp
                : period === RankingPeriod.MONTHLY
                    ? row.monthlyXp
                    : row.totalXp

        return {
            rank,
            userId: row.user.id,
            username: row.user.username,
            avatar: row.user.avatar ?? null,
            totalXp: row.totalXp,
            weeklyXp: row.weeklyXp,
            monthlyXp: row.monthlyXp,
            xp
        }
    }

    /** Fetch or lazily create the (user, classroom) stats row. */
    private async getOrCreateClassroomStats(
        userId: number,
        classroomId: number
    ): Promise<UserClassroomRankingStats> {
        const repo = await this.db.getRepository(UserClassroomRankingStats)
        const existing = await repo.findOne({
            where: { user: { id: userId }, classroom: { id: classroomId } }
        })
        if (existing) return existing

        const row = repo.create({
            user: { id: userId } as User,
            classroom: { id: classroomId } as Classroom,
            totalXp: 0,
            weeklyXp: 0,
            monthlyXp: 0,
            weeklyPeriodStart: startOfIsoWeek(),
            monthlyPeriodStart: startOfMonth()
        })
        return await repo.save(row)
    }

    /**
     * Make sure `userId` can read ranking data for `classroomId`. Teachers and
     * ACTIVE members both qualify. Throws `ForbiddenRequestError` otherwise.
     */
    private async assertClassroomAccess(userId: number, classroomId: number): Promise<void> {
        const classroomRepo = await this.db.getRepository(Classroom)
        const classroom = await classroomRepo.findOne({
            where: { id: classroomId },
            relations: { teacher: true }
        })
        if (!classroom) throw new NotFoundRequestError('Classroom not found')

        if (classroom.teacher?.id === userId) return

        const memberRepo = await this.db.getRepository(ClassroomMember)
        const member = await memberRepo.findOne({
            where: {
                classroom: { id: classroomId },
                user: { id: userId },
                status: ClassroomMemberStatus.ACTIVE
            }
        })
        if (!member) {
            throw new ForbiddenRequestError('You are not a member of this classroom')
        }
    }

    /**
     * Compute the caller's rank + immediate neighbors (one above, self, one
     * below). Uses a single raw SQL with `ROW_NUMBER()` so the rank reflects
     * the authoritative sort order (independent of snapshot columns).
     */
    private async computeRankWithNeighbors(opts: {
        userId: number
        period: RankingPeriod
        scope: RankingScope
        classroomId?: number
    }) {
        const { userId, period, scope, classroomId } = opts

        const ds = this.db.dataSource
        const driver = ds.driver
        const esc = (s: string) => driver.escape(s)

        const statsEntity =
            scope === RankingScope.CLASSROOM ? UserClassroomRankingStats : UserRankingStats
        const statsMeta = ds.getMetadata(statsEntity)
        const memberMeta = ds.getMetadata(ClassroomMember)
        const userMeta = ds.getMetadata(User)

        const colName = (meta: typeof statsMeta, propertyPath: string): string => {
            const col = meta.findColumnWithPropertyPath(propertyPath)
            if (col) return esc(col.databaseName)
            const rel = meta.findRelationWithPropertyPath(propertyPath)
            if (rel && rel.joinColumns.length > 0) return esc(rel.joinColumns[0].databaseName)
            throw new Error(`Unknown property ${propertyPath} on ${meta.tableName}`)
        }

        const xpProp =
            period === RankingPeriod.WEEKLY
                ? 'weeklyXp'
                : period === RankingPeriod.MONTHLY
                    ? 'monthlyXp'
                    : 'totalXp'

        const statsTable = esc(statsMeta.tableName)
        const userTable = esc(userMeta.tableName)
        const memberTable = esc(memberMeta.tableName)

        const xpCol = colName(statsMeta, xpProp)
        const statsUserCol = colName(statsMeta, 'user')
        const statsUpdatedAtCol = colName(statsMeta, 'updatedAt')
        const statsClassroomCol =
            scope === RankingScope.CLASSROOM ? colName(statsMeta, 'classroom') : null
        const statsPeriodStartCol =
            period === RankingPeriod.WEEKLY
                ? colName(statsMeta, 'weeklyPeriodStart')
                : period === RankingPeriod.MONTHLY
                    ? colName(statsMeta, 'monthlyPeriodStart')
                    : null

        const memberUserCol = colName(memberMeta, 'user')
        const memberClassroomCol = colName(memberMeta, 'classroom')
        const memberStatusCol = colName(memberMeta, 'status')

        const userIdCol = colName(userMeta, 'id')
        const userUsernameCol = colName(userMeta, 'username')
        const userAvatarCol = colName(userMeta, 'avatar')

        const params: any[] = []
        const pushParam = (val: unknown): string => {
            params.push(val)
            return `$${params.length}`
        }

        const userParam = pushParam(userId)

        const currentPeriodStart =
            period === RankingPeriod.WEEKLY
                ? startOfIsoWeek()
                : period === RankingPeriod.MONTHLY
                    ? startOfMonth()
                    : null

        const whereParts: string[] = [`s.${xpCol} > 0`]
        let memberJoin = ''

        if (scope === RankingScope.CLASSROOM && classroomId && statsClassroomCol) {
            whereParts.push(`s.${statsClassroomCol} = ${pushParam(classroomId)}`)
            memberJoin = `INNER JOIN ${memberTable} cm
                             ON cm.${memberUserCol} = s.${statsUserCol}
                            AND cm.${memberClassroomCol} = s.${statsClassroomCol}
                            AND cm.${memberStatusCol} = ${pushParam(ClassroomMemberStatus.ACTIVE)}`
        }

        if (currentPeriodStart && statsPeriodStartCol) {
            whereParts.push(`s.${statsPeriodStartCol} = ${pushParam(currentPeriodStart)}`)
        }

        const whereClause = `WHERE ${whereParts.join(' AND ')}`

        const sql = `
            WITH ranked AS (
                SELECT
                    s.${statsUserCol} AS "userId",
                    s.${xpCol}        AS xp,
                    ROW_NUMBER() OVER (
                        ORDER BY s.${xpCol} DESC, s.${statsUpdatedAtCol} ASC, s.${statsUserCol} ASC
                    )::int AS rank
                FROM ${statsTable} s
                ${memberJoin}
                ${whereClause}
            ),
            me AS (
                SELECT rank, xp FROM ranked WHERE "userId" = ${userParam}
            )
            SELECT r."userId"::int                AS "userId",
                   r.xp::int                      AS xp,
                   r.rank::int                    AS rank,
                   u.${userUsernameCol}           AS username,
                   u.${userAvatarCol}             AS avatar,
                   (SELECT COUNT(*)::int FROM ranked) AS total
              FROM ranked r
              INNER JOIN ${userTable} u ON u.${userIdCol} = r."userId"
              WHERE r.rank IN (
                  COALESCE((SELECT rank FROM me) - 1, -1),
                  COALESCE((SELECT rank FROM me),     -1),
                  COALESCE((SELECT rank FROM me) + 1, -1)
              )
              ORDER BY r.rank ASC
        `

        type Row = {
            userId: number
            xp: number
            rank: number
            username: string
            avatar: string | null
            total: number
        }
        const rows: Row[] = await this.db.dataSource.query(sql, params)

        const total = rows[0]?.total ?? 0
        const me = rows.find((r) => r.userId === userId) ?? null
        const above = me ? rows.find((r) => r.rank === me.rank - 1) ?? null : null
        const below = me ? rows.find((r) => r.rank === me.rank + 1) ?? null : null

        const mapRow = (r: Row) => ({
            rank: r.rank,
            userId: r.userId,
            username: r.username,
            avatar: r.avatar,
            xp: r.xp
        })

        return {
            scope,
            period,
            classroomId: classroomId ?? null,
            rank: me?.rank ?? null,
            xp: me?.xp ?? 0,
            total,
            neighbors: {
                above: above ? mapRow(above) : null,
                self: me
                    ? mapRow(me)
                    : { rank: null, userId, username: null, avatar: null, xp: 0 },
                below: below ? mapRow(below) : null
            }
        }
    }
}

export const rankingService = new RankingService()
