import adaptiveQuestions from '~/data/adaptiveTestQuestions.json'
import { BadRequestError } from '~/core/error.response'
import { ProficiencyLevel } from '~/enums/proficiency.enum'
import { DatabaseService } from './database.service'
import { User } from '~/entities/user.entity'
import { DEFAULT_LEVEL, MAX_QUESTIONS } from '~/constants/adaptiveTest'

export interface AdaptiveQuestion {
  id: number
  skill: string
  text: string
  passage?: string
  options: string[]
  answer: string
  difficulty: number
}

export type PublicAdaptiveQuestion = Omit<AdaptiveQuestion, 'answer'>

export interface AdaptiveTestAnswer {
  questionId: number
  answer: string
}

interface GetNextQuestionParams {
  user: User
  answeredQuestions: AdaptiveTestAnswer[]
}

interface AnswerEvaluation {
  question: AdaptiveQuestion
  isCorrect: boolean
}

interface NextQuestionResult {
  currentLevel: number
  answeredCount: number
  answerEvaluations: Array<{
    questionId: number
    isCorrect: boolean
    difficulty: number
  }>
  isCompleted: boolean
  nextQuestion: PublicAdaptiveQuestion | null
  proficiency: ProficiencyLevel | null
}

class AdaptiveTestService {
  private readonly db = DatabaseService.getInstance()
  private readonly questions: AdaptiveQuestion[] = adaptiveQuestions as AdaptiveQuestion[]

  getQuestionBank(): Record<number, PublicAdaptiveQuestion[]> {
    const grouped: Record<number, PublicAdaptiveQuestion[]> = { 1: [], 2: [], 3: [] }

    for (const question of this.questions) {
      if (!grouped[question.difficulty]) {
        grouped[question.difficulty] = []
      }
      grouped[question.difficulty].push(this.sanitizeQuestion(question))
    }

    return grouped
  }

  async getNextQuestion({ user, answeredQuestions }: GetNextQuestionParams): Promise<NextQuestionResult> {
    
    const evaluations = this.evaluateAnswers(answeredQuestions)
    const answeredCount = evaluations.length
    const currentLevel = this.computeCurrentLevel(evaluations)
    const shouldComplete = evaluations.length >= MAX_QUESTIONS

    let nextQuestion: AdaptiveQuestion | null = null
    if (!shouldComplete) {
      nextQuestion = this.pickNextQuestion(currentLevel, new Set(evaluations.map((item) => item.question.id)))
    }

    const isOutOfQuestions = !shouldComplete && !nextQuestion
    const isCompleted = shouldComplete || isOutOfQuestions
    const proficiency = isCompleted && answeredCount > 0
      ? await this.persistProficiency(user, currentLevel)
      : null

    return {
      currentLevel,
      answeredCount,
      answerEvaluations: evaluations.map((item) => ({
        questionId: item.question.id,
        isCorrect: item.isCorrect,
        difficulty: item.question.difficulty
      })),
      isCompleted,
      nextQuestion: nextQuestion ? this.sanitizeQuestion(nextQuestion) : null,
      proficiency
    }
  }

  private evaluateAnswers(answeredQuestions: AdaptiveTestAnswer[]): AnswerEvaluation[] {
    if (!answeredQuestions || answeredQuestions.length === 0) return []

    return answeredQuestions.map((payload) => {
      const question = this.questions.find((item) => item.id === payload.questionId)

      if (!question) {
        throw new BadRequestError({ message: `Question with id ${payload.questionId} does not exist.` })
      }

      const normalizedUserAnswer = payload.answer?.trim().toLowerCase()
      const normalizedCorrectAnswer = question.answer.trim().toLowerCase()

      return {
        question,
        isCorrect: normalizedUserAnswer === normalizedCorrectAnswer
      }
    })
  }

  private numberToProficiency(num: number): ProficiencyLevel {
    if (num <= 1) return ProficiencyLevel.BEGINNER
    if (num >= 3) return ProficiencyLevel.ADVANCED
    return ProficiencyLevel.INTERMEDIATE
  }

  private computeCurrentLevel(evaluations: AnswerEvaluation[]): number {
    let level = DEFAULT_LEVEL

    for (const evaluation of evaluations) {
      if (evaluation.isCorrect) {
        level = Math.min(level + 1, 3)
      } else {
        level = Math.max(level - 1, 1)
      }
    }

    return level
  }

  private pickNextQuestion(level: number, excludedQuestionIds: Set<number>): AdaptiveQuestion | null {
    const candidates = this.questions.filter(
      (question) => question.difficulty === level && !excludedQuestionIds.has(question.id)
    )

    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)]
    }

    const remaining = this.questions.filter((question) => !excludedQuestionIds.has(question.id))
    return remaining.length > 0 ? remaining[Math.floor(Math.random() * remaining.length)] : null
  }

  private async persistProficiency(user: User, level: number): Promise<ProficiencyLevel> {
    const proficiency = this.numberToProficiency(level)

    const userRepo = await this.db.getRepository(User)
    user.proficiency = proficiency
    await userRepo.update({ id: user.id }, { proficiency })

    return proficiency
  }

  private sanitizeQuestion(question: AdaptiveQuestion): PublicAdaptiveQuestion {
    const { answer, ...rest } = question
    return rest
  }
}

export const adaptiveTestService = new AdaptiveTestService()
