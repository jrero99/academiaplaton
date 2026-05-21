import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/features/auth/types';

interface Props {
  // Si se pasan roles, el usuario debe tener uno de ellos.
  // Si no, basta con que haya sesión activa.
  roles?: UserRole[];
  // A dónde mandar al usuario sin permisos. Por defecto al dashboard,
  // donde AdminLayout decidirá la pantalla correcta para su rol.
  redirectTo?: string;
}

export function ProtectedRoute({ roles, redirectTo = '/admin' }: Props) {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (roles && !roles.includes(currentUser.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
