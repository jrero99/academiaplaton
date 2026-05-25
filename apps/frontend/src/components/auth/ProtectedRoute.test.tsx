import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { MOCK_USERS } from '@/features/auth/data/mock-users';
import { ProtectedRoute } from './ProtectedRoute';

// P0 #9 — ProtectedRoute redirige a un center_manager que intenta entrar a
// /admin/accounting al destino indicado por `redirectTo` (en App.tsx, la
// ruta admin-only de accounting redirige a /admin/calendar).

const AUTH_STORAGE_KEY = 'plato.auth.currentUserId';

function renderRouting(opts: { userId: string; initialPath: string }) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, opts.userId);
  return render(
    <LanguageProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[opts.initialPath]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              {/* Ruta admin-only — replica el árbol real de App.tsx */}
              <Route
                element={<ProtectedRoute roles={['admin']} redirectTo="/admin/calendar" />}
              >
                <Route
                  path="/admin/accounting"
                  element={<div data-testid="accounting-page">Accounting</div>}
                />
              </Route>
              <Route
                path="/admin/calendar"
                element={<div data-testid="calendar-page">Calendar</div>}
              />
            </Route>
            <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </LanguageProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('ProtectedRoute — admin-only routes', () => {
  it('should redirect a center_manager away from /admin/accounting to /admin/calendar', () => {
    const manager = MOCK_USERS.find(
      (u) => u.roles.length === 1 && u.roles[0] === 'center_manager',
    );
    expect(manager).toBeDefined();

    renderRouting({ userId: manager!.id, initialPath: '/admin/accounting' });

    expect(screen.queryByTestId('accounting-page')).toBeNull();
    expect(screen.getByTestId('calendar-page')).toBeInTheDocument();
  });

  it('should redirect a teacher away from /admin/accounting', () => {
    const teacher = MOCK_USERS.find(
      (u) => u.roles.length === 1 && u.roles[0] === 'teacher',
    );
    expect(teacher).toBeDefined();

    renderRouting({ userId: teacher!.id, initialPath: '/admin/accounting' });

    expect(screen.queryByTestId('accounting-page')).toBeNull();
    expect(screen.getByTestId('calendar-page')).toBeInTheDocument();
  });

  it('should let an admin reach /admin/accounting', () => {
    const admin = MOCK_USERS.find((u) => u.username === 'admin');
    expect(admin).toBeDefined();

    renderRouting({ userId: admin!.id, initialPath: '/admin/accounting' });

    expect(screen.getByTestId('accounting-page')).toBeInTheDocument();
  });

  it('should redirect an unauthenticated user to /login', () => {
    // sin setItem en localStorage → currentUser=null
    render(
      <LanguageProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={['/admin/accounting']}>
            <Routes>
              <Route element={<ProtectedRoute />}>
                <Route
                  path="/admin/accounting"
                  element={<div data-testid="accounting-page">Accounting</div>}
                />
              </Route>
              <Route path="/login" element={<div data-testid="login-page">Login</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </LanguageProvider>,
    );

    expect(screen.queryByTestId('accounting-page')).toBeNull();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });
});
