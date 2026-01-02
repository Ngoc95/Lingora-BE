import {
    BaseEntity,
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm'
import { NotificationTarget, NotificationType } from '../enums/notification.enum'

@Entity()
export class Notification extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number

    @Column({
        type: 'enum',
        enum: NotificationType,
    })
    type: NotificationType

    @Column('json')
    data: any

    @Column({
        type: 'enum',
        enum: NotificationTarget,
    })
    target: NotificationTarget

    @DeleteDateColumn()
    deletedAt?: Date

    @CreateDateColumn()
    createdAt?: Date

    @UpdateDateColumn()
    updatedAt?: Date
}
