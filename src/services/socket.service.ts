import { Server as HttpServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { verifyToken } from '~/utils/jwt'
import { env } from '~/config/env'
import { User } from '~/entities/user.entity'

class SocketService {
    private io: SocketIOServer | null = null
    private userSockets: Map<number, Set<string>> = new Map() // userId -> Set of socketIds

    initialize(server: HttpServer) {
        this.io = new SocketIOServer(server, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:5173',
                credentials: true,
            },
        })

        this.io.use(async (socket: Socket, next: (err?: Error) => void) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1]

                if (!token) {
                    return next(new Error('Authentication error: No token provided'))
                }

                const decoded = (await verifyToken(token, env.JWT_ACCESS_SECRET as string)) as { userId: number }
                const user = await User.findOne({
                    where: { id: decoded.userId },
                    relations: ['roles'],
                })

                if (!user) {
                    return next(new Error('Authentication error: User not found'))
                }

                ; (socket as any).user = user
                next()
            } catch (error) {
                next(new Error('Authentication error: Invalid token'))
            }
        })

        this.io.on('connection', (socket: Socket) => {
            const user = (socket as any).user as User
            const userId = user.id

            console.log(`User ${userId} connected with socket ${socket.id}`)

            // Add socket to user's socket set
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set())
            }
            this.userSockets.get(userId)!.add(socket.id)

            // Handle disconnect
            socket.on('disconnect', () => {
                console.log(`User ${userId} disconnected`)
                const sockets = this.userSockets.get(userId)
                if (sockets) {
                    sockets.delete(socket.id)
                    if (sockets.size === 0) {
                        this.userSockets.delete(userId)
                    }
                }
            })
        })

        console.log('✅ Socket.IO initialized')
    }

    /**
     * Emit notification to specific user
     */
    emitToUser(userId: number, event: string, data: any) {
        if (!this.io) {
            console.warn('Socket.IO not initialized')
            return
        }

        const sockets = this.userSockets.get(userId)
        if (sockets && sockets.size > 0) {
            sockets.forEach((socketId) => {
                this.io!.to(socketId).emit(event, data)
            })
        }
    }

    /**
     * Emit notification to all connected users
     */
    emitToAll(event: string, data: any) {
        if (!this.io) {
            console.warn('Socket.IO not initialized')
            return
        }

        this.io.emit(event, data)
    }

    /**
     * Get Socket.IO instance
     */
    getIO(): SocketIOServer | null {
        return this.io
    }
}

export const socketService = new SocketService()

