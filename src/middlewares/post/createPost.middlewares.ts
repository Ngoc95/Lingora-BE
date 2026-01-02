import { checkSchema } from "express-validator"
import { validate } from "../validation.middlewares"
import { isRequired, isEnum } from "../common.middlewares"
import { PostTopic } from "../../enums/postTopic.enum"

export const createPostValidation = validate(
    checkSchema(
        {
            title: {
                trim: true,
                ...isRequired('title'),
                isLength: {
                    options: { min: 1, max: 150 },
                    errorMessage: 'Title length must be between 1 and 150 characters'
                }
            },
            content: {
                trim: true,
                optional: true,
            },
            topic: {
                ...isRequired('topic'),
                ...isEnum(PostTopic, 'topic')
            },
            thumbnails: {
                optional: true,
                isArray: {
                    errorMessage: 'Thumbnails must be an array'
                },
                custom: {
                    options: (value) => {
                        if (value && !Array.isArray(value)) {
                            throw new Error('Thumbnails must be an array')
                        }
                        if (value && value.length > 0) {
                            value.forEach((item: any, index: number) => {
                                if (typeof item !== 'string') {
                                    throw new Error(`Thumbnail at index ${index} must be a string`)
                                }
                            })
                        }
                        return true
                    }
                }
            },
            tags: {
                optional: true,
                isArray: {
                    errorMessage: 'Tags must be an array'
                },
                custom: {
                    options: (value) => {
                        if (value && !Array.isArray(value)) {
                            throw new Error('Tags must be an array')
                        }
                        if (value && value.length > 0) {
                            value.forEach((item: any, index: number) => {
                                if (typeof item !== 'string') {
                                    throw new Error(`Tag at index ${index} must be a string`)
                                }
                            })
                        }
                        return true
                    }
                }
            }
        },
        ['body']
    )
)



