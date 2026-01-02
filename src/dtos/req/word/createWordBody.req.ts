import { CefrLevel } from "../../../enums/cefrLevel.enum"
import { WordType } from "../../../enums/wordType.enum"

export interface CreateWordBodyReq {
    word: string
    meaning: string
    vnMeaning?: string
    phonetic?: string,
    cefrLevel?: CefrLevel
    type?: WordType
    example?: string
    exampleTranslation?: string
    audioUrl?: string
    imageUrl?: string
    topicId?: number
}