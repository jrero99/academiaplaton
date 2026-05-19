import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import type { GroupDto, SessionDto } from '@academiaplaton/shared';
import type { Teacher } from '@/features/teachers/types';
import { teacherColor } from '../lib/week';

const sessionFormSchema = z
  .object({
    groupId: z.string().uuid('Selecciona un grupo'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida'),
    notes: z.string().max(2000).optional(),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: 'La hora de fin debe ser posterior a la de inicio',
    path: ['endTime'],
  });

export type SessionFormValues = z.infer<typeof sessionFormSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  session?: SessionDto;
  initialDate?: string;
  initialStartTime?: string;
  groups: GroupDto[]; // ya filtrados por centro activo
  teachers: Teacher[];
  onSubmit: (data: SessionFormValues) => void;
  onDelete?: (id: string) => void;
}

function SessionForm({
  mode,
  session,
  initialDate,
  initialStartTime,
  groups,
  teachers,
  onSubmit,
  onDelete,
  onCancel,
}: Omit<Props, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const defaultStart = initialStartTime ?? session?.startTime ?? '18:00';
  const defaultEnd = session?.endTime ?? addThirty(defaultStart);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues:
      mode === 'edit' && session
        ? {
            groupId: session.groupId,
            date: session.date,
            startTime: session.startTime,
            endTime: session.endTime,
            notes: session.notes ?? '',
          }
        : {
            groupId: '',
            date: initialDate ?? toTodayIso(),
            startTime: defaultStart,
            endTime: defaultEnd,
            notes: '',
          },
  });

  const selectedGroupId = watch('groupId');
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const teacher = selectedGroup
    ? teachers.find((t) => t.id === selectedGroup.teacherId)
    : undefined;
  const color = teacher ? teacherColor(teacher.id) : undefined;

  return (
    <>
      <form
        id="session-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-5 px-6 py-6"
        noValidate
      >
        {/* Grupo */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="session-group" className="text-sm font-medium">
            Grupo <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <select
            id="session-group"
            aria-invalid={!!errors.groupId}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            {...register('groupId')}
          >
            <option value="">— Selecciona un grupo —</option>
            {groups
              .filter((g) => g.active || (session && g.id === session.groupId))
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                  {g.subject ? ` · ${g.subject}` : ''}
                  {!g.active ? ' (inactivo)' : ''}
                </option>
              ))}
          </select>
          {errors.groupId && (
            <p role="alert" className="text-xs text-destructive">{errors.groupId.message}</p>
          )}
          {selectedGroup && teacher && color && (
            <div
              className="mt-1 rounded-md border px-2 py-1.5 text-xs"
              style={{ backgroundColor: color.bg, borderColor: color.border, color: color.text }}
            >
              Profesor titular:{' '}
              <strong>
                {teacher.firstName} {teacher.lastName}
              </strong>
            </div>
          )}
        </div>

        {/* Fecha */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="session-date" className="text-sm font-medium">
            Fecha <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <Input
            id="session-date"
            type="date"
            aria-invalid={!!errors.date}
            {...register('date')}
          />
          {errors.date && (
            <p role="alert" className="text-xs text-destructive">{errors.date.message}</p>
          )}
        </div>

        {/* Horario */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="session-start" className="text-sm font-medium">
              Inicio <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <Input
              id="session-start"
              type="time"
              step={60 * 5}
              aria-invalid={!!errors.startTime}
              {...register('startTime')}
            />
            {errors.startTime && (
              <p role="alert" className="text-xs text-destructive">{errors.startTime.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="session-end" className="text-sm font-medium">
              Fin <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <Input
              id="session-end"
              type="time"
              step={60 * 5}
              aria-invalid={!!errors.endTime}
              {...register('endTime')}
            />
            {errors.endTime && (
              <p role="alert" className="text-xs text-destructive">{errors.endTime.message}</p>
            )}
          </div>
        </div>

        {/* Notas */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="session-notes" className="text-sm font-medium">
            Notas <span className="text-muted-foreground text-xs">(opcional)</span>
          </label>
          <textarea
            id="session-notes"
            rows={2}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            {...register('notes')}
          />
        </div>

        {mode === 'edit' && session && onDelete && (
          <>
            <Separator />
            <Button
              type="button"
              variant="ghost"
              className="justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(session.id)}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar sesión
            </Button>
          </>
        )}
      </form>

      <SheetFooter className="px-6 pb-6 pt-0 flex-row justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" form="session-form" disabled={isSubmitting}>
          {mode === 'create' ? 'Crear sesión' : 'Guardar cambios'}
        </Button>
      </SheetFooter>
    </>
  );
}

export function SessionSheet({
  open,
  onOpenChange,
  mode,
  session,
  initialDate,
  initialStartTime,
  groups,
  teachers,
  onSubmit,
  onDelete,
}: Props) {
  function handleSubmit(data: SessionFormValues) {
    onSubmit(data);
    onOpenChange(false);
  }

  function handleDelete(id: string) {
    if (onDelete) onDelete(id);
    onOpenChange(false);
  }

  const formKey =
    mode === 'edit' && session ? session.id : `create-${initialDate ?? ''}-${initialStartTime ?? ''}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle>{mode === 'create' ? 'Nueva sesión' : 'Editar sesión'}</SheetTitle>
          <SheetDescription>
            {mode === 'create'
              ? 'Asigna un grupo a una franja horaria del calendario.'
              : 'Modifica los datos de la sesión o elimínala.'}
          </SheetDescription>
        </SheetHeader>

        <SessionForm
          key={formKey}
          mode={mode}
          session={session}
          initialDate={initialDate}
          initialStartTime={initialStartTime}
          groups={groups}
          teachers={teachers}
          onSubmit={handleSubmit}
          onDelete={onDelete ? handleDelete : undefined}
          onCancel={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

function toTodayIso(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addThirty(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  const total = Math.min(23 * 60 + 59, h * 60 + m + 30);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(nh)}:${pad(nm)}`;
}
