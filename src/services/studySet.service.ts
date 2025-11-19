import { DatabaseService } from './database.service'
import { StudySet } from '~/entities/studySet.entity'
import { Flashcard } from '~/entities/flashcard.entity'
import { Quiz } from '~/entities/quiz.entity'
import { UserStudySet } from '~/entities/userStudySet.entity'
import { Transaction } from '~/entities/transaction.entity'
import { BadRequestError } from '~/core/error.response'
import { CreateStudySetBodyReq, FlashcardInputReq, QuizInputReq } from '~/dtos/req/studySet/createStudySetBody.req'
import { UpdateStudySetBodyReq } from '~/dtos/req/studySet/updateStudySetBody.req'
import { GetStudySetsQueryReq } from '~/dtos/req/studySet/getStudySetsQuery.req'
import { FindOptionsWhere, ILike, In } from 'typeorm'
import validator from 'validator'
import { createVNPayPaymentUrl } from '~/utils/vnpay'
import { v4 as uuidv4 } from 'uuid'
import { StudySetStatus } from '~/enums/studySetStatus.enum'
import { StudySetVisibility } from '~/enums/studySetVisibility.enum'
import { TransactionStatus } from '~/enums/transactionStatus.enum'
import { PaymentMethod } from '~/enums/paymentMethod.enum'
import { EVENTS } from '~/events-handler/constants'
import eventBus from '~/events-handler/eventBus'
import { User } from '~/entities/user.entity'

class StudySetService {
    private db = DatabaseService.getInstance()

    createStudySet = async (ownerId: number, data: CreateStudySetBodyReq) => {
        const studySetRepo = await this.db.getRepository(StudySet)
        const flashcardRepo = await this.db.getRepository(Flashcard)
        const quizRepo = await this.db.getRepository(Quiz)

        // Tạo study set
        // Status tự động được set dựa trên visibility:
        // - PRIVATE → DRAFT
        // - PUBLIC → PENDING_APPROVAL (cần admin duyệt)
        const visibility = data.visibility || StudySetVisibility.PRIVATE
        const initialStatus =
            visibility === StudySetVisibility.PUBLIC
                ? StudySetStatus.PENDING_APPROVAL
                : StudySetStatus.DRAFT

        const studySet = studySetRepo.create({
            title: data.title,
            description: data.description,
            visibility: visibility,
            price: data.price || 0,
            status: initialStatus,
            owner: { id: ownerId } as any,
        })

        const savedStudySet = await studySetRepo.save(studySet)

        // Tạo flashcards nếu có
        if (data.flashcards && data.flashcards.length > 0) {
            const flashcards = data.flashcards.map((fc: FlashcardInputReq) =>
                flashcardRepo.create({
                    studySet: savedStudySet,
                    frontText: fc.frontText,
                    backText: fc.backText,
                    example: fc.example,
                    audioUrl: fc.audioUrl,
                    imageUrl: fc.imageUrl,
                })
            )
            await flashcardRepo.save(flashcards)
        }

        // Tạo quizzes nếu có
        if (data.quizzes && data.quizzes.length > 0) {
            const quizzes = data.quizzes.map((q: QuizInputReq) =>
                quizRepo.create({
                    studySet: savedStudySet,
                    type: q.type,
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                })
            )
            await quizRepo.save(quizzes)
        }

        // Load lại với relations và exclude password từ owner
        const studySetWithOwner = await studySetRepo.findOne({
            where: { id: savedStudySet.id },
            relations: ['owner', 'flashcards', 'quizzes'],
        })

        if (studySetWithOwner && studySetWithOwner.owner) {
            const { password, ...ownerWithoutPassword } = studySetWithOwner.owner as any
            return {
                ...studySetWithOwner,
                owner: ownerWithoutPassword,
            }
        }

        return studySetWithOwner
    }

    getAllStudySets = async (userId: number, query: GetStudySetsQueryReq) => {
        const studySetRepo = await this.db.getRepository(StudySet)
        const userStudySetRepo = await this.db.getRepository(UserStudySet)
        const skip = (query.page! - 1) * query.limit!

        // Build query builder for complex queries
        const qb = studySetRepo
            .createQueryBuilder('studySet')
            .leftJoin('studySet.owner', 'owner')
            .loadRelationCountAndMap('studySet.totalFlashcards', 'studySet.flashcards')
            .loadRelationCountAndMap('studySet.totalQuizzes', 'studySet.quizzes')
            .select([
                'studySet.id',
                'studySet.title',
                'studySet.description',
                'studySet.visibility',
                'studySet.price',
                'studySet.status',
                'studySet.likeCount',
                'studySet.createdAt',
                'owner.id',
                'owner.username',
            ])
            .skip(skip)
            .take(query.limit!)

        // Chỉ lấy những study set có status = PUBLISHED và visibility = PUBLIC (bắt buộc cả 2)
        qb.where('studySet.visibility = :visibility', { visibility: StudySetVisibility.PUBLIC })
        qb.andWhere('studySet.status = :status', { status: StudySetStatus.PUBLISHED })

        if (query.minPrice !== undefined) {
            qb.andWhere('studySet.price >= :minPrice', { minPrice: query.minPrice })
        }

        if (query.maxPrice !== undefined) {
            qb.andWhere('studySet.price <= :maxPrice', { maxPrice: query.maxPrice })
        }

        // Search
        if (query.search) {
            const normalized = validator.trim(query.search).toLowerCase()
            qb.andWhere(
                '(LOWER(studySet.title) ILIKE :search OR LOWER(studySet.description) ILIKE :search)',
                { search: `%${normalized}%` }
            )
        }

        // Sort
        if (query.sort) {
            Object.keys(query.sort).forEach((key) => {
                qb.addOrderBy(`studySet.${key}`, query.sort![key])
            })
        } else {
            qb.orderBy('studySet.createdAt', 'DESC')
        }

        const [studySets, total] = await qb.getManyAndCount()

        // Check which study sets user has purchased
        const studySetIds = studySets.map((ss) => ss.id)
        let purchasedSetIds = new Set<number>()

        if (studySetIds.length > 0) {
            const purchasedRecords = await userStudySetRepo.find({
                where: {
                    user: { id: userId },
                    studySet: { id: In(studySetIds) },
                },
                relations: ['studySet'],
            })
            purchasedSetIds = new Set(purchasedRecords.map((r) => r.studySet.id))
        }

        // Add isPurchased flag
        const studySetsWithPurchaseStatus = studySets.map((ss) => ({
            ...ss,
            isPurchased: purchasedSetIds.has(ss.id),
        }))

        return {
            currentPage: query.page!,
            totalPages: Math.ceil(total / query.limit!),
            total,
            studySets: studySetsWithPurchaseStatus,
        }
    }

    getOwnStudySets = async (ownerId: number, query: GetStudySetsQueryReq) => {
        const studySetRepo = await this.db.getRepository(StudySet)
        const skip = (query.page! - 1) * query.limit!

        const qb = studySetRepo
            .createQueryBuilder('studySet')
            .leftJoin('studySet.owner', 'owner')
            .loadRelationCountAndMap('studySet.totalFlashcards', 'studySet.flashcards')
            .loadRelationCountAndMap('studySet.totalQuizzes', 'studySet.quizzes')
            .select([
                'studySet.id',
                'studySet.title',
                'studySet.description',
                'studySet.visibility',
                'studySet.price',
                'studySet.status',
                'studySet.likeCount',
                'studySet.createdAt',
                'owner.id',
                'owner.username',
            ])
            .where('studySet.owner.id = :ownerId', { ownerId })
            .skip(skip)
            .take(query.limit!)

        // Apply filters
        if (query.visibility) {
            qb.andWhere('studySet.visibility = :visibility', { visibility: query.visibility })
        }

        if (query.status) {
            qb.andWhere('studySet.status = :status', { status: query.status })
        }

        if (query.minPrice !== undefined) {
            qb.andWhere('studySet.price >= :minPrice', { minPrice: query.minPrice })
        }

        if (query.maxPrice !== undefined) {
            qb.andWhere('studySet.price <= :maxPrice', { maxPrice: query.maxPrice })
        }

        // Search
        if (query.search) {
            const normalized = validator.trim(query.search).toLowerCase()
            qb.andWhere(
                '(LOWER(studySet.title) ILIKE :search OR LOWER(studySet.description) ILIKE :search)',
                { search: `%${normalized}%` }
            )
        }

        // Sort
        if (query.sort) {
            Object.keys(query.sort).forEach((key) => {
                qb.addOrderBy(`studySet.${key}`, query.sort![key])
            })
        } else {
            qb.orderBy('studySet.createdAt', 'DESC')
        }

        const [studySets, total] = await qb.getManyAndCount()

        return {
            currentPage: query.page!,
            totalPages: Math.ceil(total / query.limit!),
            total,
            studySets,
        }
    }

    getStudySetById = async (studySetId: number, userId?: number) => {
        const studySetRepo = await this.db.getRepository(StudySet)
        const userStudySetRepo = await this.db.getRepository(UserStudySet)

        const studySet = await studySetRepo.findOne({
            where: { id: studySetId },
            relations: ['owner', 'flashcards', 'quizzes'],
        })

        if (!studySet) {
            throw new BadRequestError({ message: 'Study set not found' })
        }

        // Check if user has purchased (if userId provided)
        let isPurchased = false
        if (userId) {
            const purchase = await userStudySetRepo.findOne({
                where: {
                    user: { id: userId },
                    studySet: { id: studySetId },
                },
            })
            isPurchased = !!purchase
        }

        // Check access: user can view if:
        // 1. It's their own study set
        // 2. It's public and published
        // 3. They have purchased it
        const isOwner = studySet.owner.id === userId
        const isPublicAndPublished =
            studySet.visibility === StudySetVisibility.PUBLIC &&
            studySet.status === StudySetStatus.PUBLISHED

        if (!isOwner && !isPublicAndPublished && !isPurchased) {
            throw new BadRequestError({ message: 'You do not have access to this study set' })
        }

        // Exclude password từ owner
        if (studySet.owner) {
            const { password, ...ownerWithoutPassword } = studySet.owner as any
            return {
                ...studySet,
                owner: ownerWithoutPassword,
                isPurchased,
            }
        }

        return {
            ...studySet,
            isPurchased,
        }
    }

    updateStudySetById = async (
        studySetId: number,
        ownerId: number,
        data: UpdateStudySetBodyReq
    ) => {
        const studySetRepo = await this.db.getRepository(StudySet)
        const flashcardRepo = await this.db.getRepository(Flashcard)
        const quizRepo = await this.db.getRepository(Quiz)

        const studySet = await studySetRepo.findOne({
            where: { id: studySetId },
            relations: ['owner'],
        })

        if (!studySet) {
            throw new BadRequestError({ message: 'Study set not found' })
        }

        // Check ownership
        if (studySet.owner.id !== ownerId) {
            throw new BadRequestError({ message: 'You do not have permission to update this study set' })
        }

        // Update basic fields
        if (data.title !== undefined) studySet.title = data.title
        if (data.description !== undefined) studySet.description = data.description
        if (data.price !== undefined) studySet.price = data.price

        // Update visibility và tự động update status nếu cần
        if (data.visibility !== undefined) {
            studySet.visibility = data.visibility
            // Nếu đổi từ PRIVATE sang PUBLIC → status = PENDING_APPROVAL
            // Nếu đổi từ PUBLIC sang PRIVATE → status = DRAFT
            if (data.visibility === StudySetVisibility.PUBLIC && studySet.status !== StudySetStatus.PUBLISHED) {
                studySet.status = StudySetStatus.PENDING_APPROVAL
            } else if (data.visibility === StudySetVisibility.PRIVATE && studySet.status === StudySetStatus.PENDING_APPROVAL) {
                studySet.status = StudySetStatus.DRAFT
            }
        }

        await studySetRepo.save(studySet)

        // Update flashcards if provided
        if (data.flashcards !== undefined) {
            // Delete existing flashcards
            await flashcardRepo.delete({ studySet: { id: studySetId } })

            // Create new flashcards
            if (data.flashcards.length > 0) {
                const flashcards = data.flashcards.map((fc: FlashcardInputReq) =>
                    flashcardRepo.create({
                        studySet: studySet,
                        frontText: fc.frontText,
                        backText: fc.backText,
                        example: fc.example,
                        audioUrl: fc.audioUrl,
                        imageUrl: fc.imageUrl,
                    })
                )
                await flashcardRepo.save(flashcards)
            }
        }

        // Update quizzes if provided
        if (data.quizzes !== undefined) {
            // Delete existing quizzes
            await quizRepo.delete({ studySet: { id: studySetId } })

            // Create new quizzes
            if (data.quizzes.length > 0) {
                const quizzes = data.quizzes.map((q: QuizInputReq) =>
                    quizRepo.create({
                        studySet: studySet,
                        type: q.type,
                        question: q.question,
                        options: q.options,
                        correctAnswer: q.correctAnswer,
                    })
                )
                await quizRepo.save(quizzes)
            }
        }

        // Return updated study set và exclude password từ owner
        const updatedStudySet = await studySetRepo.findOne({
            where: { id: studySetId },
            relations: ['owner', 'flashcards', 'quizzes'],
        })

        if (updatedStudySet && updatedStudySet.owner) {
            const { password, ...ownerWithoutPassword } = updatedStudySet.owner as any
            return {
                ...updatedStudySet,
                owner: ownerWithoutPassword,
            }
        }

        return updatedStudySet
    }

    deleteStudySetById = async (studySetId: number, ownerId: number) => {
        const studySetRepo = await this.db.getRepository(StudySet)

        const studySet = await studySetRepo.findOne({
            where: { id: studySetId },
            relations: ['owner'],
        })

        if (!studySet) {
            throw new BadRequestError({ message: 'Study set not found' })
        }

        // Check ownership
        if (studySet.owner.id !== ownerId) {
            throw new BadRequestError({ message: 'You do not have permission to delete this study set' })
        }

        await studySetRepo.remove(studySet)

        return { message: 'Study set deleted successfully' }
    }

    buyStudySet = async (studySetId: number, userId: number, ipAddr: string) => {
        const studySetRepo = await this.db.getRepository(StudySet)
        const userStudySetRepo = await this.db.getRepository(UserStudySet)
        const transactionRepo = await this.db.getRepository(Transaction)

        // Check study set exists
        const studySet = await studySetRepo.findOne({
            where: { id: studySetId },
            relations: ['owner'],
        })

        if (!studySet) {
            throw new BadRequestError({ message: 'Study set not found' })
        }

        // Check if user is owner
        if (studySet.owner.id === userId) {
            throw new BadRequestError({ message: 'You cannot buy your own study set' })
        }

        // Check if already purchased
        const existingPurchase = await userStudySetRepo.findOne({
            where: {
                user: { id: userId },
                studySet: { id: studySetId },
            },
        })

        if (existingPurchase) {
            throw new BadRequestError({ message: 'You have already purchased this study set' })
        }

        // Check if study set is free
        if (studySet.price === 0) {
            // Free study set - directly add to user's purchased list
            const userStudySet = userStudySetRepo.create({
                user: { id: userId } as any,
                studySet: { id: studySetId } as any,
                purchasePrice: 0,
            })
            await userStudySetRepo.save(userStudySet)

            // Emit purchase event for free study set
            const buyer = await User.findOne({ where: { id: userId } })
            const ownerId = studySet.owner.id

            if (buyer && ownerId && ownerId !== userId) {
                eventBus.emit(EVENTS.ORDER, {
                    buyer,
                    studySetId,
                    studySetOwnerId: ownerId,
                    amount: 0,
                    isFree: true
                })
            }

            return {
                paymentUrl: null,
                isFree: true,
                message: 'Study set added to your library successfully',
            }
        }

        // Paid study set - create VNPay payment URL and transaction
        const orderId = `STUDYSET_${studySetId}_${userId}_${uuidv4().substring(0, 8)}`
        const orderInfo = `Mua study set ${studySet.title}`

        // Create transaction record
        const transaction = transactionRepo.create({
            user: { id: userId } as any,
            studySet: { id: studySetId } as any,
            amount: Number(studySet.price),
            method: PaymentMethod.VNPAY,
            status: TransactionStatus.PENDING,
            orderId: orderId,
        })
        await transactionRepo.save(transaction)

        const paymentUrl = createVNPayPaymentUrl({
            amount: Number(studySet.price),
            orderId,
            orderInfo
        })

        return {
            paymentUrl,
            isFree: false,
            orderId,
            amount: studySet.price,
            transactionId: transaction.id,
        }
    }
}

export const studySetService = new StudySetService()

