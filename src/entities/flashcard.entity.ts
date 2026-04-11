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
import { ClassroomLesson } from './classroomLesson.entity'

// Flashcard có thể thuộc 1 trong 2:
// - studySet: bộ flashcard thông thường
// - classroomLesson: copy vào bài học lớp (studySet = null)

@Entity()
export class Flashcard extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  /**
   * Thuộc study set — nullable khi flashcard là copy trong classroom lesson.
   */
  @ManyToOne(() => StudySet, (studySet) => studySet.flashcards, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  studySet?: StudySet | null

  /**
   * Thuộc bài học lớp — nullable khi flashcard thuộc study set.
   * Xóa lesson → cascade xóa flashcard.
   */
  @ManyToOne(() => ClassroomLesson, (l) => l.flashcards, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  classroomLesson?: ClassroomLesson | null

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

  /**
   * ID flashcard gốc trong study set nếu được copy vào lesson.
   * Chỉ lưu để tham chiếu, không ràng buộc FK.
   */
  @Column({ type: 'int', nullable: true })
  sourceFlashcardId?: number

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
