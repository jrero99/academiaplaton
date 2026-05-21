import type { AuthUser } from '../types';
import { buildUsername, uniqueUsername } from '../lib/username';
import { MOCK_CENTERS } from '@/features/centers/data/mock-centers';
import { MOCK_TEACHERS } from '@/features/teachers/data/mock-teachers';

const DEFAULT_PASSWORD = '1234';

const ADMIN_USER: AuthUser = {
  id: 'u-admin',
  username: 'admin',
  password: DEFAULT_PASSWORD,
  firstName: 'Administrador',
  lastName: 'Sistema',
  role: 'admin',
};

// Un responsable por centro. Username predecible: "r" + slug-sin-prefijo-platon.
//   "platon-teresas"   → "rteresas"
//   "platon-molinos"   → "rmolinos"
//   "platon-teresas-2" → "rteresas2"
function buildManagerUsername(centerSlug: string): string {
  const trimmed = centerSlug.replace(/^platon-?/, '').replace(/-/g, '');
  return `r${trimmed}`;
}

const MANAGER_USERS: AuthUser[] = MOCK_CENTERS.map((c) => ({
  id: `u-mng-${c.id}`,
  username: buildManagerUsername(c.slug),
  password: DEFAULT_PASSWORD,
  firstName: 'Responsable',
  lastName: c.name,
  role: 'center_manager',
  centerId: c.id,
}));

// Cada profesor mock se convierte automáticamente en un usuario.
// Si dos profesores generan el mismo username, se desambigua con sufijo.
const TEACHER_USERS: AuthUser[] = (() => {
  const taken = new Set<string>([
    ADMIN_USER.username,
    ...MANAGER_USERS.map((u) => u.username),
  ]);
  return MOCK_TEACHERS.map((t) => {
    const base = buildUsername(t.firstName, t.lastName);
    const username = uniqueUsername(base, taken);
    taken.add(username);
    return {
      id: `u-tch-${t.id}`,
      username,
      password: DEFAULT_PASSWORD,
      firstName: t.firstName,
      lastName: t.lastName,
      role: 'teacher' as const,
      centerId: t.centerId,
      teacherId: t.id,
    };
  });
})();

export const MOCK_USERS: AuthUser[] = [
  ADMIN_USER,
  ...MANAGER_USERS,
  ...TEACHER_USERS,
];
