import { checkSchema } from "express-validator"
import { validate } from "../validation.middlewares"

export const updateCategoryValidation = validate(
    checkSchema(
        {
            name: {
                trim: true,
                isLength: {
                    options: { max: 55 },
                    errorMessage: 'Description must not exceed 55 characters.'
                },
                matches: {
                    options: /^[a-zA-Z0-9]+$/,
                    errorMessage: 'Only letters and numbers are allowed'
                }
            },
            description: {
                trim: true,
                isLength: {
                    options: { max: 255 },
                    errorMessage: 'Description must not exceed 255 characters.'
                }
            }

        },
        ['body']
    )
)