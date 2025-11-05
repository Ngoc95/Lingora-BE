import { UserTopicProgress } from "~/entities/userTopicProgress.entity"
import { DatabaseService } from "./database.service"
import { UserCategoryProgress } from "~/entities/userCategoryProgress.entity"
import { Category } from "~/entities/category.entity"
import { BadRequestError } from "~/core/error.response"
import { In } from "typeorm"
import { UserWordProgress } from "~/entities/userWordProgress.entity"
import { Topic } from "~/entities/topic.entity"
import { getCefrByLevel } from "~/utils/mappers/cefrLevel.mapper"
import { User } from "~/entities/user.entity"

class CategoryProgressService {
    private db = DatabaseService.getInstance()

    async getCategoryProgress(user: User, categoryId: number) {
        const dataSource = this.db.dataSource
        const topicRepo = dataSource.getRepository(Topic)
        const progressRepo = dataSource.getRepository(UserWordProgress)

        // Lấy các topic thuộc category
        const topics = await topicRepo.find({
            where: { category: { id: categoryId } },
            relations: ['category', 'words']
        })
        if (!topics.length) throw new BadRequestError({ message: 'No topics found for this category' })

        // Lọc word theo CEFR level của user
        const cefrLevels = getCefrByLevel(user.proficiency)

        // Duyệt song song topic
        const results = await Promise.all(
            topics.map(async (topic) => {
                const topicWords = topic.words.filter((w) =>
                    cefrLevels.includes(w.cefrLevel as any),
                )
                const wordIds = topicWords.map((w) => w.id)
                if (!wordIds.length) return { total: 0, learned: 0, completed: false }

                const progresses = await progressRepo.find({
                    where: { user: { id: user.id }, word: { id: In(wordIds) } },
                })

                const learnedCount = progresses.length
                const totalCount = topicWords.length
                const completed = learnedCount >= totalCount && totalCount > 0

                return {
                    total: totalCount,
                    learned: learnedCount,
                    completed,
                }
            }),
        )

        // Tính tổng toàn category
        const totalWords = results.reduce((sum, r) => sum + r.total, 0)
        const learnedWords = results.reduce((sum, r) => sum + r.learned, 0)
        const totalCompletedTopics = results.filter((r) => r.completed).length

        return {
            categoryId,
            level: user.proficiency,
            totalTopics: topics.length,
            totalCompletedTopics,
            totalWords,
            learnedCount: learnedWords,
            completed: totalCompletedTopics === topics.length,
            progressPercent: totalWords ? (learnedWords / totalWords) * 100 : 0,
        }
    }

    async updateProgressForUser(userId: number, categoryId: number) {
        const categoryRepo = await this.db.getRepository(Category)
        const topicProgressRepo = await this.db.getRepository(UserTopicProgress)
        const categoryProgressRepo = await this.db.getRepository(UserCategoryProgress)

        const category = await categoryRepo.findOne({
            where: { id: categoryId },
            relations: ['topics']
        })
        if (!category) throw new BadRequestError({ message: 'Category not found' })

        const topicIds = category.topics?.map(t => t.id).filter(Boolean) || []

        const topicProgresses = topicIds.length > 0
            ? await topicProgressRepo.find({
                where: {
                    user: { id: userId },
                    topic: { id: In(topicIds) }
                }
            })
            : []

        const totalTopics = topicIds.length
        const completedTopics = topicProgresses.filter(t => t.completed).length
        const percent = (completedTopics / totalTopics) * 100

        let categoryProgress = await categoryProgressRepo.findOne({
            where: { user: { id: userId }, category: { id: categoryId } }
        })
        if (!categoryProgress) {
            categoryProgress = categoryProgressRepo.create({
                user: { id: userId } as any,
                category: { id: categoryId } as any,
                completed: percent >= 100,
                progressPercent: percent
            })
        } else {
            categoryProgress.progressPercent = percent
            categoryProgress.completed = percent >= 100
        }

        await categoryProgressRepo.save(categoryProgress)
    }

}
export const categoryProgressService = new CategoryProgressService()