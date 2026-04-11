import { ClassroomLessonType } from '~/enums/classroomLessonType.enum'

export interface UpdateLessonBodyReq {
    title?: string
    description?: string
    lessonType?: ClassroomLessonType
    content?: string
    sortOrder?: number
    isPublished?: boolean
    scheduledAt?: Date
}
