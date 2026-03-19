import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    BaseEntity,
    OneToMany
} from "typeorm";
import { ConversationDifficulty } from "~/enums/conversationDifficulty.enum";
import { ConversationSession } from "./conversationSession.entity";
import { ConversationSuggestionTemplate } from "./conversationSuggestionTemplate.entity";

@Entity({ name: 'conversation_contexts' })
export class ConversationContext extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    slug!: string;

    @Column({ type: 'text' })
    description!: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    iconUrl?: string | null;

    @Column({ type: 'text' })
    systemPrompt!: string;

    @Column({
        type: 'enum',
        enum: ConversationDifficulty,
        default: ConversationDifficulty.BEGINNER
    })
    difficultyLevel!: ConversationDifficulty;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    @Column({ type: 'int', default: 0 })
    sortOrder!: number;

    @OneToMany(() => ConversationSession, session => session.context)
    sessions?: ConversationSession[];

    @OneToMany(() => ConversationSuggestionTemplate, template => template.context)
    suggestionTemplates?: ConversationSuggestionTemplate[];

    @CreateDateColumn()
    createdAt!: Date;
}
