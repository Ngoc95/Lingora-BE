import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm'
import { User } from './user.entity'
import { StudySet } from './studySet.entity'

@Entity()
export class UserStudySet extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @ManyToOne(() => User, (user) => user.purchasedStudySets, {
        onDelete: 'CASCADE',
        nullable: false,
    })
    user!: User

    @ManyToOne(() => StudySet, (studySet) => studySet.purchasers, {
        onDelete: 'CASCADE',
        nullable: false,
    })
    studySet!: StudySet

    @Column({ type: 'numeric', precision: 12, scale: 2 })
    purchasePrice!: number

    @CreateDateColumn()
    purchasedAt!: Date
}

