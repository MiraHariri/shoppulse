import { Pool, PoolClient, PoolConfig } from 'pg';

/**
 * Database credentials from environment variables (POC only)
 * For production, use AWS Secrets Manager
 */
interface DatabaseCredentials {
  username: string;
  password: string;
  host: string;
  port: number;
  dbname: string;
}

/**
 * Retry configuration for database operations
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

/**
 * Shared database connection pool
 */
let pool: Pool | null = null;

/**
 * Retrieves database credentials from environment variables (POC only)
 * For production, use AWS Secrets Manager
 * 
 * @returns Database credentials
 * @throws Error if credentials are not set
 */
function getCredentialsFromEnv(): DatabaseCredentials {
  const host = process.env.RDS_HOST;
  const port = process.env.RDS_PORT;
  const dbname = process.env.RDS_DATABASE;
  const username = process.env.RDS_USERNAME;
  const password = process.env.RDS_PASSWORD;

  if (!host || !port || !dbname || !username || !password) {
    throw new Error(
      'Missing required database environment variables: RDS_HOST, RDS_PORT, RDS_DATABASE, RDS_USERNAME, RDS_PASSWORD'
    );
  }

  return {
    username,
    password,
    host,
    port: parseInt(port, 10),
    dbname,
  };
}

/**
 * Sleep utility for retry delays
 * 
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculates exponential backoff delay
 * 
 * @param attempt - Current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Executes a function with exponential backoff retry logic
 * 
 * @param fn - Async function to execute
 * @param config - Retry configuration
 * @returns Result of the function
 * @throws Error if all retries are exhausted
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        break;
      }
      
      // Calculate delay and wait
      const delay = calculateBackoffDelay(attempt, config);
      console.warn(
        `Database operation failed (attempt ${attempt + 1}/${config.maxRetries + 1}): ${lastError.message}. ` +
        `Retrying in ${delay}ms...`
      );
      
      await sleep(delay);
    }
  }
  
  throw new Error(
    `Database operation failed after ${config.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Initializes the database connection pool
 * Retrieves credentials from environment variables
 * 
 * @returns Initialized connection pool
 * @throws Error if initialization fails
 */
export async function initializePool(): Promise<Pool> {
  if (pool) {
    return pool;
  }
  
  // Retrieve credentials from environment variables
  const credentials = getCredentialsFromEnv();
  
  const poolConfig: PoolConfig = {
    user: credentials.username,
    password: credentials.password,
    host: credentials.host,
    port: credentials.port,
    database: credentials.dbname,
    ssl: {
      rejectUnauthorized: true,
    },
    max: 10, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Timeout for acquiring a connection
  };
  
  pool = new Pool(poolConfig);
  
  // Test the connection
  await withRetry(async () => {
    const client = await pool!.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  });
  
  console.log('Database connection pool initialized successfully');
  
  return pool;
}

/**
 * Gets the database connection pool
 * Initializes the pool if it doesn't exist
 * 
 * @returns Database connection pool
 */
export async function getPool(): Promise<Pool> {
  if (!pool) {
    await initializePool();
  }
  return pool!;
}

/**
 * Executes a database query with automatic retry logic
 * 
 * @param queryText - SQL query text
 * @param values - Query parameters
 * @param retryConfig - Optional retry configuration
 * @returns Query result
 */
export async function query<T = any>(
  queryText: string,
  values?: any[],
  retryConfig?: RetryConfig
): Promise<{ rows: T[]; rowCount: number }> {
  const dbPool = await getPool();
  
  return withRetry(async () => {
    const result = await dbPool.query(queryText, values);
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
    };
  }, retryConfig);
}

/**
 * Gets a database client from the pool for transaction support
 * Client must be released after use
 * 
 * @returns Database client
 */
export async function getClient(): Promise<PoolClient> {
  const dbPool = await getPool();
  
  return withRetry(async () => {
    return await dbPool.connect();
  });
}

/**
 * Executes a function within a database transaction
 * Automatically handles commit/rollback
 * 
 * @param fn - Function to execute within transaction
 * @param retryConfig - Optional retry configuration
 * @returns Result of the function
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
  retryConfig?: RetryConfig
): Promise<T> {
  return withRetry(async () => {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }, retryConfig);
}

/**
 * Closes the database connection pool
 * Should be called during Lambda shutdown or application cleanup
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database connection pool closed');
  }
}
