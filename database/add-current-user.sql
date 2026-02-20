-- Add the currently logged-in user to the database
-- This resolves the "User not found or inactive" error when trying to create users

-- Step 1: Check existing tenants
SELECT tenant_id, tenant_name, is_active FROM tenants;

-- Step 2: If no tenant exists, create one
INSERT INTO tenants (tenant_id, tenant_name, industry, plan_tier, country, is_active)
VALUES ('T001', 'Demo Tenant', 'Retail', 'Enterprise', 'USA', true)
ON CONFLICT (tenant_id) DO NOTHING;

-- Step 3: Check existing users
SELECT user_id, tenant_id, email, cognito_user_id, role, is_tenant_admin, status 
FROM users 
ORDER BY created_at DESC;

-- Step 4: Add the logged-in user
-- IMPORTANT: Replace these values with the actual user information
-- You can get the cognito_user_id (sub) from the JWT token or Cognito console

-- Get the user's Cognito sub from the browser console:
-- After logging in, open browser DevTools > Application > Local Storage
-- Or check the Network tab for the Authorization header and decode the JWT token

INSERT INTO users (
    user_id, 
    tenant_id, 
    email, 
    cognito_user_id, 
    role, 
    is_tenant_admin, 
    status,
    created_at
) VALUES (
    'U001',                                    -- user_id: Use U001 for first user
    'T001',                                    -- tenant_id: Must match tenant above
    'admin@example.com',                       -- email: Replace with your login email
    'REPLACE_WITH_COGNITO_SUB',                -- cognito_user_id: Get from Cognito or JWT token
    'Admin',                                   -- role: Must be Admin to create users
    true,                                      -- is_tenant_admin: Must be true
    'Active',                                  -- status: Must be Active
    NOW()
)
ON CONFLICT (cognito_user_id) DO UPDATE SET
    is_tenant_admin = true,
    role = 'Admin',
    status = 'Active';

-- Step 5: Verify the user was added
SELECT user_id, tenant_id, email, cognito_user_id, role, is_tenant_admin, status 
FROM users 
WHERE email = 'admin@example.com';  -- Replace with your email
