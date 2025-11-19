import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'
import { StudySetVisibility } from '~/enums/studySetVisibility.enum'
import { StudySetStatus } from '~/enums/studySetStatus.enum'
import { User } from './user.entity'
import { Flashcard } from './flashcard.entity'
import { Quiz } from './quiz.entity'
import { UserStudySet } from './userStudySet.entity'

@Entity()
export class StudySet extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @Column({ type: 'text' })
    title!: string

    @Column({ type: 'text', nullable: true })
    description?: string

    @Column({
        type: 'enum',
        enum: StudySetVisibility,
        default: StudySetVisibility.PRIVATE,
    })
    visibility!: StudySetVisibility

    @Column({
        type: 'numeric',
        precision: 12,
        scale: 2,
        default: 0,
    })
    price!: number

    @ManyToOne(() => User, (user) => user.studySets, {
        onDelete: 'CASCADE',
        nullable: false,
    })
    owner!: User

    @Column({
        type: 'enum',
        enum: StudySetStatus,
        default: StudySetStatus.DRAFT,
    })
    status!: StudySetStatus

    @OneToMany(() => Flashcard, (flashcard) => flashcard.studySet, {
        cascade: true,
        eager: false,
    })
    flashcards?: Flashcard[]

    @OneToMany(() => Quiz, (quiz) => quiz.studySet, {
        cascade: true,
        eager: false,
    })
    quizzes?: Quiz[]

    @OneToMany(() => UserStudySet, (userStudySet) => userStudySet.studySet, {
        cascade: true,
        eager: false,
    })
    purchasers?: UserStudySet[]

    @CreateDateColumn()
    createdAt!: Date

    @UpdateDateColumn()
    updatedAt!: Date

    static allowSortList = ['id', 'title', 'createdAt', 'price']
}

