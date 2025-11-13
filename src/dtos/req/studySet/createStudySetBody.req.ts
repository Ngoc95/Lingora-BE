import { StudySetStatus } from '~/enums/studySetStatus.enum'
import { StudySetVisibility } from '~/enums/studySetVisibility.enum'
import { QuizType } from '~/enums/quizType.enum'

export interface FlashcardInputReq {
    frontText: string
    backText: string
    example?: string
    audioUrl?: string
    imageUrl?: string
}

export interface QuizInputReq {
    type: QuizType
    question: string
    options: string[]
    correctAnswer: string
}

export interface CreateStudySetBodyReq {
    title: string
    description?: string
    visibility?: StudySetVisibility
    price?: number
    flashcards?: FlashcardInputReq[]
    quizzes?: QuizInputReq[]
}

