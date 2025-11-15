import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm'
import { User } from './user.entity'
import { NotificationType } from '~/enums/notificationType.enum'

@Entity()
export class Notification extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @ManyToOne(() => User, {
        onDelete: 'CASCADE',
        nullable: false,
    })
    user!: User

    @Column({ type: 'int' })
    relatedId!: number

    @Column({ type: 'text' })
    title!: string

    @Column({ type: 'text' })
    message!: string

    @Column({
        type: 'enum',
        enum: NotificationType,
    })
    type!: NotificationType

    @Column({ type: 'boolean', default: false })
    isRead!: boolean

    @CreateDateColumn()
    createdAt!: Date
}

