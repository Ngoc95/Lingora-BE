import { checkSchema } from "express-validator"
import { validate } from "../validation.middlewares"
import { isRequired, isEnum } from "../common.middlewares"
import { ReportStatus } from "~/enums/reportStatus.enum"

export const updateReportStatusValidation = validate(
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
            }
        },
        ['body']
    )
)
