import type { GroupDto } from '@academiaplaton/shared';

const ORG_ID = '00000000-0000-0000-0000-000000000001';
const CENTER_ID = '00000000-0000-0000-0000-0000000000c1';

// IDs alineados con mock-teachers.ts y mock-students.ts
const T_MONTSERRAT = '33333333-3333-3333-3333-333333333301';
const T_JORDI = '33333333-3333-3333-3333-333333333302';
const T_NURIA = '33333333-3333-3333-3333-333333333303';
const T_LAIA = '33333333-3333-3333-3333-333333333305';

const S_ONA = '22222222-2222-2222-2222-222222222201';
const S_HUGO = '22222222-2222-2222-2222-222222222202';
const S_BERTA = '22222222-2222-2222-2222-222222222203';
const S_NIL = '22222222-2222-2222-2222-222222222204';
const S_CARLA = '22222222-2222-2222-2222-222222222205';

function makeGroup(
  id: string,
  teacherId: string,
  name: string,
  subject: string,
  description: string,
  studentIds: string[],
  active = true,
  notes?: string,
): GroupDto {
  return {
    id,
    organizationId: ORG_ID,
    centerId: CENTER_ID,
    teacherId,
    name,
    subject,
    description,
    active,
    notes,
    studentIds,
    studentCount: studentIds.length,
    createdAt: '2025-09-15T08:00:00.000Z',
    updatedAt: '2026-04-22T15:30:00.000Z',
  };
}

export const MOCK_GROUPS: GroupDto[] = [
  makeGroup(
    '44444444-4444-4444-4444-444444444401',
    T_MONTSERRAT,
    'Matemáticas 4ESO A',
    'Matemáticas',
    '4º ESO — refuerzo de álgebra y geometría, dos sesiones semanales.',
    [S_ONA, S_BERTA, S_CARLA],
    true,
    'Grupo de refuerzo en álgebra.',
  ),
  makeGroup(
    '44444444-4444-4444-4444-444444444402',
    T_JORDI,
    'Inglés B2 Tarde',
    'Inglés',
    'Nivel B2 — preparación de Cambridge First, conversación y writing.',
    [S_HUGO, S_NIL, S_CARLA],
  ),
  makeGroup(
    '44444444-4444-4444-4444-444444444403',
    T_NURIA,
    'Física 2BAT',
    'Física',
    '2º Bachillerato — preparación selectividad, problemas y laboratorio.',
    [S_ONA, S_BERTA],
  ),
  makeGroup(
    '44444444-4444-4444-4444-444444444404',
    T_LAIA,
    'Catalán 1ESO',
    'Catalán',
    '1º ESO — gramática y comprensión lectora.',
    [S_HUGO, S_NIL],
    false,
    'Suspendido temporalmente — sin demanda este trimestre.',
  ),
];
