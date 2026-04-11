import {
    BaseEntity,
    Column,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm'
import { User } from './user.entity'
import { ClassroomLesson } from './classroomLesson.entity'

@Entity()
@Unique(['lesson', 'user'])
export class ClassroomLessonProgress extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @ManyToOne(() => ClassroomLesson, (l) => l.progresses, { onDelete: 'CASCADE', nullable: false })
    lesson!: ClassroomLesson

    @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
    user!: User

    @Column({ type: 'boolean', default: false })
    isCompleted!: boolean

    @Column({ type: 'timestamptz', nullable: true })
    completedAt?: Date

    /** Tổng thời gian đã học bài (giây) */
    @Column({ type: 'int', default: 0 })
    timeSpentSeconds!: number

    @UpdateDateColumn()
    updatedAt!: Date
}
