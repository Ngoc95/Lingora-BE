import { sendMessage } from '~/sockets'
import { EVENTS } from '~/events-handler/constants'
import eventBus from '~/events-handler/eventBus'
import { NotificationTarget, NotificationType } from '~/enums/notification.enum'
import { notificationService } from '~/services/notification.service'
import { Classroom } from '~/entities/classroom.entity'
import { ClassroomLesson } from '~/entities/classroomLesson.entity'
import { ClassroomMember } from '~/entities/classroomMember.entity'

// ─── CLASSROOM_APPROVED ───────────────────────────────────────────────────────
// Học sinh được giáo viên duyệt vào lớp PRIVATE (PENDING → ACTIVE)
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

        sendMessage({
            event: 'classroom:approved',
            userId: member.user.id,
            data: payload
        })
    }
)

// ─── CLASSROOM_JOIN_REQUEST ───────────────────────────────────────────────────
// Học sinh xin vào lớp PRIVATE → giáo viên nhận thông báo
eventBus.on(
    EVENTS.CLASSROOM_JOIN_REQUEST,
    async ({
        classroom,
        member
    }: {
        classroom: Classroom
        member: ClassroomMember
    }) => {
        // Guard: teacher phải có để gửi notification
        if (!classroom.teacher?.id) return

        const teacherId = classroom.teacher.id
        const studentName = member.user?.username || 'Một học sinh'
        const message = `${studentName} đã xin tham gia lớp học "${classroom.name}"`

        const { notification, userNotifications } = await notificationService.createNotification(
            NotificationType.CLASSROOM_JOIN_REQUEST,
            {
                message,
                data: {
                    classroomId: classroom.id,
                    classroomName: classroom.name,
                    memberId: member.id,
                    studentId: member.user?.id,
                    studentName: member.user?.username,
                    studentAvatar: member.user?.avatar
                }
            },
            NotificationTarget.ONLY_USER,
            [teacherId]
        )

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

        sendMessage({
            event: 'classroom:join_request',
            userId: teacherId,
            data: payload
        })
    }
)

// ─── CLASSROOM_MEMBER_JOINED ──────────────────────────────────────────────────
// Học sinh join lớp PUBLIC thành công → học sinh nhận xác nhận tham gia
eventBus.on(
    EVENTS.CLASSROOM_MEMBER_JOINED,
    async ({
        classroom,
        member
    }: {
        classroom: Classroom
        member: ClassroomMember
    }) => {
        const message = `Bạn đã tham gia thành công lớp học "${classroom.name}"`

        const { notification, userNotifications } = await notificationService.createNotification(
            NotificationType.CLASSROOM_MEMBER_JOINED,
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

        sendMessage({
            event: 'classroom:member_joined',
            userId: member.user.id,
            data: payload
        })
    }
)

// ─── CLASSROOM_NEW_LESSON ─────────────────────────────────────────────────────
// Giáo viên publish bài học mới → toàn bộ học sinh active nhận thông báo
eventBus.on(
    EVENTS.CLASSROOM_NEW_LESSON,
    async ({
        classroom,
        lesson,
        members
    }: {
        classroom: Classroom
        lesson: ClassroomLesson
        members: ClassroomMember[]
    }) => {
        const message = `Lớp học "${classroom.name}" vừa có bài học mới: "${lesson.title}"`
        const memberUserIds = members.map((m) => m.user.id)

        const { notification, userNotifications } = await notificationService.createNotification(
            NotificationType.CLASSROOM_NEW_LESSON,
            {
                message,
                data: {
                    classroomId: classroom.id,
                    classroomName: classroom.name,
                    lessonId: lesson.id,
                    lessonTitle: lesson.title,
                    teacherId: classroom.teacher?.id
                }
            },
            NotificationTarget.ONLY_USER,
            memberUserIds
        )

        // Gửi socket realtime đến từng học sinh
        userNotifications.forEach((un, idx) => {
            const payload = {
                id: un.id,
                isRead: un.isRead || false,
                readAt: un.readAt || null,
                type: notification.type,
                message: notification.data?.message,
                data: notification.data?.data,
                target: notification.target,
                createdAt: un.createdAt || new Date()
            }
            sendMessage({
                event: 'classroom:new_lesson',
                userId: memberUserIds[idx],
                data: payload
            })
        })
    }
)
