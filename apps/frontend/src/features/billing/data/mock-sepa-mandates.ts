import type { SepaMandateDto } from '@academiaplaton/shared';

const ORG_ID = '00000000-0000-0000-0000-000000000001';

// Mandatos SEPA mock. La referencia única (string corto) la marca el banco
// y suele numerarse correlativamente desde 001. Los IBAN y NIF son
// ficticios.
export const MANDATE_RIERA = '55555555-5555-5555-5555-555555555501';
export const MANDATE_FONT = '55555555-5555-5555-5555-555555555502';

export const MOCK_SEPA_MANDATES: SepaMandateDto[] = [
  {
    id: MANDATE_RIERA,
    organizationId: ORG_ID,
    reference: '003',
    holderName: 'Pere Riera Sala',
    holderTaxId: '46812345A',
    holderAddress: 'Avinguda Catalunya 45, Terrassa',
    holderEmail: 'pere.riera@example.com',
    holderPhone: '+34 666 200 109',
    iban: 'ES7621000613910200112800',
    bic: 'CAIXESBBXXX',
    mandateType: 'core',
    debitType: 'recurrent',
    status: 'active',
    signedAt: '2025-09-01',
    studentIds: ['22222222-2222-2222-2222-222222222202'],
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-01T08:00:00.000Z',
  },
  {
    id: MANDATE_FONT,
    organizationId: ORG_ID,
    reference: '006',
    holderName: 'Sergi Font Bosch',
    holderTaxId: '49876543B',
    holderAddress: undefined,
    holderEmail: 'sergi.font@example.com',
    holderPhone: '+34 696 555 014',
    iban: 'ES1421000287310102441000',
    bic: 'CAIXESBBXXX',
    mandateType: 'core',
    debitType: 'recurrent',
    status: 'active',
    signedAt: '2025-09-04',
    studentIds: ['22222222-2222-2222-2222-222222222205'],
    createdAt: '2025-09-04T08:00:00.000Z',
    updatedAt: '2025-09-04T08:00:00.000Z',
  },
];
