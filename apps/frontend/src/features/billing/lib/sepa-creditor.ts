// Datos del acreedor para la generación de remesas SEPA (formato BBVA Net Cash).
// En el modelo multi-tenant final estos datos vivirán en `Organization`; mientras
// no exista esa configuración, los hardcodeamos para Plató.

export interface SepaCreditor {
  identifier: string; // ES + CC + sufijo-NIF
  name: string;
  bbvaOffice: string; // 4 cifras
  iban: string; // sin espacios
  currency: 'EUR';
}

export const PLATO_CREDITOR: SepaCreditor = {
  identifier: 'ES45000J22564140',
  name: "CENTRE D ESTUDIS PLATO SCP",
  bbvaOffice: '4567',
  iban: 'ES2001824567150200375274',
  currency: 'EUR',
};
