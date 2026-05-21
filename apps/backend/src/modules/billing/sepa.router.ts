import { Router } from 'express';
import { z } from 'zod';
import {
  SepaMandateCreateSchema,
  SepaMandateFiltersSchema,
  SepaMandateUpdateSchema,
} from '@academiaplaton/shared';
import { validate } from '../../middleware/validate.js';
import { requireOrgId } from '../../middleware/tenantContext.js';
import { sepaService } from './sepa.service.js';

const IdParamSchema = z.object({ id: z.string().uuid() });
const StudentParamSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
});

export const sepaRouter = Router();

sepaRouter.get(
  '/',
  validate(SepaMandateFiltersSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await sepaService.list(requireOrgId(req), req.query as never);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

sepaRouter.get(
  '/:id',
  validate(IdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const mandate = await sepaService.getById(requireOrgId(req), req.params.id!);
      res.json(mandate);
    } catch (err) {
      next(err);
    }
  },
);

sepaRouter.post(
  '/',
  validate(SepaMandateCreateSchema, 'body'),
  async (req, res, next) => {
    try {
      const created = await sepaService.create(requireOrgId(req), req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  },
);

sepaRouter.patch(
  '/:id',
  validate(IdParamSchema, 'params'),
  validate(SepaMandateUpdateSchema, 'body'),
  async (req, res, next) => {
    try {
      const updated = await sepaService.update(requireOrgId(req), req.params.id!, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

sepaRouter.delete(
  '/:id',
  validate(IdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      await sepaService.delete(requireOrgId(req), req.params.id!);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

sepaRouter.post(
  '/:id/students/:studentId',
  validate(StudentParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const updated = await sepaService.assignStudent(
        requireOrgId(req),
        req.params.id!,
        req.params.studentId!,
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

sepaRouter.delete(
  '/:id/students/:studentId',
  validate(StudentParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const updated = await sepaService.unassignStudent(
        requireOrgId(req),
        req.params.id!,
        req.params.studentId!,
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);
