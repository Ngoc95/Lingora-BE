import { StudySetStatus } from '../../../enums/studySetStatus.enum'
import { StudySetVisibility } from '../../../enums/studySetVisibility.enum'

export interface GetStudySetsQueryReq {
    page?: number
    limit?: number
    search?: string
    visibility?: StudySetVisibility
    status?: StudySetStatus
    minPrice?: number
    maxPrice?: number
    sort?: Record<string, 'ASC' | 'DESC'>
}

