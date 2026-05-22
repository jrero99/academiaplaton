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
  roles: ['admin'],
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
  roles: ['center_manager' as const],
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
      roles: ['teacher' as const],
      centerId: t.centerId,
      teacherId: t.id,
    };
  });
})();

// ─── Usuarios con roles múltiples ────────────────────────────────────────────
// Caso 1: admin que TAMBIÉN da clase.
// Usa el primer profesor activo de mock-teachers (Montserrat Ferrer, Teresas).
// No tiene centerId: en pantallas de gestión ve todo; en Mi Agenda filtra por teacherId.
const ADMIN_TEACHER_USER: AuthUser = {
  id: 'u-adminprof',
  username: 'adminprof',
  password: DEFAULT_PASSWORD,
  firstName: 'Admin',
  lastName: 'Profesor',
  roles: ['admin', 'teacher'],
  teacherId: '33333333-3333-3333-3333-333333333301', // Montserrat Ferrer (Teresas)
};

// Caso 2: responsable de Teresas que TAMBIÉN da clase.
// Usa el segundo profesor de Teresas (Núria Codina).
// centerId = Teresas (limita su vista de gestión a ese centro).
const MANAGER_TEACHER_USER: AuthUser = {
  id: 'u-rteresasprof',
  username: 'rteresasprof',
  password: DEFAULT_PASSWORD,
  firstName: 'Responsable',
  lastName: 'Teresas-Prof',
  roles: ['center_manager', 'teacher'],
  centerId: '00000000-0000-0000-0000-0000000000c1', // CENTER_PLATON_TERESAS
  teacherId: '33333333-3333-3333-3333-333333333303', // Núria Codina (Teresas)
};

export const MOCK_USERS: AuthUser[] = [
  ADMIN_USER,
  ADMIN_TEACHER_USER,
  ...MANAGER_USERS,
  MANAGER_TEACHER_USER,
  ...TEACHER_USERS,
];
