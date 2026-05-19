// Utilidades de cálculo de semana sin dependencias. ISO week = lunes como
// primer día. Las fechas se manejan como strings YYYY-MM-DD para alinearse
// con el backend (@db.Date) y evitar problemas de zona horaria.

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

// Lunes de la semana que contiene `date` (ISO week, no domingo)
export function getMondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=dom, 1=lun, ..., 6=sáb
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

const DAY_LABELS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;
const MONTH_LABELS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const;

export function formatDayHeader(date: Date): string {
  // (getDay()+6)%7 mapea Dom(0)→6, Lun(1)→0, Mar(2)→1...
  return `${DAY_LABELS_ES[(date.getDay() + 6) % 7]} ${date.getDate()}`;
}

export function formatWeekRange(weekStart: Date, weekDays: number): string {
  const weekEnd = addDays(weekStart, weekDays - 1);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const sameYear = weekStart.getFullYear() === weekEnd.getFullYear();
  if (sameMonth) {
    return `${weekStart.getDate()}–${weekEnd.getDate()} ${MONTH_LABELS_ES[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
  }
  if (sameYear) {
    return `${weekStart.getDate()} ${MONTH_LABELS_ES[weekStart.getMonth()]} – ${weekEnd.getDate()} ${MONTH_LABELS_ES[weekEnd.getMonth()]} ${weekStart.getFullYear()}`;
  }
  return `${weekStart.getDate()} ${MONTH_LABELS_ES[weekStart.getMonth()]} ${weekStart.getFullYear()} – ${weekEnd.getDate()} ${MONTH_LABELS_ES[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
}

export function isSameIsoDate(a: Date, b: Date): boolean {
  return toIsoDate(a) === toIsoDate(b);
}

// Color estable derivado del id del profesor (HSL pastel)
export function teacherColor(teacherId: string): { bg: string; border: string; text: string } {
  let hash = 0;
  for (let i = 0; i < teacherId.length; i++) {
    hash = (hash << 5) - hash + teacherId.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsl(${hue} 75% 92%)`,
    border: `hsl(${hue} 60% 55%)`,
    text: `hsl(${hue} 70% 25%)`,
  };
}
