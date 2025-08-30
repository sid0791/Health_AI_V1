import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: ['.env.local', '.env'] });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  } : false,
  
  // Entity paths
  entities: ['src/domains/**/*.entity.ts'],
  
  // Migration settings
  migrations: ['database/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: false,
  
  // Subscribers
  subscribers: ['src/database/subscribers/*.ts'],
  
  // Development settings
  synchronize: false, // Always false for production safety
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  
  // Connection pool
  extra: {
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },
});