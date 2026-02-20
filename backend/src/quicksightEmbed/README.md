# QuickSight Embed Handler

This module implements the QuickSight dashboard embedding functionality for ShopPulse Analytics.

## Overview

The QuickSight embed handler generates secure, time-limited embed URLs that allow authenticated users to view dashboards directly within the ShopPulse application. The implementation ensures strict tenant isolation and role-based access control.

## Features

- **Tenant Isolation**: Each user only sees data for their tenant through QuickSight RLS
- **Role-Based Access**: Dashboard visibility controlled by user roles (Finance, Operations, Marketing, Admin)
- **Governance Rules**: Additional data filtering based on region, store, team, or custom dimensions
- **Secure URLs**: 15-minute expiration on embed URLs
- **Automatic User Provisioning**: QuickSight users are automatically registered if they don't exist

## Implementation Details

### Row-Level Security (RLS)

For registered user embedding, RLS is implemented at the QuickSight dataset level:

1. **Dataset Configuration**: QuickSight datasets have RLS rules configured that reference user attributes
2. **User Attributes**: When users are registered in QuickSight, their attributes (tenant_id, role, etc.) are set
3. **Automatic Filtering**: QuickSight automatically applies RLS based on the authenticated user's attributes

**Note**: Session tags (as mentioned in the design document) are primarily supported for anonymous user embedding via `GenerateEmbedUrlForAnonymousUser`. For registered users, RLS is configured at the dataset level rather than passed in the embed URL.

### Governance Rules

Governance rules provide additional data filtering beyond tenant isolation:

- **Dimensions**: region, store, team, custom
- **Storage**: Rules are stored in PostgreSQL `governance_rules` table
- **Application**: Rules are retrieved and logged for audit purposes
- **Future Enhancement**: Can be used with anonymous embedding if session tags are needed

## API Endpoint

### GET /dashboards/embed-url

Generates a QuickSight embed URL for the authenticated user.

**Authentication**: Required (Cognito JWT token)

**Request**: No body required

**Response**:
```json
{
  "embedUrl": "https://us-east-1.quicksight.aws.amazon.com/embed/...",
  "expiresIn": 900
}
```

**Error Responses**:
- `404`: Dashboard not available for your role
- `403`: Access denied to QuickSight dashboard
- `429`: Too many requests (throttling)
- `500`: Failed to generate dashboard URL

## Environment Variables

Required environment variables:

- `QUICKSIGHT_AWS_ACCOUNT_ID`: AWS account ID for QuickSight
- `QUICKSIGHT_DASHBOARD_ID`: Dashboard ID to embed
- `AWS_REGION`: AWS region (default: us-east-1)
- `RDS_HOST`, `RDS_PORT`, `RDS_DATABASE`, `RDS_USERNAME`, `RDS_PASSWORD`: Database connection

## Database Schema

### governance_rules Table

```sql
CREATE TABLE governance_rules (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(10) NOT NULL,
    user_id VARCHAR(10) NOT NULL,
    dimension VARCHAR(50) NOT NULL,
    values TEXT[] NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT chk_governance_dimension CHECK (dimension IN ('region', 'store', 'team', 'custom'))
);
```

## QuickSight Setup

### Prerequisites

1. **QuickSight Enterprise Edition**: Required for embedding
2. **Dataset RLS Configuration**: Configure RLS rules on datasets:
   ```sql
   -- Example RLS rule for tenant isolation
   SELECT * FROM sales_data WHERE tenant_id = '${tenant_id}'
   
   -- Example RLS rule with role-based filtering
   SELECT * FROM sales_data 
   WHERE tenant_id = '${tenant_id}'
   AND (role = 'Admin' OR region IN (${region}))
   ```

3. **User Registration**: Users must be registered in QuickSight with appropriate attributes:
   - `tenant_id`: User's tenant identifier
   - `role`: User's role (Finance, Operations, Marketing, Admin)
   - Additional attributes for governance (region, store, team)

### Dashboard Configuration

1. Create dashboards in QuickSight
2. Configure RLS on underlying datasets
3. Set appropriate permissions for embedded access
4. Note the Dashboard ID for configuration

## Security Considerations

- **URL Expiration**: Embed URLs expire after 15 minutes
- **Tenant Isolation**: Enforced at multiple layers (authentication, database, QuickSight RLS)
- **Role-Based Access**: Users only see dashboards authorized for their role
- **Audit Logging**: All embed URL generations are logged with tenant context
- **HTTPS Only**: All QuickSight embed URLs use HTTPS

## Testing

To test the embed handler:

1. Ensure QuickSight is configured with datasets and RLS
2. Create test users in Cognito with tenant_id and role attributes
3. Call the endpoint with a valid JWT token
4. Verify the returned embed URL loads the dashboard
5. Verify RLS filtering shows only appropriate data

## Future Enhancements

- **Anonymous Embedding**: Support for public dashboards using session tags
- **Multi-Dashboard Support**: Allow users to switch between multiple dashboards
- **Custom Branding**: Apply tenant-specific branding to embedded dashboards
- **Usage Analytics**: Track dashboard usage per tenant and user
