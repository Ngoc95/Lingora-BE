import { DatabaseService } from '~/services/database.service'
import app from './app'

const PORT = process.env.PORT || 4000

async function startServer() {
    const db = DatabaseService.getInstance()
    await db.init()

    app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`))
}

startServer()
