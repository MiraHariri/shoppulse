# Design Document: ShopPulse Analytics

## Overview

ShopPulse Analytics is a multi-tenant embedded analytics platform built on AWS serverless architecture. The system provides secure, isolated business intelligence capabilities to e-commerce brands through Amazon QuickSight embedded dashboards. The platform ensures strict tenant isolation through a combination of AWS Cognito authentication with tenant_id attributes, row-level security (RLS) in QuickSight, and database-level filtering in PostgreSQL RDS.

The architecture follows a three-tier serverless model:
- **Frontend**: React.js single-page application with AWS Amplify for authentication
- **Backend**: Node.js Lambda functions behind API Gateway for business logic
- **Data Layer**: PostgreSQL RDS for tenant metadata and Amazon QuickSight for analytics

The design emphasizes security, scalability, and tenant isolation while providing a modern, intuitive user experience.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         End Users                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   React.js Frontend (S3 + CloudFront)            │
│  - AWS Amplify Integration                                       │
│  - User Management UI                                            │
│  - Dashboard Embedding                                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AWS Cognito                                 │
│  - User Pool with tenant_id custom attribute                     │
│  - JWT tokens with tenant_id claim                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AWS API Gateway                             │
│  - Cognito Authorizer                                            │
│  - Request validation                                            │
│  - tenant_id extraction                                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AWS Lambda (Node.js)                           │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │  User Management │  │  QuickSight      │                     │
│  │  Functions       │  │  Embed Functions │                     │
│  └──────────────────┘  └──────────────────┘                     │
└──────────┬────────────────────────┬─────────────────────────────┘
           │                        │
           ▼                        ▼
┌──────────────────────┐  ┌──────────────────────────────────────┐
│  PostgreSQL RDS      │  │    Amazon QuickSight                 │
│  - Tenant metadata   │  │    - Embedded dashboards             │
│  - User roles        │  │    - RLS with tenant_id              │
│  - Governance rules  │  │    - Shared dashboard definitions    │
└──────────────────────┘  └──────────────────────────────────────┘
```


### Component Interactions

1. **Authentication Flow**:
   - User submits credentials through React frontend
   - aws-amplify in React frontend authenticates against Cognito User Pool
   - Cognito returns JWT access token with tenant_id claim
   - Frontend stores tokens and includes in API requests

2. **API Request Flow**:
   - Frontend makes API request with JWT token in Authorization header
   - API Gateway validates token using Cognito Authorizer
   - API Gateway extracts tenant_id from token claims
   - Lambda function receives request with tenant_id in context
   - Lambda validates tenant_id matches requested resources

3. **Dashboard Embedding Flow**:
   - User navigates to dashboard page
   - Frontend requests embed URL from Lambda
   - Lambda generates QuickSight embed URL with tenant_id in RLS context
   - Lambda returns signed URL (15-minute expiration)
   - Frontend renders dashboard in iframe
   - QuickSight applies RLS filters based on tenant_id

### Technology Stack

- **Frontend**: React 18+ with TypeScript, Redux Toolkit for state management, AWS Amplify SDK, Material-UI or Tailwind CSS
- **Backend**: Node.js 18+ Lambda functions, AWS SDK v3
- **API Layer**: AWS API Gateway (REST API)
- **Authentication**: AWS Cognito User Pools
- **Database**: PostgreSQL 15+ on Amazon RDS
- **Analytics**: Amazon QuickSight Enterprise Edition
- **Hosting**: S3 + CloudFront for frontend static assets
- **Infrastructure**: AWS CDK or Terraform for IaC

## Components and Interfaces

### 1. AWS Cognito User Pool

**Configuration**:
- Custom attribute: `custom:tenant_id` (string, required, mutable)
- Password policy: minimum 8 characters, require uppercase, lowercase, numbers
- Token expiration: Access token 1 hour, Refresh token 30 days

**User Attributes**:
```json
{
  "email": "user@example.com",
  "custom:tenant_id": "tenant_abc123",
  "custom:role": "Finance",
  "email_verified": true
}
```

**JWT Token Claims**:
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "custom:tenant_id": "tenant_abc123",
  "custom:role": "Finance",
  "cognito:groups": [],
  "token_use": "access",
  "exp": 1234567890
}
```


### 2. AWS API Gateway

**Endpoints**:

```
GET    /users                   - List users for tenant
POST   /users                   - Create new user
GET    /users/{userId}          - Get user details
PUT    /users/{userId}          - Update user
DELETE /users/{userId}          - Delete/deactivate user
PUT    /users/{userId}/role     - Update user role

GET    /dashboards/embed-url    - Generate QuickSight embed URL
GET    /dashboards/list         - List available dashboards for role

GET    /governance/rules        - Get tenant governance rules
PUT    /governance/rules        - Update governance rules
```

**Authorizer Configuration**:
- Type: Cognito User Pool Authorizer
- Token source: Authorization header
- Token validation: Automatic via Cognito
- Identity source: `method.request.header.Authorization`

**Request Context Mapping**:
```javascript
{
  "tenantId": "$context.authorizer.claims['custom:tenant_id']",
  "userId": "$context.authorizer.claims.sub",
  "userRole": "$context.authorizer.claims['custom:role']",
  "email": "$context.authorizer.claims.email"
}
```

### 3. Lambda Functions (Node.js)

#### User Management Lambda

**Function**: `shoppulse-user-management`

**Environment Variables**:
```
COGNITO_USER_POOL_ID=us-east-1_xxxxx
RDS_HOST=shoppulse-db.xxxxx.us-east-1.rds.amazonaws.com
RDS_PORT=5432
RDS_DATABASE=shoppulse
RDS_SECRET_ARN=arn:aws:secretsmanager:...
```

**Key Operations**:

1. **Create User** (`POST /users`):
```javascript
async function createUser(event) {
  const { tenantId, userId: adminUserId } = event.requestContext.authorizer.claims;
  const { email, password, role } = JSON.parse(event.body);
  
  // Validate admin permissions
  await validateTenantAdmin(adminUserId, tenantId);
  
  // Create in Cognito with tenant_id
  const cognitoUser = await cognito.adminCreateUser({
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    Username: email,
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'custom:tenant_id', Value: tenantId },
      { Name: 'custom:role', Value: role }
    ],
    TemporaryPassword: password
  });
  
  // Store in PostgreSQL
  await db.query(
    'INSERT INTO users (cognito_user_id, tenant_id, email, role) VALUES ($1, $2, $3, $4, $5)',
    [cognitoUser.User.Username, tenantId, email, role]
  );
  
  return { statusCode: 201, body: JSON.stringify({ userId: cognitoUser.User.Username }) };
}
```


2. **List Users** (`GET /users`):
```javascript
async function listUsers(event) {
  const { tenantId } = event.requestContext.authorizer.claims;
  
  // Query PostgreSQL with tenant_id filter
  const result = await db.query(
    'SELECT user_id, email, role, status, created_at FROM users WHERE tenant_id = $1 AND status != $2',
    [tenantId, 'deleted']
  );
  
  return { statusCode: 200, body: JSON.stringify(result.rows) };
}
```

3. **Update User Role** (`PUT /users/{userId}/role`):
```javascript
async function updateUserRole(event) {
  const { tenantId, userId: adminUserId } = event.requestContext.authorizer.claims;
  const { userId } = event.pathParameters;
  const { role } = JSON.parse(event.body);
  
  // Validate tenant ownership
  const user = await db.query(
    'SELECT tenant_id FROM users WHERE user_id = $1',
    [userId]
  );
  
  if (user.rows[0].tenant_id !== tenantId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  
  // Update Cognito
  await cognito.adminUpdateUserAttributes({
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    Username: userId,
    UserAttributes: [{ Name: 'custom:role', Value: role }]
  });
  
  // Update PostgreSQL
  await db.query(
    'UPDATE users SET role = $1, updated_at = NOW() WHERE user_id = $2 AND tenant_id = $3',
    [role, userId, tenantId]
  );
  
  return { statusCode: 200, body: JSON.stringify({ success: true }) };
}
```

#### QuickSight Embed Lambda

**Function**: `shoppulse-quicksight-embed`

**Environment Variables**:
```
QUICKSIGHT_AWS_ACCOUNT_ID=123456789012
QUICKSIGHT_DASHBOARD_ID=dashboard-id-here
RDS_HOST=shoppulse-db.xxxxx.us-east-1.rds.amazonaws.com
RDS_PORT=5432
RDS_DATABASE=shoppulse
RDS_SECRET_ARN=arn:aws:secretsmanager:...
```

**Key Operations**:

1. **Generate Embed URL** (`GET /dashboards/embed-url`):
```javascript
async function generateEmbedUrl(event) {
  const { tenantId, userId, userRole, email } = event.requestContext.authorizer.claims;
  
  // Get governance rules from PostgreSQL
  const governanceRules = await db.query(
    'SELECT dimension, values FROM governance_rules WHERE tenant_id = $1 AND user_id = $2',
    [tenantId, userId]
  );
  
  // Build RLS context
  const sessionTags = [
    { Key: 'tenant_id', Value: tenantId },
    { Key: 'role', Value: userRole },
    ...governanceRules.rows.map(rule => ({
      Key: rule.dimension,
      Value: rule.values.join(',')
    }))
  ];
  
  // Generate embed URL
  const embedUrl = await quicksight.generateEmbedUrlForRegisteredUser({
    AwsAccountId: process.env.QUICKSIGHT_AWS_ACCOUNT_ID,
    SessionLifetimeInMinutes: 15,
    UserArn: `arn:aws:quicksight:us-east-1:${process.env.QUICKSIGHT_AWS_ACCOUNT_ID}:user/default/${email}`,
    ExperienceConfiguration: {
      Dashboard: {
        InitialDashboardId: process.env.QUICKSIGHT_DASHBOARD_ID
      }
    },
    SessionTags: sessionTags
  });
  
  return { statusCode: 200, body: JSON.stringify({ embedUrl: embedUrl.EmbedUrl }) };
}
```


### 4. PostgreSQL RDS Database

**Database Engine**: PostgreSQL 15.x
**Instance Type**: db.t3.medium
**Storage**: 100GB GP3 with no autoscaling
**Multi-AZ**: Disabled
**Backup**: Disabled

**Connection Management**:
- Credentials stored in AWS Secrets Manager


### 5. React TypeScript Frontend Application

**Project Structure**:
```
src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── AuthProvider.tsx
│   ├── dashboard/
│   │   ├── DashboardEmbed.tsx
│   │   ├── DashboardLoader.tsx
│   │   └── DashboardError.tsx
│   ├── users/
│   │   ├── UserList.tsx
│   │   ├── UserForm.tsx
│   │   ├── UserTable.tsx
│   │   └── RoleSelector.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Layout.tsx
│   └── common/
│       ├── Button.tsx
│       ├── Modal.tsx
│       └── LoadingSpinner.tsx
├── store/
│   ├── index.ts
│   ├── authSlice.ts
│   ├── userSlice.ts
│   └── dashboardSlice.ts
├── services/
│   ├── authService.ts
│   ├── userService.ts
│   └── dashboardService.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useUsers.ts
│   └── useDashboard.ts
├── types/
│   ├── auth.types.ts
│   ├── user.types.ts
│   └── dashboard.types.ts
├── utils/
│   ├── apiClient.ts
│   └── constants.ts
├── App.tsx
└── index.tsx
```

**Key Components**:

1. **Redux Store Configuration** (`store/index.ts`):
```typescript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import userReducer from './userSlice';
import dashboardReducer from './dashboardSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: userReducer,
    dashboard: dashboardReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

2. **Auth Slice** (`store/authSlice.ts`):
```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Auth } from 'aws-amplify';
import { AuthUser, LoginCredentials } from '../types/auth.types';

Amplify.configure({
  Auth: {
    region: 'us-east-1',
    userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_COGNITO_CLIENT_ID
  }
});

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null
};

export const checkAuth = createAsyncThunk('auth/checkAuth', async () => {
  const currentUser = await Auth.currentAuthenticatedUser();
  return {
    id: currentUser.attributes.sub,
    email: currentUser.attributes.email,
    tenantId: currentUser.attributes['custom:tenant_id'],
    role: currentUser.attributes['custom:role']
  } as AuthUser;
});

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials) => {
    const cognitoUser = await Auth.signIn(credentials.email, credentials.password);
    const attributes = cognitoUser.attributes;
    return {
      id: attributes.sub,
      email: attributes.email,
      tenantId: attributes['custom:tenant_id'],
      role: attributes['custom:role']
    } as AuthUser;
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await Auth.signOut();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action: PayloadAction<AuthUser>) => {
        state.user = action.payload;
        state.loading = false;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.user = null;
        state.loading = false;
      })
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<AuthUser>) => {
        state.user = action.payload;
        state.loading = false;
      })
      .addCase(login.rejected, (state, action) => {
        state.error = action.error.message || 'Login failed';
        state.loading = false;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
      });
  }
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
```

3. **Auth Types** (`types/auth.types.ts`):
```typescript
export interface AuthUser {
  id: string;
  email: string;
  tenantId: string;
  role: 'Admin' | 'Finance' | 'Operations' | 'Marketing';
}

export interface LoginCredentials {
  email: string;
  password: string;
}
```

4. **Auth Hooks** (`hooks/useAuth.ts`):
```typescript
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { checkAuth, login, logout } from '../store/authSlice';
import { LoginCredentials } from '../types/auth.types';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading, error } = useSelector((state: RootState) => state.auth);
  
  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);
  
  const handleLogin = async (credentials: LoginCredentials) => {
    await dispatch(login(credentials)).unwrap();
  };
  
  const handleLogout = async () => {
    await dispatch(logout()).unwrap();
  };
  
  return { user, loading, error, login: handleLogin, logout: handleLogout };
};
```


5. **DashboardEmbed.tsx** - QuickSight dashboard embedding:
```typescript
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchEmbedUrl } from '../../store/dashboardSlice';
import DashboardLoader from './DashboardLoader';
import DashboardError from './DashboardError';

export default function DashboardEmbed() {
  const dispatch = useDispatch<AppDispatch>();
  const { embedUrl, loading, error } = useSelector((state: RootState) => state.dashboard);
  
  useEffect(() => {
    loadDashboard();
    
    // Refresh embed URL every 10 minutes (before 15-minute expiration)
    const interval = setInterval(loadDashboard, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  const loadDashboard = () => {
    dispatch(fetchEmbedUrl());
  };
  
  if (loading && !embedUrl) return <DashboardLoader />;
  if (error) return <DashboardError error={error} onRetry={loadDashboard} />;
  
  return (
    <div className="dashboard-container">
      <iframe
        src={embedUrl || ''}
        width="100%"
        height="800px"
        frameBorder="0"
        title="Analytics Dashboard"
      />
    </div>
  );
}
```

6. **User Slice** (`store/userSlice.ts`):
```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { userService } from '../services/userService';
import { User, CreateUserData } from '../types/user.types';

interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  users: [],
  loading: false,
  error: null
};

export const fetchUsers = createAsyncThunk('users/fetchUsers', async () => {
  return await userService.listUsers();
});

export const createUser = createAsyncThunk(
  'users/createUser',
  async (userData: CreateUserData) => {
    return await userService.createUser(userData);
  }
);

export const updateUserRole = createAsyncThunk(
  'users/updateUserRole',
  async ({ userId, role }: { userId: string; role: string }) => {
    await userService.updateUserRole(userId, role);
    return { userId, role };
  }
);

export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async (userId: string) => {
    await userService.deleteUser(userId);
    return userId;
  }
);

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUsers.fulfilled, (state, action: PayloadAction<User[]>) => {
        state.users = action.payload;
        state.loading = false;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch users';
        state.loading = false;
      })
      .addCase(createUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.users.push(action.payload);
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        const user = state.users.find(u => u.user_id === action.payload.userId);
        if (user) {
          user.role = action.payload.role;
        }
      })
      .addCase(deleteUser.fulfilled, (state, action: PayloadAction<string>) => {
        state.users = state.users.filter(u => u.user_id !== action.payload);
      });
  }
});

export default userSlice.reducer;
```

7. **UserList.tsx** - User management interface:
```typescript
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchUsers, createUser, updateUserRole, deleteUser } from '../../store/userSlice';
import UserTable from './UserTable';
import UserForm from './UserForm';
import { useAuth } from '../../hooks/useAuth';
import { CreateUserData } from '../../types/user.types';

export default function UserList() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();
  const { users, loading } = useSelector((state: RootState) => state.users);
  const [showForm, setShowForm] = useState(false);
  
  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);
  
  const handleCreateUser = async (userData: CreateUserData) => {
    await dispatch(createUser(userData)).unwrap();
    setShowForm(false);
  };
  
  const handleUpdateRole = async (userId: string, newRole: string) => {
    await dispatch(updateUserRole({ userId, role: newRole })).unwrap();
  };
  
  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      await dispatch(deleteUser(userId)).unwrap();
    }
  };
  
  if (user?.role !== 'Admin') {
    return <div>Access denied. Admin role required.</div>;
  }
  
  return (
    <div className="user-management">
      <div className="header">
        <h1>User Management</h1>
        <button onClick={() => setShowForm(true)}>Add User</button>
      </div>
      
      {showForm && (
        <UserForm
          onSubmit={handleCreateUser}
          onCancel={() => setShowForm(false)}
        />
      )}
      
      <UserTable
        users={users}
        loading={loading}
        onUpdateRole={handleUpdateRole}
        onDelete={handleDeleteUser}
      />
    </div>
  );
}
```


**API Client** (`apiClient.ts`):
```typescript
import { Auth } from 'aws-amplify';

const API_BASE_URL = process.env.REACT_APP_API_GATEWAY_URL;

async function getAuthHeaders(): Promise<HeadersInit> {
  const session = await Auth.currentSession();
  const token = session.getAccessToken().getJwtToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }
  
  return response.json();
}
```

**User Types** (`types/user.types.ts`):
```typescript
export interface User {
  user_id: string;
  email: string;
  role: 'Admin' | 'Finance' | 'Operations' | 'Marketing';
  status: 'active' | 'inactive' | 'deleted';
  created_at: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  role: string;
}
```

**UI Design Approach**:

The frontend will feature a modern, trendy design with the following characteristics:

1. **Color Palette**:
   - Primary: Deep purple (#6366F1) for brand identity
   - Secondary: Teal (#14B8A6) for accents and CTAs
   - Background: Light gray (#F9FAFB) with white cards
   - Text: Dark gray (#1F2937) for readability
   - Success: Green (#10B981), Error: Red (#EF4444)

2. **Typography**:
   - Font family: Poppins for modern, clean look
   - Headings: Bold, large sizes (32px-48px)
   - Body: Regular weight, 16px base size
   - Monospace: JetBrains Mono for code/data

3. **Layout**:
   - Sidebar navigation with collapsible menu
   - Top header with user profile and notifications
   - Card-based content areas with subtle shadows
   - Responsive grid system (mobile-first)
   - Generous whitespace for breathing room

4. **Interactive Elements**:
   - Smooth transitions (200-300ms)
   - Hover effects with scale and color changes
   - Loading skeletons instead of spinners
   - Toast notifications for feedback
   - Micro-interactions (button ripples, icon animations)

5. **Dashboard Embedding**:
   - Full-width iframe with minimal chrome
   - Seamless integration with app styling
   - Loading state with branded animation
   - Error states with helpful retry options

6. **User Management UI**:
   - Data table with sorting, filtering, search
   - Inline editing for quick role changes
   - Modal forms for creating users
   - Confirmation dialogs for destructive actions
   - Badge components for roles and status

7. **Accessibility**:
   - WCAG 2.1 AA compliance
   - Keyboard navigation support
   - Screen reader friendly
   - High contrast mode support
   - Focus indicators on interactive elements


## Data Models

### PostgreSQL Database Schema

**Connection String**:
```
postgresql://username:password@shoppulse-db.xxxxx.us-east-1.rds.amazonaws.com:5432/shoppulse?sslmode=require
```

**Schema Definition**:

```sql
-- 1. TENANTS TABLE
CREATE TABLE tenants (
    tenant_id VARCHAR(10) PRIMARY KEY,
    tenant_name VARCHAR(100) NOT NULL,
    industry VARCHAR(50),
    plan_tier VARCHAR(20),
    country VARCHAR(50),
    created_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS TABLE (with cognito_user_id)
CREATE TABLE users (
    user_id VARCHAR(10) PRIMARY KEY,
    tenant_id VARCHAR(10) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    cognito_user_id VARCHAR(255) UNIQUE NOT NULL, -- AWS Cognito sub identifier
    role VARCHAR(20) NOT NULL,
    region VARCHAR(10),
    store_id VARCHAR(10),
    is_tenant_admin BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

-- 3. ORDERS TABLE
CREATE TABLE orders (
    order_id VARCHAR(20) PRIMARY KEY,
    tenant_id VARCHAR(10) NOT NULL,
    order_date DATE NOT NULL,
    store_id VARCHAR(10),
    region VARCHAR(10),
    channel VARCHAR(20),
    order_status VARCHAR(20),
    items_count INTEGER,
    gross_revenue DECIMAL(10,2),
    discount_amount DECIMAL(10,2),
    net_revenue DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

-- 4. FULFILLMENT TABLE
CREATE TABLE fulfillment (
    fulfillment_id SERIAL PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL,
    tenant_id VARCHAR(10) NOT NULL,
    warehouse VARCHAR(20),
    carrier VARCHAR(20),
    promised_delivery_date DATE,
    actual_delivery_date DATE,
    fulfillment_status VARCHAR(20),
    sla_met BOOLEAN,
    days_to_ship INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

-- 5. MARKETING CAMPAIGNS TABLE
CREATE TABLE marketing_campaigns (
    campaign_id VARCHAR(20) PRIMARY KEY,
    tenant_id VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    channel VARCHAR(20),
    spend DECIMAL(10,2),
    impressions INTEGER,
    clicks INTEGER,
    conversions INTEGER,
    revenue_attributed DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

-- 6. ROLE METRIC VISIBILITY TABLE
CREATE TABLE role_metric_visibility (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(10) NOT NULL,
    role VARCHAR(20) NOT NULL,
    metric_name VARCHAR(50) NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    UNIQUE(tenant_id, role, metric_name)
);

-- 7. GOVERNANCE RULES TABLE (for additional tenant-level data governance)
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

-- 8. AUDIT LOGS TABLE
CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(10) NOT NULL,
    user_id VARCHAR(10),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```


**Database Initialization Script**:

```sql
-- Create database
CREATE DATABASE shoppulse;

-- Connect to database
\c shoppulse;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Run schema creation (tables above)

-- Insert sample tenant data
INSERT INTO tenants (tenant_id, tenant_name, industry, plan_tier, country, created_date, is_active) VALUES
  ('T001', 'Fashion Boutique', 'Retail', 'Premium', 'USA', '2024-01-01', true),
  ('T002', 'Tech Gadgets Inc', 'Electronics', 'Enterprise', 'Canada', '2024-01-15', true);

-- Insert default role metric visibility for each role
INSERT INTO role_metric_visibility (tenant_id, role, metric_name, is_visible) VALUES
  ('T001', 'Finance', 'gross_revenue', true),
  ('T001', 'Finance', 'net_revenue', true),
  ('T001', 'Finance', 'discount_amount', true),
  ('T001', 'Operations', 'fulfillment_status', true),
  ('T001', 'Operations', 'sla_met', true),
  ('T001', 'Operations', 'days_to_ship', true),
  ('T001', 'Marketing', 'campaign_spend', true),
  ('T001', 'Marketing', 'conversions', true),
  ('T001', 'Marketing', 'revenue_attributed', true),
  ('T001', 'Admin', 'gross_revenue', true),
  ('T001', 'Admin', 'net_revenue', true),
  ('T001', 'Admin', 'fulfillment_status', true),
  ('T001', 'Admin', 'campaign_spend', true);
```

**Data Access Patterns**:

1. **User Lookup by Tenant**:
```sql
SELECT user_id, email, role, status, region, store_id, is_tenant_admin
FROM users 
WHERE tenant_id = $1 AND status = 'Active'
ORDER BY email;
```

2. **Validate Tenant Ownership**:
```sql
SELECT EXISTS(
  SELECT 1 FROM users 
  WHERE user_id = $1 AND tenant_id = $2
) AS is_valid;
```

3. **Get Governance Rules**:
```sql
SELECT dimension, values 
FROM governance_rules 
WHERE tenant_id = $1 AND user_id = $2;
```

4. **Get Role Metric Visibility**:
```sql
SELECT metric_name, is_visible 
FROM role_metric_visibility 
WHERE tenant_id = $1 AND role = $2 AND is_visible = true;
```

5. **Get Orders for Tenant with Filters**:
```sql
SELECT order_id, order_date, store_id, region, channel, 
       gross_revenue, net_revenue, order_status
FROM orders 
WHERE tenant_id = $1 
  AND order_date BETWEEN $2 AND $3
  AND ($4 IS NULL OR region = $4)
  AND ($5 IS NULL OR store_id = $5)
ORDER BY order_date DESC;
```

6. **Get Fulfillment Metrics**:
```sql
SELECT f.fulfillment_id, f.order_id, f.warehouse, f.carrier,
       f.promised_delivery_date, f.actual_delivery_date,
       f.fulfillment_status, f.sla_met, f.days_to_ship
FROM fulfillment f
WHERE f.tenant_id = $1
  AND f.actual_delivery_date BETWEEN $2 AND $3;
```

7. **Get Marketing Campaign Performance**:
```sql
SELECT campaign_id, date, channel, spend, impressions, clicks,
       conversions, revenue_attributed,
       CASE WHEN spend > 0 THEN (revenue_attributed / spend) ELSE 0 END as roi
FROM marketing_campaigns
WHERE tenant_id = $1
  AND date BETWEEN $2 AND $3
ORDER BY date DESC;
```

8. **Audit Log Insert**:
```sql
INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, details, ip_address)
VALUES ($1, $2, $3, $4, $5, $6, $7);
```
INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, details, ip_address)
VALUES ($1, $2, $3, $4, $5, $6, $7);
```

### Amazon QuickSight Configuration

**Dataset Configuration**:

QuickSight datasets connect to the tenant's e-commerce data warehouse (separate from the PostgreSQL metadata database). The data warehouse contains:

- **sales_transactions**: Order-level transaction data
- **products**: Product catalog
- **customers**: Customer information
- **marketing_campaigns**: Campaign metadata
- **fulfillment_events**: Shipping and delivery data

**Row-Level Security (RLS)**:

Each dataset must have RLS rules configured:

```sql
-- RLS Rule: Tenant Isolation
SELECT * FROM sales_transactions
WHERE tenant_id = '${tenant_id}'

-- RLS Rule: Regional Governance (if applicable)
SELECT * FROM sales_transactions
WHERE tenant_id = '${tenant_id}'
  AND (region IN (${region}) OR '${region}' = 'ALL')

-- RLS Rule: Store Governance (if applicable)
SELECT * FROM sales_transactions
WHERE tenant_id = '${tenant_id}'
  AND (store_id IN (${store}) OR '${store}' = 'ALL')
```

**Dashboard Definitions**:

1. **Revenue Dashboard** (Finance role):
   - Total revenue KPI card
   - Revenue trend line chart (daily/weekly/monthly)
   - Revenue by product category bar chart
   - Top products table

2. **Margin Analysis** (Finance role):
   - Gross margin percentage KPI
   - Margin by category bar chart
   - Cost breakdown pie chart
   - Profitability trend line

3. **Fulfillment Dashboard** (Operations role):
   - Orders shipped KPI
   - Fulfillment SLA percentage gauge
   - Shipping time distribution histogram
   - Late orders table

4. **Inventory Dashboard** (Operations role):
   - Stock levels by warehouse
   - Low stock alerts table
   - Inventory turnover rate
   - Reorder recommendations

5. **Campaign Dashboard** (Marketing role):
   - Campaign ROI KPI
   - Conversion rate by channel
   - Customer acquisition cost trend
   - Campaign performance table

6. **Conversion Dashboard** (Marketing role):
   - Conversion funnel visualization
   - Bounce rate by page
   - Traffic sources pie chart
   - A/B test results table


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property Reflection

After analyzing all acceptance criteria, several properties can be combined to eliminate redundancy:

- Properties 2.3 and 2.4 both test cross-tenant authorization and can be combined into a single comprehensive property
- Properties 3.2, 3.4, and 12.3 all test session context in embed URLs and can be combined
- Properties 5.4 and 5.5 both test tenant isolation in user management and can be combined
- Properties 6.2, 6.3, and 6.5 all test tenant isolation across interactive operations and can be combined
- Properties 11.3 and 11.4 both test tenant_id propagation through the request pipeline and can be combined

### Core Properties

**Property 1: Authentication Token Contains Tenant Context**
*For any* valid user credentials, successful authentication should return an access token that contains the user's tenant_id as a claim.
**Validates: Requirements 1.1, 1.4**

**Property 2: Invalid Credentials Are Rejected**
*For any* invalid credential combination (wrong password, non-existent email, malformed input), authentication attempts should be rejected with an appropriate error message.
**Validates: Requirements 1.2**

**Property 3: API Gateway Extracts Tenant Context**
*For any* authenticated request with a valid JWT token, the API Gateway should extract the tenant_id from the token and include it in the request context passed to Lambda functions.
**Validates: Requirements 1.3, 11.3**

**Property 4: Database Queries Include Tenant Filter**
*For any* database query executed by the Backend Service, the WHERE clause should include a tenant_id filter matching the authenticated user's tenant_id.
**Validates: Requirements 2.2**

**Property 5: Cross-Tenant Access Is Denied**
*For any* request attempting to access resources (users, dashboards, governance rules) belonging to a different tenant than the authenticated user's tenant_id, the Backend Service should reject the request with an authorization error.
**Validates: Requirements 2.3, 2.4, 5.4, 5.5**

**Property 6: QuickSight RLS Filters By Tenant**
*For any* QuickSight query execution, the Analytics Engine should apply row-level security filters using the authenticated user's tenant_id, ensuring results contain only data for that tenant.
**Validates: Requirements 2.1, 8.2**

**Property 7: Embed URL Generation Includes Complete Session Context**
*For any* dashboard access request, the generated QuickSight embed URL should include session tags for tenant_id, user role, and any applicable governance rules in the RLS context.
**Validates: Requirements 3.1, 3.2, 3.4, 12.3**

**Property 8: Embed URLs Expire After 15 Minutes**
*For any* generated embed URL, the expiration time should be set to exactly 15 minutes from generation time.
**Validates: Requirements 3.3**

**Property 9: Role-Based Dashboard Access**
*For any* user with a specific role (Finance, Operations, Marketing, Admin), embed URL generation should include permissions only for dashboards authorized for that role according to the dashboard_permissions table.
**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

**Property 10: User Creation Inherits Admin Tenant**
*For any* user creation request by a tenant admin, the newly created user should be assigned the same tenant_id as the admin who created them, both in Cognito and PostgreSQL.
**Validates: Requirements 5.1**

**Property 11: Role Assignment Is Tenant-Scoped**
*For any* role assignment operation, the Backend Service should verify that the user being assigned a role belongs to the same tenant as the admin performing the assignment, and store the assignment with tenant_id validation.
**Validates: Requirements 5.2**

**Property 12: User Deletion Removes From Both Systems**
*For any* user deletion request, the Backend Service should remove the user from Cognito and mark them as inactive in PostgreSQL, ensuring both systems reflect the deletion.
**Validates: Requirements 5.3**

**Property 13: Interactive Operations Preserve Tenant Isolation**
*For any* interactive dashboard operation (filters, drill-downs, parameter changes), the Analytics Engine should maintain tenant_id filtering, ensuring users cannot access data outside their tenant scope through interaction.
**Validates: Requirements 6.2, 6.3, 6.5**

**Property 14: Dashboard Exports Respect Tenant and Role Boundaries**
*For any* dashboard export operation, the exported data should include only records visible to the user's tenant_id and authorized by their role permissions.
**Validates: Requirements 7.1**

**Property 15: Embed URLs Are Not Shareable Across Tenants**
*For any* embed URL generated for a user in tenant A, attempting to use that URL with credentials from tenant B should result in access denial or no data visibility.
**Validates: Requirements 7.4**

**Property 16: Concurrent Multi-Tenant Access**
*For any* set of concurrent dashboard access requests from users in different tenants, each user should see only their own tenant's data without interference or data leakage between tenants.
**Validates: Requirements 8.4**

**Property 17: User Management UI Displays Tenant-Scoped Data**
*For any* tenant admin accessing the user management interface, the displayed user list should contain only users belonging to that admin's tenant_id.
**Validates: Requirements 9.1**

**Property 18: API Requests Include Authentication Tokens**
*For any* API request from the Frontend Application to the Backend Service, the request should include a valid Cognito access token in the Authorization header.
**Validates: Requirements 9.4, 13.3**

**Property 19: Invalid Tokens Result in 401 Unauthorized**
*For any* API request with an invalid, expired, or missing authentication token, the API Gateway should reject the request with a 401 Unauthorized status code.
**Validates: Requirements 11.1, 11.2**

**Property 20: Lambda Functions Use Request Context Tenant ID**
*For any* Lambda function execution, all data operations (database queries, QuickSight API calls) should use the tenant_id from the request context rather than accepting tenant_id from request parameters.
**Validates: Requirements 11.4**

**Property 21: Operations Are Logged With Tenant Context**
*For any* backend operation (user creation, role update, dashboard access), an audit log entry should be created in PostgreSQL containing the tenant_id, user_id, action, and timestamp.
**Validates: Requirements 11.5**

**Property 22: Governance Rules Are Tenant-Scoped**
*For any* governance rule creation or update, the rule should be stored in PostgreSQL with the tenant_id of the admin creating it, and should only be retrievable by users within that tenant.
**Validates: Requirements 12.1**

**Property 23: Governance Filters Are Applied With Tenant Filters**
*For any* QuickSight query where governance rules exist for the user, the Analytics Engine should apply both tenant_id filtering AND governance dimension filtering (region, store, team) to restrict data visibility.
**Validates: Requirements 12.4**

**Property 24: Governance Changes Reflect in New Embed URLs**
*For any* user whose governance rules are updated, the next embed URL generation should include the updated governance rules in the session tags, reflecting the new data access scope.
**Validates: Requirements 12.5**

**Property 25: SQL Injection Prevention**
*For any* user input used in database queries (email, role, governance values), the Backend Service should use parameterized queries that prevent SQL injection attacks, ensuring malicious input cannot execute arbitrary SQL.
**Validates: Requirements 15.4**

**Property 26: All Tenant Data Tables Include Tenant ID**
*For any* table in PostgreSQL that stores tenant-specific data (users, governance_rules, dashboard_permissions, audit_logs), the table schema should include a tenant_id column with appropriate indexes and foreign key constraints.
**Validates: Requirements 15.1, 15.5**


## Error Handling

### Authentication Errors

**Invalid Credentials**:
- Status: 401 Unauthorized
- Response: `{ "error": "Invalid email or password" }`
- Action: Frontend displays error message, allows retry

**Expired Token**:
- Status: 401 Unauthorized
- Response: `{ "error": "Token expired" }`
- Action: Frontend attempts automatic refresh, redirects to login if refresh fails

**Missing Token**:
- Status: 401 Unauthorized
- Response: `{ "error": "Authentication required" }`
- Action: Frontend redirects to login page

### Authorization Errors

**Cross-Tenant Access Attempt**:
- Status: 403 Forbidden
- Response: `{ "error": "Access denied: resource belongs to different tenant" }`
- Action: Frontend displays error, logs security event

**Insufficient Role Permissions**:
- Status: 403 Forbidden
- Response: `{ "error": "Insufficient permissions for this operation" }`
- Action: Frontend displays error message

**Invalid User ID**:
- Status: 404 Not Found
- Response: `{ "error": "User not found" }`
- Action: Frontend displays error, refreshes user list

### QuickSight Errors

**Embed URL Generation Failure**:
- Status: 500 Internal Server Error
- Response: `{ "error": "Failed to generate dashboard URL", "retryable": true }`
- Action: Frontend displays error with retry button, logs error details

**QuickSight User Not Found**:
- Status: 404 Not Found
- Response: `{ "error": "QuickSight user not provisioned" }`
- Action: Backend attempts automatic user provisioning, retries embed URL generation

**Dashboard Not Found**:
- Status: 404 Not Found
- Response: `{ "error": "Dashboard not available for your role" }`
- Action: Frontend displays message, suggests contacting admin

### Database Errors

**Connection Failure**:
- Status: 503 Service Unavailable
- Response: `{ "error": "Database temporarily unavailable", "retryable": true }`
- Action: Lambda retries with exponential backoff (3 attempts), returns error if all fail

**Constraint Violation**:
- Status: 400 Bad Request
- Response: `{ "error": "User with this email already exists" }`
- Action: Frontend displays validation error

**Query Timeout**:
- Status: 504 Gateway Timeout
- Response: `{ "error": "Request timed out", "retryable": true }`
- Action: Frontend displays error with retry option

### Validation Errors

**Invalid Email Format**:
- Status: 400 Bad Request
- Response: `{ "error": "Invalid email format", "field": "email" }`
- Action: Frontend displays inline validation error

**Invalid Role**:
- Status: 400 Bad Request
- Response: `{ "error": "Invalid role. Must be one of: Admin, Finance, Operations, Marketing", "field": "role" }`
- Action: Frontend displays validation error

**Missing Required Field**:
- Status: 400 Bad Request
- Response: `{ "error": "Missing required field", "field": "tenant_id" }`
- Action: Frontend displays validation error

### Error Logging Strategy

All errors should be logged with the following context:
- Timestamp
- Request ID (for tracing)
- Tenant ID (if available)
- User ID (if available)
- Error type and message
- Stack trace (for 5xx errors)
- Request path and method

**CloudWatch Log Groups**:
- `/aws/lambda/shoppulse-user-management` - User management logs
- `/aws/lambda/shoppulse-quicksight-embed` - Dashboard embedding logs


## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit tests and property-based tests as complementary approaches:

- **Unit tests**: Verify specific examples, edge cases, error conditions, and integration points
- **Property-based tests**: Verify universal properties across all inputs through randomization

Both are necessary for comprehensive coverage. Unit tests catch concrete bugs in specific scenarios, while property-based tests verify general correctness across a wide input space.

### Property-Based Testing

**Framework**: Use `fast-check` for Node.js Lambda functions and `@testing-library/react` with custom property generators for React components.

**Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `// Feature: shoppulse-analytics, Property {number}: {property_text}`

**Example Property Test** (Property 5: Cross-Tenant Access Is Denied):

```javascript
// Feature: shoppulse-analytics, Property 5: Cross-Tenant Access Is Denied
const fc = require('fast-check');
const { getUserById } = require('../src/userManagement');

describe('Property 5: Cross-Tenant Access', () => {
  it('should deny access when requesting user from different tenant', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // requesting user's tenant_id
        fc.uuid(), // target user's tenant_id
        fc.uuid(), // target user_id
        async (requestingTenantId, targetTenantId, targetUserId) => {
          // Assume tenants are different
          fc.pre(requestingTenantId !== targetTenantId);
          
          // Setup: Create user in target tenant
          await createTestUser(targetUserId, targetTenantId);
          
          // Execute: Try to access user from different tenant
          const context = { tenantId: requestingTenantId };
          
          // Assert: Should throw authorization error
          await expect(
            getUserById(context, targetUserId)
          ).rejects.toThrow('Access denied: resource belongs to different tenant');
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Example Property Test** (Property 7: Embed URL Includes Session Context):

```javascript
// Feature: shoppulse-analytics, Property 7: Embed URL Generation Includes Complete Session Context
const fc = require('fast-check');
const { generateEmbedUrl } = require('../src/quicksightEmbed');

describe('Property 7: Embed URL Session Context', () => {
  it('should include tenant_id, role, and governance rules in session tags', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // tenant_id
        fc.constantFrom('Admin', 'Finance', 'Operations', 'Marketing'), // role
        fc.array(fc.record({ dimension: fc.string(), values: fc.array(fc.string()) })), // governance rules
        async (tenantId, role, governanceRules) => {
          // Setup: Create user with governance rules
          const userId = await createTestUser(tenantId, role, governanceRules);
          const context = { tenantId, userId, userRole: role };
          
          // Execute: Generate embed URL
          const result = await generateEmbedUrl(context);
          
          // Assert: Session tags should include all context
          const sessionTags = extractSessionTags(result.embedUrl);
          expect(sessionTags).toContainEqual({ Key: 'tenant_id', Value: tenantId });
          expect(sessionTags).toContainEqual({ Key: 'role', Value: role });
          
          governanceRules.forEach(rule => {
            expect(sessionTags).toContainEqual({
              Key: rule.dimension,
              Value: rule.values.join(',')
            });
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing

**Framework**: Jest for Node.js, React Testing Library for frontend

**Focus Areas**:
- Specific examples demonstrating correct behavior
- Edge cases (empty inputs, boundary values, special characters)
- Error conditions (network failures, invalid data, timeouts)
- Integration points between components

**Example Unit Tests**:

```javascript
describe('User Management', () => {
  describe('createUser', () => {
    it('should create user with valid inputs', async () => {
      const context = { tenantId: 'tenant-123', userId: 'admin-456' };
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        role: 'Finance'
      };
      
      const result = await createUser(context, userData);
      
      expect(result.statusCode).toBe(201);
      expect(result.body).toHaveProperty('userId');
    });
    
    it('should reject user creation with invalid email', async () => {
      const context = { tenantId: 'tenant-123', userId: 'admin-456' };
      const userData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        role: 'Finance'
      };
      
      await expect(createUser(context, userData))
        .rejects.toThrow('Invalid email format');
    });
    
    it('should reject user creation with duplicate email in same tenant', async () => {
      const context = { tenantId: 'tenant-123', userId: 'admin-456' };
      const userData = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        role: 'Finance'
      };
      
      // First creation succeeds
      await createUser(context, userData);
      
      // Second creation fails
      await expect(createUser(context, userData))
        .rejects.toThrow('User with this email already exists');
    });
  });
});
```

### Integration Testing

**Scope**: Test complete request flows from API Gateway through Lambda to database/QuickSight

**Example Integration Test**:

```javascript
describe('Dashboard Access Flow', () => {
  it('should complete full dashboard access flow', async () => {
    // 1. Authenticate user
    const authResponse = await authenticateUser('user@example.com', 'password');
    expect(authResponse).toHaveProperty('accessToken');
    
    // 2. Request embed URL
    const embedResponse = await fetch(`${API_URL}/dashboards/embed-url`, {
      headers: { Authorization: `Bearer ${authResponse.accessToken}` }
    });
    expect(embedResponse.status).toBe(200);
    
    const { embedUrl } = await embedResponse.json();
    expect(embedUrl).toMatch(/^https:\/\/.*\.quicksight\.aws\.amazon\.com/);
    
    // 3. Verify URL contains session tags
    const urlParams = new URL(embedUrl).searchParams;
    expect(urlParams.get('sessionTags')).toContain('tenant_id');
  });
});
```

### Frontend Testing

**Component Tests**:

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardEmbed } from './DashboardEmbed';
import { dashboardService } from '../../services/dashboardService';

jest.mock('../../services/dashboardService');

describe('DashboardEmbed', () => {
  it('should display loading state initially', () => {
    dashboardService.getEmbedUrl.mockReturnValue(new Promise(() => {}));
    
    render(<DashboardEmbed />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
  
  it('should render iframe with embed URL', async () => {
    const mockUrl = 'https://quicksight.aws.amazon.com/embed/test';
    dashboardService.getEmbedUrl.mockResolvedValue(mockUrl);
    
    render(<DashboardEmbed />);
    
    await waitFor(() => {
      const iframe = screen.getByTitle('Analytics Dashboard');
      expect(iframe).toHaveAttribute('src', mockUrl);
    });
  });
  
  it('should display error and retry button on failure', async () => {
    dashboardService.getEmbedUrl.mockRejectedValue(new Error('Failed to load'));
    
    render(<DashboardEmbed />);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});
```

### Security Testing

**Focus Areas**:
- SQL injection prevention (Property 25)
- Cross-tenant access attempts (Property 5)
- Token validation and expiration
- XSS prevention in frontend
- CSRF protection

**Example Security Test**:

```javascript
describe('SQL Injection Prevention', () => {
  it('should prevent SQL injection in email parameter', async () => {
    const context = { tenantId: 'tenant-123' };
    const maliciousEmail = "'; DROP TABLE users; --";
    
    // Should not throw SQL error, should treat as invalid email
    await expect(getUserByEmail(context, maliciousEmail))
      .rejects.toThrow('Invalid email format');
    
    // Verify users table still exists
    const users = await listUsers(context);
    expect(users).toBeDefined();
  });
});
```

### Performance Testing

**Metrics to Track**:
- Lambda cold start time < 3 seconds
- Lambda warm execution time < 500ms
- API Gateway p99 latency < 1 second
- PostgreSQL query time < 100ms
- QuickSight embed URL generation < 2 seconds

**Load Testing**:
- Simulate 100 concurrent users per tenant
- Test with 50 tenants simultaneously
- Verify no data leakage under load
- Monitor database connection pool usage

### Test Coverage Goals

- Unit test coverage: > 80% for Lambda functions
- Property test coverage: 100% of correctness properties
- Integration test coverage: All critical user flows
- Frontend component coverage: > 70%

### Continuous Integration

**CI Pipeline**:
1. Run unit tests on every commit
2. Run property tests on every PR
3. Run integration tests on merge to main
4. Run security tests nightly
5. Run performance tests weekly

**Test Execution Time**:
- Unit tests: < 2 minutes
- Property tests: < 10 minutes (100 runs × ~26 properties)
- Integration tests: < 5 minutes
- Total CI time: < 20 minutes


## Security and Tenant Isolation Implementation

### Defense in Depth Strategy

Tenant isolation is enforced at multiple layers to prevent data leakage:

1. **Authentication Layer** (Cognito): tenant_id embedded in JWT tokens
2. **API Gateway Layer**: Token validation and tenant_id extraction
3. **Application Layer** (Lambda): tenant_id validation in all operations
4. **Database Layer** (PostgreSQL): tenant_id in all queries and foreign keys
5. **Analytics Layer** (QuickSight): RLS rules with tenant_id filtering

### Cognito Security Configuration

**User Pool Settings**:
```javascript
{
  "UserPoolId": "us-east-1_xxxxx",
  "Policies": {
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": false
    }
  },
  "Schema": [
    {
      "Name": "email",
      "AttributeDataType": "String",
      "Required": true,
      "Mutable": true
    },
    {
      "Name": "tenant_id",
      "AttributeDataType": "String",
      "Required": true,
      "Mutable": false  // Immutable after creation
    },
    {
      "Name": "role",
      "AttributeDataType": "String",
      "Required": true,
      "Mutable": true
    }
  ],
  "MfaConfiguration": "OPTIONAL",
  "AccountRecoverySetting": {
    "RecoveryMechanisms": [
      { "Priority": 1, "Name": "verified_email" }
    ]
  }
}
```

### API Gateway Security

**Authorizer Configuration**:
```javascript
{
  "Type": "COGNITO_USER_POOLS",
  "ProviderARNs": ["arn:aws:cognito-idp:us-east-1:xxxxx:userpool/us-east-1_xxxxx"],
  "AuthorizerResultTtlInSeconds": 300,
  "IdentitySource": "method.request.header.Authorization"
}
```

**Request Validation**:
- Validate request body against JSON schema
- Enforce maximum request size (1MB)
- Rate limiting: 100 requests per minute per user
- Throttling: 1000 requests per second per tenant

**CORS Configuration**:
```javascript
{
  "AllowOrigins": ["cloudfront-url"],
  "AllowMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  "AllowHeaders": ["Content-Type", "Authorization", "X-Request-ID"],
  "ExposeHeaders": ["X-Request-ID"],
  "MaxAge": 3600,
  "AllowCredentials": true
}
```

### Lambda Security

**IAM Role Permissions** (Principle of Least Privilege):

User Management Lambda:
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
        "cognito-idp:AdminGetUser"
      ],
      "Resource": "arn:aws:cognito-idp:us-east-1:xxxxx:userpool/us-east-1_xxxxx"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:xxxxx:secret:shoppulse/rds/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:xxxxx:log-group:/aws/lambda/shoppulse-*"
    }
  ]
}
```

QuickSight Embed Lambda:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "quicksight:GenerateEmbedUrlForRegisteredUser",
        "quicksight:RegisterUser"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:xxxxx:secret:shoppulse/rds/*"
    }
  ]
}
```

**Environment Variable Encryption**:
- All sensitive environment variables encrypted with KMS
- Separate KMS keys for dev, staging, production
- Key rotation every 90 days

### PostgreSQL Security

**Connection Security**:
- SSL/TLS required for all connections
- RDS Proxy for connection pooling and credential management
- Secrets Manager for credential rotation (every 30 days)
- VPC security groups: Lambda security group → RDS security group only

**Database User Permissions**:
```sql
-- Application user (used by Lambda)
CREATE USER shoppulse_app WITH PASSWORD 'stored-in-secrets-manager';
GRANT CONNECT ON DATABASE shoppulse TO shoppulse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO shoppulse_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO shoppulse_app;

-- Read-only user (for analytics/reporting)
CREATE USER shoppulse_readonly WITH PASSWORD 'stored-in-secrets-manager';
GRANT CONNECT ON DATABASE shoppulse TO shoppulse_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO shoppulse_readonly;
```

**Row-Level Security** (PostgreSQL RLS):
```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see users in their tenant
CREATE POLICY tenant_isolation_policy ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::VARCHAR);

-- Set tenant_id at connection level
-- Lambda sets this after connecting: SET app.current_tenant_id = 'tenant-123';
```

### Frontend Security

**Content Security Policy**:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cognito-idp.us-east-1.amazonaws.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://*.execute-api.us-east-1.amazonaws.com https://cognito-idp.us-east-1.amazonaws.com;
  frame-src https://*.quicksight.aws.amazon.com;
  frame-ancestors 'none';
">
```

**XSS Prevention**:
- React's built-in XSS protection (automatic escaping)
- DOMPurify for any HTML rendering
- Validate and sanitize all user inputs

**CSRF Protection**:
- SameSite=Strict cookie attribute
- Token-based authentication (no cookies for API auth)
- Origin header validation

**Secure Token Storage**:
```javascript
// Store tokens in memory, not localStorage
const tokenStorage = {
  accessToken: null,
  refreshToken: null,
  
  setTokens(access, refresh) {
    this.accessToken = access;
    this.refreshToken = refresh;
  },
  
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
  }
};

// Use httpOnly cookies for refresh tokens (set by backend)
// Access tokens in memory only
```

### Monitoring and Alerting

**Security Monitoring**:
- CloudWatch Logs Insights queries for suspicious patterns
- AWS GuardDuty for threat detection
- CloudTrail for API audit logging
- VPC Flow Logs for network monitoring

**Alert Conditions**:
- Multiple failed login attempts (> 5 in 5 minutes)
- Cross-tenant access attempts
- Unusual API call patterns
- Database connection failures
- QuickSight API errors
- Lambda execution errors

**Compliance**:
- SOC 2 Type II compliance
- GDPR data protection requirements
- Data encryption at rest and in transit
- Regular security audits and penetration testing


## Deployment Architecture

### Infrastructure as Code

**Tool**: Terraform

**Environment Structure**:
- Development: Single-AZ, smaller instances, relaxed security
- Staging: Multi-AZ, production-like, full security
- Production: Multi-AZ, auto-scaling, full redundancy

### AWS Resource Configuration

**VPC Architecture**:
```
VPC: 10.0.0.0/16
├── Public Subnets (NAT Gateways, Load Balancers)
│   ├── us-east-1a: 10.0.1.0/24
│   └── us-east-1b: 10.0.2.0/24
├── Private Subnets (Lambda, RDS)
│   ├── us-east-1a: 10.0.10.0/24
│   └── us-east-1b: 10.0.11.0/24
└── Database Subnets (RDS only)
    ├── us-east-1a: 10.0.20.0/24
    └── us-east-1b: 10.0.21.0/24
```

**PostgreSQL RDS Configuration**:

Development:
```javascript
{
  "Engine": "postgres",
  "EngineVersion": "15.4",
  "DBInstanceClass": "db.t3.medium",
  "AllocatedStorage": 100,
  "StorageType": "gp3",
  "MultiAZ": false,
  "BackupRetentionPeriod": 7,
  "PreferredBackupWindow": "03:00-04:00",
  "PreferredMaintenanceWindow": "sun:04:00-sun:05:00",
  "EnablePerformanceInsights": true,
  "PerformanceInsightsRetentionPeriod": 7
}
```

**RDS Proxy Configuration**:
```javascript
{
  "DBProxyName": "shoppulse-rds-proxy",
  "EngineFamily": "POSTGRESQL",
  "Auth": [{
    "AuthScheme": "SECRETS",
    "SecretArn": "arn:aws:secretsmanager:us-east-1:xxxxx:secret:shoppulse/rds/credentials",
    "IAMAuth": "DISABLED"
  }],
  "RequireTLS": true,
  "IdleClientTimeout": 1800,
  "MaxConnectionsPercent": 100,
  "MaxIdleConnectionsPercent": 50
}
```

**Lambda Configuration**:

User Management Lambda:
```javascript
{
  "FunctionName": "shoppulse-user-management",
  "Runtime": "nodejs18.x",
  "Handler": "index.handler",
  "MemorySize": 512,
  "Timeout": 30,
  "Environment": {
    "Variables": {
      "COGNITO_USER_POOL_ID": "us-east-1_xxxxx",
      "RDS_PROXY_ENDPOINT": "shoppulse-rds-proxy.proxy-xxxxx.us-east-1.rds.amazonaws.com",
      "RDS_PORT": "5432",
      "RDS_DATABASE": "shoppulse",
      "RDS_SECRET_ARN": "arn:aws:secretsmanager:...",
      "NODE_ENV": "production"
    }
  },
  "VpcConfig": {
    "SubnetIds": ["subnet-xxxxx", "subnet-yyyyy"],
    "SecurityGroupIds": ["sg-xxxxx"]
  },
  "ReservedConcurrentExecutions": 100
}
```

QuickSight Embed Lambda:
```javascript
{
  "FunctionName": "shoppulse-quicksight-embed",
  "Runtime": "nodejs18.x",
  "Handler": "index.handler",
  "MemorySize": 256,
  "Timeout": 15,
  "Environment": {
    "Variables": {
      "QUICKSIGHT_AWS_ACCOUNT_ID": "123456789012",
      "QUICKSIGHT_DASHBOARD_ID": "dashboard-id",
      "RDS_PROXY_ENDPOINT": "shoppulse-rds-proxy.proxy-xxxxx.us-east-1.rds.amazonaws.com",
      "RDS_PORT": "5432",
      "RDS_DATABASE": "shoppulse",
      "RDS_SECRET_ARN": "arn:aws:secretsmanager:...",
      "NODE_ENV": "production"
    }
  },
  "VpcConfig": {
    "SubnetIds": ["subnet-xxxxx", "subnet-yyyyy"],
    "SecurityGroupIds": ["sg-xxxxx"]
  },
  "ReservedConcurrentExecutions": 200
}
```

**API Gateway Configuration**:
```javascript
{
  "Name": "shoppulse-api",
  "ProtocolType": "REST",
  "EndpointConfiguration": {
    "Types": ["REGIONAL"]
  },
  "Policy": {
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "*"
    }]
  },
  "ThrottleSettings": {
    "RateLimit": 1000,
    "BurstLimit": 2000
  }
}
```

**CloudFront Distribution** (Frontend):
```javascript
{
  "Origins": [{
    "Id": "S3-shoppulse-frontend",
    "DomainName": "shoppulse-frontend.s3.amazonaws.com",
    "S3OriginConfig": {
      "OriginAccessIdentity": "origin-access-identity/cloudfront/xxxxx"
    }
  }],
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-shoppulse-frontend",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
    "CachedMethods": ["GET", "HEAD"],
    "Compress": true,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000,
    "MinTTL": 0
  },
  "PriceClass": "PriceClass_100",
  "ViewerCertificate": {
    "AcmCertificateArn": "arn:aws:acm:us-east-1:xxxxx:certificate/xxxxx",
    "SslSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "CustomErrorResponses": [
    {
      "ErrorCode": 404,
      "ResponseCode": 200,
      "ResponsePagePath": "/index.html"
    }
  ]
}
```

### CI/CD Pipeline

**GitHub Actions Workflow**:

```yaml
name: Deploy ShopPulse Analytics

on:
  push:
    branches: [main, staging, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:property
      - run: npm run test:integration

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - name: Deploy Lambda functions
        run: |
          cd backend
          npm ci
          npm run build
          aws lambda update-function-code \
            --function-name shoppulse-user-management \
            --zip-file fileb://dist/user-management.zip
          aws lambda update-function-code \
            --function-name shoppulse-quicksight-embed \
            --zip-file fileb://dist/quicksight-embed.zip

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Build frontend
        run: |
          cd frontend
          npm ci
          npm run build
        env:
          REACT_APP_API_GATEWAY_URL: ${{ secrets.API_GATEWAY_URL }}
          REACT_APP_COGNITO_USER_POOL_ID: ${{ secrets.COGNITO_USER_POOL_ID }}
          REACT_APP_COGNITO_CLIENT_ID: ${{ secrets.COGNITO_CLIENT_ID }}
      - name: Deploy to S3
        run: |
          aws s3 sync frontend/build/ s3://shoppulse-frontend-${{ github.ref_name }}/ --delete
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

