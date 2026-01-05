import { DatabaseService } from './database.service'
import { User } from '~/entities/user.entity'

class StreakService {
    private db = DatabaseService.getInstance()

    /**
     * Get streak information for a user
     */
    async getStreakInfo(userId: number) {
        const userRepo = await this.db.getRepository(User)
        const user = await userRepo.findOne({
            where: { id: userId },
            select: ['id', 'currentStreak', 'longestStreak', 'lastActivityDate']
        })

        if (!user) {
            throw new Error('User not found')
        }

        return {
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
            lastActivityDate: user.lastActivityDate
        }
    }

    /**
     * Record a learning activity and update streak
     * Should be called when user: learns vocabulary, takes exam, or studies a studyset
     * 
     * Logic:
     * - If lastActivityDate is today → do nothing
     * - If lastActivityDate is yesterday → increment currentStreak
     * - If lastActivityDate > 1 day ago or null → reset currentStreak to 1
     * - Update longestStreak if currentStreak > longestStreak
     */
    async recordActivity(userId: number): Promise<void> {
        const userRepo = await this.db.getRepository(User)
        const user = await userRepo.findOne({
            where: { id: userId },
            select: ['id', 'currentStreak', 'longestStreak', 'lastActivityDate']
        })

        if (!user) {
            return
        }

        const today = this.getDateOnly(new Date())
        const lastActivity = user.lastActivityDate ? this.getDateOnly(user.lastActivityDate) : null

        // If already recorded activity today, do nothing
        if (lastActivity && this.isSameDay(lastActivity, today)) {
            return
        }

        let newStreak: number

        if (lastActivity && this.isConsecutiveDay(lastActivity, today)) {
            // Yesterday was active, increment streak
            newStreak = user.currentStreak + 1
        } else {
            // Streak broken or first activity, reset to 1
            newStreak = 1
        }

        // Update longest streak if current is higher
        const newLongestStreak = Math.max(newStreak, user.longestStreak)

        // Save to database
        await userRepo.update(userId, {
            currentStreak: newStreak,
            longestStreak: newLongestStreak,
            lastActivityDate: today
        })
    }

    /**
     * Check if two dates are the same calendar day
     */
    private isSameDay(date1: Date, date2: Date): boolean {
        return date1.getTime() === date2.getTime()
    }

    /**
     * Check if date1 is exactly one day before date2
     */
    private isConsecutiveDay(previousDate: Date, currentDate: Date): boolean {
        const oneDay = 24 * 60 * 60 * 1000 // milliseconds in a day
        const diff = currentDate.getTime() - previousDate.getTime()
        return diff === oneDay
    }

    /**
     * Get date without time component (for consistent comparison)
     */
    private getDateOnly(date: Date): Date {
        const d = new Date(date)
        d.setHours(0, 0, 0, 0)
        return d
    }
}

export const streakService = new StreakService()
