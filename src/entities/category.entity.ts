import { BaseEntity, Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm"
import { UserCategoryProgress } from "./userCategoryProgress.entity";
import { Topic } from "./topic.entity";

@Entity()
export class Category extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @Column({ type: "text" })
    name!: string

    @Column({ type: "text" })
    description?: string

    // foreign key
    @OneToMany(() => Topic, topic => topic.category)
    topics?: Topic[]

    @OneToMany(() => UserCategoryProgress, userCategoryProgress => userCategoryProgress.category, { cascade: true })
    users?: UserCategoryProgress[];

    @CreateDateColumn()
    createdAt!: Date;
}