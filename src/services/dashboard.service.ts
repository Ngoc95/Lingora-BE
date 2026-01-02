import { DatabaseService } from './database.service'
import { User } from '../entities/user.entity'
import { StudySet } from '../entities/studySet.entity'
import { Transaction } from '../entities/transaction.entity'
import { Exam } from '../entities/exam.entity'
import { ExamAttempt } from '../entities/examAttempt.entity'
import { UserCategoryProgress } from '../entities/userCategoryProgress.entity'
import { UserTopicProgress } from '../entities/userTopicProgress.entity'
import { UserWordProgress } from '../entities/userWordProgress.entity'
import { Category } from '../entities/category.entity'
import { Topic } from '../entities/topic.entity'
import { Word } from '../entities/word.entity'
import { UserStudySet } from '../entities/userStudySet.entity'
import { TransactionStatus } from '../enums/transactionStatus.enum'
import { ExamAttemptStatus } from '../enums/exam.enum'
import { UserStatus } from '../enums/userStatus.enum'
import { StudySetStatus } from '../enums/studySetStatus.enum'

// P0: Date range filter interface
interface DateRangeFilter {
    startDate?: string  // YYYY-MM-DD
    endDate?: string    // YYYY-MM-DD
}

class DashboardService {
    private db = DatabaseService.getInstance()

    // Helper to parse date range
    private parseDateRange(filter: DateRangeFilter) {
        const now = new Date()
        const endDate = filter.endDate ? new Date(filter.endDate + 'T23:59:59') : now
        const startDate = filter.startDate 
            ? new Date(filter.startDate + 'T00:00:00') 
            : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Default 30 days
        return { startDate, endDate }
    }

    /**
     * Get overview metrics for dashboard cards
     */
    getOverviewMetrics = async (filter: DateRangeFilter = {}) => {
        const userRepo = await this.db.getRepository(User)
        const studySetRepo = await this.db.getRepository(StudySet)
        const transactionRepo = await this.db.getRepository(Transaction)
        const examRepo = await this.db.getRepository(Exam)
        const examAttemptRepo = await this.db.getRepository(ExamAttempt)
        const userStudySetRepo = await this.db.getRepository(UserStudySet)

        const { startDate, endDate } = this.parseDateRange(filter)

        // Date ranges for comparison
        const dayDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
        const previousStart = new Date(startDate.getTime() - dayDiff * 24 * 60 * 60 * 1000)
        const previousEnd = startDate

        // Users metrics
        const totalUsers = await userRepo.count()
        const activeUsers = await userRepo.count({ where: { status: UserStatus.ACTIVE } })
        const newUsersThisPeriod = await userRepo
            .createQueryBuilder('user')
            .where('user.createdAt >= :start AND user.createdAt <= :end', { start: startDate, end: endDate })
            .getCount()
        const newUsersLastPeriod = await userRepo
            .createQueryBuilder('user')
            .where('user.createdAt >= :start AND user.createdAt < :end', { 
                start: previousStart, 
                end: previousEnd 
            })
            .getCount()
        const userGrowth = newUsersLastPeriod > 0 
            ? Math.round(((newUsersThisPeriod - newUsersLastPeriod) / newUsersLastPeriod) * 100) 
            : 100

        // StudySets metrics
        const totalStudySets = await studySetRepo.count()
        const publishedStudySets = await studySetRepo.count({ where: { status: StudySetStatus.PUBLISHED } })
        const totalPurchases = await userStudySetRepo.count()

        // Revenue metrics
        const revenueResult = await transactionRepo
            .createQueryBuilder('tx')
            .select('SUM(tx.amount)', 'total')
            .where('tx.status = :status', { status: TransactionStatus.SUCCESS })
            .getRawOne()
        const totalRevenue = Number(revenueResult?.total || 0)

        const revenueThisPeriod = await transactionRepo
            .createQueryBuilder('tx')
            .select('SUM(tx.amount)', 'total')
            .where('tx.status = :status AND tx.createdAt >= :start AND tx.createdAt <= :end', { 
                status: TransactionStatus.SUCCESS, 
                start: startDate,
                end: endDate
            })
            .getRawOne()
        const revenueLastPeriod = await transactionRepo
            .createQueryBuilder('tx')
            .select('SUM(tx.amount)', 'total')
            .where('tx.status = :status AND tx.createdAt >= :start AND tx.createdAt < :end', { 
                status: TransactionStatus.SUCCESS, 
                start: previousStart,
                end: previousEnd
            })
            .getRawOne()
        
        const thisPeriodRev = Number(revenueThisPeriod?.total || 0)
        const lastPeriodRev = Number(revenueLastPeriod?.total || 0)
        const revenueGrowth = lastPeriodRev > 0 
            ? Math.round(((thisPeriodRev - lastPeriodRev) / lastPeriodRev) * 100) 
            : 100

        // Exams metrics
        const totalExams = await examRepo.count()
        const publishedExams = await examRepo.count({ where: { isPublished: true } })
        const totalAttempts = await examAttemptRepo.count()
        const completedAttempts = await examAttemptRepo.count({ 
            where: { status: ExamAttemptStatus.SUBMITTED } 
        })

        return {
            users: {
                total: totalUsers,
                active: activeUsers,
                new: newUsersThisPeriod,
                growth: userGrowth
            },
            studySets: {
                total: totalStudySets,
                published: publishedStudySets,
                totalPurchases
            },
            revenue: {
                total: totalRevenue,
                thisPeriod: thisPeriodRev,
                lastPeriod: lastPeriodRev,
                growth: revenueGrowth
            },
            exams: {
                total: totalExams,
                published: publishedExams,
                totalAttempts,
                completedAttempts
            }
        }
    }

    /**
     * Get user analytics with P0 date filter and P1 activeUsers
     */
    getUserAnalytics = async (filter: DateRangeFilter = {}) => {
        const userRepo = await this.db.getRepository(User)
        const { startDate, endDate } = this.parseDateRange(filter)
        
        // User growth in date range
        const growthData = await userRepo
            .createQueryBuilder('user')
            .select("DATE(user.createdAt)", 'date')
            .addSelect('COUNT(*)', 'count')
            .where('user.createdAt >= :start AND user.createdAt <= :end', { start: startDate, end: endDate })
            .groupBy('DATE(user.createdAt)')
            .orderBy('date', 'ASC')
            .getRawMany()

        // User by proficiency
        const proficiencyData = await userRepo
            .createQueryBuilder('user')
            .select('user.proficiency', 'proficiency')
            .addSelect('COUNT(*)', 'count')
            .groupBy('user.proficiency')
            .getRawMany()

        // User by status
        const statusData = await userRepo
            .createQueryBuilder('user')
            .select('user.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('user.status')
            .getRawMany()

        // P1: Active Users (DAU/WAU/MAU) - based on last login or activity
        const now = new Date()
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

        // Count users who registered recently as proxy for active (can enhance with login tracking)
        const dailyActiveUsers = await userRepo
            .createQueryBuilder('user')
            .where('user.status = :status', { status: UserStatus.ACTIVE })
            .andWhere('user.createdAt >= :date', { date: oneDayAgo })
            .getCount()
        
        const weeklyActiveUsers = await userRepo
            .createQueryBuilder('user')
            .where('user.status = :status', { status: UserStatus.ACTIVE })
            .andWhere('user.createdAt >= :date', { date: sevenDaysAgo })
            .getCount()
        
        const monthlyActiveUsers = await userRepo
            .createQueryBuilder('user')
            .where('user.status = :status', { status: UserStatus.ACTIVE })
            .andWhere('user.createdAt >= :date', { date: thirtyDaysAgo })
            .getCount()

        return {
            growth: growthData.map((d: { date: any; count: any }) => ({
                date: d.date,
                count: Number(d.count)
            })),
            byProficiency: proficiencyData.map((d: { proficiency: any; count: any }) => ({
                proficiency: d.proficiency || 'NOT_SET',
                count: Number(d.count)
            })),
            byStatus: statusData.map((d: { status: any; count: any }) => ({
                status: d.status,
                count: Number(d.count)
            })),
            // P1: Active Users
            activeUsers: {
                daily: dailyActiveUsers,
                weekly: weeklyActiveUsers,
                monthly: monthlyActiveUsers
            }
        }
    }

    /**
     * Get learning analytics with P0 date filter and P1 learningTrend
     */
    getLearningAnalytics = async (filter: DateRangeFilter = {}) => {
        const categoryRepo = await this.db.getRepository(Category)
        const topicRepo = await this.db.getRepository(Topic)
        const wordRepo = await this.db.getRepository(Word)
        const categoryProgressRepo = await this.db.getRepository(UserCategoryProgress)
        const topicProgressRepo = await this.db.getRepository(UserTopicProgress)
        const wordProgressRepo = await this.db.getRepository(UserWordProgress)
        const { startDate, endDate } = this.parseDateRange(filter)

        // Categories
        const totalCategories = await categoryRepo.count()
        const completedCategories = await categoryProgressRepo.count({ where: { completed: true } })
        const avgCategoryProgress = await categoryProgressRepo
            .createQueryBuilder('cp')
            .select('AVG(cp.progressPercent)', 'avg')
            .getRawOne()

        // Popular categories
        const popularCategories = await categoryProgressRepo
            .createQueryBuilder('cp')
            .leftJoinAndSelect('cp.category', 'category')
            .select('category.id', 'id')
            .addSelect('category.name', 'name')
            .addSelect('COUNT(cp.id)', 'users_count')
            .addSelect('AVG(cp.progressPercent)', 'avg_progress')
            .groupBy('category.id')
            .addGroupBy('category.name')
            .orderBy('users_count', 'DESC')
            .limit(5)
            .getRawMany()

        // Topics
        const totalTopics = await topicRepo.count()
        const completedTopics = await topicProgressRepo.count({ where: { completed: true } })

        // Popular topics
        const popularTopics = await topicProgressRepo
            .createQueryBuilder('tp')
            .leftJoinAndSelect('tp.topic', 'topic')
            .select('topic.id', 'id')
            .addSelect('topic.name', 'name')
            .addSelect('COUNT(tp.id)', 'users_count')
            .groupBy('topic.id')
            .addGroupBy('topic.name')
            .orderBy('users_count', 'DESC')
            .limit(5)
            .getRawMany()

        // Words
        const totalWords = await wordRepo.count()
        const learnedWords = await wordProgressRepo.count()
        const userRepo = await this.db.getRepository(User)
        const userCount = await userRepo.count()
        const avgWordsPerUser = userCount > 0 ? Math.round(learnedWords / userCount) : 0

        // P1: Learning Trend (words learned per day)
        const learningTrend = await wordProgressRepo
            .createQueryBuilder('wp')
            .select("DATE(wp.learnedAt)", 'date')
            .addSelect('COUNT(*)', 'words_learned')
            .where('wp.learnedAt >= :start AND wp.learnedAt <= :end', { start: startDate, end: endDate })
            .groupBy('DATE(wp.learnedAt)')
            .orderBy('date', 'ASC')
            .getRawMany()

        // Topics completed per day
        const topicsCompletedTrend = await topicProgressRepo
            .createQueryBuilder('tp')
            .select("DATE(tp.updatedAt)", 'date')
            .addSelect('COUNT(*)', 'topics_completed')
            .where('tp.completed = true')
            .andWhere('tp.updatedAt >= :start AND tp.updatedAt <= :end', { start: startDate, end: endDate })
            .groupBy('DATE(tp.updatedAt)')
            .orderBy('date', 'ASC')
            .getRawMany()

        // Merge trends by date
        const trendMap = new Map<string, { wordsLearned: number; topicsCompleted: number }>()
        learningTrend.forEach((item: { date: string; words_learned: any }) => {
            trendMap.set(item.date, { 
                wordsLearned: Number(item.words_learned), 
                topicsCompleted: 0 
            })
        })
        topicsCompletedTrend.forEach((item: { date: string; topics_completed: any }) => {
            const existing = trendMap.get(item.date) || { wordsLearned: 0, topicsCompleted: 0 }
            existing.topicsCompleted = Number(item.topics_completed)
            trendMap.set(item.date, existing)
        })

        const mergedTrend = Array.from(trendMap.entries())
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => a.date.localeCompare(b.date))

        return {
            categories: {
                total: totalCategories,
                completedByUsers: completedCategories,
                avgProgress: Number(avgCategoryProgress?.avg || 0).toFixed(1),
                popular: popularCategories.map((c: { id: any; name: any; users_count: any; avg_progress: any }) => ({
                    id: c.id,
                    name: c.name,
                    usersCount: Number(c.users_count),
                    avgProgress: Number(c.avg_progress || 0).toFixed(1)
                }))
            },
            topics: {
                total: totalTopics,
                completedByUsers: completedTopics,
                popular: popularTopics.map((t: { id: any; name: any; users_count: any }) => ({
                    id: t.id,
                    name: t.name,
                    usersCount: Number(t.users_count)
                }))
            },
            words: {
                total: totalWords,
                learnedByUsers: learnedWords,
                avgPerUser: avgWordsPerUser
            },
            // P1: Learning Trend
            learningTrend: mergedTrend
        }
    }

    /**
     * Get revenue analytics with P0 date filter
     */
    getRevenueAnalytics = async (filter: DateRangeFilter = {}) => {
        const transactionRepo = await this.db.getRepository(Transaction)
        const userStudySetRepo = await this.db.getRepository(UserStudySet)
        const { startDate, endDate } = this.parseDateRange(filter)

        // Revenue trend (last 12 months or filtered)
        const revenueTrend = await transactionRepo
            .createQueryBuilder('tx')
            .select("TO_CHAR(tx.createdAt, 'YYYY-MM')", 'month')
            .addSelect('SUM(tx.amount)', 'revenue')
            .addSelect('COUNT(*)', 'transactions')
            .where('tx.status = :status', { status: TransactionStatus.SUCCESS })
            .andWhere('tx.createdAt >= :start AND tx.createdAt <= :end', { start: startDate, end: endDate })
            .groupBy("TO_CHAR(tx.createdAt, 'YYYY-MM')")
            .orderBy('month', 'ASC')
            .getRawMany()

        // Transaction stats
        const totalTx = await transactionRepo.count()
        const successTx = await transactionRepo.count({ where: { status: TransactionStatus.SUCCESS } })
        const pendingTx = await transactionRepo.count({ where: { status: TransactionStatus.PENDING } })
        const failedTx = await transactionRepo.count({ where: { status: TransactionStatus.FAILED } })

        // Top selling study sets
        const topSelling = await userStudySetRepo
            .createQueryBuilder('us')
            .leftJoinAndSelect('us.studySet', 'studySet')
            .leftJoinAndSelect('studySet.owner', 'owner')
            .select('studySet.id', 'id')
            .addSelect('studySet.title', 'title')
            .addSelect('studySet.price', 'price')
            .addSelect('owner.username', 'owner_username')
            .addSelect('COUNT(us.id)', 'sales')
            .addSelect('SUM(us.purchasePrice)', 'revenue')
            .where('us.purchasedAt >= :start AND us.purchasedAt <= :end', { start: startDate, end: endDate })
            .groupBy('studySet.id')
            .addGroupBy('studySet.title')
            .addGroupBy('studySet.price')
            .addGroupBy('owner.username')
            .orderBy('sales', 'DESC')
            .limit(10)
            .getRawMany()

        return {
            trend: revenueTrend.map((r: { month: any; revenue: any; transactions: any }) => ({
                month: r.month,
                revenue: Number(r.revenue || 0),
                transactions: Number(r.transactions)
            })),
            transactions: {
                total: totalTx,
                success: successTx,
                pending: pendingTx,
                failed: failedTx,
                successRate: totalTx > 0 ? Math.round((successTx / totalTx) * 100) : 0
            },
            topSelling: topSelling.map((s: { id: any; title: any; price: any; owner_username: any; sales: any; revenue: any }) => ({
                id: s.id,
                title: s.title,
                price: Number(s.price),
                ownerUsername: s.owner_username,
                sales: Number(s.sales),
                revenue: Number(s.revenue || 0)
            }))
        }
    }

    /**
     * Get exam analytics with P0 date filter and P1 score distribution
     */
    getExamAnalytics = async (filter: DateRangeFilter = {}) => {
        const examRepo = await this.db.getRepository(Exam)
        const attemptRepo = await this.db.getRepository(ExamAttempt)
        const { startDate, endDate } = this.parseDateRange(filter)

        // Exam stats
        const totalExams = await examRepo.count()
        const publishedExams = await examRepo.count({ where: { isPublished: true } })
        const totalAttempts = await attemptRepo.count()
        const completedAttempts = await attemptRepo.count({ 
            where: { status: ExamAttemptStatus.SUBMITTED } 
        })

        // Attempts trend in date range
        const attemptsTrend = await attemptRepo
            .createQueryBuilder('attempt')
            .select("DATE(attempt.createdAt)", 'date')
            .addSelect('COUNT(*)', 'attempts')
            .where('attempt.createdAt >= :start AND attempt.createdAt <= :end', { start: startDate, end: endDate })
            .groupBy('DATE(attempt.createdAt)')
            .orderBy('date', 'ASC')
            .getRawMany()

        // Exam performance
        const examPerformance = await attemptRepo
            .createQueryBuilder('attempt')
            .leftJoinAndSelect('attempt.exam', 'exam')
            .select('exam.id', 'exam_id')
            .addSelect('exam.title', 'title')
            .addSelect('exam.code', 'code')
            .addSelect('COUNT(attempt.id)', 'attempts')
            .addSelect("COUNT(CASE WHEN attempt.status = 'SUBMITTED' THEN 1 END)", 'completed')
            .groupBy('exam.id')
            .addGroupBy('exam.title')
            .addGroupBy('exam.code')
            .orderBy('attempts', 'DESC')
            .limit(10)
            .getRawMany()

        // P1: Score Distribution - Get scores from scoreSummary JSON
        // Since scoreSummary is JSON, we need to parse it
        const completedAttemptsWithScores = await attemptRepo
            .createQueryBuilder('attempt')
            .select('attempt.scoreSummary', 'score_summary')
            .where('attempt.status = :status', { status: ExamAttemptStatus.SUBMITTED })
            .andWhere('attempt.scoreSummary IS NOT NULL')
            .andWhere('attempt.createdAt >= :start AND attempt.createdAt <= :end', { start: startDate, end: endDate })
            .getRawMany()

        // Calculate score distribution (0-20, 21-40, 41-60, 61-80, 81-100)
        const scoreRanges = [
            { range: '0-20', min: 0, max: 20, count: 0 },
            { range: '21-40', min: 21, max: 40, count: 0 },
            { range: '41-60', min: 41, max: 60, count: 0 },
            { range: '61-80', min: 61, max: 80, count: 0 },
            { range: '81-100', min: 81, max: 100, count: 0 }
        ]

        let totalScore = 0
        let totalTime = 0
        let scoreCount = 0

        completedAttemptsWithScores.forEach((attempt: { score_summary: string }) => {
            try {
                const summary = typeof attempt.score_summary === 'string' 
                    ? JSON.parse(attempt.score_summary) 
                    : attempt.score_summary
                
                // Extract overall score (adjust based on actual scoreSummary structure)
                const overallScore = summary?.overallScore || summary?.totalScore || summary?.score || 0
                const percentScore = typeof overallScore === 'number' ? overallScore : 0
                
                if (percentScore >= 0 && percentScore <= 100) {
                    scoreCount++
                    totalScore += percentScore
                    
                    for (const range of scoreRanges) {
                        if (percentScore >= range.min && percentScore <= range.max) {
                            range.count++
                            break
                        }
                    }
                }

                // Extract time if available
                if (summary?.totalTimeSeconds) {
                    totalTime += summary.totalTimeSeconds
                }
            } catch (e) {
                // Skip invalid JSON
            }
        })

        const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount * 10) / 10 : 0
        const averageTimeMinutes = scoreCount > 0 ? Math.round(totalTime / scoreCount / 60) : 0

        return {
            overview: {
                totalExams,
                publishedExams,
                totalAttempts,
                completedAttempts,
                completionRate: totalAttempts > 0 
                    ? Math.round((completedAttempts / totalAttempts) * 100) 
                    : 0
            },
            trend: attemptsTrend.map((t: { date: any; attempts: any }) => ({
                date: t.date,
                attempts: Number(t.attempts)
            })),
            examPerformance: examPerformance.map((e: { exam_id: any; title: any; code: any; attempts: any; completed: any }) => ({
                examId: e.exam_id,
                title: e.title,
                code: e.code,
                attempts: Number(e.attempts),
                completed: Number(e.completed),
                completionRate: Number(e.attempts) > 0 
                    ? Math.round((Number(e.completed) / Number(e.attempts)) * 100) 
                    : 0
            })),
            // P1: Score Distribution
            scoreDistribution: scoreRanges.map(r => ({
                range: r.range,
                count: r.count
            })),
            averageScore,
            averageTimeMinutes
        }
    }

    /**
     * Get recent activities
     */
    getRecentActivities = async (limit: number = 20) => {
        const userRepo = await this.db.getRepository(User)
        const transactionRepo = await this.db.getRepository(Transaction)
        const attemptRepo = await this.db.getRepository(ExamAttempt)

        const activities: any[] = []

        // Recent signups
        const recentUsers = await userRepo
            .createQueryBuilder('user')
            .select(['user.id', 'user.username', 'user.avatar', 'user.createdAt'])
            .orderBy('user.createdAt', 'DESC')
            .limit(5)
            .getMany()

        recentUsers.forEach(u => {
            activities.push({
                type: 'USER_REGISTER',
                timestamp: u.createdAt,
                user: { id: u.id, username: u.username, avatar: u.avatar },
                action: 'Đăng ký tài khoản mới'
            })
        })

        // Recent purchases
        const recentPurchases = await transactionRepo
            .createQueryBuilder('tx')
            .leftJoinAndSelect('tx.user', 'user')
            .leftJoinAndSelect('tx.studySet', 'studySet')
            .where('tx.status = :status', { status: TransactionStatus.SUCCESS })
            .orderBy('tx.createdAt', 'DESC')
            .limit(5)
            .getMany()

        recentPurchases.forEach(tx=> {
            activities.push({
                type: 'PURCHASE',
                timestamp: tx.createdAt,
                user: { 
                    id: tx.user?.id, 
                    username: tx.user?.username, 
                    avatar: tx.user?.avatar 
                },
                action: `Mua "${tx.studySet?.title}"`,
                details: { amount: tx.amount }
            })
        })

        // Recent exam completions
        const recentAttempts = await attemptRepo
            .createQueryBuilder('attempt')
            .leftJoinAndSelect('attempt.user', 'user')
            .leftJoinAndSelect('attempt.exam', 'exam')
            .where('attempt.status = :status', { status: ExamAttemptStatus.SUBMITTED })
            .orderBy('attempt.submittedAt', 'DESC')
            .limit(5)
            .getMany()

        recentAttempts.forEach(a => {
            activities.push({
                type: 'EXAM_COMPLETED',
                timestamp: a.submittedAt,
                user: { 
                    id: a.user?.id, 
                    username: a.user?.username, 
                    avatar: a.user?.avatar 
                },
                action: `Hoàn thành "${a.exam?.title}"`,
                details: { scoreSummary: a.scoreSummary }
            })
        })

        // Sort by timestamp and limit
        return activities
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit)
    }
}

export const dashboardService = new DashboardService()
