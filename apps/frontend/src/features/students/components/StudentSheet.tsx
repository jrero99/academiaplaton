import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
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
import type { CenterDto, StudentDto } from '@academiaplaton/shared';

// ------------------------------------------------------------------ schema
const phoneOptionalRegex = /^[+\d\s\-().]{0,20}$/;
const phoneRequiredRegex = /^[+\d\s\-().]{7,20}$/;

const guardianSchema = z.object({
  firstName: z.string().min(1, 'Obligatorio').max(80),
  lastName: z.string().min(1, 'Obligatorio').max(120),
  relationship: z.enum(['mother', 'father', 'tutor', 'other']),
  phone: z.string().regex(phoneRequiredRegex, 'Teléfono no válido'),
  email: z
    .string()
    .email('Email no válido')
    .max(160)
    .or(z.literal(''))
    .optional(),
});

const studentSchema = z.object({
  firstName: z.string().min(1, 'El nombre es obligatorio').max(80),
  lastName: z.string().min(1, 'Los apellidos son obligatorios').max(120),
  centerId: z.string().uuid('Selecciona una academia'),
  birthDate: z.string().min(1, 'La fecha de nacimiento es obligatoria'),
  email: z
    .string()
    .email('Formato de email no válido')
    .max(160)
    .or(z.literal(''))
    .optional(),
  phone: z
    .string()
    .regex(phoneOptionalRegex, 'Teléfono no válido')
    .or(z.literal(''))
    .optional(),
  address: z.string().max(240).or(z.literal('')).optional(),
  notes: z.string().max(2000).or(z.literal('')).optional(),
  monthlyFee: z
    .number({ invalid_type_error: 'Introduce un importe válido' })
    .nonnegative('Debe ser >= 0')
    .max(99999, 'Importe demasiado alto')
    .optional(),
  guardians: z.array(guardianSchema).max(4, 'Máximo 4 tutores'),
});

export type StudentFormValues = z.infer<typeof studentSchema>;

const RELATIONSHIP_LABELS: Record<'mother' | 'father' | 'tutor' | 'other', string> = {
  mother: 'Madre',
  father: 'Padre',
  tutor: 'Tutor/a',
  other: 'Otro',
};

// Native select/textarea estilizados para alinear con shadcn Input
const selectClassName =
  'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm dark:bg-input/30';

const textareaClassName =
  'w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm dark:bg-input/30';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  student?: StudentDto;
  centers: CenterDto[];
  onSubmit: (data: StudentFormValues) => void;
}

// Formulario interno con valores iniciales ya resueltos — se re-monta via key cuando cambia el alumno/mode
function StudentForm({
  mode,
  student,
  centers,
  onSubmit,
  onCancel,
}: {
  mode: 'create' | 'edit';
  student?: StudentDto;
  centers: CenterDto[];
  onSubmit: (data: StudentFormValues) => void;
  onCancel: () => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues:
      mode === 'edit' && student
        ? {
            firstName: student.firstName,
            lastName: student.lastName,
            centerId: student.centerId,
            birthDate: student.birthDate,
            email: student.email ?? '',
            phone: student.phone ?? '',
            address: student.address ?? '',
            notes: student.notes ?? '',
            monthlyFee: student.monthlyFee,
            guardians: student.guardians.map((g) => ({
              firstName: g.firstName,
              lastName: g.lastName,
              relationship: g.relationship,
              phone: g.phone,
              email: g.email ?? '',
            })),
          }
        : {
            firstName: '',
            lastName: '',
            centerId: '',
            birthDate: '',
            email: '',
            phone: '',
            address: '',
            notes: '',
            monthlyFee: undefined,
            guardians: [],
          },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'guardians' });

  function handleFormSubmit(values: StudentFormValues) {
    onSubmit(values);
  }

  function handleAddGuardian() {
    if (fields.length >= 4) return;
    append({
      firstName: '',
      lastName: '',
      relationship: 'mother',
      phone: '',
      email: '',
    });
  }

  return (
    <>
      <form
        id="student-form"
        onSubmit={handleSubmit(handleFormSubmit)}
        className="flex flex-col gap-5 px-6 py-6"
        noValidate
      >
        {/* Nombre */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="student-firstName" className="text-sm font-medium">
            Nombre <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <Input
            id="student-firstName"
            aria-invalid={!!errors.firstName}
            {...register('firstName')}
          />
          {errors.firstName && (
            <p role="alert" className="text-xs text-destructive">{errors.firstName.message}</p>
          )}
        </div>

        {/* Apellidos */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="student-lastName" className="text-sm font-medium">
            Apellidos <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <Input
            id="student-lastName"
            aria-invalid={!!errors.lastName}
            {...register('lastName')}
          />
          {errors.lastName && (
            <p role="alert" className="text-xs text-destructive">{errors.lastName.message}</p>
          )}
        </div>

        {/* Fecha de nacimiento */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="student-birthDate" className="text-sm font-medium">
            Fecha de nacimiento <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <Input
            id="student-birthDate"
            type="date"
            aria-invalid={!!errors.birthDate}
            {...register('birthDate')}
          />
          {errors.birthDate && (
            <p role="alert" className="text-xs text-destructive">{errors.birthDate.message}</p>
          )}
        </div>

        {/* Academia (1:1 alumno ↔ academia) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="student-center" className="text-sm font-medium">
            Academia <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <select
            id="student-center"
            aria-invalid={!!errors.centerId}
            className={selectClassName}
            {...register('centerId')}
          >
            <option value="">— Selecciona una academia —</option>
            {centers
              .filter((c) => c.active || (student && c.id === student.centerId))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {!c.active ? ' (inactiva)' : ''}
                </option>
              ))}
          </select>
          {errors.centerId && (
            <p role="alert" className="text-xs text-destructive">{errors.centerId.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="student-email" className="text-sm font-medium">
            Email <span className="text-muted-foreground text-xs">(opcional)</span>
          </label>
          <Input
            id="student-email"
            type="email"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && (
            <p role="alert" className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        {/* Teléfono */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="student-phone" className="text-sm font-medium">
            Teléfono <span className="text-muted-foreground text-xs">(opcional)</span>
          </label>
          <Input
            id="student-phone"
            type="tel"
            aria-invalid={!!errors.phone}
            {...register('phone')}
          />
          {errors.phone && (
            <p role="alert" className="text-xs text-destructive">{errors.phone.message}</p>
          )}
        </div>

        {/* Dirección */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="student-address" className="text-sm font-medium">
            Dirección <span className="text-muted-foreground text-xs">(opcional)</span>
          </label>
          <Input
            id="student-address"
            aria-invalid={!!errors.address}
            {...register('address')}
          />
          {errors.address && (
            <p role="alert" className="text-xs text-destructive">{errors.address.message}</p>
          )}
        </div>

        {/* Cuota mensual */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="student-monthlyFee" className="text-sm font-medium">
            Cuota mensual <span className="text-muted-foreground text-xs">(€ / mes, opcional)</span>
          </label>
          <Input
            id="student-monthlyFee"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0,00"
            aria-invalid={!!errors.monthlyFee}
            {...register('monthlyFee', {
              setValueAs: (v) => {
                if (v === '' || v === null || v === undefined) return undefined;
                const n = typeof v === 'number' ? v : Number(v);
                return Number.isNaN(n) ? undefined : n;
              },
            })}
          />
          {errors.monthlyFee && (
            <p role="alert" className="text-xs text-destructive">{errors.monthlyFee.message}</p>
          )}
        </div>

        {/* Notas */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="student-notes" className="text-sm font-medium">
            Notas <span className="text-muted-foreground text-xs">(opcional)</span>
          </label>
          <textarea
            id="student-notes"
            rows={3}
            aria-invalid={!!errors.notes}
            className={textareaClassName}
            {...register('notes')}
          />
          {errors.notes && (
            <p role="alert" className="text-xs text-destructive">{errors.notes.message}</p>
          )}
        </div>

        <Separator />

        {/* Tutores */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Tutores</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddGuardian}
              disabled={fields.length >= 4}
            >
              <Plus className="h-4 w-4" />
              Añadir
            </Button>
          </div>

          {fields.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Aún no se ha añadido ningún tutor. Puedes añadir hasta 4.
            </p>
          )}

          {fields.map((field, index) => {
            const guardianErrors = errors.guardians?.[index];
            return (
              <div
                key={field.id}
                className="rounded-md border border-border p-3 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    Tutor {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Eliminar tutor ${index + 1}`}
                    onClick={() => remove(index)}
                    className="hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium">Nombre</label>
                    <Input
                      aria-invalid={!!guardianErrors?.firstName}
                      {...register(`guardians.${index}.firstName` as const)}
                    />
                    {guardianErrors?.firstName && (
                      <p role="alert" className="text-xs text-destructive">
                        {guardianErrors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium">Apellidos</label>
                    <Input
                      aria-invalid={!!guardianErrors?.lastName}
                      {...register(`guardians.${index}.lastName` as const)}
                    />
                    {guardianErrors?.lastName && (
                      <p role="alert" className="text-xs text-destructive">
                        {guardianErrors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium">Relación</label>
                  <select
                    className={selectClassName}
                    {...register(`guardians.${index}.relationship` as const)}
                  >
                    {(['mother', 'father', 'tutor', 'other'] as const).map((r) => (
                      <option key={r} value={r}>
                        {RELATIONSHIP_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium">Teléfono</label>
                  <Input
                    type="tel"
                    aria-invalid={!!guardianErrors?.phone}
                    {...register(`guardians.${index}.phone` as const)}
                  />
                  {guardianErrors?.phone && (
                    <p role="alert" className="text-xs text-destructive">
                      {guardianErrors.phone.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium">
                    Email <span className="text-muted-foreground">(opcional)</span>
                  </label>
                  <Input
                    type="email"
                    aria-invalid={!!guardianErrors?.email}
                    {...register(`guardians.${index}.email` as const)}
                  />
                  {guardianErrors?.email && (
                    <p role="alert" className="text-xs text-destructive">
                      {guardianErrors.email.message}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </form>

      <SheetFooter className="px-6 pb-6 pt-0 flex-row justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" form="student-form" disabled={isSubmitting}>
          {mode === 'create' ? 'Crear alumno' : 'Guardar cambios'}
        </Button>
      </SheetFooter>
    </>
  );
}

// ------------------------------------------------------------------ shell
export function StudentSheet({ open, onOpenChange, mode, student, centers, onSubmit }: Props) {
  function handleSubmit(data: StudentFormValues) {
    onSubmit(data);
    onOpenChange(false);
  }

  // La key fuerza re-mount de StudentForm cuando cambia el alumno o el modo,
  // evitando useEffect con setState para precargar valores.
  const formKey = mode === 'edit' && student ? student.id : 'create';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle>{mode === 'create' ? 'Nuevo alumno' : 'Editar alumno'}</SheetTitle>
          <SheetDescription>
            {mode === 'create'
              ? 'Rellena los datos del nuevo alumno.'
              : 'Modifica los datos del alumno.'}
          </SheetDescription>
        </SheetHeader>

        <StudentForm
          key={formKey}
          mode={mode}
          student={student}
          centers={centers}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
