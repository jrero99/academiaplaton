import type { UserRole } from '@/features/auth/types';
import { useTranslation } from '@/contexts/LanguageContext';

// Etiquetas i18n para mostrar el rol del usuario en la UI. Centralizado aquí
// para que sidebar, topbar y cualquier otra superficie usen el mismo texto.
//
// Es un hook para que las etiquetas se re-rendericen al cambiar de idioma sin
// que los consumidores tengan que pasar `t` por argumento.
export function useRoleLabels(): Record<UserRole, string> {
  const { t } = useTranslation();
  return {
    admin: t('role.admin'),
    center_manager: t('role.center_manager'),
    teacher: t('role.teacher'),
  };
}

/** Devuelve las etiquetas de un array de roles, en el mismo orden. */
export function useRoleLabelsArray(roles: UserRole[]): string[] {
  const labels = useRoleLabels();
  return roles.map((r) => labels[r]);
}

/** Devuelve la sublinea de rol para el sidebar/topbar.
 *  Ejemplo: ['admin', 'teacher'] → "Administrador · Profesor"
 */
export function useRoleSubline(roles: UserRole[]): string {
  return useRoleLabelsArray(roles).join(' · ');
}
