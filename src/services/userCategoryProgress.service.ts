import { DatabaseService } from "./database.service"
import { UserCategoryProgress } from "~/entities/userCategoryProgress.entity"
import { Category } from "~/entities/category.entity"
import { BadRequestError } from "~/core/error.response"
import { FindOptionsWhere, ILike, In } from "typeorm"
import { UserWordProgress } from "~/entities/userWordProgress.entity"
import { Topic } from "~/entities/topic.entity"
import { getCefrByLevel } from "~/utils/mappers/cefrLevel.mapper"
import { User } from "~/entities/user.entity"
import { GetAllCategoriesQueryReq } from "~/dtos/req/category/getAllCategoriesQuery.req"
import validator from "validator"
import { GetCategoryQueryReq } from "~/dtos/req/category/getCategoryQuery.req"

class CategoryProgressService {
    private db = DatabaseService.getInstance()

    async getAllCategoriesForUser(user: User, { page = 1, limit = 20, search }: GetAllCategoriesQueryReq) {
        const ds = this.db.dataSource
        const categoryRepo = ds.getRepository(Category)
        const wordProgressRepo = ds.getRepository(UserWordProgress)

        const cefrLevels = getCefrByLevel(user.proficiency)

        let where: any = {}

        // Search
        if (search) {
            const normalizedSearch = validator.trim(search).toLowerCase()
            where = [
                { name: ILike(`%${normalizedSearch}%`) },
                { description: ILike(`%${normalizedSearch}%`) },
            ]
        }

        // Lấy danh sách categories 
        const [categories, total] = await categoryRepo.findAndCount({
            where,
            relations: ["topics", "topics.words"], // cần words để tính progressPercent
            take: limit,
            skip: (page - 1) * limit,
            order: { id: "ASC" },
        })

        // Gom toàn bộ wordId theo CEFR phù hợp với proficiency của user
        const allWordIds = categories.flatMap(c =>
            c.topics?.flatMap(t =>
                t.words?.filter(w => cefrLevels.includes(w.cefrLevel)).map(w => w.id) || []
            ) || []
        )

        // Lấy tiến trình học từ của user
        const allWordProgresses = allWordIds.length
            ? await wordProgressRepo.find({
                where: {
                    user: { id: user.id },
                    word: { id: In(allWordIds) },
                },
                relations: ["word"],
            })
            : []

        const learnedWordSet = new Set(allWordProgresses.map(p => p.word.id))

        // Tính tiến trình từng category
        const categoryProgresses = categories.map(category => {
            const topics = category.topics || []

            // --- Tính tiến trình từng topic ---
            const topicDetails = topics.map(topic => {
                // Lọc các từ của topic theo CEFR phù hợp
                const topicWords = topic.words?.filter(w => cefrLevels.includes(w.cefrLevel)) || []
                const totalWords = topicWords.length
                const learnedWords = topicWords.filter(w => learnedWordSet.has(w.id)).length

                const progressPercent = totalWords > 0 ? Number(((learnedWords / totalWords) * 100).toFixed(2)) : 0
                const completed = progressPercent >= 100

                return { id: topic.id, totalWords, learnedWords, completed }
            })

            // --- Tổng hợp cho category ---
            const totalTopics = topicDetails.length
            const completedTopics = topicDetails.filter(t => t.completed).length
            const totalWords = topicDetails.reduce((sum, t) => sum + t.totalWords, 0)
            const learnedWords = topicDetails.reduce((sum, t) => sum + t.learnedWords, 0)

            const progressPercent = totalWords > 0 ? Number(((learnedWords / totalWords) * 100).toFixed(2)) : 0

            return {
                id: category.id,
                name: category.name,
                description: category.description,
                totalTopics,
                completedTopics,
                progressPercent,
                completed: progressPercent >= 100,
            }
        })

        // Trả về dữ liệu có phân trang
        return {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total,
            categories: categoryProgresses,
        }
    }

    async getCategoryProgressById(
        user: User,
        categoryId: number,
        { page = 1, limit = 20, search, sort }: GetCategoryQueryReq
    ) {
        const ds = this.db.dataSource
        const topicRepo = ds.getRepository(Topic)
        const progressRepo = ds.getRepository(UserWordProgress)

        const cefrLevels = getCefrByLevel(user.proficiency)
        const skip = (page - 1) * limit

        // === Kiểm tra category tồn tại ===
        const category = await ds.getRepository(Category).findOne({ where: { id: categoryId } })
        if (!category) throw new BadRequestError({ message: 'Category not found' })

        // === Điều kiện where cho topic ===
        let where: FindOptionsWhere<Topic>[] | FindOptionsWhere<Topic> = [
            { category: { id: categoryId } },
        ]

        if (search) {
            const normalized = validator.trim(search).toLowerCase()
            where = [
                { category: { id: categoryId }, name: ILike(`%${normalized}%`) },
                { category: { id: categoryId }, description: ILike(`%${normalized}%`) },
            ]
        }

        // === Sort mặc định ===
        if (!sort) sort = { id: 'ASC' as const }

        // === Lấy danh sách topic có phân trang ===
        const [topics, totalTopics] = await topicRepo.findAndCount({
            skip,
            take: limit,
            where,
            order: sort,
            relations: ['words'],
        })

        if (!topics.length) {
            return {
                categoryId,
                totalTopics,
                currentPage: page,
                totalPages: Math.ceil(totalTopics / limit),
                progressPercent: 0,
                completed: false,
                topics: [],
            }
        }

        // === Lấy wordId trong category theo CEFR ===
        const allWordIds = topics.flatMap(t =>
            t.words?.filter(w => cefrLevels.includes(w.cefrLevel)).map(w => w.id) || []
        )

        const wordProgresses = allWordIds.length
            ? await progressRepo.find({
                where: { user: { id: user.id }, word: { id: In(allWordIds) } },
                select: { word: { id: true } },
                relations: ['word'],
            })
            : []

        const learnedWordSet = new Set(wordProgresses.map(p => p.word.id))

        // === Tính tiến trình từng topic ===
        const topicDetails = topics.map(t => {
            const topicWords = t.words?.filter(w => cefrLevels.includes(w.cefrLevel)) || []
            const totalWords = topicWords.length
            const learnedWords = topicWords.filter(w => learnedWordSet.has(w.id)).length
            const completed = totalWords > 0 && learnedWords === totalWords

            return {
                id: t.id,
                name: t.name,
                description: t.description,
                totalWords,
                learnedWords,
                completed,
            }
        })

        // === Tính tiến trình tổng category ===
        const totalWords = topicDetails.reduce((sum, t) => sum + t.totalWords, 0)
        const learnedWords = topicDetails.reduce((sum, t) => sum + t.learnedWords, 0)
        const percent = totalWords > 0 ? Number(((learnedWords / totalWords) * 100).toFixed(2)) : 0
        const completedTopics = topicDetails.filter(t => t.completed).length

        return {
            categoryId,
            name: category.name,
            description: category.description,
            totalTopics,
            completedTopics,
            progressPercent: percent,
            completed: percent >= 100,
            currentPage: page,
            totalPages: Math.ceil(totalTopics / limit),
            topics: topicDetails,
        }
    }

    async createAndUpdateCategoryProgress(user: User, categoryId: number) {
        const categoryRepo = await this.db.getRepository(Category)
        const progressRepo = await this.db.getRepository(UserWordProgress)
        const categoryProgressRepo = await this.db.getRepository(UserCategoryProgress)

        const cefrLevels = getCefrByLevel(user.proficiency)

        const category = await categoryRepo.findOne({
            where: { id: categoryId },
            relations: ['topics', 'topics.words']
        })
        if (!category) throw new BadRequestError({ message: 'Category not found' })

        const allWordsInLevel = category.topics?.flatMap(t =>
            t.words?.filter(w => cefrLevels.includes(w.cefrLevel))
        ) ?? []

        const totalWords = allWordsInLevel.length
        if (totalWords === 0) throw new BadRequestError({ message: 'No words in category for this level' })

        const wordIds = allWordsInLevel.map(w => w?.id)
        const userProgresses = await progressRepo.find({
            where: { user: { id: user.id }, word: { id: In(wordIds) } }
        })

        const learnedCount = userProgresses.length
        const percent = totalWords > 0 ? Number(((learnedCount / totalWords) * 100).toFixed(2)) : 0

        // Thêm điều kiện proficiency
        let categoryProgress = await categoryProgressRepo.findOne({
            where: {
                user: { id: user.id },
                category: { id: categoryId },
                proficiency: user.proficiency
            }
        })

        if (!categoryProgress) {
            categoryProgress = categoryProgressRepo.create({
                user: { id: user.id } as any,
                category: { id: categoryId } as any,
                proficiency: user.proficiency,
                completed: percent >= 100,
                progressPercent: percent
            })
        } else {
            categoryProgress.progressPercent = percent
            categoryProgress.completed = percent >= 100
        }

        await categoryProgressRepo.save(categoryProgress)
        return categoryProgress
    }
}

export const categoryProgressService = new CategoryProgressService()