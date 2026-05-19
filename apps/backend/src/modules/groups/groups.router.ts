import { Router } from 'express';
import { z } from 'zod';
import {
  GroupCreateSchema,
  GroupFiltersSchema,
  GroupStudentAssignmentSchema,
  GroupUpdateSchema,
} from '@academiaplaton/shared';
import { validate } from '../../middleware/validate.js';
import { requireOrgId } from '../../middleware/tenantContext.js';
import { groupsService } from './groups.service.js';

const IdParamSchema = z.object({ id: z.string().uuid() });
const StudentIdParamSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
});

export const groupsRouter = Router();

groupsRouter.get(
  '/',
  validate(GroupFiltersSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await groupsService.list(requireOrgId(req), req.query as never);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

groupsRouter.get(
  '/:id',
  validate(IdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const group = await groupsService.getById(requireOrgId(req), req.params.id!);
      res.json(group);
    } catch (err) {
      next(err);
    }
  },
);

groupsRouter.post(
  '/',
  validate(GroupCreateSchema, 'body'),
  async (req, res, next) => {
    try {
      const created = await groupsService.create(requireOrgId(req), req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  },
);

groupsRouter.patch(
  '/:id',
  validate(IdParamSchema, 'params'),
  validate(GroupUpdateSchema, 'body'),
  async (req, res, next) => {
    try {
      const updated = await groupsService.update(requireOrgId(req), req.params.id!, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

groupsRouter.delete(
  '/:id',
  validate(IdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      await groupsService.delete(requireOrgId(req), req.params.id!);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// Asignaciones de alumnos: alta masiva y baja individual
groupsRouter.post(
  '/:id/students',
  validate(IdParamSchema, 'params'),
  validate(GroupStudentAssignmentSchema, 'body'),
  async (req, res, next) => {
    try {
      const updated = await groupsService.addStudents(
        requireOrgId(req),
        req.params.id!,
        req.body.studentIds,
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

groupsRouter.delete(
  '/:id/students/:studentId',
  validate(StudentIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const updated = await groupsService.removeStudent(
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
