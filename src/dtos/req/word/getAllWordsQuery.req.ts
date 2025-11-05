import { FindOptionsOrder } from "typeorm"
import { Word } from "~/entities/word.entity"
import { CefrLevel } from "~/enums/cefrLevel.enum"
import { WordType } from "~/enums/wordType.enum"

export interface GetAllWordsQueryReq {
    page?: number
    limit?: number
    search?: string
    //filter
    cefrLevel?: CefrLevel
    type?: WordType
    hasTopic?: boolean
    // sort
    sort?: FindOptionsOrder<Word>
}