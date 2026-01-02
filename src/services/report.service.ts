import { BadRequestError } from '../core/error.response'
import { CreateReportBodyReq } from '../dtos/req/report/createReportBody.req'
import { GetAllReportsQueryReq } from '../dtos/req/report/getAllReportsQuery.req'
import { UpdateReportStatusBodyReq } from '../dtos/req/report/updateReportStatusBody.req'
import { Comment } from '../entities/comment.entity'
import { Post } from '../entities/post.entity'
import { Report } from '../entities/report.entity'
import { StudySet } from '../entities/studySet.entity'
import { User } from '../entities/user.entity'
import { ReportStatus } from '../enums/reportStatus.enum'
import { TargetType } from '../enums/targetType.enum'
import { FindOptionsWhere } from 'typeorm'
import eventBus from '../events-handler/eventBus'
import { EVENTS } from '../events-handler/constants'

class ReportService {
    createReport = async (userId: number, { targetType, targetId, reportType, reason }: CreateReportBodyReq) => {
        // Validate target exists
        let targetExists = false

        switch (targetType) {
            case TargetType.POST:
                targetExists = await Post.exists({ where: { id: targetId } })
                break
            case TargetType.STUDY_SET:
                targetExists = await StudySet.exists({ where: { id: targetId } })
                break
            case TargetType.COMMENT:
                targetExists = await Comment.exists({ where: { id: targetId } })
                break
            default:
                throw new BadRequestError({ message: 'Invalid target type!' })
        }

        if (!targetExists) {
            throw new BadRequestError({ message: `${targetType} with id ${targetId} not found!` })
        }

        // Create report
        const report = new Report()
        report.createdBy = { id: userId } as User
        report.targetType = targetType
        report.targetId = targetId
        report.reportType = reportType
        report.reason = reason || ''

        return await report.save()
    }

    getAllReports = async ({ page = 1, limit = 10, sort, status, targetType, reportType, createdBy, search }: GetAllReportsQueryReq) => {
        const skip = (page - 1) * limit

        const where: FindOptionsWhere<Report> = {}

        if (status) {
            where.status = status
        }

        if (targetType) {
            where.targetType = targetType
        }

        if (reportType) {
            where.reportType = reportType
        }

        if (createdBy) {
            where.createdBy = { id: createdBy }
        }

        // Search by reason using LIKE
        let queryBuilder = Report.createQueryBuilder('report')
            .leftJoinAndSelect('report.createdBy', 'createdBy')
            .select([
                'report.id',
                'report.targetType',
                'report.targetId',
                'report.reportType',
                'report.reason',
                'report.status',
                'report.createdAt',
                'createdBy.id',
                'createdBy.username',
                'createdBy.avatar'
            ])

        // Apply filters
        if (status) {
            queryBuilder = queryBuilder.andWhere('report.status = :status', { status })
        }
        if (targetType) {
            queryBuilder = queryBuilder.andWhere('report.targetType = :targetType', { targetType })
        }
        if (reportType) {
            queryBuilder = queryBuilder.andWhere('report.reportType = :reportType', { reportType })
        }
        if (createdBy) {
            queryBuilder = queryBuilder.andWhere('report.createdBy = :createdBy', { createdBy })
        }
        if (search) {
            // Normalize search term (trim and lowercase)
            const normalizedSearch = search.trim().toLowerCase()

            // LEFT JOIN with Post, StudySet, Comment to search in their content
            queryBuilder = queryBuilder
                .leftJoin('Post', 'post', 'report.targetType = :postType AND report.targetId = post.id', { postType: TargetType.POST })
                .leftJoin('StudySet', 'studySet', 'report.targetType = :studySetType AND report.targetId = studySet.id', { studySetType: TargetType.STUDY_SET })
                .leftJoin('Comment', 'comment', 'report.targetType = :commentType AND report.targetId = comment.id', { commentType: TargetType.COMMENT })
                .andWhere(
                    `(
                        LOWER(report.reason) LIKE :search OR
                        LOWER(post.title) LIKE :search OR
                        LOWER(post.content) LIKE :search OR
                        LOWER(studySet.title) LIKE :search OR
                        LOWER(comment.content) LIKE :search
                    )`,
                    { search: `%${normalizedSearch}%` }
                )
        }

        // Apply sorting
        if (sort) {
            Object.entries(sort).forEach(([key, value]) => {
                queryBuilder = queryBuilder.addOrderBy(`report.${key}`, value as 'ASC' | 'DESC')
            })
        } else {
            queryBuilder = queryBuilder.orderBy('report.createdAt', 'DESC')
        }

        // Pagination
        const [reports, total] = await queryBuilder
            .skip(skip)
            .take(limit)
            .getManyAndCount()

        // Enrich reports with basic target info
        const enrichedReports = await Promise.all(
            reports.map(async (report) => {
                let targetInfo: any = null

                try {
                    switch (report.targetType) {
                        case TargetType.POST:
                            const post = await Post.findOne({
                                where: { id: report.targetId },
                                select: { id: true, title: true, content: true },
                                withDeleted: true // Admin can see deleted posts
                            })
                            if (post) {
                                targetInfo = {
                                    id: post.id,
                                    title: post.title,
                                    preview: post.content?.substring(0, 100)
                                }
                            }
                            break
                        case TargetType.STUDY_SET:
                            const studySet = await StudySet.findOne({
                                where: { id: report.targetId },
                                select: { id: true, title: true, description: true },
                                withDeleted: true // Admin can see deleted studysets
                            })
                            if (studySet) {
                                targetInfo = {
                                    id: studySet.id,
                                    title: studySet.title,
                                    preview: studySet.description?.substring(0, 100)
                                }
                            }
                            break
                        case TargetType.COMMENT:
                            const comment = await Comment.findOne({
                                where: { id: report.targetId },
                                select: { id: true, content: true },
                                withDeleted: true // Admin can see deleted comments
                            })
                            if (comment) {
                                targetInfo = {
                                    id: comment.id,
                                    preview: comment.content?.substring(0, 100)
                                }
                            }
                            break
                    }
                } catch (error) {
                    // Target might be inaccessible
                }

                return {
                    ...report,
                    targetInfo
                }
            })
        )

        return {
            reports: enrichedReports,
            currentPage: page,
            total,
            totalPages: Math.ceil(total / limit)
        }
    }

    getReportById = async (id: number) => {
        const report = await Report.findOne({
            where: { id },
            select: {
                id: true,
                targetType: true,
                targetId: true,
                reportType: true,
                reason: true,
                status: true,
                createdAt: true,
                createdBy: {
                    id: true,
                    username: true,
                    avatar: true,
                    email: true
                }
            },
            relations: ['createdBy']
        })

        if (!report) {
            throw new BadRequestError({ message: 'Report not found!' })
        }

        // Get comprehensive target details
        let targetDetails: any = null
        let parentContent: any = null

        try {
            switch (report.targetType) {
                case TargetType.POST:
                    const post = await Post.findOne({
                        where: { id: report.targetId },
                        select: {
                            id: true,
                            title: true,
                            content: true,
                            thumbnails: true,
                            tags: true,
                            topic: true,
                            status: true,
                            createdAt: true,
                            createdBy: {
                                id: true,
                                username: true,
                                avatar: true,
                                email: true
                            }
                        },
                        relations: ['createdBy'],
                        withDeleted: true
                    })
                    targetDetails = post
                    break

                case TargetType.STUDY_SET:
                    const studySet = await StudySet.findOne({
                        where: { id: report.targetId },
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            visibility: true,
                            price: true,
                            status: true,
                            createdAt: true,
                            owner: {
                                id: true,
                                username: true,
                                avatar: true,
                                email: true
                            }
                        },
                        relations: ['owner']
                    })
                    targetDetails = studySet
                    break

                case TargetType.COMMENT:
                    const comment = await Comment.findOne({
                        where: { id: report.targetId },
                        select: {
                            id: true,
                            content: true,
                            targetType: true,
                            targetId: true,
                            createdAt: true,
                            createdBy: {
                                id: true,
                                username: true,
                                avatar: true,
                                email: true
                            }
                        },
                        relations: ['createdBy'],
                        withDeleted: true
                    })
                    targetDetails = comment

                    // Get parent content (post or study set containing the comment)
                    if (comment) {
                        if (comment.targetType === TargetType.POST) {
                            parentContent = await Post.findOne({
                                where: { id: comment.targetId },
                                select: {
                                    id: true,
                                    title: true,
                                    content: true,
                                    createdBy: {
                                        id: true,
                                        username: true,
                                        avatar: true
                                    }
                                },
                                relations: ['createdBy'],
                                withDeleted: true
                            })
                        } else if (comment.targetType === TargetType.STUDY_SET) {
                            parentContent = await StudySet.findOne({
                                where: { id: comment.targetId },
                                select: {
                                    id: true,
                                    title: true,
                                    description: true,
                                    owner: {
                                        id: true,
                                        username: true,
                                        avatar: true
                                    }
                                },
                                relations: ['owner']
                            })
                        }
                    }
                    break
            }
        } catch (error) {
            // Target might be deleted or inaccessible
        }

        // Get report history for the same target (other reports)
        const reportHistory = await Report.find({
            where: {
                targetType: report.targetType,
                targetId: report.targetId
            },
            select: {
                id: true,
                reportType: true,
                reason: true,
                status: true,
                createdAt: true,
                createdBy: {
                    id: true,
                    username: true,
                    avatar: true
                }
            },
            relations: ['createdBy'],
            order: { createdAt: 'DESC' }
        })

        return {
            ...report,
            targetDetails,
            parentContent,
            reportHistory: reportHistory.map(r => ({
                id: r.id,
                reportType: r.reportType,
                reason: r.reason,
                status: r.status,
                createdAt: r.createdAt,
                createdBy: {
                    id: r.createdBy.id,
                    username: r.createdBy.username,
                    avatar: r.createdBy.avatar
                }
            })),
            totalReports: reportHistory.length
        }
    }

    updateReportStatus = async (id: number, { status }: UpdateReportStatusBodyReq) => {
        const report = await Report.findOne({
            where: { id }
        })

        if (!report) {
            throw new BadRequestError({ message: 'Report not found!' })
        }

        // Validate status transition
        if (status === ReportStatus.PENDING) {
            throw new BadRequestError({ message: 'Cannot change status back to PENDING!' })
        }

        report.status = status
        return await report.save()
    }

    handleReport = async (id: number, { status, actions }: any) => {
        const report = await Report.findOne({
            where: { id },
            select: {
                id: true,
                targetType: true,
                targetId: true,
                status: true,
                reason: true,
                reportType: true,
                createdAt: true,
                createdBy: {
                    id: true,
                    username: true,
                    avatar: true
                }
            },
            relations: ['createdBy']
        })

        if (!report) {
            throw new BadRequestError({ message: 'Report not found!' })
        }

        // Validate status transition
        if (status === ReportStatus.PENDING) {
            throw new BadRequestError({ message: 'Cannot change status back to PENDING!' })
        }

        // Update report status
        report.status = status
        await report.save()

        const actionResults: any[] = []

        // Execute actions if report is accepted and actions are provided
        if (status === ReportStatus.ACCEPTED && actions && actions.length > 0) {
            for (const action of actions) {
                const { type, reason, duration } = action
                const actionResult: any = { type }

                // Get content owner for user actions
                let contentOwnerId: number | null = null

                switch (type) {
                    case 'DELETE_CONTENT':
                        // Soft delete content (admin can still view with withDeleted)
                        switch (report.targetType) {
                            case TargetType.POST:
                                const post = await Post.findOne({
                                    where: { id: report.targetId },
                                    relations: ['createdBy']
                                })
                                if (post) {
                                    contentOwnerId = post.createdBy.id
                                    await post.softRemove()
                                    actionResult.deleted = true
                                    actionResult.message = 'Post soft deleted'
                                }
                                break
                            case TargetType.COMMENT:
                                const comment = await Comment.findOne({
                                    where: { id: report.targetId },
                                    relations: ['createdBy']
                                })
                                if (comment) {
                                    contentOwnerId = comment.createdBy.id
                                    await comment.softRemove()
                                    actionResult.deleted = true
                                    actionResult.message = 'Comment soft deleted'
                                }
                                break
                            case TargetType.STUDY_SET:
                                const studySet = await StudySet.findOne({
                                    where: { id: report.targetId },
                                    relations: ['owner']
                                })
                                if (studySet) {
                                    contentOwnerId = studySet.owner.id
                                    await studySet.softRemove()
                                    actionResult.deleted = true
                                    actionResult.message = 'Study set soft deleted'
                                }
                                break
                        }

                        // Emit content deleted event to notify user
                        if (contentOwnerId) {
                            eventBus.emit(EVENTS.CONTENT_DELETED, {
                                userId: contentOwnerId,
                                reason: reason || 'Nội dung vi phạm quy định cộng đồng',
                                reportId: report.id,
                                targetType: report.targetType,
                                targetId: report.targetId
                            })

                            actionResult.notified = true
                        }
                        break

                    case 'WARN_USER':
                        // Get content owner
                        switch (report.targetType) {
                            case TargetType.POST:
                                const post = await Post.findOne({ where: { id: report.targetId }, relations: ['createdBy'] })
                                contentOwnerId = post?.createdBy.id || null
                                break
                            case TargetType.COMMENT:
                                const comment = await Comment.findOne({ where: { id: report.targetId }, relations: ['createdBy'] })
                                contentOwnerId = comment?.createdBy.id || null
                                break
                            case TargetType.STUDY_SET:
                                const studySet = await StudySet.findOne({ where: { id: report.targetId }, relations: ['owner'] })
                                contentOwnerId = studySet?.owner.id || null
                                break
                        }

                        // Emit warning event
                        if (contentOwnerId) {
                            eventBus.emit(EVENTS.WARNING, {
                                userId: contentOwnerId,
                                reason: reason || 'Nội dung của bạn đã bị báo cáo và vi phạm quy định cộng đồng.',
                                reportId: report.id,
                                targetType: report.targetType,
                                targetId: report.targetId
                            })

                            actionResult.warned = true
                            actionResult.userId = contentOwnerId
                            actionResult.message = 'User warned (notification will be sent)'
                        } else {
                            actionResult.warned = false
                            actionResult.message = 'Content owner not found, warning not sent'
                        }
                        break

                    case 'SUSPEND_USER':
                        // Get content owner
                        switch (report.targetType) {
                            case TargetType.POST:
                                const post = await Post.findOne({ where: { id: report.targetId }, relations: ['createdBy'] })
                                contentOwnerId = post?.createdBy.id || null
                                break
                            case TargetType.COMMENT:
                                const comment = await Comment.findOne({ where: { id: report.targetId }, relations: ['createdBy'] })
                                contentOwnerId = comment?.createdBy.id || null
                                break
                            case TargetType.STUDY_SET:
                                const studySet = await StudySet.findOne({ where: { id: report.targetId }, relations: ['owner'] })
                                contentOwnerId = studySet?.owner.id || null
                                break
                        }

                        if (contentOwnerId) {
                            const user = await User.findOne({ where: { id: contentOwnerId } })
                            if (user) {
                                user.status = 'SUSPENDED' as any
                                const suspendedUntil = new Date()
                                suspendedUntil.setDate(suspendedUntil.getDate() + (duration || 7))
                                user.suspendedUntil = suspendedUntil
                                await user.save()

                                actionResult.suspended = true
                                actionResult.userId = contentOwnerId
                                actionResult.suspendedUntil = suspendedUntil
                                actionResult.message = `User suspended for ${duration || 7} days`
                            }
                        }
                        break

                    case 'BAN_USER':
                        // Get content owner
                        switch (report.targetType) {
                            case TargetType.POST:
                                const post = await Post.findOne({ where: { id: report.targetId }, relations: ['createdBy'] })
                                contentOwnerId = post?.createdBy.id || null
                                break
                            case TargetType.COMMENT:
                                const comment = await Comment.findOne({ where: { id: report.targetId }, relations: ['createdBy'] })
                                contentOwnerId = comment?.createdBy.id || null
                                break
                            case TargetType.STUDY_SET:
                                const studySet = await StudySet.findOne({ where: { id: report.targetId }, relations: ['owner'] })
                                contentOwnerId = studySet?.owner.id || null
                                break
                        }

                        if (contentOwnerId) {
                            const user = await User.findOne({ where: { id: contentOwnerId } })
                            if (user) {
                                user.status = 'BANNED' as any
                                user.banReason = reason || 'Serious content violation'
                                await user.save()

                                actionResult.banned = true
                                actionResult.userId = contentOwnerId
                                actionResult.message = 'User banned permanently'
                            }
                        }
                        break
                }

                actionResults.push(actionResult)
            }
        }

        // Auto-resolve other pending reports on the same target
        const relatedPendingReports = await Report.find({
            where: {
                targetType: report.targetType,
                targetId: report.targetId,
                status: ReportStatus.PENDING
            }
        })

        if (relatedPendingReports.length > 0) {
            await Report.update(
                {
                    targetType: report.targetType,
                    targetId: report.targetId,
                    status: ReportStatus.PENDING
                },
                {
                    status: status
                }
            )
        }

        return {
            report,
            actions: actionResults,
            autoResolvedCount: relatedPendingReports.length
        }
    }

    deleteReport = async (id: number) => {
        const report = await Report.findOne({
            where: { id }
        })

        if (!report) {
            throw new BadRequestError({ message: 'Report not found!' })
        }

        await report.remove()
        return {}
    }
}

export const reportService = new ReportService()
