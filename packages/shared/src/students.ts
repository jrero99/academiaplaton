import { z } from 'zod';
import { PaymentMethod } from './billing.js';

const phoneRegex = /^[+]?[0-9\s-]{7,20}$/;
const taxIdRegex = /^[A-Z0-9-]{5,20}$/i;

export const GuardianSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(120),
  relationship: z.enum(['mother', 'father', 'tutor', 'other']),
  phone: z.string().regex(phoneRegex),
  email: z.string().email().max(160).optional(),
});
export type Guardian = z.infer<typeof GuardianSchema>;

export const StudentCreateSchema = z.object({
  centerId: z.string().uuid(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(120),
  birthDate: z.string().date(),
  email: z.string().email().max(160).optional(),
  phone: z.string().regex(phoneRegex).optional(),
  address: z.string().max(240).optional(),
  notes: z.string().max(2000).optional(),
  // Cuota mensual en euros. Importe base que se factura cada mes al alumno.
  monthlyFee: z.number().nonnegative().max(99999).optional(),
  // Fiscalidad: datos para emitir factura. Pueden estar vacíos.
  taxId: z.string().regex(taxIdRegex).optional(),
  billingName: z.string().max(160).optional(),
  billingTaxId: z.string().regex(taxIdRegex).optional(),
  billingAddress: z.string().max(240).optional(),
  billingEmail: z.string().email().max(160).optional(),
  // Método de pago y mandato SEPA asociado.
  paymentMethod: PaymentMethod.default('cash'),
  sepaMandateId: z.string().uuid().optional(),
  guardians: z.array(GuardianSchema).max(4).default([]),
  groupId: z.string().uuid().optional(),
  fromLeadId: z.string().uuid().optional(),
});
export type StudentCreate = z.infer<typeof StudentCreateSchema>;

export const StudentUpdateSchema = StudentCreateSchema.partial();
export type StudentUpdate = z.infer<typeof StudentUpdateSchema>;

export const StudentDtoSchema = StudentCreateSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type StudentDto = z.infer<typeof StudentDtoSchema>;

export const StudentFiltersSchema = z.object({
  search: z.string().max(120).optional(),
  centerId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type StudentFilters = z.infer<typeof StudentFiltersSchema>;
