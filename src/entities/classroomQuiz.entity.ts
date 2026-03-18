import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'
import { Classroom } from './classroom.entity'
import { ClassroomLesson } from './classroomLesson.entity'
import { ClassroomQuizAttempt } from './classroomQuizAttempt.entity'
import { Quiz } from './quiz.entity'

@Entity()
export class ClassroomQuiz extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @ManyToOne(() => Classroom, (c) => c.quizzes, { onDelete: 'CASCADE', nullable: false })
    classroom!: Classroom

    /** Quiz có thể gắn với một lesson cụ thể */
    @ManyToOne(() => ClassroomLesson, (l) => l.quizzes, { nullable: true, onDelete: 'SET NULL' })
    lesson?: ClassroomLesson | null

    @Column({ type: 'varchar', length: 255 })
    title!: string

    @Column({ type: 'text', nullable: true })
    description?: string

    /**
     * ID của study set dùng để import câu hỏi ban đầu.
     * Chỉ lưu để tham chiếu — không ràng buộc FK, xóa study set không ảnh hưởng.
     */
    @Column({ type: 'int', nullable: true })
    sourceStudySetId?: number

    /** Danh sách câu hỏi thuộc riêng quiz này (tạo thủ công hoặc import từ study set) */
    @OneToMany(() => Quiz, (q) => q.classroomQuiz, { cascade: true, eager: false })
    questions?: Quiz[]

    /** Giới hạn thời gian làm bài (giây), null = không giới hạn */
    @Column({ type: 'int', nullable: true })
    timeLimitSeconds?: number

    @Column({ type: 'int', default: 1 })
    maxAttempts!: number

    /** Tỷ lệ câu đúng tối thiểu để pass (0 → 1) */
    @Column({ type: 'float', default: 0.6 })
    passingScore!: number

    @Column({ type: 'boolean', default: false })
    isPublished!: boolean

    @Column({ type: 'timestamptz', nullable: true })
    opensAt?: Date

    @Column({ type: 'timestamptz', nullable: true })
    closesAt?: Date

    @OneToMany(() => ClassroomQuizAttempt, (a: ClassroomQuizAttempt) => a.quiz, { cascade: true })
    attempts?: ClassroomQuizAttempt[]

    @CreateDateColumn()
    createdAt!: Date

    @UpdateDateColumn()
    updatedAt!: Date
}
