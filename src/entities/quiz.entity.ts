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
import { ClassroomQuiz } from './classroomQuiz.entity'

// ClassroomQuiz  (bảng classroom_quiz)
// ├── title, timeLimitSeconds, passingScore...  → metadata của bài kiểm tra
// └── questions: Quiz[]                         → danh sách câu hỏi

// Quiz  (bảng quiz)
// ├── question, options, correctAnswer...       → 1 câu hỏi đơn lẻ
// └── classroomQuiz: ClassroomQuiz             → thuộc bài kiểm tra nào

@Entity()
export class Quiz extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  /**
   * Câu hỏi thuộc bộ học (study set) — nullable khi thuộc classroom quiz.
   * Khi studySet bị xóa thì quiz này cũng bị xóa theo (CASCADE).
   */
  @ManyToOne(() => StudySet, (studySet) => studySet.quizzes, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  studySet?: StudySet | null

  /**
   * Câu hỏi thuộc bài kiểm tra lớp học — nullable khi thuộc study set.
   * Có thể được tạo thủ công hoặc copy (import) từ study set.
   */
  @ManyToOne(() => ClassroomQuiz, (cq) => cq.questions, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  classroomQuiz?: ClassroomQuiz | null

  @Column({ type: 'enum', enum: QuizType })
  type!: QuizType

  @Column({ type: 'text' })
  question!: string

  @Column({ type: 'text', array: true, default: [] })
  options!: string[]

  @Column({ type: 'text' })
  correctAnswer!: string

  /** Giải thích đáp án (chỉ dùng trong classroom quiz) */
  @Column({ type: 'text', nullable: true })
  explanation?: string

  /**
   * ID của flashcard/quiz gốc nếu câu hỏi này được import từ study set.
   * Chỉ lưu để tham chiếu, không ràng buộc — xóa gốc không ảnh hưởng.
   */
  @Column({ type: 'int', nullable: true })
  sourceQuizId?: number

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  checkAnswer(answer: string) {
    return this.correctAnswer.trim().toLowerCase() === answer.trim().toLowerCase()
  }
}

