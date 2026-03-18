import { ClassroomLessonType } from '~/enums/classroomLessonType.enum'

export interface CreateLessonBodyReq {
    title: string
    description?: string
    lessonType?: ClassroomLessonType
    content?: string
    sortOrder?: number
    isPublished?: boolean
    scheduledAt?: Date
}
