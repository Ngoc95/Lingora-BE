import { isEmail, isPassword, isRequired, isUsername } from "../common.middlewares"
import { BadRequestError } from "~/core/error.response"
import { ProficiencyLevel } from "~/enums/proficiency.enum"
import { checkSchema } from "express-validator"
import { validate } from "../validation.middlewares"
import { checkDuplicateUser, checkRolesExistence } from "~/utils/validators"

export const createUserValidation = validate(
    checkSchema(
        {
            username: {
                ...isRequired('username'),
                ...isUsername,
            },

            email: {
                ...isRequired('email'),
                ...isEmail,
                custom: {
                    options: async (value: string, { req }) => {
                        await checkDuplicateUser(value, req.body.username)
                        if (req.body.roleIds && Array.isArray(req.body.roleIds)) {
                            await checkRolesExistence(req.body.roleIds)
                        }
                        return true
                    }
                }
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