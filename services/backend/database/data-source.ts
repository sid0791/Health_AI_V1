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
  
  // Enhanced Connection Pool Configuration
  extra: {
    // Connection Pool Settings
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '25'), // Increased from 20
    min: parseInt(process.env.DB_MIN_CONNECTIONS || '5'), // Minimum connections
    
    // Timeouts
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'), // 30s
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '600000'), // 10 minutes
    acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'), // 1 minute
    
    // Query Timeout
    query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'), // 30s
    
    // Connection Validation
    validateConnection: true,
    testOnBorrow: true,
    
    // Keep-alive
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
    
    // Application Name for monitoring
    application_name: process.env.APP_NAME || 'HealthAI',
    
    // Performance Settings
    statement_timeout: process.env.DB_STATEMENT_TIMEOUT || '30s',
    lock_timeout: process.env.DB_LOCK_TIMEOUT || '10s',
    idle_in_transaction_session_timeout: process.env.DB_IDLE_IN_TRANSACTION_TIMEOUT || '60s',
    
    // Connection pooling optimizations
    maxUses: parseInt(process.env.DB_MAX_USES || '7500'), // Max uses per connection
    evictionRunIntervalMillis: parseInt(process.env.DB_EVICTION_INTERVAL || '300000'), // 5 minutes
    numTestsPerEvictionRun: parseInt(process.env.DB_TESTS_PER_EVICTION || '3'),
    
    // Prepared statement cache
    preparedStatementCacheQueries: parseInt(process.env.DB_PREPARED_CACHE_SIZE || '100'),
    preparedStatementCacheSizeMiB: parseInt(process.env.DB_PREPARED_CACHE_SIZE_MB || '5'),
  },
  
  // Performance optimizations
  cache: {
    type: 'redis',
    options: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_CACHE_DB || '1'),
    },
    alwaysEnabled: true,
    duration: parseInt(process.env.DB_CACHE_DURATION || '300000'), // 5 minutes
  },
  
  // Connection retry configuration
  connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT || '30000'),
  maxReconnectTries: parseInt(process.env.DB_MAX_RECONNECT_TRIES || '3'),
  reconnectInterval: parseInt(process.env.DB_RECONNECT_INTERVAL || '1000'),
});