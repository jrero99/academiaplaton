import type { Attendance } from '@prisma/client';
import {
  type AttendanceBulkUpsert,
  type AttendanceMarkResolvedDto,
  type AttendanceTotalsDto,
  type GroupAttendanceFilters,
  type GroupAttendanceHistoryDto,
  type GroupAttendanceHistoryEntryDto,
  type SessionAttendanceDto,
  ErrorCodes,
} from '@academiaplaton/shared';
import { AppError } from '../../lib/AppError.js';
import { prisma } from '../../lib/prisma.js';
import { attendanceRepo } from './attendance.repo.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

/** Carga la sesión validando que pertenece a la org. Lanza NOT_FOUND si no. */
async function loadSessionForOrg(organizationId: string, sessionId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.organizationId !== organizationId) {
    throw AppError.notFound('Session');
  }
  return session;
}

/** Carga el grupo validando que pertenece a la org. Lanza NOT_FOUND si no. */
async function loadGroupForOrg(organizationId: string, groupId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group || group.organizationId !== organizationId) {
    throw AppError.notFound('Group');
  }
  return group;
}

/**
 * Devuelve los alumnos actualmente en el grupo con sus datos básicos.
 * No hay filtro de fecha aquí: los alumnos que estén en GroupStudent en el
 * momento de la consulta son los del grupo.
 */
async function loadGroupStudents(
  groupId: string,
): Promise<Array<{ studentId: string; firstName: string; lastName: string }>> {
  const rows = await prisma.groupStudent.findMany({
    where: { groupId },
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
  return rows.map((r) => ({
    studentId: r.studentId,
    firstName: r.student.firstName,
    lastName: r.student.lastName,
  }));
}

/**
 * Combina la lista de alumnos del grupo con las marcas persistidas en BD.
 * Los alumnos sin marca devuelven un registro virtual con status='present',
 * justified=false, persisted=false.
 */
function mergeMarks(
  groupStudents: Array<{ studentId: string; firstName: string; lastName: string }>,
  persistedMarks: Attendance[],
): AttendanceMarkResolvedDto[] {
  const byStudent = new Map<string, Attendance>();
  for (const m of persistedMarks) {
    byStudent.set(m.studentId, m);
  }

  return groupStudents.map((gs) => {
    const mark = byStudent.get(gs.studentId);
    if (mark) {
      return {
        studentId: gs.studentId,
        firstName: gs.firstName,
        lastName: gs.lastName,
        status: mark.status,
        justified: mark.justified,
        justification: mark.justification ?? undefined,
        persisted: true,
        markedAt: mark.markedAt.toISOString(),
        markedByUserId: mark.markedByUserId ?? undefined,
      };
    }
    // Marca virtual: present por defecto, no persistida
    return {
      studentId: gs.studentId,
      firstName: gs.firstName,
      lastName: gs.lastName,
      status: 'present' as const,
      justified: false,
      persisted: false,
    };
  });
}

/** Calcula los totales de asistencia a partir de las marcas resueltas. */
function computeTotals(marks: AttendanceMarkResolvedDto[]): AttendanceTotalsDto {
  let present = 0;
  let absent = 0;
  let justifiedAbsent = 0;
  let unjustifiedAbsent = 0;

  for (const m of marks) {
    if (m.status === 'present') {
      present++;
    } else {
      absent++;
      if (m.justified) {
        justifiedAbsent++;
      } else {
        unjustifiedAbsent++;
      }
    }
  }
  return { present, absent, justifiedAbsent, unjustifiedAbsent };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export const attendanceService = {
  /**
   * Devuelve la asistencia de una sesión mezclando marcas persistidas con
   * valores por defecto (present) para los alumnos sin marca.
   * NO persiste nada — el snapshot ocurre en saveForSession.
   */
  async getForSession(
    organizationId: string,
    sessionId: string,
  ): Promise<SessionAttendanceDto> {
    // TODO(auth): verificar que el user actual es el teacher de la sesión,
    // admin de la org o center_manager. Pendiente hasta que exista auth real.
    // Patrón: assertCanAccessSession(req.user, session, organizationId)

    const session = await loadSessionForOrg(organizationId, sessionId);
    const [groupStudents, persistedMarks] = await Promise.all([
      loadGroupStudents(session.groupId),
      attendanceRepo.listBySession(organizationId, sessionId),
    ]);

    const marks = mergeMarks(groupStudents, persistedMarks);

    return {
      sessionId: session.id,
      groupId: session.groupId,
      date: session.date.toISOString().slice(0, 10),
      startTime: session.startTime,
      endTime: session.endTime,
      teacherId: session.teacherId,
      marks,
    };
  },

  /**
   * Persiste (upsert masivo) las marcas de asistencia de una sesión.
   * Snapshot: solo los studentIds que vienen en el body y que pertenezcan al
   * grupo de la sesión quedan materializados.
   * Es idempotente: llamar varias veces con los mismos datos produce el mismo resultado.
   */
  async saveForSession(
    organizationId: string,
    sessionId: string,
    body: AttendanceBulkUpsert,
    markedByUserId: string | null,
  ): Promise<SessionAttendanceDto> {
    // TODO(auth): verificar que el user actual es el teacher de la sesión,
    // admin de la org o center_manager. Pendiente hasta que exista auth real.

    const session = await loadSessionForOrg(organizationId, sessionId);

    // Validar que todos los studentIds del body pertenecen al grupo y a la org
    if (body.marks.length > 0) {
      const studentIdsInBody = body.marks.map((m) => m.studentId);

      // Obtener los alumnos del grupo como conjunto de IDs
      const groupStudentRows = await prisma.groupStudent.findMany({
        where: { groupId: session.groupId },
        select: { studentId: true },
      });
      const validStudentIds = new Set(groupStudentRows.map((r) => r.studentId));

      // Verificar que los alumnos del body también son de esta org
      const studentsInOrg = await prisma.student.findMany({
        where: { id: { in: studentIdsInBody }, organizationId },
        select: { id: true },
      });
      const validOrgStudentIds = new Set(studentsInOrg.map((s) => s.id));

      for (const m of body.marks) {
        if (!validStudentIds.has(m.studentId)) {
          throw new AppError(
            400,
            ErrorCodes.VALIDATION,
            `Student ${m.studentId} no pertenece al grupo de la sesión`,
          );
        }
        if (!validOrgStudentIds.has(m.studentId)) {
          throw new AppError(
            400,
            ErrorCodes.VALIDATION,
            `Student ${m.studentId} no pertenece a esta organización`,
          );
        }
      }
    }

    const now = new Date();
    await attendanceRepo.bulkUpsert(
      organizationId,
      sessionId,
      body.marks.map((m) => ({
        studentId: m.studentId,
        status: m.status,
        justified: m.justified,
        justification: m.justification ?? null,
        markedByUserId,
      })),
      now,
    );

    // Devolver la vista actualizada
    return attendanceService.getForSession(organizationId, sessionId);
  },

  /**
   * Devuelve el historial de asistencia de un grupo, con totales por sesión.
   * Solo incluye sesiones que ya tienen alguna marca persistida O todas las
   * sesiones del grupo en el rango (con totales a 0 para las que no tienen marcas).
   *
   * Nota de diseño: si una sesión nunca tuvo PUT de asistencia, sus totals
   * serán {0,0,0,0} y marks vacío — indicador visual de "no pasada lista".
   */
  async getGroupHistory(
    organizationId: string,
    groupId: string,
    filters: GroupAttendanceFilters,
  ): Promise<GroupAttendanceHistoryDto> {
    // TODO(auth): verificar permisos del user para este grupo/org.

    await loadGroupForOrg(organizationId, groupId);

    const fromDate = filters.from ? new Date(`${filters.from}T00:00:00.000Z`) : undefined;
    const toDate = filters.to ? new Date(`${filters.to}T23:59:59.999Z`) : undefined;

    const rows = await attendanceRepo.listByGroup(organizationId, groupId, {
      fromDate,
      toDate,
      limit: filters.limit,
    });

    // Para resolver nombres de alumnos necesitamos cargar los alumnos únicos
    const allStudentIds = new Set<string>();
    for (const row of rows) {
      for (const a of row.attendance) {
        allStudentIds.add(a.studentId);
      }
    }

    // También cargamos los alumnos actuales del grupo para los "virtuales"
    // en el historial. Nota: para sesiones pasadas deberíamos usar el snapshot
    // del momento, pero como aún no hay snapshot histórico de GroupStudent
    // usamos la lista actual. Las marcas persistidas ya tienen el studentId
    // correcto, así que solo los alumnos con marca aparecerán con nombre resuelto.
    const groupStudents = await loadGroupStudents(groupId);
    const groupStudentIds = new Set(groupStudents.map((gs) => gs.studentId));

    // Sumar ids de marcas que no estén en el grupo actual (alumnos dados de baja)
    for (const sid of allStudentIds) {
      if (!groupStudentIds.has(sid)) {
        allStudentIds.add(sid);
      }
    }

    // Carga de nombres para todos los studentIds presentes
    const studentsData = await prisma.student.findMany({
      where: { id: { in: Array.from(allStudentIds) }, organizationId },
      select: { id: true, firstName: true, lastName: true },
    });
    const studentNameMap = new Map(studentsData.map((s) => [s.id, s]));

    const entries: GroupAttendanceHistoryEntryDto[] = rows.map(({ session, attendance }) => {
      // Para el historial usamos solo las marcas persistidas;
      // los alumnos del grupo sin marca aparecen como present virtual
      const resolvedMarks = mergeMarks(
        groupStudents,
        attendance,
      );

      // Añadir marcas de alumnos ya no en el grupo (bajas) que tuvieran marca persistida
      const groupStudentIdSet = new Set(groupStudents.map((gs) => gs.studentId));
      for (const a of attendance) {
        if (!groupStudentIdSet.has(a.studentId)) {
          const sd = studentNameMap.get(a.studentId);
          resolvedMarks.push({
            studentId: a.studentId,
            firstName: sd?.firstName ?? '(alumno eliminado)',
            lastName: sd?.lastName ?? '',
            status: a.status,
            justified: a.justified,
            justification: a.justification ?? undefined,
            persisted: true,
            markedAt: a.markedAt.toISOString(),
            markedByUserId: a.markedByUserId ?? undefined,
          });
        }
      }

      const totals = computeTotals(resolvedMarks);

      return {
        sessionId: session.id,
        date: session.date.toISOString().slice(0, 10),
        startTime: session.startTime,
        endTime: session.endTime,
        teacherId: session.teacherId,
        totals,
        marks: resolvedMarks,
      };
    });

    return { groupId, entries };
  },
};
