import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { StudySet } from './studySet.entity'

@Entity()
export class Flashcard extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => StudySet, (studySet) => studySet.flashcards, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  studySet!: StudySet

  @Column({ type: 'text' })
  frontText!: string

  @Column({ type: 'text' })
  backText!: string

  @Column({ type: 'text', nullable: true })
  example?: string

  @Column({ type: 'text', nullable: true })
  audioUrl?: string

  @Column({ type: 'text', nullable: true })
  imageUrl?: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  flip() {
    const front = this.frontText
    this.frontText = this.backText
    this.backText = front
  }

  updateCard({
    frontText,
    backText,
    example,
    audioUrl,
    imageUrl,
  }: Partial<Pick<Flashcard, 'frontText' | 'backText' | 'example' | 'audioUrl' | 'imageUrl'>>) {
    if (frontText !== undefined) this.frontText = frontText
    if (backText !== undefined) this.backText = backText
    if (example !== undefined) this.example = example
    if (audioUrl !== undefined) this.audioUrl = audioUrl
    if (imageUrl !== undefined) this.imageUrl = imageUrl
  }
}

