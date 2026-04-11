import { checkSchema } from 'express-validator'
import { validate } from '../validation.middlewares'
import { isRequired } from '../common.middlewares'
import { QuizType } from '~/enums/quizType.enum'

export const createClassroomQuizValidation = validate(
    checkSchema(
        {
            title: {
                trim: true,
                ...isRequired('title'),
                isLength: { options: { max: 255 }, errorMessage: 'title must not exceed 255 characters' }
            },
            description: { optional: true, trim: true },
            lessonId: {
                optional: true,
                isInt: { options: { min: 1 }, errorMessage: 'lessonId must be a positive integer' },
                toInt: true
            },
            timeLimitSeconds: {
                optional: true,
                isInt: { options: { min: 10 }, errorMessage: 'timeLimitSeconds must be at least 10' },
                toInt: true
            },
            maxAttempts: {
                optional: true,
                isInt: { options: { min: 1 }, errorMessage: 'maxAttempts must be at least 1' },
                toInt: true
            },
            passingScore: {
                optional: true,
                isFloat: { options: { min: 0, max: 1 }, errorMessage: 'passingScore must be between 0 and 1' },
                toFloat: true
            },
            isPublished: { optional: true, isBoolean: true, toBoolean: true },
            opensAt: { optional: true, isISO8601: { errorMessage: 'opensAt must be a valid ISO date' }, toDate: true },
            closesAt: { optional: true, isISO8601: { errorMessage: 'closesAt must be a valid ISO date' }, toDate: true }
        },
        ['body']
    )
)

export const updateClassroomQuizValidation = validate(
    checkSchema(
        {
            title: {
                optional: true, trim: true,
                isLength: { options: { max: 255 }, errorMessage: 'title must not exceed 255 characters' }
            },
            description: { optional: true, trim: true },
            lessonId: {
                optional: { options: { nullable: true } },
                isInt: { options: { min: 1 }, errorMessage: 'lessonId must be a positive integer' },
                toInt: true
            },
            timeLimitSeconds: {
                optional: { options: { nullable: true } },
                isInt: { options: { min: 10 }, errorMessage: 'timeLimitSeconds must be at least 10' },
                toInt: true
            },
            maxAttempts: {
                optional: true,
                isInt: { options: { min: 1 }, errorMessage: 'maxAttempts must be at least 1' },
                toInt: true
            },
            passingScore: {
                optional: true,
                isFloat: { options: { min: 0, max: 1 }, errorMessage: 'passingScore must be between 0 and 1' },
                toFloat: true
            },
            isPublished: { optional: true, isBoolean: true, toBoolean: true },
            opensAt: { optional: { options: { nullable: true } }, isISO8601: { errorMessage: 'opensAt must be a valid ISO date' }, toDate: true },
            closesAt: { optional: { options: { nullable: true } }, isISO8601: { errorMessage: 'closesAt must be a valid ISO date' }, toDate: true }
        },
        ['body']
    )
)

export const createQuestionValidation = validate(
    checkSchema(
        {
            type: {
                ...isRequired('type'),
                isIn: {
                    options: [Object.values(QuizType)],
                    errorMessage: `type must be one of: ${Object.values(QuizType).join(', ')}`
                }
            },
            question: {
                trim: true,
                ...isRequired('question')
            },
            options: {
                ...isRequired('options'),
                isArray: { options: { min: 2 }, errorMessage: 'options must have at least 2 items' }
            },
            'options.*': {
                isString: { errorMessage: 'Each option must be a string' },
                trim: true
            },
            correctAnswer: {
                trim: true,
                ...isRequired('correctAnswer')
            },
            explanation: { optional: true, trim: true }
        },
        ['body']
    )
)

export const updateQuestionValidation = validate(
    checkSchema(
        {
            type: {
                optional: true,
                isIn: {
                    options: [Object.values(QuizType)],
                    errorMessage: `type must be one of: ${Object.values(QuizType).join(', ')}`
                }
            },
            question: { optional: true, trim: true },
            options: {
                optional: true,
                isArray: { options: { min: 2 }, errorMessage: 'options must have at least 2 items' }
            },
            'options.*': { optional: true, isString: true, trim: true },
            correctAnswer: { optional: true, trim: true },
            explanation: { optional: true, trim: true }
        },
        ['body']
    )
)
