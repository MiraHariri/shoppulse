# Task 2: AWS Cognito User Pool Setup - COMPLETED

## Summary

AWS Cognito User Pool has been successfully configured for ShopPulse Analytics multi-tenant authentication system.

## Implementation Details

### Files Created/Modified

1. **infrastructure/cognito.tf** - Complete Cognito User Pool configuration
2. **infrastructure/COGNITO_SETUP.md** - Comprehensive setup and usage documentation
3. **infrastructure/outputs.tf** - Cognito outputs for integration

### Configuration Implemented

#### 1. User Pool with Custom Attributes ✅

**Custom Attributes:**
- `custom:tenant_id` (String, required, immutable)
  - Min length: 1, Max length: 50
  - Immutable after creation to prevent tenant switching
- `custom:role` (String, required, mutable)
  - Min length: 1, Max length: 50
  - Mutable to allow role updates

**User Pool Settings:**
- Name: `shoppulse-analytics-{environment}-user-pool`
- Username: Email-based authentication
- Auto-verified attributes: Email
- Case-insensitive usernames

#### 2. Password Policy ✅

Configured password requirements:
- Minimum length: 8 characters
- Require uppercase letters: Yes
- Require lowercase letters: Yes
- Require numbers: Yes
- Require symbols: No
- Temporary password validity: 7 days

#### 3. Token Expiration ✅

Token validity configured:
- **Access Token**: 60 minutes (1 hour)
- **ID Token**: 60 minutes (1 hour)
- **Refresh Token**: 30 days

Token validity units explicitly set:
- Access token: minutes
- ID token: minutes
- Refresh token: days

#### 4. Account Recovery ✅

Account recovery configured:
- Recovery mechanism: Verified email
- Priority: 1 (primary method)

### Additional Features Implemented

#### User Pool Client Configuration

- Client name: `shoppulse-analytics-{environment}-web-client`
- Generate secret: No (for SPA compatibility)
- Enable token revocation: Yes
- Prevent user existence errors: Enabled

**Authentication Flows:**
- `ALLOW_USER_PASSWORD_AUTH` - Username/password authentication
- `ALLOW_REFRESH_TOKEN_AUTH` - Refresh token authentication
- `ALLOW_USER_SRP_AUTH` - Secure Remote Password (SRP) authentication

**Read Attributes:**
- email
- email_verified
- custom:tenant_id
- custom:role

**Write Attributes:**
- email
- custom:tenant_id
- custom:role

#### User Pool Domain

- Domain: `shoppulse-analytics-{environment}-{random-suffix}`
- Random suffix ensures uniqueness across AWS accounts

#### Security Features

- MFA configuration: Optional (can be enabled per user)
- Device tracking: Enabled with user prompt
- Deletion protection: Active in production, inactive in dev
- Email verification: Required before attribute updates

### Outputs Available

The following outputs are available for integration:

```terraform
cognito_user_pool_id          # User Pool ID
cognito_user_pool_arn         # User Pool ARN
cognito_user_pool_endpoint    # User Pool endpoint
cognito_web_client_id         # Web Client ID
cognito_domain                # Cognito domain
cognito_configuration         # Complete configuration object
```

## Requirements Validation

### Requirement 1.1: User Authentication with Tenant Context ✅

**Implementation:**
- Custom attribute `custom:tenant_id` is required and immutable
- JWT tokens include `custom:tenant_id` claim
- Frontend can extract tenant_id from access token
- Lambda functions receive tenant_id in request context

**Validation:**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "custom:tenant_id": "T001",
  "custom:role": "Finance",
  "token_use": "access",
  "exp": 1234567890
}
```

### Requirement 1.4: Tenant ID as Required User Attribute ✅

**Implementation:**
- `custom:tenant_id` is marked as required in schema
- Attribute is immutable after user creation
- All users must have tenant_id set during creation
- Prevents tenant switching attacks

## Deployment Instructions

### Prerequisites

1. Terraform >= 1.0 installed
2. AWS CLI configured with credentials
3. Appropriate IAM permissions for Cognito

### Deploy Cognito User Pool

```bash
cd infrastructure

# Initialize Terraform (if not done)
terraform init

# Review changes
terraform plan

# Apply configuration
terraform apply -target=aws_cognito_user_pool.main \
                -target=aws_cognito_user_pool_client.web_client \
                -target=aws_cognito_user_pool_domain.main \
                -target=random_string.domain_suffix
```

### Retrieve Configuration

```bash
# Get User Pool ID
terraform output cognito_user_pool_id

# Get Web Client ID
terraform output cognito_web_client_id

# Get complete configuration
terraform output cognito_configuration
```

## Integration Guide

### Frontend Integration (React + AWS Amplify)

```typescript
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    region: 'us-east-1',
    userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_COGNITO_CLIENT_ID
  }
});
```

**Environment Variables:**
```bash
REACT_APP_COGNITO_USER_POOL_ID=<from terraform output>
REACT_APP_COGNITO_CLIENT_ID=<from terraform output>
REACT_APP_AWS_REGION=us-east-1
```

### Lambda Integration

**Environment Variables:**
```bash
COGNITO_USER_POOL_ID=<from terraform output>
AWS_REGION=us-east-1
```

**IAM Permissions Required:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminUpdateUserAttributes",
        "cognito-idp:AdminDeleteUser",
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminSetUserPassword"
      ],
      "Resource": "arn:aws:cognito-idp:*:*:userpool/*"
    }
  ]
}
```

### API Gateway Integration

**Cognito Authorizer Configuration:**
```json
{
  "Type": "COGNITO_USER_POOLS",
  "ProviderARNs": ["<USER_POOL_ARN>"],
  "AuthorizerResultTtlInSeconds": 300,
  "IdentitySource": "method.request.header.Authorization"
}
```

**Request Context Mapping:**
```json
{
  "tenantId": "$context.authorizer.claims['custom:tenant_id']",
  "userId": "$context.authorizer.claims.sub",
  "userRole": "$context.authorizer.claims['custom:role']",
  "email": "$context.authorizer.claims.email"
}
```

## Testing

### Create Test User

```bash
aws cognito-idp admin-create-user \
  --user-pool-id <USER_POOL_ID> \
  --username test@example.com \
  --user-attributes \
    Name=email,Value=test@example.com \
    Name=custom:tenant_id,Value=T001 \
    Name=custom:role,Value=Finance \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS
```

### Set Permanent Password

```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id <USER_POOL_ID> \
  --username test@example.com \
  --password "SecurePass123!" \
  --permanent
```

### Authenticate User

```bash
aws cognito-idp admin-initiate-auth \
  --user-pool-id <USER_POOL_ID> \
  --client-id <CLIENT_ID> \
  --auth-flow ADMIN_NO_SRP_AUTH \
  --auth-parameters USERNAME=test@example.com,PASSWORD=SecurePass123!
```

### Verify Token Claims

Decode the returned access token to verify it contains:
- `custom:tenant_id`
- `custom:role`
- `email`
- Correct expiration time (1 hour from issue)

## Security Considerations

1. **Immutable Tenant ID**: Prevents users from switching tenants
2. **Short-lived Access Tokens**: 1-hour expiration minimizes security risk
3. **Long-lived Refresh Tokens**: 30-day validity for seamless re-authentication
4. **Email Verification**: Ensures valid contact information
5. **Optional MFA**: Can be enabled for enhanced security
6. **Deletion Protection**: Prevents accidental deletion in production

## Monitoring

### CloudWatch Metrics to Monitor

- `UserAuthentication` - Successful authentications
- `UserAuthenticationFailed` - Failed authentication attempts
- `TokenRefresh` - Token refresh operations
- `SignUpSuccesses` - New user registrations

### CloudWatch Logs

Enable CloudWatch Logs for Cognito to track:
- Authentication attempts
- User creation events
- Password changes
- MFA events

## Next Steps

1. ✅ Task 2 Complete - Cognito User Pool configured
2. ⏭️ Task 3 - Set up AWS API Gateway with Cognito authorizer
3. ⏭️ Task 4 - Implement backend Lambda infrastructure
4. ⏭️ Task 5 - Implement user management Lambda function
5. ⏭️ Task 10 - Implement Redux store and authentication in frontend

## Documentation

Comprehensive documentation available in:
- **COGNITO_SETUP.md** - Detailed setup, usage, and troubleshooting guide
- **cognito.tf** - Infrastructure as Code with inline comments
- **outputs.tf** - Available outputs for integration

## Status

✅ **TASK COMPLETED**

All requirements for Task 2 have been successfully implemented:
- ✅ Cognito User Pool with custom attributes (tenant_id, role)
- ✅ Password policy (min 8 chars, uppercase, lowercase, numbers)
- ✅ Token expiration (access: 1 hour, refresh: 30 days)
- ✅ Account recovery via email

The Cognito User Pool is ready for deployment and integration with API Gateway (Task 3) and Lambda functions (Tasks 4-7).
