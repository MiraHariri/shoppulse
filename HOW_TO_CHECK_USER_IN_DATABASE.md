# How to Check if User Exists in Database

## Quick Method: Using psql Command Line

### Step 1: Get Your Cognito User ID (sub)

You need your Cognito `sub` (subject ID). You can get it in two ways:

**Option A: From AWS Console**
```bash
aws cognito-idp admin-get-user \
  --user-pool-id us-east-1_62mjzjZHF \
  --username your@email.com \
  --region us-east-1
```

Look for the `sub` attribute in the output.

**Option B: From Browser (easier)**
1. Login to your app
2. Open Browser DevTools (F12)
3. Go to Console tab
4. Run this:
```javascript
// Get the current user's Cognito sub
const session = await window.Amplify.Auth.fetchAuthSession();
console.log('Cognito Sub:', session.tokens.idToken.payload.sub);
console.log('Tenant ID:', session.tokens.idToken.payload['custom:tenant_id']);
console.log('Role:', session.tokens.idToken.payload['custom:role']);
```

### Step 2: Connect to Database

```bash
# Connect to your RDS database
psql -h shoppulse-analytics-dev-db.co7o6yko2dcm.us-east-1.rds.amazonaws.com \
     -U shoppulse_admin \
     -d shoppulse
```

When prompted, enter password: `AkWoH4mTtfXOT899CtdsSjpErE02qkqQ`

### Step 3: Check if User Exists

```sql
-- Replace YOUR_COGNITO_SUB with the actual sub from Step 1
SELECT * FROM users WHERE cognito_user_id = 'YOUR_COGNITO_SUB';
```

**If you get results:** Your user exists! ✓

**If you get no results:** Your user doesn't exist, proceed to Step 4.

### Step 4: Add User to Database (if not exists)

```sql
-- First, check what tenant_id you should use (from Cognito custom:tenant_id)
-- Most likely 'T001'

-- Insert your user
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
    'U001',                           -- Change to U002, U003 if U001 exists
    'T001',                           -- Must match your Cognito custom:tenant_id
    'your@email.com',                 -- Your actual email
    'YOUR_COGNITO_SUB',               -- Your Cognito sub from Step 1
    'Finance',                        -- Your role (must match Cognito custom:role)
    'North',                          -- Optional: region for filtering
    'store1',                         -- Optional: store for filtering
    true,                             -- Is tenant admin
    'Active'                          -- Status
);
```

### Step 5: Verify

```sql
SELECT * FROM users WHERE cognito_user_id = 'YOUR_COGNITO_SUB';
```

## Alternative: Using a SQL File

I've created `database/check-and-add-user.sql` with all the queries. You can:

1. Edit the file with your actual values
2. Run it:
```bash
psql -h shoppulse-analytics-dev-db.co7o6yko2dcm.us-east-1.rds.amazonaws.com \
     -U shoppulse_admin \
     -d shoppulse \
     -f database/check-and-add-user.sql
```

## Important Notes

1. **tenant_id must match**: The `tenant_id` in the database MUST match the `custom:tenant_id` in your Cognito user attributes.

2. **role must match**: The `role` in the database should match the `custom:role` in Cognito (though the code uses Cognito's role, not the database role).

3. **cognito_user_id is the sub**: This is the unique identifier from Cognito, found in the JWT token's `sub` claim.

## Quick Check: See All Users

```sql
SELECT 
    user_id,
    tenant_id,
    email,
    role,
    region,
    store_id,
    status
FROM users;
```

## Example: Complete User Addition

Let's say your Cognito sub is `abc123-def456-ghi789` and email is `john@example.com`:

```sql
-- Check if user exists
SELECT * FROM users WHERE cognito_user_id = 'abc123-def456-ghi789';

-- If not exists, add user
INSERT INTO users (
    user_id, tenant_id, email, cognito_user_id, role, region, store_id, is_tenant_admin, status
) VALUES (
    'U001', 'T001', 'john@example.com', 'abc123-def456-ghi789', 'Finance', 'North', 'store1', true, 'Active'
);

-- Verify
SELECT * FROM users WHERE cognito_user_id = 'abc123-def456-ghi789';
```

## Troubleshooting

### Can't connect to database
- Check if your IP is allowed in RDS security group
- Verify RDS is publicly accessible
- Check credentials in backend/.env

### "relation users does not exist"
- Database schema not created
- Run: `psql ... -f database/schema.sql`

### "duplicate key value violates unique constraint"
- User already exists with that email or cognito_user_id
- Use a different user_id or check existing users
