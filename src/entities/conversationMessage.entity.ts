import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    BaseEntity
} from "typeorm";
import { ConversationSession } from "./conversationSession.entity";

export enum ChatSender {
    USER = 'USER',
    AI = 'AI'
}

@Entity({ name: 'conversation_messages' })
export class ConversationMessage extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => ConversationSession, session => session.messages, { nullable: false, onDelete: 'CASCADE' })
    session!: ConversationSession;

    @Column({
        type: 'enum',
        enum: ChatSender,
    })
    sender!: ChatSender;

    @Column({ type: 'text' })
    content!: string;

    @Column({ type: 'jsonb', nullable: true })
    corrections?: object | null;

    @Column({ type: 'text', array: true, nullable: true })
    suggestions?: string[] | null;

    @CreateDateColumn()
    createdAt!: Date;
}
