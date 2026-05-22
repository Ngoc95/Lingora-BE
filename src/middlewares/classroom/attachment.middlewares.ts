import { checkSchema } from 'express-validator'
import { validate } from '../validation.middlewares'
import { isRequired } from '../common.middlewares'
import { LessonAttachmentType } from '~/enums/lessonAttachmentType.enum'
import { LessonAttachmentRole } from '~/enums/lessonAttachmentRole.enum'

const FILE_SIZE_LIMITS: Record<LessonAttachmentType, number> = {
    [LessonAttachmentType.VIDEO]:    500 * 1024 * 1024, // 500 MB
    [LessonAttachmentType.AUDIO]:     50 * 1024 * 1024, //  50 MB
    [LessonAttachmentType.PDF]:       20 * 1024 * 1024, //  20 MB
    [LessonAttachmentType.DOCUMENT]:  20 * 1024 * 1024, //  20 MB
    [LessonAttachmentType.IMAGE]:      5 * 1024 * 1024, //   5 MB
    [LessonAttachmentType.OTHER]:     20 * 1024 * 1024, //  20 MB
}

export const addAttachmentValidation = validate(
    checkSchema(
        {
            role: {
                ...isRequired('role'),
                isIn: {
                    options: [Object.values(LessonAttachmentRole)],
                    errorMessage: `role must be one of: ${Object.values(LessonAttachmentRole).join(', ')}`
                }
            },
            fileUrl: {
                trim: true,
                ...isRequired('fileUrl'),
                isURL: { errorMessage: 'fileUrl must be a valid URL' }
            },
            fileType: {
                ...isRequired('fileType'),
                isIn: {
                    options: [Object.values(LessonAttachmentType)],
                    errorMessage: `fileType must be one of: ${Object.values(LessonAttachmentType).join(', ')}`
                }
            },
            fileName: {
                trim: true,
                ...isRequired('fileName'),
                isLength: {
                    options: { max: 255 },
                    errorMessage: 'fileName must not exceed 255 characters'
                }
            },
            mimeType: {
                optional: true,
                trim: true,
                isLength: {
                    options: { max: 100 },
                    errorMessage: 'mimeType must not exceed 100 characters'
                }
            },
            fileSizeBytes: {
                optional: true,
                isInt: { options: { min: 1 }, errorMessage: 'fileSizeBytes must be a positive integer' },
                toInt: true,
                custom: {
                    options: (value, { req }) => {
                        if (value === undefined || value === null) return true
                        const fileType: LessonAttachmentType = req.body.fileType
                        const limit = FILE_SIZE_LIMITS[fileType]
                        if (limit && value > limit) {
                            const limitMB = Math.round(limit / 1024 / 1024)
                            throw new Error(`File size exceeds limit of ${limitMB}MB for type ${fileType}`)
                        }
                        return true
                    }
                }
            },
            durationSeconds: {
                optional: true,
                isInt: { options: { min: 1 }, errorMessage: 'durationSeconds must be a positive integer' },
                toInt: true
            },
            title: {
                optional: true,
                trim: true,
                isLength: {
                    options: { max: 255 },
                    errorMessage: 'title must not exceed 255 characters'
                }
            },
            sortOrder: {
                optional: true,
                isInt: { options: { min: 0 }, errorMessage: 'sortOrder must be a non-negative integer' },
                toInt: true
            }
        },
        ['body']
    )
)

export const updateAttachmentValidation = validate(
    checkSchema(
        {
            role: {
                optional: true,
                isIn: {
                    options: [Object.values(LessonAttachmentRole)],
                    errorMessage: `role must be one of: ${Object.values(LessonAttachmentRole).join(', ')}`
                }
            },
            fileUrl: {
                optional: true,
                trim: true,
                isURL: { errorMessage: 'fileUrl must be a valid URL' }
            },
            fileType: {
                optional: true,
                isIn: {
                    options: [Object.values(LessonAttachmentType)],
                    errorMessage: `fileType must be one of: ${Object.values(LessonAttachmentType).join(', ')}`
                }
            },
            fileName: {
                optional: true,
                trim: true,
                isLength: {
                    options: { max: 255 },
                    errorMessage: 'fileName must not exceed 255 characters'
                }
            },
            mimeType: {
                optional: true,
                trim: true,
                isLength: {
                    options: { max: 100 },
                    errorMessage: 'mimeType must not exceed 100 characters'
                }
            },
            fileSizeBytes: {
                optional: true,
                isInt: { options: { min: 1 }, errorMessage: 'fileSizeBytes must be a positive integer' },
                toInt: true
            },
            durationSeconds: {
                optional: true,
                isInt: { options: { min: 1 }, errorMessage: 'durationSeconds must be a positive integer' },
                toInt: true
            },
            title: {
                optional: true,
                trim: true,
                isLength: {
                    options: { max: 255 },
                    errorMessage: 'title must not exceed 255 characters'
                }
            },
            sortOrder: {
                optional: true,
                isInt: { options: { min: 0 }, errorMessage: 'sortOrder must be a non-negative integer' },
                toInt: true
            }
        },
        ['body']
    )
)
