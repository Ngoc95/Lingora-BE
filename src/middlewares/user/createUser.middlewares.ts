import { isEmail, isPassword, isRequired, isUsername } from "../common.middlewares"
import { BadRequestError } from "~/core/error.response"
import { ProficiencyLevel } from "~/enums/proficiency.enum"
import { checkSchema } from "express-validator"
import { validate } from "../validation.middlewares"

export const createUserValidation = validate(
    checkSchema(
        {
            username: {
                trim: true,
                ...isRequired('username'),
                ...isUsername,
            },

            email: {
                trim: true,
                ...isRequired('email'),
                ...isEmail,
            },

            password: {
                trim: true,
                ...isPassword,
            },

            roleIds: {
                ...isRequired('roleIds'),
                isArray: {
                    errorMessage: 'rolesId must be an array of numbers'
                },
                custom: {
                    options: (value) => {
                        if (!Array.isArray(value) || value.length === 0) {
                            throw new BadRequestError({ message: 'rolesId cannot be empty' })
                        }
                        if (!value.every((id) => Number.isInteger(id))) {
                            throw new BadRequestError({ message: 'rolesId must contain only numbers' })
                        }
                        return true
                    },
                }
            },

            proficiency: {
                ...isRequired('proficiency'),
                isIn: {
                    options: [Object.values(ProficiencyLevel)],
                    errorMessage: `Proficiency must be one of: ${Object.values(ProficiencyLevel).join(', ')}`
                }
            }
        },
        ['body']
    )
)