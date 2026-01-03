import { checkSchema } from "express-validator"
import { validate } from "../validation.middlewares"
import { BadRequestError } from "~/core/error.response"
import { PostStatus } from "~/enums/postStatus.enum"
import { PostTopic } from "~/enums/postTopic.enum"
import { isEnum } from "../common.middlewares"

export const updatePostValidation = validate(
    checkSchema(
        {
            title: {
                optional: true,
                trim: true,
                isLength: {
                    options: { min: 1, max: 150 },
                    errorMessage: 'Title length must be between 1 and 150 characters'
                }
            },
            content: {
                optional: true,
                trim: true,
            },
            topic: {
                optional: true,
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
            },
            status: {
                optional: true,
                custom: {
                    options: (value) => {
                        const validStatuses = Object.values(PostStatus)
                        if (value && !validStatuses.includes(value)) {
                            throw new BadRequestError({ 
                                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
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



