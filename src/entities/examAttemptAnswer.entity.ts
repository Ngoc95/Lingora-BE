import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ExamAttempt } from "./examAttempt.entity";
import { ExamQuestion } from "./examQuestion.entity";
import { ExamSection } from "./examSection.entity";

@Entity()
export class ExamAttemptAnswer extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ExamAttempt, (attempt) => attempt.answers, {
    onDelete: "CASCADE",
  })
  attempt!: ExamAttempt;

  @ManyToOne(() => ExamQuestion, (question) => question.attemptAnswers, {
    onDelete: "CASCADE",
  })
  question!: ExamQuestion;

  @ManyToOne(() => ExamSection, (section) => section.attemptAnswers, {
    onDelete: "CASCADE",
  })
  section!: ExamSection;

  @Column({ type: "jsonb", nullable: true })
  answerPayload?: any;

  @Column({ type: "boolean", nullable: true })
  isCorrect?: boolean;

  @Column({ type: "float", nullable: true })
  score?: number;

  @Column({ type: "jsonb", nullable: true })
  aiFeedback?: Record<string, any>;

  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  answeredAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
