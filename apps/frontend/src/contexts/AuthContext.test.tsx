import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

// `vi.mock` se hoistéa al top del fichero, por encima de cualquier import.
// Para poder leer/escribir desde el test los datos del factory, usamos
// `vi.hoisted()` que también se eleva y nos da una referencia compartida.
const hoisted = vi.hoisted(() => {
  const TEST_USERS = [
    {
      id: 'u-1',
      username: 'mixed-teacher-admin',
      password: 'x',
      firstName: 'F',
      lastName: 'L',
      roles: ['teacher', 'admin'] as Array<'admin' | 'center_manager' | 'teacher'>,
    },
    {
      id: 'u-2',
      username: 'mixed-teacher-manager',
      password: 'x',
      firstName: 'F',
      lastName: 'L',
      roles: ['teacher', 'center_manager'] as Array<
        'admin' | 'center_manager' | 'teacher'
      >,
    },
    {
      id: 'u-3',
      username: 'only-teacher',
      password: 'x',
      firstName: 'F',
      lastName: 'L',
      roles: ['teacher'] as Array<'admin' | 'center_manager' | 'teacher'>,
    },
  ];
  const setAuthRoleSpy = vi.fn<(role: string | null) => void>();
  return { TEST_USERS, setAuthRoleSpy };
});

// Mock del módulo de api para capturar el rol "principal" que AuthProvider
// envía al cliente axios (vía setAuthRole). Ese valor es exactamente lo que
// computa `pickPrimaryRole`, así verificamos la jerarquía indirectamente:
//   admin > center_manager > teacher > primer rol del array > null
//
// pickPrimaryRole no se exporta en producción (no ampliamos superficie
// pública); testeamos el comportamiento observable.
vi.mock('@/lib/api', () => ({
  setAuthRole: (role: string | null) => hoisted.setAuthRoleSpy(role),
}));

// Mock de MOCK_USERS para inyectar usuarios con la composición de roles
// que nos interesa por caso, sin acoplar al catálogo real.
vi.mock('@/features/auth/data/mock-users', () => ({
  MOCK_USERS: hoisted.TEST_USERS,
}));

import { AuthProvider, useAuth } from './AuthContext';

function HookProbe() {
  // forzamos la suscripción al provider sin renderizar nada relevante
  useAuth();
  return null;
}

const STORAGE_KEY = 'plato.auth.currentUserId';

beforeEach(() => {
  hoisted.setAuthRoleSpy.mockClear();
  window.localStorage.clear();
});

describe('pickPrimaryRole (vía AuthProvider → setAuthRole)', () => {
  it("should pick 'admin' from ['teacher','admin']", () => {
    window.localStorage.setItem(STORAGE_KEY, 'u-1');

    render(
      <AuthProvider>
        <HookProbe />
      </AuthProvider>,
    );

    expect(hoisted.setAuthRoleSpy).toHaveBeenCalledWith('admin');
  });

  it("should pick 'center_manager' from ['teacher','center_manager']", () => {
    window.localStorage.setItem(STORAGE_KEY, 'u-2');

    render(
      <AuthProvider>
        <HookProbe />
      </AuthProvider>,
    );

    expect(hoisted.setAuthRoleSpy).toHaveBeenCalledWith('center_manager');
  });

  it("should pick 'teacher' from ['teacher']", () => {
    window.localStorage.setItem(STORAGE_KEY, 'u-3');

    render(
      <AuthProvider>
        <HookProbe />
      </AuthProvider>,
    );

    expect(hoisted.setAuthRoleSpy).toHaveBeenCalledWith('teacher');
  });

  it('should pick null when there is no current user', () => {
    // sin set en localStorage → currentUser=null

    render(
      <AuthProvider>
        <HookProbe />
      </AuthProvider>,
    );

    expect(hoisted.setAuthRoleSpy).toHaveBeenCalledWith(null);
  });
});
