import { sendMessage } from '../sockets'
import { EVENTS } from '../events-handler/constants'
import eventBus from '../events-handler/eventBus'
import { NotificationTarget, NotificationType } from '../enums/notification.enum'
import { notificationService } from '../services/notification.service'
import { TargetType } from '../enums/targetType.enum'

eventBus.on(
    EVENTS.CONTENT_DELETED,
    async ({
        userId,
        reason,
        reportId,
        targetType,
        targetId
    }: {
        userId: number
        reason?: string
        reportId: number
        targetType: TargetType
        targetId: number
    }) => {
        try {
            // Create content deleted notification
            const deletionNotification = await createDeletionNotification(
                userId,
                reason,
                reportId,
                targetType,
                targetId
            )

            // Send notification via socket
            sendMessage({ event: 'notification', userId, data: deletionNotification })
        } catch (error) {
            console.error('Error sending content deletion notification:', error)
        }
    }
)

const createDeletionNotification = async (
    userId: number,
    reason: string | undefined,
    reportId: number,
    targetType: TargetType,
    targetId: number
) => {
    const targetTypeLabel =
        targetType === TargetType.POST
            ? 'bài viết'
            : targetType === TargetType.COMMENT
                ? 'bình luận'
                : 'học liệu'

    const notification = await notificationService.createNotification(
        NotificationType.CONTENT_DELETED,
        {
            title: '🗑️ Nội dung đã bị xóa',
            message: reason || `${targetTypeLabel.charAt(0).toUpperCase() + targetTypeLabel.slice(1)} của bạn đã bị xóa do vi phạm quy định cộng đồng.`,
            data: {
                reportId,
                targetType,
                targetId
            }
        },
        NotificationTarget.ONLY_USER,
        [userId]
    )

    return notification
}
