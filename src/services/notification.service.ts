import { DatabaseService } from './database.service'
import { Notification } from '~/entities/notification.entity'
import { NotificationType } from '~/enums/notificationType.enum'
import { socketService } from './socket.service'

class NotificationService {
    private db = DatabaseService.getInstance()

    /**
     * Create and send notification
     */
    createNotification = async (params: {
        userId: number
        relatedId: number
        title: string
        message: string
        type: NotificationType
    }) => {
        const notificationRepo = await this.db.getRepository(Notification)

        const notification = notificationRepo.create({
            user: { id: params.userId } as any,
            relatedId: params.relatedId,
            title: params.title,
            message: params.message,
            type: params.type,
            isRead: false,
        })

        const savedNotification = await notificationRepo.save(notification)

        // Emit notification via Socket.IO
        socketService.emitToUser(params.userId, 'notification', {
            id: savedNotification.id,
            relatedId: savedNotification.relatedId,
            title: savedNotification.title,
            message: savedNotification.message,
            type: savedNotification.type,
            isRead: savedNotification.isRead,
            createdAt: savedNotification.createdAt,
        })

        return savedNotification
    }

    /**
     * Send study set purchase notification to owner
     */
    sendStudySetPurchaseNotification = async (params: {
        studySetId: number
        studySetTitle: string
        ownerId: number
        buyerId: number
        buyerUsername: string
        amount: number
    }) => {
        return this.createNotification({
            userId: params.ownerId,
            relatedId: params.studySetId,
            title: 'Study Set được mua',
            message: `${params.buyerUsername} đã mua study set "${params.studySetTitle}" với giá ${params.amount.toLocaleString('vi-VN')} VNĐ`,
            type: NotificationType.STUDY_SET,
        })
    }

    /**
     * Get notifications for user
     */
    getUserNotifications = async (userId: number, options?: { page?: number; limit?: number; isRead?: boolean }) => {
        const notificationRepo = await this.db.getRepository(Notification)
        const page = options?.page || 1
        const limit = options?.limit || 20
        const skip = (page - 1) * limit

        const where: any = { user: { id: userId } }
        if (options?.isRead !== undefined) {
            where.isRead = options.isRead
        }

        const [notifications, total] = await notificationRepo.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            skip,
            take: limit,
        })

        return {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total,
            notifications,
        }
    }

    /**
     * Mark notification as read
     */
    markAsRead = async (notificationId: number, userId: number) => {
        const notificationRepo = await this.db.getRepository(Notification)

        const notification = await notificationRepo.findOne({
            where: { id: notificationId, user: { id: userId } },
        })

        if (!notification) {
            throw new Error('Notification not found')
        }

        notification.isRead = true
        await notificationRepo.save(notification)

        return notification
    }

    /**
     * Mark all notifications as read for user
     */
    markAllAsRead = async (userId: number) => {
        const notificationRepo = await this.db.getRepository(Notification)

        await notificationRepo.update(
            { user: { id: userId }, isRead: false },
            { isRead: true }
        )

        return { message: 'All notifications marked as read' }
    }

    /**
     * Get unread count for user
     */
    getUnreadCount = async (userId: number) => {
        const notificationRepo = await this.db.getRepository(Notification)

        const count = await notificationRepo.count({
            where: { user: { id: userId }, isRead: false },
        })

        return { unreadCount: count }
    }
}

export const notificationService = new NotificationService()

