import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { GroupAttendanceHistoryEntryDto } from '@academiaplaton/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MOCK_TEACHERS } from '@/features/teachers/data/mock-teachers';
import { getGroupAttendanceHistory } from '../data/mock-attendance';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatShortDate(isoDate: string, locale: string): string {
  const [year, month, day] = isoDate.split('-').map(Number) as [number, number, number];
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

function teacherName(teacherId: string): string {
  const tch = MOCK_TEACHERS.find((t) => t.id === teacherId);
  return tch ? `${tch.firstName} ${tch.lastName}` : '—';
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel de detalle expandible de una entrada
// ─────────────────────────────────────────────────────────────────────────────

function EntryDetail({ entry }: { entry: GroupAttendanceHistoryEntryDto }) {
  const { t } = useTranslation();
  const present = entry.marks.filter((m) => m.status === 'present');
  const justifiedAbsent = entry.marks.filter((m) => m.status === 'absent' && m.justified);
  const unjustifiedAbsent = entry.marks.filter((m) => m.status === 'absent' && !m.justified);

  return (
    <div className="bg-muted/40 rounded-md p-4 grid sm:grid-cols-3 gap-4 text-sm">
      {/* Presentes */}
      <div>
        <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
          {t('attendance.history.presences_label', { count: present.length })}
        </p>
        {present.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">{t('attendance.history.none_m')}</p>
        ) : (
          <ul className="space-y-0.5">
            {present.map((m) => (
              <li key={m.studentId} className="text-xs">
                {m.firstName} {m.lastName}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ausentes justificadas */}
      <div>
        <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
          {t('attendance.history.justified_label', { count: justifiedAbsent.length })}
        </p>
        {justifiedAbsent.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">{t('attendance.history.none_f')}</p>
        ) : (
          <ul className="space-y-2">
            {justifiedAbsent.map((m) => (
              <li key={m.studentId} className="text-xs">
                <span className="font-medium">
                  {m.firstName} {m.lastName}
                </span>
                {m.justification && (
                  <p className="text-muted-foreground mt-0.5 pl-2 border-l border-border">
                    {m.justification}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ausentes sin justificar */}
      <div>
        <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
          {t('attendance.history.unjustified_label', { count: unjustifiedAbsent.length })}
        </p>
        {unjustifiedAbsent.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">{t('attendance.history.none_f')}</p>
        ) : (
          <ul className="space-y-0.5">
            {unjustifiedAbsent.map((m) => (
              <li key={m.studentId} className="text-xs">
                {m.firstName} {m.lastName}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fila de la tabla
// ─────────────────────────────────────────────────────────────────────────────

function HistoryRow({ entry }: { entry: GroupAttendanceHistoryEntryDto }) {
  const { t, locale } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className={cn(
          'border-b border-border transition-colors',
          expanded ? 'bg-muted/30' : 'hover:bg-muted/20',
        )}
      >
        {/* Fecha */}
        <td className="py-2.5 px-3 text-sm whitespace-nowrap">
          {formatShortDate(entry.date, locale)}
        </td>

        {/* Horario */}
        <td className="py-2.5 px-3 text-sm text-muted-foreground whitespace-nowrap">
          {entry.startTime}–{entry.endTime}
        </td>

        {/* Profesor (oculto en móvil) */}
        <td className="py-2.5 px-3 text-sm text-muted-foreground hidden sm:table-cell whitespace-nowrap">
          {teacherName(entry.teacherId)}
        </td>

        {/* Presentes */}
        <td className="py-2.5 px-3 text-sm text-center">
          <Badge variant="secondary" className="tabular-nums">
            {entry.totals.present}
          </Badge>
        </td>

        {/* Ausentes */}
        <td className="py-2.5 px-3 text-sm text-center">
          {entry.totals.absent > 0 ? (
            <Badge variant="destructive" className="tabular-nums">
              {entry.totals.absent}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </td>

        {/* Justificadas */}
        <td className="py-2.5 px-3 text-sm text-center">
          {entry.totals.justifiedAbsent > 0 ? (
            <Badge variant="outline" className="tabular-nums">
              {entry.totals.justifiedAbsent}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </td>

        {/* Acción (oculta en móvil pequeño, mueve a segunda fila) */}
        <td className="py-2.5 px-3 text-right hidden sm:table-cell">
          <Button
            size="icon"
            variant="ghost"
            aria-label={expanded ? t('attendance.history.collapse_aria') : t('attendance.history.expand_aria')}
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            className="h-7 w-7"
          >
            {expanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </td>
      </tr>

      {/* Fila de detalle expandida */}
      {expanded && (
        <tr>
          <td colSpan={7} className="px-3 pb-3 pt-1">
            <EntryDetail entry={entry} />
          </td>
        </tr>
      )}

      {/* Fila secundaria en móvil: profesor + botón Ver */}
      <tr className="sm:hidden border-b border-border">
        <td colSpan={6} className="px-3 pb-2 pt-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{teacherName(entry.teacherId)}</span>
            <Button
              size="sm"
              variant="ghost"
              aria-label={expanded ? t('attendance.history.collapse_aria') : t('attendance.history.expand_aria')}
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
              className="h-6 text-xs gap-1"
            >
              {expanded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {expanded ? t('attendance.history.collapse_btn') : t('attendance.history.expand_btn')}
            </Button>
          </div>
        </td>
      </tr>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel principal
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  groupId: string;
}

export function GroupAttendanceHistoryPanel({ groupId }: Props) {
  const { t } = useTranslation();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [onlyWithAbsences, setOnlyWithAbsences] = useState(false);

  const allEntries = getGroupAttendanceHistory(groupId, {
    from: fromDate || undefined,
    to: toDate || undefined,
    limit: 365,
  });

  const entries = onlyWithAbsences
    ? allEntries.filter((e) => e.totals.absent > 0)
    : allEntries;

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="att-from" className="text-xs font-medium text-muted-foreground">
            {t('attendance.history.from')}
          </label>
          <Input
            id="att-from"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="att-to" className="text-xs font-medium text-muted-foreground">
            {t('attendance.history.to')}
          </label>
          <Input
            id="att-to"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none pb-0.5">
          <input
            type="checkbox"
            checked={onlyWithAbsences}
            onChange={(e) => setOnlyWithAbsences(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary"
            aria-label={t('attendance.history.only_absences')}
          />
          {t('attendance.history.only_absences')}
        </label>
        {(fromDate || toDate || onlyWithAbsences) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setFromDate('');
              setToDate('');
              setOnlyWithAbsences(false);
            }}
            className="h-8 text-xs"
          >
            {t('attendance.history.clear')}
          </Button>
        )}
      </div>

      {/* Tabla */}
      {entries.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          {allEntries.length === 0
            ? t('attendance.history.no_sessions')
            : t('attendance.history.no_match')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="py-2 px-3 text-left font-medium text-xs text-muted-foreground">
                  {t('attendance.history.col_date')}
                </th>
                <th className="py-2 px-3 text-left font-medium text-xs text-muted-foreground">
                  {t('attendance.history.col_schedule')}
                </th>
                <th className="py-2 px-3 text-left font-medium text-xs text-muted-foreground hidden sm:table-cell">
                  {t('attendance.history.col_teacher')}
                </th>
                <th className="py-2 px-3 text-center font-medium text-xs text-muted-foreground">
                  {t('attendance.history.col_present')}
                </th>
                <th className="py-2 px-3 text-center font-medium text-xs text-muted-foreground">
                  {t('attendance.history.col_absent')}
                </th>
                <th className="py-2 px-3 text-center font-medium text-xs text-muted-foreground">
                  {t('attendance.history.col_justified')}
                </th>
                <th className="py-2 px-3 hidden sm:table-cell" aria-label={t('common.actions')} />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <HistoryRow key={entry.sessionId} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {t('attendance.history.showing', {
          count: entries.length,
          suffix: entries.length !== 1 ? 's' : '',
        })}{' '}
        {t('attendance.history.edit_hint')}
      </p>
    </div>
  );
}
