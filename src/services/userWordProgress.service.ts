import { DatabaseService } from '~/services/database.service'
import { User } from '~/entities/user.entity'
import { Word } from '~/entities/word.entity'
import { UserWordProgress } from '~/entities/userWordProgress.entity'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import dayjs from 'dayjs'
import { UpdateWordProgressBodyReq, UpdateWordProgressData } from '~/dtos/req/wordProgress/updateWordProgressBody.req'
import { CreateWordProgressBodyReq } from '~/dtos/req/wordProgress/createWordProgressBody.req'
import { WordStatus } from '~/enums/wordStatus.enum'
import { topicProgressService } from './userTopicProgress.service'
import { In } from 'typeorm'

export class WordProgressService {
    private db = DatabaseService.getInstance()

    // CREATE PROGRESS
    async createManyWordProgress(userId: number, { wordIds }: CreateWordProgressBodyReq) {
        if (!wordIds?.length) throw new BadRequestError({ message: 'No word IDs provided' })

        const dataSource = this.db.dataSource

        return await dataSource.transaction(async (manager) => {
            const user = await manager.getRepository(User).findOneBy({ id: userId })
            if (!user) throw new BadRequestError({ message: 'User not found' })

            const wordRepo = manager.getRepository(Word)
            const progressRepo = manager.getRepository(UserWordProgress)

            const words = await wordRepo.find({
                where: { id: In(wordIds) },
                relations: ['topic', 'topic.categories']
            })
            if (!words.length) throw new BadRequestError({ message: 'No valid words found' })

            const created: UserWordProgress[] = []

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
                if(word.topic) {
                    await topicProgressService.updateProgressForUser(userId, word.topic.id)
                }
            }

            return {
                userId,
                totalCreated: created.length,
                wordProgress: created,
            }
        })
    }

    // UPDATE MANY (with TRANSACTION) 
    async updateManyWordProgress(userId: number, { wordProgress }: UpdateWordProgressBodyReq) {
        if (!wordProgress?.length) {
            throw new NotFoundRequestError('No word progress data provided')
        }

        const dataSource = this.db.dataSource

        return await dataSource.transaction(async (manager) => {
            const user = await manager.getRepository(User).findOneBy({ id: userId })
            if (!user) throw new BadRequestError({ message: 'User not found' })

            const progressRepo = manager.getRepository(UserWordProgress)
            const wordRepo = manager.getRepository(Word)
            const updatedResults: UserWordProgress[] = []

            for (const { wordId, wrongCount = 0, reviewedDate } of wordProgress) {
                const word = await wordRepo.findOne({
                    where: { id: wordId },
                    relations: ['topic', 'topic.categories']
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
                    progress.learnedAt = reviewedDate
                    progress.nextReviewDay = dayjs(reviewedDate).add(nextIntervalDays, 'day').toDate()
                }

                const saved = await progressRepo.save(progress)
                delete (saved as any).user // ko trả thuộc tính user trong wordProgress (return đã có userId)
                updatedResults.push(saved)

                if (word.topic) {
                    await topicProgressService.updateProgressForUser(userId, word.topic.id)
                }
            }

            return {
                userId,
                totalUpdated: updatedResults.length,
                wordProgress: updatedResults,
            }
        })
    }
}
export const wordProgressService = new WordProgressService()
