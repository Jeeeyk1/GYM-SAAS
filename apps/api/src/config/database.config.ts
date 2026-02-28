import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  name: process.env.DB_NAME || 'gymsaas',
  user: process.env.DB_USER || 'gymsaas',
  password: process.env.DB_PASSWORD || 'gymsaas_secret',
  ssl: process.env.DB_SSL === 'true',
  url: process.env.DATABASE_URL,
}));