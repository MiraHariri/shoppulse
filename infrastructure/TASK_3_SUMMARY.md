# Task 3: AWS API Gateway Setup - Summary

## Completion Status: ✅ Complete

## What Was Implemented

### 1. API Gateway REST API Configuration
Created `infrastructure/api_gateway.tf` with complete REST API setup including:

#### Core Infrastructure
- REST API with regional endpoint configuration
- Cognito User Pool authorizer for authentication
- API Gateway deployment and stage (environment-based)
- CloudWatch log group for API access logs
- X-Ray tracing enabled for performance monitoring

#### Security Features
- **Cognito Authorizer**: Validates JWT tokens from Cognito User Pool
- **Request Validation**: Validates request body and parameters
- **Rate Limiting**: 
  - Burst limit: 5,000 requests
  - Rate limit: 10,000 requests/second
  - Monthly quota: 1,000,000 requests
- **Usage Plan**: Enforces throttling and quota limits

#### CORS Configuration
- Gateway responses for 4xx and 5xx errors with CORS headers
- OPTIONS methods for all endpoints (preflight requests)
- Allowed headers: Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token
- Allowed methods: GET, POST, PUT, DELETE, OPTIONS
- Allowed origin: * (configurable for production)

#### Request Context Mapping
The API Gateway automatically extracts tenant_id and other claims from JWT tokens and passes them to Lambda functions via request context:
```javascript
event.requestContext.authorizer.claims['custom:tenant_id']
event.requestContext.authorizer.claims['custom:role']
event.requestContext.authorizer.claims.email
event.requestContext.authorizer.claims.sub
```

### 2. API Endpoints Defined

#### User Management Endpoints
- `GET /users` - List users for tenant
- `POST /users` - Create new user
- `GET /users/{userId}` - Get user details
- `PUT /users/{userId}` - Update user
- `DELETE /users/{userId}` - Delete user
- `PUT /users/{userId}/role` - Update user role

#### Dashboard Endpoints
- `GET /dashboards/embed-url` - Generate QuickSight embed URL
- `GET /dashboards/list` - List available dashboards

#### Governance Endpoints
- `GET /governance/rules` - Get governance rules
- `PUT /governance/rules` - Update governance rules

All endpoints include:
- Cognito authorization (except OPTIONS)
- CORS support via OPTIONS methods
- Request parameter validation
- Authorization header requirement

### 3. Monitoring and Logging
- CloudWatch Logs with 7-day retention
- JSON-formatted access logs with request details
- X-Ray tracing for distributed tracing
- CloudWatch metrics enabled (request count, latency, errors)
- Method settings for detailed metrics

### 4. Outputs Added
Updated `infrastructure/outputs.tf` with API Gateway outputs:
- `api_gateway_id` - REST API ID
- `api_gateway_invoke_url` - Base URL for API calls
- `api_gateway_stage_name` - Stage name
- `api_gateway_authorizer_id` - Cognito authorizer ID
- `api_gateway_execution_arn` - ARN for Lambda permissions
- `api_gateway_configuration` - Complete configuration object

### 5. Documentation
Created `infrastructure/API_GATEWAY_SETUP.md` with:
- Architecture overview
- Security features explanation
- Deployment instructions
- Integration guide for Lambda functions
- Frontend configuration examples
- Testing procedures
- Troubleshooting guide
- Security best practices

## Requirements Addressed

✅ **Requirement 1.3**: API Gateway extracts tenant_id from JWT token claims
- Cognito authorizer configured to validate tokens
- Request context mapping extracts custom:tenant_id claim
- Lambda functions receive tenant_id in event.requestContext

✅ **Requirement 11.1**: All API requests authenticated with Cognito
- All endpoints (except OPTIONS) require Cognito authorization
- Invalid/expired tokens return 401 Unauthorized
- Authorization header required for all protected endpoints

✅ **Requirement 11.3**: API Gateway passes tenant_id to Lambda functions
- Request context includes all JWT claims
- tenant_id available via event.requestContext.authorizer.claims['custom:tenant_id']
- Additional claims (role, email, sub) also available

## Task Checklist

✅ Create REST API with Cognito authorizer
✅ Configure CORS for frontend domain
✅ Set up request validation and rate limiting
✅ Configure request context mapping to extract tenant_id from JWT

## Files Created/Modified

### Created
1. `infrastructure/api_gateway.tf` - Complete API Gateway configuration (700+ lines)
2. `infrastructure/API_GATEWAY_SETUP.md` - Comprehensive setup guide
3. `infrastructure/TASK_3_SUMMARY.md` - This summary document

### Modified
1. `infrastructure/outputs.tf` - Added API Gateway outputs

## Deployment Instructions

1. Ensure Task 2 (Cognito) is deployed first
2. Navigate to infrastructure directory:
   ```bash
   cd infrastructure
   ```

3. Initialize Terraform (if not already done):
   ```bash
   terraform init
   ```

4. Review the plan:
   ```bash
   terraform plan
   ```

5. Apply the configuration:
   ```bash
   terraform apply
   ```

6. Note the API Gateway URL:
   ```bash
   terraform output api_gateway_invoke_url
   ```

## Integration Points

### For Lambda Functions (Tasks 4-6)
Lambda functions will need:
1. Permissions to be invoked by API Gateway
2. Integration resources connecting methods to Lambda functions
3. Method responses and integration responses for proper HTTP responses

Example integration (to be added in Lambda tasks):
```hcl
resource "aws_api_gateway_integration" "users_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.users.id
  http_method = aws_api_gateway_method.users_get.http_method
  
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.user_management.invoke_arn
}
```

### For Frontend (Tasks 9-15)
Frontend will use:
1. API Gateway invoke URL from Terraform outputs
2. JWT tokens from Cognito for Authorization header
3. Standard REST API calls with proper CORS headers

Example configuration:
```typescript
const API_BASE_URL = process.env.REACT_APP_API_GATEWAY_URL;
const headers = {
  'Authorization': `Bearer ${jwtToken}`,
  'Content-Type': 'application/json'
};
```

## Testing Recommendations

After Lambda functions are deployed:

1. **Test Authentication**:
   - Verify 401 response without token
   - Verify 200 response with valid token
   - Verify 403 response with expired token

2. **Test CORS**:
   - Send OPTIONS preflight requests
   - Verify CORS headers in responses
   - Test from frontend domain

3. **Test Rate Limiting**:
   - Send burst of requests
   - Verify 429 response when limit exceeded
   - Verify throttling recovery

4. **Test Request Context**:
   - Verify Lambda receives tenant_id
   - Verify all JWT claims are passed
   - Test with different users/tenants

## Security Considerations

### Current Configuration
- CORS allows all origins (`*`) - suitable for development
- Rate limiting configured for moderate load
- Request validation enabled
- CloudWatch logging enabled

### Production Recommendations
1. **Restrict CORS**: Change `'*'` to specific frontend domain
2. **Add WAF**: Implement AWS WAF for DDoS protection
3. **Custom Domain**: Use custom domain with SSL certificate
4. **API Keys**: Consider adding API keys for additional security
5. **Adjust Limits**: Tune rate limits based on actual usage
6. **Set Alarms**: Configure CloudWatch alarms for errors and latency

## Next Steps

1. **Task 4**: Implement Lambda infrastructure (roles, VPC config, database connection)
2. **Task 5**: Implement user management Lambda function
3. **Task 6**: Implement QuickSight embed Lambda function
4. **Task 7**: Implement audit logging
5. **Task 8**: Test backend Lambda functions with API Gateway

## Notes

- API Gateway is ready to receive Lambda integrations
- All endpoints are defined but not yet connected to Lambda functions
- CORS is fully configured for frontend access
- Rate limiting and request validation are active
- Monitoring and logging are enabled
- Request context mapping will automatically pass tenant_id to Lambda functions

## Verification

To verify the API Gateway is correctly configured after deployment:

```bash
# Check API Gateway exists
aws apigateway get-rest-apis --query "items[?name=='shoppulse-analytics-api']"

# Check authorizer configuration
aws apigateway get-authorizers --rest-api-id <api-id>

# Check stage configuration
aws apigateway get-stage --rest-api-id <api-id> --stage-name dev

# Check usage plan
aws apigateway get-usage-plans --query "items[?name=='shoppulse-analytics-usage-plan']"
```
