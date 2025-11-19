import { checkSchema } from "express-validator"
import { validate } from "../validation.middlewares"
import { isRequired } from "../common.middlewares"

export const createCommentValidation = validate(
    checkSchema(
        {
            content: {
                trim: true,
                ...isRequired('content'),
                isLength: {
                    options: { min: 1, max: 256 },
                    errorMessage: 'Content length must be between 1 and 256 characters'
                }
            },
            parentId: {
                optional: true,
                custom: {
                    options: (value) => {
                        if (value !== null && value !== undefined) {
                            if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
                                throw new Error('parentId must be a positive integer or null')
                            }
                        }
                        return true
                    }
                }
            }
        },
        ['body']
    )
)



