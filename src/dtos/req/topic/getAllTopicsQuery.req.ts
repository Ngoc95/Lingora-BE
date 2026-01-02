import { Topic } from "../../../entities/topic.entity"
import { FindOptionsOrder } from "typeorm"

export interface GetAllTopicsQueryReq {
    page?: number
    limit?: number
    //filter
    search?: string
    hasCategory?: boolean
    // sort
    sort?: FindOptionsOrder<Topic>
}