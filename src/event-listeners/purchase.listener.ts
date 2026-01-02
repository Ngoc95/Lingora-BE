import { sendMessage } from '../sockets'
import { EVENTS } from '../events-handler/constants'
import { User } from '../entities/user.entity'
import { StudySet } from '../entities/studySet.entity'
import eventBus from '../events-handler/eventBus'
import { NotificationTarget, NotificationType } from '../enums/notification.enum'
import { notificationService } from '../services/notification.service'

eventBus.on(
    EVENTS.ORDER,
    async ({
        buyer,
        studySetId,
        studySetOwnerId,
        amount,
        isFree
    }: {
        buyer: User
        studySetId: number
        studySetOwnerId: number
        amount: number
        isFree: boolean
    }) => {
        // Don't send notification if user purchases their own study set
        if (!studySetOwnerId || studySetOwnerId === buyer.id) {
            return
        }

        // Get study set details for notification
        const studySet = await StudySet.findOne({
            where: { id: studySetId },
            select: {
                id: true,
                title: true,
                owner: {
                    id: true
                }
            },
            relations: ['owner']
        })

        if (!studySet) {
            console.error('Study set not found in purchase listener:', studySetId)
            return
        }

        // Create notification
        const purchaseNotification = await createPurchaseNotification(
            buyer,
            studySetId,
            studySet.title,
            studySetOwnerId,
            amount,
            isFree
        )

        // Send notification via socket
        sendMessage({ event: 'notification', userId: studySetOwnerId, data: purchaseNotification })
    }
)

const createPurchaseNotification = async (
    buyer: User,
    studySetId: number,
    studySetTitle: string,
    ownerId: number,
    amount: number,
    isFree: boolean
) => {
    const message = isFree
        ? `${buyer.username} đã tải xuống study set "${studySetTitle}" của bạn`
        : `${buyer.username} đã mua study set "${studySetTitle}" của bạn với giá ${amount.toLocaleString('vi-VN')}đ`

    const notification = await notificationService.createNotification(
        NotificationType.ORDER,
        {
            message,
            data: {
                studySetId,
                studySetTitle,
                amount,
                isFree,
                buyer: {
                    id: buyer.id,
                    email: buyer.email,
                    username: buyer.username,
                    avatar: buyer.avatar
                }
            }
        },
        NotificationTarget.ONLY_USER,
        [ownerId]
    )

    return notification
}

