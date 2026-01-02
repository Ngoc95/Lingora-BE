import { User } from './user.entity'
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { TargetType } from '../enums/targetType.enum'

@Entity()
export class Comment extends BaseEntity {
  @PrimaryGeneratedColumn()
  id?: number

  @Column({ type: 'varchar', length: 256 })
  content: string

  @ManyToOne(() => Comment)
  parentComment: Comment | null

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  createdBy: User

  @Column('varchar')
  targetType: TargetType

  @Column('int')
  targetId: number

  @DeleteDateColumn()
  deletedAt?: Date

  @CreateDateColumn()
  createdAt?: Date

  @UpdateDateColumn()
  updatedAt?: Date
}
