import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, BaseEntity } from "typeorm";
import { User } from "./user.entity";
import { RoleName } from "../enums/role.enum";

@Entity()
export class Role extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @Column({
        type: 'enum',
        enum: RoleName,
        unique: true
    })
    name!: RoleName

    @ManyToMany(() => User, (user) => user.roles)
    users!: User[]
}