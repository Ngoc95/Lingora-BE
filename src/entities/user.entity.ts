import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToMany,
    JoinTable,
    BaseEntity,
    OneToMany
} from "typeorm";
import { Role } from "./role.entity";
import { RefreshToken } from "./token.entity";
import { IsEmail, IsNotEmpty, Length, Matches } from "class-validator";
import { Regex } from "~/constants/regex";
import { UserStatus } from "~/enums/userStatus.enum";
import { ProficiencyLevel } from "~/enums/proficiency.enum";

@Entity()
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", unique: true })
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

    @ManyToMany(() => Role, (role) => role.users, { cascade: true })
    @JoinTable()
    roles!: Role[];

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
        default: ProficiencyLevel.BEGINNER
    })
    proficiency!: ProficiencyLevel

    @OneToMany(() => RefreshToken, (token) => token.user)
    tokens?: RefreshToken[]

    @CreateDateColumn()
    created_at!: Date;

    static allowSortList = ['id', 'username', 'email', 'createdAt'];
}
