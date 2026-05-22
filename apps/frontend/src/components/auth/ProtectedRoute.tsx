import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/features/auth/types';
import { userHasRole } from '@/features/auth/lib/permissions';

interface Props {
  // Si se pasan roles, el usuario debe tener AL MENOS UNO de ellos (OR).
  // Admin siempre pasa independientemente del array indicado.
  // Si no se pasan roles, basta con que haya sesión activa.
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

  if (roles) {
    // Admin siempre pasa; en caso contrario debe tener alguno de los roles requeridos.
    const allowed =
      userHasRole(currentUser, 'admin') ||
      roles.some((r) => userHasRole(currentUser, r));
    if (!allowed) {
      return <Navigate to={redirectTo} replace />;
    }
  }

  return <Outlet />;
}
