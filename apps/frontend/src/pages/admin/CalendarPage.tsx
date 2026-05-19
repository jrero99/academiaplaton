import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { SessionDto } from '@academiaplaton/shared';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/PageHeader';
import { MOCK_GROUPS } from '@/features/groups/data/mock-groups';
import { MOCK_TEACHERS } from '@/features/teachers/data/mock-teachers';
import { MOCK_SESSIONS } from '@/features/sessions/data/mock-sessions';
import { WeekCalendar } from '@/features/sessions/components/WeekCalendar';
import {
  SessionSheet,
  type SessionFormValues,
} from '@/features/sessions/components/SessionSheet';
import {
  addDays,
  formatWeekRange,
  getMondayOf,
  minutesToTime,
  timeToMinutes,
  toIsoDate,
} from '@/features/sessions/lib/week';

// MVP: una sola sede mientras no haya endpoint de centros wired.
// Cuando se conecte el backend, este array vendrá de useCenters().
const CENTERS = [
  { id: '00000000-0000-0000-0000-0000000000c1', name: 'Plató — Sabadell' },
];

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
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()));
  const [sessions, setSessions] = useState<SessionDto[]>(MOCK_SESSIONS);
  const [sheet, setSheet] = useState<SheetState>({ open: false });
  const [error, setError] = useState<string | null>(null);

  const weekDays = 6; // L-S
  const weekEndExclusive = addDays(weekStart, weekDays);
  const weekStartIso = toIsoDate(weekStart);
  const weekEndIso = toIsoDate(weekEndExclusive);

  const centerGroups = useMemo(
    () => MOCK_GROUPS.filter((g) => g.centerId === centerId),
    [centerId],
  );

  const visibleSessions = useMemo(
    () =>
      sessions.filter(
        (s) => s.centerId === centerId && s.date >= weekStartIso && s.date < weekEndIso,
      ),
    [sessions, centerId, weekStartIso, weekEndIso],
  );

  function goPrev() {
    setWeekStart((w) => addDays(w, -7));
  }
  function goNext() {
    setWeekStart((w) => addDays(w, 7));
  }
  function goToday() {
    setWeekStart(getMondayOf(new Date()));
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

  // Mover una sesión a otra fecha/hora preservando su duración. Aplica conflict
  // check con la misma lógica que el alta manual.
  function handleSessionDrop(args: { sessionId: string; date: string; startTime: string }) {
    const current = sessions.find((s) => s.id === args.sessionId);
    if (!current) return;

    const durationMin = timeToMinutes(current.endTime) - timeToMinutes(current.startTime);
    const newStartMin = timeToMinutes(args.startTime);
    const newEndMin = newStartMin + durationMin;

    // Si la sesión no cambia (mismo día y misma hora), no hacemos nada
    if (current.date === args.date && current.startTime === args.startTime) return;

    // Si se saldría del rango visible (22:00), avisamos y abortamos
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

  return (
    <>
      <PageHeader
        title="Calendario"
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Calendario' }]}
      />

      {/* Barra superior: centro + navegación semanal */}
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

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goPrev} aria-label="Semana anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToday}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={goNext} aria-label="Semana siguiente">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 text-sm font-medium tabular-nums">
            {formatWeekRange(weekStart, weekDays)}
          </span>
        </div>

        <Button
          onClick={() => openCreate(toIsoDate(weekStart), '18:00')}
          aria-label="Nueva sesión"
        >
          <Plus className="h-4 w-4" />
          Nueva sesión
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <WeekCalendar
        weekStart={weekStart}
        sessions={visibleSessions}
        groups={centerGroups}
        teachers={MOCK_TEACHERS}
        dayCount={weekDays}
        onCellClick={({ date, startTime }) => openCreate(date, startTime)}
        onSessionClick={openEdit}
        onSessionDrop={handleSessionDrop}
      />

      <p className="mt-3 text-xs text-muted-foreground">
        Click en una celda vacía para crear una sesión. Click en un bloque para editarla o eliminarla.
        Arrastra un bloque a otro slot para moverlo (snap a 15 min).
      </p>

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
