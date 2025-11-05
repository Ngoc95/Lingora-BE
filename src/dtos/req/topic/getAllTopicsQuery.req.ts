import { Topic } from "~/entities/topic.entity"
import { FindOptionsOrder } from "typeorm"

export interface GetAllTopicsQueryReq {
    page?: number
    limit?: number
    //filter
    search?: string
    // sort
    sort?: FindOptionsOrder<Topic>
}