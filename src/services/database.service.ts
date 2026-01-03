import { Repository, ObjectLiteral, DataSource } from 'typeorm'

import { env } from '~/config/env';

export class DatabaseService {
  private static instance: DatabaseService
  public appDataSource: DataSource

  private constructor() {
    this.appDataSource = new DataSource({
      type: 'postgres',
      host: env.DB_HOST,
      port: Number(env.DB_PORT) || 5432,
      username: env.DB_USER,
      password: env.DB_PASS,
      database: env.DB_NAME,
      entities: [__dirname + '/../entities/**/*.{ts,js}'],
      synchronize: false,
      logging: false,
      ssl: env.DB_HOST !== 'localhost' && env.DB_HOST !== 'postgres'
        ? { rejectUnauthorized: false }
        : false,
    })
  }

  // Lấy instance singleton
  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  // Cho phép service khác truy cập trực tiếp DataSource khi cần transaction
  get dataSource() {
    return this.appDataSource
  }

  async connect() {
    if (!this.appDataSource.isInitialized) {
      await this.appDataSource.initialize()
      console.log('✅ PostgreSQL connected')
    }
  }

  async getRepository<T extends ObjectLiteral>(entity: { new(): T }): Promise<Repository<T>> {
    if (!this.appDataSource.isInitialized) await this.connect()
    return this.appDataSource.getRepository(entity)
  }

  async syncDB() {
    await this.appDataSource.synchronize()
    console.log('🔄 Database synchronized')
  }

  async init() {
    await this.connect()
    await this.syncDB()
  }
}
