import type {
  AttendanceMarkResolvedDto,
  GroupAttendanceHistoryEntryDto,
  GroupAttendanceFilters,
} from '@academiaplaton/shared';
import { MOCK_GROUPS } from '@/features/groups/data/mock-groups';
import { MOCK_STUDENTS } from '@/features/students/data/mock-students';
import { MOCK_SESSIONS } from '@/features/sessions/data/mock-sessions';

const STORAGE_KEY = 'plato.attendance.records';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos internos del mock (lo que persistimos en localStorage)
// ─────────────────────────────────────────────────────────────────────────────

interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: 'present' | 'absent';
  justified: boolean;
  justification?: string;
  markedAt: string;
  markedByUserId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistencia en localStorage
// ─────────────────────────────────────────────────────────────────────────────

function loadRecords(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AttendanceRecord[];
  } catch {
    return [];
  }
}

function saveRecords(records: AttendanceRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers públicos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve la lista de marcas resueltas para una sesión.
 * Los alumnos sin marca persistida aparecen con status 'present' y persisted=false.
 * Mismos datos que el endpoint GET /sessions/:id/attendance del backend.
 */
export function getSessionAttendance(sessionId: string): AttendanceMarkResolvedDto[] {
  const session = MOCK_SESSIONS.find((s) => s.id === sessionId);
  if (!session) return [];

  const group = MOCK_GROUPS.find((g) => g.id === session.groupId);
  if (!group) return [];

  const records = loadRecords();
  const sessionRecords = records.filter((r) => r.sessionId === sessionId);

  return group.studentIds.map((studentId) => {
    const student = MOCK_STUDENTS.find((s) => s.id === studentId);
    const record = sessionRecords.find((r) => r.studentId === studentId);

    const firstName = student?.firstName ?? 'Desconocido';
    const lastName = student?.lastName ?? '';

    if (record) {
      return {
        studentId,
        firstName,
        lastName,
        status: record.status,
        justified: record.justified,
        justification: record.justification,
        persisted: true,
        markedAt: record.markedAt,
        markedByUserId: record.markedByUserId,
      };
    }

    return {
      studentId,
      firstName,
      lastName,
      status: 'present' as const,
      justified: false,
      persisted: false,
    };
  });
}

/**
 * Upsert masivo de marcas para una sesión.
 * Resetea justified/justification a false/undefined cuando status pasa a 'present'.
 * Devuelve la lista actualizada de marcas resueltas.
 */
export function saveSessionAttendance(
  sessionId: string,
  marks: Array<{
    studentId: string;
    status: 'present' | 'absent';
    justified: boolean;
    justification?: string;
  }>,
  markedByUserId?: string,
): AttendanceMarkResolvedDto[] {
  const records = loadRecords();
  const now = new Date().toISOString();

  for (const mark of marks) {
    const existingIndex = records.findIndex(
      (r) => r.sessionId === sessionId && r.studentId === mark.studentId,
    );

    const isPresent = mark.status === 'present';
    const newRecord: AttendanceRecord = {
      id:
        existingIndex >= 0
          ? (records[existingIndex]!.id)
          : crypto.randomUUID(),
      sessionId,
      studentId: mark.studentId,
      status: mark.status,
      // Limpia justified y justification si el alumno está presente
      justified: isPresent ? false : mark.justified,
      justification: isPresent ? undefined : mark.justification,
      markedAt: now,
      markedByUserId,
    };

    if (existingIndex >= 0) {
      records[existingIndex] = newRecord;
    } else {
      records.push(newRecord);
    }
  }

  saveRecords(records);
  return getSessionAttendance(sessionId);
}

/**
 * Devuelve el historial de asistencia de un grupo ordenado desc por fecha.
 * Solo incluye sesiones que pertenecen al grupo y que tienen al menos algún
 * registro (o todas las sesiones del grupo, incluyendo las sin pasar lista).
 */
export function getGroupAttendanceHistory(
  groupId: string,
  opts?: GroupAttendanceFilters,
): GroupAttendanceHistoryEntryDto[] {
  const group = MOCK_GROUPS.find((g) => g.id === groupId);
  if (!group) return [];

  const groupSessions = MOCK_SESSIONS.filter((s) => s.groupId === groupId);

  const entries: GroupAttendanceHistoryEntryDto[] = groupSessions.map((session) => {
    const marks = getSessionAttendance(session.id);
    const absent = marks.filter((m) => m.status === 'absent');
    const justifiedAbsent = absent.filter((m) => m.justified);
    const unjustifiedAbsent = absent.filter((m) => !m.justified);

    return {
      sessionId: session.id,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      teacherId: session.teacherId,
      totals: {
        present: marks.filter((m) => m.status === 'present').length,
        absent: absent.length,
        justifiedAbsent: justifiedAbsent.length,
        unjustifiedAbsent: unjustifiedAbsent.length,
      },
      marks,
    };
  });

  // Filtros opcionales
  let filtered = entries;

  if (opts?.from) {
    filtered = filtered.filter((e) => e.date >= opts.from!);
  }
  if (opts?.to) {
    filtered = filtered.filter((e) => e.date <= opts.to!);
  }

  // Orden descendente por fecha
  return filtered.sort((a, b) => b.date.localeCompare(a.date));
}
