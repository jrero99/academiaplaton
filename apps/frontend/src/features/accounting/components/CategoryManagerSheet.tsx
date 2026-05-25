import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type {
  ExpenseCategoryCreate,
  ExpenseCategoryDto,
  ExpenseCategoryUpdate,
} from '@academiaplaton/shared';
import { useTranslation } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const slugRegex = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

const categorySchema = z.object({
  name: z.string().min(1, 'Obligatorio').max(120),
  slug: z.string().regex(slugRegex, 'Slug inválido (a-z, 0-9, guiones)').max(80),
  isSalary: z.boolean(),
  sortOrder: z
    .number({ invalid_type_error: 'Debe ser número' })
    .int()
    .min(0)
    .max(9999),
  active: z.boolean(),
});
type CategoryFormValues = z.infer<typeof categorySchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ExpenseCategoryDto[];
  onCreate: (input: ExpenseCategoryCreate) => Promise<ExpenseCategoryDto>;
  onUpdate: (id: string, input: ExpenseCategoryUpdate) => Promise<ExpenseCategoryDto>;
  onDelete: (id: string) => Promise<void>;
}

export function CategoryManagerSheet({
  open,
  onOpenChange,
  categories,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<ExpenseCategoryDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function closeForm() {
    setEditing(null);
    setCreating(false);
  }

  async function handleDelete(c: ExpenseCategoryDto) {
    if (!window.confirm(t('accounting.category.delete_confirm', { name: c.name }))) return;
    setActionError(null);
    try {
      await onDelete(c.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle>{t('accounting.category.manage')}</SheetTitle>
          <SheetDescription>{t('accounting.category.desc')}</SheetDescription>
        </SheetHeader>

        <div className="px-6 py-4 flex flex-col gap-3">
          {!creating && !editing && (
            <Button onClick={() => setCreating(true)} variant="outline" className="self-start">
              <Plus className="h-4 w-4" />
              {t('accounting.category.new')}
            </Button>
          )}

          {actionError && (
            <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{actionError}</p>
          )}

          {(creating || editing) && (
            <CategoryForm
              key={editing ? editing.id : 'create'}
              category={editing ?? undefined}
              onSubmit={async (values) => {
                setActionError(null);
                try {
                  if (editing) {
                    await onUpdate(editing.id, values);
                  } else {
                    await onCreate(values);
                  }
                  closeForm();
                } catch (err) {
                  setActionError(err instanceof Error ? err.message : String(err));
                }
              }}
              onCancel={closeForm}
            />
          )}

          {!creating && !editing && (
            <>
              <Separator />
              <ul className="flex flex-col gap-1">
                {categories.length === 0 && (
                  <li className="text-sm text-muted-foreground py-6 text-center">
                    {t('accounting.category.empty')}
                  </li>
                )}
                {categories
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
                  .map((c) => (
                    <li
                      key={c.id}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-md border px-3 py-2',
                        !c.active && 'opacity-60',
                      )}
                    >
                      <div className="min-w-0 flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{c.name}</span>
                          {c.isSalary && (
                            <Badge variant="secondary">{t('accounting.category.badge_salary')}</Badge>
                          )}
                          {!c.active && (
                            <Badge variant="outline">{t('common.inactive_f')}</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{c.slug}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t('accounting.category.edit_aria', { name: c.name })}
                          onClick={() => setEditing(c)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t('accounting.category.delete_aria', { name: c.name })}
                          className="hover:text-destructive"
                          onClick={() => handleDelete(c)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </div>

        <SheetFooter className="px-6 pb-6 pt-0 flex-row justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function CategoryForm({
  category,
  onSubmit,
  onCancel,
}: {
  category?: ExpenseCategoryDto;
  onSubmit: (values: CategoryFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  const defaultValues: CategoryFormValues = category
    ? {
        name: category.name,
        slug: category.slug,
        isSalary: category.isSalary,
        sortOrder: category.sortOrder,
        active: category.active,
      }
    : {
        name: '',
        slug: '',
        isSalary: false,
        sortOrder: 0,
        active: true,
      };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 rounded-md border p-3 bg-muted/30" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cat-name" className="text-sm font-medium">{t('common.name')}</label>
        <Input id="cat-name" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name && <p role="alert" className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cat-slug" className="text-sm font-medium">{t('accounting.category.slug')}</label>
        <Input id="cat-slug" aria-invalid={!!errors.slug} {...register('slug')} />
        {errors.slug && <p role="alert" className="text-xs text-destructive">{errors.slug.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cat-order" className="text-sm font-medium">{t('accounting.category.sort_order')}</label>
        <Input
          id="cat-order"
          type="number"
          min="0"
          aria-invalid={!!errors.sortOrder}
          {...register('sortOrder', {
            setValueAs: (v) => (v === '' || v === null || v === undefined ? 0 : Number(v)),
          })}
        />
        {errors.sortOrder && <p role="alert" className="text-xs text-destructive">{errors.sortOrder.message}</p>}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register('isSalary')} />
        {t('accounting.category.is_salary')}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register('active')} />
        {t('accounting.category.active')}
      </label>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>{t('sheet.cancel')}</Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {category ? t('common.save_changes') : t('common.create')}
        </Button>
      </div>
    </form>
  );
}
