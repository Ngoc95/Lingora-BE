import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    BaseEntity
} from "typeorm";
import { ConversationContext } from "./conversationContext.entity";

@Entity({ name: 'conversation_suggestion_templates' })
export class ConversationSuggestionTemplate extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => ConversationContext, context => context.suggestionTemplates, { nullable: false, onDelete: 'CASCADE' })
    context!: ConversationContext;

    @Column({ type: 'varchar', length: 50 })
    phase!: string; // "opening", "developing", etc.

    @Column({ type: 'text' })
    suggestionText!: string;

    @Column({ type: 'int', default: 0 })
    sortOrder!: number;
}
