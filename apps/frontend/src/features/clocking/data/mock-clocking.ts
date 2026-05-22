import type { ClockEntry } from '../types';

const ORG_ID = '00000000-0000-0000-0000-000000000001';

// IDs en el mismo orden que MOCK_TEACHERS
const T1 = '33333333-3333-3333-3333-333333333301'; // Montserrat Ferrer
const T2 = '33333333-3333-3333-3333-333333333302'; // Jordi Sala
const T3 = '33333333-3333-3333-3333-333333333303'; // Núria Codina
const T4 = '33333333-3333-3333-3333-333333333304'; // Raül Martínez (inactivo, puede tener histórico)
const T5 = '33333333-3333-3333-3333-333333333305'; // Laia Domingo

// Construye una fecha ISO a partir de hoy + offset de días + hora HH:MM
function dt(daysAgo: number, hh: number, mm: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

// Hoy en formato HH:MM que suene a "lleva dentro 2h"
const now = new Date();
const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

export const MOCK_CLOCK_ENTRIES: ClockEntry[] = [
  // ── HOY ─────────────────────────────────────────────────────────────────
  // T1: fichada dentro ahora (clockOut null)
  {
    id: 'ce-001',
    organizationId: ORG_ID,
    teacherId: T1,
    clockIn: twoHoursAgo.toISOString(),
    clockOut: null,
  },
  // T2: fichado dentro ahora (clockOut null)
  {
    id: 'ce-002',
    organizationId: ORG_ID,
    teacherId: T2,
    clockIn: threeHoursAgo.toISOString(),
    clockOut: null,
  },
  // T3: turno partido hoy — mañana completado, tarde aún abierta
  {
    id: 'ce-003',
    organizationId: ORG_ID,
    teacherId: T3,
    clockIn: dt(0, 9, 0),
    clockOut: dt(0, 13, 30),
  },

  // ── AYER (1) ────────────────────────────────────────────────────────────
  {
    id: 'ce-004',
    organizationId: ORG_ID,
    teacherId: T1,
    clockIn: dt(1, 9, 10),
    clockOut: dt(1, 14, 5),
  },
  {
    id: 'ce-005',
    organizationId: ORG_ID,
    teacherId: T2,
    clockIn: dt(1, 15, 30),
    clockOut: dt(1, 20, 45),
  },
  {
    id: 'ce-006',
    organizationId: ORG_ID,
    teacherId: T3,
    clockIn: dt(1, 8, 50),
    clockOut: dt(1, 13, 15),
  },
  {
    id: 'ce-007',
    organizationId: ORG_ID,
    teacherId: T5,
    clockIn: dt(1, 16, 0),
    clockOut: dt(1, 20, 30),
  },

  // ── HACE 2 DÍAS — turno partido de T1 ──────────────────────────────────
  {
    id: 'ce-008',
    organizationId: ORG_ID,
    teacherId: T1,
    clockIn: dt(2, 9, 5),
    clockOut: dt(2, 13, 0),
  },
  {
    id: 'ce-009',
    organizationId: ORG_ID,
    teacherId: T1,
    clockIn: dt(2, 16, 0),
    clockOut: dt(2, 20, 10),
  },
  {
    id: 'ce-010',
    organizationId: ORG_ID,
    teacherId: T2,
    clockIn: dt(2, 9, 20),
    clockOut: dt(2, 13, 50),
  },
  {
    id: 'ce-011',
    organizationId: ORG_ID,
    teacherId: T4,
    clockIn: dt(2, 15, 45),
    clockOut: dt(2, 21, 0),
  },

  // ── HACE 3 DÍAS ─────────────────────────────────────────────────────────
  {
    id: 'ce-012',
    organizationId: ORG_ID,
    teacherId: T3,
    clockIn: dt(3, 8, 55),
    clockOut: dt(3, 14, 0),
  },
  {
    id: 'ce-013',
    organizationId: ORG_ID,
    teacherId: T5,
    clockIn: dt(3, 15, 50),
    clockOut: dt(3, 20, 20),
  },
  {
    id: 'ce-014',
    organizationId: ORG_ID,
    teacherId: T2,
    clockIn: dt(3, 9, 0),
    clockOut: dt(3, 13, 45),
  },

  // ── HACE 4 DÍAS — turno partido de T5 ───────────────────────────────────
  {
    id: 'ce-015',
    organizationId: ORG_ID,
    teacherId: T5,
    clockIn: dt(4, 9, 10),
    clockOut: dt(4, 13, 30),
  },
  {
    id: 'ce-016',
    organizationId: ORG_ID,
    teacherId: T5,
    clockIn: dt(4, 15, 30),
    clockOut: dt(4, 20, 0),
  },
  {
    id: 'ce-017',
    organizationId: ORG_ID,
    teacherId: T1,
    clockIn: dt(4, 8, 45),
    clockOut: dt(4, 13, 15),
  },
  {
    id: 'ce-018',
    organizationId: ORG_ID,
    teacherId: T4,
    clockIn: dt(4, 16, 10),
    clockOut: dt(4, 21, 30),
  },

  // ── HACE 5 DÍAS ─────────────────────────────────────────────────────────
  {
    id: 'ce-019',
    organizationId: ORG_ID,
    teacherId: T2,
    clockIn: dt(5, 9, 5),
    clockOut: dt(5, 14, 10),
  },
  {
    id: 'ce-020',
    organizationId: ORG_ID,
    teacherId: T3,
    clockIn: dt(5, 15, 40),
    clockOut: dt(5, 20, 50),
  },

  // ── HACE 7 DÍAS ─────────────────────────────────────────────────────────
  {
    id: 'ce-021',
    organizationId: ORG_ID,
    teacherId: T1,
    clockIn: dt(7, 9, 0),
    clockOut: dt(7, 13, 30),
  },
  {
    id: 'ce-022',
    organizationId: ORG_ID,
    teacherId: T2,
    clockIn: dt(7, 15, 20),
    clockOut: dt(7, 20, 40),
  },
  {
    id: 'ce-023',
    organizationId: ORG_ID,
    teacherId: T5,
    clockIn: dt(7, 8, 50),
    clockOut: dt(7, 14, 5),
  },

  // ── HACE 9 DÍAS ─────────────────────────────────────────────────────────
  {
    id: 'ce-024',
    organizationId: ORG_ID,
    teacherId: T3,
    clockIn: dt(9, 9, 15),
    clockOut: dt(9, 13, 45),
  },
  {
    id: 'ce-025',
    organizationId: ORG_ID,
    teacherId: T4,
    clockIn: dt(9, 15, 30),
    clockOut: dt(9, 21, 0),
  },

  // ── HACE 11 DÍAS ────────────────────────────────────────────────────────
  {
    id: 'ce-026',
    organizationId: ORG_ID,
    teacherId: T1,
    clockIn: dt(11, 9, 5),
    clockOut: dt(11, 13, 55),
  },
  {
    id: 'ce-027',
    organizationId: ORG_ID,
    teacherId: T2,
    clockIn: dt(11, 16, 0),
    clockOut: dt(11, 20, 30),
  },

  // ── HACE 13 DÍAS ────────────────────────────────────────────────────────
  {
    id: 'ce-028',
    organizationId: ORG_ID,
    teacherId: T5,
    clockIn: dt(13, 9, 20),
    clockOut: dt(13, 14, 0),
  },
  {
    id: 'ce-029',
    organizationId: ORG_ID,
    teacherId: T3,
    clockIn: dt(13, 15, 45),
    clockOut: dt(13, 20, 15),
  },
  {
    id: 'ce-030',
    organizationId: ORG_ID,
    teacherId: T4,
    clockIn: dt(13, 8, 55),
    clockOut: dt(13, 13, 20),
  },
];
