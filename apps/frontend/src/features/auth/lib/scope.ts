import type { AuthUser } from '../types';

// Centro al que está limitada la vista del usuario actual.
//   admin           → null  (ve todos los centros)
//   center_manager  → su centerId
//   teacher         → su centerId (sólo para coherencia, las pantallas
//                     filtradas por centro no son accesibles al profesor)
export function scopedCenterId(user: AuthUser): string | null {
  if (user.role === 'admin') return null;
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
