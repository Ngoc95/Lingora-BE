import { checkSchema } from 'express-validator'
import { validate } from '../validation.middlewares'

export const approveStudySetValidation = validate(
    checkSchema(
        {},
        ['body']
    )
)

