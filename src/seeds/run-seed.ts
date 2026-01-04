import 'reflect-metadata'
import { DatabaseService } from '~/services/database.service'
import { seedInitialData } from './seed'
import { seedDashboardData } from './dashboard.seed'

async function main() {
  const args = process.argv.slice(2)
  const dropSchema = args.includes('--drop')
  const runDashboard = args.includes('--dashboard')
  const runAll = args.includes('--all')

  console.log('🚀 Starting seed process...')
  console.log(`   Options: drop=${dropSchema}, dashboard=${runDashboard}, all=${runAll}`)

  const db = DatabaseService.getInstance()
  
  try {
    // Connect to database
    await db.connect()
    console.log('✅ Connected to database')

    // Drop schema if requested
    if (dropSchema) {
      console.log('🗑️  Dropping all tables...')
      await db.appDataSource.dropDatabase()
      console.log('✅ Database dropped')
    }

    // Sync schema
    console.log('🔄 Synchronizing schema...')
    await db.syncDB()

    // Run seeds
    if (runAll || !runDashboard) {
      console.log('🌱 Running initial seed...')
      await seedInitialData()
    }

    if (runAll || runDashboard) {
      console.log('📊 Running dashboard seed...')
      await seedDashboardData()
    }

    console.log('🎉 Seed completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

main()
