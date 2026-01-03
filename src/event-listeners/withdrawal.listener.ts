import { sendMessage } from '~/sockets'
import { EVENTS } from '~/events-handler/constants'
import eventBus from '~/events-handler/eventBus'
import { NotificationTarget, NotificationType } from '~/enums/notification.enum'
import { notificationService } from '~/services/notification.service'
import { WithdrawalStatus } from '~/enums/withdrawalStatus.enum'

interface WithdrawalEventPayload {
    userId: number
    withdrawalId: number
    amount: number
    status: WithdrawalStatus
    reason?: string
    transactionReference?: string
}

eventBus.on(
    EVENTS.WITHDRAWAL,
    async (payload: WithdrawalEventPayload) => {
        try {
            const { userId, withdrawalId, amount, status, reason, transactionReference } = payload
            
            // Create withdrawal notification
            const notification = await createWithdrawalNotification(payload)

            // Send notification via socket for real-time update
            sendMessage({ event: 'notification', userId, data: notification })
        } catch (error) {
            console.error('Error sending withdrawal notification:', error)
        }
    }
)

const createWithdrawalNotification = async (payload: WithdrawalEventPayload) => {
    const { userId, withdrawalId, amount, status, reason, transactionReference } = payload
    const formattedAmount = Number(amount).toLocaleString('vi-VN')

    let notificationType: NotificationType
    let title: string
    let message: string

    switch (status) {
        case WithdrawalStatus.PROCESSING:
            notificationType = NotificationType.WITHDRAWAL_PROCESSING
            title = '💳 Yêu cầu rút tiền đang xử lý'
            message = `Yêu cầu rút ${formattedAmount}đ của bạn đang được xử lý.`
            break

        case WithdrawalStatus.COMPLETED:
            notificationType = NotificationType.WITHDRAWAL_COMPLETED
            title = '✅ Rút tiền thành công'
            message = `Yêu cầu rút ${formattedAmount}đ của bạn đã được hoàn thành. Vui lòng kiểm tra tài khoản ngân hàng.`
            break

        case WithdrawalStatus.REJECTED:
            notificationType = NotificationType.WITHDRAWAL_REJECTED
            title = '❌ Yêu cầu rút tiền bị từ chối'
            message = `Yêu cầu rút ${formattedAmount}đ của bạn đã bị từ chối.${reason ? ` Lý do: ${reason}` : ''}`
            break

        case WithdrawalStatus.FAILED:
            notificationType = NotificationType.WITHDRAWAL_FAILED
            title = '⚠️ Rút tiền thất bại'
            message = `Yêu cầu rút ${formattedAmount}đ của bạn đã thất bại.${reason ? ` Lý do: ${reason}` : ''} Số dư đã được hoàn lại.`
            break

        default:
            return null
    }

    const notification = await notificationService.createNotification(
        notificationType,
        {
            title,
            message,
            data: {
                withdrawalId,
                amount,
                status,
                reason,
                transactionReference
            }
        },
        NotificationTarget.ONLY_USER,
        [userId]
    )

    return notification
}
