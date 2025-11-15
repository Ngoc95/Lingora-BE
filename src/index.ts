import { DatabaseService } from '~/services/database.service'
import { createServer } from 'http'
import app from './app'
import { socketService } from '~/services/socket.service'

const PORT = process.env.PORT || 4000

async function startServer() {
    const db = DatabaseService.getInstance()
    await db.init()

    // Create HTTP server
    const httpServer = createServer(app)

    // Initialize Socket.IO
    socketService.initialize(httpServer)

    httpServer.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`))
}

startServer()
