import { Router } from 'express';
import { z } from 'zod';
import {
  StudentCreateSchema,
  StudentFiltersSchema,
  StudentUpdateSchema,
} from '@academiaplaton/shared';
import { validate } from '../../middleware/validate.js';
import { studentsService } from './students.service.js';

const IdParamSchema = z.object({ id: z.string().uuid() });

export const studentsRouter = Router();

studentsRouter.get(
  '/',
  validate(StudentFiltersSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await studentsService.list(req.query as never);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

studentsRouter.get(
  '/:id',
  validate(IdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const student = await studentsService.getById(req.params.id);
      res.json(student);
    } catch (err) {
      next(err);
    }
  },
);

studentsRouter.post(
  '/',
  validate(StudentCreateSchema, 'body'),
  async (req, res, next) => {
    try {
      const created = await studentsService.create(req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  },
);

studentsRouter.patch(
  '/:id',
  validate(IdParamSchema, 'params'),
  validate(StudentUpdateSchema, 'body'),
  async (req, res, next) => {
    try {
      const updated = await studentsService.update(req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

studentsRouter.delete(
  '/:id',
  validate(IdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      await studentsService.delete(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
