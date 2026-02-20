# ShopPulse Analytics - Frontend

React TypeScript frontend application for the ShopPulse Analytics platform.

## Technology Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Redux Toolkit** - State management
- **AWS Amplify** - Authentication with Cognito
- **Material-UI (MUI)** - UI component library
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing

## Project Structure

```
src/
├── components/
│   ├── auth/          # Authentication components
│   ├── dashboard/     # Dashboard embedding components
│   ├── users/         # User management components
│   ├── layout/        # Layout components (Header, Sidebar)
│   └── common/        # Shared/reusable components
├── store/
│   ├── index.ts       # Redux store configuration
│   ├── authSlice.ts   # Authentication state
│   ├── userSlice.ts   # User management state
│   └── dashboardSlice.ts # Dashboard state
├── services/
│   ├── authService.ts      # Authentication API calls
│   ├── userService.ts      # User management API calls
│   └── dashboardService.ts # Dashboard API calls
├── hooks/
│   ├── useAuth.ts      # Authentication hook
│   ├── useUsers.ts     # User management hook
│   └── useDashboard.ts # Dashboard hook
├── types/
│   ├── auth.types.ts      # Authentication types
│   ├── user.types.ts      # User types
│   └── dashboard.types.ts # Dashboard types
├── utils/
│   ├── apiClient.ts   # API request utility
│   └── constants.ts   # Application constants
├── config/
│   └── amplify.ts     # AWS Amplify configuration
├── App.tsx            # Root component
└── main.tsx           # Application entry point
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- AWS Cognito User Pool configured
- API Gateway endpoint deployed

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your AWS configuration:
```
VITE_API_GATEWAY_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_AWS_REGION=us-east-1
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

Build for production:
```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

Preview the production build locally:
```bash
npm run preview
```

## Features

### Authentication
- Login with email/password via AWS Cognito
- Automatic token refresh
- Protected routes
- Role-based access control

### User Management (Admin only)
- List all users in tenant
- Create new users
- Update user roles
- Delete users

### Dashboard
- Embedded QuickSight dashboards
- Automatic URL refresh (every 10 minutes)
- Role-based dashboard access
- Loading and error states

## State Management

The application uses Redux Toolkit for state management with three main slices:

- **authSlice**: User authentication state
- **userSlice**: User management state
- **dashboardSlice**: Dashboard embedding state

## API Integration

All API calls are authenticated with JWT tokens from AWS Cognito. The `apiClient` utility automatically includes the access token in request headers.

## Styling

The application uses Material-UI (MUI) with a custom theme:
- Primary color: Deep purple (#6366F1)
- Secondary color: Teal (#14B8A6)
- Modern, clean design with generous whitespace
- Responsive layout for mobile and desktop

## Security

- JWT tokens stored in memory (not localStorage)
- Automatic token refresh
- Protected routes require authentication
- CORS configured for API Gateway
- Content Security Policy headers

## Deployment

The frontend is deployed to AWS S3 with CloudFront distribution:

1. Build the application:
```bash
npm run build
```

2. Deploy to S3:
```bash
aws s3 sync dist/ s3://your-bucket-name/ --delete
```

3. Invalidate CloudFront cache:
```bash
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

## License

Proprietary - ShopPulse Analytics
