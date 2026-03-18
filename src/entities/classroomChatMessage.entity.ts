import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm'
import { User } from './user.entity'
import { Classroom } from './classroom.entity'
import { ClassroomChatMessageType } from '~/enums/classroomChatMessageType.enum'

@Entity()
export class ClassroomChatMessage extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @ManyToOne(() => Classroom, (c) => c.chatMessages, { onDelete: 'CASCADE', nullable: false })
    classroom!: Classroom

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    sender?: User | null

    @Column({ type: 'text' })
    content!: string

    @Column({ type: 'enum', enum: ClassroomChatMessageType, default: ClassroomChatMessageType.TEXT })
    messageType!: ClassroomChatMessageType

    @Column({ type: 'varchar', length: 255, nullable: true })
    attachmentUrl?: string

    /** Trả lời tin nhắn cụ thể (self-referencing) */
    @ManyToOne(() => ClassroomChatMessage, { nullable: true, onDelete: 'SET NULL' })
    repliedTo?: ClassroomChatMessage | null

    @Column({ type: 'boolean', default: false })
    isDeleted!: boolean

    @CreateDateColumn()
    createdAt!: Date
}
