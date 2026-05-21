import type { CenterDto } from '@academiaplaton/shared';

const ORG_ID = '00000000-0000-0000-0000-000000000001';

// UUIDs cortos para que sean fáciles de localizar en mocks cruzados
// (students/groups/sessions). El UI muestra #1/#2/#3 como identificador
// legible; el id real sigue siendo UUID para alinearse con el backend.
export const CENTER_PLATON_TERESAS = '00000000-0000-0000-0000-0000000000c1';
export const CENTER_PLATON_MOLINOS = '00000000-0000-0000-0000-0000000000c2';
export const CENTER_PLATON_TERESAS_2 = '00000000-0000-0000-0000-0000000000c3';

export const MOCK_CENTERS: CenterDto[] = [
  {
    id: CENTER_PLATON_TERESAS,
    organizationId: ORG_ID,
    slug: 'platon-teresas',
    name: 'Platón Teresas',
    address: undefined,
    phone: undefined,
    email: undefined,
    active: true,
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-01T08:00:00.000Z',
  },
  {
    id: CENTER_PLATON_MOLINOS,
    organizationId: ORG_ID,
    slug: 'platon-molinos',
    name: 'Platón Molinos',
    address: undefined,
    phone: undefined,
    email: undefined,
    active: true,
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-01T08:00:00.000Z',
  },
  {
    id: CENTER_PLATON_TERESAS_2,
    organizationId: ORG_ID,
    slug: 'platon-teresas-2',
    name: 'Platón Teresas 2',
    address: undefined,
    phone: undefined,
    email: undefined,
    active: true,
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-01T08:00:00.000Z',
  },
];
