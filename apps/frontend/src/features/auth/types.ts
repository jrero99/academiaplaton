export type UserRole = 'admin' | 'center_manager' | 'teacher';

export interface AuthUser {
  id: string;
  username: string;
  // Mock únicamente: en producción esto sería un hash en BD y nunca llegaría
  // al cliente. Ver CLAUDE.md §5 (passwords con bcrypt/argon2).
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  // Para center_manager: el centro que gestiona.
  // Para teacher: el centro donde imparte (derivado del Teacher).
  centerId?: string;
  // Para teacher: enlace al registro Teacher correspondiente.
  teacherId?: string;
}
