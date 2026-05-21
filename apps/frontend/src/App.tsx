import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { LeadsListPage } from '@/pages/admin/LeadsListPage';
import { StudentsListPage } from '@/pages/admin/StudentsListPage';
import { TeachersListPage } from '@/pages/admin/TeachersListPage';
import { GroupsListPage } from '@/pages/admin/GroupsListPage';
import { CalendarPage } from '@/pages/admin/CalendarPage';
import { CentersListPage } from '@/pages/admin/CentersListPage';
import { InvoicesListPage } from '@/pages/admin/InvoicesListPage';
import { StubPage } from '@/pages/admin/StubPage';
import { WelcomePage } from '@/pages/WelcomePage';
import { LoginPage } from '@/pages/LoginPage';

const STAFF = ['admin', 'center_manager'] as const;

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              {/* Rutas para admin y responsable de centro */}
              <Route element={<ProtectedRoute roles={[...STAFF]} redirectTo="/admin/calendar" />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="leads" element={<LeadsListPage />} />
                <Route path="students" element={<StudentsListPage />} />
                <Route path="teachers" element={<TeachersListPage />} />
                <Route path="groups" element={<GroupsListPage />} />
                <Route path="invoices" element={<InvoicesListPage />} />
                <Route path="analytics" element={<StubPage title="Analytics" />} />
                <Route path="messages" element={<StubPage title="Mensajes" />} />
                <Route path="settings" element={<StubPage title="Ajustes" />} />
              </Route>

              {/* Sólo admin */}
              <Route element={<ProtectedRoute roles={['admin']} redirectTo="/admin/calendar" />}>
                <Route path="centers" element={<CentersListPage />} />
              </Route>

              {/* Accesible para todos los logueados */}
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="help" element={<StubPage title="Ayuda" />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
