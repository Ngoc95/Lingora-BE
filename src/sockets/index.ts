import { Server } from 'socket.io'
import { Server as HTTPServer } from 'http'

let io: Server
const connectedUsers = new Map<string, string>()

export const initSocket = (server: HTTPServer) => {
    io = new Server(server, {
        cors: { origin: 'http://localhost:5173' }
    })

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id)

        socket.on('register', (userId: string) => {
            connectedUsers.set(userId, socket.id)
            console.log(`UserId: ${userId}, socketId: ${socket.id}`)
            console.log(connectedUsers)
        })

        socket.on('disconnect', () => {
            for (const [uid, sid] of connectedUsers.entries()) {
                if (sid === socket.id) connectedUsers.delete(uid)
            }
        })
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
