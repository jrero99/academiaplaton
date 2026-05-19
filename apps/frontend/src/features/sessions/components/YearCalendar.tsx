import { useMemo } from 'react';
import type { SessionDto } from '@academiaplaton/shared';
import {
  addDays,
  getMonthGridRowCount,
  getMonthGridStart,
  isSameIsoDate,
  monthShortLabel,
  toIsoDate,
} from '../lib/week';

const DAY_HEADER_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

interface Props {
  year: number;
  sessions: SessionDto[];
  onDayClick: (date: Date) => void;
  onMonthClick: (monthDate: Date) => void;
}

function intensityClass(count: number): string {
  if (count === 0) return 'bg-muted/40 text-muted-foreground hover:bg-muted';
  if (count === 1) return 'bg-primary/20 text-foreground hover:bg-primary/30';
  if (count <= 3) return 'bg-primary/45 text-primary-foreground hover:bg-primary/55';
  return 'bg-primary text-primary-foreground hover:bg-primary/90';
}

export function YearCalendar({ year, sessions, onDayClick, onMonthClick }: Props) {
  // Count de sesiones por iso-date
  const countByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      map.set(s.date, (map.get(s.date) ?? 0) + 1);
    }
    return map;
  }, [sessions]);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => new Date(year, i, 1)), [year]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {months.map((monthDate) => (
        <MiniMonth
          key={monthDate.getMonth()}
          monthDate={monthDate}
          countByDate={countByDate}
          onDayClick={onDayClick}
          onMonthClick={onMonthClick}
        />
      ))}
    </div>
  );
}

function MiniMonth({
  monthDate,
  countByDate,
  onDayClick,
  onMonthClick,
}: {
  monthDate: Date;
  countByDate: Map<string, number>;
  onDayClick: (date: Date) => void;
  onMonthClick: (monthDate: Date) => void;
}) {
  const gridStart = getMonthGridStart(monthDate);
  const rowCount = getMonthGridRowCount(monthDate);
  const currentMonth = monthDate.getMonth();
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
    <div className="rounded-lg border bg-card shadow-sm p-3">
      <button
        type="button"
        onClick={() => onMonthClick(monthDate)}
        className="block w-full text-left text-sm font-semibold mb-2 hover:text-primary transition-colors"
        aria-label={`Ver vista mensual de ${monthShortLabel(currentMonth)} ${monthDate.getFullYear()}`}
      >
        {monthShortLabel(currentMonth)} {monthDate.getFullYear()}
      </button>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAY_HEADER_LABELS.map((label, i) => (
          <div
            key={i}
            className="text-[9px] text-center text-muted-foreground font-medium"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map(({ date, iso }) => {
          const isCurrentMonth = date.getMonth() === currentMonth;
          if (!isCurrentMonth) {
            return <div key={iso} aria-hidden="true" className="aspect-square" />;
          }
          const count = countByDate.get(iso) ?? 0;
          const isToday = isSameIsoDate(date, today);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onDayClick(date)}
              className={
                `aspect-square rounded-sm text-[10px] font-medium tabular-nums transition-colors ` +
                intensityClass(count) +
                (isToday ? ' ring-1 ring-foreground' : '')
              }
              aria-label={`${date.getDate()} de ${monthShortLabel(currentMonth)}, ${count} sesiones`}
              title={count === 0 ? 'Sin sesiones' : `${count} sesión${count === 1 ? '' : 'es'}`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
