import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { User } from './user.entity'
import { ChatMessage } from './chatMessage.entity'

@Entity({ name: 'chat_sessions' })
export class ChatSession extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string | null

  @ManyToOne(() => User, (user) => user.chatSessions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  user?: User | null

  @OneToMany(() => ChatMessage, (message) => message.session)
  messages?: ChatMessage[]

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}

