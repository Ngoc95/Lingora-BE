import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'
import { User } from './user.entity'
import { WithdrawalStatus } from '~/enums/withdrawalStatus.enum'

@Entity()
export class WithdrawalRequest extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @ManyToOne(() => User, {
        onDelete: 'CASCADE',
        nullable: false,
    })
    user!: User

    @Column({
        type: 'numeric',
        precision: 12,
        scale: 2,
    })
    amount!: number

    // Thông tin ngân hàng
    @Column({ type: 'text' })
    bankName!: string

    @Column({ type: 'text' })
    bankAccountNumber!: string

    @Column({ type: 'text' })
    bankAccountName!: string

    @Column({ type: 'text', nullable: true })
    bankBranch?: string

    // Trạng thái
    @Column({
        type: 'enum',
        enum: WithdrawalStatus,
        default: WithdrawalStatus.PENDING,
    })
    status!: WithdrawalStatus

    @Column({ type: 'text', nullable: true })
    rejectionReason?: string

    @Column({ type: 'text', nullable: true })
    transactionReference?: string

    @Column({ type: 'int', nullable: true })
    processedBy?: number

    @CreateDateColumn()
    createdAt!: Date

    @UpdateDateColumn()
    updatedAt!: Date

    static allowSortList = ['id', 'amount', 'createdAt', 'updatedAt', 'status']
}

