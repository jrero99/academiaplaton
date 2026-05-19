import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { LeadsListPage } from '@/pages/admin/LeadsListPage';
import { StudentsListPage } from '@/pages/admin/StudentsListPage';
import { TeachersListPage } from '@/pages/admin/TeachersListPage';
import { StubPage } from '@/pages/admin/StubPage';
import { WelcomePage } from '@/pages/WelcomePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="leads" element={<LeadsListPage />} />
          <Route path="students" element={<StudentsListPage />} />
          <Route path="teachers" element={<TeachersListPage />} />
          <Route path="analytics" element={<StubPage title="Analytics" />} />
          <Route path="messages" element={<StubPage title="Mensajes" />} />
          <Route path="settings" element={<StubPage title="Ajustes" />} />
          <Route path="help" element={<StubPage title="Ayuda" />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
