import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { ExamAttemptStatus, ExamMode } from '../enums/exam.enum'
import { User } from './user.entity'
import { Exam } from './exam.entity'
import { ExamAttemptAnswer } from './examAttemptAnswer.entity'

@Entity()
export class ExamAttempt extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => User, (user) => user.examAttempts, { onDelete: 'CASCADE' })
  user!: User

  @ManyToOne(() => Exam, (exam) => exam.attempts, { onDelete: 'CASCADE' })
  exam!: Exam

  @Column({ type: 'enum', enum: ExamMode, default: ExamMode.SECTION })
  mode!: ExamMode

  @Column({ type: 'enum', enum: ExamAttemptStatus, default: ExamAttemptStatus.IN_PROGRESS })
  status!: ExamAttemptStatus

  @Column({ type: 'int', nullable: true })
  targetSectionId?: number

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  startedAt!: Date

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt?: Date

  @Column({ type: 'jsonb', default: () => `'{}'` })
  sectionProgress!: Record<string, any>

  @Column({ type: 'jsonb', default: () => `'{}'` })
  scoreSummary!: Record<string, any>

  @OneToMany(() => ExamAttemptAnswer, (answer) => answer.attempt, { cascade: true })
  answers!: ExamAttemptAnswer[]

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}

