import { Router } from 'express';
import { z } from 'zod';
import {
  TeacherCreateSchema,
  TeacherFiltersSchema,
  TeacherUpdateSchema,
} from '@academiaplaton/shared';
import { validate } from '../../middleware/validate.js';
import { requireOrgId } from '../../middleware/tenantContext.js';
import { teachersService } from './teachers.service.js';

const IdParamSchema = z.object({ id: z.string().uuid() });

export const teachersRouter = Router();

teachersRouter.get(
  '/',
  validate(TeacherFiltersSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await teachersService.list(requireOrgId(req), req.query as never);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

teachersRouter.get(
  '/:id',
  validate(IdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const teacher = await teachersService.getById(requireOrgId(req), req.params.id!);
      res.json(teacher);
    } catch (err) {
      next(err);
    }
  },
);

teachersRouter.post(
  '/',
  validate(TeacherCreateSchema, 'body'),
  async (req, res, next) => {
    try {
      const created = await teachersService.create(requireOrgId(req), req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  },
);

teachersRouter.patch(
  '/:id',
  validate(IdParamSchema, 'params'),
  validate(TeacherUpdateSchema, 'body'),
  async (req, res, next) => {
    try {
      const updated = await teachersService.update(requireOrgId(req), req.params.id!, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

teachersRouter.delete(
  '/:id',
  validate(IdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      await teachersService.delete(requireOrgId(req), req.params.id!);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
