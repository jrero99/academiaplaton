import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { SessionDto } from '@academiaplaton/shared';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/PageHeader';
import { MOCK_GROUPS } from '@/features/groups/data/mock-groups';
import { MOCK_TEACHERS } from '@/features/teachers/data/mock-teachers';
import { MOCK_SESSIONS } from '@/features/sessions/data/mock-sessions';
import { MOCK_CENTERS } from '@/features/centers/data/mock-centers';
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
import { useCurrentUser } from '@/contexts/AuthContext';
import { userHasRole, userCanActAsTeacher } from '@/features/auth/lib/permissions';
import { useTranslation } from '@/contexts/LanguageContext';
import { AttendanceSheet } from '@/features/attendance/components/AttendanceSheet';
import { MOCK_STUDENTS } from '@/features/students/data/mock-students';

// Listado activo de academias (centros). Mientras no haya backend wired,
// viene de mock-centers. Filtramos inactivas para no permitir crear
// sesiones en una academia archivada.
const CENTERS = MOCK_CENTERS.filter((c) => c.active);

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
  const { t } = useTranslation();
  const currentUser = useCurrentUser();
  // Un teacher puro ve solo sus sesiones (solo lectura).
  // Un admin/manager que también enseña (roles múltiples) puede editar.
  const isOnlyTeacher =
    currentUser.roles.length === 1 && userHasRole(currentUser, 'teacher');
  const canEdit = !isOnlyTeacher;

  // Centros que puede ver: admin todos; los demás, solo el suyo.
  // Un admin con teacherId tampoco tiene centerId → ve todos (rol admin prevalece).
  const accessibleCenters = useMemo(() => {
    if (userHasRole(currentUser, 'admin')) return CENTERS;
    return CENTERS.filter((c) => c.id === currentUser.centerId);
  }, [currentUser]);

  const [centerId, setCenterId] = useState<string>(
    accessibleCenters[0]?.id ?? CENTERS[0]!.id,
  );
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [sessions, setSessions] = useState<SessionDto[]>(MOCK_SESSIONS);
  const [sheet, setSheet] = useState<SheetState>({ open: false });
  const [attendanceSheet, setAttendanceSheet] = useState<{ open: boolean; session?: SessionDto }>({ open: false });
  const [error, setError] = useState<string | null>(null);

  // Usuarios multi-rol con vínculo a Teacher (admin+teacher, manager+teacher):
  // por defecto ven TODAS las sesiones del centro (alcance admin/manager) y
  // pueden activar "Solo mis clases" para filtrar por su teacherId.
  // Un teacher puro siempre ve solo las suyas (no hay toggle).
  const canToggleOwnSessions =
    !isOnlyTeacher && userCanActAsTeacher(currentUser);
  const [onlyMine, setOnlyMine] = useState(false);
  const filterByOwnTeacher = isOnlyTeacher || (canToggleOwnSessions && onlyMine);

  // Posiciones derivadas según el modo
  const weekStart = useMemo(() => getMondayOf(currentDate), [currentDate]);
  const monthGridStart = useMemo(() => getMonthGridStart(currentDate), [currentDate]);
  const monthRowCount = useMemo(() => getMonthGridRowCount(currentDate), [currentDate]);
  const year = currentDate.getFullYear();

  const centerGroups = useMemo(
    () => MOCK_GROUPS.filter((g) => g.centerId === centerId),
    [centerId],
  );

  // Sesiones visibles según el modo y el centro.
  // Si filterByOwnTeacher está activo (teacher puro, o multi-rol con toggle ON),
  // filtramos además por su teacherId.
  const visibleSessions = useMemo(() => {
    const inCenterAndTeacher = (s: SessionDto) =>
      s.centerId === centerId &&
      (!filterByOwnTeacher || s.teacherId === currentUser.teacherId);

    if (viewMode === 'week') {
      const startIso = toIsoDate(weekStart);
      const endIso = toIsoDate(addDays(weekStart, WEEK_DAYS));
      return sessions.filter(
        (s) => inCenterAndTeacher(s) && s.date >= startIso && s.date < endIso,
      );
    }
    if (viewMode === 'month') {
      const startIso = toIsoDate(monthGridStart);
      const endIso = toIsoDate(addDays(monthGridStart, monthRowCount * 7));
      return sessions.filter(
        (s) => inCenterAndTeacher(s) && s.date >= startIso && s.date < endIso,
      );
    }
    // year
    const startIso = toIsoDate(new Date(year, 0, 1));
    const endIso = toIsoDate(new Date(year + 1, 0, 1));
    return sessions.filter(
      (s) => inCenterAndTeacher(s) && s.date >= startIso && s.date < endIso,
    );
  }, [sessions, centerId, viewMode, weekStart, monthGridStart, monthRowCount, year, filterByOwnTeacher, currentUser.teacherId]);

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
    if (!canEdit) return;
    setError(null);
    setSheet({ open: true, mode: 'create', date, startTime });
  }

  function openEdit(session: SessionDto) {
    // Si el usuario actúa como profesor titular de la sesión (teacher puro o
    // multi-rol con vínculo a Teacher), el click abre "Pasar lista" en lugar
    // del formulario de edición de sesión.
    const isOwnSession =
      userCanActAsTeacher(currentUser) && session.teacherId === currentUser.teacherId;
    if (isOwnSession) {
      setError(null);
      setAttendanceSheet({ open: true, session });
      return;
    }
    if (!canEdit) return;
    setError(null);
    setSheet({ open: true, mode: 'edit', session });
  }

  function openAttendance(session: SessionDto) {
    setError(null);
    setSheet({ open: false });
    setAttendanceSheet({ open: true, session });
  }

  function handleSubmit(data: SessionFormValues) {
    const group = centerGroups.find((g) => g.id === data.groupId);
    if (!group) {
      setError(t('calendar.error.group_not_found'));
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
      const isGroupConflict = conflict.groupId === candidate.groupId;
      setError(
        isGroupConflict
          ? t('calendar.error.overlap_group', { group: conflictGroup?.name ?? '', start: conflict.startTime, end: conflict.endTime, date: conflict.date })
          : t('calendar.error.overlap_teacher', { group: conflictGroup?.name ?? '', start: conflict.startTime, end: conflict.endTime, date: conflict.date }),
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
      const [sh, sm] = data.startTime.split(':').map(Number) as [number, number];
      const [eh, em] = data.endTime.split(':').map(Number) as [number, number];
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
        status: 'scheduled',
        durationMinutes: (eh * 60 + em) - (sh * 60 + sm),
        rateSnapshot: 0,
        classTypeSnapshot: 'GRUPAL',
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
    if (!canEdit) return;
    const current = sessions.find((s) => s.id === args.sessionId);
    if (!current) return;

    const durationMin = timeToMinutes(current.endTime) - timeToMinutes(current.startTime);
    const newStartMin = timeToMinutes(args.startTime);
    const newEndMin = newStartMin + durationMin;

    if (current.date === args.date && current.startTime === args.startTime) return;

    if (newEndMin > 22 * 60) {
      setError(t('calendar.error.out_of_range', { time: minutesToTime(newEndMin) }));
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
      const isGroupConflict = conflict.groupId === candidate.groupId;
      setError(
        isGroupConflict
          ? t('calendar.error.overlap_group', { group: conflictGroup?.name ?? '', start: conflict.startTime, end: conflict.endTime, date: conflict.date })
          : t('calendar.error.overlap_teacher', { group: conflictGroup?.name ?? '', start: conflict.startTime, end: conflict.endTime, date: conflict.date }),
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
    viewMode === 'week' ? t('calendar.prev_week') : viewMode === 'month' ? t('calendar.prev_month') : t('calendar.prev_year');
  const nextAriaLabel =
    viewMode === 'week' ? t('calendar.next_week') : viewMode === 'month' ? t('calendar.next_month') : t('calendar.next_year');

  return (
    <>
      <PageHeader
        title={t('calendar.title')}
        breadcrumbs={[{ label: t('breadcrumb.admin'), to: '/admin' }, { label: t('calendar.title') }]}
      />

      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label htmlFor="calendar-center" className="text-sm font-medium text-muted-foreground">
            {t('calendar.center_label')}
          </label>
          {accessibleCenters.length > 1 ? (
            <select
              id="calendar-center"
              value={centerId}
              onChange={(e) => setCenterId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {accessibleCenters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <span id="calendar-center" className="text-sm font-medium">
              {accessibleCenters[0]?.name ?? t('common.dash')}
            </span>
          )}

          {canToggleOwnSessions && (
            <label className="ml-4 inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={(e) => setOnlyMine(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              {t('calendar.only_mine')}
            </label>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          {/* Selector de vista */}
          <div
            role="group"
            aria-label={t('calendar.view_aria')}
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
                {m === 'week' ? t('calendar.view.week') : m === 'month' ? t('calendar.view.month') : t('calendar.view.year')}
              </button>
            ))}
          </div>

          {/* Navegación */}
          <Button variant="outline" size="icon" onClick={goPrev} aria-label={prevAriaLabel}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToday}>
            {t('calendar.today')}
          </Button>
          <Button variant="outline" size="icon" onClick={goNext} aria-label={nextAriaLabel}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 text-sm font-medium tabular-nums">{navLabel}</span>
        </div>

        {viewMode === 'week' && canEdit && (
          <Button
            onClick={() => openCreate(toIsoDate(weekStart), '18:00')}
            aria-label={t('calendar.new_session')}
            className="self-start"
          >
            <Plus className="h-4 w-4" />
            {t('calendar.new_session')}
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

      {/* Aviso en pantallas muy pequeñas donde el calendario se desborda */}
      <p className="mb-3 text-xs text-muted-foreground sm:hidden">
        {t('calendar.small_screen_hint')}
      </p>

      <div className="overflow-x-auto">
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
              {isOnlyTeacher
                ? t('calendar.week_hint_teacher')
                : filterByOwnTeacher
                  ? t('calendar.week_hint_own_filter')
                  : t('calendar.week_hint_admin')}
            </p>
          </>
        )}

        {viewMode === 'month' && (
          <>
            <MonthCalendar
              monthDate={currentDate}
              sessions={visibleSessions}
              groups={centerGroups}
              teachers={MOCK_TEACHERS}
              onDayClick={handleDayClick}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              {t('calendar.month_hint')}
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
              {t('calendar.year_hint')}
            </p>
          </>
        )}
      </div>

      <SessionSheet
        open={sheet.open}
        onOpenChange={(open) => { if (!open) setSheet({ open: false }); }}
        mode={sheet.open ? sheet.mode : 'create'}
        session={sheet.open && sheet.mode === 'edit' ? sheet.session : undefined}
        initialDate={sheet.open && sheet.mode === 'create' ? sheet.date : undefined}
        initialStartTime={sheet.open && sheet.mode === 'create' ? sheet.startTime : undefined}
        groups={centerGroups}
        teachers={MOCK_TEACHERS}
        existingSessions={sessions.filter((s) => s.centerId === centerId)}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        onTakeAttendance={
          sheet.open && sheet.mode === 'edit'
            ? () => openAttendance((sheet as { session: SessionDto }).session)
            : undefined
        }
      />

      {attendanceSheet.open && attendanceSheet.session && (() => {
        const s = attendanceSheet.session;
        const group = MOCK_GROUPS.find((g) => g.id === s.groupId);
        const teacher = MOCK_TEACHERS.find((t) => t.id === s.teacherId);
        if (!group || !teacher) return null;
        const groupStudents = MOCK_STUDENTS.filter((st) => group.studentIds.includes(st.id));
        const canEditAttendance =
          (userCanActAsTeacher(currentUser) && s.teacherId === currentUser.teacherId) ||
          userHasRole(currentUser, 'admin') ||
          userHasRole(currentUser, 'center_manager');
        return (
          <AttendanceSheet
            key={s.id}
            open={attendanceSheet.open}
            onOpenChange={(open) => { if (!open) setAttendanceSheet({ open: false }); }}
            session={s}
            group={group}
            teacher={teacher}
            students={groupStudents}
            readOnly={!canEditAttendance}
            markedByUserId={currentUser.id}
          />
        );
      })()}
    </>
  );
}
