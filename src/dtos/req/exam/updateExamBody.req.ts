import { ExamType } from "../../../enums/exam.enum";

export interface UpdateExamBodyReq {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  isPublished?: boolean;
  code?: string;
  examType?: ExamType;
  metadata?: Record<string, any>;
}
