import { Server } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { env } from '~/config/env'
import { verifyToken } from '~/utils/jwt'
import { registerClassroomChatHandlers } from './classroomChat.socket'

let io: Server
const connectedUsers = new Map<string, string>()

export const initSocket = (server: HTTPServer) => {
    io = new Server(server, {
        cors: { origin: env.FRONTEND_URL },
        allowEIO3: true
    })

    // Verify JWT tại thời điểm connect — reject ngay nếu token không hợp lệ
    // Client truyền: io('...', { auth: { token: '<accessToken>' } })
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token as string | undefined
        if (!token) return next(new Error('Unauthorized: missing token'))
        try {
            const payload = verifyToken(token, env.JWT_ACCESS_SECRET) as { userId: number }
            socket.data.userId = payload.userId
            next()
        } catch {
            next(new Error('Unauthorized: invalid token'))
        }
    })

    io.on('connection', (socket) => {
        const userId = (socket.data.userId as number).toString()
        connectedUsers.set(userId, socket.id)
        console.log(`Client connected: socketId=${socket.id}, userId=${userId}`)

        socket.on('disconnect', () => {
            connectedUsers.delete(userId)
            console.log(`Client disconnected: userId=${userId}`)
        })

        // Classroom chat
        registerClassroomChatHandlers(io, socket)
    })

    return io
}

export const getIO = () => io
export const getSocketIdByUserId = (userId: string) => connectedUsers.get(userId)

export const sendMessage = ({ data, event, userId }: { event: string; userId: number; data: any }) => {
    const io = getIO()
    const socketId = getSocketIdByUserId(userId.toString())
    if (socketId) {
        io.to(socketId).emit(event, data)
    }
}
