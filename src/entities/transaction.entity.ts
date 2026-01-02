import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm'
import { User } from './user.entity'
import { StudySet } from './studySet.entity'
import { RevenueSplit } from './revenueSplit.entity'
import { TransactionStatus } from '../enums/transactionStatus.enum'
import { PaymentMethod } from '../enums/paymentMethod.enum'

@Entity()
export class Transaction extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @ManyToOne(() => User, {
        onDelete: 'CASCADE',
        nullable: false,
    })
    user!: User

    @ManyToOne(() => StudySet, {
        onDelete: 'CASCADE',
        nullable: false,
    })
    studySet!: StudySet

    @Column({
        type: 'numeric',
        precision: 12,
        scale: 2,
    })
    amount!: number

    @Column({
        type: 'enum',
        enum: PaymentMethod,
        default: PaymentMethod.VNPAY,
    })
    method!: PaymentMethod

    @Column({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.PENDING,
    })
    status!: TransactionStatus

    @Column({ type: 'text', nullable: true })
    orderId?: string

    @Column({ type: 'text', nullable: true })
    vnpTransactionNo?: string

    @Column({ type: 'text', nullable: true })
    vnpResponseCode?: string

    @OneToMany(() => RevenueSplit, (revenueSplit) => revenueSplit.transaction, {
        cascade: true,
        eager: false,
    })
    revenueSplits?: RevenueSplit[]

    @CreateDateColumn()
    createdAt!: Date
}

