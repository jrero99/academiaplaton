import { useEffect, useRef, useState, useMemo } from 'react';
import type { SessionDto, GroupDto, StudentDto, AttendanceMarkResolvedDto } from '@academiaplaton/shared';
import type { Teacher } from '@/features/teachers/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getSessionAttendance, saveSessionAttendance } from '../data/mock-attendance';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos y helpers
// ─────────────────────────────────────────────────────────────────────────────

interface LocalMark {
  studentId: string;
  firstName: string;
  lastName: string;
  status: 'present' | 'absent';
  justified: boolean;
  justification: string;
}

function initMarks(resolved: AttendanceMarkResolvedDto[]): LocalMark[] {
  return resolved.map((m) => ({
    studentId: m.studentId,
    firstName: m.firstName,
    lastName: m.lastName,
    status: m.status,
    justified: m.justified,
    justification: m.justification ?? '',
  }));
}

function initials(firstName: string, lastName: string): string {
  const f = firstName.trim()[0] ?? '';
  const l = lastName.trim()[0] ?? '';
  return `${f}${l}`.toUpperCase();
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number) as [number, number, number];
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

const MAX_JUSTIFICATION = 500;

// ─────────────────────────────────────────────────────────────────────────────
// Fila individual de alumno
// ─────────────────────────────────────────────────────────────────────────────

interface StudentRowProps {
  mark: LocalMark;
  readOnly: boolean;
  onChange: (updated: Partial<LocalMark>) => void;
  rowIndex: number;
}

function StudentRow({ mark, readOnly, onChange, rowIndex }: StudentRowProps) {
  const justLen = mark.justification.length;
  const textareaId = `just-${mark.studentId}`;
  const counterId = `just-count-${mark.studentId}`;
  const presentId = `btn-present-${rowIndex}`;

  return (
    <div className="flex flex-col gap-2 py-3 border-b border-border last:border-0">
      {/* Fila principal: avatar + nombre + toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Avatar size="sm">
            <AvatarFallback className="text-xs">
              {initials(mark.firstName, mark.lastName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate">
            {mark.firstName} {mark.lastName}
          </span>
        </div>

        {readOnly ? (
          <Badge
            variant={mark.status === 'present' ? 'secondary' : mark.justified ? 'outline' : 'destructive'}
            className="shrink-0 self-start sm:self-center"
          >
            {mark.status === 'present'
              ? 'Presente'
              : mark.justified
                ? 'Ausente justificada'
                : 'Ausente'}
          </Badge>
        ) : (
          /* Toggle Presente / Ausente */
          <div
            role="group"
            aria-label={`Asistencia de ${mark.firstName} ${mark.lastName}`}
            className="inline-flex rounded-md border border-input bg-background shadow-sm shrink-0 self-start sm:self-center"
          >
            <button
              id={presentId}
              type="button"
              aria-pressed={mark.status === 'present'}
              onClick={() => onChange({ status: 'present', justified: false, justification: '' })}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-l-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                mark.status === 'present'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Presente
            </button>
            <button
              type="button"
              aria-pressed={mark.status === 'absent'}
              onClick={() => onChange({ status: 'absent' })}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-r-md border-l border-input transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                mark.status === 'absent'
                  ? 'bg-destructive text-white'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Ausente
            </button>
          </div>
        )}
      </div>

      {/* Sección de justificación (solo si ausente) */}
      {mark.status === 'absent' && (
        <div className="ml-0 sm:ml-8 flex flex-col gap-2 pl-2 border-l-2 border-muted">
          {readOnly ? (
            mark.justified ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-muted-foreground">Justificada</span>
                {mark.justification && (
                  <p className="text-xs text-foreground">{mark.justification}</p>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">Sin justificar</span>
            )
          ) : (
            <>
              <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mark.justified}
                  onChange={(e) => onChange({ justified: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-input accent-primary"
                  aria-label={`Marcar ausencia de ${mark.firstName} como justificada`}
                />
                Justificada
              </label>

              {mark.justified && (
                <div className="flex flex-col gap-1">
                  <label htmlFor={textareaId} className="text-xs text-muted-foreground">
                    Motivo <span className="text-xs opacity-60">(opcional, max. {MAX_JUSTIFICATION})</span>
                  </label>
                  <textarea
                    id={textareaId}
                    rows={2}
                    maxLength={MAX_JUSTIFICATION}
                    value={mark.justification}
                    onChange={(e) => onChange({ justification: e.target.value })}
                    aria-describedby={counterId}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                  <span
                    id={counterId}
                    className={cn(
                      'text-right text-xs',
                      justLen > MAX_JUSTIFICATION * 0.9 ? 'text-destructive' : 'text-muted-foreground',
                    )}
                    aria-live="polite"
                  >
                    {justLen}/{MAX_JUSTIFICATION}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export interface AttendanceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionDto;
  group: GroupDto;
  teacher: Teacher;
  students: StudentDto[];
  readOnly?: boolean;
  markedByUserId?: string;
  onSaved?: () => void;
}

export function AttendanceSheet({
  open,
  onOpenChange,
  session,
  group,
  teacher,
  readOnly = false,
  markedByUserId,
  onSaved,
}: AttendanceSheetProps) {
  // Inicialización eager: se recalcula cuando cambia session.id.
  // El componente recibe key={session.id} en el caller (CalendarPage),
  // por lo que cada sesión distinta monta una instancia fresca y este
  // useMemo arranca con el valor correcto sin necesidad de un efecto.
  const initialMarks = useMemo(
    () => initMarks(getSessionAttendance(session.id)),
    [session.id],
  );
  const [marks, setMarks] = useState<LocalMark[]>(initialMarks);
  const [saving, setSaving] = useState(false);
  const firstToggleRef = useRef<HTMLButtonElement | null>(null);


  // Foco al primer toggle al abrir (accesibilidad)
  useEffect(() => {
    if (open && !readOnly && firstToggleRef.current) {
      const timer = setTimeout(() => firstToggleRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open, readOnly]);

  function updateMark(studentId: string, partial: Partial<LocalMark>) {
    setMarks((prev) =>
      prev.map((m) => (m.studentId === studentId ? { ...m, ...partial } : m)),
    );
  }

  function handleSave() {
    setSaving(true);
    saveSessionAttendance(
      session.id,
      marks.map((m) => ({
        studentId: m.studentId,
        status: m.status,
        justified: m.justified,
        justification: m.justification || undefined,
      })),
      markedByUserId,
    );
    setSaving(false);
    onSaved?.();
    onOpenChange(false);
  }

  // Totales en tiempo real
  const totalPresent = marks.filter((m) => m.status === 'present').length;
  const totalAbsent = marks.filter((m) => m.status === 'absent').length;
  const totalJustified = marks.filter((m) => m.status === 'absent' && m.justified).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle className="text-base leading-snug">{group.name}</SheetTitle>
          <SheetDescription className="text-sm">
            {formatDate(session.date)} · {session.startTime}–{session.endTime} ·{' '}
            {teacher.firstName} {teacher.lastName}
          </SheetDescription>

          {/* Totales en tiempo real */}
          <div className="flex flex-wrap gap-1.5 pt-1" aria-live="polite" aria-label="Resumen de asistencia">
            <Badge variant="secondary">{totalPresent} presente{totalPresent !== 1 ? 's' : ''}</Badge>
            {totalAbsent > 0 && (
              <Badge variant="destructive">{totalAbsent} ausente{totalAbsent !== 1 ? 's' : ''}</Badge>
            )}
            {totalJustified > 0 && (
              <Badge variant="outline">{totalJustified} justificada{totalJustified !== 1 ? 's' : ''}</Badge>
            )}
          </div>
        </SheetHeader>

        {/* Lista de alumnos */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {marks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay alumnos asignados a este grupo.
            </p>
          ) : (
            marks.map((mark, idx) => (
              <StudentRow
                key={mark.studentId}
                mark={mark}
                readOnly={readOnly}
                onChange={(partial) => updateMark(mark.studentId, partial)}
                rowIndex={idx}
              />
            ))
          )}
        </div>

        {!readOnly && (
          <SheetFooter className="px-6 pb-6 pt-2 flex-row justify-end gap-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar lista'}
            </Button>
          </SheetFooter>
        )}

        {readOnly && (
          <div className="px-6 pb-6 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">Vista de solo lectura.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
