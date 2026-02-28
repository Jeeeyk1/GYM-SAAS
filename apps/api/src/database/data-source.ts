import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [path.join(__dirname, 'entities', '**', '*.entity.{ts,js}')],

  synchronize: false,
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  extra: {
    max: 20,       
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
};

export const AppDataSource = new DataSource(dataSourceOptions);