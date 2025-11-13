import { checkSchema } from 'express-validator'
import { validate } from '../validation.middlewares'
import { StudySetStatus } from '~/enums/studySetStatus.enum'
import { BadRequestError } from '~/core/error.response'

export const updateStudySetStatusValidation = validate(
    checkSchema(
        {
            status: {
                notEmpty: {
                    errorMessage: 'Status is required',
                },
                custom: {
                    options: (value) => {
                        if (!Object.values(StudySetStatus).includes(value)) {
                            throw new BadRequestError({
                                message: `Status must be one of: ${Object.values(StudySetStatus).join(', ')}`,
                            })
                        }
                        return true
                    },
                },
            },
        },
        ['body']
    )
)

