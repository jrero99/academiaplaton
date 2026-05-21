import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// SEPA — mandatos de adeudo directo
// ─────────────────────────────────────────────────────────────────────────────

const phoneRegex = /^[+]?[0-9\s-]{7,20}$/;

// IBAN sin espacios, formato genérico (validación básica; validación de
// dígitos de control se puede añadir más adelante con una util dedicada).
const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
const bicRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
const taxIdRegex = /^[A-Z0-9-]{5,20}$/i;

export const PaymentMethod = z.enum(['cash', 'sepa', 'bank_transfer', 'other']);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

export const SepaMandateType = z.enum(['core', 'b2b']);
export type SepaMandateType = z.infer<typeof SepaMandateType>;

export const SepaDebitType = z.enum(['recurrent', 'one_off']);
export type SepaDebitType = z.infer<typeof SepaDebitType>;

export const SepaMandateStatus = z.enum(['active', 'paused', 'revoked']);
export type SepaMandateStatus = z.infer<typeof SepaMandateStatus>;

export const SepaMandateCreateSchema = z.object({
  reference: z.string().min(1).max(35),
  holderName: z.string().min(1).max(160),
  holderTaxId: z.string().regex(taxIdRegex),
  holderAddress: z.string().max(240).optional(),
  holderEmail: z.string().email().max(160).optional(),
  holderPhone: z.string().regex(phoneRegex).optional(),
  iban: z.string().transform((s) => s.replace(/\s+/g, '').toUpperCase()).pipe(z.string().regex(ibanRegex)),
  bic: z.string().regex(bicRegex).optional(),
  mandateType: SepaMandateType.default('core'),
  debitType: SepaDebitType.default('recurrent'),
  status: SepaMandateStatus.default('active'),
  signedAt: z.string().date(),
  notes: z.string().max(2000).optional(),
});
export type SepaMandateCreate = z.infer<typeof SepaMandateCreateSchema>;

export const SepaMandateUpdateSchema = SepaMandateCreateSchema.partial();
export type SepaMandateUpdate = z.infer<typeof SepaMandateUpdateSchema>;

export const SepaMandateDtoSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  reference: z.string(),
  holderName: z.string(),
  holderTaxId: z.string(),
  holderAddress: z.string().optional(),
  holderEmail: z.string().optional(),
  holderPhone: z.string().optional(),
  iban: z.string(),
  bic: z.string().optional(),
  mandateType: SepaMandateType,
  debitType: SepaDebitType,
  status: SepaMandateStatus,
  signedAt: z.string().date(),
  revokedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  studentIds: z.array(z.string().uuid()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SepaMandateDto = z.infer<typeof SepaMandateDtoSchema>;

export const SepaMandateFiltersSchema = z.object({
  search: z.string().max(120).optional(),
  status: SepaMandateStatus.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
export type SepaMandateFilters = z.infer<typeof SepaMandateFiltersSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Invoices
// ─────────────────────────────────────────────────────────────────────────────

export const InvoiceStatus = z.enum(['pending', 'sent', 'paid', 'overdue', 'cancelled']);
export type InvoiceStatus = z.infer<typeof InvoiceStatus>;

export const InvoiceCreateSchema = z.object({
  studentId: z.string().uuid(),
  number: z.string().min(1).max(40),
  concept: z.string().min(1).max(160),
  amount: z.number().positive().max(999999),
  periodMonth: z.number().int().min(1).max(12),
  periodYear: z.number().int().min(2020).max(2100),
  dueDate: z.string().date(),
  // Fecha en que se envió el cobro al pagador. null/undefined = aún no enviado.
  issuedAt: z.string().datetime().optional(),
  status: InvoiceStatus.default('pending'),
  notes: z.string().max(500).optional(),
});
export type InvoiceCreate = z.infer<typeof InvoiceCreateSchema>;

export const InvoiceUpdateSchema = InvoiceCreateSchema.partial();
export type InvoiceUpdate = z.infer<typeof InvoiceUpdateSchema>;

export const InvoiceDtoSchema = InvoiceCreateSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type InvoiceDto = z.infer<typeof InvoiceDtoSchema>;

export const InvoiceFiltersSchema = z.object({
  search: z.string().max(120).optional(),
  studentId: z.string().uuid().optional(),
  status: InvoiceStatus.optional(),
  periodMonth: z.coerce.number().int().min(1).max(12).optional(),
  periodYear: z.coerce.number().int().min(2020).max(2100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type InvoiceFilters = z.infer<typeof InvoiceFiltersSchema>;
