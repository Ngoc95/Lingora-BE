import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToMany,
    JoinTable,
    BaseEntity,
    OneToMany,
    DeleteDateColumn
} from "typeorm";
import { Role } from "./role.entity";
import { RefreshToken } from "./token.entity";
import { IsEmail, IsNotEmpty, Length, Matches } from "class-validator";
import { Regex } from "~/constants/regex";
import { UserStatus } from "~/enums/userStatus.enum";
import { ProficiencyLevel } from "~/enums/proficiency.enum";
import { UserCategoryProgress } from "./userCategoryProgress.entity";
import { UserTopicProgress } from "./userTopicProgress.entity";
import { UserWordProgress } from "./userWordProgress.entity";
import { StudySet } from "./studySet.entity";
import { UserStudySet } from "./userStudySet.entity";
import { ChatSession } from "./chatSession.entity";
import { ExamAttempt } from "./examAttempt.entity";

@Entity()
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "text", unique: true })
    @Length(5, 20, { message: `Username's length must be between 5 and 20!` })
    @IsNotEmpty()
    @Matches(Regex.ONLY_LETTER_AND_NUMBER, { message: 'Username contains only letter and number' })
    username!: string;

    @Column({ type: "varchar", unique: true })
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @Column({ type: "varchar" })
    @IsNotEmpty()
    @Matches(Regex.PASSWORD, { message: 'Password must contain at least 6 chars, 1 uppercase!' })
    password!: string;

    @Column('varchar', { default: 'N/A' })
    avatar?: string

    @Column({
        type: 'enum',
        enum: UserStatus,
        default: UserStatus.INACTIVE
    })
    status?: UserStatus

    @Column({
        type: 'enum',
        enum: ProficiencyLevel,
        nullable: true,
        default: null
    })
    proficiency!: ProficiencyLevel | null

    // foreign key
    @ManyToMany(() => Role, (role) => role.users, { cascade: true })
    @JoinTable()
    roles!: Role[];

    @OneToMany(() => UserCategoryProgress, userCategoryProgress => userCategoryProgress.user, { cascade: true })
    categories: UserCategoryProgress[];

    @OneToMany(() => UserTopicProgress, userTopicProgress => userTopicProgress.user, { cascade: true })
    topics: UserTopicProgress[];

    @OneToMany(() => UserWordProgress, userWordProgress => userWordProgress.user, { cascade: true })
    words: UserWordProgress[];

    @OneToMany(() => StudySet, (studySet) => studySet.owner)
    studySets?: StudySet[];

    @OneToMany(() => UserStudySet, (userStudySet) => userStudySet.user, { cascade: true })
    purchasedStudySets?: UserStudySet[];

    @OneToMany(() => RefreshToken, (token) => token.user)
    tokens?: RefreshToken[]

    @OneToMany(() => ChatSession, (chatSession) => chatSession.user)
    chatSessions?: ChatSession[]

    @OneToMany(() => ExamAttempt, (attempt) => attempt.user)
    examAttempts?: ExamAttempt[]

    @CreateDateColumn()
    createdAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date

    static allowSortList = ['id', 'username', 'email', 'createdAt'];
}
