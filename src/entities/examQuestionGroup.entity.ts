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
import { ExamSectionGroup } from './examSectionGroup.entity'
import { ExamQuestion } from './examQuestion.entity'

@Entity()
export class ExamQuestionGroup extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => ExamSectionGroup, (group) => group.questionGroups, {
    onDelete: 'CASCADE'
  })
  sectionGroup!: ExamSectionGroup

  @Column({ type: 'text' })
  title!: string

  @Column({ type: 'text', nullable: true })
  description?: string

  @Column({ type: 'text', nullable: true })
  content?: string

  @Column({ type: 'text', nullable: true })
  resourceUrl?: string

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
