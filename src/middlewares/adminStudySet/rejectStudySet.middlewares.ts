import { checkSchema } from 'express-validator'
import { validate } from '../validation.middlewares'

export const rejectStudySetValidation = validate(
    checkSchema(
        {
            reason: {
                optional: true,
                isString: {
                    errorMessage: 'Reason must be a string',
                },
                isLength: {
                    options: { max: 500 },
                    errorMessage: 'Reason must not exceed 500 characters',
                },
            },
        },
        ['body']
    )
)

