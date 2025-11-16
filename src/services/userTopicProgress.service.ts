import { Word } from "~/entities/word.entity"
import { DatabaseService } from "./database.service"
import { UserWordProgress } from "~/entities/userWordProgress.entity"
import { getCefrByLevel } from "~/utils/mappers/cefrLevel.mapper"
import { BadRequestError } from "~/core/error.response"
import { FindOptionsWhere, ILike, In, Not } from "typeorm"
import { Topic } from "~/entities/topic.entity"
import { UserTopicProgress } from "~/entities/userTopicProgress.entity"
import { categoryProgressService } from "./userCategoryProgress.service"
import { User } from "~/entities/user.entity"
import validator from "validator"
import { WordStatus } from "~/enums/wordStatus.enum"
import { ProficiencyLevel } from "~/enums/proficiency.enum"

class TopicProgressService {
    private db = DatabaseService.getInstance()

    async getTopicProgressById(
        user: User,
        topicId: number,
        { page = 1, limit = 20, search, hasLearned }: { page?: number; limit?: number; search?: string; hasLearned?: boolean }
    ) {
        const ds = this.db.dataSource
        const skip = (page - 1) * limit

        const topicRepo = ds.getRepository(Topic)
        const wordRepo = ds.getRepository(Word)
        const progressRepo = ds.getRepository(UserWordProgress)

        // === 1️⃣ Kiểm tra topic tồn tại ===
        const topic = await topicRepo.findOne({ where: { id: topicId } })
        if (!topic) throw new BadRequestError({ message: 'Topic not found' })

        // === 2️⃣ Lấy CEFR range theo proficiency ===
        const cefrLevels = getCefrByLevel(user.proficiency)

        // === 3️⃣ Đếm tổng và tiến độ (toàn bộ, không filter/search) ===
        const totalWordsAll = await wordRepo.count({
            where: { topic: { id: topicId }, cefrLevel: In(cefrLevels) },
        })

        const learnedCountAll = await progressRepo
            .createQueryBuilder('uwp')
            .innerJoin('uwp.word', 'word')
            .where('uwp.userId = :userId', { userId: user.id })
            .andWhere('word.topicId = :topicId', { topicId })
            .andWhere('word.cefrLevel IN (:...cefrLevels)', { cefrLevels })
            .getCount()

        const masteredCountAll = await progressRepo
            .createQueryBuilder('uwp')
            .innerJoin('uwp.word', 'word')
            .where('uwp.userId = :userId', { userId: user.id })
            .andWhere('word.topicId = :topicId', { topicId })
            .andWhere('word.cefrLevel IN (:...cefrLevels)', { cefrLevels })
            .andWhere('uwp.status = :status', { status: WordStatus.MASTERED })
            .getCount()

        const progressPercent =
            totalWordsAll > 0 ? Number(((learnedCountAll / totalWordsAll) * 100).toFixed(2)) : 0
        const completed = progressPercent >= 100

        // === 4️⃣ Nếu có filter theo hasLearned thì lấy danh sách wordId đã học ===
        let learnedIds: number[] = []
        if (hasLearned !== undefined) {
            const learnedWordIds = await progressRepo
                .createQueryBuilder('uwp')
                .innerJoin('uwp.word', 'word')
                .where('uwp.userId = :userId', { userId: user.id })
                .andWhere('word.topicId = :topicId', { topicId })
                .andWhere('word.cefrLevel IN (:...cefrLevels)', { cefrLevels })
                .select('word.id')
                .getRawMany()

            learnedIds = learnedWordIds.map((x) => x.word_id)
        }

        // === 5️⃣ Tạo điều kiện where (filter + search) ===
        let where: FindOptionsWhere<Word>[] | FindOptionsWhere<Word> = [
            { topic: { id: topicId }, cefrLevel: In(cefrLevels) },
        ]

        if (search) {
            const normalized = validator.trim(search).toLowerCase()
            where = [
                { topic: { id: topicId }, cefrLevel: In(cefrLevels), word: ILike(`%${normalized}%`) },
                { topic: { id: topicId }, cefrLevel: In(cefrLevels), meaning: ILike(`%${normalized}%`) },
            ]
        }

        // === 6️⃣ Áp dụng hasLearned filter ===
        const filterByProgress = (cond: FindOptionsWhere<Word>) => {
            if (hasLearned === true && learnedIds.length > 0) cond.id = In(learnedIds)
            if (hasLearned === false && learnedIds.length > 0) cond.id = Not(In(learnedIds))
            return cond
        }

        const finalWhere = Array.isArray(where) ? where.map(filterByProgress) : filterByProgress(where)

        // === 7️⃣ Query danh sách từ ===
        const [words, totalWordsFiltered] = await wordRepo.findAndCount({
            skip,
            take: limit,
            where: finalWhere,
            order: { id: 'ASC' },
        })

        if (!words.length) {
            return {
                topicId,
                totalWordsAll,
                learnedCountAll,
                masteredCountAll,
                completed,
                progressPercent,
                currentPage: page,
                totalPages: Math.ceil(totalWordsFiltered / limit),
                totalWordsFiltered,
                words: [],
            }
        }

        // === 8️⃣ Lấy progress của user cho các từ này ===
        const wordIds = words.map((w) => w.id)
        const progresses = await progressRepo.find({
            where: { user: { id: user.id }, word: { id: In(wordIds) } },
            relations: ['word'],
        })

        const progressMap = new Map(progresses.map((p) => [p.word.id, p]))

        // === 9️⃣ Merge dữ liệu ===
        const mergedWords = words.map((w) => {
            const wp = progressMap.get(w.id)
            return {
                id: w.id,
                word: w.word,
                meaning: w.meaning,
                cefrLevel: w.cefrLevel,
                type: w.type,
                progress: wp
                    ? {
                        id: wp.id,
                        status: wp.status,
                        srsLevel: wp.srsLevel,
                        learnedAt: wp.learnedAt,
                        nextReviewDay: wp.nextReviewDay,
                    }
                    : null,
            }
        })

        // === 🔟 Trả kết quả ===
        return {
            topicId,
            totalWordsAll,
            learnedCountAll,
            masteredCountAll,
            completed,
            progressPercent,
            currentPage: page,
            totalPages: Math.ceil(totalWordsFiltered / limit),
            totalWordsFiltered,
            words: mergedWords,
        }
    }

    async createAndUpdateTopicProgress(user: User, topicId: number) {
        const topicRepo = await this.db.getRepository(Topic)
        const progressRepo = await this.db.getRepository(UserWordProgress)
        const topicProgressRepo = await this.db.getRepository(UserTopicProgress)

        const cefrLevels = getCefrByLevel(user.proficiency)
        const topic = await topicRepo.findOne({
            where: { id: topicId },
            relations: ['words', 'category']
        })
        if (!topic) throw new BadRequestError({ message: 'Topic not found' })

        const wordsInLevel = topic.words?.filter(w => cefrLevels.includes(w.cefrLevel)) ?? []
        const totalWords = wordsInLevel.length
        if (totalWords === 0) throw new BadRequestError({ message: 'No words found for this level' })

        const wordIds = wordsInLevel.map(w => w.id)
        const userProgresses = await progressRepo.find({
            where: { user: { id: user.id }, word: { id: In(wordIds) } }
        })

        const learnedCount = userProgresses.length
        const percent = (learnedCount / totalWords) * 100

        let topicProgress = await topicProgressRepo.findOne({
            where: {
                user: { id: user.id },
                topic: { id: topicId },
                proficiency: user.proficiency as ProficiencyLevel
            }
        })

        if (!topicProgress) {
            topicProgress = topicProgressRepo.create({
                user: { id: user.id } as any,
                topic: { id: topicId } as any,
                proficiency: user.proficiency as ProficiencyLevel,
                completed: percent >= 100
            })
        } else {
            topicProgress.completed = percent >= 100
        }

        await topicProgressRepo.save(topicProgress)

        // update CategoryProgress
        if (topic.category) {
            await categoryProgressService.createAndUpdateCategoryProgress(user, topic.category.id)
        }
        return topicProgress
    }
}

export const topicProgressService = new TopicProgressService()
