import { Server, Socket } from 'socket.io'
import { classroomChatService } from '~/services/classroomChat.service'
import { ClassroomMessageType } from '~/enums/classroomMessageType.enum'

const roomName = (classroomId: number | string) => `classroom:${classroomId}`

export const registerClassroomChatHandlers = (io: Server, socket: Socket) => {
    /**
     * classroom:join — kiểm tra membership, join room
     * payload: { classroomId: number }
     * userId lấy từ socket.data (set bởi io.use() khi connect)
     */
    socket.on('classroom:join', async ({ classroomId }: { classroomId: number }) => {
        try {
            const userId = socket.data.userId as number

            const isMember = await classroomChatService.isMember(classroomId, userId)
            if (!isMember) {
                socket.emit('classroom:error', { message: 'You are not a member of this classroom' })
                return
            }

            socket.data.classroomId = classroomId
            socket.join(roomName(classroomId))
            socket.emit('classroom:joined', { classroomId })
        } catch {
            socket.emit('classroom:error', { message: 'Failed to join classroom' })
        }
    })

    /**
     * classroom:leave — rời room
     */
    socket.on('classroom:leave', ({ classroomId }: { classroomId: number }) => {
        socket.leave(roomName(classroomId))
    })

    /**
     * classroom:message — gửi tin nhắn
     * payload: { classroomId: number, content: string, type?: ClassroomMessageType, attachmentUrl?: string, repliedToId?: number }
     */
    socket.on(
        'classroom:message',
        async ({
            classroomId,
            content,
            type = ClassroomMessageType.TEXT,
            attachmentUrl,
            repliedToId,
        }: {
            classroomId: number
            content: string
            type?: ClassroomMessageType
            attachmentUrl?: string
            repliedToId?: number
        }) => {
            const userId = socket.data.userId as number

            if (!content?.trim() && type === ClassroomMessageType.TEXT) {
                socket.emit('classroom:error', { message: 'Message content cannot be empty' })
                return
            }

            try {
                const message = await classroomChatService.saveMessage(classroomId, userId, content, type, attachmentUrl, repliedToId)
                io.to(roomName(classroomId)).emit('classroom:message', { message })
            } catch {
                socket.emit('classroom:error', { message: 'Failed to send message' })
            }
        },
    )
}
