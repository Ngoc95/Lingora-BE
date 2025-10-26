import { AppDataSource } from '~/config/data-source'
import { Repository, ObjectLiteral } from 'typeorm'
import { seedInitialData } from '~/seeds/seed'

export class DatabaseService {
  private static instance: DatabaseService = new DatabaseService()

  private constructor() {}

  static getInstance(): DatabaseService {
    return this.instance
  }

  async connect() {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
      console.log('✅ PostgreSQL connected')
    }
  }

  async getRepository<T extends ObjectLiteral>(entity: { new (): T }): Promise<Repository<T>> {
    if (!AppDataSource.isInitialized) await this.connect()
    return AppDataSource.getRepository(entity)
  }

  async syncDB() {
    await AppDataSource.synchronize()
    console.log('🔄 Database synchronized')
    await seedInitialData()
  }

  async init() {
    await this.connect()
    await this.syncDB()
  }
}
