import type { Request } from 'express';
import { z } from 'zod';
import { ErrorCodes } from '@academiaplaton/shared';
import { AppError } from '../lib/AppError.js';

// Placeholder hasta que se implemente el middleware tenantContext completo
// (resolver organization desde el JWT del user autenticado y dejar
// `req.organization` poblado, ver CLAUDE.md §2.b).
//
// Mientras tanto: el frontend envía la organización actual en el header
// `x-organization-id`. NO usar en producción.
export function requireOrgId(req: Request): string {
  const raw = req.header('x-organization-id');
  const parsed = z.string().uuid().safeParse(raw);
  if (!parsed.success) {
    throw new AppError(400, ErrorCodes.VALIDATION, 'Missing or invalid x-organization-id header');
  }
  return parsed.data;
}
