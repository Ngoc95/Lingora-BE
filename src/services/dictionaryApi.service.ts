import axios, { AxiosInstance } from "axios"
import { env } from "~/config/env"
import { CefrLevel } from "~/enums/cefrLevel.enum"
import { WordType } from "~/enums/wordType.enum"
import { DICTIONARY_DEFAULT_CEFR_LEVEL } from "~/constants/dictionary"
import { DictionaryLookupRes } from "~/dtos/res/dictionaryLookup.res.dto"

class DictionaryApiService {
    private http: AxiosInstance
    private readonly defaultCefrLevel: CefrLevel

    constructor() {
        this.http = axios.create({
            baseURL: env.DICTIONARY_API_BASE_URL,
            timeout: env.DICTIONARY_TIMEOUT_MS
        })

        const configLevel = DICTIONARY_DEFAULT_CEFR_LEVEL as CefrLevel
        this.defaultCefrLevel = Object.values(CefrLevel).includes(configLevel) ? configLevel : CefrLevel.A1
    }

    lookupWord = async (term: string): Promise<DictionaryLookupRes> => {
        try {
            const response = await this.http.get(`/${env.DICTIONARY_API_LANGUAGE}/${encodeURIComponent(term)}`)
            return this.mapDictionaryResponse(response.data, term)
        } catch (error: any) {
            // Map 404 từ provider → message rõ ràng
            const status = error?.response?.status
            if (status === 404) {
                throw new Error(`Word "${term}" not found in external dictionary`)
            }

            // Các lỗi khác: timeout, network...
            const msg =
                error?.message ||
                'External dictionary provider error'
            throw new Error(msg)
        }
    }

    private mapDictionaryResponse = (rawData: any, fallbackWord: string): DictionaryLookupRes => {
        if (!Array.isArray(rawData) || rawData.length === 0) {
            throw new Error('Dictionary provider returned empty result')
        }

        const firstEntry = rawData[0]
        const meaningEntry = firstEntry?.meanings?.[0]
        const definitionEntry = meaningEntry?.definitions?.[0]

        if (!definitionEntry?.definition) {
            throw new Error('Dictionary provider missing definition field')
        }

        const phonetic = firstEntry?.phonetic
            || firstEntry?.phonetics?.find((item: any) => item?.text)?.text

        const audioUrl = firstEntry?.phonetics?.find((item: any) => item?.audio)?.audio

        return {
            word: firstEntry?.word || fallbackWord,
            phonetic: phonetic || undefined,
            meaning: definitionEntry.definition,
            example: definitionEntry.example || undefined,
            exampleTranslation: undefined,
            vnMeaning: undefined,
            audioUrl: audioUrl || undefined,
            imageUrl: undefined,
            type: this.resolveWordType(meaningEntry?.partOfSpeech),
            cefrLevel: this.defaultCefrLevel
        }
    }

    private resolveWordType = (partOfSpeech?: string): WordType => {
        const normalized = partOfSpeech?.toLowerCase()
        switch (normalized) {
            case 'noun':
                return WordType.NOUN
            case 'verb':
                return WordType.VERB
            case 'adjective':
                return WordType.ADJECTIVE
            case 'adverb':
                return WordType.ADVERB
            case 'preposition':
                return WordType.PREPOSITION
            case 'conjunction':
                return WordType.CONJUNCTION
            case 'interjection':
                return WordType.INTERJECTION
            case 'pronoun':
                return WordType.PRONOUN
            case 'determiner':
                return WordType.DETERMINER
            case 'article':
                return WordType.ARTICLE
            case 'numeral':
                return WordType.NUMERAL
            case 'phrase':
                return WordType.PHRASE
            default:
                return WordType.UNKNOWN
        }
    }
}

export const dictionaryApiService = new DictionaryApiService()
