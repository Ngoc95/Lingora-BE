import { checkSchema } from "express-validator"
import { validate } from "../validation.middlewares"
import { isRequired } from "../common.middlewares"
import { BadRequestError } from "../../core/error.response"
import { CefrLevel } from "../../enums/cefrLevel.enum"
import { WordType } from "../../enums/wordType.enum"

export const createWordValidation = validate(
    checkSchema(
        {
            word: {
                trim: true,
                ...isRequired('word'),
                matches: {
                    options: /^[a-zA-Z\s]+$/,
                    errorMessage: 'Only letters and spaces are allowed for word.'
                }
            },
            meaning: {
                trim: true,
                ...isRequired('meaning'),
            },
            vnMeaning: {
                trim: true,
            },
            phonetic: {
                trim: true,
                custom: {
                    options: (value) => {
                        if (value && /\d/.test(value)) {
                            throw new BadRequestError({ message: 'Phonetic must not contain numbers' })
                        }
                        return true
                    },
                }
            },
            cefrLevel: {
                ...isRequired('cefrLevel'),
                custom: {
                    options: (value) => {
                        const validLevels = Object.values(CefrLevel)
                        if (value && !validLevels.includes(value)) {
                            throw new BadRequestError({ message: `Invalid CEFR level. Must be one of: ${validLevels.join(', ')}` })
                        }
                        return true
                    },
                }
            },
            type: {
                trim: true,
                custom: {
                    options: (value) => {
                        const validLevels = Object.values(WordType)
                        if (value && !validLevels.includes(value)) {
                            throw new BadRequestError({ message: `Invalid type. Must be one of: ${validLevels.join(', ')}` })
                        }
                        return true
                    },
                }
            },
            imageUrl: {
                trim: true,
            },
            audioUrl: {
                trim: true,
            },
            topicId: {
                custom: {
                    options: (value) => {
                        if (value && !Number.isInteger(value)) {
                            throw new BadRequestError({ message: 'topicId must contain only numbers' })
                        }
                        return true
                    },
                }
            }
        },
        ['body']
    )
)