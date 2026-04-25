import cron from 'node-cron'
import { rankingService } from '~/services/ranking.service'
import { RankingPeriod, RankingScope } from '~/enums/rankingPeriod.enum'

/**
 * Cron schedule for the ranking module.
 *
 *   - every hour          : recompute all rank columns (global + classroom)
 *                           + refresh last-24h activity scores
 *   - every Mon at 00:05  : weekly rollover (zero weeklyXp for stale rows)
 *   - 1st of month 00:05  : monthly rollover (zero monthlyXp for stale rows)
 *
 * Timezone: Asia/Ho_Chi_Minh — matches the thesis target audience and keeps
 * the weekly boundary consistent with what users see in the app.
 *
 * Every scheduled task is wrapped in try/catch so one failing tick never
 * kills the rest of the schedule and never crashes the process.
 */

const TIMEZONE = 'Asia/Ho_Chi_Minh'

const runSafely = async (name: string, task: () => Promise<void>) => {
    const t0 = Date.now()
    try {
        await task()
         
        console.log(`[rankingScheduler] ${name} done in ${Date.now() - t0}ms`)
    } catch (err) {
         
        console.error(`[rankingScheduler] ${name} failed:`, err)
    }
}

const recomputeAllRanks = async () => {
    // Global leaderboards.
    for (const period of [RankingPeriod.WEEKLY, RankingPeriod.MONTHLY, RankingPeriod.ALLTIME]) {
        await rankingService.recomputeRanks({ scope: RankingScope.GLOBAL, period })
    }

    // Classroom leaderboards — one UPDATE per period partitions across all
    // classrooms in a single statement (PARTITION BY classroomId).
    for (const period of [RankingPeriod.WEEKLY, RankingPeriod.MONTHLY, RankingPeriod.ALLTIME]) {
        await rankingService.recomputeRanks({ scope: RankingScope.CLASSROOM, period })
    }
}

export const startRankingScheduler = () => {
    // Hourly: rank + activity score refresh.
    cron.schedule(
        '5 * * * *',
        () => {
            void runSafely('hourly-rank-recompute', recomputeAllRanks)
            void runSafely('hourly-activity-score', () => rankingService.recomputeActivityScores())
        },
        { timezone: TIMEZONE }
    )

    // Every Monday 00:05 — reset weekly counters.
    cron.schedule(
        '5 0 * * 1',
        () => {
            void runSafely('weekly-rollover', async () => {
                await rankingService.rollWeeklyReset()
                await recomputeAllRanks()
            })
        },
        { timezone: TIMEZONE }
    )

    // 1st of each month at 00:05 — reset monthly counters.
    cron.schedule(
        '5 0 1 * *',
        () => {
            void runSafely('monthly-rollover', async () => {
                await rankingService.rollMonthlyReset()
                await recomputeAllRanks()
            })
        },
        { timezone: TIMEZONE }
    )

    // Kick off one recompute on boot so cold starts still have fresh ranks.
    void runSafely('boot-rank-recompute', recomputeAllRanks)

     
    console.log('[rankingScheduler] scheduled hourly / weekly / monthly jobs')
}
