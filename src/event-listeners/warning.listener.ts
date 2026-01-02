import { sendMessage } from '../sockets'
import { EVENTS } from '../events-handler/constants'
import eventBus from '../events-handler/eventBus'
import { NotificationTarget, NotificationType } from '../enums/notification.enum'
import { notificationService } from '../services/notification.service'
import { TargetType } from '../enums/targetType.enum'

eventBus.on(
    EVENTS.WARNING,
    async ({
        userId,
        reason,
        reportId,
        targetType,
        targetId
    }: {
        userId: number
        reason: string
        reportId: number
        targetType: TargetType
        targetId: number
    }) => {
        try {
            // Create warning notification
            const warningNotification = await createWarningNotification(
                userId,
                reason,
                reportId,
                targetType,
                targetId
            )

            // Send notification via socket
            sendMessage({ event: 'notification', userId, data: warningNotification })
        } catch (error) {
            console.error('Error sending warning notification:', error)
        }
    }
)

const createWarningNotification = async (
    userId: number,
    reason: string,
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
        NotificationType.WARNING,
        {
            title: '⚠️ Cảnh cáo vi phạm',
            message: reason || `Nội dung ${targetTypeLabel} của bạn đã bị báo cáo và vi phạm quy định cộng đồng. Vui lòng tuân thủ quy định để tránh bị khóa tài khoản.`,
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
