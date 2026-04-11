import { Classroom } from "~/entities/classroom.entity"
import { ClassroomStatus } from "~/enums/classroomStatus.enum"
import { FindOptionsOrder } from "typeorm"

export interface GetAllClassroomsQueryReq {
    page?: number
    limit?: number
    search?: string
    status?: ClassroomStatus
    isPublic?: boolean
    teacherId?: number
    membership?: 'ALL' | 'TEACHER' | 'STUDENT'
    sort?: FindOptionsOrder<Classroom>
}
