import { DatabaseService } from "./database.service"
import { BadRequestError } from "~/core/error.response"
import validator from "validator"
import { CreateTopicBodyReq } from "~/dtos/req/topic/createTopicBody.req"
import { Category } from "~/entities/category.entity"
import { Topic } from "~/entities/topic.entity"
import { UpdateTopicBodyReq } from "~/dtos/req/topic/updateTopicBody.req"
import { GetAllTopicsQueryReq } from "~/dtos/req/topic/getAllTopicsQuery.req"
import { GetTopicQueryReq } from "~/dtos/req/topic/getTopicQuery.req"
import { Word } from "~/entities/word.entity"
import { FindOptionsWhere, Like } from "typeorm"

class TopicService {
    private db = DatabaseService.getInstance()

    createTopic = async ({ name, description, categoryId }: CreateTopicBodyReq) => {
        const topicRepo = await this.db.getRepository(Topic)
        const categoryRepo = await this.db.getRepository(Category)

        let existingCategory = null
        if (categoryId) {
            existingCategory = await categoryRepo.findOne({ where: { id: categoryId } })
            if (!existingCategory) throw new BadRequestError({ message: 'Not found category' })
        }

        const topic = topicRepo.create({ name, description, category: existingCategory })
        await topicRepo.save(topic)

        return topic
    }

    getAllTopics = async ({ page = 1, limit = 20, search, sort }: GetAllTopicsQueryReq) => {
        const topicRepo = await this.db.getRepository(Topic)
        const skip = (page - 1) * limit

        // === Xây where điều kiện tìm kiếm ===
        const qb = topicRepo
            .createQueryBuilder('topic')
            .leftJoin('topic.words', 'word')
            .loadRelationCountAndMap('topic.totalWords', 'topic.words') // Đếm số word
            .skip(skip)
            .take(limit)
            .select([
                'topic.id',
                'topic.name',
                'topic.description',
            ])

        // ==== Search ====
        if (search) {
            const normalized = validator.trim(search).toLowerCase()
            qb.where('LOWER(topic.name) LIKE :search OR LOWER(topic.description) LIKE :search', {
                search: `%${normalized}%`,
            })
        }

        // ==== Sort ====
        if (sort && Object.keys(sort).length > 0) {
            for (const [field, direction] of Object.entries(sort)) { // nếu có sort thì sort lần lượt theo field
                qb.addOrderBy(`topic.${field}`, direction)
            }
        } else {
            qb.orderBy('topic.id', 'ASC') // mặc định
        }

        // === Truy vấn ===
        const [topics, total] = await qb.getManyAndCount()

        // === Trả kết quả ===
        return {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total,
            topics,
        }
    }

    getTopicById = async (
        id: number,
        { page = 1, limit = 20, search, cefrLevel, type, sort }: GetTopicQueryReq
    ) => {
        const skip = (page - 1) * limit

        const topicRepo = await this.db.getRepository(Topic)
        const wordRepo = await this.db.getRepository(Word)

        // === Kiểm tra topic có tồn tại không ===
        const topic = await topicRepo.findOne({
            where: { id },
            relations: ['category'],
            select: {
                id: true,
                name: true,
                description: true,
            },
        })
        if (!topic) throw new BadRequestError({ message: 'Topic not found' })

        // === Tạo điều kiện where ===
        let where: FindOptionsWhere<Word>[] | FindOptionsWhere<Word> = [
            {
                topic: { id }, // chỉ lấy word thuộc topic này
            },
        ]

        // Nếu có search
        if (search) {
            const normalized = validator.trim(search).toLowerCase()
            where = [
                { topic: { id }, word: Like(`%${normalized}%`) },
                { topic: { id }, meaning: Like(`%${normalized}%`) },
            ]
        }

        // Filter khác (cefrLevel, wordType)
        const applyFilters = (cond: FindOptionsWhere<Word>) => {
            if (cefrLevel) cond.cefrLevel = cefrLevel
            if (type) cond.type = type
            return cond
        }

        let finalWhere: FindOptionsWhere<Word>[] | FindOptionsWhere<Word>
        if (Array.isArray(where) && where.length > 0) {
            finalWhere = where.map(applyFilters)
        } else {
            finalWhere = applyFilters({ topic: { id } })
        }

        // Sort mặc định
        if (!sort) sort = { id: 'ASC' as const }

        // === Query từ vựng ===
        const [words, totalWords] = await wordRepo.findAndCount({
            skip,
            take: limit,
            where: finalWhere,
            order: sort,
        })

        // === Trả kết quả ===
        return {
            id: topic.id,
            name: topic.name,
            description: topic.description,
            categoryId: topic.category ? topic.category.id : null,
            totalWords,
            currentPage: page,
            totalPages: Math.ceil(totalWords / limit),
            words,
        }
    }

    updateTopicById = async (
        id: number,
        { name, description, categoryId }: UpdateTopicBodyReq
    ) => {
        const topicRepo = await this.db.getRepository(Topic)
        const categoryRepo = await this.db.getRepository(Category)

        // === Tìm topic kèm category ===
        const topic = await topicRepo.findOne({
            where: { id },
            relations: ['category'],
        })
        if (!topic) throw new BadRequestError({ message: 'Topic not found' })

        // === Cập nhật các field cơ bản ===
        if (name) topic.name = name
        if (description) topic.description = description

        // === Cập nhật category nếu có gửi categoryId ===
        if (categoryId !== undefined) {
            if (categoryId === null) {
                // Gỡ khỏi category
                topic.category = null
            } else {
                // Gán vào category mới
                const category = await categoryRepo.findOne({ where: { id: categoryId } })
                if (!category) throw new BadRequestError({ message: 'Category not found' })
                topic.category = category
            }
        }

        await topicRepo.save(topic)

        return topic
    }


    deleteTopicById = async (id: number) => {
        const topicRepo = await this.db.getRepository(Topic)
        const result = await topicRepo.delete(id)

        if (result.affected === 0) {
            throw new BadRequestError({ message: 'Topic not found' })
        }

        return result
    }
}
export const topicService = new TopicService()