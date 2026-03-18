import { Classroom } from "~/entities/classroom.entity"
import { FindOptionsOrder } from "typeorm"

export interface GetAllClassroomsQueryReq {
    page?: number
    limit?: number
    search?: string
    isPublic?: boolean
    sort?: FindOptionsOrder<Classroom>
}
