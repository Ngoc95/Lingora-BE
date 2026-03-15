import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    BaseEntity
} from "typeorm";
import { User } from "./user.entity";
import { ConversationContext } from "./conversationContext.entity";
import { ConversationStatus } from "~/enums/conversationStatus.enum";
import { ConversationMessage } from "./conversationMessage.entity";

@Entity({ name: 'conversation_sessions' })
export class ConversationSession extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => User, user => user.id, { nullable: false, onDelete: 'CASCADE' })
    user!: User;

    @ManyToOne(() => ConversationContext, context => context.sessions, { eager: true, nullable: false, onDelete: 'RESTRICT' })
    context!: ConversationContext;

    @Column({ type: 'varchar', length: 255, nullable: true })
    title?: string | null;

    @Column({
        type: 'enum',
        enum: ConversationStatus,
        default: ConversationStatus.ACTIVE
    })
    status!: ConversationStatus;

    @Column({ type: 'varchar', length: 20, default: 'opening' })
    currentPhase!: string; // "opening", "developing", "closing", "completed"

    @Column({ type: 'int', default: 0 })
    totalMessages!: number;

    @Column({ type: 'int', default: 0 })
    errorCount!: number;

    // Scores (calculated after session ends)
    @Column({ type: 'float', nullable: true })
    grammarScore?: number | null;

    @Column({ type: 'float', nullable: true })
    fluencyScore?: number | null;

    @Column({ type: 'float', nullable: true })
    overallScore?: number | null;

    @OneToMany(() => ConversationMessage, message => message.session)
    messages?: ConversationMessage[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @Column({ type: 'timestamp', nullable: true })
    endedAt?: Date | null;
}
