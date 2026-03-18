import { checkSchema } from 'express-validator'
import { validate } from '../validation.middlewares'
import { isRequired } from '../common.middlewares'
import { ClassroomLessonType } from '~/enums/classroomLessonType.enum'

export const createLessonValidation = validate(
    checkSchema(
        {
            title: {
                trim: true,
                ...isRequired('title'),
                isLength: {
                    options: { max: 255 },
                    errorMessage: 'title must not exceed 255 characters'
                }
            },
            description: { optional: true, trim: true },
            lessonType: {
                optional: true,
                isIn: {
                    options: [Object.values(ClassroomLessonType)],
                    errorMessage: `lessonType must be one of: ${Object.values(ClassroomLessonType).join(', ')}`
                }
            },
            studySetId: {
                optional: true,
                isInt: { options: { min: 1 }, errorMessage: 'studySetId must be a positive integer' },
                toInt: true
            },
            content: { optional: true, trim: true },
            sortOrder: {
                optional: true,
                isInt: { options: { min: 0 }, errorMessage: 'sortOrder must be a non-negative integer' },
                toInt: true
            },
            isPublished: {
                optional: true,
                isBoolean: true,
                toBoolean: true
            },
            scheduledAt: {
                optional: true,
                isISO8601: { errorMessage: 'scheduledAt must be a valid ISO date' },
                toDate: true
            }
        },
        ['body']
    )
)

export const updateLessonValidation = validate(
    checkSchema(
        {
            title: {
                optional: true,
                trim: true,
                isLength: { options: { max: 255 }, errorMessage: 'title must not exceed 255 characters' }
            },
            description: { optional: true, trim: true },
            lessonType: {
                optional: true,
                isIn: {
                    options: [Object.values(ClassroomLessonType)],
                    errorMessage: `lessonType must be one of: ${Object.values(ClassroomLessonType).join(', ')}`
                }
            },
            studySetId: {
                optional: true,
                isInt: { options: { min: 1 }, errorMessage: 'studySetId must be a positive integer' },
                toInt: true
            },
            content: { optional: true, trim: true },
            sortOrder: {
                optional: true,
                isInt: { options: { min: 0 }, errorMessage: 'sortOrder must be a non-negative integer' },
                toInt: true
            },
            isPublished: { optional: true, isBoolean: true, toBoolean: true },
            scheduledAt: {
                optional: true,
                isISO8601: { errorMessage: 'scheduledAt must be a valid ISO date' },
                toDate: true
            }
        },
        ['body']
    )
)
