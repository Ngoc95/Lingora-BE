import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    ManyToOne,
    PrimaryGeneratedColumn
} from 'typeorm'
import { User } from './user.entity'
import { Classroom } from './classroom.entity'
import { XpActionType } from '~/enums/xpActionType.enum'

@Entity({ name: 'user_xp_log' })
@Index(['user', 'createdAt'])
@Index(['classroom', 'createdAt'])
export class UserXpLog extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
    user!: User

    /** NULL = hoạt động cá nhân, không thuộc lớp nào */
    @ManyToOne(() => Classroom, { nullable: true, onDelete: 'SET NULL' })
    classroom?: Classroom | null

    @Column({ type: 'int' })
    xpAmount!: number

    @Column({ type: 'enum', enum: XpActionType })
    actionType!: XpActionType

    @Column({ type: 'int', nullable: true })
    referencedId?: number | null

    @Column({ type: 'varchar', length: 50, nullable: true })
    referenceType?: string | null

    @Column({ type: 'text', nullable: true })
    description?: string | null

    @CreateDateColumn()
    createdAt!: Date

    static allowSortList = ['id', 'createdAt', 'xpAmount']
}
