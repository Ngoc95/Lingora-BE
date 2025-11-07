import { CreateWordBodyReq } from "~/dtos/req/word/createWordBody.req"
import { Word } from "~/entities/word.entity"
import { DatabaseService } from "./database.service"
import { Topic } from "~/entities/topic.entity"
import { BadRequestError } from "~/core/error.response"
import { GetAllWordsQueryReq } from "~/dtos/req/word/getAllWordsQuery.req"
import { FindOptionsWhere, IsNull, ILike, Not } from "typeorm"
import validator from "validator"
import { UpdateWordBodyReq } from "~/dtos/req/word/updateWordBody.req"

class WordService {
    private db = DatabaseService.getInstance()

    createWord = async ({ word, meaning, phonetic, cefrLevel, type, example, exampleTranslation, audioUrl, imageUrl, topicId }: CreateWordBodyReq) => {
        const wordRepo = await this.db.getRepository(Word)
        const topicRepo = await this.db.getRepository(Topic)

        let existingTopic = null
        if (topicId) {
            existingTopic = await topicRepo.findOne({ where: { id: topicId } })
            if (!existingTopic) throw new BadRequestError({ message: 'Not found topic' })
        }

        const newWord = wordRepo.create({ word, meaning, phonetic, cefrLevel, type, example, exampleTranslation, audioUrl, imageUrl, topic: existingTopic })
        await wordRepo.save(newWord)

        const { topic, ...rest } = newWord
        return {
            ...rest,
            topicId: topic ? topic.id : null,
        }
    }

    getAllWords = async ({ page = 1, limit = 20, search, cefrLevel, type, hasTopic, sort }: GetAllWordsQueryReq) => {
        const skip = (page - 1) * limit

        const wordRepo = await this.db.getRepository(Word)

        let where: FindOptionsWhere<Word>[] | FindOptionsWhere<Word> = []

        // === Search ===
        if (search) {
            const normalized = validator.trim(search).toLowerCase()
            where = [
                { word: ILike(`%${normalized}%`) },
                { meaning: ILike(`%${normalized}%`) },
                { example: ILike(`%${normalized}%`) },
            ]
        }

        // === Filter ===
        const applyFilters = (cond: FindOptionsWhere<Word>) => {
            if (cefrLevel) cond.cefrLevel = cefrLevel
            if (type) cond.type = type

            if (hasTopic === true) cond.topic = { id: Not(IsNull()) }
            else if (hasTopic === false) cond.topic = { id: IsNull() }

            return cond
        }

        const finalWhere = where.length > 0 ? where.map(applyFilters) : [applyFilters({})]

        // === Sort mặc định ===
        if (!sort)
            sort = { id: 'ASC' as const }

        // === Query ===
        const [words, total] = await wordRepo.findAndCount({
            skip,
            take: limit,
            where: finalWhere,
            order: sort,
            loadRelationIds: {
                relations: ['topic'],
                disableMixedMap: true,
            },
        })

        return {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total,
            words,
        }
    }

    getWordById = async (id: number) => {
        const word = await Word.findOne({
            where: {
                id
            },
            loadRelationIds: {
                relations: ['topic'],
                disableMixedMap: true,
            },
        })
        if (!word) throw new BadRequestError({ message: 'Word not found' })

        const { topic, ...rest } = word
        return {
            ...rest,
            topicId: topic ? topic.id : null,
        }
    }

    updateWordById = async (
        id: number,
        { word, meaning, phonetic, cefrLevel, type, example, exampleTranslation, audioUrl, imageUrl, topicId }: UpdateWordBodyReq
    ) => {
        const wordRepo = await this.db.getRepository(Word)
        const topicRepo = await this.db.getRepository(Topic)

        // Tìm word
        const updatedWord = await wordRepo.findOne({
            where: { id },
            relations: ['topic']
        })
        if (!updatedWord) throw new BadRequestError({ message: 'Word not found' })

        // Cập nhật thông tin cơ bản
        if (word) updatedWord.word = word
        if (meaning) updatedWord.meaning = meaning
        if (phonetic) updatedWord.phonetic = phonetic
        if (cefrLevel) updatedWord.cefrLevel = cefrLevel
        if (type) updatedWord.type = type
        if (example) updatedWord.example = example
        if (exampleTranslation) updatedWord.exampleTranslation = exampleTranslation
        if (audioUrl) updatedWord.audioUrl = audioUrl
        if (imageUrl) updatedWord.imageUrl = imageUrl

        // Nếu có cập nhật topic
        if (topicId) {
            const topic = await topicRepo.findOne({ where: { id: topicId } })
            if (!topic) throw new BadRequestError({ message: 'Topic not found' })
            updatedWord.topic = topic
        }
        else if (topicId === null) {
            // Nếu topicId là null thì bỏ liên kết với topic
            updatedWord.topic = null
        }

        // Lưu thay đổi
        await wordRepo.save(updatedWord)
        
        const { topic, ...rest } = updatedWord
        return {
            ...rest,
            topicId: topic ? topic.id : null,
        }
    }

    deleteWordById = async (id: number) => {
        const wordRepo = await this.db.getRepository(Word)
        const result = await wordRepo.delete(id)

        if (result.affected === 0) {
            throw new BadRequestError({ message: 'Word not found' })
        }

        return result
    }
}
export const wordService = new WordService()