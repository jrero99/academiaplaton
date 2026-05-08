import { Router } from 'express';
import { z } from 'zod';
import {
  LeadCreateSchema,
  LeadFiltersSchema,
  LeadUpdateSchema,
} from '@academiaplaton/shared';
import { validate } from '../../middleware/validate.js';
import { leadsService } from './leads.service.js';

const IdParamSchema = z.object({ id: z.string().uuid() });

export const leadsRouter = Router();

leadsRouter.get(
  '/',
  validate(LeadFiltersSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await leadsService.list(req.query as never);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

leadsRouter.get(
  '/:id',
  validate(IdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const lead = await leadsService.getById(req.params.id);
      res.json(lead);
    } catch (err) {
      next(err);
    }
  },
);

leadsRouter.post(
  '/',
  validate(LeadCreateSchema, 'body'),
  async (req, res, next) => {
    try {
      const created = await leadsService.create(req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  },
);

leadsRouter.patch(
  '/:id',
  validate(IdParamSchema, 'params'),
  validate(LeadUpdateSchema, 'body'),
  async (req, res, next) => {
    try {
      const updated = await leadsService.update(req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

leadsRouter.delete(
  '/:id',
  validate(IdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      await leadsService.delete(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
