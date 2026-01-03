
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

    // 4. Create Learning Progress (Words)
    const wordProgress: UserWordProgress[] = []
    for (let i = 0; i < 200; i++) {
        const user = faker.helpers.arrayElement(savedUsers)
        const word = faker.helpers.arrayElement(words)
        const learnedAt = faker.date.recent({ days: 30 })

        const exists = wordProgress.find(wp => wp.user === user && wp.word === word)
        if (!exists) {
            const progress = new UserWordProgress()
            progress.user = user
            progress.word = word
            progress.status = WordStatus.MASTERED
            progress.srsLevel = faker.number.int({ min: 1, max: 5 })
            progress.learnedAt = learnedAt
            progress.updatedAt = learnedAt
            wordProgress.push(progress)
        }
    }
    await UserWordProgress.save(wordProgress)
    console.log(`   - Created ${wordProgress.length} word progress records.`)
    
    console.log('✅ Dashboard data seeded successfully.')
}
