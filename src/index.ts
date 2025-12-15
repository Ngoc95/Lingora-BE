import { DatabaseService } from '~/services/database.service'
import { seedInitialData } from '~/seeds/seed'
import app from './app'
import { initSocket } from '~/sockets'

const PORT = process.env.PORT || 4000

async function startServer() {
    const db = DatabaseService.getInstance()
    await db.init()
    
    await seedInitialData()

    const server = app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`))
    initSocket(server)
}

startServer()
