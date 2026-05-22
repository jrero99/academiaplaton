import { z } from 'zod';

export const ClassTypeSchema = z.enum(['PARTICULAR', 'SEMIPARTICULAR', 'GRUPAL']);
export type ClassType = z.infer<typeof ClassTypeSchema>;

export const SessionStatusSchema = z.enum(['scheduled', 'completed', 'cancelled']);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const TeacherRateCreateSchema = z.object({
  classType: ClassTypeSchema,
  ratePerHour: z.number().positive().max(9999),
  validFrom: z.string().date(),
});
export type TeacherRateCreate = z.infer<typeof TeacherRateCreateSchema>;

export const TeacherRateUpdateSchema = TeacherRateCreateSchema.partial();
export type TeacherRateUpdate = z.infer<typeof TeacherRateUpdateSchema>;

export const TeacherRateDtoSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  classType: ClassTypeSchema,
  ratePerHour: z.number(),
  validFrom: z.string().date(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TeacherRateDto = z.infer<typeof TeacherRateDtoSchema>;

export const TeacherMonthlyPayrollEntrySchema = z.object({
  teacherId: z.string().uuid(),
  teacherFirstName: z.string(),
  teacherLastName: z.string(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  completedSessions: z.number().int().min(0),
  totalHours: z.number(),
  totalAmount: z.number(),
  breakdown: z.array(
    z.object({
      sessionId: z.string().uuid(),
      date: z.string().date(),
      groupName: z.string(),
      classType: ClassTypeSchema,
      durationMinutes: z.number().int(),
      rateSnapshot: z.number(),
      subtotal: z.number(),
    }),
  ),
});
export type TeacherMonthlyPayrollEntry = z.infer<typeof TeacherMonthlyPayrollEntrySchema>;

export const TeacherMonthlyPayrollFiltersSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  teacherId: z.string().uuid().optional(),
  centerId: z.string().uuid().optional(),
});
export type TeacherMonthlyPayrollFilters = z.infer<typeof TeacherMonthlyPayrollFiltersSchema>;

export const SessionCancelSchema = z.object({
  reason: z.string().max(240).optional(),
});
export type SessionCancel = z.infer<typeof SessionCancelSchema>;
