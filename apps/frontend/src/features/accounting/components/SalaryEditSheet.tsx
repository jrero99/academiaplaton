import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import type {
  ExpenseUpdate,
  MonthlySummarySalaryLine,
} from '@academiaplaton/shared';
import { useTranslation } from '@/contexts/LanguageContext';

const schema = z.object({
  // Override del importe calculado. Vacío = sin override (vuelve al computed).
  amount: z
    .number({ invalid_type_error: 'Importe inválido' })
    .nonnegative('Debe ser >= 0')
    .max(99999999),
  paidAt: z.string().or(z.literal('')).optional(),
  notes: z.string().max(2000).or(z.literal('')).optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salary: MonthlySummarySalaryLine | null;
  // El expenseId existe sólo si el mes ya fue generado. Si null, mostramos
  // mensaje pidiendo "Generar mes" primero.
  onUpdate: (id: string, input: ExpenseUpdate) => Promise<void>;
}

export function SalaryEditSheet({ open, onOpenChange, salary, onUpdate }: Props) {
  const { t, locale } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const eurFmt = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' });

  const defaultValues: FormValues = salary
    ? {
        amount: salary.override ?? salary.computed,
        paidAt: '',
        notes: '',
      }
    : { amount: 0, paidAt: '', notes: '' };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const formKey = salary ? `${salary.teacherId}-${salary.expenseId ?? 'none'}` : 'empty';

  async function submit(values: FormValues) {
    if (!salary || !salary.expenseId) return;
    setSubmitError(null);
    try {
      const payload: ExpenseUpdate = {
        amount: values.amount,
        paidAt: values.paidAt ? values.paidAt : null,
        notes: values.notes && values.notes.trim() ? values.notes : null,
      };
      await onUpdate(salary.expenseId, payload);
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle>{t('accounting.salary_sheet.title')}</SheetTitle>
          <SheetDescription>
            {salary
              ? t('accounting.salary_sheet.desc', {
                  teacher: `${salary.teacherFirstName} ${salary.teacherLastName}`,
                })
              : ''}
          </SheetDescription>
        </SheetHeader>

        {salary && (
          <div className="px-6 py-4 flex flex-col gap-4" key={formKey}>
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('accounting.salary_sheet.hours_worked')}</span>
                <span className="font-medium">{salary.hoursWorked.toFixed(2)} h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('accounting.salary_sheet.hourly_rate')}</span>
                <span className="font-medium">{salary.hourlyRate != null ? eurFmt.format(salary.hourlyRate) : t('common.dash')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('accounting.salary_sheet.computed')}</span>
                <span className="font-medium">{eurFmt.format(salary.computed)}</span>
              </div>
            </div>

            {!salary.expenseId ? (
              <p className="text-sm text-muted-foreground rounded-md border border-dashed px-3 py-3">
                {t('accounting.salary_sheet.not_generated')}
              </p>
            ) : (
              <form id="salary-form" onSubmit={handleSubmit(submit)} className="flex flex-col gap-3" noValidate>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="sal-amount" className="text-sm font-medium">
                    {t('accounting.salary_sheet.amount')}
                  </label>
                  <Input
                    id="sal-amount"
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
                  <label htmlFor="sal-paid" className="text-sm font-medium">
                    {t('accounting.salary_sheet.paid_at')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span>
                  </label>
                  <Input id="sal-paid" type="date" {...register('paidAt')} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="sal-notes" className="text-sm font-medium">
                    {t('accounting.salary_sheet.notes')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span>
                  </label>
                  <Input id="sal-notes" {...register('notes')} />
                </div>

                {submitError && (
                  <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{submitError}</p>
                )}
              </form>
            )}
          </div>
        )}

        <SheetFooter className="px-6 pb-6 pt-0 flex-row justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('sheet.cancel')}
          </Button>
          {salary?.expenseId && (
            <Button type="submit" form="salary-form" disabled={isSubmitting}>
              {t('common.save_changes')}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
