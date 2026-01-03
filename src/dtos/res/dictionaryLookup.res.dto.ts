import { CefrLevel } from '~/enums/cefrLevel.enum'
import { WordType } from '~/enums/wordType.enum'

export interface DictionaryLookupRes {
    word: string
    phonetic?: string
    meaning: string
    example?: string
    exampleTranslation?: string
    vnMeaning?: string
    audioUrl?: string
    imageUrl?: string
    type?: WordType
    cefrLevel?: CefrLevel
}
