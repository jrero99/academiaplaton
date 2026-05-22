import { z } from 'zod';
import { ClassTypeSchema, SessionStatusSchema } from './scheduling.js';

export const TimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (formato HH:mm)');

const TimeRangeRefinement = (data: { startTime: string; endTime: string }) =>
  data.startTime < data.endTime;

const TimeRangeError = {
  message: 'La hora de fin debe ser posterior a la de inicio',
  path: ['endTime'],
};

export const SessionCreateSchema = z
  .object({
    centerId: z.string().uuid(),
    groupId: z.string().uuid(),
    date: z.string().date(),
    startTime: TimeSchema,
    endTime: TimeSchema,
    notes: z.string().max(2000).optional(),
  })
  .refine(TimeRangeRefinement, TimeRangeError);
export type SessionCreate = z.infer<typeof SessionCreateSchema>;

// PATCH: en update todos los campos opcionales pero si vienen startTime+endTime juntos validamos rango
export const SessionUpdateSchema = z
  .object({
    centerId: z.string().uuid().optional(),
    groupId: z.string().uuid().optional(),
    date: z.string().date().optional(),
    startTime: TimeSchema.optional(),
    endTime: TimeSchema.optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine(
    (data) =>
      !(data.startTime && data.endTime) || data.startTime < data.endTime,
    TimeRangeError,
  );
export type SessionUpdate = z.infer<typeof SessionUpdateSchema>;

export const SessionDtoSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  centerId: z.string().uuid(),
  groupId: z.string().uuid(),
  teacherId: z.string().uuid(),
  date: z.string().date(),
  startTime: TimeSchema,
  endTime: TimeSchema,
  notes: z.string().optional(),
  classTypeSnapshot: ClassTypeSchema,
  rateSnapshot: z.number(),
  durationMinutes: z.number().int().min(1),
  status: SessionStatusSchema,
  cancelledAt: z.string().datetime().optional(),
  cancelledReason: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SessionDto = z.infer<typeof SessionDtoSchema>;

// Filtro principal: una semana de un centro
// weekStart se interpreta como el lunes (inclusive). El backend devuelve
// las sesiones desde weekStart hasta weekStart+6 días (domingo incluido).
export const SessionFiltersSchema = z.object({
  centerId: z.string().uuid(),
  weekStart: z.string().date(),
  groupId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
});
export type SessionFilters = z.infer<typeof SessionFiltersSchema>;
