import { checkSchema } from 'express-validator'
import { validate } from '../validation.middlewares'

export const buyStudySetValidation = validate(
    checkSchema(
        {
            bankCode: {
                optional: true,
                isString: {
                    errorMessage: 'Bank code must be a string',
                },
            },
            returnUrl: {
                optional: true,
                isURL: {
                    errorMessage: 'Return URL must be a valid URL',
                },
            },
            locale: {
                optional: true,
                isIn: {
                    options: [['vn', 'en']],
                    errorMessage: 'Locale must be either "vn" or "en"',
                },
            },
        },
        ['body']
    )
)

