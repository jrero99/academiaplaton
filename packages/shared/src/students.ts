import { z } from 'zod';

const phoneRegex = /^[+]?[0-9\s-]{7,20}$/;

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
