import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Attendance, AttendanceStatus, Session, Group, Student } from '@prisma/client';
import { Prisma } from '@prisma/client';

// Mock de Prisma antes de importar el service
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    session: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    group: {
      findUnique: vi.fn(),
    },
    groupStudent: {
      findMany: vi.fn(),
    },
    student: {
      findMany: vi.fn(),
    },
    attendance: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock del repo para aislar el service
vi.mock('./attendance.repo.js', () => ({
  attendanceRepo: {
    listBySession: vi.fn(),
    bulkUpsert: vi.fn(),
    listByGroup: vi.fn(),
  },
}));

import { attendanceService } from './attendance.service.js';
import { attendanceRepo } from './attendance.repo.js';
import { AppError } from '../../lib/AppError.js';
import { prisma } from '../../lib/prisma.js';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const ORG_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_ORG_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const SESSION_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const GROUP_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const STUDENT_1 = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const STUDENT_2 = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const STUDENT_OUTSIDE = '11111111-1111-1111-1111-111111111111';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: SESSION_ID,
    organizationId: ORG_ID,
    centerId: 'center-id',
    groupId: GROUP_ID,
    teacherId: 'teacher-id',
    date: new Date('2025-03-10T00:00:00.000Z'),
    startTime: '09:00',
    endTime: '10:00',
    notes: null,
    status: 'scheduled',
    durationMinutes: 60,
    rateSnapshot: new Prisma.Decimal(0),
    classTypeSnapshot: 'GRUPAL',
    cancelledAt: null,
    cancelledReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeAttendance(
  studentId: string,
  status: AttendanceStatus = 'present',
  overrides: Partial<Attendance> = {},
): Attendance {
  return {
    id: `att-${studentId}`,
    organizationId: ORG_ID,
    sessionId: SESSION_ID,
    studentId,
    status,
    justified: false,
    justification: null,
    markedAt: new Date(),
    markedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeGroupStudent(studentId: string) {
  return {
    studentId,
    student: { id: studentId, firstName: 'Ana', lastName: 'García' },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getForSession
// ─────────────────────────────────────────────────────────────────────────────

describe('attendanceService.getForSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lanza NOT_FOUND cuando la sesión no existe', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(null);

    await expect(
      attendanceService.getForSession(ORG_ID, SESSION_ID),
    ).rejects.toBeInstanceOf(AppError);

    const err = await attendanceService
      .getForSession(ORG_ID, SESSION_ID)
      .catch((e: AppError) => e);
    expect((err as AppError).statusCode).toBe(404);
  });

  it('lanza NOT_FOUND cuando la sesión pertenece a otra org', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(
      makeSession({ organizationId: OTHER_ORG_ID }),
    );

    await expect(
      attendanceService.getForSession(ORG_ID, SESSION_ID),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('devuelve todos los alumnos del grupo como present cuando no hay marcas', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(makeSession());
    vi.mocked(prisma.groupStudent.findMany).mockResolvedValue([
      makeGroupStudent(STUDENT_1),
      makeGroupStudent(STUDENT_2),
    ] as never);
    vi.mocked(attendanceRepo.listBySession).mockResolvedValue([]);

    const result = await attendanceService.getForSession(ORG_ID, SESSION_ID);

    expect(result.marks).toHaveLength(2);
    expect(result.marks.every((m) => m.status === 'present')).toBe(true);
    expect(result.marks.every((m) => m.justified === false)).toBe(true);
    expect(result.marks.every((m) => m.persisted === false)).toBe(true);
  });

  it('mezcla marcas persistidas con valores por defecto para alumnos sin marca', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(makeSession());
    vi.mocked(prisma.groupStudent.findMany).mockResolvedValue([
      makeGroupStudent(STUDENT_1),
      makeGroupStudent(STUDENT_2),
    ] as never);
    // Solo STUDENT_1 tiene marca (ausente)
    vi.mocked(attendanceRepo.listBySession).mockResolvedValue([
      makeAttendance(STUDENT_1, 'absent', { justified: true, justification: 'Enfermedad' }),
    ]);

    const result = await attendanceService.getForSession(ORG_ID, SESSION_ID);

    expect(result.marks).toHaveLength(2);
    const m1 = result.marks.find((m) => m.studentId === STUDENT_1)!;
    const m2 = result.marks.find((m) => m.studentId === STUDENT_2)!;

    expect(m1.status).toBe('absent');
    expect(m1.justified).toBe(true);
    expect(m1.justification).toBe('Enfermedad');
    expect(m1.persisted).toBe(true);

    expect(m2.status).toBe('present');
    expect(m2.justified).toBe(false);
    expect(m2.persisted).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// saveForSession
// ─────────────────────────────────────────────────────────────────────────────

describe('attendanceService.saveForSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lanza NOT_FOUND cuando la sesión pertenece a otra org', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(
      makeSession({ organizationId: OTHER_ORG_ID }),
    );

    await expect(
      attendanceService.saveForSession(ORG_ID, SESSION_ID, { marks: [] }, null),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('rechaza studentId que no pertenece al grupo', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(makeSession());
    // STUDENT_1 está en el grupo; STUDENT_OUTSIDE no
    vi.mocked(prisma.groupStudent.findMany).mockResolvedValue([
      { studentId: STUDENT_1 },
    ] as never);
    vi.mocked(prisma.student.findMany).mockResolvedValue([
      { id: STUDENT_OUTSIDE } as Student,
    ]);

    await expect(
      attendanceService.saveForSession(
        ORG_ID,
        SESSION_ID,
        {
          marks: [
            { studentId: STUDENT_OUTSIDE, status: 'absent', justified: false },
          ],
        },
        null,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rechaza studentId de otra org aunque esté en el body', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(makeSession());
    // El alumno SÍ está en GroupStudent del grupo
    vi.mocked(prisma.groupStudent.findMany).mockResolvedValue([
      { studentId: STUDENT_1 },
    ] as never);
    // Pero al filtrar por organizationId no aparece (es de otra org)
    vi.mocked(prisma.student.findMany).mockResolvedValue([]);

    await expect(
      attendanceService.saveForSession(
        ORG_ID,
        SESSION_ID,
        {
          marks: [{ studentId: STUDENT_1, status: 'present', justified: false }],
        },
        null,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('cuando status=present, el repo recibe justified=false y justification=null', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(makeSession());
    // Primera llamada: groupStudent.findMany para validar que los alumnos pertenecen al grupo
    // Segunda llamada: groupStudent.findMany dentro de loadGroupStudents (para getForSession)
    vi.mocked(prisma.groupStudent.findMany)
      .mockResolvedValueOnce([{ studentId: STUDENT_1 }] as never)
      .mockResolvedValueOnce([makeGroupStudent(STUDENT_1)] as never);
    vi.mocked(prisma.student.findMany).mockResolvedValue([
      { id: STUDENT_1 } as Student,
    ]);
    vi.mocked(attendanceRepo.bulkUpsert).mockResolvedValue([]);
    // Para el getForSession posterior
    vi.mocked(attendanceRepo.listBySession).mockResolvedValue([]);

    await attendanceService.saveForSession(
      ORG_ID,
      SESSION_ID,
      {
        // El Zod schema ya debería rechazar justified=true con present,
        // pero el service hace defensa en profundidad en el repo.
        marks: [{ studentId: STUDENT_1, status: 'present', justified: false }],
      },
      null,
    );

    expect(attendanceRepo.bulkUpsert).toHaveBeenCalledWith(
      ORG_ID,
      SESSION_ID,
      [
        expect.objectContaining({
          studentId: STUDENT_1,
          status: 'present',
          justified: false,
          justification: null,
          markedByUserId: null,
        }),
      ],
      expect.any(Date),
    );
  });

  it('es idempotente: un segundo PUT llama a bulkUpsert sin duplicar (upsert)', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(makeSession());
    // Cada llamada a saveForSession hace: 1x groupStudent para validar + 1x groupStudent en loadGroupStudents
    vi.mocked(prisma.groupStudent.findMany).mockResolvedValue([
      makeGroupStudent(STUDENT_1),
    ] as never);
    vi.mocked(prisma.student.findMany).mockResolvedValue([
      { id: STUDENT_1 } as Student,
    ]);
    vi.mocked(attendanceRepo.bulkUpsert).mockResolvedValue([
      makeAttendance(STUDENT_1, 'absent'),
    ]);
    vi.mocked(attendanceRepo.listBySession).mockResolvedValue([
      makeAttendance(STUDENT_1, 'absent'),
    ]);

    const body = { marks: [{ studentId: STUDENT_1, status: 'absent' as const, justified: false }] };

    await attendanceService.saveForSession(ORG_ID, SESSION_ID, body, null);
    await attendanceService.saveForSession(ORG_ID, SESSION_ID, body, null);

    // bulkUpsert se llama exactamente 2 veces (una por PUT), no 4
    expect(attendanceRepo.bulkUpsert).toHaveBeenCalledTimes(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getGroupHistory
// ─────────────────────────────────────────────────────────────────────────────

describe('attendanceService.getGroupHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lanza NOT_FOUND si el grupo no pertenece a la org', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue(null);

    await expect(
      attendanceService.getGroupHistory(ORG_ID, GROUP_ID, { limit: 90 }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('solo devuelve sesiones de la org (filtro en repo)', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({
      id: GROUP_ID,
      organizationId: ORG_ID,
    } as Group);
    // El repo ya filtra por organizationId internamente; mockeamos su retorno
    vi.mocked(attendanceRepo.listByGroup).mockResolvedValue([]);
    vi.mocked(prisma.groupStudent.findMany).mockResolvedValue([]);
    vi.mocked(prisma.student.findMany).mockResolvedValue([]);

    const result = await attendanceService.getGroupHistory(ORG_ID, GROUP_ID, { limit: 90 });

    expect(result.groupId).toBe(GROUP_ID);
    expect(result.entries).toHaveLength(0);
    // Verificar que listByGroup recibió el organizationId correcto
    expect(attendanceRepo.listByGroup).toHaveBeenCalledWith(
      ORG_ID,
      GROUP_ID,
      expect.objectContaining({}),
    );
  });

  it('calcula totales correctamente', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({
      id: GROUP_ID,
      organizationId: ORG_ID,
    } as Group);

    const session = makeSession();
    vi.mocked(attendanceRepo.listByGroup).mockResolvedValue([
      {
        session: {
          id: session.id,
          groupId: session.groupId,
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          teacherId: session.teacherId,
        },
        attendance: [
          makeAttendance(STUDENT_1, 'present'),
          makeAttendance(STUDENT_2, 'absent', { justified: true }),
        ],
      },
    ]);

    // groupStudent incluye ambos alumnos
    vi.mocked(prisma.groupStudent.findMany).mockResolvedValue([
      makeGroupStudent(STUDENT_1),
      makeGroupStudent(STUDENT_2),
    ] as never);

    vi.mocked(prisma.student.findMany).mockResolvedValue([
      { id: STUDENT_1, firstName: 'Ana', lastName: 'García' } as Student,
      { id: STUDENT_2, firstName: 'Luis', lastName: 'Pérez' } as Student,
    ]);

    const result = await attendanceService.getGroupHistory(ORG_ID, GROUP_ID, { limit: 90 });

    expect(result.entries).toHaveLength(1);
    const entry = result.entries[0]!;
    expect(entry.totals.present).toBe(1);
    expect(entry.totals.absent).toBe(1);
    expect(entry.totals.justifiedAbsent).toBe(1);
    expect(entry.totals.unjustifiedAbsent).toBe(0);
  });

  it('respeta los filtros from/to/limit pasándolos al repo', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({
      id: GROUP_ID,
      organizationId: ORG_ID,
    } as Group);
    vi.mocked(attendanceRepo.listByGroup).mockResolvedValue([]);
    vi.mocked(prisma.groupStudent.findMany).mockResolvedValue([]);
    vi.mocked(prisma.student.findMany).mockResolvedValue([]);

    await attendanceService.getGroupHistory(ORG_ID, GROUP_ID, {
      from: '2025-01-01',
      to: '2025-03-31',
      limit: 10,
    });

    expect(attendanceRepo.listByGroup).toHaveBeenCalledWith(
      ORG_ID,
      GROUP_ID,
      expect.objectContaining({
        fromDate: new Date('2025-01-01T00:00:00.000Z'),
        toDate: new Date('2025-03-31T23:59:59.999Z'),
        limit: 10,
      }),
    );
  });
});
