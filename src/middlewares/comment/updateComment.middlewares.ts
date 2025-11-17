import { checkSchema } from "express-validator"
import { validate } from "../validation.middlewares"
import { isRequired } from "../common.middlewares"

export const updateCommentValidation = validate(
    checkSchema(
        {
            content: {
                trim: true,
                ...isRequired('content'),
                isLength: {
                    options: { min: 1, max: 256 },
                    errorMessage: 'Content length must be between 1 and 256 characters'
                }
            }
        },
        ['body']
    )
)



