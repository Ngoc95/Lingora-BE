import { checkSchema } from 'express-validator'
import { validate } from '../validation.middlewares'
import { WithdrawalStatus } from '../../enums/withdrawalStatus.enum'
import { BadRequestError } from '../../core/error.response'

export const updateWithdrawalValidation = validate(
    checkSchema(
        {
            status: {
                optional: true,
                custom: {
                    options: (value: any) => {
                        if (value && !Object.values(WithdrawalStatus).includes(value)) {
                            throw new BadRequestError({
                                message: `Status must be one of: ${Object.values(WithdrawalStatus).join(', ')}`,
                            })
                        }
                        return true
                    },
                },
            },
            rejectionReason: {
                optional: true,
                trim: true,
                isLength: {
                    options: { max: 500 },
                    errorMessage: 'Rejection reason must not exceed 500 characters',
                },
            },
            transactionReference: {
                optional: true,
                trim: true,
                isLength: {
                    options: { max: 100 },
                    errorMessage: 'Transaction reference must not exceed 100 characters',
                },
            },
        },
        ['body']
    )
)

