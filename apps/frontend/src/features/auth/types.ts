export type UserRole = 'admin' | 'center_manager' | 'teacher';

export interface AuthUser {
  id: string;
  username: string;
  // Mock únicamente: en producción esto sería un hash en BD y nunca llegaría
  // al cliente. Ver CLAUDE.md §5 (passwords con bcrypt/argon2).
  password: string;
  firstName: string;
  lastName: string;
  // Array de roles. Mínimo 1 elemento, sin duplicados.
  // Un usuario puede tener más de un rol: p.ej. ['admin', 'teacher'].
  roles: UserRole[];
  // Para center_manager y teacher: el centro al que están scopeados.
  // Un admin con roles: ['admin', 'teacher'] NO tiene centerId:
  // en pantallas de gestión ve todos; en pantallas de profesor filtra por teacherId.
  centerId?: string;
  // Presente cuando el usuario también actúa como profesor (tiene registro Teacher).
  // Puede coincidir con cualquier rol: admin, center_manager o teacher.
  teacherId?: string;
}
