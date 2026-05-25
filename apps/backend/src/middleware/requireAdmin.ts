import type { RequestHandler } from 'express';
import { type UserRole } from '@academiaplaton/shared';
import { AppError } from '../lib/AppError.js';

// Middleware que restringe el acceso a endpoints solo-admin.
//
// FIXME: cuando aterrice el módulo auth (ver CLAUDE.md §2.a), este middleware
// debe leer `req.user.role` (o el array `roles` de la membresía resuelta por
// `tenantContext`) y comprobar que incluye 'admin'. Mientras tanto, seguimos
// usando el header `x-user-role` que el frontend (mock-users) envía, pero
// la política ahora es **fail-closed** y coherente con el resto del backend:
// sin auth real, ningún cliente externo debería poder llegar a un endpoint
// admin solo por omitir un header. Esto se considera mock pero seguro por
// defecto — al implementar auth real, sustituir lectura de header por
// `req.user.role` proveniente del JWT validado.
//
// Comportamiento actual (fail-closed):
//   1. Si NO viene el header `x-user-role` (o viene vacío), respondemos
//      401 UNAUTHORIZED — no podemos identificar al usuario.
//   2. Si viene y el rol NO es 'admin', respondemos 403 FORBIDDEN — usuario
//      identificado pero sin permisos suficientes (caso: manager/teacher).
//   3. Si viene y es 'admin', dejamos pasar.
export const requireAdmin: RequestHandler = (req, _res, next) => {
  const raw = req.header('x-user-role');
  if (raw == null || raw.trim() === '') {
    next(AppError.unauthorized('Authentication required'));
    return;
  }
  const role = raw.trim() as UserRole;
  if (role !== 'admin') {
    next(AppError.forbidden('Admin role required'));
    return;
  }
  next();
};
