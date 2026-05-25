import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Mock de Prisma. Cada `it` reconfigura el comportamiento de las funciones
// mockeadas según el escenario. Patrón idéntico al de `leads.service.test.ts`.
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
    center: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    student: {
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    teacher: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    session: {
      findMany: vi.fn(),
    },
    expense: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    expenseCategory: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    expenseTemplate: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    income: {
      findMany: vi.fn(),
    },
  },
}));

import {
  summaryService,
  monthGeneratorService,
} from './accounting.service.js';
import { prisma } from '../../lib/prisma.js';

// Decimal-like: el servicio llama `.toNumber()`. Evitamos depender de Prisma
// runtime (Decimal.js) en tests usando un faker compatible.
function dec(n: number) {
  return { toNumber: () => n } as unknown as { toNumber: () => number };
}

const ORG_A = '00000000-0000-0000-0000-00000000000a';
const ORG_B = '00000000-0000-0000-0000-00000000000b';
const CENTER_A1 = '00000000-0000-0000-0000-00000000a001';
const CENTER_B1 = '00000000-0000-0000-0000-00000000b001';

beforeEach(() => {
  vi.clearAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════════
// P0 #1 — Aislamiento multi-tenant en summaryService.monthly
// ═════════════════════════════════════════════════════════════════════════════

describe('summaryService.monthly — multi-tenant isolation', () => {
  it('should NEVER return centers/incomes/expenses from another organization', async () => {
    // ARRANGE — pedimos summary de ORG_A. Si el código filtrara mal por
    // organizationId, podríamos ver centros / ingresos / gastos de ORG_B.
    // Aquí verificamos:
    //   (a) cada query a Prisma se invoca con organizationId === ORG_A
    //   (b) el resultado solo contiene datos de ORG_A
    vi.mocked(prisma.center.findMany).mockResolvedValue([
      { id: CENTER_A1, name: 'Centro A', organizationId: ORG_A } as never,
    ]);
    vi.mocked(prisma.expenseCategory.findMany).mockResolvedValue([]);
    vi.mocked(prisma.teacher.findMany).mockResolvedValue([]);
    vi.mocked(prisma.session.findMany).mockResolvedValue([]);
    vi.mocked(prisma.student.count).mockResolvedValue(3);
    vi.mocked(prisma.student.aggregate).mockResolvedValue({
      _sum: { monthlyFee: dec(390) },
    } as never);
    vi.mocked(prisma.income.findMany).mockResolvedValue([]);
    vi.mocked(prisma.expense.findMany).mockResolvedValue([]);

    // ACT
    const result = await summaryService.monthly(ORG_A, {
      centerId: 'all',
      month: '2026-05',
    });

    // ASSERT — todas las queries scoping por org deben llevar organizationId=ORG_A.
    const centerArgs = vi.mocked(prisma.center.findMany).mock.calls[0]?.[0];
    expect((centerArgs as { where: { organizationId: string } }).where.organizationId).toBe(ORG_A);

    const categoriesArgs = vi.mocked(prisma.expenseCategory.findMany).mock.calls[0]?.[0];
    expect((categoriesArgs as { where: { organizationId: string } }).where.organizationId).toBe(ORG_A);

    const teachersArgs = vi.mocked(prisma.teacher.findMany).mock.calls[0]?.[0];
    expect((teachersArgs as { where: { organizationId: string } }).where.organizationId).toBe(ORG_A);

    const sessionsArgs = vi.mocked(prisma.session.findMany).mock.calls[0]?.[0];
    expect((sessionsArgs as { where: { organizationId: string } }).where.organizationId).toBe(ORG_A);

    const studentCountArgs = vi.mocked(prisma.student.count).mock.calls[0]?.[0];
    expect((studentCountArgs as { where: { organizationId: string } }).where.organizationId).toBe(ORG_A);

    const studentAggArgs = vi.mocked(prisma.student.aggregate).mock.calls[0]?.[0];
    expect((studentAggArgs as { where: { organizationId: string } }).where.organizationId).toBe(ORG_A);

    const incomeArgs = vi.mocked(prisma.income.findMany).mock.calls[0]?.[0];
    expect((incomeArgs as { where: { organizationId: string } }).where.organizationId).toBe(ORG_A);

    const expenseArgs = vi.mocked(prisma.expense.findMany).mock.calls[0]?.[0];
    expect((expenseArgs as { where: { organizationId: string } }).where.organizationId).toBe(ORG_A);

    // Y el DTO de salida solo refleja ORG_A
    expect(result.organizationId).toBe(ORG_A);
    expect(result.centers).toHaveLength(1);
    expect(result.centers[0]!.centerId).toBe(CENTER_A1);
    // El centro B1 NO aparece bajo ningún concepto
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(CENTER_B1);
    expect(serialized).not.toContain(ORG_B);
  });

  it('should return 404-equivalent when filtering by a center that does not belong to the org', async () => {
    // Pedimos un centro concreto. accountingQueriesRepo.findCenter aplica
    // `where: { id, organizationId }`; si el centro pertenece a otra org,
    // devuelve null → AppError.notFound('Center').
    vi.mocked(prisma.center.findFirst).mockResolvedValue(null);

    await expect(
      summaryService.monthly(ORG_A, {
        centerId: CENTER_B1, // centro de ORG_B
        month: '2026-05',
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// P0 #3 — Cálculo de profit
// ═════════════════════════════════════════════════════════════════════════════

describe('summaryService.monthly — profit computation', () => {
  function setupMinimalCenter(opts: {
    feesSum: number;
    activeStudents: number;
    manualIncomes: Array<{ amount: number; paymentMethod: 'sepa' | 'transfer' | 'cash' | 'other' }>;
    expenses: Array<{ amount: number; paymentMethod: 'sepa' | 'transfer' | 'cash' | 'other' }>;
  }) {
    vi.mocked(prisma.center.findMany).mockResolvedValue([
      { id: CENTER_A1, name: 'Centro A', organizationId: ORG_A } as never,
    ]);
    vi.mocked(prisma.expenseCategory.findMany).mockResolvedValue([
      {
        id: 'cat-gen',
        organizationId: ORG_A,
        name: 'General',
        slug: 'general',
        isSalary: false,
        sortOrder: 0,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never,
    ]);
    vi.mocked(prisma.teacher.findMany).mockResolvedValue([]);
    vi.mocked(prisma.session.findMany).mockResolvedValue([]);
    vi.mocked(prisma.student.count).mockResolvedValue(opts.activeStudents);
    vi.mocked(prisma.student.aggregate).mockResolvedValue({
      _sum: { monthlyFee: dec(opts.feesSum) },
    } as never);
    vi.mocked(prisma.income.findMany).mockResolvedValue(
      opts.manualIncomes.map((i, idx) => ({
        id: `inc-${idx}`,
        organizationId: ORG_A,
        centerId: CENTER_A1,
        periodMonth: '2026-05',
        amount: dec(i.amount),
        paymentMethod: i.paymentMethod,
        source: 'other',
        receivedAt: null,
        notes: null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as never,
    );
    vi.mocked(prisma.expense.findMany).mockResolvedValue(
      opts.expenses.map((e, idx) => ({
        id: `exp-${idx}`,
        organizationId: ORG_A,
        centerId: CENTER_A1,
        categoryId: 'cat-gen',
        templateId: null,
        teacherId: null,
        periodMonth: '2026-05',
        amount: dec(e.amount),
        paymentMethod: e.paymentMethod,
        originType: 'manual',
        paidAt: null,
        active: true,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as never,
    );
  }

  it('should compute profit = (feesAuto + manualIncomes) - expenses', async () => {
    // feesAuto=1200, manualIncomes=200, expenses=900 → profit=500
    setupMinimalCenter({
      feesSum: 1200,
      activeStudents: 10,
      manualIncomes: [{ amount: 200, paymentMethod: 'cash' }],
      expenses: [{ amount: 900, paymentMethod: 'transfer' }],
    });

    const result = await summaryService.monthly(ORG_A, {
      centerId: 'all',
      month: '2026-05',
    });

    expect(result.centers[0]!.income.feesAuto).toBe(1200);
    expect(result.centers[0]!.income.total).toBe(1400);
    expect(result.centers[0]!.expenses.total).toBe(900);
    expect(result.centers[0]!.profit).toBe(500);
    expect(result.grandTotalProfit).toBe(500);
  });

  it('should produce negative profit when only expenses exist', async () => {
    setupMinimalCenter({
      feesSum: 0,
      activeStudents: 0,
      manualIncomes: [],
      expenses: [{ amount: 300, paymentMethod: 'cash' }],
    });

    const result = await summaryService.monthly(ORG_A, {
      centerId: 'all',
      month: '2026-05',
    });

    expect(result.centers[0]!.profit).toBe(-300);
    expect(result.grandTotalProfit).toBe(-300);
  });

  it('should produce profit=0 when there is nothing at all', async () => {
    setupMinimalCenter({
      feesSum: 0,
      activeStudents: 0,
      manualIncomes: [],
      expenses: [],
    });

    const result = await summaryService.monthly(ORG_A, {
      centerId: 'all',
      month: '2026-05',
    });

    expect(result.centers[0]!.income.total).toBe(0);
    expect(result.centers[0]!.expenses.total).toBe(0);
    expect(result.centers[0]!.profit).toBe(0);
    expect(result.grandTotalProfit).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// P0 #4 — feesAuto filtra Student.active=true
// ═════════════════════════════════════════════════════════════════════════════

describe('summaryService.monthly — feesAuto active-only filter', () => {
  it('should aggregate ONLY active students (inactive ones never reach the service)', async () => {
    // Reproducimos la responsabilidad del repo: `sumStudentMonthlyFees` ya
    // filtra por active=true antes de devolver el aggregate. El test simula
    // ese contrato:
    //   - 5 activos × 130 = 650
    //   - 2 inactivos × 200 = 400 (NO incluidos en el aggregate)
    // Verificamos también que el `where` con el que se llama a Prisma
    // contenga `active: true` — defensa en profundidad contra regresiones.
    vi.mocked(prisma.center.findMany).mockResolvedValue([
      { id: CENTER_A1, name: 'Centro A', organizationId: ORG_A } as never,
    ]);
    vi.mocked(prisma.expenseCategory.findMany).mockResolvedValue([]);
    vi.mocked(prisma.teacher.findMany).mockResolvedValue([]);
    vi.mocked(prisma.session.findMany).mockResolvedValue([]);
    vi.mocked(prisma.income.findMany).mockResolvedValue([]);
    vi.mocked(prisma.expense.findMany).mockResolvedValue([]);
    vi.mocked(prisma.student.count).mockResolvedValue(5);
    vi.mocked(prisma.student.aggregate).mockResolvedValue({
      _sum: { monthlyFee: dec(650) }, // 5 × 130, los inactivos no suman
    } as never);

    const result = await summaryService.monthly(ORG_A, {
      centerId: 'all',
      month: '2026-05',
    });

    expect(result.centers[0]!.income.feesAuto).toBe(650);
    expect(result.centers[0]!.income.activeStudents).toBe(5);

    // Verifica que el repo aplica el filtro active=true en ambas queries.
    const countWhere = (
      vi.mocked(prisma.student.count).mock.calls[0]?.[0] as {
        where: { active?: boolean };
      }
    ).where;
    expect(countWhere.active).toBe(true);

    const aggWhere = (
      vi.mocked(prisma.student.aggregate).mock.calls[0]?.[0] as {
        where: { active?: boolean };
      }
    ).where;
    expect(aggWhere.active).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// P0 #5 — Salarios excluyen sesiones canceladas
// ═════════════════════════════════════════════════════════════════════════════

describe('summaryService.monthly — salary excludes cancelled sessions', () => {
  it('should compute hours from non-cancelled sessions only', async () => {
    // 4 sesiones scheduled × 90min = 360min = 6h
    // 2 sesiones cancelled NO se piden a Prisma (el repo filtra status!=cancelled).
    // hourlyRate=20 → computed = 6 × 20 = 120.
    const TEACHER_ID = '11111111-1111-1111-1111-111111111111';

    vi.mocked(prisma.center.findMany).mockResolvedValue([
      { id: CENTER_A1, name: 'Centro A', organizationId: ORG_A } as never,
    ]);
    vi.mocked(prisma.expenseCategory.findMany).mockResolvedValue([]);
    vi.mocked(prisma.teacher.findMany).mockResolvedValue([
      {
        id: TEACHER_ID,
        firstName: 'Anna',
        lastName: 'Profe',
        hourlyRate: dec(20),
        centerId: CENTER_A1,
      } as never,
    ]);
    vi.mocked(prisma.session.findMany).mockResolvedValue(
      // Sólo las 4 scheduled; las canceladas no aparecen porque el repo
      // ya las excluye con `status: { not: 'cancelled' }`.
      Array.from({ length: 4 }, (_v, i) => ({
        id: `s${i}`,
        teacherId: TEACHER_ID,
        centerId: CENTER_A1,
        durationMinutes: 90,
      })) as never,
    );
    vi.mocked(prisma.student.count).mockResolvedValue(0);
    vi.mocked(prisma.student.aggregate).mockResolvedValue({
      _sum: { monthlyFee: null },
    } as never);
    vi.mocked(prisma.income.findMany).mockResolvedValue([]);
    vi.mocked(prisma.expense.findMany).mockResolvedValue([]);

    const result = await summaryService.monthly(ORG_A, {
      centerId: 'all',
      month: '2026-05',
    });

    const salary = result.centers[0]!.expenses.salaries.find(
      (s) => s.teacherId === TEACHER_ID,
    );
    expect(salary).toBeDefined();
    expect(salary!.hoursWorked).toBe(6);
    expect(salary!.hourlyRate).toBe(20);
    expect(salary!.computed).toBe(120);

    // Defensa en profundidad: la query de sesiones debe filtrar `status != cancelled`.
    const sessionWhere = (
      vi.mocked(prisma.session.findMany).mock.calls[0]?.[0] as {
        where: { status?: { not?: string } };
      }
    ).where;
    expect(sessionWhere.status).toEqual({ not: 'cancelled' });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// P0 #6 — Idempotencia de generate-month
// ═════════════════════════════════════════════════════════════════════════════

describe('monthGeneratorService.generate — idempotency', () => {
  it('should NOT generate duplicates on a second call with same {periodMonth, centerId}', async () => {
    // Escenario: 1 template activa + 1 teacher con sesiones del mes.
    // Primera llamada: crea Expense template_gen + Expense salary_auto.
    // Segunda llamada: ambos findExisting* devuelven el Expense previo
    //   → skip y NO se llama a prisma.expense.create.

    const TEMPLATE_ID = '22222222-2222-2222-2222-222222222222';
    const TEACHER_ID = '33333333-3333-3333-3333-333333333333';
    const CATEGORY_ID = '44444444-4444-4444-4444-444444444444';
    const SALARY_CAT_ID = '55555555-5555-5555-5555-555555555555';

    // generate() con centerId concreto usa findCenter (= prisma.center.findFirst)
    // para validar que pertenece a la org; tiene que devolver el centro.
    vi.mocked(prisma.center.findFirst).mockResolvedValue({
      id: CENTER_A1,
      name: 'Centro A',
      organizationId: ORG_A,
    } as never);
    vi.mocked(prisma.expenseTemplate.findMany).mockResolvedValue([
      {
        id: TEMPLATE_ID,
        organizationId: ORG_A,
        centerId: CENTER_A1,
        categoryId: CATEGORY_ID,
        defaultAmount: dec(100),
        chargeDayOfMonth: 10,
        description: 'Alquiler',
        paymentMethod: 'transfer',
        active: true,
      } as never,
    ]);
    vi.mocked(prisma.session.findMany).mockResolvedValue([
      {
        id: 's1',
        teacherId: TEACHER_ID,
        centerId: CENTER_A1,
        durationMinutes: 120, // 2h
      } as never,
    ]);
    vi.mocked(prisma.teacher.findMany).mockResolvedValue([
      {
        id: TEACHER_ID,
        firstName: 'Bea',
        lastName: 'Profe',
        hourlyRate: dec(20),
        centerId: CENTER_A1,
      } as never,
    ]);
    vi.mocked(prisma.expenseCategory.findFirst).mockResolvedValue({
      id: SALARY_CAT_ID,
      organizationId: ORG_A,
      isSalary: true,
      slug: 'salaries',
      active: true,
    } as never);

    // 1ª llamada: nada existe → create x2 (template + salary)
    vi.mocked(prisma.expense.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.expense.create).mockResolvedValue({} as never);

    const first = await monthGeneratorService.generate(ORG_A, {
      periodMonth: '2026-05',
      centerId: CENTER_A1,
    });

    expect(first.templatesGenerated).toBe(1);
    expect(first.salariesGenerated).toBe(1);
    expect(vi.mocked(prisma.expense.create)).toHaveBeenCalledTimes(2);

    // 2ª llamada: el generador encuentra los Expense previos vía
    // findExistingTemplateGen / findExistingSalaryAuto → skip.
    vi.clearAllMocks();
    vi.mocked(prisma.center.findFirst).mockResolvedValue({
      id: CENTER_A1,
      name: 'Centro A',
      organizationId: ORG_A,
    } as never);
    vi.mocked(prisma.expenseTemplate.findMany).mockResolvedValue([
      {
        id: TEMPLATE_ID,
        organizationId: ORG_A,
        centerId: CENTER_A1,
        categoryId: CATEGORY_ID,
        defaultAmount: dec(100),
        chargeDayOfMonth: 10,
        description: 'Alquiler',
        paymentMethod: 'transfer',
        active: true,
      } as never,
    ]);
    vi.mocked(prisma.session.findMany).mockResolvedValue([
      {
        id: 's1',
        teacherId: TEACHER_ID,
        centerId: CENTER_A1,
        durationMinutes: 120,
      } as never,
    ]);
    vi.mocked(prisma.teacher.findMany).mockResolvedValue([
      {
        id: TEACHER_ID,
        firstName: 'Bea',
        lastName: 'Profe',
        hourlyRate: dec(20),
        centerId: CENTER_A1,
      } as never,
    ]);
    vi.mocked(prisma.expenseCategory.findFirst).mockResolvedValue({
      id: SALARY_CAT_ID,
      organizationId: ORG_A,
      isSalary: true,
      slug: 'salaries',
      active: true,
    } as never);
    // AHORA findFirst devuelve un Expense pre-existente para ambos casos.
    vi.mocked(prisma.expense.findFirst).mockResolvedValue({
      id: 'pre-existing',
    } as never);

    const second = await monthGeneratorService.generate(ORG_A, {
      periodMonth: '2026-05',
      centerId: CENTER_A1,
    });

    expect(second.templatesGenerated).toBe(0);
    expect(second.salariesGenerated).toBe(0);
    expect(second.templatesSkipped).toBe(1);
    expect(second.salariesSkipped).toBe(1);
    // Y ningún Expense nuevo se creó.
    expect(vi.mocked(prisma.expense.create)).not.toHaveBeenCalled();
  });
});
