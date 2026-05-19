import { Router } from 'express';
import { z } from 'zod';
import {
  CenterCreateSchema,
  CenterFiltersSchema,
  CenterUpdateSchema,
} from '@academiaplaton/shared';
import { validate } from '../../middleware/validate.js';
import { requireOrgId } from '../../middleware/tenantContext.js';
import { centersService } from './centers.service.js';

const IdParamSchema = z.object({ id: z.string().uuid() });

export const centersRouter = Router();

centersRouter.get(
  '/',
  validate(CenterFiltersSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await centersService.list(requireOrgId(req), req.query as never);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

centersRouter.get(
  '/:id',
  validate(IdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const center = await centersService.getById(requireOrgId(req), req.params.id!);
      res.json(center);
    } catch (err) {
      next(err);
    }
  },
);

centersRouter.post(
  '/',
  validate(CenterCreateSchema, 'body'),
  async (req, res, next) => {
    try {
      const created = await centersService.create(requireOrgId(req), req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  },
);

centersRouter.patch(
  '/:id',
  validate(IdParamSchema, 'params'),
  validate(CenterUpdateSchema, 'body'),
  async (req, res, next) => {
    try {
      const updated = await centersService.update(requireOrgId(req), req.params.id!, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

centersRouter.delete(
  '/:id',
  validate(IdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      await centersService.delete(requireOrgId(req), req.params.id!);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
