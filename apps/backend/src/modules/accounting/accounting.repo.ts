import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

// ─────────────────────────────────────────────────────────────────────────────
// Accounting repos — un único fichero porque las entidades comparten dominio
// (gastos/ingresos/categorías/plantillas) y la cantidad de funciones por
// entidad es pequeña. Si crece, separar en sub-ficheros por subdominio.
//
// Todas las funciones reciben `organizationId` o un `where` que lo contenga.
// Los repos NO deciden tenant: el service lo provee.
// ─────────────────────────────────────────────────────────────────────────────

export const categoriesRepo = {
  list(where: Prisma.ExpenseCategoryWhereInput) {
    return prisma.expenseCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  findById(id: string) {
    return prisma.expenseCategory.findUnique({ where: { id } });
  },

  findBySlug(organizationId: string, slug: string) {
    return prisma.expenseCategory.findUnique({
      where: { organizationId_slug: { organizationId, slug } },
    });
  },

  // La categoría de "nóminas" se identifica por isSalary=true. Se usa al
  // generar salarios autocalculados — se asume una por organización.
  findSalaryCategory(organizationId: string) {
    return prisma.expenseCategory.findFirst({
      where: { organizationId, isSalary: true, active: true },
    });
  },

  create(data: Prisma.ExpenseCategoryCreateInput) {
    return prisma.expenseCategory.create({ data });
  },

  update(id: string, data: Prisma.ExpenseCategoryUpdateInput) {
    return prisma.expenseCategory.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.expenseCategory.delete({ where: { id } });
  },

  countExpenses(categoryId: string) {
    return prisma.expense.count({ where: { categoryId } });
  },

  countTemplates(categoryId: string) {
    return prisma.expenseTemplate.count({ where: { categoryId } });
  },
};

export const templatesRepo = {
  list(where: Prisma.ExpenseTemplateWhereInput) {
    return prisma.expenseTemplate.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }],
    });
  },

  findById(id: string) {
    return prisma.expenseTemplate.findUnique({ where: { id } });
  },

  listActiveForGeneration(organizationId: string, centerId?: string) {
    return prisma.expenseTemplate.findMany({
      where: {
        organizationId,
        active: true,
        ...(centerId && { centerId }),
        category: { active: true },
      },
    });
  },

  create(data: Prisma.ExpenseTemplateCreateInput) {
    return prisma.expenseTemplate.create({ data });
  },

  update(id: string, data: Prisma.ExpenseTemplateUpdateInput) {
    return prisma.expenseTemplate.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.expenseTemplate.delete({ where: { id } });
  },
};

export const expensesRepo = {
  list(where: Prisma.ExpenseWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.expense.findMany({
        where,
        skip,
        take,
        orderBy: [{ periodMonth: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.expense.count({ where }),
    ]);
  },

  // Lista sin paginar para el summary mensual.
  listForMonth(
    organizationId: string,
    centerId: string | undefined,
    periodMonth: string,
  ) {
    return prisma.expense.findMany({
      where: {
        organizationId,
        active: true,
        periodMonth,
        ...(centerId && { centerId }),
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  },

  findById(id: string) {
    return prisma.expense.findUnique({ where: { id } });
  },

  // Para idempotencia del generador mensual: por (template, month) sólo
  // queremos un Expense template_gen activo.
  findExistingTemplateGen(templateId: string, periodMonth: string) {
    return prisma.expense.findFirst({
      where: {
        templateId,
        periodMonth,
        originType: 'template_gen',
        active: true,
      },
    });
  },

  // Idem para salarios: 1 expense salary_auto activo por (teacher, month).
  findExistingSalaryAuto(teacherId: string, periodMonth: string) {
    return prisma.expense.findFirst({
      where: {
        teacherId,
        periodMonth,
        originType: 'salary_auto',
        active: true,
      },
    });
  },

  create(data: Prisma.ExpenseCreateInput) {
    return prisma.expense.create({ data });
  },

  update(id: string, data: Prisma.ExpenseUpdateInput) {
    return prisma.expense.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.expense.delete({ where: { id } });
  },
};

export const incomesRepo = {
  list(where: Prisma.IncomeWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.income.findMany({
        where,
        skip,
        take,
        orderBy: [{ periodMonth: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.income.count({ where }),
    ]);
  },

  listForMonth(
    organizationId: string,
    centerId: string | undefined,
    periodMonth: string,
  ) {
    return prisma.income.findMany({
      where: {
        organizationId,
        active: true,
        periodMonth,
        ...(centerId && { centerId }),
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  },

  findById(id: string) {
    return prisma.income.findUnique({ where: { id } });
  },

  create(data: Prisma.IncomeCreateInput) {
    return prisma.income.create({ data });
  },

  update(id: string, data: Prisma.IncomeUpdateInput) {
    return prisma.income.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.income.delete({ where: { id } });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de lectura cross-entity usados solo por summaryService /
// monthGeneratorService. No exponer a routers.
// ─────────────────────────────────────────────────────────────────────────────

export const accountingQueriesRepo = {
  // Lista de centros activos de la organización para iterar el resumen.
  listOrgCenters(organizationId: string) {
    return prisma.center.findMany({
      where: { organizationId, active: true },
      orderBy: [{ name: 'asc' }],
    });
  },

  findCenter(organizationId: string, centerId: string) {
    return prisma.center.findFirst({
      where: { id: centerId, organizationId },
    });
  },

  // Conteo de alumnos activos por centro. Un alumno con active=false está de
  // baja y NO debe contar para el resumen mensual ni para feesAuto.
  countActiveStudentsPerCenter(organizationId: string, centerId: string) {
    return prisma.student.count({
      where: { organizationId, centerId, active: true },
    });
  },

  // Suma de monthlyFee de alumnos ACTIVOS del centro. Los alumnos inactivos
  // (active=false) quedan fuera para que no inflen los ingresos esperados.
  // Decimal | null → number en el service mediante .toNumber() (allí).
  sumStudentMonthlyFees(organizationId: string, centerId: string) {
    return prisma.student.aggregate({
      where: {
        organizationId,
        centerId,
        active: true,
        monthlyFee: { not: null },
      },
      _sum: { monthlyFee: true },
    });
  },

  // Sesiones completadas del mes por (centerId opcional). Para el cálculo de
  // salarios necesitamos: por profesor, suma de durationMinutes de sesiones
  // en estado != cancelled del periodo.
  listMonthSessionsForPayroll(
    organizationId: string,
    centerId: string | undefined,
    monthStart: Date,
    monthEnd: Date,
  ) {
    return prisma.session.findMany({
      where: {
        organizationId,
        ...(centerId && { centerId }),
        date: { gte: monthStart, lt: monthEnd },
        status: { not: 'cancelled' },
      },
      select: {
        id: true,
        teacherId: true,
        centerId: true,
        durationMinutes: true,
      },
    });
  },

  // Devuelve los teachers de la org (filtrado opcional por centro) para
  // mapear hourlyRate y nombre al construir los `salaries` del summary.
  listTeachersForOrg(organizationId: string, centerId?: string) {
    return prisma.teacher.findMany({
      where: {
        organizationId,
        ...(centerId && { centerId }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        hourlyRate: true,
        centerId: true,
      },
    });
  },
};
