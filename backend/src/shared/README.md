# Shared Database Connection Module

This module provides a robust database connection management system for the ShopPulse Analytics backend Lambda functions.

## Features

- **Automatic Credential Retrieval**: Fetches database credentials from AWS Secrets Manager
- **Credential Caching**: Caches credentials for 5 minutes to reduce API calls
- **Connection Pooling**: Uses pg connection pool for efficient connection management
- **Exponential Backoff Retry**: Automatically retries failed operations with exponential backoff
- **Transaction Support**: Provides transaction helpers with automatic commit/rollback
- **SSL/TLS Support**: Enforces secure connections to RDS

## Usage

### Basic Query

```typescript
import { query } from './shared/db';

// Simple query
const result = await query('SELECT * FROM users WHERE tenant_id = $1', ['tenant-123']);
console.log(result.rows);

// Query with custom retry config
const customRetry = {
  maxRetries: 5,
  initialDelayMs: 200,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};
const result2 = await query('SELECT * FROM orders', [], customRetry);
```

### Transaction Support

```typescript
import { withTransaction } from './shared/db';

const result = await withTransaction(async (client) => {
  // All queries within this function are part of the same transaction
  await client.query('INSERT INTO users (tenant_id, email) VALUES ($1, $2)', ['tenant-123', 'user@example.com']);
  await client.query('INSERT INTO audit_logs (tenant_id, action) VALUES ($1, $2)', ['tenant-123', 'user_created']);
  
  return { success: true };
});
// Transaction is automatically committed if no error, rolled back on error
```

### Manual Client Management

```typescript
import { getClient } from './shared/db';

const client = await getClient();
try {
  const result = await client.query('SELECT * FROM users');
  console.log(result.rows);
} finally {
  client.release(); // Always release the client back to the pool
}
```

### Pool Initialization

The pool is automatically initialized on first use, but you can manually initialize it:

```typescript
import { initializePool } from './shared/db';

// Initialize with default secret ARN from environment variable
await initializePool();

// Or specify a custom secret ARN
await initializePool('arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret');
```

### Cleanup

For Lambda functions, you typically don't need to close the pool as it will be reused across invocations. However, for testing or graceful shutdown:

```typescript
import { closePool } from './shared/db';

await closePool();
```

## Environment Variables

The module requires the following environment variables:

- `RDS_SECRET_ARN`: ARN of the secret in AWS Secrets Manager containing database credentials
- `AWS_REGION` (optional): AWS region, defaults to 'us-east-1'

## Secret Format

The secret in AWS Secrets Manager must be a JSON object with the following structure:

```json
{
  "username": "shoppulse_app",
  "password": "your-secure-password",
  "host": "shoppulse-db.xxxxx.us-east-1.rds.amazonaws.com",
  "port": "5432",
  "dbname": "shoppulse"
}
```

## Retry Configuration

The default retry configuration is:

- **maxRetries**: 3 (total of 4 attempts)
- **initialDelayMs**: 100ms
- **maxDelayMs**: 5000ms (5 seconds)
- **backoffMultiplier**: 2 (exponential backoff)

This means retry delays will be: 100ms, 200ms, 400ms, then fail.

You can customize retry behavior by passing a custom `RetryConfig` object to the `query` or `withTransaction` functions.

## Connection Pool Configuration

The connection pool is configured with:

- **max**: 10 connections
- **idleTimeoutMillis**: 30000 (30 seconds)
- **connectionTimeoutMillis**: 10000 (10 seconds)
- **ssl**: Required with certificate validation

## Error Handling

All functions throw errors if operations fail after all retries are exhausted. Always wrap database calls in try-catch blocks:

```typescript
try {
  const result = await query('SELECT * FROM users WHERE tenant_id = $1', [tenantId]);
  return result.rows;
} catch (error) {
  console.error('Database query failed:', error);
  throw new Error('Failed to fetch users');
}
```

## Testing

For testing, you can clear the credentials cache:

```typescript
import { clearCredentialsCache } from './shared/db';

clearCredentialsCache(); // Forces fresh credential retrieval on next operation
```

## Lambda Integration Example

```typescript
import { query, closePool } from './shared/db';

export const handler = async (event: any) => {
  try {
    // Database operations
    const result = await query(
      'SELECT * FROM users WHERE tenant_id = $1',
      [event.requestContext.authorizer.claims['custom:tenant_id']]
    );
    
    return {
      statusCode: 200,
      body: JSON.stringify(result.rows),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
  // Note: Don't close the pool in Lambda - it will be reused across invocations
};
```

## Requirements Validation

This module satisfies **Requirement 2.2**:
- ✅ Backend Service includes tenant_id in all WHERE clauses (enforced by application code using this module)
- ✅ Credentials retrieved from Secrets Manager
- ✅ Connection retry logic with exponential backoff
- ✅ SSL/TLS encryption for database connections
- ✅ Connection pooling for efficient resource usage
