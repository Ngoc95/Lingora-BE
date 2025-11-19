import { DatabaseService } from './database.service'
import { StudySet } from '~/entities/studySet.entity'
import { BadRequestError } from '~/core/error.response'
import { GetStudySetsQueryReq } from '~/dtos/req/studySet/getStudySetsQuery.req'
import { FindOptionsWhere, ILike } from 'typeorm'
import validator from 'validator'
import { StudySetStatus } from '~/enums/studySetStatus.enum'
import { StudySetVisibility } from '~/enums/studySetVisibility.enum'

class AdminStudySetService {
    private db = DatabaseService.getInstance()

    /**
     * Get all study sets (including pending approval) for admin
     */
    getAllStudySets = async (query: GetStudySetsQueryReq) => {
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
                'studySet.createdAt',
                'studySet.updatedAt',
                'owner.id',
                'owner.username',
                'owner.email',
            ])
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

    /**
     * Get study sets pending approval
     */
    getPendingStudySets = async (query: GetStudySetsQueryReq) => {
        return this.getAllStudySets({
            ...query,
            status: StudySetStatus.PENDING_APPROVAL,
        })
    }

    /**
     * Get study set by id (admin can view all)
     */
    getStudySetById = async (studySetId: number) => {
        const studySetRepo = await this.db.getRepository(StudySet)

        const studySet = await studySetRepo.findOne({
            where: { id: studySetId },
            relations: ['owner', 'flashcards', 'quizzes'],
        })

        if (!studySet) {
            throw new BadRequestError({ message: 'Study set not found' })
        }

        return studySet
    }

    /**
     * Approve study set (change status to PUBLISHED)
     */
    approveStudySet = async (studySetId: number) => {
        const studySetRepo = await this.db.getRepository(StudySet)

        const studySet = await studySetRepo.findOne({
            where: { id: studySetId },
        })

        if (!studySet) {
            throw new BadRequestError({ message: 'Study set not found' })
        }

        if (studySet.status !== StudySetStatus.PENDING_APPROVAL) {
            throw new BadRequestError({
                message: `Study set status must be PENDING_APPROVAL. Current status: ${studySet.status}`,
            })
        }

        studySet.status = StudySetStatus.PUBLISHED
        await studySetRepo.save(studySet)

        return studySet
    }

    /**
     * Reject study set (change status to REJECTED)
     */
    rejectStudySet = async (studySetId: number, reason?: string) => {
        const studySetRepo = await this.db.getRepository(StudySet)

        const studySet = await studySetRepo.findOne({
            where: { id: studySetId },
        })

        if (!studySet) {
            throw new BadRequestError({ message: 'Study set not found' })
        }

        if (studySet.status !== StudySetStatus.PENDING_APPROVAL) {
            throw new BadRequestError({
                message: `Study set status must be PENDING_APPROVAL. Current status: ${studySet.status}`,
            })
        }

        studySet.status = StudySetStatus.REJECTED
        await studySetRepo.save(studySet)

        return {
            ...studySet,
            rejectionReason: reason,
        }
    }

    /**
     * Update study set status (admin can change any status)
     */
    updateStudySetStatus = async (studySetId: number, status: StudySetStatus) => {
        const studySetRepo = await this.db.getRepository(StudySet)

        const studySet = await studySetRepo.findOne({
            where: { id: studySetId },
        })

        if (!studySet) {
            throw new BadRequestError({ message: 'Study set not found' })
        }

        if (!Object.values(StudySetStatus).includes(status)) {
            throw new BadRequestError({ message: 'Invalid status' })
        }

        studySet.status = status
        await studySetRepo.save(studySet)

        return studySet
    }

    /**
     * Delete study set (admin can delete any)
     */
    deleteStudySetById = async (studySetId: number) => {
        const studySetRepo = await this.db.getRepository(StudySet)

        const studySet = await studySetRepo.findOne({
            where: { id: studySetId },
        })

        if (!studySet) {
            throw new BadRequestError({ message: 'Study set not found' })
        }

        await studySetRepo.remove(studySet)

        return { message: 'Study set deleted successfully' }
    }
}

export const adminStudySetService = new AdminStudySetService()

