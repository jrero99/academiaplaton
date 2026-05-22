import { UserRoleSchema, type UserRole } from '@academiaplaton/shared';
import { logger } from './logger.js';

/**
 * Parsea el CSV de roles almacenado en BD a un array tipado UserRole[].
 * Tokens inválidos se descartan con un log de advertencia para no romper
 * la query en caso de datos corruptos (datos previos con valor "staff", etc.).
 * Garantiza siempre al menos 1 elemento; si el CSV está vacío o todos los
 * tokens son inválidos, devuelve ['admin'] como fallback defensivo.
 */
export function parseRoles(csv: string): UserRole[] {
  const tokens = csv
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const valid: UserRole[] = [];
  for (const token of tokens) {
    const result = UserRoleSchema.safeParse(token);
    if (result.success) {
      if (!valid.includes(result.data)) {
        valid.push(result.data);
      }
    } else {
      logger.warn({ token }, 'parseRoles: unknown role token discarded');
    }
  }

  if (valid.length === 0) {
    logger.warn({ csv }, 'parseRoles: no valid roles found, falling back to ["admin"]');
    return ['admin'];
  }

  return valid;
}

/**
 * Serializa un array de UserRole a CSV para almacenar en BD.
 * Elimina duplicados antes de serializar.
 */
export function serializeRoles(roles: UserRole[]): string {
  const unique = [...new Set(roles)];
  return unique.join(',');
}
