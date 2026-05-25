import { Router } from 'express';
import { z } from 'zod';
import {
  ExpenseCategoryCreateSchema,
  ExpenseCategoryFiltersSchema,
  ExpenseCategoryUpdateSchema,
  ExpenseCreateSchema,
  ExpenseFiltersSchema,
  ExpenseTemplateCreateSchema,
  ExpenseTemplateFiltersSchema,
  ExpenseTemplateUpdateSchema,
  ExpenseUpdateSchema,
  GenerateMonthInputSchema,
  IncomeCreateSchema,
  IncomeFiltersSchema,
  IncomeUpdateSchema,
  MonthlySummaryFiltersSchema,
} from '@academiaplaton/shared';
import { validate } from '../../middleware/validate.js';
import { requireOrgId } from '../../middleware/tenantContext.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import {
  categoriesService,
  expensesService,
  incomesService,
  monthGeneratorService,
  summaryService,
  templatesService,
} from './accounting.service.js';

const IdParamSchema = z.object({ id: z.string().uuid() });

export const accountingRouter = Router();

// Todo el módulo es solo-admin. requireAdmin va primero para fallar rápido.
accountingRouter.use(requireAdmin);

// ─────────────────────────────────────────────────────────────────────────────
// Resumen mensual
// ─────────────────────────────────────────────────────────────────────────────

accountingRouter.get(
  '/summary',
  validate(MonthlySummaryFiltersSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await summaryService.monthly(requireOrgId(req), req.query as never);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

accountingRouter.post(
  '/generate-month',
  validate(GenerateMonthInputSchema, 'body'),
  async (req, res, next) => {
    try {
      const result = await monthGeneratorService.generate(requireOrgId(req), req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────────────────────

accountingRouter.get(
  '/categories',
  validate(ExpenseCategoryFiltersSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await categoriesService.list(requireOrgId(req), req.query as never);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

accountingRouter.post(
  '/categories',
  validate(ExpenseCategoryCreateSchema, 'body'),
  async (req, res, next) => {
    try {
      const created = await categoriesService.create(requireOrgId(req), req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  },
);

accountingRouter.patch(
  '/categories/:id',
  validate(IdParamSchema, 'params'),
  validate(ExpenseCategoryUpdateSchema, 'body'),
  async (req, res, next) => {
    try {
      const updated = await categoriesService.update(
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

accountingRouter.delete(
  '/categories/:id',
  validate(IdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      await categoriesService.delete(requireOrgId(req), req.params.id!);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────────────────────

accountingRouter.get(
  '/templates',
  validate(ExpenseTemplateFiltersSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await templatesService.list(requireOrgId(req), req.query as never);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

accountingRouter.post(
  '/templates',
  validate(ExpenseTemplateCreateSchema, 'body'),
  async (req, res, next) => {
    try {
      const created = await templatesService.create(requireOrgId(req), req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  },
);

accountingRouter.patch(
  '/templates/:id',
  validate(IdParamSchema, 'params'),
  validate(ExpenseTemplateUpdateSchema, 'body'),
  async (req, res, next) => {
    try {
      const updated = await templatesService.update(
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

accountingRouter.delete(
  '/templates/:id',
  validate(IdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      await templatesService.delete(requireOrgId(req), req.params.id!);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Expenses
// ─────────────────────────────────────────────────────────────────────────────

accountingRouter.get(
  '/expenses',
  validate(ExpenseFiltersSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await expensesService.list(requireOrgId(req), req.query as never);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

accountingRouter.post(
  '/expenses',
  validate(ExpenseCreateSchema, 'body'),
  async (req, res, next) => {
    try {
      const created = await expensesService.create(requireOrgId(req), req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  },
);

accountingRouter.patch(
  '/expenses/:id',
  validate(IdParamSchema, 'params'),
  validate(ExpenseUpdateSchema, 'body'),
  async (req, res, next) => {
    try {
      const updated = await expensesService.update(
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

accountingRouter.delete(
  '/expenses/:id',
  validate(IdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      await expensesService.delete(requireOrgId(req), req.params.id!);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Incomes
// ─────────────────────────────────────────────────────────────────────────────

accountingRouter.get(
  '/incomes',
  validate(IncomeFiltersSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await incomesService.list(requireOrgId(req), req.query as never);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

accountingRouter.post(
  '/incomes',
  validate(IncomeCreateSchema, 'body'),
  async (req, res, next) => {
    try {
      const created = await incomesService.create(requireOrgId(req), req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  },
);

accountingRouter.patch(
  '/incomes/:id',
  validate(IdParamSchema, 'params'),
  validate(IncomeUpdateSchema, 'body'),
  async (req, res, next) => {
    try {
      const updated = await incomesService.update(
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

accountingRouter.delete(
  '/incomes/:id',
  validate(IdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      await incomesService.delete(requireOrgId(req), req.params.id!);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
