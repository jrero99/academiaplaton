import { useMemo, useState } from 'react';
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
import {
  filterSelectClass,
  filterInputClass,
  FilterBar,
  FilterField,
} from '@/components/admin/FilterBar';
import type {
  CenterDto,
  ExpenseCategoryDto,
  ExpensePaymentMethod,
  ExpenseTemplateCreate,
  ExpenseTemplateDto,
  ExpenseTemplateUpdate,
} from '@academiaplaton/shared';
import { useTranslation } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const PAYMENT_METHODS: ExpensePaymentMethod[] = ['sepa', 'transfer', 'cash', 'other'];

const templateSchema = z.object({
  centerId: z.string().uuid('Selecciona un centro'),
  categoryId: z.string().uuid('Selecciona una categoría'),
  defaultAmount: z
    .number({ invalid_type_error: 'Importe inválido' })
    .nonnegative()
    .max(99999999),
  chargeDayOfMonth: z
    .number({ invalid_type_error: 'Día inválido' })
    .int()
    .min(1)
    .max(31)
    .optional(),
  description: z.string().max(240).or(z.literal('')).optional(),
  paymentMethod: z.enum(['sepa', 'transfer', 'cash', 'other'] as const),
  active: z.boolean(),
});
type TemplateFormValues = z.infer<typeof templateSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: ExpenseTemplateDto[];
  categories: ExpenseCategoryDto[];
  centers: CenterDto[];
  onCreate: (input: ExpenseTemplateCreate) => Promise<ExpenseTemplateDto>;
  onUpdate: (id: string, input: ExpenseTemplateUpdate) => Promise<ExpenseTemplateDto>;
  onDelete: (id: string) => Promise<void>;
}

export function TemplateManagerSheet({
  open,
  onOpenChange,
  templates,
  categories,
  centers,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const { t, locale } = useTranslation();
  const [editing, setEditing] = useState<ExpenseTemplateDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filterCenter, setFilterCenter] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const eurFmt = useMemo(
    () => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }),
    [locale],
  );

  const centerById = useMemo(() => new Map(centers.map((c) => [c.id, c])), [centers]);
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const filtered = useMemo(() => {
    return templates.filter((tpl) => {
      if (filterCenter && tpl.centerId !== filterCenter) return false;
      if (filterCategory && tpl.categoryId !== filterCategory) return false;
      return true;
    });
  }, [templates, filterCenter, filterCategory]);

  function closeForm() {
    setEditing(null);
    setCreating(false);
  }

  async function handleDelete(tpl: ExpenseTemplateDto) {
    if (!window.confirm(t('accounting.template.delete_confirm'))) return;
    setActionError(null);
    try {
      await onDelete(tpl.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle>{t('accounting.template.manage')}</SheetTitle>
          <SheetDescription>{t('accounting.template.desc')}</SheetDescription>
        </SheetHeader>

        <div className="px-6 py-4 flex flex-col gap-3">
          {!creating && !editing && (
            <>
              <Button onClick={() => setCreating(true)} variant="outline" className="self-start">
                <Plus className="h-4 w-4" />
                {t('accounting.template.new')}
              </Button>

              <FilterBar
                hasActive={!!filterCenter || !!filterCategory}
                onClear={() => { setFilterCenter(''); setFilterCategory(''); }}
              >
                <FilterField label={t('common.center')}>
                  <select
                    className={filterSelectClass}
                    value={filterCenter}
                    onChange={(e) => setFilterCenter(e.target.value)}
                  >
                    <option value="">{t('common.all_m')}</option>
                    {centers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </FilterField>
                <FilterField label={t('accounting.template.col_category')}>
                  <select
                    className={filterInputClass}
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="">{t('common.all_f')}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </FilterField>
              </FilterBar>
            </>
          )}

          {actionError && (
            <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{actionError}</p>
          )}

          {(creating || editing) && (
            <TemplateForm
              key={editing ? editing.id : 'create'}
              template={editing ?? undefined}
              categories={categories}
              centers={centers}
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
                {filtered.length === 0 && (
                  <li className="text-sm text-muted-foreground py-6 text-center">
                    {t('accounting.template.empty')}
                  </li>
                )}
                {filtered.map((tpl) => {
                  const center = centerById.get(tpl.centerId);
                  const cat = categoryById.get(tpl.categoryId);
                  return (
                    <li
                      key={tpl.id}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-md border px-3 py-2',
                        !tpl.active && 'opacity-60',
                      )}
                    >
                      <div className="min-w-0 flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {cat?.name ?? '—'} · {center?.name ?? '—'}
                          </span>
                          {!tpl.active && <Badge variant="outline">{t('common.inactive_f')}</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground truncate">
                          {tpl.description ?? '—'} · {eurFmt.format(tpl.defaultAmount)}
                          {tpl.chargeDayOfMonth ? ` · ${t('accounting.template.day_of_month')} ${tpl.chargeDayOfMonth}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t('accounting.template.edit_aria')}
                          onClick={() => setEditing(tpl)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t('accounting.template.delete_aria')}
                          className="hover:text-destructive"
                          onClick={() => handleDelete(tpl)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
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

function TemplateForm({
  template,
  categories,
  centers,
  onSubmit,
  onCancel,
}: {
  template?: ExpenseTemplateDto;
  categories: ExpenseCategoryDto[];
  centers: CenterDto[];
  onSubmit: (values: ExpenseTemplateCreate) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const selectClass =
    'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

  const textareaClass =
    'w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

  const defaultValues: TemplateFormValues = template
    ? {
        centerId: template.centerId,
        categoryId: template.categoryId,
        defaultAmount: template.defaultAmount,
        chargeDayOfMonth: template.chargeDayOfMonth,
        description: template.description ?? '',
        paymentMethod: template.paymentMethod,
        active: template.active,
      }
    : {
        centerId: '',
        categoryId: '',
        defaultAmount: 0,
        chargeDayOfMonth: undefined,
        description: '',
        paymentMethod: 'sepa',
        active: true,
      };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues,
  });

  async function submit(values: TemplateFormValues) {
    const payload: ExpenseTemplateCreate = {
      centerId: values.centerId,
      categoryId: values.categoryId,
      defaultAmount: values.defaultAmount,
      chargeDayOfMonth: values.chargeDayOfMonth,
      description: values.description && values.description.trim() ? values.description : undefined,
      paymentMethod: values.paymentMethod,
      active: values.active,
    };
    await onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-3 rounded-md border p-3 bg-muted/30" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tpl-center" className="text-sm font-medium">{t('common.center')}</label>
        <select id="tpl-center" className={selectClass} aria-invalid={!!errors.centerId} {...register('centerId')}>
          <option value="">{t('accounting.template.field.center_placeholder')}</option>
          {centers
            .filter((c) => c.active || (template && c.id === template.centerId))
            .map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
        </select>
        {errors.centerId && <p role="alert" className="text-xs text-destructive">{errors.centerId.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tpl-category" className="text-sm font-medium">{t('accounting.template.col_category')}</label>
        <select id="tpl-category" className={selectClass} aria-invalid={!!errors.categoryId} {...register('categoryId')}>
          <option value="">{t('accounting.template.field.category_placeholder')}</option>
          {categories
            .filter((c) => c.active && !c.isSalary)
            .map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
        </select>
        {errors.categoryId && <p role="alert" className="text-xs text-destructive">{errors.categoryId.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tpl-amount" className="text-sm font-medium">{t('accounting.template.field.default_amount')}</label>
        <Input
          id="tpl-amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          aria-invalid={!!errors.defaultAmount}
          {...register('defaultAmount', {
            setValueAs: (v) => (v === '' || v === null || v === undefined ? 0 : Number(v)),
          })}
        />
        {errors.defaultAmount && <p role="alert" className="text-xs text-destructive">{errors.defaultAmount.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tpl-day" className="text-sm font-medium">
          {t('accounting.template.field.charge_day')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span>
        </label>
        <Input
          id="tpl-day"
          type="number"
          min="1"
          max="31"
          aria-invalid={!!errors.chargeDayOfMonth}
          {...register('chargeDayOfMonth', {
            setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
          })}
        />
        {errors.chargeDayOfMonth && <p role="alert" className="text-xs text-destructive">{errors.chargeDayOfMonth.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tpl-payment" className="text-sm font-medium">{t('accounting.template.field.payment_method')}</label>
        <select id="tpl-payment" className={selectClass} {...register('paymentMethod')}>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>{t(`accounting.payment_method.${m}`)}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tpl-desc" className="text-sm font-medium">
          {t('accounting.template.field.description')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span>
        </label>
        <textarea id="tpl-desc" rows={2} className={textareaClass} {...register('description')} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register('active')} />
        {t('accounting.template.field.active')}
      </label>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>{t('sheet.cancel')}</Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {template ? t('common.save_changes') : t('common.create')}
        </Button>
      </div>
    </form>
  );
}
