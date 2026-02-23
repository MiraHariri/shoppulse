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



- [x] 4. Implement backend Lambda infrastructure

  
  - [x] 4.3 Create shared database connection module (TypeScript)
    - Implement credential retrieval from Secrets Manager
    - Add connection retry logic with exponential backoff
    - _Requirements: 2.2_


- [x] 5. Implement user management Lambda function
  - [x] 5.1 Create user management Lambda handler (TypeScript)
    - Implement createUser endpoint with Cognito integration
    - Implement listUsers endpoint with tenant filtering
    - Implement updateUserRole endpoint with tenant validation
    - Implement deleteUser endpoint (Cognito + PostgreSQL)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  


- [x] 6. Implement QuickSight embed Lambda function
  - [x] 6.1 Create QuickSight embed handler (TypeScript)
    - Implement generateEmbedUrl endpoint
    - Retrieve governance rules from PostgreSQL
    - Build RLS session tags (tenant_id, role, governance dimensions)
    - Call QuickSight SDK to generate embed URL with 15-minute expiration
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 12.3_
  


- [x] 7. Implement audit logging
  - [x] 7.1 Create audit logging utility module (TypeScript)
    - Implement logAuditEvent function
    - Include tenant_id, user_id, action, resource_type, resource_id, details, ip_address
    - Insert into audit_logs table
    - _Requirements: 11.5_
  



- [x] 9. Set up React TypeScript frontend project
  - [x] 9.1 Initialize React TypeScript project with Create React App or Vite
    - Install dependencies (React, TypeScript, Redux Toolkit, AWS Amplify, Material-UI/Tailwind)
    - Configure TypeScript compiler options
    - Set up project structure (components, store, services, hooks, types, utils)
    - _Requirements: 13.1_
  
  - [x] 9.2 Configure AWS Amplify for Cognito authentication
    - Set up Amplify configuration with User Pool ID and Client ID
    - Configure environment variables for API Gateway URL
    - _Requirements: 13.1, 13.2_
  
  - [x] 9.3 Create type definitions
    - Create auth.types.ts (AuthUser, LoginCredentials)
    - Create user.types.ts (User, CreateUserData)
    - Create dashboard.types.ts (DashboardState, EmbedUrlResponse)
    - _Requirements: 13.2_

- [x] 10. Implement Redux store and authentication
  - [x] 10.1 Create Redux store configuration
    - Set up configureStore with authSlice, userSlice, dashboardSlice
    - Export RootState and AppDispatch types
    - _Requirements: 13.2_
  
  - [x] 10.2 Implement authSlice with Redux Toolkit
    - Create checkAuth, login, logout async thunks
    - Handle authentication state (user, loading, error)
    - Integrate with AWS Amplify Auth
    - _Requirements: 1.1, 1.2, 13.2, 13.3_
  
  - [x] 10.5 Create useAuth hook
    - Wrap Redux auth state and actions
    - Provide login, logout, user, loading, error
    - _Requirements: 13.2_

- [x] 11. Implement API client and services
  - [x] 11.1 Create API client utility (apiClient.ts)
    - Implement getAuthHeaders to retrieve JWT from Amplify
    - Implement apiRequest generic function with error handling
    - _Requirements: 9.4, 13.3_
  
  - [x] 11.3 Create userService with CRUD operations
    - Implement listUsers, createUser, updateUserRole, deleteUser
    - Use apiRequest for all calls
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 11.4 Create dashboardService
    - Implement getEmbedUrl function
    - _Requirements: 3.5_

- [x] 12. Implement user management UI
  - [x] 12.1 Create userSlice with Redux Toolkit
    - Create fetchUsers, createUser, updateUserRole, deleteUser async thunks
    - Handle users list state (users, loading, error)
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 12.2 Create UserList component
    - Display user table with role and status
    - Add "Add User" button for admins
    - Integrate with Redux userSlice
    - Check user role for admin access
    - _Requirements: 9.1, 9.4_
  
  - [x] 12.4 Create UserForm component
    - Form fields: email, password, role selector
    - Form validation (email format, password strength)
    - Submit handler calls createUser action
    - _Requirements: 9.2, 9.4_
  
  - [x] 12.5 Create UserTable component
    - Display users in table format
    - Inline role editing with dropdown
    - Delete button with confirmation dialog
    - _Requirements: 9.3, 9.4_
  

- [x] 13. Implement dashboard embedding UI
  - [x] 13.1 Create dashboardSlice with Redux Toolkit
    - Create fetchEmbedUrl async thunk
    - Handle embed URL state (embedUrl, loading, error)
    - _Requirements: 10.1_
  
  - [x] 13.2 Create DashboardEmbed component
    - Request embed URL on mount
    - Render QuickSight dashboard in iframe
    - Auto-refresh URL every 10 minutes
    - Handle loading and error states
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [x] 13.3 Create DashboardLoader component
    - Display loading spinner with branded animation
    - _Requirements: 10.4_
  
  - [x] 13.4 Create DashboardError component
    - Display error message
    - Provide retry button
    - _Requirements: 10.5_
  


- [x] 14. Implement authentication UI
  - [x] 14.1 Create LoginForm component
    - Email and password input fields
    - Submit button triggers login action
    - Display error messages from authSlice
    - _Requirements: 13.2_
  
  - [x] 14.2 Create ProtectedRoute component
    - Check authentication state from useAuth
    - Redirect to login if not authenticated
    - Render children if authenticated
    - _Requirements: 1.5_
  


- [x] 15. Implement layout and navigation
  - [x] 15.1 Create Layout component
    - Header with user profile and logout button
    - Sidebar with navigation links
    - Main content area
    - _Requirements: 9.1_
  
  - [x] 15.2 Create Header component
    - Display user email and role
    - Logout button triggers logout action
    - _Requirements: 13.5_
  
  - [x] 15.3 Create Sidebar component
    - Navigation links (Dashboard, Users, Settings)
    - Conditional rendering based on role (Users link only for Admin)
    - _Requirements: 9.1_
  
  - [x] 15.4 Set up React Router
    - Configure routes for login, dashboard, users
    - Wrap protected routes with ProtectedRoute
    - _Requirements: 10.1_

- [x] 16. Implement UI styling and design
  - [x] 16.1 Set up design system
    - Configure color palette (primary: deep purple, secondary: teal)
    - Set up typography (Inter or Poppins font)
    - Configure spacing and breakpoints
    - _Requirements: 9.1_
  
  - [x] 16.2 Style authentication pages
    - Centered login form with card layout
    - Branded logo and colors
    - Responsive design for mobile
    - _Requirements: 13.2_
  
  - [x] 16.3 Style dashboard page
    - Full-width iframe with minimal chrome
    - Loading skeleton animation
    - Error state with helpful messaging
    - _Requirements: 10.1, 10.2_
  
  - [x] 16.4 Style user management page
    - Data table with sorting and filtering
    - Modal form for creating users
    - Inline editing for roles
    - Badge components for roles and status
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 16.5 Add micro-interactions and animations
    - Button hover effects and ripples
    - Smooth transitions (200-300ms)
    - Toast notifications for success/error feedback
    - _Requirements: 9.5_


- [x] 18. Implement security features
  - [x] 18.1 Add Content Security Policy headers
    - Configure CSP meta tag in index.html
    - Allow QuickSight iframe embedding
    - Restrict script and style sources
    - _Requirements: 11.1_
  
  - [x] 18.2 Implement token refresh logic
    - Detect token expiration in API client
    - Attempt automatic refresh with refresh token
    - Redirect to login if refresh fails
    - _Requirements: 13.4, 13.5_
  


- [x] 19. Implement governance rules management
  - [x] 19.1 Create governance rules API endpoints in Lambda
    - Implement getGovernanceRules endpoint
    - Implement updateGovernanceRules endpoint
    - Validate tenant_id matches authenticated user
    - _Requirements: 12.1, 12.2_
  
  - [x] 19.5 Create governance rules UI components
    - GovernanceRulesForm component for editing rules
    - Support region, store, team, custom dimensions
    - _Requirements: 12.1, 12.2_
  




## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (100 iterations each)
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- Performance tests validate scalability and responsiveness

