import { checkSchema } from "express-validator"
import { validate } from "../validation.middlewares"
import { isRequired, isEnum } from "../common.middlewares"
import { TargetType } from "../../enums/targetType.enum"
import { ReportType } from "../../enums/reportType.enum"

export const createReportValidation = validate(
    checkSchema(
        {
            targetType: {
                ...isRequired('targetType'),
                ...isEnum(TargetType, 'targetType')
            },
            targetId: {
                ...isRequired('targetId'),
                isInt: {
                    options: { min: 1 },
                    errorMessage: 'Target ID must be a positive integer'
                },
                toInt: true
            },
            reportType: {
                ...isRequired('reportType'),
                ...isEnum(ReportType, 'reportType')
            },
            reason: {
                trim: true,
                optional: {
                    options: { nullable: true, checkFalsy: true }
                },
                isLength: {
                    options: { max: 500 },
                    errorMessage: 'Reason must not exceed 500 characters'
                }
            }
        },
        ['body']
    )
)
