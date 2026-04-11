import { QuizType } from '~/enums/quizType.enum'

export interface UpdateClassroomQuizQuestionBodyReq {
    type?: QuizType
    question?: string
    options?: string[]
    correctAnswer?: string
    explanation?: string
}
