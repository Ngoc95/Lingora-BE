import { BadRequestError } from '~/core/error.response'
import { Notification } from '~/entities/notification.entity'
import { UserNotification } from '~/entities/userNotification.entity'
import { NotificationTarget, NotificationType } from '~/enums/notification.enum'

class NotificationService {
    createNotification = async (type: NotificationType, data: any, target: NotificationTarget, users: number[]) => {
        const notification = Notification.create({
            data,
            target,
            type
        })

        const newNotification = await notification.save()

        //target notification != all ==> create notification for each user
        if (target != NotificationTarget.ALL) {
            this.createUserNotification(newNotification.id, users)
        }

        return newNotification
    }

    createUserNotification = async (notificationId: number, users: number[]) => {
        const userNotifications = users.map((userId) => {
            return UserNotification.create({
                notification: {
                    id: notificationId
                },
                user: {
                    id: userId
                }
            })
        })

        return await UserNotification.save(userNotifications)
    }

    getAllNotifications = async (userId: number, { page = 1, limit = 10 }: { page?: number; limit?: number }) => {
        const skip = (page - 1) * limit

        const [notifications, total] = await UserNotification.findAndCount({
            skip,
            take: limit,
            where: {
                user: {
                    id: userId
                }
            },
            order: {
                createdAt: "DESC"
            },
            select: {
                notification: true,
                isRead: true,
                readAt: true,
                user: {
                    id: true
                },
                id: true,
                createdAt: true,
                deletedAt: true,
                updatedAt: true
            },
            relations: {
                user: true,
                notification: true
            }
        })

        return {
            notifications,
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit)
        }
    }

    updateReadNotification = async (userId: number, notificationId: number) => {
        const foundNotifaction = await UserNotification.findOne({
            where: {
                id: notificationId,
                user: {
                    id: userId
                }
            },

            select: {
                isRead: true,
                createdAt: true,
                deletedAt: true,
                notification: true,
                user: {
                    id: true
                },
                readAt: true,
                id: true
            },
            relations: {
                notification: true,
                user: true
            }
        })

        if (!foundNotifaction) throw new BadRequestError({ message: 'Notification not found' })

        //update
        if (!foundNotifaction.isRead) {
            foundNotifaction.isRead = true
            foundNotifaction.readAt = new Date()
        }

        return await foundNotifaction.save()
    }
}

export const notificationService = new NotificationService()
