import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Accounting (Contabilidad) — Solo-admin.
// Modelo simple: ingresos − gastos = beneficio. La separación "efectivo" vs
// "bancario" se hace filtrando por paymentMethod en cliente. No hay
// distinción A/REAL en el modelo (decisión cerrada con el usuario).
// ─────────────────────────────────────────────────────────────────────────────

// Formato "YYYY-MM" estricto. Validado en frontera; usado en periodMonth de
// Expense/Income y como parámetro del summary mensual.
export const PeriodMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'periodMonth debe ser YYYY-MM');
export type PeriodMonth = z.infer<typeof PeriodMonthSchema>;

export const ExpensePaymentMethodSchema = z.enum(['sepa', 'transfer', 'cash', 'other']);
export type ExpensePaymentMethod = z.infer<typeof ExpensePaymentMethodSchema>;

export const ExpenseOriginTypeSchema = z.enum(['manual', 'template_gen', 'salary_auto']);
export type ExpenseOriginType = z.infer<typeof ExpenseOriginTypeSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// ExpenseCategory
// ─────────────────────────────────────────────────────────────────────────────

const slugLikeRegex = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

export const ExpenseCategoryCreateSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().regex(slugLikeRegex, 'Slug inválido').max(80),
  isSalary: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  active: z.boolean().default(true),
});
export type ExpenseCategoryCreate = z.infer<typeof ExpenseCategoryCreateSchema>;

export const ExpenseCategoryUpdateSchema = ExpenseCategoryCreateSchema.partial();
export type ExpenseCategoryUpdate = z.infer<typeof ExpenseCategoryUpdateSchema>;

export const ExpenseCategoryDtoSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  isSalary: z.boolean(),
  sortOrder: z.number().int(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ExpenseCategoryDto = z.infer<typeof ExpenseCategoryDtoSchema>;

export const ExpenseCategoryFiltersSchema = z.object({
  active: z.coerce.boolean().optional(),
  isSalary: z.coerce.boolean().optional(),
});
export type ExpenseCategoryFilters = z.infer<typeof ExpenseCategoryFiltersSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// ExpenseTemplate
// ─────────────────────────────────────────────────────────────────────────────

export const ExpenseTemplateCreateSchema = z.object({
  centerId: z.string().uuid(),
  categoryId: z.string().uuid(),
  defaultAmount: z.number().nonnegative().max(99999999),
  chargeDayOfMonth: z.number().int().min(1).max(31).optional(),
  description: z.string().max(240).optional(),
  paymentMethod: ExpensePaymentMethodSchema.default('sepa'),
  active: z.boolean().default(true),
});
export type ExpenseTemplateCreate = z.infer<typeof ExpenseTemplateCreateSchema>;

export const ExpenseTemplateUpdateSchema = ExpenseTemplateCreateSchema.partial();
export type ExpenseTemplateUpdate = z.infer<typeof ExpenseTemplateUpdateSchema>;

export const ExpenseTemplateDtoSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  centerId: z.string().uuid(),
  categoryId: z.string().uuid(),
  defaultAmount: z.number(),
  chargeDayOfMonth: z.number().int().optional(),
  description: z.string().optional(),
  paymentMethod: ExpensePaymentMethodSchema,
  active: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ExpenseTemplateDto = z.infer<typeof ExpenseTemplateDtoSchema>;

export const ExpenseTemplateFiltersSchema = z.object({
  centerId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  active: z.coerce.boolean().optional(),
});
export type ExpenseTemplateFilters = z.infer<typeof ExpenseTemplateFiltersSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Expense
// ─────────────────────────────────────────────────────────────────────────────

export const ExpenseCreateSchema = z.object({
  centerId: z.string().uuid(),
  categoryId: z.string().uuid(),
  // teacherId solo válido si la categoría es de tipo salary; el service valida.
  teacherId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  periodMonth: PeriodMonthSchema,
  amount: z.number().nonnegative().max(99999999),
  paymentMethod: ExpensePaymentMethodSchema.default('sepa'),
  // originType solo admite 'manual' en POST público; los demás los pone el
  // backend al generar mes. El service rechaza explicitamente los otros.
  originType: ExpenseOriginTypeSchema.default('manual'),
  paidAt: z.string().date().optional(),
  notes: z.string().max(2000).optional(),
});
export type ExpenseCreate = z.infer<typeof ExpenseCreateSchema>;

export const ExpenseUpdateSchema = z
  .object({
    centerId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    teacherId: z.string().uuid().nullable().optional(),
    periodMonth: PeriodMonthSchema.optional(),
    amount: z.number().nonnegative().max(99999999).optional(),
    paymentMethod: ExpensePaymentMethodSchema.optional(),
    paidAt: z.string().date().nullable().optional(),
    active: z.boolean().optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .strict();
export type ExpenseUpdate = z.infer<typeof ExpenseUpdateSchema>;

export const ExpenseDtoSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  centerId: z.string().uuid(),
  categoryId: z.string().uuid(),
  templateId: z.string().uuid().nullable(),
  teacherId: z.string().uuid().nullable(),
  periodMonth: PeriodMonthSchema,
  amount: z.number(),
  paymentMethod: ExpensePaymentMethodSchema,
  originType: ExpenseOriginTypeSchema,
  paidAt: z.string().date().nullable(),
  active: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ExpenseDto = z.infer<typeof ExpenseDtoSchema>;

export const ExpenseFiltersSchema = z.object({
  centerId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
  periodMonth: PeriodMonthSchema.optional(),
  paymentMethod: ExpensePaymentMethodSchema.optional(),
  originType: ExpenseOriginTypeSchema.optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type ExpenseFilters = z.infer<typeof ExpenseFiltersSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Income
// ─────────────────────────────────────────────────────────────────────────────

export const IncomeCreateSchema = z.object({
  centerId: z.string().uuid(),
  periodMonth: PeriodMonthSchema,
  amount: z.number().nonnegative().max(99999999),
  paymentMethod: ExpensePaymentMethodSchema.default('cash'),
  source: z.string().min(1).max(120),
  receivedAt: z.string().date().optional(),
  notes: z.string().max(2000).optional(),
});
export type IncomeCreate = z.infer<typeof IncomeCreateSchema>;

export const IncomeUpdateSchema = z
  .object({
    centerId: z.string().uuid().optional(),
    periodMonth: PeriodMonthSchema.optional(),
    amount: z.number().nonnegative().max(99999999).optional(),
    paymentMethod: ExpensePaymentMethodSchema.optional(),
    source: z.string().min(1).max(120).optional(),
    receivedAt: z.string().date().nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
    active: z.boolean().optional(),
  })
  .strict();
export type IncomeUpdate = z.infer<typeof IncomeUpdateSchema>;

export const IncomeDtoSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  centerId: z.string().uuid(),
  periodMonth: PeriodMonthSchema,
  amount: z.number(),
  paymentMethod: ExpensePaymentMethodSchema,
  source: z.string(),
  receivedAt: z.string().date().nullable(),
  notes: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type IncomeDto = z.infer<typeof IncomeDtoSchema>;

export const IncomeFiltersSchema = z.object({
  centerId: z.string().uuid().optional(),
  periodMonth: PeriodMonthSchema.optional(),
  paymentMethod: ExpensePaymentMethodSchema.optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type IncomeFilters = z.infer<typeof IncomeFiltersSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// MonthlySummary — vista agregada que consume el frontend de Contabilidad.
//
// - `feesAuto` se calcula on-the-fly desde Student.monthlyFee de los alumnos
//   activos del centro (no persistido).
// - `salaries` materializa o referencia las nóminas autocalculadas: para
//   cada profesor con sesiones en el mes, devuelve horas trabajadas, tarifa,
//   importe computado y, si existe, el Expense ya generado (override / paid).
// - `byCategory` agrupa los Expense (incluidos los salary_auto) por categoría.
// - `totalByPaymentMethod` se calcula sumando los Expense / Income del mes.
// ─────────────────────────────────────────────────────────────────────────────

export const PaymentMethodBreakdownSchema = z.object({
  sepa: z.number(),
  transfer: z.number(),
  cash: z.number(),
  other: z.number(),
});
export type PaymentMethodBreakdown = z.infer<typeof PaymentMethodBreakdownSchema>;

export const MonthlySummaryFiltersSchema = z.object({
  // 'all' permite agregar todos los centros de la org en una única llamada.
  centerId: z.union([z.string().uuid(), z.literal('all')]).default('all'),
  month: PeriodMonthSchema,
});
export type MonthlySummaryFilters = z.infer<typeof MonthlySummaryFiltersSchema>;

export const MonthlySummarySalaryLineSchema = z.object({
  teacherId: z.string().uuid(),
  teacherFirstName: z.string(),
  teacherLastName: z.string(),
  hoursWorked: z.number(),
  hourlyRate: z.number().nullable(),
  computed: z.number(),
  // Si existe un Expense materializado (override manual o generado), aquí va
  // su importe — puede diferir de `computed`. paid indica si tiene paidAt.
  override: z.number().nullable(),
  paid: z.boolean(),
  expenseId: z.string().uuid().nullable(),
});
export type MonthlySummarySalaryLine = z.infer<typeof MonthlySummarySalaryLineSchema>;

export const MonthlySummaryCategoryGroupSchema = z.object({
  categoryId: z.string().uuid(),
  categoryName: z.string(),
  categorySlug: z.string(),
  isSalary: z.boolean(),
  items: z.array(ExpenseDtoSchema),
  subtotal: z.number(),
});
export type MonthlySummaryCategoryGroup = z.infer<typeof MonthlySummaryCategoryGroupSchema>;

export const MonthlySummaryCenterSchema = z.object({
  centerId: z.string().uuid(),
  centerName: z.string(),
  income: z.object({
    feesAuto: z.number(),
    activeStudents: z.number(),
    manualIncomes: z.array(IncomeDtoSchema),
    totalByPaymentMethod: PaymentMethodBreakdownSchema,
    total: z.number(),
  }),
  expenses: z.object({
    byCategory: z.array(MonthlySummaryCategoryGroupSchema),
    salaries: z.array(MonthlySummarySalaryLineSchema),
    totalByPaymentMethod: PaymentMethodBreakdownSchema,
    total: z.number(),
  }),
  profit: z.number(),
});
export type MonthlySummaryCenter = z.infer<typeof MonthlySummaryCenterSchema>;

export const MonthlySummaryDtoSchema = z.object({
  organizationId: z.string().uuid(),
  periodMonth: PeriodMonthSchema,
  centers: z.array(MonthlySummaryCenterSchema),
  grandTotalIncome: z.number(),
  grandTotalExpense: z.number(),
  grandTotalProfit: z.number(),
});
export type MonthlySummaryDto = z.infer<typeof MonthlySummaryDtoSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Generación mensual de Expense desde plantillas + nóminas autocalculadas.
// Idempotente: si ya existen Expense del mes con templateId o teacherId no
// se duplican. Devuelve resumen de qué se creó.
// ─────────────────────────────────────────────────────────────────────────────

export const GenerateMonthInputSchema = z.object({
  periodMonth: PeriodMonthSchema,
  // null/undefined => todas las academias de la org.
  centerId: z.string().uuid().optional(),
});
export type GenerateMonthInput = z.infer<typeof GenerateMonthInputSchema>;

export const GenerateMonthResultSchema = z.object({
  periodMonth: PeriodMonthSchema,
  centersProcessed: z.number().int(),
  templatesGenerated: z.number().int(),
  templatesSkipped: z.number().int(),
  salariesGenerated: z.number().int(),
  salariesSkipped: z.number().int(),
  // Avisos no-bloqueantes (p.ej. profesor sin hourlyRate, plantilla
  // sin categoría activa, etc.).
  warnings: z.array(z.string()),
});
export type GenerateMonthResult = z.infer<typeof GenerateMonthResultSchema>;
