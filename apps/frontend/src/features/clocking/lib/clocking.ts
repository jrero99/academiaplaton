import type { ClockEntry } from '../types';

export function getCurrentEntry(entries: ClockEntry[], teacherId: string): ClockEntry | null {
  return entries.find((e) => e.teacherId === teacherId && e.clockOut === null) ?? null;
}

export function isClockedIn(entries: ClockEntry[], teacherId: string): boolean {
  return getCurrentEntry(entries, teacherId) !== null;
}

// nowMs permite inyectar el instante actual desde el componente (evita Date.now() impuro
// dentro del render). Si endIso es null y nowMs no se pasa, se usa la fecha de clockIn
// como base mínima (duración 0) — en la práctica siempre se pasa nowMs cuando endIso es null.
export function formatDuration(startIso: string, endIso: string | null, nowMs?: number): string {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : (nowMs ?? start);
  const totalMinutes = Math.max(0, Math.floor((end - start) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const suffix = endIso === null ? ' (en curso)' : '';

  if (hours === 0) return `${minutes}m${suffix}`;
  if (minutes === 0) return `${hours}h${suffix}`;
  return `${hours}h ${minutes}m${suffix}`;
}

export function entriesForRange(entries: ClockEntry[], from: Date, to: Date): ClockEntry[] {
  const fromMs = from.getTime();
  const toMs = to.getTime();
  return entries.filter((e) => {
    const t = new Date(e.clockIn).getTime();
    return t >= fromMs && t <= toMs;
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
