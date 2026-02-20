# ShopPulse Analytics Backend

Node.js/TypeScript Lambda functions for the ShopPulse Analytics platform, deployed using the Serverless Framework.

## Overview

This backend provides user management APIs with strict tenant isolation, Cognito integration, and PostgreSQL database access.

## Features

- ✅ **User Management** - Create, read, update, delete users
- ✅ **Tenant Isolation** - All operations scoped to authenticated tenant
- ✅ **Cognito Integration** - User authentication and authorization
- ✅ **PostgreSQL Database** - Persistent storage with connection pooling
- ✅ **Transaction Support** - Atomic operations across Cognito and database
- ✅ **Comprehensive Validation** - Email, password, and role validation
- ✅ **Error Handling** - Proper HTTP status codes and error messages
- ✅ **Security** - Parameterized queries, input validation, VPC isolation

## Project Structure

```
backend/
├── src/
│   ├── shared/
│   │   ├── db.ts              # Database connection and utilities
│   │   └── README.md          # Database module documentation
│   └── userManagement/
│       ├── index.ts           # Lambda entry point and routing
│       ├── handler.ts         # Request handlers (CRUD operations)
│       ├── cognito.ts         # AWS Cognito integration
│       ├── validation.ts      # Input validation utilities
│       └── types.ts           # TypeScript type definitions
├── dist/                      # Compiled JavaScript (generated)
├── serverless.yml             # Serverless Framework configuration
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── .env.example               # Environment variables template
├── DEPLOYMENT.md              # Detailed deployment guide
└── README.md                  # This file
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your AWS resource IDs
```

### 3. Build

```bash
npm run build
```

### 4. Deploy

**Using PowerShell script (Windows):**
```powershell
.\deploy.ps1 -Stage dev
```

**Using npm scripts:**
```bash
# Development
npm run deploy:dev

# Staging
npm run deploy:staging

# Production
npm run deploy:prod
```

## API Endpoints

All endpoints require Cognito JWT token in `Authorization` header.

### List Users
```
GET /users
```

### Create User
```
POST /users
Body: {
  "email": "user@example.com",
  "password": "SecurePass123!",
  "role": "Finance"
}
```

### Get User
```
GET /users/{userId}
```

### Update User Role
```
PUT /users/{userId}/role
Body: {
  "role": "Operations"
}
```

### Delete User
```
DELETE /users/{userId}
```

## Development

### Local Development

```bash
npm run offline
```

This starts a local API Gateway at `http://localhost:3000`

### Build TypeScript

```bash
npm run build
```

### Run Tests

```bash
npm test
```

### View Logs

```bash
npm run logs
```

## Environment Variables

Required environment variables (set in `.env`):

- `COGNITO_USER_POOL_ID` - Cognito User Pool ID
- `RDS_HOST` - PostgreSQL RDS endpoint
- `RDS_PORT` - Database port (default: 5432)
- `RDS_DATABASE` - Database name
- `RDS_USERNAME` - Database username
- `RDS_PASSWORD` - Database password
- `LAMBDA_SECURITY_GROUP_ID` - Security group for Lambda
- `LAMBDA_SUBNET_ID_1` - Private subnet 1 for Lambda
- `LAMBDA_SUBNET_ID_2` - Private subnet 2 for Lambda

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy

```bash
# Load environment variables (PowerShell)
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}

# Deploy
npm run deploy:dev
```

## Architecture

### Request Flow

1. Client sends request with JWT token
2. API Gateway validates token with Cognito
3. API Gateway extracts tenant_id from token claims
4. Lambda receives request with tenant context
5. Lambda validates permissions and tenant ownership
6. Lambda performs operations on Cognito and/or PostgreSQL
7. Lambda returns response to client

### Security Layers

1. **Authentication** - Cognito JWT tokens
2. **Authorization** - API Gateway Cognito authorizer
3. **Tenant Isolation** - tenant_id in all database queries
4. **Admin Validation** - Check is_tenant_admin for management operations
5. **Cross-Tenant Protection** - Validate resource ownership
6. **Input Validation** - Email, password, role validation
7. **SQL Injection Prevention** - Parameterized queries

## Troubleshooting

### Lambda Cannot Connect to RDS

- Verify Lambda security group can access RDS security group
- Check Lambda is in private subnets with NAT Gateway
- Verify RDS security group inbound rules

### Cognito Authorization Fails

- Verify COGNITO_USER_POOL_ID is correct
- Check token is valid and not expired
- Ensure User Pool exists in same region

### Deployment Fails

- Check all environment variables are set
- Verify AWS credentials have necessary permissions
- Review CloudFormation stack events in AWS Console

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run deploy` - Build and deploy to AWS
- `npm run deploy:dev` - Deploy to development stage
- `npm run deploy:staging` - Deploy to staging stage
- `npm run deploy:prod` - Deploy to production stage
- `npm run remove` - Remove deployment from AWS
- `npm run logs` - Tail Lambda function logs
- `npm run offline` - Run locally with serverless-offline
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## Requirements Satisfied

This implementation satisfies the following requirements from the design document:

- **Requirement 5.1** - User creation with tenant inheritance
- **Requirement 5.2** - Role assignment with tenant scoping
- **Requirement 5.3** - User deletion from both Cognito and PostgreSQL
- **Requirement 5.4** - Tenant admin validation for user management
- **Requirement 5.5** - Cross-tenant access prevention

## License

Proprietary - ShopPulse Analytics
