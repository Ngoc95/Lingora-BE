import { ClassroomStatus } from '~/enums/classroomStatus.enum'

export interface UpdateClassroomBodyReq {
    name?: string
    description?: string
    coverImageUrl?: string
    maxStudents?: number
    status?: ClassroomStatus
    isPublic?: boolean
    settings?: Record<string, any>
}
