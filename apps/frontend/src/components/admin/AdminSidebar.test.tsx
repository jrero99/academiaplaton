import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { MOCK_USERS } from '@/features/auth/data/mock-users';
import { AdminSidebar } from './AdminSidebar';

// P0 #8 — La opción "Contabilidad" del sidebar es solo-admin.
//
// Reproduce el contrato del frontend con `requireAdmin` del backend: aunque
// el endpoint /api/accounting/* esté blindado, NO queremos que la UI exponga
// el ítem a un usuario sin rol admin. Defensa en profundidad.

const AUTH_STORAGE_KEY = 'plato.auth.currentUserId';
const LANG_STORAGE_KEY = 'plato.language';

function renderWithUser(userId: string) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, userId);
  // Forzamos castellano para que t('nav.accounting') sea estable a "Contabilidad".
  window.localStorage.setItem(LANG_STORAGE_KEY, 'es');
  return render(
    <LanguageProvider>
      <AuthProvider>
        <MemoryRouter>
          <AdminSidebar />
        </MemoryRouter>
      </AuthProvider>
    </LanguageProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('AdminSidebar — Contabilidad visibility (admin-only)', () => {
  it('should show the "Contabilidad" nav item to an admin user', () => {
    const adminUser = MOCK_USERS.find((u) => u.username === 'admin');
    expect(adminUser).toBeDefined();

    renderWithUser(adminUser!.id);

    // El NavLink renderiza el texto traducido — verificamos por href para no
    // depender 100% de la traducción exacta. Usamos getByRole link con name.
    expect(screen.getByRole('link', { name: /contabilidad/i })).toBeInTheDocument();
  });

  it('should NOT show the "Contabilidad" nav item to a center_manager', () => {
    const managerUser = MOCK_USERS.find(
      (u) => u.roles.length === 1 && u.roles[0] === 'center_manager',
    );
    expect(managerUser).toBeDefined();

    renderWithUser(managerUser!.id);

    expect(screen.queryByRole('link', { name: /contabilidad/i })).toBeNull();
    // Sanity: el sidebar sigue renderizando algo (no es null por falta de user).
    expect(screen.getByRole('link', { name: /calendar/i })).toBeInTheDocument();
  });

  it('should NOT show the "Contabilidad" nav item to a teacher', () => {
    const teacherUser = MOCK_USERS.find(
      (u) => u.roles.length === 1 && u.roles[0] === 'teacher',
    );
    expect(teacherUser).toBeDefined();

    renderWithUser(teacherUser!.id);

    expect(screen.queryByRole('link', { name: /contabilidad/i })).toBeNull();
  });
});
