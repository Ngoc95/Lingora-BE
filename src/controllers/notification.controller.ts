import { Request, Response } from 'express'
import { CREATED } from '~/core/success.response'
import { User } from '~/entities/user.entity'
import { notificationService } from '~/services/notification.service'

class NotificationController {
  getAllNotifications = async (req: Request, res: Response) => {
    const userId = (req.user as User).id as number

    return new CREATED({
      message: "Get user's notification successfully",
      metaData: await notificationService.getAllNotifications(userId, { ...req.parseQueryPagination })
    }).send(res)
  }

  updateReadNotification = async (req: Request, res: Response) => {
    const notificationId = parseInt(req.params.id)
    const userId = req.user?.id as number

    return new CREATED({
      message: "Update user's notification successfully",
      metaData: await notificationService.updateReadNotification(userId, notificationId)
    }).send(res)
  }
}

export const notificationController = new NotificationController()
