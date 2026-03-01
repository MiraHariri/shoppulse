# Role Management Feature

## Overview

A complete role management system has been implemented for ShopPulse Analytics, allowing administrators to create custom roles and assign metrics to them. Roles are automatically saved in the `role_metric_visibility` table.

## Features Implemented

### Backend (Lambda Functions)

**Location:** `backend/src/roleManagement/`

#### API Endpoints

1. **GET /roles** - List all roles with their metrics
   - Returns all roles for the tenant with their associated metrics
   - Grouped by role name

2. **GET /roles/{role}** - Get specific role details
   - Returns metrics for a specific role
   - Tenant-scoped

3. **POST /roles** - Create new role
   - Requires: `role` (string) and `metrics` (array of strings)
   - At least one metric is required
   - Automatically saves to `role_metric_visibility` table
   - Validates role doesn't already exist

4. **POST /roles/{role}/metrics** - Add metrics to existing role
   - Adds new metrics to a role
   - Ignores duplicates
   - Tenant-scoped

5. **DELETE /roles/{role}/metrics/{metricName}** - Remove metric from role
   - Removes a specific metric from a role
   - Prevents removing the last metric (must delete role instead)
   - Tenant-scoped

6. **DELETE /roles/{role}** - Delete role
   - Deletes role and all its metrics
   - Prevents deletion if users are assigned to the role
   - Tenant-scoped

#### Security

- All endpoints require Admin role (validated via `validateTenantAdmin`)
- Tenant isolation enforced on all operations
- Cognito JWT authentication required

### Frontend (React Components)

**Location:** `frontend/src/components/roles/`

#### Components

1. **RoleList.tsx** - Main role management page
   - Displays all roles in a grid layout
   - "Create New Role" button
   - Admin-only access control
   - Loading and empty states

2. **RoleCard.tsx** - Individual role card
   - Displays role name and metric count
   - Lists all metrics with remove buttons
   - Inline "Add Metric" functionality
   - Delete role button
   - Prevents removing last metric

3. **RoleForm.tsx** - Create new role form
   - Role name input
   - Dynamic metric inputs (add/remove)
   - Validation (role name required, at least one metric)
   - Error handling

#### State Management

**Location:** `frontend/src/store/roleSlice.ts`

Redux Toolkit slice with async thunks:
- `fetchRoles` - Load all roles
- `createRole` - Create new role
- `addMetrics` - Add metrics to role
- `removeMetric` - Remove metric from role
- `deleteRole` - Delete role

#### Services

**Location:** `frontend/src/services/roleService.ts`

API client wrapper for all role management endpoints.

#### Types

**Location:** `frontend/src/types/role.types.ts`

TypeScript interfaces:
- `RoleMetric` - Individual metric structure
- `Role` - Role with metrics array
- `CreateRoleData` - Create role request
- `AddMetricsData` - Add metrics request

### Routing

**Updated Files:**
- `frontend/src/App.tsx` - Added `/roles` route
- `frontend/src/pages/RolesPage.tsx` - New page component
- `frontend/src/components/layout/Sidebar.tsx` - Added "Roles" navigation link (Admin only)

### Database

The feature uses the existing `role_metric_visibility` table:

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
    UNIQUE(tenant_id, role, metric_name)
);
```

## Usage

### Creating a Role

1. Navigate to "Roles" in the sidebar (Admin only)
2. Click "Create New Role"
3. Enter role name (e.g., "Sales", "Support")
4. Add at least one metric (e.g., "revenue", "orders")
5. Click "Create Role"

### Managing Metrics

**Add Metric:**
1. Click "+ Add Metric" on a role card
2. Enter metric name
3. Click "Add" or press Enter

**Remove Metric:**
1. Click the X button next to a metric
2. Confirm removal
3. Note: Cannot remove the last metric

### Deleting a Role

1. Click the trash icon on a role card
2. Confirm deletion
3. Note: Cannot delete if users are assigned to the role

## API Examples

### Create Role

```bash
POST /roles
Authorization: Bearer {cognito-jwt-token}
Content-Type: application/json

{
  "role": "Sales",
  "metrics": ["revenue", "orders", "conversion_rate"]
}
```

### Add Metrics

```bash
POST /roles/Sales/metrics
Authorization: Bearer {cognito-jwt-token}
Content-Type: application/json

{
  "metrics": ["customer_lifetime_value", "churn_rate"]
}
```

### Remove Metric

```bash
DELETE /roles/Sales/metrics/churn_rate
Authorization: Bearer {cognito-jwt-token}
```

## Deployment

### Backend

```bash
cd backend
npm run build
serverless deploy
```

The role management Lambda is already configured in `serverless.yml` with all necessary API Gateway integrations.

### Frontend

The frontend changes are already integrated into the React application. No additional deployment steps needed beyond the normal frontend build process.

## Testing

### Manual Testing

1. Log in as an Admin user
2. Navigate to /roles
3. Create a new role with multiple metrics
4. Add a metric to the role
5. Remove a metric from the role
6. Try to remove the last metric (should fail)
7. Delete the role
8. Try to delete a role with assigned users (should fail)

### Validation

- ✅ Admin-only access enforced
- ✅ Tenant isolation maintained
- ✅ At least one metric required per role
- ✅ Cannot remove last metric
- ✅ Cannot delete role with active users
- ✅ Duplicate metrics prevented
- ✅ Real-time UI updates

## Files Created

### Backend
- `backend/src/roleManagement/handler.ts`
- `backend/src/roleManagement/index.ts`

### Frontend
- `frontend/src/types/role.types.ts`
- `frontend/src/services/roleService.ts`
- `frontend/src/store/roleSlice.ts`
- `frontend/src/components/roles/RoleList.tsx`
- `frontend/src/components/roles/RoleCard.tsx`
- `frontend/src/components/roles/RoleForm.tsx`
- `frontend/src/pages/RolesPage.tsx`

### Modified
- `frontend/src/App.tsx` - Added roles route
- `frontend/src/components/layout/Sidebar.tsx` - Added roles navigation
- `backend/serverless.yml` - Already had role management function configured

## Next Steps

1. Deploy backend: `cd backend && npm run deploy`
2. Test the feature in the UI
3. Optionally add more validation rules
4. Consider adding role templates for common use cases
5. Add ability to toggle `is_visible` flag per metric
