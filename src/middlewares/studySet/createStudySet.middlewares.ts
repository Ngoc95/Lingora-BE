import { checkSchema } from 'express-validator'
import { validate } from '../validation.middlewares'
import { isRequired } from '../common.middlewares'
import { StudySetVisibility } from '~/enums/studySetVisibility.enum'
import { QuizType } from '~/enums/quizType.enum'
import { BadRequestError } from '~/core/error.response'

export const createStudySetValidation = validate(
    checkSchema(
        {
            title: {
                trim: true,
                ...isRequired('title'),
                isLength: {
                    options: { min: 1, max: 255 },
                    errorMessage: 'Title must be between 1 and 255 characters.',
                },
            },
            description: {
                optional: true,
                trim: true,
                isLength: {
                    options: { max: 1000 },
                    errorMessage: 'Description must not exceed 1000 characters.',
                },
            },
            visibility: {
                optional: true,
                custom: {
                    options: (value) => {
                        if (value && !Object.values(StudySetVisibility).includes(value)) {
                            throw new BadRequestError({
                                message: `Visibility must be one of: ${Object.values(StudySetVisibility).join(', ')}`,
                            })
                        }
                        return true
                    },
                },
            },
            price: {
                optional: true,
                custom: {
                    options: (value) => {
                        if (value !== undefined && value !== null) {
                            const numValue = Number(value)
                            if (isNaN(numValue) || numValue < 0) {
                                throw new BadRequestError({ message: 'Price must be a non-negative number' })
                            }
                        }
                        return true
                    },
                },
            },
            status: {
                optional: true,
                custom: {
                    options: (value) => {
                        // User không được phép set status khi tạo study set
                        if (value !== undefined && value !== null) {
                            throw new BadRequestError({
                                message: 'Status cannot be set when creating study set. It will be automatically set based on visibility.',
                            })
                        }
                        return true
                    },
                },
            },
            flashcards: {
                optional: true,
                isArray: {
                    errorMessage: 'Flashcards must be an array',
                },
                custom: {
                    options: (value) => {
                        if (value && Array.isArray(value)) {
                            value.forEach((fc: any, index: number) => {
                                if (!fc.frontText || !fc.backText) {
                                    throw new BadRequestError({
                                        message: `Flashcard at index ${index} must have frontText and backText`,
                                    })
                                }
                                if (typeof fc.frontText !== 'string' || typeof fc.backText !== 'string') {
                                    throw new BadRequestError({
                                        message: `Flashcard at index ${index}: frontText and backText must be strings`,
                                    })
                                }
                            })
                        }
                        return true
                    },
                },
            },
            quizzes: {
                optional: true,
                isArray: {
                    errorMessage: 'Quizzes must be an array',
                },
                custom: {
                    options: (value) => {
                        if (value && Array.isArray(value)) {
                            value.forEach((q: any, index: number) => {
                                if (!q.type || !q.question || !q.options || !q.correctAnswer) {
                                    throw new BadRequestError({
                                        message: `Quiz at index ${index} must have type, question, options, and correctAnswer`,
                                    })
                                }
                                if (!Object.values(QuizType).includes(q.type)) {
                                    throw new BadRequestError({
                                        message: `Quiz at index ${index}: type must be one of: ${Object.values(QuizType).join(', ')}`,
                                    })
                                }
                                if (!Array.isArray(q.options)) {
                                    throw new BadRequestError({
                                        message: `Quiz at index ${index}: options must be an array`,
                                    })
                                }
                            })
                        }
                        return true
                    },
                },
            },
        },
        ['body']
    )
)

