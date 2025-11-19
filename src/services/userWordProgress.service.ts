import { DatabaseService } from '~/services/database.service'
import { User } from '~/entities/user.entity'
import { Word } from '~/entities/word.entity'
import { UserWordProgress } from '~/entities/userWordProgress.entity'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import dayjs from 'dayjs'
import { UpdateWordProgressBodyReq } from '~/dtos/req/wordProgress/updateWordProgressBody.req'
import { CreateWordProgressBodyReq } from '~/dtos/req/wordProgress/createWordProgressBody.req'
import { WordStatus } from '~/enums/wordStatus.enum'
import { topicProgressService } from './userTopicProgress.service'
import { In, LessThanOrEqual, Not } from 'typeorm'
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '~/constants/pagination'
import { getCefrByLevel } from '~/utils/mappers/cefrLevel.mapper'
import { Topic } from '~/entities/topic.entity'

class WordProgressService {
    private db = DatabaseService.getInstance()

    // CREATE PROGRESS
    async createManyWordProgress(userId: number, { wordIds }: CreateWordProgressBodyReq) {
        const dataSource = this.db.dataSource

        return await dataSource.transaction(async (manager) => {
            const user = await manager.getRepository(User).findOneBy({ id: userId })
            if (!user) throw new BadRequestError({ message: 'User not found' })

            const wordRepo = manager.getRepository(Word)
            const progressRepo = manager.getRepository(UserWordProgress)

            const words = await wordRepo.find({
                where: { id: In(wordIds) },
                loadRelationIds: {
                    relations: ['topic'],
                    disableMixedMap: false
                }
            })
            if (!words.length) throw new BadRequestError({ message: 'No valid words found' })

            const created: UserWordProgress[] = []
            const updatedTopicIds = new Set<number>()

            for (const word of words) {
                const existed = await progressRepo.findOne({
                    where: { user: { id: userId }, word: { id: word.id } },
                })
                if (existed) continue

                const newProgress = progressRepo.create({
                    user,
                    word,
                    status: WordStatus.LEARNING,
                    srsLevel: 1,
                    learnedAt: new Date(),
                    nextReviewDay: dayjs().add(1, 'day').toDate(),
                })

                const saved = await progressRepo.save(newProgress)
                delete (saved as any).user  // ko trả thuộc tính user trong wordProgress (return đã có userId)
                created.push(saved)

                // cập nhật topic progress => topic cập nhật category progress
                if (word.topic) {
                    updatedTopicIds.add(word.topic.id)
                }
            }

            // Cập nhật topicProgress => topic gọi hàm cập nhật categoryProgress
            for (const topicId of updatedTopicIds) {
                await topicProgressService.createAndUpdateTopicProgress(user, topicId)
            }

            return {
                userId,
                totalCreated: created.length,
                wordProgresses: created,
            }
        })
    }

    // UPDATE MANY (with TRANSACTION) 
    async updateManyWordProgress(userId: number, { wordProgress }: UpdateWordProgressBodyReq) {
        const dataSource = this.db.dataSource

        return await dataSource.transaction(async (manager) => {
            const user = await manager.getRepository(User).findOneBy({ id: userId })
            if (!user) throw new BadRequestError({ message: 'User not found' })

            const progressRepo = manager.getRepository(UserWordProgress)
            const wordRepo = manager.getRepository(Word)

            const updatedResults: UserWordProgress[] = []
            const updatedTopicIds = new Set<number>()

            for (const { wordId, wrongCount = 0, reviewedDate } of wordProgress) {
                const word = await wordRepo.findOne({
                    where: { id: wordId },
                    loadRelationIds: {
                        relations: ['topic'],
                        disableMixedMap: false
                    }
                })
                if (!word) continue

                let progress = await progressRepo.findOne({
                    where: { user: { id: userId }, word: { id: wordId } },
                })

                if (!progress) {
                    progress = progressRepo.create({
                        user,
                        word,
                        status: WordStatus.LEARNING,
                        srsLevel: 1,
                        learnedAt: reviewedDate,
                        nextReviewDay: dayjs(reviewedDate).add(1, 'day').toDate(),
                    })
                } else {
                    let newLevel = progress.srsLevel
                    let newStatus = progress.status

                    if (wrongCount === 0) {
                        newLevel = Math.min(progress.srsLevel + 1, 5)
                        newStatus = newLevel >= 5 ? WordStatus.MASTERED : WordStatus.REVIEWING
                    } else {
                        newLevel = Math.max(progress.srsLevel - 1, 1)
                        newStatus = WordStatus.LEARNING
                    }

                    const nextIntervalDays = [1, 2, 4, 7, 15, 30][newLevel - 1] || 1

                    progress.srsLevel = newLevel
                    progress.status = newStatus
                    progress.nextReviewDay = dayjs(reviewedDate).add(nextIntervalDays, 'day').toDate()
                }

                const saved = await progressRepo.save(progress)
                delete (saved as any).user // ko trả thuộc tính user trong wordProgress (return đã có userId)
                updatedResults.push(saved)

                if (word.topic) {
                    updatedTopicIds.add(word.topic.id)
                }
            }

            for (const topicId of updatedTopicIds) {
                await topicProgressService.createAndUpdateTopicProgress(user, topicId)
            }

            return {
                userId,
                totalUpdated: updatedResults.length,
                wordProgresses: updatedResults,
            }
        })
    }

    async getWordsForStudy(user: User, topicId: number, count: number) {
        const ds = this.db.dataSource
        const topicRepo = ds.getRepository(Topic)
        const wordRepo = ds.getRepository(Word)
        const progressRepo = ds.getRepository(UserWordProgress)

        // 1️⃣ Kiểm tra topic tồn tại
        const topic = await topicRepo.findOne({ where: { id: topicId } })
        if (!topic) throw new BadRequestError({ message: 'Topic not found' })

        // 2️⃣ Lấy CEFR range theo proficiency user
        const cefrLevels = getCefrByLevel(user.proficiency)

        // 3️⃣ Lấy danh sách wordId user đã học
        const learnedWordIds = await progressRepo
            .createQueryBuilder('uwp')
            .innerJoin('uwp.word', 'word')
            .where('uwp.userId = :userId', { userId: user.id })
            .andWhere('word.topicId = :topicId', { topicId })
            .andWhere('word.cefrLevel IN (:...cefrLevels)', { cefrLevels })
            .select('word.id')
            .getRawMany()

        const learnedIds = learnedWordIds.map((x) => x.word_id)

        // 4️⃣ Lấy danh sách từ chưa học, giới hạn theo count
        const words = await wordRepo.find({
            where: {
                topic: { id: topicId },
                cefrLevel: In(cefrLevels),
                ...(learnedIds.length ? { id: Not(In(learnedIds)) } : {}),
            },
            order: { id: 'ASC' },
            take: count,
        })

        return {
            topicId,
            total: words.length,
            words: words.map((w) => ({
                id: w.id,
                word: w.word,
                meaning: w.meaning,
                cefrLevel: w.cefrLevel,
                type: w.type,
                example: w.example,
                exampleTranslation: w.exampleTranslation,
                phonetic: w.phonetic,
                audioUrl: w.audioUrl,
                imageUrl: w.imageUrl,
            })),
        }
    }

    async getWordsForReview(user: User, { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT }: { page?: number; limit?: number }) {
        const ds = this.db.dataSource
        const progressRepo = ds.getRepository(UserWordProgress)

        const today = new Date()

        const [dueProgresses, total] = await progressRepo.findAndCount({
            where: {
                user: { id: user.id },
                nextReviewDay: LessThanOrEqual(today),
            },
            relations: ['word'],
            order: {
                nextReviewDay: 'ASC',     // ưu tiên từ sắp đến hạn ôn trước
                srsLevel: 'ASC',          // ưu tiên từ cấp thấp trước (nếu trùng ngày)
            },
            skip: (page - 1) * limit,
            take: limit,
        })

        return {
            page,
            limit,
            total,
            words: dueProgresses.map(p => ({
                ...p.word,
                srsLevel: p.srsLevel,
                status: p.status,
                nextReviewDay: p.nextReviewDay,
            })),
        }
    }

    async getWordStatisticsByUser(user: User) {
        const ds = this.db.dataSource
        const progressRepo = ds.getRepository(UserWordProgress)

        // === 1️⃣ Lấy toàn bộ progress của user ===
        const progresses = await progressRepo.find({
            where: { user: { id: user.id } },
            select: ['srsLevel'], // chỉ cần srsLevel
        })

        if (!progresses.length) {
            return {
                totalLearnedWord: 0,
                statistics: [],
            }
        }

        // === 2️⃣ Gom nhóm theo srsLevel ===
        const srsMap = new Map<number, number>()
        for (const p of progresses) {
            const count = srsMap.get(p.srsLevel) || 0
            srsMap.set(p.srsLevel, count + 1)
        }

        // === 3️⃣ Chuẩn hóa kết quả ===
        const statistics = Array.from(srsMap.entries())
            .map(([srsLevel, wordCount]) => ({ srsLevel, wordCount }))
            .sort((a, b) => a.srsLevel - b.srsLevel)

        // === 4️⃣ Tổng số từ đã học ===
        const totalLearnedWord = progresses.length

        // === 5️⃣ Trả về ===
        return {
            totalLearnedWord,
            statistics,
        }
    }
}

export const wordProgressService = new WordProgressService()
