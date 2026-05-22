import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check } from 'lucide-react';
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
import {
  TEACHER_COLOR_IDS,
  TEACHER_COLOR_PALETTE,
  type CenterDto,
  type TeacherColorId,
} from '@academiaplaton/shared';
import type { Teacher } from '../types';
import { useTranslation } from '@/contexts/LanguageContext';

// ------------------------------------------------------------------ schema
const teacherSchema = z.object({
  firstName: z.string().min(1, 'El nombre es obligatorio'),
  lastName: z.string().min(1, 'Los apellidos son obligatorios'),
  centerId: z.string().uuid('Selecciona una academia'),
  email: z.string().min(1, 'El email es obligatorio').email('Formato de email no válido'),
  phone: z
    .string()
    .regex(/^[+\d\s\-().]{0,20}$/, 'Teléfono no válido')
    .or(z.literal(''))
    .optional(),
  color: z.enum(TEACHER_COLOR_IDS).optional(),
  active: z.boolean(),
});

type FormValues = z.infer<typeof teacherSchema>;

type PasswordState = 'idle' | 'confirming' | 'loading' | 'success';

const selectClassName =
  'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm dark:bg-input/30';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  teacher?: Teacher;
  centers: CenterDto[];
  existingTeachers: Teacher[];
  onSubmit: (data: FormValues) => void;
}

function TeacherForm({
  mode,
  teacher,
  centers,
  existingTeachers,
  onSubmit,
  onCancel,
}: {
  mode: 'create' | 'edit';
  teacher?: Teacher;
  centers: CenterDto[];
  existingTeachers: Teacher[];
  onSubmit: (data: FormValues) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [passwordState, setPasswordState] = useState<PasswordState>('idle');
  const [activeChecked, setActiveChecked] = useState(
    mode === 'edit' && teacher ? teacher.active : true,
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(teacherSchema),
    defaultValues:
      mode === 'edit' && teacher
        ? {
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            centerId: teacher.centerId,
            email: teacher.email,
            phone: teacher.phone ?? '',
            color: teacher.color,
            active: teacher.active,
          }
        : {
            firstName: '',
            lastName: '',
            centerId: '',
            email: '',
            phone: '',
            color: undefined,
            active: true,
          },
  });

  const selectedCenterId = watch('centerId');
  const selectedColor = watch('color');

  // Colores ya usados por otros profesores del mismo centro
  const takenColors = useMemo(() => {
    if (!selectedCenterId) return new Set<TeacherColorId>();
    const taken = new Set<TeacherColorId>();
    for (const tch of existingTeachers) {
      if (tch.centerId !== selectedCenterId) continue;
      if (mode === 'edit' && teacher && tch.id === teacher.id) continue;
      if (tch.color) taken.add(tch.color);
    }
    return taken;
  }, [existingTeachers, selectedCenterId, mode, teacher]);

  function handleFormSubmit(values: FormValues) {
    onSubmit(values);
  }

  function handleColorPick(color: TeacherColorId) {
    if (takenColors.has(color)) return;
    // Permite deseleccionar haciendo click en el mismo color
    setValue('color', selectedColor === color ? undefined : color, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function handleRegenerate() {
    if (passwordState === 'idle') {
      setPasswordState('confirming');
    } else if (passwordState === 'confirming') {
      setPasswordState('loading');
      setTimeout(() => setPasswordState('success'), 500);
    }
  }

  const emailForFeedback = teacher?.email ?? '';

  return (
    <>
      <form
        id="teacher-form"
        onSubmit={handleSubmit(handleFormSubmit)}
        className="flex flex-col gap-5 px-6 py-6"
        noValidate
      >
        {/* Nombre */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="teacher-firstName" className="text-sm font-medium">
            {t('common.name')} <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <Input
            id="teacher-firstName"
            aria-invalid={!!errors.firstName}
            {...register('firstName')}
          />
          {errors.firstName && (
            <p role="alert" className="text-xs text-destructive">{errors.firstName.message}</p>
          )}
        </div>

        {/* Apellidos */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="teacher-lastName" className="text-sm font-medium">
            {t('common.surname')} <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <Input
            id="teacher-lastName"
            aria-invalid={!!errors.lastName}
            {...register('lastName')}
          />
          {errors.lastName && (
            <p role="alert" className="text-xs text-destructive">{errors.lastName.message}</p>
          )}
        </div>

        {/* Academia (1:1 profesor ↔ academia) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="teacher-center" className="text-sm font-medium">
            {t('teacher_sheet.field.center')} <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <select
            id="teacher-center"
            aria-invalid={!!errors.centerId}
            className={selectClassName}
            {...register('centerId')}
          >
            <option value="">— {t('teacher_sheet.field.center')} —</option>
            {centers
              .filter((c) => c.active || (teacher && c.id === teacher.centerId))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {!c.active ? t('student_sheet.field.center_inactive_suffix') : ''}
                </option>
              ))}
          </select>
          {errors.centerId && (
            <p role="alert" className="text-xs text-destructive">{errors.centerId.message}</p>
          )}
        </div>

        {/* Color (visible en el calendario, único por academia) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <label className="text-sm font-medium">
              {t('teacher_sheet.field.color_calendar')}{' '}
              <span className="text-muted-foreground text-xs">{t('common.optional')}</span>
            </label>
            {selectedColor && (
              <button
                type="button"
                onClick={() =>
                  setValue('color', undefined, { shouldDirty: true, shouldValidate: true })
                }
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              >
                {t('teacher_sheet.field.color_remove')}
              </button>
            )}
          </div>
          {!selectedCenterId && (
            <p className="text-xs text-muted-foreground">
              {t('teacher_sheet.field.color_hint_no_center')}
            </p>
          )}
          <div
            role="radiogroup"
            aria-label={t('teacher_sheet.field.color_aria')}
            className="grid grid-cols-4 gap-2 sm:grid-cols-8"
          >
            {TEACHER_COLOR_IDS.map((id) => {
              const palette = TEACHER_COLOR_PALETTE[id];
              const isTaken = takenColors.has(id);
              const isSelected = selectedColor === id;
              const disabled = !selectedCenterId || isTaken;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={
                    isTaken
                      ? t('teacher_sheet.field.color_taken_aria', { label: palette.label })
                      : palette.label
                  }
                  disabled={disabled}
                  onClick={() => handleColorPick(id)}
                  className={
                    'group relative flex h-10 items-center justify-center rounded-md border-2 transition-all ' +
                    (isSelected
                      ? 'border-foreground shadow-sm scale-105 '
                      : 'border-transparent hover:border-muted-foreground/40 ') +
                    (disabled ? 'cursor-not-allowed opacity-40 ' : 'cursor-pointer ')
                  }
                  style={{ backgroundColor: palette.swatch }}
                  title={
                    isTaken
                      ? t('teacher_sheet.field.color_taken_title', { label: palette.label })
                      : palette.label
                  }
                >
                  {isSelected && (
                    <Check className="h-4 w-4 text-white drop-shadow" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
          {selectedCenterId && takenColors.size >= TEACHER_COLOR_IDS.length && !selectedColor && (
            <p className="text-xs text-destructive">
              {t('teacher_sheet.field.color_no_free')}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="teacher-email" className="text-sm font-medium">
            {t('common.email')} <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <Input
            id="teacher-email"
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
          <label htmlFor="teacher-phone" className="text-sm font-medium">
            {t('common.phone')}{' '}
            <span className="text-muted-foreground text-xs">{t('common.optional')}</span>
          </label>
          <Input
            id="teacher-phone"
            type="tel"
            aria-invalid={!!errors.phone}
            {...register('phone')}
          />
          {errors.phone && (
            <p role="alert" className="text-xs text-destructive">{errors.phone.message}</p>
          )}
        </div>

        {/* Activo */}
        <div className="flex items-center gap-3">
          <input
            id="teacher-active"
            type="checkbox"
            checked={activeChecked}
            onChange={(e) => {
              setActiveChecked(e.target.checked);
              setValue('active', e.target.checked);
            }}
            className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
          />
          <label htmlFor="teacher-active" className="text-sm font-medium cursor-pointer">
            {t('teacher_sheet.field.active_label')}
          </label>
        </div>

        {/* Bloque de acceso — solo en modo edit */}
        {mode === 'edit' && (
          <>
            <Separator />
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold">{t('teacher_sheet.access.title')}</p>
              <p className="text-xs text-muted-foreground">
                {t('teacher_sheet.access.hint')}
              </p>

              {passwordState === 'idle' && (
                <Button type="button" variant="outline" onClick={handleRegenerate}>
                  {t('teacher_sheet.access.regenerate_btn')}
                </Button>
              )}

              {passwordState === 'confirming' && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 flex flex-col gap-2">
                  <p className="text-sm text-destructive font-medium">{t('teacher_sheet.access.confirm_question')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('teacher_sheet.access.confirm_detail_prefix')}{' '}
                    <strong>{emailForFeedback}</strong>{' '}
                    {t('teacher_sheet.access.confirm_detail_suffix')}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleRegenerate}
                    >
                      {t('teacher_sheet.access.confirm_yes')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPasswordState('idle')}
                    >
                      {t('sheet.cancel')}
                    </Button>
                  </div>
                </div>
              )}

              {passwordState === 'loading' && (
                <p className="text-sm text-muted-foreground">{t('teacher_sheet.access.sending')}</p>
              )}

              {passwordState === 'success' && (
                <div className="rounded-md border border-border bg-muted/50 p-3">
                  <p className="text-sm font-medium">{t('teacher_sheet.access.sent_title')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('teacher_sheet.access.sent_detail_prefix')}{' '}
                    <strong>{emailForFeedback}</strong>{' '}
                    {t('teacher_sheet.access.sent_detail_suffix')}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </form>

      <SheetFooter className="px-6 pb-6 pt-0 flex-row justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('sheet.cancel')}
        </Button>
        <Button type="submit" form="teacher-form" disabled={isSubmitting}>
          {mode === 'create' ? t('teacher_sheet.submit_create') : t('teacher_sheet.submit_edit')}
        </Button>
      </SheetFooter>
    </>
  );
}

// ------------------------------------------------------------------ shell
export function TeacherSheet({
  open,
  onOpenChange,
  mode,
  teacher,
  centers,
  existingTeachers,
  onSubmit,
}: Props) {
  const { t } = useTranslation();

  function handleSubmit(data: FormValues) {
    onSubmit(data);
    onOpenChange(false);
  }

  const formKey = mode === 'edit' && teacher ? teacher.id : 'create';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle>{mode === 'create' ? t('teacher_sheet.title_create') : t('teacher_sheet.title_edit')}</SheetTitle>
          <SheetDescription>
            {mode === 'create'
              ? t('teacher_sheet.desc_create')
              : t('teacher_sheet.desc_edit')}
          </SheetDescription>
        </SheetHeader>

        <TeacherForm
          key={formKey}
          mode={mode}
          teacher={teacher}
          centers={centers}
          existingTeachers={existingTeachers}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
