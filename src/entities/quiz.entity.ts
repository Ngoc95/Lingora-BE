import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { QuizType } from '~/enums/quizType.enum'
import { StudySet } from './studySet.entity'

@Entity()
export class Quiz extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => StudySet, (studySet) => studySet.quizzes, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  studySet!: StudySet

  @Column({ type: 'enum', enum: QuizType })
  type!: QuizType

  @Column({ type: 'text' })
  question!: string

  @Column({ type: 'text', array: true, default: [] })
  options!: string[]

  @Column({ type: 'text' })
  correctAnswer!: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  checkAnswer(answer: string) {
    return this.correctAnswer.trim().toLowerCase() === answer.trim().toLowerCase()
  }
}

