import { sendMessage } from '~/sockets'
import { EVENTS } from '~/events-handler/constants'
import { User } from '~/entities/user.entity'
import { TargetType } from '~/enums/targetType.enum'
import eventBus from '~/events-handler/eventBus'
import { NotificationTarget, NotificationType } from '~/enums/notification.enum'
import { notificationService } from '~/services/notification.service'

eventBus.on(
    EVENTS.COMMENT,
    async ({
        createdBy,
        ownerId,
        targetId,
        targetType,
        parentCommentOwnerId,
        parentCommentId
    }: {
        targetId: number
        ownerId: number
        createdBy: User
        targetType: TargetType
        parentCommentOwnerId?: number
        parentCommentId: number
    }) => {
        //create notification
        const { ownerNotification, parentCommentOwnerNotification } = await createCommentNotification(
            targetId,
            targetType,
            ownerId,
            createdBy,
            parentCommentId,
            parentCommentOwnerId
        )

        // Gửi notification cho chủ bài viết (nếu có)
        if (ownerNotification) {
            sendMessage({ event: 'notification', userId: ownerId, data: ownerNotification })
        }

        // Gửi notification cho chủ comment cha (nếu đang reply)
        if (parentCommentOwnerNotification)
            sendMessage({
                event: 'notification',
                userId: parentCommentOwnerId as number,
                data: parentCommentOwnerNotification
            })
    }
)

const formatNotificationPayload = (notification: any, userNotification: any) => {
    return {
        id: userNotification.id,
        isRead: userNotification.isRead,
        readAt: userNotification.readAt,
        type: notification.type,
        message: notification.data?.message,
        data: notification.data?.data,
        target: notification.target,
        createdAt: userNotification.createdAt
    }
}

const createCommentNotification = async (
    targetId: number,
    targetType: TargetType,
    ownerId: number,
    createdBy: User,
    parentCommentId: number,
    parentCommentOwnerId?: number
) => {
    // Chuyển targetType thành label tiếng Việt
    const targetTypeLabel = targetType === TargetType.POST
        ? 'Bài viết'
        : targetType === TargetType.STUDY_SET
            ? 'Học liệu'
            : 'Bình luận'

    // Kiểm tra xem có đang reply comment của chủ bài viết không
    const isReplyingToOwner = parentCommentOwnerId && parentCommentOwnerId === ownerId

    // Chỉ tạo notification cho chủ bài viết nếu:
    // 1. Không phải chính họ comment
    // 2. Không phải đang reply comment của chính họ (tránh duplicate)
    let ownerNotification = null
    if (ownerId !== createdBy.id && !isReplyingToOwner) {
        const { notification, userNotifications } = await notificationService.createNotification(
            NotificationType.COMMENT,
            {
                message: `${targetTypeLabel} của bạn đã được ${createdBy.username} bình luận`,
                data: {
                    targetId,
                    targetType,
                    ownerId,
                    ...(targetType === TargetType.POST && { postId: targetId }), // Thêm postId nếu là POST
                    createdBy: {
                        id: createdBy.id,
                        email: createdBy.email,
                        username: createdBy.username,
                        avatar: createdBy.avatar
                    }
                }
            },
            NotificationTarget.ONLY_USER,
            [ownerId]
        )
        if (userNotifications && userNotifications.length > 0) {
            ownerNotification = formatNotificationPayload(notification, userNotifications[0])
        }
    }

    //send notification for parent comment owner
    let parentCommentOwnerNotification = null
    if (parentCommentOwnerId && createdBy.id != parentCommentOwnerId) {
        const { notification, userNotifications } = await notificationService.createNotification(
            NotificationType.COMMENT,
            {
                message: `${createdBy.username} đã trả lời bình luận của bạn ở ${targetTypeLabel.toLowerCase()}`,
                data: {
                    targetId,
                    targetType,
                    ownerId,
                    createdBy: {
                        id: createdBy.id,
                        email: createdBy.email,
                        username: createdBy.username,
                        avatar: createdBy.avatar
                    },
                    parentCommentId
                }
            },
            NotificationTarget.ONLY_USER,
            [parentCommentOwnerId]
        )
        if (userNotifications && userNotifications.length > 0) {
            parentCommentOwnerNotification = formatNotificationPayload(notification, userNotifications[0])
        }
    }

    return {
        ownerNotification,
        parentCommentOwnerNotification
    }
}
