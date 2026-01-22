
import { faker } from "@faker-js/faker"
import { User } from "~/entities/user.entity"
import { StudySet } from "~/entities/studySet.entity"
import { Transaction } from "~/entities/transaction.entity"
import { Exam } from "~/entities/exam.entity"
import { ExamAttempt } from "~/entities/examAttempt.entity"
import { UserWordProgress } from "~/entities/userWordProgress.entity"
import { Word } from "~/entities/word.entity"
import { TransactionStatus } from "~/enums/transactionStatus.enum"
import { UserStatus } from "~/enums/userStatus.enum"
import { PaymentMethod } from "~/enums/paymentMethod.enum"
import { ExamAttemptStatus, ExamMode } from "~/enums/exam.enum"
import { ProficiencyLevel } from "~/enums/proficiency.enum"
import { WordStatus } from "~/enums/wordStatus.enum"
import { UserTopicProgress } from "~/entities/userTopicProgress.entity"
import { UserCategoryProgress } from "~/entities/userCategoryProgress.entity"

export async function seedDashboardData() {
    console.log('📊 Seeding dashboard data (History)...')

    // 1. Create historical users (last 30 days)
    const users: User[] = []
    for (let i = 0; i < 50; i++) {
        const createdAt = faker.date.recent({ days: 30 })
        const user = new User()
        user.email = faker.internet.email()
        user.username = faker.internet.username()
        user.password = '$2b$10$YourHashHere'
        user.roles = []
        user.status = UserStatus.ACTIVE
        user.proficiency = faker.helpers.arrayElement(Object.values(ProficiencyLevel))
        user.createdAt = createdAt

        users.push(user)
    }
    const savedUsers = await User.save(users)
    console.log(`   - Created ${savedUsers.length} historical users.`)

    // Get existing study sets and exams for reference
    const studySets = await StudySet.find()
    const exams = await Exam.find()
    const words = await Word.find({ take: 100 })

    if (studySets.length === 0 || exams.length === 0 || words.length === 0) {
        console.warn('⚠️  Not enough base data (StudySets/Exams/Words) to seed dashboard history. Skipping.')
        return
    }

    // 2. Create Transactions (Revenue History)
    const transactions: Transaction[] = []
    for (let i = 0; i < 100; i++) {
        const user = faker.helpers.arrayElement(savedUsers)
        const studySet = faker.helpers.arrayElement(studySets)
        const createdAt = faker.date.recent({ days: 30 })
        
        if (studySet.price > 0) {
            const tx = new Transaction()
            tx.user = user
            tx.studySet = studySet
            tx.amount = Number(studySet.price)
            tx.method = PaymentMethod.VNPAY
            tx.status = TransactionStatus.SUCCESS
            tx.orderId = faker.string.uuid()
            tx.createdAt = createdAt
            transactions.push(tx)
        }
    }
    if (transactions.length > 0) {
        await Transaction.save(transactions)
        console.log(`   - Created ${transactions.length} historical transactions.`)
    }

    // 3. Create Exam Attempts
    const attempts: ExamAttempt[] = []
    for (let i = 0; i < 60; i++) {
        const user = faker.helpers.arrayElement(savedUsers)
        const exam = faker.helpers.arrayElement(exams)
        const startedAt = faker.date.recent({ days: 30 })
        const finishedAt = new Date(startedAt.getTime() + 30 * 60000)

        const attempt = new ExamAttempt()
        attempt.user = user
        attempt.exam = exam
        attempt.mode = ExamMode.FULL
        attempt.status = ExamAttemptStatus.SUBMITTED
        attempt.startedAt = startedAt
        attempt.submittedAt = finishedAt
        attempt.sectionProgress = {}
        attempt.scoreSummary = { 
            overallScore: faker.number.int({ min: 10, max: 100 }),
            totalTimeSeconds: 1800 
        }
        attempt.createdAt = startedAt
        attempt.updatedAt = finishedAt
        attempts.push(attempt)
    }
    await ExamAttempt.save(attempts)
    console.log(`   - Created ${attempts.length} historical exam attempts.`)

    // preload relations
const words1 = await Word.find({
    relations: ['topic', 'topic.category'],
    take: 200
})

const wordProgresses: UserWordProgress[] = []
const topicProgressMap = new Map<string, UserTopicProgress>()
const categoryProgressMap = new Map<string, UserCategoryProgress>()

for (const user of savedUsers) {
    const proficiency = faker.helpers.arrayElement(Object.values(ProficiencyLevel))

    // user học 15–30 từ
    const learnedWords = faker.helpers
        .shuffle(words1)
        .slice(0, faker.number.int({ min: 15, max: 30 }))

    for (const word of learnedWords) {
        const learnedAt = faker.date.recent({ days: 30 })

        // 1️⃣ Word progress
        const wp = new UserWordProgress()
        wp.user = user
        wp.word = word
        wp.status = WordStatus.MASTERED
        wp.srsLevel = faker.number.int({ min: 2, max: 5 })
        wp.learnedAt = learnedAt
        wp.updatedAt = learnedAt
        wordProgresses.push(wp)

        // 2️⃣ Topic progress (unique: user + topic + proficiency)
        const topicKey = `${user.id}-${word.topic?.id}-${proficiency}`
        if (!topicProgressMap.has(topicKey)) {
            const tp = new UserTopicProgress()
            tp.user = user
            tp.topic = word.topic!
            tp.proficiency = proficiency
            tp.completed = false // cập nhật sau
            tp.createdAt = learnedAt
            tp.updatedAt = learnedAt
            topicProgressMap.set(topicKey, tp)
        }

        // 3️⃣ Category progress
        const categoryKey = `${user.id}-${word.topic?.category?.id}-${proficiency}`
        if (!categoryProgressMap.has(categoryKey)) {
            const cp = new UserCategoryProgress()
            cp.user = user
            cp.category = word.topic?.category!
            cp.proficiency = proficiency
            cp.progressPercent = 0 // cập nhật sau
            cp.completed = false
            cp.createdAt = learnedAt
            cp.updatedAt = learnedAt
            categoryProgressMap.set(categoryKey, cp)
        }
    }
}


    
    console.log('✅ Dashboard data seeded successfully.')
}
