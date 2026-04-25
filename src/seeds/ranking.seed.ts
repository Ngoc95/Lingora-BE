import { faker } from '@faker-js/faker'
import { Classroom } from '~/entities/classroom.entity'
import { ClassroomMember } from '~/entities/classroomMember.entity'
import { User } from '~/entities/user.entity'
import { UserClassroomRankingStats } from '~/entities/userClassroomRankingStats.entity'
import { UserRankingStats } from '~/entities/userRankingStats.entity'
import { UserXpLog } from '~/entities/userXpLog.entity'
import { ClassroomMemberStatus } from '~/enums/classroomMemberStatus.enum'
import { RankingPeriod, RankingScope } from '~/enums/rankingPeriod.enum'
import { XpActionType, XpReferenceType } from '~/enums/xpActionType.enum'
import { XP_REWARDS, xpToLevel } from '~/constants/xpRules'
import { startOfIsoWeek, startOfMonth } from '~/utils/date'
import { rankingService } from '~/services/ranking.service'

/**
 * Ranking demo-data seed.
 *
 * Generates realistic XP history for every existing user so leaderboards
 * render with rich, varied data out-of-the-box. Idempotent: if any user
 * already has XP log rows, we skip that user entirely to preserve real
 * data.
 *
 * Output:
 *  - `user_xp_log`: 40–120 rows per user, spread across the last 14 days.
 *  - `user_ranking_stats`: one synced row per user with correct level,
 *    weekly/monthly/total XP, streak, and activityScore.
 *  - `user_classroom_ranking_stats`: for users in the seeded classrooms,
 *    a row per (user, classroom) reflecting the subset of XP they earned
 *    inside that classroom.
 *  - After inserts, we call `rankingService.recomputeRanks` so that the
 *    `rank*` columns on both snapshot tables are up to date.
 */
export async function seedRankingData(): Promise<void> {
    console.log('🏆 Seeding ranking demo data...')

    const users = await User.find({ select: ['id', 'username'] })
    if (users.length === 0) {
        console.warn('⚠️  No users found. Run user seed first.')
        return
    }

    // Skip entirely if there's already ranking data — keep this idempotent
    // so re-running seeds never double-counts XP.
    const existingCount = await UserXpLog.count()
    if (existingCount > 0) {
        console.log(`   - user_xp_log already has ${existingCount} rows; skipping.`)
        return
    }

    const classrooms = await Classroom.find({ select: ['id', 'name'] })
    const membershipRows = await ClassroomMember.find({
        where: { status: ClassroomMemberStatus.ACTIVE },
        relations: { user: true, classroom: true }
    })

    // Map userId -> classroomIds this user is an ACTIVE member of.
    const userToClassrooms = new Map<number, number[]>()
    for (const m of membershipRows) {
        if (!m.user || !m.classroom) continue
        const list = userToClassrooms.get(m.user.id) ?? []
        list.push(m.classroom.id)
        userToClassrooms.set(m.user.id, list)
    }

    const now = new Date()
    const currentWeekStart = startOfIsoWeek(now)
    const currentMonthStart = startOfMonth(now)

    // Sample of action types we'll cycle through when generating history.
    const personalActions: XpActionType[] = [
        XpActionType.FLASHCARD_LEARNED,
        XpActionType.WORD_MASTERED,
        XpActionType.QUIZ_COMPLETED,
        XpActionType.EXAM_COMPLETED,
        XpActionType.CONVERSATION_ENDED,
        XpActionType.DAILY_LOGIN,
        XpActionType.POST_CREATED
    ]
    const classroomActions: XpActionType[] = [
        XpActionType.CLASSROOM_QUIZ,
        XpActionType.CLASSROOM_CHAT,
        XpActionType.LESSON_COMPLETED
    ]

    // Rank users into tiers so the leaderboard has a meaningful spread — top
    // performers, mid-tier, newcomers. The first few seeded users (Admin001,
    // User001, User002, Ngoc001) are pushed to "top" so screenshots are nice.
    const tieredUsers = users.map((u, idx) => {
        let tier: 'top' | 'mid' | 'low' | 'sleeper'
        if (idx < 3) tier = 'top'
        else if (idx < Math.floor(users.length * 0.3)) tier = 'top'
        else if (idx < Math.floor(users.length * 0.75)) tier = 'mid'
        else if (idx < users.length - 2) tier = 'low'
        else tier = 'sleeper'
        return { user: u, tier }
    })

    const allLogs: UserXpLog[] = []
    const statsUpdates: Array<{ userId: number; update: Partial<UserRankingStats> }> = []
    // classroomAggregate[userId][classroomId] = { totalXp, weeklyXp, monthlyXp }
    const classroomAggregate = new Map<number, Map<number, { totalXp: number; weeklyXp: number; monthlyXp: number }>>()

    for (const { user, tier } of tieredUsers) {
        const joinedClassrooms = userToClassrooms.get(user.id) ?? []
        // Sleepers show up with empty ranking (helps prove the "no XP yet" UI).
        if (tier === 'sleeper') continue

        // Number of XP events for this user, driven by tier.
        const eventCount = {
            top: faker.number.int({ min: 80, max: 130 }),
            mid: faker.number.int({ min: 40, max: 80 }),
            low: faker.number.int({ min: 10, max: 30 })
        }[tier]

        // Number of distinct active days in the last 7 days (caps activityScore).
        const activeDaysInLast7 = {
            top: faker.number.int({ min: 5, max: 7 }),
            mid: faker.number.int({ min: 3, max: 5 }),
            low: faker.number.int({ min: 1, max: 3 })
        }[tier]

        const activeDayOffsets: number[] = faker.helpers
            .arrayElements<number>([0, 1, 2, 3, 4, 5, 6], activeDaysInLast7)
            .sort((a, b) => a - b)

        // Streak: consecutive active days back from today.
        let streak = 0
        for (let i = 0; i < activeDayOffsets.length; i++) {
            if (activeDayOffsets[i] === i) streak++
            else break
        }

        let totalXp = 0
        let weeklyXp = 0
        let monthlyXp = 0
        const perClassroom = new Map<number, { totalXp: number; weeklyXp: number; monthlyXp: number }>()

        for (let i = 0; i < eventCount; i++) {
            // Pick a day within the last 14 days, biased towards the last 7.
            const dayOffset =
                Math.random() < 0.7
                    ? faker.helpers.arrayElement(
                        activeDayOffsets.length > 0 ? activeDayOffsets : [0, 1, 2, 3, 4, 5, 6]
                    )
                    : faker.number.int({ min: 7, max: 13 })

            const createdAt = faker.date.soon({
                days: 1,
                refDate: new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000)
            })
            // Pin within that day's hours for readability.
            createdAt.setHours(faker.number.int({ min: 7, max: 22 }), faker.number.int({ min: 0, max: 59 }))

            // Skip this event if the user was "inactive" on this day (outside
            // active window) with some probability — keeps streak believable.
            if (dayOffset < 7 && !activeDayOffsets.includes(dayOffset)) continue

            // 25% of events come from a classroom if the user is a member.
            const pickClassroom = joinedClassrooms.length > 0 && Math.random() < 0.25
            const action = pickClassroom
                ? faker.helpers.arrayElement(classroomActions)
                : faker.helpers.arrayElement(personalActions)

            const baseAmount = XP_REWARDS[action]
            if (!baseAmount) continue

            // Jitter XP slightly so exam / flashcard events look varied.
            const xpAmount = Math.max(
                1,
                Math.round(baseAmount * faker.number.float({ min: 0.8, max: 1.3 }))
            )

            const classroomId = pickClassroom
                ? faker.helpers.arrayElement(joinedClassrooms)
                : null

            const log = UserXpLog.create({
                user: { id: user.id } as User,
                classroom: classroomId ? ({ id: classroomId } as Classroom) : null,
                xpAmount,
                actionType: action,
                referencedId: faker.number.int({ min: 1, max: 999 }),
                referenceType: referenceTypeFor(action),
                description: descriptionFor(action),
                createdAt
            })
            allLogs.push(log)

            totalXp += xpAmount
            if (createdAt >= currentWeekStart) weeklyXp += xpAmount
            if (createdAt >= currentMonthStart) monthlyXp += xpAmount

            if (classroomId) {
                const bucket = perClassroom.get(classroomId) ?? { totalXp: 0, weeklyXp: 0, monthlyXp: 0 }
                bucket.totalXp += xpAmount
                if (createdAt >= currentWeekStart) bucket.weeklyXp += xpAmount
                if (createdAt >= currentMonthStart) bucket.monthlyXp += xpAmount
                perClassroom.set(classroomId, bucket)
            }
        }

        const activityScore = Math.round((activeDaysInLast7 / 7) * 20 * 100) / 100

        statsUpdates.push({
            userId: user.id,
            update: {
                totalXp,
                weeklyXp,
                monthlyXp,
                level: xpToLevel(totalXp),
                streak,
                activityScore,
                weeklyPeriodStart: currentWeekStart,
                monthlyPeriodStart: currentMonthStart
            }
        })

        if (perClassroom.size > 0) classroomAggregate.set(user.id, perClassroom)
    }

    // --- Insert XP logs in chunks to avoid oversized parameter lists. ---
    const chunkSize = 500
    for (let i = 0; i < allLogs.length; i += chunkSize) {
        const slice = allLogs.slice(i, i + chunkSize)
        await UserXpLog.save(slice)
    }
    console.log(`   - Inserted ${allLogs.length} user_xp_log rows`)

    // --- Upsert user_ranking_stats for every tiered user. ---
    let statsInserted = 0
    for (const { userId, update } of statsUpdates) {
        let row = await UserRankingStats.findOne({ where: { user: { id: userId } } })
        if (!row) {
            row = UserRankingStats.create({
                user: { id: userId } as User,
                totalXp: 0,
                weeklyXp: 0,
                monthlyXp: 0,
                level: 1,
                activityScore: 0,
                streak: 0
            })
        }
        Object.assign(row, update)
        await row.save()
        statsInserted++
    }
    console.log(`   - Upserted ${statsInserted} user_ranking_stats rows`)

    // --- Upsert user_classroom_ranking_stats. Also ensure every ACTIVE
    //     member has a row, even if they earned 0 classroom XP, so that the
    //     classroom leaderboard never silently hides them. ---
    let classroomStatsInserted = 0
    for (const classroom of classrooms) {
        const classroomMembers = membershipRows.filter(
            (m) => m.classroom?.id === classroom.id
        )
        for (const m of classroomMembers) {
            if (!m.user) continue
            const userId = m.user.id
            const bucket = classroomAggregate.get(userId)?.get(classroom.id)

            let row = await UserClassroomRankingStats.findOne({
                where: { user: { id: userId }, classroom: { id: classroom.id } }
            })
            if (!row) {
                row = UserClassroomRankingStats.create({
                    user: { id: userId } as User,
                    classroom: { id: classroom.id } as Classroom,
                    totalXp: 0,
                    weeklyXp: 0,
                    monthlyXp: 0
                })
            }
            row.totalXp = bucket?.totalXp ?? 0
            row.weeklyXp = bucket?.weeklyXp ?? 0
            row.monthlyXp = bucket?.monthlyXp ?? 0
            row.weeklyPeriodStart = currentWeekStart
            row.monthlyPeriodStart = currentMonthStart
            await row.save()
            classroomStatsInserted++
        }
    }
    console.log(`   - Upserted ${classroomStatsInserted} user_classroom_ranking_stats rows`)

    // --- Recompute ranks so the leaderboards render immediately. ---
    try {
        for (const period of [RankingPeriod.WEEKLY, RankingPeriod.MONTHLY, RankingPeriod.ALLTIME]) {
            await rankingService.recomputeRanks({ scope: RankingScope.GLOBAL, period })
            await rankingService.recomputeRanks({ scope: RankingScope.CLASSROOM, period })
        }
        console.log('   - Recomputed all ranks (global + classroom × 3 periods)')
    } catch (err) {
        console.warn('⚠️  Rank recomputation failed:', err)
    }

    console.log('✅ Ranking demo data seeded successfully.')
}

// ─────────────────────────── helpers ──────────────────────────────

function referenceTypeFor(action: XpActionType): string {
    switch (action) {
        case XpActionType.FLASHCARD_LEARNED:
            return XpReferenceType.FLASHCARD
        case XpActionType.WORD_MASTERED:
            return XpReferenceType.WORD
        case XpActionType.QUIZ_COMPLETED:
            return XpReferenceType.QUIZ
        case XpActionType.EXAM_COMPLETED:
            return XpReferenceType.EXAM_ATTEMPT
        case XpActionType.LESSON_COMPLETED:
            return XpReferenceType.LESSON
        case XpActionType.CLASSROOM_QUIZ:
            return XpReferenceType.CLASSROOM_QUIZ_ATTEMPT
        case XpActionType.CLASSROOM_CHAT:
            return XpReferenceType.CLASSROOM_CHAT_MESSAGE
        case XpActionType.CONVERSATION_ENDED:
            return XpReferenceType.CONVERSATION_SESSION
        case XpActionType.POST_CREATED:
            return XpReferenceType.POST
        default:
            return XpReferenceType.SYSTEM
    }
}

function descriptionFor(action: XpActionType): string {
    const map: Record<XpActionType, string[]> = {
        [XpActionType.FLASHCARD_LEARNED]: [
            'Đã học một flashcard mới',
            'Hoàn thành một thẻ từ vựng',
            'Ôn tập flashcard'
        ],
        [XpActionType.WORD_MASTERED]: ['Thành thạo một từ vựng', 'Đã ghi nhớ từ mới'],
        [XpActionType.QUIZ_COMPLETED]: ['Hoàn thành trắc nghiệm', 'Làm xong một bài quiz'],
        [XpActionType.EXAM_COMPLETED]: ['Hoàn thành bài thi IELTS', 'Kết thúc bài kiểm tra'],
        [XpActionType.LESSON_COMPLETED]: ['Hoàn thành một bài giảng', 'Học xong bài trong lớp'],
        [XpActionType.CLASSROOM_QUIZ]: ['Làm xong quiz trong lớp', 'Hoàn thành quiz lớp học'],
        [XpActionType.CLASSROOM_CHAT]: ['Tham gia trao đổi trong lớp', 'Gửi tin nhắn lớp học'],
        [XpActionType.CONVERSATION_ENDED]: ['Kết thúc phiên hội thoại AI', 'Luyện nói với AI'],
        [XpActionType.DAILY_LOGIN]: ['Điểm danh hằng ngày'],
        [XpActionType.STREAK_BONUS]: ['Thưởng duy trì streak'],
        [XpActionType.POST_CREATED]: ['Đăng bài mới trong cộng đồng', 'Chia sẻ bài viết'],
        [XpActionType.ADMIN_ADJUSTMENT]: ['Admin điều chỉnh']
    }
    const choices = map[action]
    return choices[faker.number.int({ min: 0, max: choices.length - 1 })]
}
