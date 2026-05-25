import type {
  Expense,
  ExpenseCategory,
  ExpenseTemplate,
  Income,
  Prisma,
} from '@prisma/client';
import {
  ErrorCodes,
  type ExpenseCategoryCreate,
  type ExpenseCategoryDto,
  type ExpenseCategoryFilters,
  type ExpenseCategoryUpdate,
  type ExpenseCreate,
  type ExpenseDto,
  type ExpenseFilters,
  type ExpenseUpdate,
  type ExpenseTemplateCreate,
  type ExpenseTemplateDto,
  type ExpenseTemplateFilters,
  type ExpenseTemplateUpdate,
  type GenerateMonthInput,
  type GenerateMonthResult,
  type IncomeCreate,
  type IncomeDto,
  type IncomeFilters,
  type IncomeUpdate,
  type MonthlySummaryCategoryGroup,
  type MonthlySummaryCenter,
  type MonthlySummaryDto,
  type MonthlySummaryFilters,
  type MonthlySummarySalaryLine,
  type PaymentMethodBreakdown,
} from '@academiaplaton/shared';
import { AppError } from '../../lib/AppError.js';
import { prisma } from '../../lib/prisma.js';
import {
  accountingQueriesRepo,
  categoriesRepo,
  expensesRepo,
  incomesRepo,
  templatesRepo,
} from './accounting.repo.js';

// ─────────────────────────────────────────────────────────────────────────────
// Mapeos Prisma → DTO. NUNCA exponer entidades Prisma directamente.
// Decimal de Prisma viaja como `number` en la API (ver shared/accounting.ts).
// ─────────────────────────────────────────────────────────────────────────────

function toCategoryDto(c: ExpenseCategory): ExpenseCategoryDto {
  return {
    id: c.id,
    organizationId: c.organizationId,
    name: c.name,
    slug: c.slug,
    isSalary: c.isSalary,
    sortOrder: c.sortOrder,
    active: c.active,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function toTemplateDto(t: ExpenseTemplate): ExpenseTemplateDto {
  return {
    id: t.id,
    organizationId: t.organizationId,
    centerId: t.centerId,
    categoryId: t.categoryId,
    defaultAmount: t.defaultAmount.toNumber(),
    chargeDayOfMonth: t.chargeDayOfMonth ?? undefined,
    description: t.description ?? undefined,
    paymentMethod: t.paymentMethod,
    active: t.active,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

function toExpenseDto(e: Expense): ExpenseDto {
  return {
    id: e.id,
    organizationId: e.organizationId,
    centerId: e.centerId,
    categoryId: e.categoryId,
    templateId: e.templateId,
    teacherId: e.teacherId,
    periodMonth: e.periodMonth,
    amount: e.amount.toNumber(),
    paymentMethod: e.paymentMethod,
    originType: e.originType,
    paidAt: e.paidAt != null ? e.paidAt.toISOString().slice(0, 10) : null,
    active: e.active,
    notes: e.notes,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

function toIncomeDto(i: Income): IncomeDto {
  return {
    id: i.id,
    organizationId: i.organizationId,
    centerId: i.centerId,
    periodMonth: i.periodMonth,
    amount: i.amount.toNumber(),
    paymentMethod: i.paymentMethod,
    source: i.source,
    receivedAt: i.receivedAt != null ? i.receivedAt.toISOString().slice(0, 10) : null,
    notes: i.notes,
    active: i.active,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de validación cross-entity.
// ─────────────────────────────────────────────────────────────────────────────

async function assertCenterBelongsToOrg(organizationId: string, centerId: string) {
  const center = await prisma.center.findUnique({ where: { id: centerId } });
  if (!center || center.organizationId !== organizationId) {
    throw AppError.notFound('Center');
  }
}

async function loadCategoryForOrg(organizationId: string, categoryId: string) {
  const cat = await categoriesRepo.findById(categoryId);
  if (!cat || cat.organizationId !== organizationId) {
    throw AppError.notFound('ExpenseCategory');
  }
  return cat;
}

async function loadTemplateForOrg(organizationId: string, templateId: string) {
  const tpl = await templatesRepo.findById(templateId);
  if (!tpl || tpl.organizationId !== organizationId) {
    throw AppError.notFound('ExpenseTemplate');
  }
  return tpl;
}

async function loadTeacherForOrgAndCenter(
  organizationId: string,
  teacherId: string,
  centerId: string,
) {
  const t = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!t || t.organizationId !== organizationId) throw AppError.notFound('Teacher');
  if (t.centerId !== centerId) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION,
      'Teacher does not belong to the target center',
    );
  }
  return t;
}

// "YYYY-MM" → [startUtc, endUtcExclusive)
function periodMonthRange(period: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = period.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr); // 1..12
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

// ─────────────────────────────────────────────────────────────────────────────
// categoriesService
// ─────────────────────────────────────────────────────────────────────────────

export const categoriesService = {
  async list(
    organizationId: string,
    filters: ExpenseCategoryFilters,
  ): Promise<ExpenseCategoryDto[]> {
    const rows = await categoriesRepo.list({
      organizationId,
      ...(filters.active !== undefined && { active: filters.active }),
      ...(filters.isSalary !== undefined && { isSalary: filters.isSalary }),
    });
    return rows.map(toCategoryDto);
  },

  async create(
    organizationId: string,
    input: ExpenseCategoryCreate,
  ): Promise<ExpenseCategoryDto> {
    const dup = await categoriesRepo.findBySlug(organizationId, input.slug);
    if (dup) throw AppError.conflict(`Category slug "${input.slug}" already in use`);
    if (input.isSalary) {
      const existingSalary = await categoriesRepo.findSalaryCategory(organizationId);
      if (existingSalary) {
        throw AppError.conflict(
          `There is already a salary category (${existingSalary.slug}); only one allowed per organization`,
        );
      }
    }
    const created = await categoriesRepo.create({
      name: input.name,
      slug: input.slug,
      isSalary: input.isSalary,
      sortOrder: input.sortOrder,
      active: input.active,
      organization: { connect: { id: organizationId } },
    });
    return toCategoryDto(created);
  },

  async update(
    organizationId: string,
    id: string,
    input: ExpenseCategoryUpdate,
  ): Promise<ExpenseCategoryDto> {
    const existing = await loadCategoryForOrg(organizationId, id);
    if (input.slug && input.slug !== existing.slug) {
      const dup = await categoriesRepo.findBySlug(organizationId, input.slug);
      if (dup) throw AppError.conflict(`Category slug "${input.slug}" already in use`);
    }
    if (input.isSalary === true && !existing.isSalary) {
      const other = await categoriesRepo.findSalaryCategory(organizationId);
      if (other && other.id !== id) {
        throw AppError.conflict(
          `There is already a salary category (${other.slug}); only one allowed`,
        );
      }
    }
    const updated = await categoriesRepo.update(id, input);
    return toCategoryDto(updated);
  },

  async delete(organizationId: string, id: string): Promise<void> {
    const existing = await loadCategoryForOrg(organizationId, id);
    const [expCount, tplCount] = await Promise.all([
      categoriesRepo.countExpenses(existing.id),
      categoriesRepo.countTemplates(existing.id),
    ]);
    if (expCount > 0 || tplCount > 0) {
      throw AppError.conflict(
        `Category has ${expCount} expense(s) and ${tplCount} template(s); deactivate instead of deleting`,
      );
    }
    await categoriesRepo.delete(id);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// templatesService
// ─────────────────────────────────────────────────────────────────────────────

export const templatesService = {
  async list(
    organizationId: string,
    filters: ExpenseTemplateFilters,
  ): Promise<ExpenseTemplateDto[]> {
    const where: Prisma.ExpenseTemplateWhereInput = {
      organizationId,
      ...(filters.centerId && { centerId: filters.centerId }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.active !== undefined && { active: filters.active }),
    };
    const rows = await templatesRepo.list(where);
    return rows.map(toTemplateDto);
  },

  async create(
    organizationId: string,
    input: ExpenseTemplateCreate,
  ): Promise<ExpenseTemplateDto> {
    await assertCenterBelongsToOrg(organizationId, input.centerId);
    await loadCategoryForOrg(organizationId, input.categoryId);
    const created = await templatesRepo.create({
      defaultAmount: input.defaultAmount,
      chargeDayOfMonth: input.chargeDayOfMonth,
      description: input.description,
      paymentMethod: input.paymentMethod,
      active: input.active,
      organization: { connect: { id: organizationId } },
      center: { connect: { id: input.centerId } },
      category: { connect: { id: input.categoryId } },
    });
    return toTemplateDto(created);
  },

  async update(
    organizationId: string,
    id: string,
    input: ExpenseTemplateUpdate,
  ): Promise<ExpenseTemplateDto> {
    const existing = await loadTemplateForOrg(organizationId, id);
    if (input.centerId && input.centerId !== existing.centerId) {
      await assertCenterBelongsToOrg(organizationId, input.centerId);
    }
    if (input.categoryId && input.categoryId !== existing.categoryId) {
      await loadCategoryForOrg(organizationId, input.categoryId);
    }
    const { centerId, categoryId, ...rest } = input;
    const updated = await templatesRepo.update(id, {
      ...rest,
      ...(centerId && { center: { connect: { id: centerId } } }),
      ...(categoryId && { category: { connect: { id: categoryId } } }),
    });
    return toTemplateDto(updated);
  },

  async delete(organizationId: string, id: string): Promise<void> {
    const existing = await loadTemplateForOrg(organizationId, id);
    await templatesRepo.delete(existing.id);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// expensesService
// ─────────────────────────────────────────────────────────────────────────────

export const expensesService = {
  async list(organizationId: string, filters: ExpenseFilters) {
    const where: Prisma.ExpenseWhereInput = {
      organizationId,
      ...(filters.centerId && { centerId: filters.centerId }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.teacherId && { teacherId: filters.teacherId }),
      ...(filters.periodMonth && { periodMonth: filters.periodMonth }),
      ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod }),
      ...(filters.originType && { originType: filters.originType }),
      ...(filters.active !== undefined && { active: filters.active }),
    };
    const skip = (filters.page - 1) * filters.pageSize;
    const [rows, total] = await expensesRepo.list(where, skip, filters.pageSize);
    return {
      items: rows.map(toExpenseDto),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  },

  async create(organizationId: string, input: ExpenseCreate): Promise<ExpenseDto> {
    if (input.originType !== 'manual') {
      throw new AppError(
        400,
        ErrorCodes.VALIDATION,
        'Only manual expenses can be created directly; use /generate-month for automated ones',
      );
    }
    await assertCenterBelongsToOrg(organizationId, input.centerId);
    const category = await loadCategoryForOrg(organizationId, input.categoryId);
    if (input.templateId) {
      const tpl = await loadTemplateForOrg(organizationId, input.templateId);
      if (tpl.categoryId !== input.categoryId || tpl.centerId !== input.centerId) {
        throw new AppError(
          400,
          ErrorCodes.VALIDATION,
          'Template does not match the provided categoryId/centerId',
        );
      }
    }
    if (input.teacherId) {
      if (!category.isSalary) {
        throw new AppError(
          400,
          ErrorCodes.VALIDATION,
          'teacherId is only allowed in expenses under a salary category',
        );
      }
      await loadTeacherForOrgAndCenter(organizationId, input.teacherId, input.centerId);
    }
    const created = await expensesRepo.create({
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      originType: 'manual',
      periodMonth: input.periodMonth,
      paidAt: input.paidAt ? new Date(`${input.paidAt}T00:00:00.000Z`) : null,
      notes: input.notes,
      organization: { connect: { id: organizationId } },
      center: { connect: { id: input.centerId } },
      category: { connect: { id: input.categoryId } },
      ...(input.templateId && { template: { connect: { id: input.templateId } } }),
      ...(input.teacherId && { teacher: { connect: { id: input.teacherId } } }),
    });
    return toExpenseDto(created);
  },

  async update(
    organizationId: string,
    id: string,
    input: ExpenseUpdate,
  ): Promise<ExpenseDto> {
    const existing = await expensesRepo.findById(id);
    if (!existing || existing.organizationId !== organizationId) {
      throw AppError.notFound('Expense');
    }
    const targetCenterId = input.centerId ?? existing.centerId;
    const targetCategoryId = input.categoryId ?? existing.categoryId;
    if (input.centerId && input.centerId !== existing.centerId) {
      await assertCenterBelongsToOrg(organizationId, input.centerId);
    }
    let category = await loadCategoryForOrg(organizationId, targetCategoryId);
    if (input.categoryId && input.categoryId !== existing.categoryId) {
      category = await loadCategoryForOrg(organizationId, input.categoryId);
    }
    if (input.teacherId !== undefined && input.teacherId !== null) {
      if (!category.isSalary) {
        throw new AppError(
          400,
          ErrorCodes.VALIDATION,
          'teacherId is only allowed in expenses under a salary category',
        );
      }
      await loadTeacherForOrgAndCenter(organizationId, input.teacherId, targetCenterId);
    }
    const { centerId, categoryId, teacherId, paidAt, notes, ...rest } = input;
    const updated = await expensesRepo.update(id, {
      ...rest,
      ...(centerId && { center: { connect: { id: centerId } } }),
      ...(categoryId && { category: { connect: { id: categoryId } } }),
      ...(teacherId !== undefined && {
        teacher: teacherId === null ? { disconnect: true } : { connect: { id: teacherId } },
      }),
      ...(paidAt !== undefined && {
        paidAt: paidAt === null ? null : new Date(`${paidAt}T00:00:00.000Z`),
      }),
      ...(notes !== undefined && { notes }),
    });
    return toExpenseDto(updated);
  },

  // Soft-delete: marca active=false para preservar histórico contable.
  async delete(organizationId: string, id: string): Promise<void> {
    const existing = await expensesRepo.findById(id);
    if (!existing || existing.organizationId !== organizationId) {
      throw AppError.notFound('Expense');
    }
    await expensesRepo.update(id, { active: false });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// incomesService
// ─────────────────────────────────────────────────────────────────────────────

export const incomesService = {
  async list(organizationId: string, filters: IncomeFilters) {
    const where: Prisma.IncomeWhereInput = {
      organizationId,
      ...(filters.centerId && { centerId: filters.centerId }),
      ...(filters.periodMonth && { periodMonth: filters.periodMonth }),
      ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod }),
      ...(filters.active !== undefined && { active: filters.active }),
    };
    const skip = (filters.page - 1) * filters.pageSize;
    const [rows, total] = await incomesRepo.list(where, skip, filters.pageSize);
    return {
      items: rows.map(toIncomeDto),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  },

  async create(organizationId: string, input: IncomeCreate): Promise<IncomeDto> {
    await assertCenterBelongsToOrg(organizationId, input.centerId);
    const created = await incomesRepo.create({
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      source: input.source,
      periodMonth: input.periodMonth,
      receivedAt: input.receivedAt ? new Date(`${input.receivedAt}T00:00:00.000Z`) : null,
      notes: input.notes,
      organization: { connect: { id: organizationId } },
      center: { connect: { id: input.centerId } },
    });
    return toIncomeDto(created);
  },

  async update(
    organizationId: string,
    id: string,
    input: IncomeUpdate,
  ): Promise<IncomeDto> {
    const existing = await incomesRepo.findById(id);
    if (!existing || existing.organizationId !== organizationId) {
      throw AppError.notFound('Income');
    }
    if (input.centerId && input.centerId !== existing.centerId) {
      await assertCenterBelongsToOrg(organizationId, input.centerId);
    }
    const { centerId, receivedAt, notes, ...rest } = input;
    const updated = await incomesRepo.update(id, {
      ...rest,
      ...(centerId && { center: { connect: { id: centerId } } }),
      ...(receivedAt !== undefined && {
        receivedAt: receivedAt === null ? null : new Date(`${receivedAt}T00:00:00.000Z`),
      }),
      ...(notes !== undefined && { notes }),
    });
    return toIncomeDto(updated);
  },

  async delete(organizationId: string, id: string): Promise<void> {
    const existing = await incomesRepo.findById(id);
    if (!existing || existing.organizationId !== organizationId) {
      throw AppError.notFound('Income');
    }
    await incomesRepo.update(id, { active: false });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// summaryService — vista agregada mensual.
//   1) Por cada centro de la org (o el filtrado): calcula ingreso "feesAuto"
//      a partir de Student.monthlyFee de los alumnos ACTIVOS del centro.
//   2) Recoge Income manuales activos del periodo.
//   3) Recoge Expense activos del periodo, agrupa por categoría.
//   4) Calcula líneas de salario por profesor (horas × hourlyRate) y enlaza
//      con el Expense salary_auto correspondiente si existe.
//   5) Devuelve totales y breakdown por paymentMethod.
//
// Nota — "histórico = referencia viva": el summary NO es un snapshot del mes
// consultado. feesAuto, activeStudents, nombres de categoría/profesor y la
// tarifa horaria se leen del estado ACTUAL de las entidades. Si cambias
// Student.monthlyFee hoy, el summary de meses pasados reflejará ese nuevo
// valor. Diseñado así adrede para evitar duplicar datos en cada cierre.
// ─────────────────────────────────────────────────────────────────────────────

function emptyBreakdown(): PaymentMethodBreakdown {
  return { sepa: 0, transfer: 0, cash: 0, other: 0 };
}

function addToBreakdown(
  bd: PaymentMethodBreakdown,
  method: 'sepa' | 'transfer' | 'cash' | 'other',
  amount: number,
): void {
  bd[method] = round2(bd[method] + amount);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const summaryService = {
  async monthly(
    organizationId: string,
    filters: MonthlySummaryFilters,
  ): Promise<MonthlySummaryDto> {
    // Resolver lista de centros a procesar.
    let centers;
    if (filters.centerId === 'all') {
      centers = await accountingQueriesRepo.listOrgCenters(organizationId);
    } else {
      const c = await accountingQueriesRepo.findCenter(organizationId, filters.centerId);
      if (!c) throw AppError.notFound('Center');
      centers = [c];
    }

    const { start, end } = periodMonthRange(filters.month);

    // Pre-cargar categorías (para nombres en byCategory) y profesores (para
    // nombres en salaries) — evitamos N queries por centro.
    const allCategories = await categoriesRepo.list({ organizationId });
    const allTeachers = await accountingQueriesRepo.listTeachersForOrg(organizationId);

    // Sesiones del mes (filtradas por centro si aplica, igual no es caro).
    const sessions = await accountingQueriesRepo.listMonthSessionsForPayroll(
      organizationId,
      filters.centerId === 'all' ? undefined : filters.centerId,
      start,
      end,
    );

    // Cubo agregado: (centerId, teacherId) → minutos.
    const minutesPerCenterTeacher = new Map<string, number>();
    for (const s of sessions) {
      const k = `${s.centerId}::${s.teacherId}`;
      minutesPerCenterTeacher.set(k, (minutesPerCenterTeacher.get(k) ?? 0) + s.durationMinutes);
    }

    const centerSummaries: MonthlySummaryCenter[] = [];
    for (const center of centers) {
      // ─── INGRESOS ───
      const [activeStudents, feesAgg, incomes] = await Promise.all([
        accountingQueriesRepo.countActiveStudentsPerCenter(organizationId, center.id),
        accountingQueriesRepo.sumStudentMonthlyFees(organizationId, center.id),
        incomesRepo.listForMonth(organizationId, center.id, filters.month),
      ]);
      const feesAuto = feesAgg._sum.monthlyFee != null
        ? feesAgg._sum.monthlyFee.toNumber()
        : 0;

      const incomeBreakdown = emptyBreakdown();
      // feesAuto se contabiliza por defecto como SEPA (los recibos). Si en el
      // futuro la mezcla varía, mover a una decisión configurable.
      addToBreakdown(incomeBreakdown, 'sepa', feesAuto);
      let incomeTotal = feesAuto;
      const manualIncomeDtos: IncomeDto[] = [];
      for (const i of incomes) {
        const amt = i.amount.toNumber();
        addToBreakdown(incomeBreakdown, i.paymentMethod, amt);
        incomeTotal = round2(incomeTotal + amt);
        manualIncomeDtos.push(toIncomeDto(i));
      }

      // ─── GASTOS ───
      const expenses = await expensesRepo.listForMonth(
        organizationId,
        center.id,
        filters.month,
      );
      const expenseBreakdown = emptyBreakdown();
      const byCategoryMap = new Map<string, MonthlySummaryCategoryGroup>();
      // Pre-inicializar grupos para todas las categorías activas → UI estable.
      for (const cat of allCategories.filter((c) => c.active)) {
        byCategoryMap.set(cat.id, {
          categoryId: cat.id,
          categoryName: cat.name,
          categorySlug: cat.slug,
          isSalary: cat.isSalary,
          items: [],
          subtotal: 0,
        });
      }
      let expenseTotal = 0;
      const salaryExpenseByTeacher = new Map<string, Expense>();
      for (const e of expenses) {
        const dto = toExpenseDto(e);
        const grp = byCategoryMap.get(e.categoryId);
        if (grp) {
          grp.items.push(dto);
          grp.subtotal = round2(grp.subtotal + dto.amount);
        }
        addToBreakdown(expenseBreakdown, e.paymentMethod, dto.amount);
        expenseTotal = round2(expenseTotal + dto.amount);
        if (e.originType === 'salary_auto' && e.teacherId) {
          salaryExpenseByTeacher.set(e.teacherId, e);
        }
      }

      // ─── SALARIOS (líneas por profesor) ───
      const centerTeachers = allTeachers.filter((t) => t.centerId === center.id);
      const salaries: MonthlySummarySalaryLine[] = [];
      for (const t of centerTeachers) {
        const minutes = minutesPerCenterTeacher.get(`${center.id}::${t.id}`) ?? 0;
        if (minutes === 0 && !salaryExpenseByTeacher.has(t.id)) continue;
        const hoursWorked = round2(minutes / 60);
        const rate = t.hourlyRate != null ? t.hourlyRate.toNumber() : null;
        const computed = rate != null ? round2(hoursWorked * rate) : 0;
        const expenseRow = salaryExpenseByTeacher.get(t.id);
        salaries.push({
          teacherId: t.id,
          teacherFirstName: t.firstName,
          teacherLastName: t.lastName,
          hoursWorked,
          hourlyRate: rate,
          computed,
          override: expenseRow ? expenseRow.amount.toNumber() : null,
          paid: expenseRow != null && expenseRow.paidAt != null,
          expenseId: expenseRow?.id ?? null,
        });
      }

      const byCategory = Array.from(byCategoryMap.values()).filter(
        (g) => g.items.length > 0,
      );

      const profit = round2(incomeTotal - expenseTotal);
      centerSummaries.push({
        centerId: center.id,
        centerName: center.name,
        income: {
          feesAuto,
          activeStudents,
          manualIncomes: manualIncomeDtos,
          totalByPaymentMethod: incomeBreakdown,
          total: round2(incomeTotal),
        },
        expenses: {
          byCategory,
          salaries,
          totalByPaymentMethod: expenseBreakdown,
          total: round2(expenseTotal),
        },
        profit,
      });
    }

    const grandTotalIncome = round2(
      centerSummaries.reduce((a, c) => a + c.income.total, 0),
    );
    const grandTotalExpense = round2(
      centerSummaries.reduce((a, c) => a + c.expenses.total, 0),
    );
    const grandTotalProfit = round2(grandTotalIncome - grandTotalExpense);

    return {
      organizationId,
      periodMonth: filters.month,
      centers: centerSummaries,
      grandTotalIncome,
      grandTotalExpense,
      grandTotalProfit,
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// monthGeneratorService — materializa Expense template_gen + salary_auto.
// Idempotente: si ya hay un Expense activo con (templateId, periodMonth) o
// (teacherId, periodMonth, salary_auto) NO se duplica.
// ─────────────────────────────────────────────────────────────────────────────

export const monthGeneratorService = {
  async generate(
    organizationId: string,
    input: GenerateMonthInput,
  ): Promise<GenerateMonthResult> {
    const warnings: string[] = [];
    let templatesGenerated = 0;
    let templatesSkipped = 0;
    let salariesGenerated = 0;
    let salariesSkipped = 0;
    let centersProcessed = 0;

    // Resolver centros.
    let centers;
    if (input.centerId) {
      const c = await accountingQueriesRepo.findCenter(organizationId, input.centerId);
      if (!c) throw AppError.notFound('Center');
      centers = [c];
    } else {
      centers = await accountingQueriesRepo.listOrgCenters(organizationId);
    }
    const centerIds = new Set(centers.map((c) => c.id));

    // ─── Plantillas → Expense template_gen ───
    const templates = await templatesRepo.listActiveForGeneration(organizationId);
    for (const tpl of templates) {
      if (!centerIds.has(tpl.centerId)) continue;
      const exists = await expensesRepo.findExistingTemplateGen(tpl.id, input.periodMonth);
      if (exists) {
        templatesSkipped++;
        continue;
      }
      // Construir paidAt si la plantilla define día de cargo y cabe en el mes.
      let paidAt: Date | null = null;
      if (tpl.chargeDayOfMonth != null) {
        const { start, end } = periodMonthRange(input.periodMonth);
        const tentative = new Date(
          Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), tpl.chargeDayOfMonth),
        );
        // Si el día no existe en el mes (p.ej. 31 en febrero), usar último día.
        if (tentative >= end) {
          const lastDay = new Date(end);
          lastDay.setUTCDate(lastDay.getUTCDate() - 1);
          paidAt = lastDay;
        } else {
          paidAt = tentative;
        }
      }
      await expensesRepo.create({
        amount: tpl.defaultAmount,
        paymentMethod: tpl.paymentMethod,
        originType: 'template_gen',
        periodMonth: input.periodMonth,
        paidAt,
        notes: tpl.description,
        organization: { connect: { id: organizationId } },
        center: { connect: { id: tpl.centerId } },
        category: { connect: { id: tpl.categoryId } },
        template: { connect: { id: tpl.id } },
      });
      templatesGenerated++;
    }

    // ─── Salarios autocalculados ───
    const salaryCategory = await categoriesRepo.findSalaryCategory(organizationId);
    if (!salaryCategory) {
      warnings.push(
        'No salary category configured (isSalary=true); skipping salary auto-generation',
      );
    } else {
      const { start, end } = periodMonthRange(input.periodMonth);
      const sessions = await accountingQueriesRepo.listMonthSessionsForPayroll(
        organizationId,
        input.centerId,
        start,
        end,
      );
      // Agrupar minutos por (centerId, teacherId) — el salario va al center
      // donde dio clase, no al center del Teacher.
      const minutesByCT = new Map<string, number>();
      for (const s of sessions) {
        const k = `${s.centerId}::${s.teacherId}`;
        minutesByCT.set(k, (minutesByCT.get(k) ?? 0) + s.durationMinutes);
      }
      const teachers = await accountingQueriesRepo.listTeachersForOrg(organizationId);
      const teacherById = new Map(teachers.map((t) => [t.id, t]));

      for (const [k, minutes] of minutesByCT) {
        if (minutes === 0) continue;
        const [centerId, teacherId] = k.split('::') as [string, string];
        if (!centerIds.has(centerId)) continue;
        const teacher = teacherById.get(teacherId);
        if (!teacher) {
          warnings.push(`Teacher ${teacherId} not found while generating salary`);
          continue;
        }
        if (teacher.hourlyRate == null) {
          warnings.push(
            `Teacher ${teacher.firstName} ${teacher.lastName} has no hourlyRate; skipping salary`,
          );
          continue;
        }
        // Idempotencia: 1 salary_auto activo por (teacher, periodMonth).
        const exists = await expensesRepo.findExistingSalaryAuto(
          teacherId,
          input.periodMonth,
        );
        if (exists) {
          salariesSkipped++;
          continue;
        }
        const hours = minutes / 60;
        const amount = round2(hours * teacher.hourlyRate.toNumber());
        await expensesRepo.create({
          amount,
          paymentMethod: 'transfer',
          originType: 'salary_auto',
          periodMonth: input.periodMonth,
          paidAt: null,
          notes: `Salario autocalculado: ${round2(hours)}h × ${teacher.hourlyRate.toNumber()}€/h`,
          organization: { connect: { id: organizationId } },
          center: { connect: { id: centerId } },
          category: { connect: { id: salaryCategory.id } },
          teacher: { connect: { id: teacherId } },
        });
        salariesGenerated++;
      }
    }

    centersProcessed = centers.length;
    return {
      periodMonth: input.periodMonth,
      centersProcessed,
      templatesGenerated,
      templatesSkipped,
      salariesGenerated,
      salariesSkipped,
      warnings,
    };
  },
};
