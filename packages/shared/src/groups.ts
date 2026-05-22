import { z } from 'zod';
import { ClassTypeSchema } from './scheduling.js';

export const GroupCreateSchema = z.object({
  centerId: z.string().uuid(),
  teacherId: z.string().uuid(),
  name: z.string().min(1).max(120),
  subject: z.string().max(120).optional(),
  description: z.string().max(240).optional(),
  active: z.boolean().default(true),
  notes: z.string().max(2000).optional(),
  classType: ClassTypeSchema,
  capacityOverride: z.number().int().min(1).max(255).optional(),
  studentIds: z.array(z.string().uuid()).max(100).default([]),
});
export type GroupCreate = z.infer<typeof GroupCreateSchema>;

export const GroupUpdateSchema = GroupCreateSchema.partial();
export type GroupUpdate = z.infer<typeof GroupUpdateSchema>;

export const GroupDtoSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  centerId: z.string().uuid(),
  teacherId: z.string().uuid(),
  name: z.string(),
  subject: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean(),
  notes: z.string().optional(),
  classType: ClassTypeSchema,
  capacityOverride: z.number().int().min(1).max(255).optional(),
  studentIds: z.array(z.string().uuid()),
  studentCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type GroupDto = z.infer<typeof GroupDtoSchema>;

export const GroupFiltersSchema = z.object({
  search: z.string().max(120).optional(),
  centerId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type GroupFilters = z.infer<typeof GroupFiltersSchema>;

export const GroupStudentAssignmentSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1).max(100),
});
export type GroupStudentAssignment = z.infer<typeof GroupStudentAssignmentSchema>;
