import type { SessionDto } from '@academiaplaton/shared';
import { addDays, getMondayOf, toIsoDate } from '../lib/week';

const ORG_ID = '00000000-0000-0000-0000-000000000001';
const CENTER_ID = '00000000-0000-0000-0000-0000000000c1';

// Profesores
const T_MONTSERRAT = '33333333-3333-3333-3333-333333333301';
const T_JORDI = '33333333-3333-3333-3333-333333333302';
const T_NURIA = '33333333-3333-3333-3333-333333333303';
const T_LAIA = '33333333-3333-3333-3333-333333333305';

// Grupos (mismo id que en mock-groups.ts)
const G_MATES = '44444444-4444-4444-4444-444444444401';
const G_INGLES = '44444444-4444-4444-4444-444444444402';
const G_FISICA = '44444444-4444-4444-4444-444444444403';
const G_CATALAN = '44444444-4444-4444-4444-444444444404';

const monday = getMondayOf(new Date());
const now = new Date().toISOString();

function s(
  id: string,
  dayOffset: number,
  startTime: string,
  endTime: string,
  groupId: string,
  teacherId: string,
  notes?: string,
): SessionDto {
  return {
    id,
    organizationId: ORG_ID,
    centerId: CENTER_ID,
    groupId,
    teacherId,
    date: toIsoDate(addDays(monday, dayOffset)),
    startTime,
    endTime,
    notes,
    createdAt: now,
    updatedAt: now,
  };
}

export const MOCK_SESSIONS: SessionDto[] = [
  s('55555555-5555-5555-5555-555555555501', 0, '18:00', '19:30', G_MATES, T_MONTSERRAT),
  s('55555555-5555-5555-5555-555555555502', 0, '19:30', '21:00', G_INGLES, T_JORDI),
  s('55555555-5555-5555-5555-555555555503', 1, '18:00', '19:00', G_CATALAN, T_LAIA, 'Sesión introductoria'),
  s('55555555-5555-5555-5555-555555555504', 2, '18:00', '19:30', G_MATES, T_MONTSERRAT),
  s('55555555-5555-5555-5555-555555555505', 2, '19:30', '21:00', G_FISICA, T_NURIA),
  s('55555555-5555-5555-5555-555555555506', 3, '17:00', '18:30', G_INGLES, T_JORDI),
  s('55555555-5555-5555-5555-555555555507', 4, '18:00', '19:30', G_FISICA, T_NURIA),
  s('55555555-5555-5555-5555-555555555508', 5, '10:00', '11:30', G_INGLES, T_JORDI, 'Clase de refuerzo sábado'),
];
