import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm'
import { User } from './user.entity'
import { Transaction } from './transaction.entity'
import { StudySet } from './studySet.entity'

@Entity()
export class RevenueSplit extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @ManyToOne(() => Transaction, {
        onDelete: 'CASCADE',
        nullable: false,
    })
    transaction!: Transaction

    @ManyToOne(() => StudySet, {
        onDelete: 'CASCADE',
        nullable: false,
    })
    studySet!: StudySet

    @ManyToOne(() => User, {
        onDelete: 'CASCADE',
        nullable: false,
    })
    owner!: User

    // Total amount paid by buyer
    @Column({
        type: 'numeric',
        precision: 12,
        scale: 2,
    })
    totalAmount!: number

    // Amount that goes to the owner (creator)
    @Column({
        type: 'numeric',
        precision: 12,
        scale: 2,
    })
    ownerEarnings!: number

    // Amount that goes to the platform (system)
    @Column({
        type: 'numeric',
        precision: 12,
        scale: 2,
    })
    platformFee!: number

    // Platform fee percentage (e.g., 0.30 for 30%)
    @Column({
        type: 'numeric',
        precision: 5,
        scale: 4,
    })
    platformFeePercentage!: number

    @CreateDateColumn()
    createdAt!: Date
}

