import { QuizType } from '~/enums/quizType.enum'

export interface CreateClassroomQuizQuestionBodyReq {
    type: QuizType
    question: string
    options: string[]
    correctAnswer: string
    explanation?: string
}
