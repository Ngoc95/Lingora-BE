import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ExamType } from "../enums/exam.enum";
import { ExamSection } from "./examSection.entity";
import { ExamAttempt } from "./examAttempt.entity";

@Entity()
export class Exam extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "enum", enum: ExamType, default: ExamType.IELTS })
  examType!: ExamType;

  @Column({ type: "text", unique: true })
  code!: string;

  @Column({ type: "text" })
  title!: string;

  @Column({ type: "text", nullable: true })
  description?: string;



  @Column({ type: "int", default: 0 })
  totalDurationSeconds!: number;

  @Column({ type: "text", nullable: true })
  thumbnailUrl?: string;

  @Column({ type: "boolean", default: false })
  isPublished!: boolean;

  @Column({ type: "jsonb", default: () => `'{}'` })
  metadata!: Record<string, any>;

  @OneToMany(() => ExamSection, (section) => section.exam, { cascade: true })
  sections!: ExamSection[];

  @OneToMany(() => ExamAttempt, (attempt) => attempt.exam)
  attempts!: ExamAttempt[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
