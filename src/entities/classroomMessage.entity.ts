import {
    BaseEntity,
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm'
import { Classroom } from './classroom.entity'
import { User } from './user.entity'
import { ClassroomMessageType } from '~/enums/classroomMessageType.enum'

@Entity()
export class ClassroomMessage extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @ManyToOne(() => Classroom, { onDelete: 'CASCADE', nullable: false })
    classroom!: Classroom

    @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
    sender!: User

    @Column({ type: 'enum', enum: ClassroomMessageType, default: ClassroomMessageType.TEXT })
    type!: ClassroomMessageType

    @Column({ type: 'text' })
    content!: string

    /** URL ảnh (type = IMAGE) hoặc file (type = FILE) */
    @Column({ type: 'text', nullable: true })
    attachmentUrl?: string

    /** Tin nhắn được reply — tự tham chiếu */
    @ManyToOne(() => ClassroomMessage, { nullable: true, onDelete: 'SET NULL' })
    repliedTo?: ClassroomMessage | null

    @CreateDateColumn()
    createdAt!: Date

    @DeleteDateColumn()
    deletedAt?: Date
}
