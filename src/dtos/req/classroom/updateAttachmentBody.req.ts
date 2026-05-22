import { LessonAttachmentType } from '~/enums/lessonAttachmentType.enum'
import { LessonAttachmentRole } from '~/enums/lessonAttachmentRole.enum'

export interface UpdateAttachmentBodyReq {
    role?: LessonAttachmentRole
    fileUrl?: string
    fileType?: LessonAttachmentType
    fileName?: string
    mimeType?: string
    fileSizeBytes?: number
    durationSeconds?: number
    title?: string
    sortOrder?: number
}
