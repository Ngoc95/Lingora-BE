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

@Entity()
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", unique: true })
    username!: string;

    @Column({ type: "varchar", unique: true })
    email!: string;

    @Column({ type: "varchar" })
    password!: string;

    @ManyToMany(() => Role, (role) => role.users, { cascade: true })
    @JoinTable()
    roles!: Role[];

    @OneToMany(() => RefreshToken, (token) => token.user)
    tokens?: RefreshToken[]

    @CreateDateColumn()
    created_at!: Date;
}
