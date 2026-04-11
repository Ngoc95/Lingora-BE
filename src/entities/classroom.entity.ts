import {
    BaseEntity,
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'
import { User } from './user.entity'
import { ClassroomStatus } from '~/enums/classroomStatus.enum'
import { ClassroomMember } from './classroomMember.entity'
import { ClassroomLesson } from './classroomLesson.entity'
import { ClassroomQuiz } from './classroomQuiz.entity'
import { ClassroomChatMessage } from './classroomChatMessage.entity'

@Entity({ name: 'classroom' })
export class Classroom extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    /** Mã lớp công khai để học viên tìm và join (VD: "ENG-2025-01") */
    @Column({ type: 'varchar', length: 20, unique: true })
    code!: string

    @Column({ type: 'varchar', length: 255 })
    name!: string

    @Column({ type: 'text', nullable: true })
    description?: string

    @Column({ type: 'varchar', length: 255, nullable: true })
    coverImageUrl?: string

    @Column({ type: 'int', default: 50 })
    maxStudents!: number

    @Column({ type: 'enum', enum: ClassroomStatus, default: ClassroomStatus.DRAFT })
    status!: ClassroomStatus

    /** true = bất kỳ ai cũng có thể join bằng code */
    @Column({ type: 'boolean', default: false })
    isPublic!: boolean

    /** Cấu hình mở rộng: chat enabled, quiz allowed, v.v. */
    @Column({ type: 'jsonb', default: () => `'{}'` })
    settings!: Record<string, any>

    // ──────────────── Relations ────────────────

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    teacher?: User | null

    @OneToMany(() => ClassroomMember, (m) => m.classroom, { cascade: true })
    members?: ClassroomMember[]

    @OneToMany(() => ClassroomLesson, (l) => l.classroom, { cascade: true })
    lessons?: ClassroomLesson[]

    @OneToMany(() => ClassroomQuiz, (q) => q.classroom, { cascade: true })
    quizzes?: ClassroomQuiz[]

    @OneToMany(() => ClassroomChatMessage, (msg) => msg.classroom, { cascade: true })
    chatMessages?: ClassroomChatMessage[]

    // ──────────────── Timestamps ────────────────

    @CreateDateColumn()
    createdAt!: Date

    @UpdateDateColumn()
    updatedAt!: Date

    @DeleteDateColumn()
    deletedAt?: Date

    static allowSortList = ['id', 'name', 'createdAt']
}
