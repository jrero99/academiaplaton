import { useState, useEffect, useMemo } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { AuthUser } from '@/features/auth/types';
import type { ClockEntry } from '../types';
import {
  getCurrentEntry,
  isClockedIn,
  formatDuration,
  formatTime,
  isSameDay,
} from '../lib/clocking';
import { useTranslation } from '@/contexts/LanguageContext';

type ClockOutState = 'idle' | 'confirming' | 'loading' | 'success';

interface Props {
  entries: ClockEntry[];
  currentUser: AuthUser;
  onClockIn: (teacherId: string) => void;
  onClockOut: (entryId: string) => void;
}

export function TeacherClockCard({ entries, currentUser, onClockIn, onClockOut }: Props) {
  const { t, locale } = useTranslation();
  const teacherId = currentUser.teacherId ?? '';
  const openEntry = getCurrentEntry(entries, teacherId);
  const clockedIn = isClockedIn(entries, teacherId);

  const dateLong = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [locale],
  );

  // clockOutState se resetea a 'idle' implícitamente: cuando clockedIn pasa a false
  // (porque el parent muta la entry) el estado 'confirming'/'loading' ya no tiene sentido.
  const [clockOutState, setClockOutState] = useState<ClockOutState>('idle');
  // Marca de tiempo del render actual: se actualiza cada minuto para refrescar duraciones.
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!clockedIn) return;
    const id = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(id);
  }, [clockedIn]);

  // Estado efectivo: si el usuario ya no está fichado, cualquier estado intermedio
  // del flujo se colapsa a 'idle' sin necesidad de un efecto con setState.
  const effectiveClockOutState: ClockOutState = !clockedIn && clockOutState !== 'success'
    ? 'idle'
    : clockOutState;

  function handleClockIn() {
    if (!teacherId) return;
    onClockIn(teacherId);
  }

  function handleRequestClockOut() {
    setClockOutState('confirming');
  }

  function handleCancelClockOut() {
    setClockOutState('idle');
  }

  function handleConfirmClockOut() {
    if (!openEntry) return;
    setClockOutState('loading');
    setTimeout(() => {
      onClockOut(openEntry.id);
      setClockOutState('success');
      setTimeout(() => setClockOutState('idle'), 2000);
    }, 400);
  }

  const today = new Date(nowMs);
  const todayEntries = entries
    .filter((e) => e.teacherId === teacherId && isSameDay(new Date(e.clockIn), today))
    .sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime());

  const todayTotalMinutes = todayEntries.reduce((acc, e) => {
    const start = new Date(e.clockIn).getTime();
    const end = e.clockOut ? new Date(e.clockOut).getTime() : nowMs;
    return acc + Math.max(0, Math.floor((end - start) / 60000));
  }, 0);

  const todayTotalHours = Math.floor(todayTotalMinutes / 60);
  const todayTotalMins = todayTotalMinutes % 60;
  const todayTotalLabel =
    todayTotalHours === 0
      ? `${todayTotalMins}m`
      : todayTotalMins === 0
        ? `${todayTotalHours}h`
        : `${todayTotalHours}h ${todayTotalMins}m`;

  const clockOutSuccessTime = effectiveClockOutState === 'success' ? formatTime(new Date(nowMs).toISOString()) : '';

  return (
    <div className="mx-auto max-w-md w-full">
      <div className="rounded-xl border bg-card shadow-sm p-6 flex flex-col gap-6">
        {/* Cabecera */}
        <div className="flex flex-col gap-0.5">
          <p className="text-lg font-semibold">
            {currentUser.firstName} {currentUser.lastName}
          </p>
          <p className="text-sm text-muted-foreground capitalize">
            {dateLong.format(today)}
          </p>
        </div>

        {/* Estado actual */}
        <div className="flex items-center gap-2">
          {clockedIn && openEntry ? (
            <Badge className="px-3 py-1 text-sm bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
              {t('clocking.card.clocked_in_since', { time: formatTime(openEntry.clockIn) })}
            </Badge>
          ) : (
            <Badge variant="secondary" className="px-3 py-1 text-sm">
              {t('clocking.card.not_clocked_in')}
            </Badge>
          )}
        </div>

        {/* Bloque de confirmación de salida */}
        {effectiveClockOutState === 'confirming' && openEntry && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 flex flex-col gap-3">
            <p className="text-sm font-medium text-destructive">
              {t('clocking.card.confirm_clockout_question')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('clocking.card.you_have_been_inside')}{' '}
              <strong>{formatDuration(openEntry.clockIn, null, nowMs)}</strong>
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="h-10"
                onClick={handleConfirmClockOut}
              >
                {t('clocking.card.yes_clockout')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-10"
                onClick={handleCancelClockOut}
              >
                {t('clocking.card.cancel')}
              </Button>
            </div>
          </div>
        )}

        {effectiveClockOutState === 'loading' && (
          <p className="text-sm text-muted-foreground">{t('clocking.card.registering_exit')}</p>
        )}

        {effectiveClockOutState === 'success' && (
          <div className="rounded-md border border-border bg-muted/50 p-3">
            <p className="text-sm font-medium">
              {t('clocking.card.exit_registered_at', { time: clockOutSuccessTime })}
            </p>
          </div>
        )}

        {/* Botones de entrada / salida */}
        {effectiveClockOutState === 'idle' && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="h-14 sm:h-12 text-base sm:text-sm font-semibold"
              variant={clockedIn ? 'outline' : 'default'}
              disabled={clockedIn}
              onClick={handleClockIn}
              aria-label={t('clocking.card.aria_clockin')}
            >
              <LogIn className="h-5 w-5 mr-2" />
              {t('clocking.card.clockin_button')}
            </Button>
            <Button
              className="h-14 sm:h-12 text-base sm:text-sm font-semibold"
              variant={clockedIn ? 'destructive' : 'outline'}
              disabled={!clockedIn}
              onClick={handleRequestClockOut}
              aria-label={t('clocking.card.aria_clockout')}
            >
              <LogOut className="h-5 w-5 mr-2" />
              {t('clocking.card.clockout_button')}
            </Button>
          </div>
        )}

        <Separator />

        {/* Historial de hoy */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold">{t('clocking.card.today_log')}</p>

          {todayEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('clocking.card.not_clocked_today')}</p>
          ) : (
            <>
              <ul className="flex flex-col gap-1.5">
                {todayEntries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatTime(e.clockIn)} — {e.clockOut ? formatTime(e.clockOut) : t('clocking.in_progress_short')}
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatDuration(e.clockIn, e.clockOut, nowMs)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between text-sm font-semibold border-t pt-2">
                <span>{t('clocking.card.total_today')}</span>
                <span className="tabular-nums">{todayTotalLabel}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
