import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const AttendanceStatusSchema = z.enum(['present', 'absent']);
export type AttendanceStatus = z.infer<typeof AttendanceStatusSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Input schemas (viajan por la API)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Una marca de asistencia individual dentro de un bulk upsert.
 * Refinement:
 *  - Si status === 'present': justified debe ser false y justification ausente.
 *  - Si status === 'absent': justified y justification son opcionales.
 */
export const AttendanceMarkSchema = z
  .object({
    studentId: z.string().uuid(),
    status: AttendanceStatusSchema,
    justified: z.boolean().default(false),
    justification: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'present') {
        return data.justified === false && data.justification === undefined;
      }
      return true;
    },
    {
      message:
        'Cuando status es "present", justified debe ser false y justification debe estar ausente',
      path: ['justified'],
    },
  );
export type AttendanceMark = z.infer<typeof AttendanceMarkSchema>;

/** Payload del PUT /sessions/:sessionId/attendance */
export const AttendanceBulkUpsertSchema = z.object({
  marks: z.array(AttendanceMarkSchema).min(0).max(200),
});
export type AttendanceBulkUpsert = z.infer<typeof AttendanceBulkUpsertSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Output DTOs
// ─────────────────────────────────────────────────────────────────────────────

/** Un registro de asistencia materializado en BD. */
export const AttendanceRecordDtoSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
  status: AttendanceStatusSchema,
  justified: z.boolean(),
  justification: z.string().optional(),
  markedAt: z.string().datetime(),
  markedByUserId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AttendanceRecordDto = z.infer<typeof AttendanceRecordDtoSchema>;

/**
 * Una marca resuelta con datos del alumno: se usa como elemento de las vistas
 * de sesión y del historial de grupo, para evitar roundtrips del front.
 * Los campos justified/justification solo son significativos si status === 'absent'.
 */
export const AttendanceMarkResolvedDtoSchema = z.object({
  studentId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  status: AttendanceStatusSchema,
  justified: z.boolean(),
  justification: z.string().optional(),
  /** true = marca materializada en BD; false = valor por defecto (present sin persistir) */
  persisted: z.boolean(),
  markedAt: z.string().datetime().optional(),
  markedByUserId: z.string().uuid().optional(),
});
export type AttendanceMarkResolvedDto = z.infer<typeof AttendanceMarkResolvedDtoSchema>;

/** Vista completa de la asistencia de una sesión concreta. */
export const SessionAttendanceDtoSchema = z.object({
  sessionId: z.string().uuid(),
  groupId: z.string().uuid(),
  date: z.string().date(),
  startTime: z.string(),
  endTime: z.string(),
  teacherId: z.string().uuid(),
  marks: z.array(AttendanceMarkResolvedDtoSchema),
});
export type SessionAttendanceDto = z.infer<typeof SessionAttendanceDtoSchema>;

/** Totales de asistencia de una sesión dentro del historial del grupo. */
export const AttendanceTotalsDtoSchema = z.object({
  present: z.number().int().min(0),
  absent: z.number().int().min(0),
  justifiedAbsent: z.number().int().min(0),
  unjustifiedAbsent: z.number().int().min(0),
});
export type AttendanceTotalsDto = z.infer<typeof AttendanceTotalsDtoSchema>;

/** Una entrada del historial de asistencia por grupo (una sesión + sus totales). */
export const GroupAttendanceHistoryEntryDtoSchema = z.object({
  sessionId: z.string().uuid(),
  date: z.string().date(),
  startTime: z.string(),
  endTime: z.string(),
  teacherId: z.string().uuid(),
  totals: AttendanceTotalsDtoSchema,
  marks: z.array(AttendanceMarkResolvedDtoSchema),
});
export type GroupAttendanceHistoryEntryDto = z.infer<typeof GroupAttendanceHistoryEntryDtoSchema>;

/** Historial completo de asistencia de un grupo. Entries ordenadas desc por fecha. */
export const GroupAttendanceHistoryDtoSchema = z.object({
  groupId: z.string().uuid(),
  entries: z.array(GroupAttendanceHistoryEntryDtoSchema),
});
export type GroupAttendanceHistoryDto = z.infer<typeof GroupAttendanceHistoryDtoSchema>;

/** Filtros opcionales para el historial de grupo. */
export const GroupAttendanceFiltersSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  limit: z.coerce.number().int().min(1).max(365).default(90),
});
export type GroupAttendanceFilters = z.infer<typeof GroupAttendanceFiltersSchema>;
