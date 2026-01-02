import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ChatSession } from "./chatSession.entity";
import { ChatMessageSender } from "../enums/chatMessageSender.enum";

@Entity({ name: "chat_messages" })
export class ChatMessage extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => ChatSession, (session) => session.messages, {
    onDelete: "CASCADE",
  })
  session!: ChatSession;

  @Column({
    type: "enum",
    enum: ChatMessageSender,
  })
  sender!: ChatMessageSender;

  @Column({ type: "text" })
  content!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
