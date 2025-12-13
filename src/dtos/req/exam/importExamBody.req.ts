import {
  ExamGroupType,
  ExamQuestionType,
  ExamSectionType,
  ExamType,
} from "~/enums/exam.enum";

export interface ImportExamQuestionReq {
  questionType: ExamQuestionType;
  prompt: string;
  options?: Array<string | Record<string, unknown>>;
  correctAnswer?: any;
  explanation?: string;
  scoreWeight?: number;
  metadata?: Record<string, any>;
}

export interface ImportExamQuestionGroupReq {
  title: string;
  description?: string;
  content?: string;
  resourceUrl?: string;
  metadata?: Record<string, any>;
  questions: ImportExamQuestionReq[];
}

export interface ImportExamSectionGroupReq {
  groupType: ExamGroupType;
  title: string;
  description?: string;
  content?: string;
  resourceUrl?: string;
  displayOrder?: number;
  metadata?: Record<string, any>;
  questionGroups: ImportExamQuestionGroupReq[];
}

export interface ImportExamSectionReq {
  sectionType: ExamSectionType;
  title: string;
  displayOrder?: number;
  durationSeconds?: number;
  instructions?: string;
  audioUrl?: string;
  metadata?: Record<string, any>;
  groups: ImportExamSectionGroupReq[];
}

export interface ImportExamBodyReq {
  examType: ExamType;
  code: string;
  title: string;
  description?: string;

  totalDurationSeconds?: number;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
  isPublished?: boolean;
  sections: ImportExamSectionReq[];
}

export type ImportExamBulkBodyReq = ImportExamBodyReq[];
