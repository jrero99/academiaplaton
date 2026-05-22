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
import type { CenterDto } from '@academiaplaton/shared';
import { useTranslation } from '@/contexts/LanguageContext';

const phoneRegex = /^[+\d\s\-().]{0,20}$/;

const centerSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(160),
  slug: z
    .string()
    .min(1, 'El identificador URL es obligatorio')
    .max(80)
    .regex(/^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/, 'Sólo minúsculas, números y guiones'),
  address: z.string().max(240).or(z.literal('')).optional(),
  phone: z.string().regex(phoneRegex, 'Teléfono no válido').or(z.literal('')).optional(),
  email: z.string().email('Email no válido').max(160).or(z.literal('')).optional(),
  active: z.boolean(),
});

export type CenterFormValues = z.infer<typeof centerSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  center?: CenterDto;
  onSubmit: (data: CenterFormValues) => void;
}

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function CenterForm({
  mode,
  center,
  onSubmit,
  onCancel,
}: {
  mode: 'create' | 'edit';
  center?: CenterDto;
  onSubmit: (data: CenterFormValues) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const initialActive = mode === 'edit' && center ? center.active : true;
  const [activeChecked, setActiveChecked] = useState(initialActive);
  const [slugTouched, setSlugTouched] = useState(mode === 'edit');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CenterFormValues>({
    resolver: zodResolver(centerSchema),
    defaultValues:
      mode === 'edit' && center
        ? {
            name: center.name,
            slug: center.slug,
            address: center.address ?? '',
            phone: center.phone ?? '',
            email: center.email ?? '',
            active: center.active,
          }
        : { name: '', slug: '', address: '', phone: '', email: '', active: true },
  });

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!slugTouched && mode === 'create') {
      setValue('slug', slugify(e.target.value));
    }
  }

  return (
    <>
      <form
        id="center-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-5 px-6 py-6"
        noValidate
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="center-name" className="text-sm font-medium">
            {t('common.name')} <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <Input
            id="center-name"
            aria-invalid={!!errors.name}
            {...register('name', { onChange: handleNameChange })}
          />
          {errors.name && (
            <p role="alert" className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="center-slug" className="text-sm font-medium">
            {t('center_sheet.field.slug')} <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <Input
            id="center-slug"
            aria-invalid={!!errors.slug}
            placeholder="platon-teresas"
            {...register('slug', { onChange: () => setSlugTouched(true) })}
          />
          {errors.slug ? (
            <p role="alert" className="text-xs text-destructive">{errors.slug.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t('center_sheet.field.slug_hint')}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="center-address" className="text-sm font-medium">
            {t('center_sheet.field.address')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span>
          </label>
          <Input id="center-address" {...register('address')} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="center-phone" className="text-sm font-medium">
              {t('common.phone')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span>
            </label>
            <Input id="center-phone" type="tel" {...register('phone')} />
            {errors.phone && (
              <p role="alert" className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="center-email" className="text-sm font-medium">
              {t('common.email')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span>
            </label>
            <Input id="center-email" type="email" {...register('email')} />
            {errors.email && (
              <p role="alert" className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="center-active"
            type="checkbox"
            checked={activeChecked}
            onChange={(e) => {
              setActiveChecked(e.target.checked);
              setValue('active', e.target.checked);
            }}
            className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
          />
          <label htmlFor="center-active" className="text-sm font-medium cursor-pointer">
            {t('center_sheet.field.active_label')}
          </label>
        </div>
      </form>

      <SheetFooter className="px-6 pb-6 pt-0 flex-row justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('sheet.cancel')}
        </Button>
        <Button type="submit" form="center-form" disabled={isSubmitting}>
          {mode === 'create' ? t('center_sheet.submit_create') : t('center_sheet.submit_edit')}
        </Button>
      </SheetFooter>
    </>
  );
}

export function CenterSheet({ open, onOpenChange, mode, center, onSubmit }: Props) {
  const { t } = useTranslation();

  function handleSubmit(data: CenterFormValues) {
    onSubmit(data);
    onOpenChange(false);
  }

  const formKey = mode === 'edit' && center ? center.id : 'create';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle>{mode === 'create' ? t('center_sheet.title_create') : t('center_sheet.title_edit')}</SheetTitle>
          <SheetDescription>
            {mode === 'create'
              ? t('center_sheet.desc_create')
              : t('center_sheet.desc_edit')}
          </SheetDescription>
        </SheetHeader>

        <CenterForm
          key={formKey}
          mode={mode}
          center={center}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
