import { Word } from "~/entities/word.entity"
import { DatabaseService } from "./database.service"
import { UserWordProgress } from "~/entities/userWordProgress.entity"
import { getCefrByLevel } from "~/utils/mappers/cefrLevel.mapper"
import { BadRequestError } from "~/core/error.response"
import { In } from "typeorm"
import { Topic } from "~/entities/topic.entity"
import { UserTopicProgress } from "~/entities/userTopicProgress.entity"
import { categoryProgressService } from "./userCategoryProgress.service"
import { User } from "~/entities/user.entity"

class TopicProgressService {
    private db = DatabaseService.getInstance()

    // Lấy tiến độ học của user trong 1 topic theo level hiện tại
    async getTopicProgress(user: User, topicId: number) {
        const dataSource = this.db.dataSource
        const wordRepo = dataSource.getRepository(Word)
        const progressRepo = dataSource.getRepository(UserWordProgress)

        // 1️⃣ Lấy danh sách word trong topic theo level user
        if (!user.proficiency) {
            throw new BadRequestError({ message: 'User has no proficiency level set' })
        }
        const cefrLevels = getCefrByLevel(user.proficiency) // vd: BEGINNER -> ['A1','A2']

        const words = await wordRepo.find({
            where: { topic: { id: topicId }, cefrLevel: In(cefrLevels) },
            relations: ['topic'],
            order: { id: 'ASC' },
        })

        if (words.length === 0) throw new BadRequestError({ message: 'No words found for this topic & level' })

        // 2️⃣ Lấy progress của user cho các word này
        const wordIds = words.map(w => w.id)
        const progresses = await progressRepo.find({
            where: { user: { id: user.id }, word: { id: In(wordIds) } },
            relations: ['word'],
        })

        // 3️⃣ Đếm số từ đã học
        const learnedCount = progresses.length
        const totalWords = words.length

        // 4️⃣ Xác định từ tiếp theo chưa học
        const learnedWordIds = new Set(progresses.map(p => p.word.id))
        const nextWord = words.find(w => !learnedWordIds.has(w.id)) // lấy từ chưa học đầu tiên trong list topic

        return {
            topicId,
            level: user.proficiency,
            totalWords,
            learnedCount,
            completed: learnedCount >= totalWords,
            progressPercent: (learnedCount / totalWords) * 100,
            nextWord: nextWord ? { id: nextWord.id, word: nextWord.word } : null,
        }
    }

    async updateProgressForUser(userId: number, topicId: number) {
        const topicRepo = await this.db.getRepository(Topic)
        const progressRepo = await this.db.getRepository(UserWordProgress)
        const topicProgressRepo = await this.db.getRepository(UserTopicProgress)

        const topic = await topicRepo.findOne({
            where: { id: topicId },
            relations: ['words', 'category']
        })
        if (!topic) throw new BadRequestError({ message: 'Topic not found' })

        const userProgresses = await progressRepo.find({
            where: { user: { id: userId }, word: { topic: { id: topicId } } }
        })

        // lọc tổng từ trong topic theo level user hiện tại
        const totalWords = topic.words?.length ?? 0
        const learnedCount = userProgresses.length
        const percent = totalWords > 0 ? (learnedCount / totalWords) * 100 : 0


        // cập nhật topic progress
        let topicProgress = await topicProgressRepo.findOne({
            where: { user: { id: userId }, topic: { id: topicId } }
        })
        if (!topicProgress) {
            topicProgress = topicProgressRepo.create({
                user: { id: userId } as any,
                topic: { id: topicId } as any,
                completed: percent >= 100
            })
        } else {
            topicProgress.completed = percent >= 100
        }

        await topicProgressRepo.save(topicProgress)

        // cập nhật luôn category progress liên quan
        if (topic.category) {
            await categoryProgressService.updateProgressForUser(userId, topic.category.id)
        }
    }

}

export const topicProgressService = new TopicProgressService()
