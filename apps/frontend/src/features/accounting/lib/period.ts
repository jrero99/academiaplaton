// Utilidades de manejo del `periodMonth` (formato "YYYY-MM") usado en el
// módulo de Contabilidad. Sin dependencias para que sean reutilizables desde
// hooks, pages y components.

import type { PeriodMonth } from '@academiaplaton/shared';

export function currentPeriodMonth(now: Date = new Date()): PeriodMonth {
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${y}-${m}` as PeriodMonth;
}

export function shiftPeriodMonth(period: PeriodMonth, delta: number): PeriodMonth {
  const [y, m] = period.split('-').map(Number) as [number, number];
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${nm.toString().padStart(2, '0')}` as PeriodMonth;
}

export function comparePeriodMonth(a: PeriodMonth, b: PeriodMonth): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function periodMonthToDate(period: PeriodMonth): Date {
  const [y, m] = period.split('-').map(Number) as [number, number];
  return new Date(y, m - 1, 1);
}

export function formatPeriodMonthLong(period: PeriodMonth, locale: string): string {
  const date = periodMonthToDate(period);
  const fmt = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const raw = fmt.format(date);
  // Capitaliza la primera letra (Intl en es/ca devuelve "abril 2026" → "Abril 2026").
  return raw.charAt(0).toLocaleUpperCase(locale) + raw.slice(1);
}
