export interface AdaptiveTestAnswerReq {
  questionId: number
  answer: string
}

export interface AdaptiveTestProgressBodyReq {
  answeredQuestions: AdaptiveTestAnswerReq[]
}


