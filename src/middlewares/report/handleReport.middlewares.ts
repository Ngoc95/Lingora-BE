import { checkSchema } from "express-validator"
import { validate } from "../validation.middlewares"
import { isRequired, isEnum } from "../common.middlewares"
import { ReportStatus } from "~/enums/reportStatus.enum"
import { ReportActionType } from "~/enums/reportActionType.enum"

export const handleReportValidation = validate(
    checkSchema(
        {
            status: {
                ...isRequired('status'),
                ...isEnum(ReportStatus, 'status'),
                custom: {
                    options: (value) => {
                        if (value === ReportStatus.PENDING) {
                            throw new Error('Cannot change status back to PENDING')
                        }
                        return true
                    }
                }
            },
            'actions': {
                optional: true,
                isArray: {
                    errorMessage: 'Actions must be an array'
                }
            },
            'actions.*.type': {
                ...isEnum(ReportActionType, 'action.type')
            },
            'actions.*.reason': {
                optional: true,
                isString: true,
                isLength: {
                    options: { max: 500 },
                    errorMessage: 'Action reason must not exceed 500 characters'
                }
            },
            'actions.*.duration': {
                optional: true,
                isInt: {
                    options: { min: 1, max: 365 },
                    errorMessage: 'Suspension duration must be between 1 and 365 days'
                }
            }
        },
        ['body']
    )
)
