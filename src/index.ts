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
    wakeUpAIService()
}

const wakeUpAIService = async () => {
    const aiUrl = env.AI_SERVICE_URL
    if (!aiUrl) {
        console.log('⚠️ AI_SERVICE_URL is not set. Skipping wake-up.')
        return
    }

    console.log(`🔄 Attempting to wake up AI Service at [${aiUrl}]...`)
    
    // Retry configuration
    const maxRetries = 20 // Increase to cover ~100s (Render takes time)
    const retryDelay = 5000 // 5 seconds

    for (let i = 0; i < maxRetries; i++) {
        try {
            // Set a short timeout for the ping itself
            await axios.get(aiUrl, { 
                timeout: 10000,
                headers: {
                    'User-Agent': 'Lingora-Backend-WakeUp/1.0'
                }
            }) 
            console.log('✅ AI Service is awake and responding!')
            return
        } catch (error: any) {
            console.error(`❌ Attempt ${i + 1}/${maxRetries} failed.`)
            console.error(`   Error: ${error.message}`)
            if (error.code) console.error(`   Code: ${error.code}`)
            
            if (i < maxRetries - 1) {
                console.log(`   Waiting ${retryDelay/1000}s before retry...`)
                await new Promise(resolve => setTimeout(resolve, retryDelay))
            } else {
                 console.error('⚠️ AI Service wake-up failed after multiple attempts.')
            }
        }
    }
}


startServer()
