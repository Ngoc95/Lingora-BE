if (process.env.NODE_ENV === 'production') {
    require('module-alias/register')
}

import { DatabaseService } from './services/database.service'
import { seedInitialData } from './seeds/seed'
import app from './app'
import { initSocket } from './sockets'
import { exec } from 'child_process'
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

    console.log(`🔄 Attempting to wake up AI Service at [${aiUrl}] using curl...`)
    
    // Retry configuration
    const maxRetries = 1
    const retryDelay = 5000 // 5 seconds

    for (let i = 0; i < maxRetries; i++) {
        try {
            await new Promise((resolve, reject) => {
                exec(`curl -I ${aiUrl}`, { timeout: 10000 }, (error, stdout, stderr) => {
                    if (error) {
                        reject(error)
                        return
                    }
                    if (stdout) console.log(stdout)
                    resolve(true)
                })
            })
            
            console.log('✅ AI Service pinged successfully via curl!')
            return
        } catch (error: any) {
            console.error(`❌ Attempt ${i + 1}/${maxRetries} failed.`)
            console.error(`   Error: ${error.message}`)
            
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
