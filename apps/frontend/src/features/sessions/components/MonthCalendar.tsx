import { useMemo } from 'react';
import type { GroupDto, SessionDto } from '@academiaplaton/shared';
import {
  addDays,
  getMonthGridRowCount,
  getMonthGridStart,
  isSameIsoDate,
  startOfMonth,
  teacherColor,
  toIsoDate,
} from '../lib/week';

const DAY_HEADER_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MAX_PILLS_PER_DAY = 3;

interface Props {
  monthDate: Date; // cualquier fecha dentro del mes a mostrar
  sessions: SessionDto[];
  groups: GroupDto[];
  onDayClick: (date: Date) => void;
}

export function MonthCalendar({ monthDate, sessions, groups, onDayClick }: Props) {
  const gridStart = useMemo(() => getMonthGridStart(monthDate), [monthDate]);
  const rowCount = useMemo(() => getMonthGridRowCount(monthDate), [monthDate]);
  const currentMonth = startOfMonth(monthDate).getMonth();

  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  // Sesiones agrupadas por iso de fecha
  const sessionsByDay = useMemo(() => {
    const map = new Map<string, SessionDto[]>();
    for (const s of sessions) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    // Ordenar cada día por hora de inicio
    for (const list of map.values()) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [sessions]);

  const today = new Date();

  const cells = useMemo(() => {
    const out: { date: Date; iso: string }[] = [];
    for (let i = 0; i < rowCount * 7; i++) {
      const d = addDays(gridStart, i);
      out.push({ date: d, iso: toIsoDate(d) });
    }
    return out;
  }, [gridStart, rowCount]);

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Cabecera de días de la semana */}
      <div className="grid grid-cols-7 bg-muted border-b">
        {DAY_HEADER_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Grid de celdas */}
      <div
        className="grid grid-cols-7"
        style={{ gridAutoRows: 'minmax(110px, 1fr)' }}
      >
        {cells.map(({ date, iso }) => {
          const isCurrentMonth = date.getMonth() === currentMonth;
          const isToday = isSameIsoDate(date, today);
          const daySessions = sessionsByDay.get(iso) ?? [];
          const visiblePills = daySessions.slice(0, MAX_PILLS_PER_DAY);
          const overflow = daySessions.length - visiblePills.length;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onDayClick(date)}
              className={
                'flex flex-col items-stretch border-r border-b last:border-r-0 p-1.5 text-left hover:bg-accent/30 transition-colors ' +
                (!isCurrentMonth ? 'bg-muted/30 text-muted-foreground ' : '')
              }
              aria-label={`Día ${date.getDate()} de ${date.toLocaleString('es', { month: 'long' })}, ${daySessions.length} sesiones`}
            >
              <span
                className={
                  'self-end text-xs tabular-nums mb-1 ' +
                  (isToday
                    ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold'
                    : isCurrentMonth
                      ? 'text-foreground font-medium'
                      : '')
                }
              >
                {date.getDate()}
              </span>

              <div className="flex flex-col gap-0.5 overflow-hidden">
                {visiblePills.map((s) => {
                  const group = groupById.get(s.groupId);
                  const color = teacherColor(s.teacherId);
                  return (
                    <div
                      key={s.id}
                      className="rounded px-1.5 py-0.5 text-[10px] leading-tight truncate border-l-2"
                      style={{
                        backgroundColor: color.bg,
                        borderLeftColor: color.border,
                        color: color.text,
                      }}
                      title={`${group?.name ?? 'Grupo'} · ${s.startTime}–${s.endTime}`}
                    >
                      <span className="font-medium tabular-nums">{s.startTime}</span>{' '}
                      {group?.name ?? '—'}
                    </div>
                  );
                })}
                {overflow > 0 && (
                  <div className="text-[10px] text-muted-foreground pl-1.5">
                    +{overflow} más
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
