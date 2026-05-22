import type { AuthUser, UserRole } from '../types';

// Envuelve los helpers de @academiaplaton/shared adaptando la firma de AuthUser local.
// Centraliza aquí toda pregunta sobre permisos para que el resto del frontend
// nunca compare roles en bruto.

/** Comprueba si el usuario tiene el rol indicado (sin jerarquía). */
export function userHasRole(user: AuthUser, role: UserRole): boolean {
  return user.roles.includes(role);
}

/**
 * Comprueba si el usuario puede actuar como profesor en sesiones/grupos.
 * Condición: tiene un teacherId asignado Y su array de roles permite actuar
 * como teacher (role 'teacher', o 'admin', o 'center_manager' según jerarquía).
 *
 * Se usa para mostrar/ocultar el nav "Mi agenda" en sidebar/topbar cuando un
 * admin o center_manager también imparte clase. Un teacher puro ya tiene esa
 * vista de forma predeterminada.
 */
export function userCanActAsTeacher(user: AuthUser): boolean {
  if (!user.teacherId) return false;
  // admin y center_manager heredan el permiso de teacher (jerarquía de canAct en shared)
  return (
    user.roles.includes('teacher') ||
    user.roles.includes('admin') ||
    user.roles.includes('center_manager')
  );
}
