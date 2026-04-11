import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm'
import { User } from './user.entity'
import { Classroom } from './classroom.entity'
import { ClassroomMemberRole } from '~/enums/classroomMemberRole.enum'
import { ClassroomMemberStatus } from '~/enums/classroomMemberStatus.enum'

@Entity()
@Unique(['classroom', 'user'])
export class ClassroomMember extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @ManyToOne(() => Classroom, (c) => c.members, { onDelete: 'CASCADE', nullable: false })
    classroom!: Classroom

    @ManyToOne(() => User, (u) => u.classrooms, { onDelete: 'CASCADE', nullable: false })
    user!: User

    @Column({ type: 'enum', enum: ClassroomMemberRole, default: ClassroomMemberRole.STUDENT })
    role!: ClassroomMemberRole

    @Column({ type: 'enum', enum: ClassroomMemberStatus, default: ClassroomMemberStatus.ACTIVE })
    status!: ClassroomMemberStatus

    @CreateDateColumn()
    joinedAt!: Date

    @Column({ type: 'timestamptz', nullable: true })
    removedAt?: Date

    @UpdateDateColumn()
    updatedAt!: Date
}
