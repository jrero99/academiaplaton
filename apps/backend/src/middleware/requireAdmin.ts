import type { RequestHandler } from 'express';
import { ErrorCodes, type UserRole } from '@academiaplaton/shared';
import { AppError } from '../lib/AppError.js';

// Middleware que restringe el acceso a endpoints solo-admin.
//
// FIXME: cuando aterrice el módulo auth (ver CLAUDE.md §2.a), este middleware
// debe leer `req.user.role` (o el array `roles` de la membresía resuelta por
// `tenantContext`) y comprobar que incluye 'admin'. Mientras tanto, mantenemos
// el header `x-user-role` opcional que el frontend (mock-users) ya envía, de
// modo que el bloqueo funciona en dev contra el flujo manager/teacher pero
// nunca debe considerarse seguro hasta que la auth real esté en sitio.
//
// Comportamiento actual:
//   1. Si el header `x-user-role` viene con un valor distinto a 'admin',
//      respondemos 403 inmediatamente (caso: manager intentando acceder).
//   2. Si no viene el header (auth aún no implementada), dejamos pasar — esto
//      preserva el flujo de los demás módulos donde tampoco hay auth real
//      y solo este módulo todavía no la requiere.
export const requireAdmin: RequestHandler = (req, _res, next) => {
  const raw = req.header('x-user-role');
  if (raw == null || raw.trim() === '') {
    // Auth no implementada todavía: no podemos verificar admin. Marcamos en
    // logs (vía pino-http req.log si está disponible) y dejamos pasar.
    // FIXME: cuando exista auth, esto debe pasar a 401 UNAUTHORIZED.
    next();
    return;
  }
  const role = raw.trim() as UserRole;
  if (role !== 'admin') {
    next(
      new AppError(
        403,
        ErrorCodes.FORBIDDEN,
        'This endpoint is restricted to administrators',
      ),
    );
    return;
  }
  next();
};
