import { useMemo, useState, useEffect } from 'react';
import { UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FilterBar,
  FilterField,
  filterInputClass,
  filterSelectClass,
} from '@/components/admin/FilterBar';
import type { Teacher } from '@/features/teachers/types';
import type { ClockEntry } from '../types';
import { formatDuration, formatTime, entriesForRange } from '../lib/clocking';
import { useTranslation } from '@/contexts/LanguageContext';

interface Props {
  entries: ClockEntry[];
  teachers: Teacher[];
}

function getDefaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
}

function getDefaultTo(): string {
  return new Date().toISOString().slice(0, 10);
}

function teacherInitials(firstName: string, lastName: string): string {
  const parts = lastName.trim().split(' ');
  return `${firstName.charAt(0)}${parts[0]?.charAt(0) ?? ''}`.toUpperCase();
}

export function AdminClockingControl({ entries, teachers }: Props) {
  const { t, locale } = useTranslation();

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }),
    [locale],
  );

  // Los defaults se calculan una sola vez en el montaje del componente.
  const [initialFrom] = useState(getDefaultFrom);
  const [initialTo] = useState(getDefaultTo);

  const [teacherFilter, setTeacherFilter] = useState('');
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const hasOpenEntries = entries.some((e) => e.clockOut === null);
  useEffect(() => {
    if (!hasOpenEntries) return;
    const id = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(id);
  }, [hasOpenEntries]);

  const teacherById = useMemo(
    () => new Map(teachers.map((teacher) => [teacher.id, teacher])),
    [teachers],
  );

  // Profesores con entrada abierta ahora mismo
  const insideNow = useMemo(() => {
    const openIds = new Set(
      entries.filter((e) => e.clockOut === null).map((e) => e.teacherId),
    );
    return teachers.filter((teacher) => openIds.has(teacher.id));
  }, [entries, teachers]);

  // Entradas del clockIn de cada uno para el panel "dentro ahora"
  const openEntryByTeacher = useMemo(() => {
    const map = new Map<string, ClockEntry>();
    entries
      .filter((e) => e.clockOut === null)
      .forEach((e) => map.set(e.teacherId, e));
    return map;
  }, [entries]);

  const hasActiveFilters = teacherFilter !== '' || fromDate !== initialFrom || toDate !== initialTo;

  function clearFilters() {
    setTeacherFilter('');
    setFromDate(initialFrom);
    setToDate(initialTo);
  }

  const filtered = useMemo(() => {
    const from = new Date(fromDate + 'T00:00:00');
    const to = new Date(toDate + 'T23:59:59');
    let result = entriesForRange(entries, from, to);
    if (teacherFilter) {
      result = result.filter((e) => e.teacherId === teacherFilter);
    }
    return result.slice().sort(
      (a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime(),
    );
  }, [entries, teacherFilter, fromDate, toDate]);

  return (
    <div className="flex flex-col gap-6">
      {/* Panel "quién está dentro ahora" */}
      <div className="rounded-lg border bg-card shadow-sm p-4">
        <p className="text-sm font-semibold mb-3">{t('clocking.inside_now')}</p>
        {insideNow.length === 0 ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <UserX className="h-4 w-4 flex-shrink-0" />
            <span>{t('clocking.nobody_inside')}</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {insideNow.map((teacher) => {
              const entry = openEntryByTeacher.get(teacher.id);
              const sinceTime = entry ? formatTime(entry.clockIn) : t('clocking.since_unknown');
              return (
                <div
                  key={teacher.id}
                  title={t('clocking.tooltip_since', { time: sinceTime })}
                  aria-label={t('clocking.aria_inside_since', { name: `${teacher.firstName} ${teacher.lastName}`, time: sinceTime })}
                  className="flex items-center gap-2 rounded-full border bg-primary/5 border-primary/20 px-3 py-1.5 text-sm cursor-default select-none"
                >
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {teacherInitials(teacher.firstName, teacher.lastName)}
                  </span>
                  <span className="font-medium">
                    {teacher.firstName} {teacher.lastName}
                  </span>
                  {entry && (
                    <span className="text-muted-foreground text-xs">
                      {t('clocking.since', { time: formatTime(entry.clockIn) })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filtros */}
      <FilterBar hasActive={hasActiveFilters} onClear={clearFilters}>
        <FilterField label={t('clocking.filter.teacher')}>
          <select
            className={filterSelectClass}
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
            aria-label={t('clocking.filter.teacher_aria')}
          >
            <option value="">{t('common.all_m')}</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.firstName} {teacher.lastName}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label={t('clocking.filter.from')}>
          <input
            type="date"
            className={filterInputClass}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            aria-label={t('clocking.filter.from_aria')}
          />
        </FilterField>

        <FilterField label={t('clocking.filter.to')}>
          <input
            type="date"
            className={filterInputClass}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            aria-label={t('clocking.filter.to_aria')}
          />
        </FilterField>
      </FilterBar>

      {/* Tabla */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="w-12 text-muted-foreground hidden sm:table-cell">#</TableHead>
                <TableHead>{t('clocking.col.teacher')}</TableHead>
                <TableHead>{t('clocking.col.date')}</TableHead>
                <TableHead>{t('clocking.col.clock_in')}</TableHead>
                <TableHead>{t('clocking.col.clock_out')}</TableHead>
                <TableHead>{t('clocking.col.duration')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('common.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    {t('clocking.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((entry, idx) => {
                  const teacher = teacherById.get(entry.teacherId);
                  const isOpen = entry.clockOut === null;
                  return (
                    <TableRow key={entry.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-muted-foreground hidden sm:table-cell">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {teacher
                          ? `${teacher.firstName} ${teacher.lastName}`
                          : entry.teacherId}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {dateFmt.format(new Date(entry.clockIn))}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatTime(entry.clockIn)}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {entry.clockOut ? formatTime(entry.clockOut) : t('common.dash')}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatDuration(entry.clockIn, entry.clockOut, nowMs)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge
                          variant={isOpen ? 'default' : 'secondary'}
                          className={
                            isOpen
                              ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/10'
                              : ''
                          }
                        >
                          {isOpen ? t('clocking.status.in_progress') : t('clocking.status.completed')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
