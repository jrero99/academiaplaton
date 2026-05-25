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
import type {
  CenterDto,
  ExpenseCategoryDto,
  ExpenseCreate,
  ExpenseDto,
  ExpensePaymentMethod,
  ExpenseUpdate,
  PeriodMonth,
} from '@academiaplaton/shared';
import { useTranslation } from '@/contexts/LanguageContext';

const PAYMENT_METHODS: ExpensePaymentMethod[] = ['sepa', 'transfer', 'cash', 'other'];

const periodMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

const fullSchema = z.object({
  categoryId: z.string().uuid('Selecciona una categoría'),
  centerId: z.string().uuid('Selecciona un centro'),
  periodMonth: z.string().regex(periodMonthRegex, 'YYYY-MM'),
  amount: z
    .number({ invalid_type_error: 'Importe inválido' })
    .nonnegative('Debe ser >= 0')
    .max(99999999, 'Importe demasiado alto'),
  paymentMethod: z.enum(['sepa', 'transfer', 'cash', 'other'] as const),
  paidAt: z.string().or(z.literal('')).optional(),
  notes: z.string().max(2000).or(z.literal('')).optional(),
});

// Para Expense no-manual (template_gen / salary_auto) sólo editamos amount,
// paidAt y notes. centerId/categoría/periodo vienen fijados por el origen.
const limitedSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Importe inválido' })
    .nonnegative('Debe ser >= 0')
    .max(99999999),
  paymentMethod: z.enum(['sepa', 'transfer', 'cash', 'other'] as const),
  paidAt: z.string().or(z.literal('')).optional(),
  notes: z.string().max(2000).or(z.literal('')).optional(),
});

type FullValues = z.infer<typeof fullSchema>;
type LimitedValues = z.infer<typeof limitedSchema>;

const selectClassName =
  'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm dark:bg-input/30';

const textareaClassName =
  'w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm dark:bg-input/30';

export interface ExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  expense?: ExpenseDto;
  categories: ExpenseCategoryDto[];
  centers: CenterDto[];
  defaultCenterId?: string;
  defaultCategoryId?: string;
  defaultPeriodMonth: PeriodMonth;
  onCreate: (input: ExpenseCreate) => Promise<void>;
  onUpdate: (id: string, input: ExpenseUpdate) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function ExpenseSheet(props: ExpenseSheetProps) {
  const { t } = useTranslation();
  const { open, onOpenChange, mode, expense } = props;

  const isLimited = mode === 'edit' && expense && expense.originType !== 'manual';

  // key fuerza re-mount cuando cambia el modo o el expense editado.
  const formKey = mode === 'edit' && expense ? expense.id : 'create';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle>
            {mode === 'create'
              ? t('accounting.expense_sheet.title_create')
              : t('accounting.expense_sheet.title_edit')}
          </SheetTitle>
          <SheetDescription>
            {isLimited
              ? t('accounting.expense_sheet.desc_limited')
              : t('accounting.expense_sheet.desc_full')}
          </SheetDescription>
        </SheetHeader>

        {isLimited ? (
          <LimitedForm
            key={formKey}
            {...props}
            expense={expense}
          />
        ) : (
          <FullForm key={formKey} {...props} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function FullForm({
  mode,
  expense,
  categories,
  centers,
  defaultCenterId,
  defaultCategoryId,
  defaultPeriodMonth,
  onCreate,
  onUpdate,
  onDelete,
  onOpenChange,
}: ExpenseSheetProps) {
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const activeCategories = categories.filter(
    (c) => c.active && (!c.isSalary || (expense && c.id === expense.categoryId)),
  );

  const defaultValues: FullValues =
    mode === 'edit' && expense
      ? {
          categoryId: expense.categoryId,
          centerId: expense.centerId,
          periodMonth: expense.periodMonth,
          amount: expense.amount,
          paymentMethod: expense.paymentMethod,
          paidAt: expense.paidAt ?? '',
          notes: expense.notes ?? '',
        }
      : {
          categoryId: defaultCategoryId ?? '',
          centerId: defaultCenterId ?? '',
          periodMonth: defaultPeriodMonth,
          amount: 0,
          paymentMethod: 'sepa',
          paidAt: '',
          notes: '',
        };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FullValues>({
    resolver: zodResolver(fullSchema),
    defaultValues,
  });

  async function submit(values: FullValues) {
    setSubmitError(null);
    try {
      if (mode === 'create') {
        const payload: ExpenseCreate = {
          centerId: values.centerId,
          categoryId: values.categoryId,
          periodMonth: values.periodMonth as PeriodMonth,
          amount: values.amount,
          paymentMethod: values.paymentMethod,
          originType: 'manual',
          paidAt: values.paidAt ? values.paidAt : undefined,
          notes: values.notes && values.notes.trim() ? values.notes : undefined,
        };
        await onCreate(payload);
      } else if (expense) {
        const payload: ExpenseUpdate = {
          centerId: values.centerId,
          categoryId: values.categoryId,
          periodMonth: values.periodMonth as PeriodMonth,
          amount: values.amount,
          paymentMethod: values.paymentMethod,
          paidAt: values.paidAt ? values.paidAt : null,
          notes: values.notes && values.notes.trim() ? values.notes : null,
        };
        await onUpdate(expense.id, payload);
      }
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete() {
    if (!expense || !onDelete) return;
    if (!window.confirm(t('accounting.expense_sheet.delete_confirm'))) return;
    setSubmitError(null);
    try {
      await onDelete(expense.id);
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <form id="expense-form" onSubmit={handleSubmit(submit)} className="flex flex-col gap-4 px-6 py-6" noValidate>
        {/* Categoría */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="expense-category" className="text-sm font-medium">
            {t('accounting.expense_sheet.field.category')} <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <select id="expense-category" className={selectClassName} aria-invalid={!!errors.categoryId} {...register('categoryId')}>
            <option value="">{t('accounting.expense_sheet.field.category_placeholder')}</option>
            {activeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.isSalary ? ` ${t('accounting.expense_sheet.field.category_salary_suffix')}` : ''}
              </option>
            ))}
          </select>
          {errors.categoryId && <p role="alert" className="text-xs text-destructive">{errors.categoryId.message}</p>}
        </div>

        {/* Centro */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="expense-center" className="text-sm font-medium">
            {t('accounting.expense_sheet.field.center')} <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <select id="expense-center" className={selectClassName} aria-invalid={!!errors.centerId} {...register('centerId')}>
            <option value="">{t('accounting.expense_sheet.field.center_placeholder')}</option>
            {centers
              .filter((c) => c.active || (expense && c.id === expense.centerId))
              .map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
          {errors.centerId && <p role="alert" className="text-xs text-destructive">{errors.centerId.message}</p>}
        </div>

        {/* Period */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="expense-period" className="text-sm font-medium">
            {t('accounting.expense_sheet.field.period')} <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <Input
            id="expense-period"
            type="month"
            aria-invalid={!!errors.periodMonth}
            {...register('periodMonth')}
          />
          {errors.periodMonth && <p role="alert" className="text-xs text-destructive">{errors.periodMonth.message}</p>}
        </div>

        {/* Amount */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="expense-amount" className="text-sm font-medium">
            {t('accounting.expense_sheet.field.amount')} <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <Input
            id="expense-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            aria-invalid={!!errors.amount}
            {...register('amount', {
              setValueAs: (v) => (v === '' || v === null || v === undefined ? 0 : Number(v)),
            })}
          />
          {errors.amount && <p role="alert" className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>

        {/* Payment method */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="expense-payment" className="text-sm font-medium">
            {t('accounting.expense_sheet.field.payment_method')}
          </label>
          <select id="expense-payment" className={selectClassName} {...register('paymentMethod')}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{t(`accounting.payment_method.${m}`)}</option>
            ))}
          </select>
        </div>

        {/* Paid at */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="expense-paid" className="text-sm font-medium">
            {t('accounting.expense_sheet.field.paid_at')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span>
          </label>
          <Input id="expense-paid" type="date" {...register('paidAt')} />
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="expense-notes" className="text-sm font-medium">
            {t('accounting.expense_sheet.field.notes')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span>
          </label>
          <textarea id="expense-notes" rows={3} className={textareaClassName} {...register('notes')} />
        </div>

        {submitError && (
          <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{submitError}</p>
        )}
      </form>

      <SheetFooter className="px-6 pb-6 pt-0 flex-row justify-between gap-2">
        {mode === 'edit' && onDelete ? (
          <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={handleDelete}>
            {t('common.delete')}
          </Button>
        ) : <span />}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('sheet.cancel')}
          </Button>
          <Button type="submit" form="expense-form" disabled={isSubmitting}>
            {mode === 'create' ? t('common.create') : t('common.save_changes')}
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}

function LimitedForm({
  expense,
  onUpdate,
  onDelete,
  onOpenChange,
}: ExpenseSheetProps & { expense: ExpenseDto }) {
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultValues: LimitedValues = {
    amount: expense.amount,
    paymentMethod: expense.paymentMethod,
    paidAt: expense.paidAt ?? '',
    notes: expense.notes ?? '',
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LimitedValues>({
    resolver: zodResolver(limitedSchema),
    defaultValues,
  });

  async function submit(values: LimitedValues) {
    setSubmitError(null);
    try {
      const payload: ExpenseUpdate = {
        amount: values.amount,
        paymentMethod: values.paymentMethod,
        paidAt: values.paidAt ? values.paidAt : null,
        notes: values.notes && values.notes.trim() ? values.notes : null,
      };
      await onUpdate(expense.id, payload);
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!window.confirm(t('accounting.expense_sheet.delete_confirm'))) return;
    setSubmitError(null);
    try {
      await onDelete(expense.id);
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <form id="expense-form-limited" onSubmit={handleSubmit(submit)} className="flex flex-col gap-4 px-6 py-6" noValidate>
        <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {expense.originType === 'salary_auto'
            ? t('accounting.expense_sheet.origin_salary')
            : t('accounting.expense_sheet.origin_template')}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="expense-amount-l" className="text-sm font-medium">
            {t('accounting.expense_sheet.field.amount')} <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <Input
            id="expense-amount-l"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            aria-invalid={!!errors.amount}
            {...register('amount', {
              setValueAs: (v) => (v === '' || v === null || v === undefined ? 0 : Number(v)),
            })}
          />
          {errors.amount && <p role="alert" className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="expense-payment-l" className="text-sm font-medium">
            {t('accounting.expense_sheet.field.payment_method')}
          </label>
          <select id="expense-payment-l" className={selectClassName} {...register('paymentMethod')}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{t(`accounting.payment_method.${m}`)}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="expense-paid-l" className="text-sm font-medium">
            {t('accounting.expense_sheet.field.paid_at')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span>
          </label>
          <Input id="expense-paid-l" type="date" {...register('paidAt')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="expense-notes-l" className="text-sm font-medium">
            {t('accounting.expense_sheet.field.notes')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span>
          </label>
          <textarea id="expense-notes-l" rows={3} className={textareaClassName} {...register('notes')} />
        </div>

        {submitError && (
          <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{submitError}</p>
        )}
      </form>

      <SheetFooter className="px-6 pb-6 pt-0 flex-row justify-between gap-2">
        {onDelete ? (
          <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={handleDelete}>
            {t('common.delete')}
          </Button>
        ) : <span />}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('sheet.cancel')}
          </Button>
          <Button type="submit" form="expense-form-limited" disabled={isSubmitting}>
            {t('common.save_changes')}
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}
