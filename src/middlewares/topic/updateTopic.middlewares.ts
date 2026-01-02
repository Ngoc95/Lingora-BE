import { checkSchema } from "express-validator"
import { validate } from "../validation.middlewares"
import { BadRequestError } from "../../core/error.response"

export const updateTopicValidation = validate(
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
            },
            categoryId: {
                custom: {
                    options: (value) => {
                        if (value && !Number.isInteger(value)) {
                            throw new BadRequestError({ message: 'categoryId must contain only numbers' })
                        }
                        return true
                    },
                }
            }
        },
        ['body']
    )
)