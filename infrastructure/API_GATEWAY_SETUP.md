# API Gateway Setup Guide

## Overview

This document describes the AWS API Gateway REST API configuration for ShopPulse Analytics. The API Gateway provides secure, authenticated access to backend Lambda functions with tenant isolation enforced through Cognito JWT tokens.

## Architecture

The API Gateway is configured with:
- **Cognito User Pool Authorizer** for authentication
- **CORS support** for frontend domain access
- **Request validation** for input validation
- **Rate limiting** via usage plans and throttling
- **Request context mapping** to extract tenant_id from JWT tokens

## Requirements Addressed

- **Requirement 1.3**: API Gateway extracts tenant_id from JWT token claims
- **Requirement 11.1**: All API requests validated with Cognito access tokens
- **Requirement 11.3**: API Gateway passes tenant_id to Lambda functions in request context

## API Endpoints

### User Management
- `GET /users` - List users for tenant
- `POST /users` - Create new user
- `GET /users/{userId}` - Get user details
- `PUT /users/{userId}` - Update user
- `DELETE /users/{userId}` - Delete/deactivate user
- `PUT /users/{userId}/role` - Update user role

### Dashboard Access
- `GET /dashboards/embed-url` - Generate QuickSight embed URL
- `GET /dashboards/list` - List available dashboards for role

### Governance
- `GET /governance/rules` - Get tenant governance rules
- `PUT /governance/rules` - Update governance rules

## Security Features

### 1. Cognito Authorizer
All endpoints (except OPTIONS) require a valid Cognito JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

The authorizer validates:
- Token signature
- Token expiration
- User pool membership

### 2. Request Context Mapping
The API Gateway automatically extracts claims from the JWT token and passes them to Lambda functions:

```javascript
{
  "requestContext": {
    "authorizer": {
      "claims": {
        "sub": "user-uuid",
        "email": "user@example.com",
        "custom:tenant_id": "tenant_abc123",
        "custom:role": "Finance"
      }
    }
  }
}
```

Lambda functions can access tenant_id via:
```javascript
const tenantId = event.requestContext.authorizer.claims['custom:tenant_id'];
```

### 3. Rate Limiting
Configured throttling limits:
- **Burst limit**: 5,000 requests
- **Rate limit**: 10,000 requests per second
- **Monthly quota**: 1,000,000 requests

### 4. Request Validation
The request validator checks:
- Required request parameters are present
- Request body matches expected schema
- Path parameters are provided

## CORS Configuration

CORS is enabled for all endpoints to support frontend access:

**Allowed Headers**:
- Content-Type
- X-Amz-Date
- Authorization
- X-Api-Key
- X-Amz-Security-Token

**Allowed Methods**:
- GET, POST, PUT, DELETE, OPTIONS

**Allowed Origin**:
- `*` (configure to specific frontend domain in production)

CORS is implemented via:
1. OPTIONS methods for preflight requests
2. Gateway responses for 4xx and 5xx errors
3. Integration responses with CORS headers

## Monitoring and Logging

### CloudWatch Logs
API Gateway logs are sent to CloudWatch Log Group:
- Log group: `/aws/apigateway/shoppulse-analytics`
- Retention: 7 days
- Log format: JSON with request details

Logged fields:
- Request ID
- Source IP
- HTTP method
- Resource path
- Status code
- Response length
- Request time

### X-Ray Tracing
X-Ray tracing is enabled for performance monitoring and debugging.

### CloudWatch Metrics
Detailed metrics are enabled for:
- Request count
- Latency (p50, p90, p99)
- Error rates (4xx, 5xx)
- Integration latency

## Deployment

### Prerequisites
1. Cognito User Pool must be created (Task 2)
2. VPC and networking must be configured (Task 1)

### Deploy with Terraform

1. Initialize Terraform:
```bash
cd infrastructure
terraform init
```

2. Review the plan:
```bash
terraform plan
```

3. Apply the configuration:
```bash
terraform apply
```

4. Note the API Gateway invoke URL from outputs:
```bash
terraform output api_gateway_invoke_url
```

### Configuration Variables

The API Gateway uses these variables from `variables.tf`:
- `project_name` - Used for resource naming
- `environment` - Stage name (dev, staging, prod)
- `aws_region` - AWS region for deployment

### Outputs

After deployment, the following outputs are available:

```hcl
api_gateway_id              # REST API ID
api_gateway_invoke_url      # Base URL for API calls
api_gateway_stage_name      # Stage name
api_gateway_authorizer_id   # Cognito authorizer ID
api_gateway_execution_arn   # ARN for Lambda permissions
```

## Integration with Lambda Functions

Lambda functions will need:

1. **Permissions** to be invoked by API Gateway:
```hcl
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.my_function.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}
```

2. **Integration** with API Gateway methods:
```hcl
resource "aws_api_gateway_integration" "lambda" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.users.id
  http_method = aws_api_gateway_method.users_get.http_method
  
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.user_management.invoke_arn
}
```

## Frontend Configuration

Configure the frontend to use the API Gateway URL:

```typescript
// .env
REACT_APP_API_GATEWAY_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev
```

```typescript
// apiClient.ts
const API_BASE_URL = process.env.REACT_APP_API_GATEWAY_URL;

async function getAuthHeaders(): Promise<HeadersInit> {
  const session = await Auth.currentSession();
  const token = session.getAccessToken().getJwtToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}
```

## Testing

### Test Authentication
```bash
# Get JWT token from Cognito
TOKEN=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id <client-id> \
  --auth-parameters USERNAME=user@example.com,PASSWORD=password \
  --query 'AuthenticationResult.AccessToken' \
  --output text)

# Test API call
curl -H "Authorization: Bearer $TOKEN" \
  https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/users
```

### Test CORS
```bash
curl -X OPTIONS \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/users
```

### Test Rate Limiting
```bash
# Send multiple requests to test throttling
for i in {1..100}; do
  curl -H "Authorization: Bearer $TOKEN" \
    https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/users &
done
```

## Troubleshooting

### 401 Unauthorized
- Verify JWT token is valid and not expired
- Check Cognito User Pool ID matches authorizer configuration
- Ensure Authorization header format is correct: `Bearer <token>`

### 403 Forbidden
- Check user exists in Cognito User Pool
- Verify user has required custom attributes (tenant_id, role)

### 429 Too Many Requests
- Rate limit exceeded
- Wait for throttling window to reset
- Consider increasing usage plan limits

### CORS Errors
- Verify OPTIONS method is configured for the endpoint
- Check CORS headers in gateway responses
- Ensure frontend origin is allowed

## Next Steps

After API Gateway is deployed:
1. **Task 4**: Implement Lambda functions for user management
2. **Task 5**: Implement Lambda functions for QuickSight embedding
3. **Task 6**: Integrate Lambda functions with API Gateway
4. **Task 7**: Configure frontend to use API Gateway URL

## Security Best Practices

1. **Production CORS**: Replace `'*'` with specific frontend domain
2. **API Keys**: Consider adding API keys for additional security layer
3. **WAF**: Add AWS WAF for DDoS protection and request filtering
4. **Custom Domain**: Use custom domain with SSL certificate
5. **Request Throttling**: Adjust limits based on actual usage patterns
6. **CloudWatch Alarms**: Set up alarms for error rates and latency

## References

- [AWS API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [Cognito User Pool Authorizer](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html)
- [API Gateway CORS](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html)
- [API Gateway Throttling](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html)
