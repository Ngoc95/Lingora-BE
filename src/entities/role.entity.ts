import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, BaseEntity } from "typeorm";
import { User } from "./user.entity";

@Entity()
export class Role extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", unique: true })
    name!: string; // ADMIN, USER

    @ManyToMany(() => User, (user) => user.roles)
    users!: User[];
}
