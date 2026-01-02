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
import { ExamSectionType } from '../enums/exam.enum'
import { Exam } from './exam.entity'
import { ExamSectionGroup } from './examSectionGroup.entity'
import { ExamAttemptAnswer } from './examAttemptAnswer.entity'

@Entity()
export class ExamSection extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => Exam, (exam) => exam.sections, {
    onDelete: 'CASCADE'
  })
  exam!: Exam

  @Column({ type: 'text' })
  title!: string

  @Column({ type: 'enum', enum: ExamSectionType, default: ExamSectionType.GENERAL })
  sectionType!: ExamSectionType

  @Column({ type: 'int', default: 1 })
  displayOrder!: number

  @Column({ type: 'int', default: 0 })
  durationSeconds!: number

  @Column({ type: 'text', nullable: true })
  instructions?: string

  @Column({ type: 'text', nullable: true })
  audioUrl?: string

  @Column({ type: 'jsonb', default: () => `'{}'` })
  metadata!: Record<string, any>

  @OneToMany(() => ExamSectionGroup, (group) => group.section, {
    cascade: true
  })
  questionGroups!: ExamSectionGroup[]

  @OneToMany(() => ExamAttemptAnswer, (answer) => answer.section)
  attemptAnswers!: ExamAttemptAnswer[]

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}

