import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm'
import { User } from './user.entity'
import { ClassroomQuiz } from './classroomQuiz.entity'

@Entity()
export class ClassroomQuizAttempt extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @ManyToOne(() => ClassroomQuiz, (q) => q.attempts, { onDelete: 'CASCADE', nullable: false })
    quiz!: ClassroomQuiz

    @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
    user!: User

    @Column({ type: 'int', default: 1 })
    attemptNumber!: number

    /** Điểm số từ 0 → 1 (tỷ lệ câu đúng) */
    @Column({ type: 'float', nullable: true })
    score?: number

    /** { [quizId]: "câu trả lời" } */
    @Column({ type: 'jsonb', default: () => `'{}'` })
    answers!: Record<string, string>

    @CreateDateColumn()
    startedAt!: Date

    @Column({ type: 'timestamptz', nullable: true })
    submittedAt?: Date
}
