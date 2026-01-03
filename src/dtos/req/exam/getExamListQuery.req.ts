import { ExamType } from '~/enums/exam.enum';

export interface GetExamListQueryReq {
  examType?: ExamType;
  search?: string;
  page?: number;
  limit?: number;
  isPublished?: boolean;
}
