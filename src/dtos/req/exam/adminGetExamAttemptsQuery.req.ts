export interface AdminGetExamAttemptsQueryReq {
  page?: number;
  limit?: number;
  search?: string; // Search by user name or email or exam title
  userId?: number;
  examId?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  minScore?: number;
  maxScore?: number;
}
