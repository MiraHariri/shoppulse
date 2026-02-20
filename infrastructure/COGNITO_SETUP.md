# AWS Cognito User Pool Setup

## Overview

This document describes the AWS Cognito User Pool configuration for ShopPulse Analytics multi-tenant authentication.

## Configuration Details

### User Pool Settings

**Name**: `shoppulse-analytics-{environment}-user-pool`

**Custom Attributes**:
- `custom:tenant_id` (String, required, immutable) - Tenant identifier for multi-tenancy
- `custom:role` (String, required, mutable) - User role (Admin, Finance, Operations, Marketing)

### Password Policy

- Minimum length: 8 characters
- Requires uppercase letters: Yes
- Requires lowercase letters: Yes
- Requires numbers: Yes
- Requires symbols: No
- Temporary password validity: 7 days

### Token Expiration

- **Access Token**: 1 hour (60 minutes)
- **ID Token**: 1 hour (60 minutes)
- **Refresh Token**: 30 days

### Account Recovery

- Recovery method: Verified email
- Priority: 1 (primary method)

### Authentication Flows

The User Pool Client supports the following authentication flows:
- `ALLOW_USER_PASSWORD_AUTH` - Username/password authentication
- `ALLOW_REFRESH_TOKEN_AUTH` - Refresh token authentication
- `ALLOW_USER_SRP_AUTH` - Secure Remote Password (SRP) authentication

### User Attributes

**Read Attributes**:
- email
- email_verified
- custom:tenant_id
- custom:role

**Write Attributes**:
- email
- custom:tenant_id
- custom:role

## Deployment

### Prerequisites

1. Terraform >= 1.0
2. AWS CLI configured with appropriate credentials
3. Appropriate IAM permissions to create Cognito resources

### Deploy Cognito User Pool

```bash
cd infrastructure

# Initialize Terraform (if not already done)
terraform init

# Review the Cognito configuration
terraform plan

# Apply the configuration
terraform apply
```

### Retrieve Configuration Values

After deployment, retrieve the Cognito configuration:

```bash
# Get User Pool ID
terraform output cognito_user_pool_id

# Get Web Client ID
terraform output cognito_web_client_id

# Get complete configuration
terraform output cognito_configuration
```

## Usage

### Creating a User (Admin Operation)

Users should be created through the Lambda user management function, which automatically sets the `tenant_id` attribute. However, for testing, you can create a user manually:

```bash
aws cognito-idp admin-create-user \
  --user-pool-id <USER_POOL_ID> \
  --username user@example.com \
  --user-attributes \
    Name=email,Value=user@example.com \
    Name=custom:tenant_id,Value=T001 \
    Name=custom:role,Value=Finance \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS
```

### Setting Permanent Password

```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id <USER_POOL_ID> \
  --username user@example.com \
  --password "SecurePass123!" \
  --permanent
```

### Authenticating a User

```bash
aws cognito-idp admin-initiate-auth \
  --user-pool-id <USER_POOL_ID> \
  --client-id <CLIENT_ID> \
  --auth-flow ADMIN_NO_SRP_AUTH \
  --auth-parameters USERNAME=user@example.com,PASSWORD=SecurePass123!
```

### Verifying Token Claims

After authentication, decode the JWT access token to verify it contains the required claims:

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "custom:tenant_id": "T001",
  "custom:role": "Finance",
  "cognito:groups": [],
  "token_use": "access",
  "exp": 1234567890
}
```

## Frontend Integration

### AWS Amplify Configuration

```typescript
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    region: 'us-east-1',
    userPoolId: '<USER_POOL_ID>',
    userPoolWebClientId: '<WEB_CLIENT_ID>'
  }
});
```

### Environment Variables

Set these environment variables in your frontend application:

```bash
REACT_APP_COGNITO_USER_POOL_ID=<USER_POOL_ID>
REACT_APP_COGNITO_CLIENT_ID=<WEB_CLIENT_ID>
REACT_APP_AWS_REGION=us-east-1
```

## Lambda Integration

### Environment Variables

Lambda functions should have these environment variables:

```bash
COGNITO_USER_POOL_ID=<USER_POOL_ID>
AWS_REGION=us-east-1
```

### IAM Permissions

Lambda execution roles need these Cognito permissions:

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
      "Resource": "arn:aws:cognito-idp:us-east-1:*:userpool/<USER_POOL_ID>"
    }
  ]
}
```

## API Gateway Integration

### Cognito Authorizer Configuration

```json
{
  "Type": "COGNITO_USER_POOLS",
  "ProviderARNs": ["<USER_POOL_ARN>"],
  "AuthorizerResultTtlInSeconds": 300,
  "IdentitySource": "method.request.header.Authorization"
}
```

### Extracting Tenant Context

API Gateway can extract tenant_id from the JWT token and pass it to Lambda:

```json
{
  "tenantId": "$context.authorizer.claims['custom:tenant_id']",
  "userId": "$context.authorizer.claims.sub",
  "userRole": "$context.authorizer.claims['custom:role']",
  "email": "$context.authorizer.claims.email"
}
```

## Security Considerations

1. **Immutable tenant_id**: The `tenant_id` attribute is immutable after user creation to prevent tenant switching
2. **Token expiration**: Short-lived access tokens (1 hour) minimize security risk
3. **Refresh tokens**: 30-day refresh tokens allow seamless re-authentication
4. **Email verification**: Auto-verified email ensures valid contact information
5. **MFA**: Optional MFA can be enabled for enhanced security
6. **Deletion protection**: Enabled in production to prevent accidental deletion

## Testing

### Test User Creation

Create test users for each tenant and role:

```bash
# Tenant T001 - Finance User
aws cognito-idp admin-create-user \
  --user-pool-id <USER_POOL_ID> \
  --username finance@tenant1.com \
  --user-attributes \
    Name=email,Value=finance@tenant1.com \
    Name=custom:tenant_id,Value=T001 \
    Name=custom:role,Value=Finance \
  --temporary-password "TempPass123!"

# Tenant T001 - Admin User
aws cognito-idp admin-create-user \
  --user-pool-id <USER_POOL_ID> \
  --username admin@tenant1.com \
  --user-attributes \
    Name=email,Value=admin@tenant1.com \
    Name=custom:tenant_id,Value=T001 \
    Name=custom:role,Value=Admin \
  --temporary-password "TempPass123!"

# Tenant T002 - Operations User
aws cognito-idp admin-create-user \
  --user-pool-id <USER_POOL_ID> \
  --username ops@tenant2.com \
  --user-attributes \
    Name=email,Value=ops@tenant2.com \
    Name=custom:tenant_id,Value=T002 \
    Name=custom:role,Value=Operations \
  --temporary-password "TempPass123!"
```

### Verify Token Claims

```bash
# Authenticate and get tokens
TOKENS=$(aws cognito-idp admin-initiate-auth \
  --user-pool-id <USER_POOL_ID> \
  --client-id <CLIENT_ID> \
  --auth-flow ADMIN_NO_SRP_AUTH \
  --auth-parameters USERNAME=finance@tenant1.com,PASSWORD=SecurePass123! \
  --query 'AuthenticationResult.AccessToken' \
  --output text)

# Decode token (using jwt.io or a JWT library)
echo $TOKENS | jwt decode -
```

## Troubleshooting

### Common Issues

1. **User creation fails with "Invalid custom attribute"**
   - Ensure the User Pool has been created with custom attributes defined
   - Custom attributes must be prefixed with `custom:` when setting values

2. **Token doesn't contain custom attributes**
   - Verify the User Pool Client has read permissions for custom attributes
   - Check that attributes were set during user creation

3. **Authentication fails with "User does not exist"**
   - Verify the username (email) is correct
   - Check that the user was created in the correct User Pool

4. **Token expired errors**
   - Access tokens expire after 1 hour
   - Use refresh tokens to obtain new access tokens
   - Implement automatic token refresh in the frontend

## Monitoring

### CloudWatch Metrics

Monitor these Cognito metrics in CloudWatch:
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

## Compliance

This Cognito configuration supports:
- **GDPR**: User data can be exported and deleted
- **SOC 2**: Audit logging and access controls
- **Multi-tenancy**: Strict tenant isolation via immutable tenant_id

## References

- [AWS Cognito User Pools Documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- [AWS Amplify Authentication](https://docs.amplify.aws/lib/auth/getting-started/q/platform/js/)
- [Terraform AWS Cognito Resources](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool)
