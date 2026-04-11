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
import { ClassroomLessonType } from '~/enums/classroomLessonType.enum'
import { ClassroomLessonProgress } from './classroomLessonProgress.entity'
import { ClassroomQuiz } from './classroomQuiz.entity'
import { ClassroomLessonAttachment } from './classroomLessonAttachment.entity'
import { Flashcard } from './flashcard.entity'

@Entity()
export class ClassroomLesson extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @ManyToOne(() => Classroom, (c) => c.lessons, { onDelete: 'CASCADE', nullable: false })
    classroom!: Classroom

    @Column({ type: 'varchar', length: 255 })
    title!: string

    @Column({ type: 'text', nullable: true })
    description?: string

    /**
     * Nhãn phân loại chính của bài học — chỉ dùng để hiển thị icon và gợi ý UI.
     * Loại nội dung thực tế được lưu trong bảng `classroomLessonAttachment` và `flashcard`.
     */
    @Column({ type: 'enum', enum: ClassroomLessonType, default: ClassroomLessonType.MIXED })
    lessonType!: ClassroomLessonType

    /** Nội dung văn bản khi lessonType = TEXT hoặc MIXED */
    @Column({ type: 'text', nullable: true })
    content?: string

    /**
     * ID study set nguồn nếu flashcard được import từ đó.
     * Chỉ lưu để tham chiếu, không ràng buộc FK.
     */
    @Column({ type: 'int', nullable: true })
    sourceStudySetId?: number

    @Column({ type: 'int', default: 0 })
    sortOrder!: number

    @Column({ type: 'boolean', default: false })
    isPublished!: boolean

    @Column({ type: 'timestamptz', nullable: true })
    scheduledAt?: Date

    @OneToMany(() => ClassroomLessonProgress, (p: ClassroomLessonProgress) => p.lesson, { cascade: true })
    progresses?: ClassroomLessonProgress[]

    @OneToMany(() => ClassroomQuiz, (q: ClassroomQuiz) => q.lesson)
    quizzes?: ClassroomQuiz[]

    /** Danh sách tài liệu đính kèm (video, PDF, ảnh, Word...) */
    @OneToMany(() => ClassroomLessonAttachment, (a) => a.lesson, { cascade: true, eager: false })
    attachments?: ClassroomLessonAttachment[]

    /** Flashcard được copy từ study set vào bài học — độc lập với gốc */
    @OneToMany(() => Flashcard, (f) => f.classroomLesson, { cascade: true, eager: false })
    flashcards?: Flashcard[]

    @CreateDateColumn()
    createdAt!: Date

    @UpdateDateColumn()
    updatedAt!: Date
}
