import { sendMessage } from '~/sockets'
import { EVENTS } from '~/events-handler/constants'
import eventBus from '~/events-handler/eventBus'
import { NotificationTarget, NotificationType } from '~/enums/notification.enum'
import { notificationService } from '~/services/notification.service'
import { Classroom } from '~/entities/classroom.entity'
import { ClassroomMember } from '~/entities/classroomMember.entity'

eventBus.on(
    EVENTS.CLASSROOM_APPROVED,
    async ({
        classroom,
        member
    }: {
        classroom: Classroom
        member: ClassroomMember
    }) => {
        // Create notification text
        const message = `Bạn đã được duyệt vào lớp học "${classroom.name}"`

        // Create persistent notification in DB
        const { notification, userNotifications } = await notificationService.createNotification(
            NotificationType.CLASSROOM_APPROVED,
            {
                message,
                data: {
                    classroomId: classroom.id,
                    classroomName: classroom.name,
                    teacherId: classroom.teacher?.id
                }
            },
            NotificationTarget.ONLY_USER,
            [member.user.id]
        )

        // Format payload to match frontend expectation
        const payload = {
            id: userNotifications[0]?.id,
            isRead: userNotifications[0]?.isRead || false,
            readAt: userNotifications[0]?.readAt || null,
            type: notification.type,
            message: notification.data?.message,
            data: notification.data?.data,
            target: notification.target,
            createdAt: userNotifications[0]?.createdAt || new Date()
        }

        // Send real-time notification via socket
        sendMessage({ 
            event: 'classroom:approved', 
            userId: member.user.id, 
            data: payload 
        })
    }
)
