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
  ExpensePaymentMethod,
  IncomeCreate,
  IncomeDto,
  IncomeUpdate,
  PeriodMonth,
} from '@academiaplaton/shared';
import { useTranslation } from '@/contexts/LanguageContext';

const PAYMENT_METHODS: ExpensePaymentMethod[] = ['sepa', 'transfer', 'cash', 'other'];

const periodMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

const incomeSchema = z.object({
  centerId: z.string().uuid('Selecciona un centro'),
  periodMonth: z.string().regex(periodMonthRegex, 'YYYY-MM'),
  source: z.string().min(1, 'Concepto obligatorio').max(120),
  amount: z
    .number({ invalid_type_error: 'Importe inválido' })
    .nonnegative('Debe ser >= 0')
    .max(99999999),
  paymentMethod: z.enum(['sepa', 'transfer', 'cash', 'other'] as const),
  receivedAt: z.string().or(z.literal('')).optional(),
  notes: z.string().max(2000).or(z.literal('')).optional(),
});
type IncomeFormValues = z.infer<typeof incomeSchema>;

const selectClassName =
  'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm dark:bg-input/30';

const textareaClassName =
  'w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm dark:bg-input/30';

export interface IncomeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  income?: IncomeDto;
  centers: CenterDto[];
  defaultCenterId?: string;
  defaultPeriodMonth: PeriodMonth;
  onCreate: (input: IncomeCreate) => Promise<void>;
  onUpdate: (id: string, input: IncomeUpdate) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function IncomeSheet(props: IncomeSheetProps) {
  const { t } = useTranslation();
  const formKey = props.mode === 'edit' && props.income ? props.income.id : 'create';
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle>
            {props.mode === 'create'
              ? t('accounting.income_sheet.title_create')
              : t('accounting.income_sheet.title_edit')}
          </SheetTitle>
          <SheetDescription>{t('accounting.income_sheet.desc')}</SheetDescription>
        </SheetHeader>
        <IncomeForm key={formKey} {...props} />
      </SheetContent>
    </Sheet>
  );
}

function IncomeForm({
  mode,
  income,
  centers,
  defaultCenterId,
  defaultPeriodMonth,
  onCreate,
  onUpdate,
  onDelete,
  onOpenChange,
}: IncomeSheetProps) {
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultValues: IncomeFormValues =
    mode === 'edit' && income
      ? {
          centerId: income.centerId,
          periodMonth: income.periodMonth,
          source: income.source,
          amount: income.amount,
          paymentMethod: income.paymentMethod,
          receivedAt: income.receivedAt ?? '',
          notes: income.notes ?? '',
        }
      : {
          centerId: defaultCenterId ?? '',
          periodMonth: defaultPeriodMonth,
          source: '',
          amount: 0,
          paymentMethod: 'cash',
          receivedAt: '',
          notes: '',
        };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeSchema),
    defaultValues,
  });

  async function submit(values: IncomeFormValues) {
    setSubmitError(null);
    try {
      if (mode === 'create') {
        const payload: IncomeCreate = {
          centerId: values.centerId,
          periodMonth: values.periodMonth as PeriodMonth,
          source: values.source,
          amount: values.amount,
          paymentMethod: values.paymentMethod,
          receivedAt: values.receivedAt ? values.receivedAt : undefined,
          notes: values.notes && values.notes.trim() ? values.notes : undefined,
        };
        await onCreate(payload);
      } else if (income) {
        const payload: IncomeUpdate = {
          centerId: values.centerId,
          periodMonth: values.periodMonth as PeriodMonth,
          source: values.source,
          amount: values.amount,
          paymentMethod: values.paymentMethod,
          receivedAt: values.receivedAt ? values.receivedAt : null,
          notes: values.notes && values.notes.trim() ? values.notes : null,
        };
        await onUpdate(income.id, payload);
      }
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete() {
    if (!income || !onDelete) return;
    if (!window.confirm(t('accounting.income_sheet.delete_confirm'))) return;
    setSubmitError(null);
    try {
      await onDelete(income.id);
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <form id="income-form" onSubmit={handleSubmit(submit)} className="flex flex-col gap-4 px-6 py-6" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="income-center" className="text-sm font-medium">
            {t('accounting.income_sheet.field.center')} <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <select id="income-center" className={selectClassName} aria-invalid={!!errors.centerId} {...register('centerId')}>
            <option value="">{t('accounting.income_sheet.field.center_placeholder')}</option>
            {centers
              .filter((c) => c.active || (income && c.id === income.centerId))
              .map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
          {errors.centerId && <p role="alert" className="text-xs text-destructive">{errors.centerId.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="income-period" className="text-sm font-medium">
            {t('accounting.income_sheet.field.period')} <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <Input
            id="income-period"
            type="month"
            aria-invalid={!!errors.periodMonth}
            {...register('periodMonth')}
          />
          {errors.periodMonth && <p role="alert" className="text-xs text-destructive">{errors.periodMonth.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="income-source" className="text-sm font-medium">
            {t('accounting.income_sheet.field.source')} <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <Input id="income-source" aria-invalid={!!errors.source} {...register('source')} />
          {errors.source && <p role="alert" className="text-xs text-destructive">{errors.source.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="income-amount" className="text-sm font-medium">
            {t('accounting.income_sheet.field.amount')} <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <Input
            id="income-amount"
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
          <label htmlFor="income-payment" className="text-sm font-medium">
            {t('accounting.income_sheet.field.payment_method')}
          </label>
          <select id="income-payment" className={selectClassName} {...register('paymentMethod')}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{t(`accounting.payment_method.${m}`)}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="income-received" className="text-sm font-medium">
            {t('accounting.income_sheet.field.received_at')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span>
          </label>
          <Input id="income-received" type="date" {...register('receivedAt')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="income-notes" className="text-sm font-medium">
            {t('accounting.income_sheet.field.notes')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span>
          </label>
          <textarea id="income-notes" rows={3} className={textareaClassName} {...register('notes')} />
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
          <Button type="submit" form="income-form" disabled={isSubmitting}>
            {mode === 'create' ? t('common.create') : t('common.save_changes')}
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}
