import { BadRequestError } from '../core/error.response'
import { Notification } from '../entities/notification.entity'
import { UserNotification } from '../entities/userNotification.entity'
import { NotificationTarget, NotificationType } from '../enums/notification.enum'

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
                id: true,
                createdAt: true
            },
            relations: {
                notification: true
            }
        })

        const unreadCount = await UserNotification.countBy({
            user: { id: userId },
            isRead: false
        })

        const items = notifications.map((item) => {
            const payload = item.notification?.data || {}
            return {
                id: item.id,
                isRead: item.isRead,
                readAt: item.readAt ?? null,
                type: item.notification?.type,
                message: payload?.message,
                data: payload?.data,
                target: item.notification?.target,
                createdAt: item.createdAt
            }
        })

        return {
            total,
            unreadCount,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            notifications: items
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
