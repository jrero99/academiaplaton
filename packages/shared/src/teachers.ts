import { z } from 'zod';

const phoneRegex = /^[+]?[0-9\s-]{7,20}$/;

export const TeacherCreateSchema = z.object({
  centerId: z.string().uuid(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(120),
  email: z.string().email().max(160),
  phone: z.string().regex(phoneRegex).optional(),
  active: z.boolean().default(true),
  notes: z.string().max(2000).optional(),
});
export type TeacherCreate = z.infer<typeof TeacherCreateSchema>;

export const TeacherUpdateSchema = TeacherCreateSchema.partial();
export type TeacherUpdate = z.infer<typeof TeacherUpdateSchema>;

export const TeacherDtoSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  centerId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  active: z.boolean(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TeacherDto = z.infer<typeof TeacherDtoSchema>;

export const TeacherFiltersSchema = z.object({
  search: z.string().max(120).optional(),
  centerId: z.string().uuid().optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type TeacherFilters = z.infer<typeof TeacherFiltersSchema>;
