import { Request, Response } from 'express'
import { SuccessResponse } from '~/core/success.response'
import { notificationService } from '~/services/notification.service'

class NotificationController {
    getNotifications = async (req: Request, res: Response) => {
        const userId = req.user!.id
        return new SuccessResponse({
            message: 'Get notifications successfully',
            metaData: await notificationService.getUserNotifications(userId, {
                ...req.parseQueryPagination,
                ...req.parseQueryBoolean,
            }),
        }).send(res)
    }

    markAsRead = async (req: Request, res: Response) => {
        const notificationId = parseInt(req.params?.id)
        const userId = req.user!.id
        return new SuccessResponse({
            message: 'Mark notification as read successfully',
            metaData: await notificationService.markAsRead(notificationId, userId),
        }).send(res)
    }

    markAllAsRead = async (req: Request, res: Response) => {
        const userId = req.user!.id
        return new SuccessResponse({
            message: 'Mark all notifications as read successfully',
            metaData: await notificationService.markAllAsRead(userId),
        }).send(res)
    }

    getUnreadCount = async (req: Request, res: Response) => {
        const userId = req.user!.id
        return new SuccessResponse({
            message: 'Get unread count successfully',
            metaData: await notificationService.getUnreadCount(userId),
        }).send(res)
    }
}

export const notificationController = new NotificationController()

