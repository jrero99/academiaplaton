// Mock store de Contabilidad. Todo en memoria, sin backend.
// Patrón useSyncExternalStore: cada hook se suscribe y re-renderiza cuando
// el snapshot cambia. Mutaciones síncronas — no hay await.
//
// Cuando se quiera volver a cablear contra el backend, basta con sustituir
// las funciones mutadoras y `buildSummary` por llamadas axios; las firmas
// de los hooks no cambian.

import type {
  ExpenseCategoryCreate,
  ExpenseCategoryDto,
  ExpenseCategoryFilters,
  ExpenseCategoryUpdate,
  ExpenseCreate,
  ExpenseDto,
  ExpenseFilters,
  ExpensePaymentMethod,
  ExpenseTemplateCreate,
  ExpenseTemplateDto,
  ExpenseTemplateFilters,
  ExpenseTemplateUpdate,
  ExpenseUpdate,
  GenerateMonthInput,
  GenerateMonthResult,
  IncomeCreate,
  IncomeDto,
  IncomeFilters,
  IncomeUpdate,
  MonthlySummaryCenter,
  MonthlySummaryDto,
  PaymentMethodBreakdown,
  PeriodMonth,
} from '@academiaplaton/shared';

import {
  CENTER_PLATON_MOLINOS,
  CENTER_PLATON_TERESAS,
  MOCK_CENTERS,
} from '@/features/centers/data/mock-centers';

const ORG_ID = '00000000-0000-0000-0000-000000000001';
const NOW = '2026-05-01T00:00:00.000Z';

// ────────────────────────────────────────────────────────────────────────────
// Datos seed (mismo contenido que apps/backend/prisma/seed.ts)
// ────────────────────────────────────────────────────────────────────────────

// Categorías — IDs estables (aaaa…) para que las referencias seed cuadren.
const CAT_IDS = {
  lloguer:         'aaaaaaaa-aaaa-4aaa-8aaa-000000000001',
  autonoms:        'aaaaaaaa-aaaa-4aaa-8aaa-000000000002',
  nomines:         'aaaaaaaa-aaaa-4aaa-8aaa-000000000003',
  sSocial:         'aaaaaaaa-aaaa-4aaa-8aaa-000000000004',
  endesa:          'aaaaaaaa-aaaa-4aaa-8aaa-000000000005',
  aigues:          'aaaaaaaa-aaaa-4aaa-8aaa-000000000006',
  gestoria:        'aaaaaaaa-aaaa-4aaa-8aaa-000000000007',
  telefonia:       'aaaaaaaa-aaaa-4aaa-8aaa-000000000008',
  comisionRecibos: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000009',
  banco:           'aaaaaaaa-aaaa-4aaa-8aaa-00000000000a',
  material:        'aaaaaaaa-aaaa-4aaa-8aaa-00000000000b',
  otros:           'aaaaaaaa-aaaa-4aaa-8aaa-00000000000c',
} as const;

const SEED_CATEGORIES: ExpenseCategoryDto[] = [
  cat(CAT_IDS.lloguer,         'Lloguer',          'lloguer',          false, 10),
  cat(CAT_IDS.autonoms,        'Autònoms',         'autonoms',         false, 20),
  cat(CAT_IDS.nomines,         'Nómines',          'nomines',          true,  30),
  cat(CAT_IDS.sSocial,         'S.Social',         's-social',         false, 40),
  cat(CAT_IDS.endesa,          'Endesa',           'endesa',           false, 50),
  cat(CAT_IDS.aigues,          'Aigües',           'aigues',           false, 60),
  cat(CAT_IDS.gestoria,        'Gestoría',         'gestoria',         false, 70),
  cat(CAT_IDS.telefonia,       'Telefonía',        'telefonia',        false, 80),
  cat(CAT_IDS.comisionRecibos, 'Comisión recibos', 'comision-recibos', false, 90),
  cat(CAT_IDS.banco,           'Banco',            'banco',            false, 100),
  cat(CAT_IDS.material,        'Material',         'material',         false, 110),
  cat(CAT_IDS.otros,           'Otros',            'otros',            false, 120),
];

function cat(
  id: string, name: string, slug: string, isSalary: boolean, sortOrder: number,
): ExpenseCategoryDto {
  return {
    id, organizationId: ORG_ID, name, slug, isSalary, sortOrder, active: true,
    createdAt: NOW, updatedAt: NOW,
  };
}

// Plantillas recurrentes con importes del PDF.
const SEED_TEMPLATES: ExpenseTemplateDto[] = [
  tmpl('bbbbbbbb-bbbb-4bbb-8bbb-000000000001', CENTER_PLATON_TERESAS, CAT_IDS.lloguer,   803.62),
  tmpl('bbbbbbbb-bbbb-4bbb-8bbb-000000000002', CENTER_PLATON_MOLINOS, CAT_IDS.lloguer,  1047.62),
  tmpl('bbbbbbbb-bbbb-4bbb-8bbb-000000000003', CENTER_PLATON_TERESAS, CAT_IDS.autonoms,  194.10),
  tmpl('bbbbbbbb-bbbb-4bbb-8bbb-000000000004', CENTER_PLATON_MOLINOS, CAT_IDS.autonoms,  194.10),
  tmpl('bbbbbbbb-bbbb-4bbb-8bbb-000000000005', CENTER_PLATON_TERESAS, CAT_IDS.sSocial,   338.48),
  tmpl('bbbbbbbb-bbbb-4bbb-8bbb-000000000006', CENTER_PLATON_MOLINOS, CAT_IDS.sSocial,   338.48),
  tmpl('bbbbbbbb-bbbb-4bbb-8bbb-000000000007', CENTER_PLATON_TERESAS, CAT_IDS.endesa,     96.45),
  tmpl('bbbbbbbb-bbbb-4bbb-8bbb-000000000008', CENTER_PLATON_MOLINOS, CAT_IDS.endesa,     54.22),
  tmpl('bbbbbbbb-bbbb-4bbb-8bbb-000000000009', CENTER_PLATON_TERESAS, CAT_IDS.aigues,    111.53),
  tmpl('bbbbbbbb-bbbb-4bbb-8bbb-00000000000a', CENTER_PLATON_TERESAS, CAT_IDS.gestoria,  139.27),
  tmpl('bbbbbbbb-bbbb-4bbb-8bbb-00000000000b', CENTER_PLATON_MOLINOS, CAT_IDS.gestoria,  139.27),
  tmpl('bbbbbbbb-bbbb-4bbb-8bbb-00000000000c', CENTER_PLATON_TERESAS, CAT_IDS.telefonia,  22.99),
  tmpl('bbbbbbbb-bbbb-4bbb-8bbb-00000000000d', CENTER_PLATON_MOLINOS, CAT_IDS.telefonia,  31.99),
  tmpl('bbbbbbbb-bbbb-4bbb-8bbb-00000000000e', CENTER_PLATON_TERESAS, CAT_IDS.banco,      78.50),
  tmpl('bbbbbbbb-bbbb-4bbb-8bbb-00000000000f', CENTER_PLATON_MOLINOS, CAT_IDS.banco,      78.50),
];

function tmpl(
  id: string, centerId: string, categoryId: string, defaultAmount: number,
): ExpenseTemplateDto {
  return {
    id, organizationId: ORG_ID, centerId, categoryId, defaultAmount,
    paymentMethod: 'sepa', active: true, createdAt: NOW, updatedAt: NOW,
  };
}

// Gastos reales del PDF de abril 2026. Manual para que el resumen cuadre
// visualmente sin tener que ejecutar generateMonth.
const PDF_PERIOD: PeriodMonth = '2026-04';

const SEED_EXPENSES: ExpenseDto[] = [
  exp('cccccccc-cccc-4ccc-8ccc-000000000001', CENTER_PLATON_TERESAS, CAT_IDS.lloguer,   803.62),
  exp('cccccccc-cccc-4ccc-8ccc-000000000002', CENTER_PLATON_MOLINOS, CAT_IDS.lloguer,  1047.62),
  exp('cccccccc-cccc-4ccc-8ccc-000000000003', CENTER_PLATON_TERESAS, CAT_IDS.autonoms,  194.10),
  exp('cccccccc-cccc-4ccc-8ccc-000000000004', CENTER_PLATON_MOLINOS, CAT_IDS.autonoms,  194.10),
  exp('cccccccc-cccc-4ccc-8ccc-000000000005', CENTER_PLATON_TERESAS, CAT_IDS.nomines,   973.57),
  exp('cccccccc-cccc-4ccc-8ccc-000000000006', CENTER_PLATON_MOLINOS, CAT_IDS.nomines,   663.91),
  exp('cccccccc-cccc-4ccc-8ccc-000000000007', CENTER_PLATON_TERESAS, CAT_IDS.sSocial,   338.48),
  exp('cccccccc-cccc-4ccc-8ccc-000000000008', CENTER_PLATON_MOLINOS, CAT_IDS.sSocial,   338.48),
  exp('cccccccc-cccc-4ccc-8ccc-000000000009', CENTER_PLATON_TERESAS, CAT_IDS.endesa,     96.45),
  exp('cccccccc-cccc-4ccc-8ccc-00000000000a', CENTER_PLATON_MOLINOS, CAT_IDS.endesa,     54.22),
  exp('cccccccc-cccc-4ccc-8ccc-00000000000b', CENTER_PLATON_TERESAS, CAT_IDS.aigues,    111.53),
  exp('cccccccc-cccc-4ccc-8ccc-00000000000c', CENTER_PLATON_TERESAS, CAT_IDS.gestoria,  139.27),
  exp('cccccccc-cccc-4ccc-8ccc-00000000000d', CENTER_PLATON_MOLINOS, CAT_IDS.gestoria,  139.27),
  exp('cccccccc-cccc-4ccc-8ccc-00000000000e', CENTER_PLATON_TERESAS, CAT_IDS.telefonia,  22.99),
  exp('cccccccc-cccc-4ccc-8ccc-00000000000f', CENTER_PLATON_MOLINOS, CAT_IDS.telefonia,  31.99),
  exp('cccccccc-cccc-4ccc-8ccc-000000000010', CENTER_PLATON_TERESAS, CAT_IDS.banco,      78.50),
  exp('cccccccc-cccc-4ccc-8ccc-000000000011', CENTER_PLATON_MOLINOS, CAT_IDS.banco,      78.50),
  exp('cccccccc-cccc-4ccc-8ccc-000000000012', CENTER_PLATON_MOLINOS, CAT_IDS.material,   39.89),
  exp('cccccccc-cccc-4ccc-8ccc-000000000013', CENTER_PLATON_TERESAS, CAT_IDS.otros,     365.00),
  exp('cccccccc-cccc-4ccc-8ccc-000000000014', CENTER_PLATON_MOLINOS, CAT_IDS.otros,     365.00),
];

function exp(
  id: string, centerId: string, categoryId: string, amount: number,
): ExpenseDto {
  return {
    id, organizationId: ORG_ID, centerId, categoryId,
    templateId: null, teacherId: null,
    periodMonth: PDF_PERIOD, amount, paymentMethod: 'sepa', originType: 'manual',
    paidAt: null, active: true, notes: null,
    createdAt: NOW, updatedAt: NOW,
  };
}

// Ingresos manuales del PDF (rebuts + efectivo en Teresas; total en Molinos).
const SEED_INCOMES: IncomeDto[] = [
  inc('dddddddd-dddd-4ddd-8ddd-000000000001', CENTER_PLATON_TERESAS, 6210.00, 'sepa', 'Rebuts abril'),
  inc('dddddddd-dddd-4ddd-8ddd-000000000002', CENTER_PLATON_TERESAS, 4250.00, 'cash', 'Efectivo abril'),
  inc('dddddddd-dddd-4ddd-8ddd-000000000003', CENTER_PLATON_MOLINOS, 8850.00, 'sepa', 'Ingresos abril (mixto)'),
];

function inc(
  id: string, centerId: string, amount: number,
  paymentMethod: ExpensePaymentMethod, source: string,
): IncomeDto {
  return {
    id, organizationId: ORG_ID, centerId,
    periodMonth: PDF_PERIOD, amount, paymentMethod, source,
    receivedAt: null, active: true, notes: null,
    createdAt: NOW, updatedAt: NOW,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Store con pub/sub para useSyncExternalStore
// ────────────────────────────────────────────────────────────────────────────

interface AccountingState {
  categories: ExpenseCategoryDto[];
  templates: ExpenseTemplateDto[];
  expenses: ExpenseDto[];
  incomes: IncomeDto[];
}

let state: AccountingState = {
  categories: [...SEED_CATEGORIES],
  templates: [...SEED_TEMPLATES],
  expenses: [...SEED_EXPENSES],
  incomes: [...SEED_INCOMES],
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

function setState(updater: (prev: AccountingState) => AccountingState) {
  state = updater(state);
  notify();
}

export function subscribeAccounting(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getAccountingSnapshot(): AccountingState {
  return state;
}

function nowIso(): string {
  return new Date().toISOString();
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback (no debería hacer falta en navegadores modernos)
  return `xxxxxxxx-xxxx-4xxx-8xxx-${Date.now().toString(16).padStart(12, '0')}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Mutadores — Categories
// ────────────────────────────────────────────────────────────────────────────

export function listCategories(filters?: ExpenseCategoryFilters): ExpenseCategoryDto[] {
  let out = state.categories;
  if (filters?.active !== undefined) out = out.filter((c) => c.active === filters.active);
  if (filters?.isSalary !== undefined) out = out.filter((c) => c.isSalary === filters.isSalary);
  return [...out].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function createCategory(input: ExpenseCategoryCreate): ExpenseCategoryDto {
  if (state.categories.some((c) => c.slug === input.slug)) {
    throw new Error(`Ya existe una categoría con slug "${input.slug}"`);
  }
  if (input.isSalary && state.categories.some((c) => c.isSalary)) {
    throw new Error('Ya existe otra categoría marcada como Nóminas; solo puede haber una.');
  }
  const created: ExpenseCategoryDto = {
    id: uid(), organizationId: ORG_ID,
    name: input.name, slug: input.slug,
    isSalary: input.isSalary ?? false,
    sortOrder: input.sortOrder ?? 0,
    active: input.active ?? true,
    createdAt: nowIso(), updatedAt: nowIso(),
  };
  setState((s) => ({ ...s, categories: [...s.categories, created] }));
  return created;
}

export function updateCategory(id: string, input: ExpenseCategoryUpdate): ExpenseCategoryDto {
  const existing = state.categories.find((c) => c.id === id);
  if (!existing) throw new Error('Categoría no encontrada');
  if (input.slug && input.slug !== existing.slug
      && state.categories.some((c) => c.id !== id && c.slug === input.slug)) {
    throw new Error(`Ya existe una categoría con slug "${input.slug}"`);
  }
  if (input.isSalary && !existing.isSalary
      && state.categories.some((c) => c.id !== id && c.isSalary)) {
    throw new Error('Ya existe otra categoría marcada como Nóminas; solo puede haber una.');
  }
  const updated: ExpenseCategoryDto = {
    ...existing,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.slug !== undefined && { slug: input.slug }),
    ...(input.isSalary !== undefined && { isSalary: input.isSalary }),
    ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
    ...(input.active !== undefined && { active: input.active }),
    updatedAt: nowIso(),
  };
  setState((s) => ({
    ...s, categories: s.categories.map((c) => (c.id === id ? updated : c)),
  }));
  return updated;
}

export function deleteCategory(id: string): void {
  const inUse = state.expenses.some((e) => e.categoryId === id)
    || state.templates.some((t) => t.categoryId === id);
  if (inUse) {
    throw new Error('No se puede borrar una categoría con plantillas o gastos asociados.');
  }
  setState((s) => ({ ...s, categories: s.categories.filter((c) => c.id !== id) }));
}

// ────────────────────────────────────────────────────────────────────────────
// Mutadores — Templates
// ────────────────────────────────────────────────────────────────────────────

export function listTemplates(filters?: ExpenseTemplateFilters): ExpenseTemplateDto[] {
  let out = state.templates;
  if (filters?.centerId) out = out.filter((t) => t.centerId === filters.centerId);
  if (filters?.categoryId) out = out.filter((t) => t.categoryId === filters.categoryId);
  if (filters?.active !== undefined) out = out.filter((t) => t.active === filters.active);
  return [...out];
}

export function createTemplate(input: ExpenseTemplateCreate): ExpenseTemplateDto {
  const created: ExpenseTemplateDto = {
    id: uid(), organizationId: ORG_ID,
    centerId: input.centerId, categoryId: input.categoryId,
    defaultAmount: input.defaultAmount,
    chargeDayOfMonth: input.chargeDayOfMonth,
    description: input.description,
    paymentMethod: input.paymentMethod ?? 'sepa',
    active: input.active ?? true,
    createdAt: nowIso(), updatedAt: nowIso(),
  };
  setState((s) => ({ ...s, templates: [...s.templates, created] }));
  return created;
}

export function updateTemplate(id: string, input: ExpenseTemplateUpdate): ExpenseTemplateDto {
  const existing = state.templates.find((t) => t.id === id);
  if (!existing) throw new Error('Plantilla no encontrada');
  const updated: ExpenseTemplateDto = { ...existing, ...input, updatedAt: nowIso() };
  setState((s) => ({
    ...s, templates: s.templates.map((t) => (t.id === id ? updated : t)),
  }));
  return updated;
}

export function deleteTemplate(id: string): void {
  setState((s) => ({ ...s, templates: s.templates.filter((t) => t.id !== id) }));
}

// ────────────────────────────────────────────────────────────────────────────
// Mutadores — Expenses
// ────────────────────────────────────────────────────────────────────────────

export function listExpenses(filters?: ExpenseFilters): ExpenseDto[] {
  let out = state.expenses;
  if (filters?.centerId) out = out.filter((e) => e.centerId === filters.centerId);
  if (filters?.categoryId) out = out.filter((e) => e.categoryId === filters.categoryId);
  if (filters?.teacherId) out = out.filter((e) => e.teacherId === filters.teacherId);
  if (filters?.periodMonth) out = out.filter((e) => e.periodMonth === filters.periodMonth);
  if (filters?.paymentMethod) out = out.filter((e) => e.paymentMethod === filters.paymentMethod);
  if (filters?.originType) out = out.filter((e) => e.originType === filters.originType);
  if (filters?.active !== undefined) out = out.filter((e) => e.active === filters.active);
  return [...out];
}

export function createExpense(input: ExpenseCreate): ExpenseDto {
  const created: ExpenseDto = {
    id: uid(), organizationId: ORG_ID,
    centerId: input.centerId, categoryId: input.categoryId,
    templateId: input.templateId ?? null,
    teacherId: input.teacherId ?? null,
    periodMonth: input.periodMonth,
    amount: input.amount,
    paymentMethod: input.paymentMethod ?? 'sepa',
    originType: input.originType ?? 'manual',
    paidAt: input.paidAt ?? null,
    active: true,
    notes: input.notes ?? null,
    createdAt: nowIso(), updatedAt: nowIso(),
  };
  setState((s) => ({ ...s, expenses: [...s.expenses, created] }));
  return created;
}

export function updateExpense(id: string, input: ExpenseUpdate): ExpenseDto {
  const existing = state.expenses.find((e) => e.id === id);
  if (!existing) throw new Error('Gasto no encontrado');
  const updated: ExpenseDto = {
    ...existing,
    ...(input.centerId !== undefined && { centerId: input.centerId }),
    ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
    ...(input.teacherId !== undefined && { teacherId: input.teacherId }),
    ...(input.periodMonth !== undefined && { periodMonth: input.periodMonth }),
    ...(input.amount !== undefined && { amount: input.amount }),
    ...(input.paymentMethod !== undefined && { paymentMethod: input.paymentMethod }),
    ...(input.paidAt !== undefined && { paidAt: input.paidAt }),
    ...(input.active !== undefined && { active: input.active }),
    ...(input.notes !== undefined && { notes: input.notes }),
    updatedAt: nowIso(),
  };
  setState((s) => ({
    ...s, expenses: s.expenses.map((e) => (e.id === id ? updated : e)),
  }));
  return updated;
}

// Soft delete — coherente con el backend.
export function deleteExpense(id: string): void {
  setState((s) => ({
    ...s,
    expenses: s.expenses.map((e) => (e.id === id ? { ...e, active: false, updatedAt: nowIso() } : e)),
  }));
}

// ────────────────────────────────────────────────────────────────────────────
// Mutadores — Incomes
// ────────────────────────────────────────────────────────────────────────────

export function listIncomes(filters?: IncomeFilters): IncomeDto[] {
  let out = state.incomes;
  if (filters?.centerId) out = out.filter((i) => i.centerId === filters.centerId);
  if (filters?.periodMonth) out = out.filter((i) => i.periodMonth === filters.periodMonth);
  if (filters?.paymentMethod) out = out.filter((i) => i.paymentMethod === filters.paymentMethod);
  if (filters?.active !== undefined) out = out.filter((i) => i.active === filters.active);
  return [...out];
}

export function createIncome(input: IncomeCreate): IncomeDto {
  const created: IncomeDto = {
    id: uid(), organizationId: ORG_ID,
    centerId: input.centerId,
    periodMonth: input.periodMonth,
    amount: input.amount,
    paymentMethod: input.paymentMethod ?? 'cash',
    source: input.source,
    receivedAt: input.receivedAt ?? null,
    active: true,
    notes: input.notes ?? null,
    createdAt: nowIso(), updatedAt: nowIso(),
  };
  setState((s) => ({ ...s, incomes: [...s.incomes, created] }));
  return created;
}

export function updateIncome(id: string, input: IncomeUpdate): IncomeDto {
  const existing = state.incomes.find((i) => i.id === id);
  if (!existing) throw new Error('Ingreso no encontrado');
  const updated: IncomeDto = {
    ...existing,
    ...(input.centerId !== undefined && { centerId: input.centerId }),
    ...(input.periodMonth !== undefined && { periodMonth: input.periodMonth }),
    ...(input.amount !== undefined && { amount: input.amount }),
    ...(input.paymentMethod !== undefined && { paymentMethod: input.paymentMethod }),
    ...(input.source !== undefined && { source: input.source }),
    ...(input.receivedAt !== undefined && { receivedAt: input.receivedAt }),
    ...(input.active !== undefined && { active: input.active }),
    ...(input.notes !== undefined && { notes: input.notes }),
    updatedAt: nowIso(),
  };
  setState((s) => ({
    ...s, incomes: s.incomes.map((i) => (i.id === id ? updated : i)),
  }));
  return updated;
}

export function deleteIncome(id: string): void {
  setState((s) => ({
    ...s,
    incomes: s.incomes.map((i) => (i.id === id ? { ...i, active: false, updatedAt: nowIso() } : i)),
  }));
}

// ────────────────────────────────────────────────────────────────────────────
// Summary builder — recompone MonthlySummaryDto en memoria
// ────────────────────────────────────────────────────────────────────────────

function emptyBreakdown(): PaymentMethodBreakdown {
  return { sepa: 0, transfer: 0, cash: 0, other: 0 };
}

function addToBreakdown(b: PaymentMethodBreakdown, method: ExpensePaymentMethod, amount: number): void {
  b[method] += amount;
}

function buildCenter(centerId: string, periodMonth: PeriodMonth): MonthlySummaryCenter {
  const center = MOCK_CENTERS.find((c) => c.id === centerId);
  const expensesActive = state.expenses.filter(
    (e) => e.centerId === centerId && e.periodMonth === periodMonth && e.active,
  );
  const incomesActive = state.incomes.filter(
    (i) => i.centerId === centerId && i.periodMonth === periodMonth && i.active,
  );
  const categoriesSorted = [...state.categories].sort((a, b) => a.sortOrder - b.sortOrder);

  // Agrupar gastos por categoría (solo categorías que tienen gastos en el mes).
  const byCategory = categoriesSorted
    .map((cat) => {
      const items = expensesActive.filter((e) => e.categoryId === cat.id);
      const subtotal = items.reduce((sum, e) => sum + e.amount, 0);
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        categorySlug: cat.slug,
        isSalary: cat.isSalary,
        items,
        subtotal,
      };
    })
    .filter((g) => g.items.length > 0);

  // Breakdown por método de pago.
  const incomeBreakdown = emptyBreakdown();
  for (const i of incomesActive) addToBreakdown(incomeBreakdown, i.paymentMethod, i.amount);

  const expenseBreakdown = emptyBreakdown();
  for (const e of expensesActive) addToBreakdown(expenseBreakdown, e.paymentMethod, e.amount);

  const incomeTotal = incomesActive.reduce((sum, i) => sum + i.amount, 0);
  const expenseTotal = expensesActive.reduce((sum, e) => sum + e.amount, 0);

  return {
    centerId,
    centerName: center?.name ?? 'Centro',
    income: {
      // Sin alumnos seed con monthlyFee → feesAuto y activeStudents quedan a 0.
      // Los rebuts del mes se han metido como Income manual (ver SEED_INCOMES).
      feesAuto: 0,
      activeStudents: 0,
      manualIncomes: incomesActive,
      totalByPaymentMethod: incomeBreakdown,
      total: incomeTotal,
    },
    expenses: {
      byCategory,
      // Sin sesiones / hourlyRate mock → no hay salarios autocalculados.
      salaries: [],
      totalByPaymentMethod: expenseBreakdown,
      total: expenseTotal,
    },
    profit: incomeTotal - expenseTotal,
  };
}

export function buildSummary(
  centerId: string | 'all', periodMonth: PeriodMonth,
): MonthlySummaryDto {
  const centerIds = centerId === 'all'
    ? MOCK_CENTERS.filter((c) => c.active).map((c) => c.id)
    : [centerId];

  const centers = centerIds.map((id) => buildCenter(id, periodMonth));
  const grandTotalIncome = centers.reduce((sum, c) => sum + c.income.total, 0);
  const grandTotalExpense = centers.reduce((sum, c) => sum + c.expenses.total, 0);

  return {
    organizationId: ORG_ID,
    periodMonth,
    centers,
    grandTotalIncome,
    grandTotalExpense,
    grandTotalProfit: grandTotalIncome - grandTotalExpense,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// generate-month — materializa Expense template_gen para el mes, idempotente
// ────────────────────────────────────────────────────────────────────────────

export function generateMonthMock(input: GenerateMonthInput): GenerateMonthResult {
  const { periodMonth, centerId } = input;
  const templatesScope = state.templates.filter(
    (t) => t.active && (!centerId || t.centerId === centerId),
  );

  let templatesGenerated = 0;
  let templatesSkipped = 0;
  const warnings: string[] = [];

  const newExpenses: ExpenseDto[] = [];
  for (const t of templatesScope) {
    const already = state.expenses.find(
      (e) => e.templateId === t.id && e.periodMonth === periodMonth && e.active,
    );
    if (already) {
      templatesSkipped++;
      continue;
    }
    newExpenses.push({
      id: uid(), organizationId: ORG_ID,
      centerId: t.centerId, categoryId: t.categoryId,
      templateId: t.id, teacherId: null,
      periodMonth, amount: t.defaultAmount,
      paymentMethod: t.paymentMethod, originType: 'template_gen',
      paidAt: null, active: true, notes: null,
      createdAt: nowIso(), updatedAt: nowIso(),
    });
    templatesGenerated++;
  }

  if (newExpenses.length > 0) {
    setState((s) => ({ ...s, expenses: [...s.expenses, ...newExpenses] }));
  }

  // Sin sesiones / hourlyRate mock — sin salarios autocalculados.
  warnings.push('Mock: sin sesiones de calendario, no se generan salarios automáticos.');

  const centersProcessed = centerId
    ? 1
    : new Set(templatesScope.map((t) => t.centerId)).size;

  return {
    periodMonth,
    centersProcessed,
    templatesGenerated,
    templatesSkipped,
    salariesGenerated: 0,
    salariesSkipped: 0,
    warnings,
  };
}
