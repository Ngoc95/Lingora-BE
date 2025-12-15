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
import { ExamQuestionType } from '~/enums/exam.enum'
import { ExamQuestionGroup } from './examQuestionGroup.entity'
import { ExamAttemptAnswer } from './examAttemptAnswer.entity'

@Entity()
export class ExamQuestion extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => ExamQuestionGroup, (group) => group.questions, {
    onDelete: 'CASCADE'
  })
  group!: ExamQuestionGroup

  @Column({ type: 'enum', enum: ExamQuestionType, default: ExamQuestionType.MULTIPLE_CHOICE })
  questionType!: ExamQuestionType

  @Column({ type: 'text' })
  prompt!: string

  @Column({ type: 'jsonb', default: () => `'[]'` })
  options!: Array<string | Record<string, unknown>>

  @Column({ type: 'jsonb', nullable: true })
  correctAnswer?: any

  @Column({ type: 'text', nullable: true })
  explanation?: string

  @Column({ type: 'float', default: 1 })
  scoreWeight!: number

  @Column({ type: 'jsonb', default: () => `'{}'` })
  metadata!: Record<string, any>

  @OneToMany(() => ExamAttemptAnswer, (answer) => answer.question)
  attemptAnswers!: ExamAttemptAnswer[]

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}

