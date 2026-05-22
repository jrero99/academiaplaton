import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { useAuth } from '@/contexts/AuthContext';
import { userHasRole } from '@/features/auth/lib/permissions';

export function AdminLayout() {
  const { currentUser } = useAuth();
  const location = useLocation();

  // Los usuarios que son SOLO teacher no tienen dashboard: aterrizan en su calendario.
  // Un usuario con roles múltiples (p.ej. ['admin', 'teacher']) sí tiene dashboard.
  if (
    currentUser &&
    currentUser.roles.length === 1 &&
    userHasRole(currentUser, 'teacher') &&
    location.pathname === '/admin'
  ) {
    return <Navigate to="/admin/calendar" replace />;
  }

  return (
    <div className="flex min-h-svh bg-muted/40">
      <AdminSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <AdminTopbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
