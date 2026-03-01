-- ============================================================================
-- Check and Add User to Database
-- ============================================================================

-- STEP 1: Check if your user exists
-- Replace 'YOUR_COGNITO_SUB_ID' with your actual Cognito sub (user ID)
-- You can find this in your JWT token or Cognito console

SELECT 
    user_id,
    tenant_id,
    email,
    cognito_user_id,
    role,
    region,
    store_id,
    status
FROM users 
WHERE cognito_user_id = 'YOUR_COGNITO_SUB_ID';

-- If the query above returns no rows, your user doesn't exist in the database
-- Proceed to STEP 2

-- ============================================================================
-- STEP 2: Add your user to the database
-- ============================================================================

-- First, make sure tenant exists (check if T001 exists)
SELECT tenant_id, tenant_name FROM tenants WHERE tenant_id = 'T001';

-- If tenant doesn't exist, create it first:
-- INSERT INTO tenants (tenant_id, tenant_name, industry, plan_tier, country, created_date, is_active)
-- VALUES ('T001', 'My Company', 'Retail', 'Premium', 'USA', CURRENT_DATE, true);

-- Now insert your user
-- Replace the following values:
--   - 'U001': A unique user ID (e.g., U001, U002, etc.)
--   - 'T001': Your tenant ID (must match custom:tenant_id in Cognito)
--   - 'your@email.com': Your email address
--   - 'YOUR_COGNITO_SUB_ID': Your Cognito sub (user ID from JWT token)
--   - 'Finance': Your role (Admin, Finance, Operations, or Marketing)
--   - 'North': Your region (optional, can be NULL)
--   - 'store1': Your store ID (optional, can be NULL)

INSERT INTO users (
    user_id,
    tenant_id,
    email,
    cognito_user_id,
    role,
    region,
    store_id,
    is_tenant_admin,
    status
) VALUES (
    'U001',                      -- user_id: Change if U001 already exists
    'T001',                      -- tenant_id: Must match Cognito custom:tenant_id
    'your@email.com',            -- email: Your email
    'YOUR_COGNITO_SUB_ID',       -- cognito_user_id: From Cognito (sub claim)
    'Finance',                   -- role: Admin, Finance, Operations, or Marketing
    'North',                     -- region: Optional (can be NULL)
    'store1',                    -- store_id: Optional (can be NULL)
    true,                        -- is_tenant_admin: true or false
    'Active'                     -- status: Active, Inactive, or Deleted
);

-- ============================================================================
-- STEP 3: Verify the user was added
-- ============================================================================

SELECT 
    user_id,
    tenant_id,
    email,
    cognito_user_id,
    role,
    region,
    store_id,
    status
FROM users 
WHERE cognito_user_id = 'YOUR_COGNITO_SUB_ID';

-- ============================================================================
-- STEP 4: Check what users currently exist (for reference)
-- ============================================================================

SELECT 
    user_id,
    tenant_id,
    email,
    LEFT(cognito_user_id, 20) || '...' as cognito_user_id_preview,
    role,
    region,
    store_id,
    status
FROM users 
ORDER BY created_at DESC;
