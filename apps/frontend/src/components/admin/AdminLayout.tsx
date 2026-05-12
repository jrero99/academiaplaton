import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';

export function AdminLayout() {
  return (
    <div className="flex min-h-svh bg-muted/40">
      <AdminSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <AdminTopbar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
