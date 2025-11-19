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

        //send notification
        sendMessage({ event: 'notification', userId: ownerId, data: ownerNotification })
        if (parentCommentOwnerNotification)
            sendMessage({
                event: 'notification',
                userId: parentCommentOwnerId as number,
                data: parentCommentOwnerNotification
            })
    }
)

const createCommentNotification = async (
    targetId: number,
    targetType: TargetType,
    ownerId: number,
    createdBy: User,
    parentCommentId: number,
    parentCommentOwnerId?: number
) => {
    //notification for owner
    const ownerNotification = await notificationService.createNotification(
        NotificationType.COMMENT,
        {
            message: `${targetType} của bạn đã được ${createdBy.username} bình luận`,
            data: {
                targetId,
                targetType,
                ownerId,
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

    //send notification for parent comment owner
    let parentCommentOwnerNotification = null
    if (parentCommentOwnerId && createdBy.id != parentCommentOwnerId) {
        parentCommentOwnerNotification = await notificationService.createNotification(
            NotificationType.COMMENT,
            {
                message: `${createdBy.username} đã trả lời bình luận của bạn ở ${targetType} `,
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
    }

    return {
        ownerNotification,
        parentCommentOwnerNotification
    }
}
