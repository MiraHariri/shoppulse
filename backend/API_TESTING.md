# API Testing Guide

## API Gateway Endpoint
**Base URL**: `https://9g0b03kd0l.execute-api.us-east-1.amazonaws.com/dev`

## Authentication
All endpoints require Cognito authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

## Available Endpoints

### User Management

#### 1. List Users
```bash
GET /users
Authorization: Bearer <JWT_TOKEN>
```

#### 2. Create User
```bash
POST /users
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "role": "analyst",
  "tenantId": "tenant-123"
}
```

#### 3. Get User
```bash
GET /users/{userId}
Authorization: Bearer <JWT_TOKEN>
```

#### 4. Update User
```bash
PUT /users/{userId}
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "email": "newemail@example.com"
}
```

#### 5. Delete User
```bash
DELETE /users/{userId}
Authorization: Bearer <JWT_TOKEN>
```

#### 6. Update User Role
```bash
PUT /users/{userId}/role
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "role": "admin"
}
```

### Dashboard Endpoints (Not Yet Implemented - Returns 501)
```bash
GET /dashboards/embed-url
GET /dashboards/list
```

### Governance Endpoints (Not Yet Implemented - Returns 501)
```bash
GET /governance/rules
PUT /governance/rules
```

## Testing with cURL

### Example: Create User
```bash
curl -X POST https://9g0b03kd0l.execute-api.us-east-1.amazonaws.com/dev/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "role": "analyst",
    "tenantId": "tenant-001"
  }'
```

### Example: List Users
```bash
curl -X GET https://9g0b03kd0l.execute-api.us-east-1.amazonaws.com/dev/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Getting a JWT Token

To get a JWT token for testing, you need to authenticate with Cognito:

1. **Using AWS CLI**:
```bash
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id ggrhvt94hkcru9uqta7f4tjbk \
  --auth-parameters USERNAME=your-email@example.com,PASSWORD=your-password \
  --region us-east-1
```

2. **Using Cognito Hosted UI**:
   - Navigate to: `https://shoppulse-analytics-dev-4uyfl9yq.auth.us-east-1.amazoncognito.com/login?client_id=ggrhvt94hkcru9uqta7f4tjbk&response_type=token&redirect_uri=http://localhost:3000`
   - Login with your credentials
   - Extract the JWT token from the URL after successful login

## Response Formats

### Success Response
```json
{
  "statusCode": 200,
  "body": {
    "message": "Success",
    "data": { ... }
  }
}
```

### Error Response
```json
{
  "statusCode": 400,
  "body": {
    "error": "Error message"
  }
}
```

## CORS Support
All endpoints support CORS with the following headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token`
- `Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS`

## Rate Limiting
- Burst Limit: 5000 requests
- Rate Limit: 10000 requests per second
- Monthly Quota: 1,000,000 requests

## CloudWatch Logs
API Gateway logs are available in CloudWatch:
- Log Group: `/aws/apigateway/shoppulse-analytics`
- Lambda Logs: `/aws/lambda/dev-shoppulse-user-management`

## Infrastructure Details
- **API Gateway ID**: 9g0b03kd0l
- **Stage**: dev
- **Cognito User Pool ID**: us-east-1_7uHAvZn8K
- **Cognito Client ID**: ggrhvt94hkcru9uqta7f4tjbk
- **Lambda Function**: dev-shoppulse-user-management
- **RDS Endpoint**: shoppulse-analytics-dev-db.co7o6yko2dcm.us-east-1.rds.amazonaws.com
