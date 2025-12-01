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
import { ExamGroupType } from '~/enums/exam.enum'
import { ExamSection } from './examSection.entity'
import { ExamQuestion } from './examQuestion.entity'

@Entity()
export class ExamSectionGroup extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => ExamSection, (section) => section.questionGroups, {
    onDelete: 'CASCADE'
  })
  section!: ExamSection

  @Column({ type: 'enum', enum: ExamGroupType, default: ExamGroupType.GENERAL })
  groupType!: ExamGroupType

  @Column({ type: 'text' })
  title!: string

  @Column({ type: 'text', nullable: true })
  description?: string

  @Column({ type: 'text', nullable: true })
  content?: string

  @Column({ type: 'text', nullable: true })
  resourceUrl?: string

  @Column({ type: 'int', default: 1 })
  displayOrder!: number

  @Column({ type: 'jsonb', default: () => `'{}'` })
  metadata!: Record<string, any>

  @OneToMany(() => ExamQuestion, (question) => question.group, {
    cascade: true
  })
  questions!: ExamQuestion[]

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}

