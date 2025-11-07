import { BaseEntity, Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Topic } from "./topic.entity";
import { CefrLevel } from "~/enums/cefrLevel.enum";
import { WordType } from "~/enums/wordType.enum";
import { UserWordProgress } from "./userWordProgress.entity";

@Entity()
export class Word extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @Column({ type: "text" })
    word!: string

    @Column({ type: "varchar", nullable: true })
    phonetic?: string

    @Column({
        type: 'enum',
        enum: CefrLevel
    })
    cefrLevel!: CefrLevel

    @Column({ type: 'enum', enum: WordType })
    type?: WordType

    @Column({ type: 'text', nullable: true })
    meaning!: string

    @Column({ type: 'text', nullable: true })
    example?: string

    @Column({ type: 'text', nullable: true })
    exampleTranslation?: string

    @Column({ type: 'varchar', nullable: true })
    audioUrl?: string

    @Column({ type: 'varchar', nullable: true })
    imageUrl?: string

    // foreign key
    @ManyToOne(() => Topic, topic => topic.words, {
        onDelete: 'SET NULL', // xóa topic → word.topic = null
        nullable: true
    })
    topic: Topic | null // word có thể ko thuộc topic nào

    @OneToMany(() => UserWordProgress, userWordProgress => userWordProgress.word, { cascade: true })
    users?: UserWordProgress[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt?: Date

    @DeleteDateColumn()
    deletedAt?: Date

    static allowSortList = ['id', 'word', 'cefrLevel'];
}