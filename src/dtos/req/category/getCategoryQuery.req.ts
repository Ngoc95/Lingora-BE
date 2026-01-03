import { FindOptionsOrder } from "typeorm"
import { Topic } from "~/entities/topic.entity"

export interface GetCategoryQueryReq {
    page?: number
    limit?: number
    //filter
    search?: string
    // sort
    sort?: FindOptionsOrder<Topic>
}