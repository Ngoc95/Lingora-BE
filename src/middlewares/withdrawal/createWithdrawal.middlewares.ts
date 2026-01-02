import { checkSchema } from 'express-validator'
import { validate } from '../validation.middlewares'
import { isRequired } from '../common.middlewares'
import { BadRequestError } from '../../core/error.response'

const MIN_WITHDRAWAL_AMOUNT = 50000 // 50,000 VND
const MAX_WITHDRAWAL_AMOUNT = 50000000 // 50,000,000 VND

export const createWithdrawalValidation = validate(
    checkSchema(
        {
            amount: {
                ...isRequired('amount'),
                custom: {
                    options: (value: any) => {
                        const numValue = Number(value)
                        if (isNaN(numValue) || numValue <= 0) {
                            throw new BadRequestError({ message: 'Amount must be a positive number' })
                        }
                        if (numValue < MIN_WITHDRAWAL_AMOUNT) {
                            throw new BadRequestError({ 
                                message: `Minimum withdrawal amount is ${MIN_WITHDRAWAL_AMOUNT.toLocaleString('vi-VN')}đ` 
                            })
                        }
                        if (numValue > MAX_WITHDRAWAL_AMOUNT) {
                            throw new BadRequestError({ 
                                message: `Maximum withdrawal amount is ${MAX_WITHDRAWAL_AMOUNT.toLocaleString('vi-VN')}đ` 
                            })
                        }
                        return true
                    },
                },
            },
            bankName: {
                ...isRequired('bankName'),
                trim: true,
                isLength: {
                    options: { min: 2, max: 100 },
                    errorMessage: 'Bank name must be between 2 and 100 characters',
                },
            },
            bankAccountNumber: {
                ...isRequired('bankAccountNumber'),
                trim: true,
                isLength: {
                    options: { min: 8, max: 20 },
                    errorMessage: 'Bank account number must be between 8 and 20 characters',
                },
                matches: {
                    options: /^[0-9]+$/,
                    errorMessage: 'Bank account number must contain only numbers',
                },
            },
            bankAccountName: {
                ...isRequired('bankAccountName'),
                trim: true,
                isLength: {
                    options: { min: 2, max: 100 },
                    errorMessage: 'Bank account name must be between 2 and 100 characters',
                },
            },
            bankBranch: {
                optional: true,
                trim: true,
                isLength: {
                    options: { max: 200 },
                    errorMessage: 'Bank branch must not exceed 200 characters',
                },
            },
        },
        ['body']
    )
)

