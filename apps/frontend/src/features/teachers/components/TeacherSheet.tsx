import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import type { Teacher } from '../types';

// ------------------------------------------------------------------ schema
const teacherSchema = z.object({
  firstName: z.string().min(1, 'El nombre es obligatorio'),
  lastName: z.string().min(1, 'Los apellidos son obligatorios'),
  email: z.string().min(1, 'El email es obligatorio').email('Formato de email no válido'),
  phone: z
    .string()
    .regex(/^[+\d\s\-().]{0,20}$/, 'Teléfono no válido')
    .or(z.literal(''))
    .optional(),
  active: z.boolean(),
});

type FormValues = z.infer<typeof teacherSchema>;

type PasswordState = 'idle' | 'confirming' | 'loading' | 'success';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  teacher?: Teacher;
  onSubmit: (data: FormValues) => void;
}

// Formulario interno con valores iniciales ya resueltos — se re-monta via key cuando cambia el teacher/mode
function TeacherForm({
  mode,
  teacher,
  onSubmit,
  onCancel,
}: {
  mode: 'create' | 'edit';
  teacher?: Teacher;
  onSubmit: (data: FormValues) => void;
  onCancel: () => void;
}) {
  const [passwordState, setPasswordState] = useState<PasswordState>('idle');
  const [activeChecked, setActiveChecked] = useState(
    mode === 'edit' && teacher ? teacher.active : true,
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(teacherSchema),
    defaultValues:
      mode === 'edit' && teacher
        ? {
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            email: teacher.email,
            phone: teacher.phone ?? '',
            active: teacher.active,
          }
        : { firstName: '', lastName: '', email: '', phone: '', active: true },
  });

  function handleFormSubmit(values: FormValues) {
    onSubmit(values);
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
            Nombre <span aria-hidden="true" className="text-destructive">*</span>
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
            Apellidos <span aria-hidden="true" className="text-destructive">*</span>
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

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="teacher-email" className="text-sm font-medium">
            Email <span aria-hidden="true" className="text-destructive">*</span>
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
            Teléfono{' '}
            <span className="text-muted-foreground text-xs">(opcional)</span>
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

        {/* Activo — estado local sincronizado con react-hook-form */}
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
            Profesor activo
          </label>
        </div>

        {/* Bloque de acceso — solo en modo edit */}
        {mode === 'edit' && (
          <>
            <Separator />
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold">Acceso a la plataforma</p>
              <p className="text-xs text-muted-foreground">
                Genera una contraseña temporal y envíasela al email del profesor.
              </p>

              {passwordState === 'idle' && (
                <Button type="button" variant="outline" onClick={handleRegenerate}>
                  Regenerar contraseña y enviar al email
                </Button>
              )}

              {passwordState === 'confirming' && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 flex flex-col gap-2">
                  <p className="text-sm text-destructive font-medium">¿Confirmas el envío?</p>
                  <p className="text-xs text-muted-foreground">
                    Se enviará un email a <strong>{emailForFeedback}</strong> con una contraseña
                    temporal. La contraseña actual quedará invalidada.
                  </p>
                  <div className="flex gap-2 mt-1">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleRegenerate}
                    >
                      Sí, enviar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPasswordState('idle')}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {passwordState === 'loading' && (
                <p className="text-sm text-muted-foreground">Enviando correo...</p>
              )}

              {passwordState === 'success' && (
                <div className="rounded-md border border-border bg-muted/50 p-3">
                  <p className="text-sm font-medium">Correo enviado</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hemos enviado un correo a <strong>{emailForFeedback}</strong> con una contraseña
                    temporal.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </form>

      <SheetFooter className="px-6 pb-6 pt-0 flex-row justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" form="teacher-form" disabled={isSubmitting}>
          {mode === 'create' ? 'Crear profesor' : 'Guardar cambios'}
        </Button>
      </SheetFooter>
    </>
  );
}

// ------------------------------------------------------------------ shell
export function TeacherSheet({ open, onOpenChange, mode, teacher, onSubmit }: Props) {
  function handleSubmit(data: FormValues) {
    onSubmit(data);
    onOpenChange(false);
  }

  // La key fuerza re-mount de TeacherForm cuando cambia el profesor o el modo,
  // evitando useEffect con setState para precargar valores.
  const formKey = mode === 'edit' && teacher ? teacher.id : 'create';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle>{mode === 'create' ? 'Nuevo profesor' : 'Editar profesor'}</SheetTitle>
          <SheetDescription>
            {mode === 'create'
              ? 'Rellena los datos del nuevo profesor.'
              : 'Modifica los datos del profesor.'}
          </SheetDescription>
        </SheetHeader>

        <TeacherForm
          key={formKey}
          mode={mode}
          teacher={teacher}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
