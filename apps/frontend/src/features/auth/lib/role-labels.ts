import type { UserRole } from '@/features/auth/types';

// Etiquetas para mostrar el rol del usuario en la UI. Centralizado aquí
// para que sidebar, topbar y cualquier otra superficie usen el mismo texto.
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  center_manager: 'Responsable',
  teacher: 'Profesor',
};
