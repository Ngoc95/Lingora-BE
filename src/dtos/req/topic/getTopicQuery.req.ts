import { FindOptionsOrder } from "typeorm"
import { Word } from "../../../entities/word.entity"
import { CefrLevel } from "../../../enums/cefrLevel.enum"
import { WordType } from "../../../enums/wordType.enum"

export interface GetTopicQueryReq {
    page?: number
    limit?: number
    //filter
    search?: string
    cefrLevel?: CefrLevel
    type?: WordType
    // sort
    sort?: FindOptionsOrder<Word>
}