import { checkSchema } from "express-validator"
import { validate } from "../validation.middlewares"
import { isRequired } from "../common.middlewares"

export const createClassroomValidation = validate(
    checkSchema(
        {
            name: {
                trim: true,
                ...isRequired('name'),
                isLength: {
                    options: { max: 255 },
                    errorMessage: 'Name must not exceed 255 characters.'
                }
            },
            description: {
                optional: true,
                trim: true
            },
            maxStudents: {
                optional: true,
                isInt: {
                    options: { min: 1 },
                    errorMessage: 'maxStudents must be an integer greater than 0'
                },
                toInt: true
            },
            isPublic: {
                optional: true,
                isBoolean: true,
                toBoolean: true
            }
        },
        ['body']
    )
)
