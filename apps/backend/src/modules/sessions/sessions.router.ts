import { Router } from 'express';
import { z } from 'zod';
import {
  SessionCreateSchema,
  SessionFiltersSchema,
  SessionUpdateSchema,
} from '@academiaplaton/shared';
import { validate } from '../../middleware/validate.js';
import { requireOrgId } from '../../middleware/tenantContext.js';
import { sessionsService } from './sessions.service.js';

const IdParamSchema = z.object({ id: z.string().uuid() });

export const sessionsRouter = Router();

sessionsRouter.get(
  '/',
  validate(SessionFiltersSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await sessionsService.list(requireOrgId(req), req.query as never);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

sessionsRouter.get(
  '/:id',
  validate(IdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const session = await sessionsService.getById(requireOrgId(req), req.params.id!);
      res.json(session);
    } catch (err) {
      next(err);
    }
  },
);

sessionsRouter.post(
  '/',
  validate(SessionCreateSchema, 'body'),
  async (req, res, next) => {
    try {
      const created = await sessionsService.create(requireOrgId(req), req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  },
);

sessionsRouter.patch(
  '/:id',
  validate(IdParamSchema, 'params'),
  validate(SessionUpdateSchema, 'body'),
  async (req, res, next) => {
    try {
      const updated = await sessionsService.update(
        requireOrgId(req),
        req.params.id!,
        req.body,
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

sessionsRouter.delete(
  '/:id',
  validate(IdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      await sessionsService.delete(requireOrgId(req), req.params.id!);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
