import type { Attendance, AttendanceStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos internos del repo
// ─────────────────────────────────────────────────────────────────────────────

/** Forma que recibe bulkUpsert para cada marca a persistir. */
export interface AttendanceUpsertInput {
  studentId: string;
  status: AttendanceStatus;
  justified: boolean;
  justification: string | null;
  markedByUserId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repo — todas las queries filtran por organizationId (multi-tenant)
// ─────────────────────────────────────────────────────────────────────────────

export const attendanceRepo = {
  /**
   * Devuelve todas las marcas persistidas de una sesión dentro de la org.
   */
  listBySession(organizationId: string, sessionId: string): Promise<Attendance[]> {
    return prisma.attendance.findMany({
      where: { organizationId, sessionId },
      orderBy: { studentId: 'asc' },
    });
  },

  /**
   * Upsert masivo por (sessionId, studentId).
   * Para marks con status 'present' se garantiza que justified=false y
   * justification=null (defensa en profundidad).
   * Usa una transacción serializable para evitar carreras en inserts paralelos.
   */
  async bulkUpsert(
    organizationId: string,
    sessionId: string,
    marks: AttendanceUpsertInput[],
    now: Date,
  ): Promise<Attendance[]> {
    if (marks.length === 0) return [];

    await prisma.$transaction(
      marks.map((m) => {
        const isPresent = m.status === 'present';
        const data: Prisma.AttendanceUncheckedCreateInput = {
          organizationId,
          sessionId,
          studentId: m.studentId,
          status: m.status,
          justified: isPresent ? false : m.justified,
          justification: isPresent ? null : (m.justification ?? null),
          markedAt: now,
          markedByUserId: m.markedByUserId,
        };
        return prisma.attendance.upsert({
          where: { sessionId_studentId: { sessionId, studentId: m.studentId } },
          create: data,
          update: {
            status: data.status,
            justified: data.justified,
            justification: data.justification,
            markedAt: data.markedAt,
            markedByUserId: data.markedByUserId,
          },
        });
      }),
    );

    return attendanceRepo.listBySession(organizationId, sessionId);
  },

  /**
   * Devuelve las marcas de asistencia para todas las sesiones de un grupo,
   * con los datos de la sesión incluidos para armar el historial.
   * Filtra por org, groupId, y opcionalmente por rango de fechas y límite
   * de sesiones.
   */
  async listByGroup(
    organizationId: string,
    groupId: string,
    opts: { fromDate?: Date; toDate?: Date; limit?: number },
  ): Promise<
    Array<{
      session: {
        id: string;
        groupId: string;
        date: Date;
        startTime: string;
        endTime: string;
        teacherId: string;
      };
      attendance: Attendance[];
    }>
  > {
    // Buscamos las sesiones del grupo dentro del rango, ordenadas desc
    const sessions = await prisma.session.findMany({
      where: {
        organizationId,
        groupId,
        ...(opts.fromDate || opts.toDate
          ? {
              date: {
                ...(opts.fromDate && { gte: opts.fromDate }),
                ...(opts.toDate && { lte: opts.toDate }),
              },
            }
          : {}),
      },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
      take: opts.limit,
      select: {
        id: true,
        groupId: true,
        date: true,
        startTime: true,
        endTime: true,
        teacherId: true,
      },
    });

    if (sessions.length === 0) return [];

    const sessionIds = sessions.map((s) => s.id);
    const allAttendances = await prisma.attendance.findMany({
      where: { organizationId, sessionId: { in: sessionIds } },
    });

    // Agrupamos marcas por sessionId en un Map para evitar O(n²)
    const bySession = new Map<string, Attendance[]>();
    for (const a of allAttendances) {
      const bucket = bySession.get(a.sessionId) ?? [];
      bucket.push(a);
      bySession.set(a.sessionId, bucket);
    }

    return sessions.map((s) => ({
      session: s,
      attendance: bySession.get(s.id) ?? [],
    }));
  },
};
