import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { SessionDto } from '@academiaplaton/shared';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/PageHeader';
import { MOCK_GROUPS } from '@/features/groups/data/mock-groups';
import { MOCK_TEACHERS } from '@/features/teachers/data/mock-teachers';
import { MOCK_SESSIONS } from '@/features/sessions/data/mock-sessions';
import { WeekCalendar } from '@/features/sessions/components/WeekCalendar';
import { MonthCalendar } from '@/features/sessions/components/MonthCalendar';
import { YearCalendar } from '@/features/sessions/components/YearCalendar';
import {
  SessionSheet,
  type SessionFormValues,
} from '@/features/sessions/components/SessionSheet';
import {
  addDays,
  addMonths,
  addYears,
  formatMonthLabel,
  formatWeekRange,
  formatYearLabel,
  getMondayOf,
  getMonthGridRowCount,
  getMonthGridStart,
  minutesToTime,
  timeToMinutes,
  toIsoDate,
} from '@/features/sessions/lib/week';
import { cn } from '@/lib/utils';

// MVP: una sola sede mientras no haya endpoint de centros wired.
// Cuando se conecte el backend, este array vendrá de useCenters().
const CENTERS = [
  { id: '00000000-0000-0000-0000-0000000000c1', name: 'Plató — Sabadell' },
];

const WEEK_DAYS = 6; // Lun–Sáb

type ViewMode = 'week' | 'month' | 'year';

type SheetState =
  | { open: false }
  | { open: true; mode: 'create'; date: string; startTime: string }
  | { open: true; mode: 'edit'; session: SessionDto };

function detectConflict(
  candidate: { id?: string; groupId: string; teacherId: string; date: string; startTime: string; endTime: string },
  sessions: SessionDto[],
): SessionDto | null {
  return (
    sessions.find(
      (s) =>
        s.id !== candidate.id &&
        s.date === candidate.date &&
        (s.groupId === candidate.groupId || s.teacherId === candidate.teacherId) &&
        s.startTime < candidate.endTime &&
        s.endTime > candidate.startTime,
    ) ?? null
  );
}

export function CalendarPage() {
  const [centerId, setCenterId] = useState<string>(CENTERS[0]!.id);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [sessions, setSessions] = useState<SessionDto[]>(MOCK_SESSIONS);
  const [sheet, setSheet] = useState<SheetState>({ open: false });
  const [error, setError] = useState<string | null>(null);

  // Posiciones derivadas según el modo
  const weekStart = useMemo(() => getMondayOf(currentDate), [currentDate]);
  const monthGridStart = useMemo(() => getMonthGridStart(currentDate), [currentDate]);
  const monthRowCount = useMemo(() => getMonthGridRowCount(currentDate), [currentDate]);
  const year = currentDate.getFullYear();

  const centerGroups = useMemo(
    () => MOCK_GROUPS.filter((g) => g.centerId === centerId),
    [centerId],
  );

  // Sesiones visibles según el modo y el centro
  const visibleSessions = useMemo(() => {
    if (viewMode === 'week') {
      const startIso = toIsoDate(weekStart);
      const endIso = toIsoDate(addDays(weekStart, WEEK_DAYS));
      return sessions.filter(
        (s) => s.centerId === centerId && s.date >= startIso && s.date < endIso,
      );
    }
    if (viewMode === 'month') {
      const startIso = toIsoDate(monthGridStart);
      const endIso = toIsoDate(addDays(monthGridStart, monthRowCount * 7));
      return sessions.filter(
        (s) => s.centerId === centerId && s.date >= startIso && s.date < endIso,
      );
    }
    // year
    const startIso = toIsoDate(new Date(year, 0, 1));
    const endIso = toIsoDate(new Date(year + 1, 0, 1));
    return sessions.filter(
      (s) => s.centerId === centerId && s.date >= startIso && s.date < endIso,
    );
  }, [sessions, centerId, viewMode, weekStart, monthGridStart, monthRowCount, year]);

  // Navegación dependiente del modo
  function goPrev() {
    setCurrentDate((d) =>
      viewMode === 'week' ? addDays(d, -7) : viewMode === 'month' ? addMonths(d, -1) : addYears(d, -1),
    );
  }
  function goNext() {
    setCurrentDate((d) =>
      viewMode === 'week' ? addDays(d, 7) : viewMode === 'month' ? addMonths(d, 1) : addYears(d, 1),
    );
  }
  function goToday() {
    setCurrentDate(new Date());
  }

  // Click en un día desde month/year → cambia a week con esa fecha
  function handleDayClick(date: Date) {
    setCurrentDate(date);
    setViewMode('week');
  }

  // Click en el título de un mini-mes en year → cambia a month
  function handleMonthClick(monthDate: Date) {
    setCurrentDate(monthDate);
    setViewMode('month');
  }

  function openCreate(date: string, startTime: string) {
    setError(null);
    setSheet({ open: true, mode: 'create', date, startTime });
  }

  function openEdit(session: SessionDto) {
    setError(null);
    setSheet({ open: true, mode: 'edit', session });
  }

  function handleSubmit(data: SessionFormValues) {
    const group = centerGroups.find((g) => g.id === data.groupId);
    if (!group) {
      setError('Grupo no encontrado en el centro seleccionado.');
      return;
    }

    const candidate = {
      id: sheet.open && sheet.mode === 'edit' ? sheet.session.id : undefined,
      groupId: data.groupId,
      teacherId: group.teacherId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
    };

    const conflict = detectConflict(candidate, sessions);
    if (conflict) {
      const conflictGroup = MOCK_GROUPS.find((g) => g.id === conflict.groupId);
      const reason = conflict.groupId === candidate.groupId ? 'grupo' : 'profesor';
      setError(
        `Solapamiento con sesión del mismo ${reason} (${conflictGroup?.name ?? 'grupo'}, ${conflict.startTime}–${conflict.endTime} el ${conflict.date}).`,
      );
      return;
    }

    setError(null);
    const now = new Date().toISOString();

    if (sheet.open && sheet.mode === 'edit') {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sheet.session.id
            ? {
                ...s,
                groupId: data.groupId,
                teacherId: group.teacherId,
                date: data.date,
                startTime: data.startTime,
                endTime: data.endTime,
                notes: data.notes || undefined,
                updatedAt: now,
              }
            : s,
        ),
      );
    } else {
      const newSession: SessionDto = {
        id: crypto.randomUUID(),
        organizationId: '00000000-0000-0000-0000-000000000001',
        centerId,
        groupId: data.groupId,
        teacherId: group.teacherId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        notes: data.notes || undefined,
        createdAt: now,
        updatedAt: now,
      };
      setSessions((prev) => [...prev, newSession]);
    }
    setSheet({ open: false });
  }

  function handleDelete(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setSheet({ open: false });
  }

  function handleSessionDrop(args: { sessionId: string; date: string; startTime: string }) {
    const current = sessions.find((s) => s.id === args.sessionId);
    if (!current) return;

    const durationMin = timeToMinutes(current.endTime) - timeToMinutes(current.startTime);
    const newStartMin = timeToMinutes(args.startTime);
    const newEndMin = newStartMin + durationMin;

    if (current.date === args.date && current.startTime === args.startTime) return;

    if (newEndMin > 22 * 60) {
      setError(
        `No se puede mover: la sesión terminaría a las ${minutesToTime(newEndMin)}, fuera del rango del calendario.`,
      );
      return;
    }

    const newEndTime = minutesToTime(newEndMin);
    const candidate = {
      id: current.id,
      groupId: current.groupId,
      teacherId: current.teacherId,
      date: args.date,
      startTime: args.startTime,
      endTime: newEndTime,
    };

    const conflict = detectConflict(candidate, sessions);
    if (conflict) {
      const conflictGroup = MOCK_GROUPS.find((g) => g.id === conflict.groupId);
      const reason = conflict.groupId === candidate.groupId ? 'grupo' : 'profesor';
      setError(
        `Solapamiento con sesión del mismo ${reason} (${conflictGroup?.name ?? 'grupo'}, ${conflict.startTime}–${conflict.endTime} el ${conflict.date}).`,
      );
      return;
    }

    setError(null);
    const now = new Date().toISOString();
    setSessions((prev) =>
      prev.map((s) =>
        s.id === current.id
          ? { ...s, date: args.date, startTime: args.startTime, endTime: newEndTime, updatedAt: now }
          : s,
      ),
    );
  }

  // Etiqueta del navegador según el modo
  const navLabel =
    viewMode === 'week'
      ? formatWeekRange(weekStart, WEEK_DAYS)
      : viewMode === 'month'
        ? formatMonthLabel(currentDate)
        : formatYearLabel(currentDate);

  const prevAriaLabel =
    viewMode === 'week' ? 'Semana anterior' : viewMode === 'month' ? 'Mes anterior' : 'Año anterior';
  const nextAriaLabel =
    viewMode === 'week' ? 'Semana siguiente' : viewMode === 'month' ? 'Mes siguiente' : 'Año siguiente';

  return (
    <>
      <PageHeader
        title="Calendario"
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Calendario' }]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-2">
          <label htmlFor="calendar-center" className="text-sm font-medium text-muted-foreground">
            Centro
          </label>
          <select
            id="calendar-center"
            value={centerId}
            onChange={(e) => setCenterId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {CENTERS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de vista */}
          <div
            role="group"
            aria-label="Modo de vista"
            className="inline-flex items-center rounded-md border border-input bg-background p-0.5 shadow-sm"
          >
            {(['week', 'month', 'year'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                aria-pressed={viewMode === m}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded transition-colors',
                  viewMode === m
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {m === 'week' ? 'Semana' : m === 'month' ? 'Mes' : 'Año'}
              </button>
            ))}
          </div>

          {/* Navegación */}
          <Button variant="outline" size="icon" onClick={goPrev} aria-label={prevAriaLabel}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToday}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={goNext} aria-label={nextAriaLabel}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 text-sm font-medium tabular-nums">{navLabel}</span>
        </div>

        {viewMode === 'week' && (
          <Button
            onClick={() => openCreate(toIsoDate(weekStart), '18:00')}
            aria-label="Nueva sesión"
          >
            <Plus className="h-4 w-4" />
            Nueva sesión
          </Button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {viewMode === 'week' && (
        <>
          <WeekCalendar
            weekStart={weekStart}
            sessions={visibleSessions}
            groups={centerGroups}
            teachers={MOCK_TEACHERS}
            dayCount={WEEK_DAYS}
            onCellClick={({ date, startTime }) => openCreate(date, startTime)}
            onSessionClick={openEdit}
            onSessionDrop={handleSessionDrop}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Click en una celda vacía para crear una sesión. Click en un bloque para editarla o eliminarla.
            Arrastra un bloque a otro slot para moverlo (snap a 15 min).
          </p>
        </>
      )}

      {viewMode === 'month' && (
        <>
          <MonthCalendar
            monthDate={currentDate}
            sessions={visibleSessions}
            groups={centerGroups}
            onDayClick={handleDayClick}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Click en cualquier día para ir a la vista semanal correspondiente.
          </p>
        </>
      )}

      {viewMode === 'year' && (
        <>
          <YearCalendar
            year={year}
            sessions={visibleSessions}
            onDayClick={handleDayClick}
            onMonthClick={handleMonthClick}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Intensidad por día = número de sesiones. Click en el título de un mes para abrirlo;
            click en un día para ir a su semana.
          </p>
        </>
      )}

      <SessionSheet
        open={sheet.open}
        onOpenChange={(open) => { if (!open) setSheet({ open: false }); }}
        mode={sheet.open ? sheet.mode : 'create'}
        session={sheet.open && sheet.mode === 'edit' ? sheet.session : undefined}
        initialDate={sheet.open && sheet.mode === 'create' ? sheet.date : undefined}
        initialStartTime={sheet.open && sheet.mode === 'create' ? sheet.startTime : undefined}
        groups={centerGroups}
        teachers={MOCK_TEACHERS}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
      />
    </>
  );
}
