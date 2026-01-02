import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { User } from "./user.entity";
import { Topic } from "./topic.entity";
import { ProficiencyLevel } from "../enums/proficiency.enum";

@Entity()
@Unique(['topic', 'user', 'proficiency'])
export class UserTopicProgress extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => User, user => user.topics, { onDelete: 'CASCADE' })
    user: User;

    @ManyToOne(() => Topic, topic => topic.users, { onDelete: 'CASCADE' })
    topic: Topic;

    @Column({
        type: 'enum',
        enum: ProficiencyLevel,
        default: ProficiencyLevel.BEGINNER
    })
    proficiency: ProficiencyLevel

    @Column({ type: 'boolean', default: false })
    completed!: boolean

    @CreateDateColumn()
    createdAt?: Date

    @UpdateDateColumn()
    updatedAt?: Date
}
