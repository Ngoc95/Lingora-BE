import { checkSchema } from 'express-validator'
import { BadRequestError } from '../../core/error.response'
import { validate } from '../validation.middlewares'
import { DatabaseService } from '../../services/database.service'
import { Word } from '../../entities/word.entity'
import { isRequired } from '../common.middlewares'

export const createWordProgressValidation = validate(
    checkSchema({
        wordIds: {
            in: ['body'],
            ...isRequired('wordIds'),
            isArray: {
                errorMessage: 'wordIds must be an array of integers',
            },
            custom: {
                options: async (value) => {
                    if (!Array.isArray(value))
                        throw new BadRequestError({ message: 'wordIds must be an array' })

                    if (value.some((v) => typeof v !== 'number'))
                        throw new BadRequestError({ message: 'wordIds must be numbers' })

                    // Kiểm tra wordId có tồn tại trong DB hay ko
                    const db = DatabaseService.getInstance()
                    const wordRepo = await db.getRepository(Word)
                    const existingWords = await wordRepo.findByIds(value)

                    if (existingWords.length !== value.length) {
                        const missing = value.filter(
                            (id) => !existingWords.some((w) => w.id === id)
                        )
                        throw new BadRequestError({
                            message: `Invalid wordIds: ${missing.join(', ')}`,
                        })
                    }

                    return true
                },
            },
        },
    })
)
