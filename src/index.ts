if (process.env.NODE_ENV === 'production') {
    require('module-alias/register')
}

import { DatabaseService } from './services/database.service'
import { seedInitialData } from './seeds/seed'
import app from './app'
import { initSocket } from './sockets'
import axios from 'axios'
import { env } from './config/env'

const PORT = process.env.PORT || 4000

async function startServer() {
    const db = DatabaseService.getInstance()
    await db.init()
    
    await seedInitialData()

    const server = app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`))
    initSocket(server)

    // Wake up AI Service if on Render
    if (env.AI_SERVICE_URL) {
        try {
            console.log('Pinging AI Service to wake it up...')
            axios.get(env.AI_SERVICE_URL).catch((err) => {
                // Ignore error, just need to send request
                console.log('AI Service ping sent')
            })
        } catch (error) {
            console.error('Error pinging AI Service:', error)
        }
    }
}

startServer()
