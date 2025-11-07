import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { Category } from "./category.entity";
import { User } from "./user.entity";
import { ProficiencyLevel } from "~/enums/proficiency.enum";

@Entity()
@Unique(['user', 'category', 'proficiency'])
export class UserCategoryProgress extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => User, user => user.categories, { onDelete: 'CASCADE' })
    user: User;

    @ManyToOne(() => Category, category => category.users, { onDelete: 'CASCADE' })
    category: Category;

    @Column({
        type: 'enum',
        enum: ProficiencyLevel,
        default: ProficiencyLevel.BEGINNER
    })
    proficiency: ProficiencyLevel

    @Column({ type: 'float', default: 0 })
    progressPercent!: number

    @Column({ type: 'boolean', default: false })
    completed!: boolean

    @CreateDateColumn()
    createdAt?: Date

    @UpdateDateColumn()
    updatedAt?: Date
}
