import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // Development bypass - skip authentication in development mode
  const isDevelopment = import.meta.env.DEV;
  const bypassAuth = isDevelopment && import.meta.env.VITE_BYPASS_AUTH === 'true';

  if (bypassAuth) {
    console.log('🔓 Development mode: Authentication bypassed');
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}