import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { User } from "./user.entity";
import { Word } from "./word.entity";
import { WordStatus } from "~/enums/wordStatus.enum";

@Entity()
@Unique(['word', 'user'])
export class UserWordProgress extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => User, user => user.words, { onDelete: 'CASCADE' })
    user: User;

    @ManyToOne(() => Word, word => word.users, { onDelete: 'CASCADE' })
    word: Word;

    @Column({ type: 'enum', enum: WordStatus, default: WordStatus.NEW })
    status!: WordStatus

    @Column({ type: 'int', default: 1 })
    srsLevel!: number

    @CreateDateColumn()
    learnedAt?: Date

    @Column({ type: 'timestamp', nullable: true })
    nextReviewDay?: Date

    @UpdateDateColumn()
    updatedAt?: Date
}
