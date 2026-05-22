import type { AuthUser } from '../types';

// Centro al que está limitada la vista del usuario actual.
//   admin (puro o compuesto)  → null  (ve todos los centros)
//   center_manager            → su centerId
//   teacher                   → su centerId (las pantallas de gestión por
//                               centro no son accesibles al teacher puro)
//
// Nota: un usuario con roles ['admin', 'teacher'] SIGUE devolviendo null aquí
// porque el rol admin prevalece para el alcance de gestión. Las pantallas de
// profesor (Mi agenda) filtran por teacherId directamente, no por centerId.
export function scopedCenterId(user: AuthUser): string | null {
  if (user.roles.includes('admin')) return null;
  return user.centerId ?? null;
}

// Aplica el scope de centro sobre una lista de entidades con campo centerId.
export function inScope<T extends { centerId: string }>(
  items: T[],
  user: AuthUser,
): T[] {
  const scope = scopedCenterId(user);
  if (scope === null) return items;
  return items.filter((item) => item.centerId === scope);
}
