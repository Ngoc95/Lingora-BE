export interface ExamAnswerInputReq {
  questionId: number;
  answer: any;
}

export interface SubmitExamSectionBodyReq {
  answers: ExamAnswerInputReq[];
}
