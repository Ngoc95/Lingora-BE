import { DataSource } from "typeorm";
import { env } from '~/config/env';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST || 'localhost',
  port: Number(env.DB_PORT) || 5432,
  username: env.DB_USER || 'postgres',
  password: env.DB_PASS,
  database: env.DB_NAME || 'lingora',
  entities: [__dirname + '/../entities/**/*entity.{ts,js}'],
  synchronize: false
})