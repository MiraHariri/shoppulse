# Implementation Plan: ShopPulse Analytics

## Overview

This implementation plan breaks down the ShopPulse Analytics platform into discrete, incremental tasks. The platform consists of three main components:

1. **PostgreSQL Database Setup** - Schema creation and initial data
2. **Backend Node.js/TypeScript Lambda Functions** - User management and QuickSight embedding
3. **Frontend React TypeScript Application** - User interface with Redux Toolkit state management

Each task builds on previous work, with property-based tests and unit tests integrated throughout to validate correctness early.

## Tasks

- [x] 1. Set up PostgreSQL database schema and infrastructure
  - Create PostgreSQL RDS instance with proper configuration
  - Run schema creation script with all 8 tables (tenants, users, orders, fulfillment, marketing_campaigns, role_metric_visibility, governance_rules, audit_logs)
  - Create auto-update trigger function for updated_at columns
  - Set up RDS Proxy for connection pooling
  - Store database credentials in AWS Secrets Manager
  - _Requirements: 15.1, 15.2, 15.3, 15.5_

- [x] 2. Set up AWS Cognito User Pool
  - Create Cognito User Pool with custom attributes (tenant_id, role)
  - Configure password policy (min 8 chars, uppercase, lowercase, numbers)
  - Set token expiration (access: 1 hour, refresh: 30 days)
  - Configure account recovery via email
  - _Requirements: 1.1, 1.4_

- [x] 3. Set up AWS API Gateway
  - Create REST API with Cognito authorizer
  - Configure CORS for frontend domain
  - Set up request validation and rate limiting
  - Configure request context mapping to extract tenant_id from JWT
  - _Requirements: 1.3, 11.1, 11.3_

- [ ] 4. Implement backend Lambda infrastructure
  - [x] 4.1 Create Lambda execution roles with least privilege IAM policies
    - User management Lambda role (Cognito, Secrets Manager, CloudWatch Logs)
    - QuickSight embed Lambda role (QuickSight, Secrets Manager, CloudWatch Logs)
    - _Requirements: 11.4_
  
  - [x] 4.2 Set up Lambda VPC configuration
    - Configure security groups for Lambda to RDS communication
    - Set up private subnets for Lambda functions
    - _Requirements: 2.2_
  
  - [x] 4.3 Create shared database connection module (TypeScript)
    - Implement credential retrieval from Secrets Manager
    - Add connection retry logic with exponential backoff
    - _Requirements: 2.2_


- [ ] 5. Implement user management Lambda function
  - [ ] 5.1 Create user management Lambda handler (TypeScript)
    - Implement createUser endpoint with Cognito integration
    - Implement listUsers endpoint with tenant filtering
    - Implement updateUserRole endpoint with tenant validation
    - Implement deleteUser endpoint (Cognito + PostgreSQL)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 5.2 Write property test for user creation inherits tenant
    - **Property 10: User Creation Inherits Admin Tenant**
    - **Validates: Requirements 5.1**
  
  - [ ]* 5.3 Write property test for cross-tenant access denial
    - **Property 5: Cross-Tenant Access Is Denied**
    - **Validates: Requirements 2.3, 2.4, 5.4, 5.5**
  
  - [ ]* 5.4 Write property test for role assignment tenant scoping
    - **Property 11: Role Assignment Is Tenant-Scoped**
    - **Validates: Requirements 5.2**
  
  - [ ]* 5.5 Write property test for user deletion
    - **Property 12: User Deletion Removes From Both Systems**
    - **Validates: Requirements 5.3**
  
  - [ ]* 5.6 Write unit tests for user management edge cases
    - Test invalid email format rejection
    - Test duplicate email handling
    - Test missing required fields
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 6. Implement QuickSight embed Lambda function
  - [ ] 6.1 Create QuickSight embed handler (TypeScript)
    - Implement generateEmbedUrl endpoint
    - Retrieve governance rules from PostgreSQL
    - Build RLS session tags (tenant_id, role, governance dimensions)
    - Call QuickSight SDK to generate embed URL with 15-minute expiration
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 12.3_
  
  - [ ]* 6.2 Write property test for embed URL session context
    - **Property 7: Embed URL Generation Includes Complete Session Context**
    - **Validates: Requirements 3.1, 3.2, 3.4, 12.3**
  
  - [ ]* 6.3 Write property test for embed URL expiration
    - **Property 8: Embed URLs Expire After 15 Minutes**
    - **Validates: Requirements 3.3**
  
  - [ ]* 6.4 Write property test for role-based dashboard access
    - **Property 9: Role-Based Dashboard Access**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
  
  - [ ]* 6.5 Write unit tests for QuickSight error handling
    - Test QuickSight user not found scenario
    - Test dashboard not found scenario
    - Test QuickSight API failure with retry
    - _Requirements: 3.1_

- [ ] 7. Implement audit logging
  - [ ] 7.1 Create audit logging utility module (TypeScript)
    - Implement logAuditEvent function
    - Include tenant_id, user_id, action, resource_type, resource_id, details, ip_address
    - Insert into audit_logs table
    - _Requirements: 11.5_
  
  - [ ]* 7.2 Write property test for audit logging
    - **Property 21: Operations Are Logged With Tenant Context**
    - **Validates: Requirements 11.5**
  
  - [ ] 7.3 Integrate audit logging into user management Lambda
    - Log user creation, role updates, user deletion
    - _Requirements: 11.5_
  
  - [ ] 7.4 Integrate audit logging into QuickSight embed Lambda
    - Log dashboard access requests
    - _Requirements: 11.5_

- [ ] 8. Checkpoint - Ensure backend Lambda functions work
  - Test user management endpoints with Postman/curl
  - Test QuickSight embed URL generation
  - Verify audit logs are created
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 9. Set up React TypeScript frontend project
  - [ ] 9.1 Initialize React TypeScript project with Create React App or Vite
    - Install dependencies (React, TypeScript, Redux Toolkit, AWS Amplify, Material-UI/Tailwind)
    - Configure TypeScript compiler options
    - Set up project structure (components, store, services, hooks, types, utils)
    - _Requirements: 13.1_
  
  - [ ] 9.2 Configure AWS Amplify for Cognito authentication
    - Set up Amplify configuration with User Pool ID and Client ID
    - Configure environment variables for API Gateway URL
    - _Requirements: 13.1, 13.2_
  
  - [ ] 9.3 Create type definitions
    - Create auth.types.ts (AuthUser, LoginCredentials)
    - Create user.types.ts (User, CreateUserData)
    - Create dashboard.types.ts (DashboardState, EmbedUrlResponse)
    - _Requirements: 13.2_

- [ ] 10. Implement Redux store and authentication
  - [ ] 10.1 Create Redux store configuration
    - Set up configureStore with authSlice, userSlice, dashboardSlice
    - Export RootState and AppDispatch types
    - _Requirements: 13.2_
  
  - [ ] 10.2 Implement authSlice with Redux Toolkit
    - Create checkAuth, login, logout async thunks
    - Handle authentication state (user, loading, error)
    - Integrate with AWS Amplify Auth
    - _Requirements: 1.1, 1.2, 13.2, 13.3_
  
  - [ ]* 10.3 Write property test for authentication token contains tenant context
    - **Property 1: Authentication Token Contains Tenant Context**
    - **Validates: Requirements 1.1, 1.4**
  
  - [ ]* 10.4 Write property test for invalid credentials rejection
    - **Property 2: Invalid Credentials Are Rejected**
    - **Validates: Requirements 1.2**
  
  - [ ] 10.5 Create useAuth hook
    - Wrap Redux auth state and actions
    - Provide login, logout, user, loading, error
    - _Requirements: 13.2_
  
  - [ ]* 10.6 Write unit tests for authentication flow
    - Test successful login stores user data
    - Test failed login shows error message
    - Test logout clears user data
    - _Requirements: 1.1, 1.2_

- [ ] 11. Implement API client and services
  - [ ] 11.1 Create API client utility (apiClient.ts)
    - Implement getAuthHeaders to retrieve JWT from Amplify
    - Implement apiRequest generic function with error handling
    - _Requirements: 9.4, 13.3_
  
  - [ ]* 11.2 Write property test for API requests include auth tokens
    - **Property 18: API Requests Include Authentication Tokens**
    - **Validates: Requirements 9.4, 13.3**
  
  - [ ] 11.3 Create userService with CRUD operations
    - Implement listUsers, createUser, updateUserRole, deleteUser
    - Use apiRequest for all calls
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ] 11.4 Create dashboardService
    - Implement getEmbedUrl function
    - _Requirements: 3.5_

- [ ] 12. Implement user management UI
  - [ ] 12.1 Create userSlice with Redux Toolkit
    - Create fetchUsers, createUser, updateUserRole, deleteUser async thunks
    - Handle users list state (users, loading, error)
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ] 12.2 Create UserList component
    - Display user table with role and status
    - Add "Add User" button for admins
    - Integrate with Redux userSlice
    - Check user role for admin access
    - _Requirements: 9.1, 9.4_
  
  - [ ]* 12.3 Write property test for user management UI displays tenant-scoped data
    - **Property 17: User Management UI Displays Tenant-Scoped Data**
    - **Validates: Requirements 9.1**
  
  - [ ] 12.4 Create UserForm component
    - Form fields: email, password, role selector
    - Form validation (email format, password strength)
    - Submit handler calls createUser action
    - _Requirements: 9.2, 9.4_
  
  - [ ] 12.5 Create UserTable component
    - Display users in table format
    - Inline role editing with dropdown
    - Delete button with confirmation dialog
    - _Requirements: 9.3, 9.4_
  
  - [ ]* 12.6 Write unit tests for user management components
    - Test UserList renders users correctly
    - Test UserForm validates inputs
    - Test UserTable handles role updates
    - _Requirements: 9.1, 9.2, 9.3_


- [ ] 13. Implement dashboard embedding UI
  - [ ] 13.1 Create dashboardSlice with Redux Toolkit
    - Create fetchEmbedUrl async thunk
    - Handle embed URL state (embedUrl, loading, error)
    - _Requirements: 10.1_
  
  - [ ] 13.2 Create DashboardEmbed component
    - Request embed URL on mount
    - Render QuickSight dashboard in iframe
    - Auto-refresh URL every 10 minutes
    - Handle loading and error states
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [ ] 13.3 Create DashboardLoader component
    - Display loading spinner with branded animation
    - _Requirements: 10.4_
  
  - [ ] 13.4 Create DashboardError component
    - Display error message
    - Provide retry button
    - _Requirements: 10.5_
  
  - [ ]* 13.5 Write unit tests for dashboard components
    - Test DashboardEmbed displays loading state initially
    - Test DashboardEmbed renders iframe with URL
    - Test DashboardEmbed displays error on failure
    - Test retry button calls fetchEmbedUrl again
    - _Requirements: 10.1, 10.2, 10.3, 10.5_

- [ ] 14. Implement authentication UI
  - [ ] 14.1 Create LoginForm component
    - Email and password input fields
    - Submit button triggers login action
    - Display error messages from authSlice
    - _Requirements: 13.2_
  
  - [ ] 14.2 Create ProtectedRoute component
    - Check authentication state from useAuth
    - Redirect to login if not authenticated
    - Render children if authenticated
    - _Requirements: 1.5_
  
  - [ ]* 14.3 Write unit tests for authentication UI
    - Test LoginForm submits credentials
    - Test LoginForm displays errors
    - Test ProtectedRoute redirects unauthenticated users
    - _Requirements: 1.5, 13.2_

- [ ] 15. Implement layout and navigation
  - [ ] 15.1 Create Layout component
    - Header with user profile and logout button
    - Sidebar with navigation links
    - Main content area
    - _Requirements: 9.1_
  
  - [ ] 15.2 Create Header component
    - Display user email and role
    - Logout button triggers logout action
    - _Requirements: 13.5_
  
  - [ ] 15.3 Create Sidebar component
    - Navigation links (Dashboard, Users, Settings)
    - Conditional rendering based on role (Users link only for Admin)
    - _Requirements: 9.1_
  
  - [ ] 15.4 Set up React Router
    - Configure routes for login, dashboard, users
    - Wrap protected routes with ProtectedRoute
    - _Requirements: 10.1_

- [ ] 16. Implement UI styling and design
  - [ ] 16.1 Set up design system
    - Configure color palette (primary: deep purple, secondary: teal)
    - Set up typography (Inter or Poppins font)
    - Configure spacing and breakpoints
    - _Requirements: 9.1_
  
  - [ ] 16.2 Style authentication pages
    - Centered login form with card layout
    - Branded logo and colors
    - Responsive design for mobile
    - _Requirements: 13.2_
  
  - [ ] 16.3 Style dashboard page
    - Full-width iframe with minimal chrome
    - Loading skeleton animation
    - Error state with helpful messaging
    - _Requirements: 10.1, 10.2_
  
  - [ ] 16.4 Style user management page
    - Data table with sorting and filtering
    - Modal form for creating users
    - Inline editing for roles
    - Badge components for roles and status
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [ ] 16.5 Add micro-interactions and animations
    - Button hover effects and ripples
    - Smooth transitions (200-300ms)
    - Toast notifications for success/error feedback
    - _Requirements: 9.5_

- [ ] 17. Checkpoint - Ensure frontend works end-to-end
  - Test login flow with valid and invalid credentials
  - Test user management (create, update, delete)
  - Test dashboard embedding and auto-refresh
  - Verify responsive design on mobile and desktop
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 18. Implement security features
  - [ ] 18.1 Add Content Security Policy headers
    - Configure CSP meta tag in index.html
    - Allow QuickSight iframe embedding
    - Restrict script and style sources
    - _Requirements: 11.1_
  
  - [ ] 18.2 Implement token refresh logic
    - Detect token expiration in API client
    - Attempt automatic refresh with refresh token
    - Redirect to login if refresh fails
    - _Requirements: 13.4, 13.5_
  
  - [ ]* 18.3 Write property test for SQL injection prevention
    - **Property 25: SQL Injection Prevention**
    - **Validates: Requirements 15.4**
  
  - [ ]* 18.4 Write property test for invalid tokens result in 401
    - **Property 19: Invalid Tokens Result in 401 Unauthorized**
    - **Validates: Requirements 11.1, 11.2**
  
  - [ ]* 18.5 Write unit tests for security features
    - Test malicious SQL input is rejected
    - Test XSS attempts are sanitized
    - Test expired tokens trigger refresh
    - _Requirements: 11.1, 11.2, 15.4_

- [ ] 19. Implement governance rules management
  - [ ] 19.1 Create governance rules API endpoints in Lambda
    - Implement getGovernanceRules endpoint
    - Implement updateGovernanceRules endpoint
    - Validate tenant_id matches authenticated user
    - _Requirements: 12.1, 12.2_
  
  - [ ]* 19.2 Write property test for governance rules are tenant-scoped
    - **Property 22: Governance Rules Are Tenant-Scoped**
    - **Validates: Requirements 12.1**
  
  - [ ]* 19.3 Write property test for governance filters applied with tenant filters
    - **Property 23: Governance Filters Are Applied With Tenant Filters**
    - **Validates: Requirements 12.4**
  
  - [ ]* 19.4 Write property test for governance changes reflect in new embed URLs
    - **Property 24: Governance Changes Reflect in New Embed URLs**
    - **Validates: Requirements 12.5**
  
  - [ ] 19.5 Create governance rules UI components
    - GovernanceRulesForm component for editing rules
    - Support region, store, team, custom dimensions
    - _Requirements: 12.1, 12.2_
  
  - [ ]* 19.6 Write unit tests for governance rules
    - Test governance rules are stored with tenant_id
    - Test governance rules are included in embed URLs
    - _Requirements: 12.1, 12.3_

- [ ] 20. Implement QuickSight dashboard configuration
  - [ ] 20.1 Create QuickSight datasets
    - Connect to e-commerce data warehouse
    - Create datasets for orders, fulfillment, marketing_campaigns
    - _Requirements: 14.1, 14.2, 14.3_
  
  - [ ] 20.2 Configure Row-Level Security (RLS) on datasets
    - Add tenant_id RLS rule to all datasets
    - Add region and store_id RLS rules for governance
    - Test RLS rules with sample data
    - _Requirements: 2.1, 2.5, 8.2_
  
  - [ ] 20.3 Create QuickSight dashboards
    - Revenue Dashboard (Finance role): revenue, conversion rate, order volume
    - Fulfillment Dashboard (Operations role): fulfillment SLA, inventory
    - Campaign Dashboard (Marketing role): campaign ROI, CAC, channel performance
    - _Requirements: 14.1, 14.2, 14.3_
  
  - [ ] 20.4 Configure dashboard time filters
    - Add date range parameters (daily, weekly, monthly, quarterly, yearly)
    - _Requirements: 14.4_
  
  - [ ] 20.5 Configure dashboard visualizations
    - Line charts for trends
    - Bar charts for comparisons
    - KPI cards for summaries
    - _Requirements: 14.5_

- [ ] 21. Implement property-based tests for tenant isolation
  - [ ]* 21.1 Write property test for database queries include tenant filter
    - **Property 4: Database Queries Include Tenant Filter**
    - **Validates: Requirements 2.2**
  
  - [ ]* 21.2 Write property test for QuickSight RLS filters by tenant
    - **Property 6: QuickSight RLS Filters By Tenant**
    - **Validates: Requirements 2.1, 8.2**
  
  - [ ]* 21.3 Write property test for interactive operations preserve tenant isolation
    - **Property 13: Interactive Operations Preserve Tenant Isolation**
    - **Validates: Requirements 6.2, 6.3, 6.5**
  
  - [ ]* 21.4 Write property test for dashboard exports respect boundaries
    - **Property 14: Dashboard Exports Respect Tenant and Role Boundaries**
    - **Validates: Requirements 7.1**
  
  - [ ]* 21.5 Write property test for embed URLs not shareable across tenants
    - **Property 15: Embed URLs Are Not Shareable Across Tenants**
    - **Validates: Requirements 7.4**
  
  - [ ]* 21.6 Write property test for concurrent multi-tenant access
    - **Property 16: Concurrent Multi-Tenant Access**
    - **Validates: Requirements 8.4**


- [ ] 22. Implement additional property-based tests
  - [ ]* 22.1 Write property test for API Gateway extracts tenant context
    - **Property 3: API Gateway Extracts Tenant Context**
    - **Validates: Requirements 1.3, 11.3**
  
  - [ ]* 22.2 Write property test for Lambda functions use request context tenant ID
    - **Property 20: Lambda Functions Use Request Context Tenant ID**
    - **Validates: Requirements 11.4**

- [ ] 23. Set up deployment infrastructure
  - [ ] 23.1 Create AWS CDK or Terraform infrastructure code
    - Define VPC with public, private, and database subnets
    - Define RDS PostgreSQL instance with Multi-AZ
    - Define RDS Proxy for connection pooling
    - Define Cognito User Pool
    - Define API Gateway with Cognito authorizer
    - Define Lambda functions with VPC configuration
    - Define S3 bucket and CloudFront distribution for frontend
    - _Requirements: All infrastructure requirements_
  
  - [ ] 23.2 Set up CI/CD pipeline
    - Create GitHub Actions workflow for backend deployment
    - Create GitHub Actions workflow for frontend deployment
    - Configure automated testing in CI pipeline
    - _Requirements: All requirements_
  
  - [ ] 23.3 Configure monitoring and alerting
    - Set up CloudWatch dashboards for metrics
    - Configure CloudWatch alarms for errors and performance
    - Enable X-Ray tracing on Lambda functions
    - _Requirements: 11.5_

- [ ] 24. Implement database migration strategy
  - [ ] 24.1 Set up node-pg-migrate
    - Install node-pg-migrate package
    - Create initial migration for schema
    - _Requirements: 15.1, 15.2, 15.3_
  
  - [ ] 24.2 Create seed data migration
    - Insert sample tenant data
    - Insert sample role metric visibility data
    - _Requirements: 15.5_
  
  - [ ] 24.3 Document migration process
    - Document how to run migrations
    - Document rollback procedures
    - _Requirements: 15.1_

- [ ] 25. Integration testing
  - [ ]* 25.1 Write integration test for complete authentication flow
    - Test login → token retrieval → API call with token
    - _Requirements: 1.1, 1.3, 11.1_
  
  - [ ]* 25.2 Write integration test for complete dashboard access flow
    - Test login → request embed URL → render dashboard
    - _Requirements: 1.1, 3.1, 10.1, 10.2_
  
  - [ ]* 25.3 Write integration test for complete user management flow
    - Test admin login → create user → update role → delete user
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ]* 25.4 Write integration test for tenant isolation
    - Test two tenants accessing system simultaneously
    - Verify no data leakage between tenants
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 26. Performance testing
  - [ ]* 26.1 Test Lambda cold start and warm execution times
    - Verify cold start < 3 seconds
    - Verify warm execution < 500ms
    - _Requirements: All Lambda requirements_
  
  - [ ]* 26.2 Test API Gateway latency
    - Verify p99 latency < 1 second
    - _Requirements: 11.1_
  
  - [ ]* 26.3 Test PostgreSQL query performance
    - Verify query time < 100ms for tenant-filtered queries
    - _Requirements: 2.2, 15.2_
  
  - [ ]* 26.4 Test concurrent user load
    - Simulate 100 concurrent users per tenant
    - Test with 50 tenants simultaneously
    - Verify no performance degradation or data leakage
    - _Requirements: 8.4_

- [ ] 27. Final checkpoint - End-to-end validation
  - Deploy complete system to staging environment
  - Test all user flows (login, dashboard access, user management)
  - Verify tenant isolation with multiple test tenants
  - Run all property-based tests (100 iterations each)
  - Run all unit tests and integration tests
  - Verify security features (CSP, token refresh, SQL injection prevention)
  - Test responsive design on multiple devices
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 28. Documentation and handoff
  - [ ] 28.1 Create API documentation
    - Document all API endpoints with request/response examples
    - Document authentication flow
    - _Requirements: All API requirements_
  
  - [ ] 28.2 Create deployment documentation
    - Document infrastructure setup
    - Document CI/CD pipeline
    - Document monitoring and alerting
    - _Requirements: All infrastructure requirements_
  
  - [ ] 28.3 Create user documentation
    - Document admin user management features
    - Document dashboard access and usage
    - Document governance rules configuration
    - _Requirements: 9.1, 10.1, 12.1_
  
  - [ ] 28.4 Create runbook for operations
    - Document common issues and resolutions
    - Document disaster recovery procedures
    - Document database backup and restore
    - _Requirements: All operational requirements_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (100 iterations each)
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- Performance tests validate scalability and responsiveness

