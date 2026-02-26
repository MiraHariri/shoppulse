# Role Management API Deployment - COMPLETE

## Deployment Summary

Successfully deployed role management API endpoints to AWS using Terraform-managed API Gateway.

**Deployment Date**: February 24, 2026
**AWS Account**: 249759897196
**Region**: us-east-1
**Stage**: dev

## Deployed Resources

### Lambda Function
- **Function Name**: `dev-shoppulse-role-management`
- **ARN**: `arn:aws:lambda:us-east-1:249759897196:function:dev-shoppulse-role-management`
- **Deployed via**: Serverless Framework
- **Reserved Concurrency**: 100

### API Gateway Endpoints

**Base URL**: `https://9g0b03kd0l.execute-api.us-east-1.amazonaws.com/dev`

All endpoints include:
- Cognito User Pool authorization
- CORS headers
- AWS_PROXY integration with Lambda

#### Role Management Endpoints

1. **GET /roles**
   - List all roles for tenant
   - Returns roles with their assigned metrics

2. **POST /roles**
   - Create new role
   - Requires: role name, metrics array (min 1)
   - Admin only

3. **GET /roles/{role}**
   - Get specific role details
   - Returns role with metrics

4. **DELETE /roles/{role}**
   - Delete role and all metrics
   - Validates no active users have this role
   - Admin only

5. **POST /roles/{role}/metrics**
   - Add metrics to existing role
   - Ignores duplicates

6. **DELETE /roles/{role}/metrics/{metricName}**
   - Remove metric from role
   - Prevents removing last metric
   - Admin only

### Terraform Resources Created

1. **API Gateway Resources**:
   - `/roles`
   - `/roles/{role}`
   - `/roles/{role}/metrics`
   - `/roles/{role}/metrics/{metricName}`

2. **API Gateway Methods**:
   - 6 authenticated methods (GET, POST, DELETE)
   - 4 OPTIONS methods for CORS preflight

3. **Lambda Integrations**:
   - 6 AWS_PROXY integrations to role management Lambda
   - 4 MOCK integrations for OPTIONS

4. **Lambda Permission**:
   - API Gateway invoke permission for role management Lambda

5. **API Gateway Deployment**:
   - New deployment with all role endpoints
   - Updated stage to use new deployment

## Configuration

### Frontend Environment Variables
```env
VITE_API_GATEWAY_URL=https://9g0b03kd0l.execute-api.us-east-1.amazonaws.com/dev
VITE_COGNITO_USER_POOL_ID=us-east-1_62mjzjZHF
VITE_COGNITO_CLIENT_ID=fnm7uhg94irur76kgj3gl0ofs
VITE_AWS_REGION=us-east-1
```

### Backend Environment Variables
```env
COGNITO_USER_POOL_ID=us-east-1_62mjzjZHF
RDS_HOST=shoppulse-analytics-dev-db.co7o6yko2dcm.us-east-1.rds.amazonaws.com
RDS_PORT=5432
RDS_DATABASE=shoppulse
RDS_USERNAME=shoppulse_admin
RDS_PASSWORD=<sensitive>
```

## CORS Configuration

All endpoints properly configured with:
- **Access-Control-Allow-Origin**: `*`
- **Access-Control-Allow-Headers**: Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token
- **Access-Control-Allow-Methods**: GET, POST, DELETE, OPTIONS
- **Gateway Responses**: 4XX and 5XX errors include CORS headers

## Security

### Authentication
- All endpoints require Cognito User Pool JWT token
- Token passed in Authorization header: `Bearer <token>`
- Cognito Authorizer validates token before Lambda invocation

### Authorization
- Admin-only endpoints validated in Lambda handler
- Tenant isolation enforced via custom:tenant_id claim
- User validation against database

### Tenant Isolation
- All operations scoped to authenticated user's tenant
- Tenant ID extracted from JWT custom claim
- Database queries filtered by tenant_id

## Testing

### Test Role Management API

```bash
# Get JWT token from Cognito (after login)
TOKEN="<your-jwt-token>"

# List roles
curl -X GET https://9g0b03kd0l.execute-api.us-east-1.amazonaws.com/dev/roles \
  -H "Authorization: Bearer $TOKEN"

# Create role
curl -X POST https://9g0b03kd0l.execute-api.us-east-1.amazonaws.com/dev/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "Finance",
    "metrics": ["revenue", "profit", "expenses"]
  }'

# Get specific role
curl -X GET https://9g0b03kd0l.execute-api.us-east-1.amazonaws.com/dev/roles/Finance \
  -H "Authorization: Bearer $TOKEN"

# Add metrics to role
curl -X POST https://9g0b03kd0l.execute-api.us-east-1.amazonaws.com/dev/roles/Finance/metrics \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "metrics": ["cash_flow"]
  }'

# Remove metric from role
curl -X DELETE https://9g0b03kd0l.execute-api.us-east-1.amazonaws.com/dev/roles/Finance/metrics/cash_flow \
  -H "Authorization: Bearer $TOKEN"

# Delete role
curl -X DELETE https://9g0b03kd0l.execute-api.us-east-1.amazonaws.com/dev/roles/Finance \
  -H "Authorization: Bearer $TOKEN"
```

## Frontend Integration

The frontend is already configured and ready to use:
- API client configured with correct base URL
- Role service with all CRUD operations
- Redux slice for state management
- React components for UI (RoleList, RoleCard, RoleForm)
- Routing configured at `/roles`

## Database Schema

Role management uses the `role_metric_visibility` table:
```sql
CREATE TABLE role_metric_visibility (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(10) NOT NULL,
    role VARCHAR(20) NOT NULL,
    metric_name VARCHAR(50) NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    CONSTRAINT chk_role CHECK (role IN ('Admin', 'Finance', 'Operations', 'Marketing')),
    UNIQUE(tenant_id, role, metric_name)
);
```

## Next Steps

1. **Test the API** using the curl commands above or Postman
2. **Test the frontend** by navigating to `/roles` page
3. **Create roles** for your tenant (Finance, Operations, Marketing)
4. **Assign metrics** to each role based on business requirements
5. **Verify tenant isolation** by testing with multiple users

## Status

✅ Lambda function deployed (Serverless Framework)
✅ API Gateway resources created (Terraform)
✅ API Gateway methods configured (Terraform)
✅ Lambda integrations configured (Terraform)
✅ CORS properly configured
✅ Cognito authorization configured
✅ Frontend configured with API endpoint
✅ Database schema in place
✅ All 6 role management endpoints live and accessible

## Architecture

```
Frontend (React)
    ↓ HTTPS + JWT
API Gateway (Terraform-managed)
    ↓ Cognito Authorizer validates JWT
    ↓ AWS_PROXY integration
Lambda Function (Serverless-deployed)
    ↓ Validates admin permissions
    ↓ Enforces tenant isolation
PostgreSQL RDS
    ↓ role_metric_visibility table
```

## Deployment Commands

### Serverless (Lambda)
```bash
cd backend
npm run build
npx serverless deploy
```

### Terraform (API Gateway)
```bash
cd infrastructure
terraform plan -out=tfplan
terraform apply tfplan
```

## Troubleshooting

### CORS Errors
- Verify OPTIONS preflight returns 200
- Check Authorization header is included in allowed headers
- Confirm Lambda returns CORS headers in response

### 401 Unauthorized
- Verify JWT token is valid and not expired
- Check token is passed in Authorization header
- Confirm Cognito User Pool ID matches

### 403 Forbidden
- Verify user has admin permissions (is_tenant_admin = true)
- Check user exists in database
- Confirm tenant_id claim matches database

### 404 Not Found
- Verify API Gateway deployment is current
- Check endpoint URL is correct
- Confirm stage name is 'dev'
