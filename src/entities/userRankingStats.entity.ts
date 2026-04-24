import {
    BaseEntity,
    Column,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm'
import { User } from './user.entity'

/**
 * Snapshot stats used for the GLOBAL leaderboard (all users).
 * One row per user. Updated by rankingService.awardXp and the periodic
 * rank recomputation job.
 */
@Entity({ name: 'user_ranking_stats' })
export class UserRankingStats extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @OneToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn()
    user!: User

    @Column({ type: 'int', default: 0 })
    totalXp!: number

    @Column({ type: 'int', default: 0 })
    weeklyXp!: number

    @Column({ type: 'int', default: 0 })
    monthlyXp!: number

    @Column({ type: 'int', default: 1 })
    level!: number

    @Column({ type: 'float', default: 0 })
    activityScore!: number

    @Column({ type: 'int', default: 0 })
    streak!: number

    @Column({ type: 'int', nullable: true })
    rankWeekly?: number | null

    @Column({ type: 'int', nullable: true })
    rankMonthly?: number | null

    @Column({ type: 'int', nullable: true })
    rankAlltime?: number | null

    @Column({ type: 'date', nullable: true })
    weeklyPeriodStart?: Date | null

    @Column({ type: 'date', nullable: true })
    monthlyPeriodStart?: Date | null

    @UpdateDateColumn()
    updatedAt!: Date

    static allowSortList = ['totalXp', 'weeklyXp', 'monthlyXp', 'level', 'streak', 'updatedAt']
}
