import { checkSchema } from 'express-validator'
import { validate } from '../validation.middlewares'
import { isRequired } from '../common.middlewares'

export const createFlashcardValidation = validate(
    checkSchema(
        {
            frontText: { trim: true, ...isRequired('frontText') },
            backText: { trim: true, ...isRequired('backText') },
            example: { optional: true, trim: true },
            audioUrl: { optional: true, isURL: { errorMessage: 'audioUrl must be a valid URL' } },
            imageUrl: { optional: true, isURL: { errorMessage: 'imageUrl must be a valid URL' } },
        },
        ['body']
    )
)

export const updateFlashcardValidation = validate(
    checkSchema(
        {
            frontText: { optional: true, trim: true },
            backText: { optional: true, trim: true },
            example: { optional: true, trim: true },
            audioUrl: { optional: { options: { nullable: true } }, isURL: { errorMessage: 'audioUrl must be a valid URL' } },
            imageUrl: { optional: { options: { nullable: true } }, isURL: { errorMessage: 'imageUrl must be a valid URL' } },
        },
        ['body']
    )
)
