import {
    BaseEntity,
    Column,
    Entity,
    Index,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn
} from 'typeorm'
import { User } from './user.entity'
import { Classroom } from './classroom.entity'

/**
 * Snapshot stats for the CLASSROOM leaderboard. One row per (user, classroom).
 * Only counts XP earned from actions performed inside the given classroom —
 * personal XP (flashcards outside class, self-study exams, ...) is excluded
 * so that ranking truly reflects in-class activity.
 */
@Entity({ name: 'user_classroom_ranking_stats' })
@Unique(['user', 'classroom'])
@Index(['classroom', 'weeklyXp'])
@Index(['classroom', 'monthlyXp'])
@Index(['classroom', 'totalXp'])
export class UserClassroomRankingStats extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
    user!: User

    @ManyToOne(() => Classroom, { nullable: false, onDelete: 'CASCADE' })
    classroom!: Classroom

    @Column({ type: 'int', default: 0 })
    totalXp!: number

    @Column({ type: 'int', default: 0 })
    weeklyXp!: number

    @Column({ type: 'int', default: 0 })
    monthlyXp!: number

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

    static allowSortList = ['totalXp', 'weeklyXp', 'monthlyXp', 'updatedAt']
}
