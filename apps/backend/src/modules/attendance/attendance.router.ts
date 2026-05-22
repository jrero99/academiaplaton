import { Router } from 'express';
import { z } from 'zod';
import {
  AttendanceBulkUpsertSchema,
  GroupAttendanceFiltersSchema,
} from '@academiaplaton/shared';
import { validate } from '../../middleware/validate.js';
import { requireOrgId } from '../../middleware/tenantContext.js';
import { attendanceService } from './attendance.service.js';

// Parámetros de ruta con UUID
const SessionIdParamSchema = z.object({ sessionId: z.string().uuid() });
const GroupIdParamSchema = z.object({ groupId: z.string().uuid() });

// ─────────────────────────────────────────────────────────────────────────────
// Router de sesiones — se monta en /api/sessions (mergeParams: true)
// Las rutas de asistencia se añaden aquí como sub-rutas de /:sessionId/attendance.
// Se exporta por separado para montarse en app.ts junto al sessionsRouter
// sin colisiones, en lugar de tocar sessions.router.ts directamente.
// ─────────────────────────────────────────────────────────────────────────────

export const sessionAttendanceRouter = Router({ mergeParams: true });

// GET /api/sessions/:sessionId/attendance
sessionAttendanceRouter.get(
  '/:sessionId/attendance',
  validate(SessionIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const result = await attendanceService.getForSession(
        requireOrgId(req),
        req.params.sessionId!,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/sessions/:sessionId/attendance
// Idempotente: materializa el snapshot de alumnos y hace upsert de las marcas.
// markedByUserId queda null hasta que exista auth.
// TODO: setear markedByUserId cuando exista auth (req.user?.id).
sessionAttendanceRouter.put(
  '/:sessionId/attendance',
  validate(SessionIdParamSchema, 'params'),
  validate(AttendanceBulkUpsertSchema, 'body'),
  async (req, res, next) => {
    try {
      const result = await attendanceService.saveForSession(
        requireOrgId(req),
        req.params.sessionId!,
        req.body,
        null, // TODO: setear cuando exista auth
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Router de grupos — se monta en /api/groups (mergeParams: true)
// ─────────────────────────────────────────────────────────────────────────────

export const groupAttendanceRouter = Router({ mergeParams: true });

// GET /api/groups/:groupId/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=N
groupAttendanceRouter.get(
  '/:groupId/attendance',
  validate(GroupIdParamSchema, 'params'),
  validate(GroupAttendanceFiltersSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await attendanceService.getGroupHistory(
        requireOrgId(req),
        req.params.groupId!,
        req.query as never,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);
