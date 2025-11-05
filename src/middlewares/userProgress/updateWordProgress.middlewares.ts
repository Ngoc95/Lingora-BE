import { checkSchema } from 'express-validator'
import { BadRequestError } from '~/core/error.response'
import { validate } from '../validation.middlewares'
import { DatabaseService } from '~/services/database.service'
import { Word } from '~/entities/word.entity'

export const updateWordProgressValidation = validate(
    checkSchema({
        wordProgress: {
            in: ['body'],
            isArray: {
                errorMessage: 'wordProgress must be an array of objects',
            },
        },
        'wordProgress.*.wordId': {
            isInt: { errorMessage: 'Each wordProgress.wordId must be an integer' },
            toInt: true,
            custom: {
                options: async (value) => {
                    const db = DatabaseService.getInstance()
                    const wordRepo = await db.getRepository(Word)
                    const word = await wordRepo.findOneBy({ id: value })
                    if (!word)
                        throw new BadRequestError({ message: `Word not found: ${value}` })
                    return true
                },
            },
        },
        'wordProgress.*.wrongCount': {
            optional: true,
            isInt: { errorMessage: 'wrongCount must be an integer' },
            toInt: true,
        },
        'wordProgress.*.reviewedDate': {
            notEmpty: true,
            isISO8601: {
                errorMessage: 'reviewedDate must be a valid ISO date',
            },
            toDate: true,
        },
    })
)
