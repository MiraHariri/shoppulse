import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Box, CircularProgress } from '@mui/material';

interface PublicRouteProps {
  children: React.ReactNode;
}

/**
 * PublicRoute Component
 * 
 * Wraps public routes (like login) and redirects authenticated users
 * to the dashboard or their intended destination
 */
export default function PublicRoute({ children }: PublicRouteProps) {
  const { user, loading, requiresPasswordChange } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // If user is authenticated and doesn't need password change, redirect to dashboard
  if (user && !requiresPasswordChange) {
    // Get the intended destination from location state, or default to dashboard
    const from = (location.state as { from?: string })?.from || '/dashboard';
    return <Navigate to={from} replace />;
  }

  // Allow access to public route (login page)
  return <>{children}</>;
}
