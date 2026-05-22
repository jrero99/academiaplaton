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
import type { InvoiceDto, StudentDto } from '@academiaplaton/shared';
import { useTranslation } from '@/contexts/LanguageContext';

// ------------------------------------------------------------------ schema
const invoiceSchema = z.object({
  studentId: z.string().uuid('Selecciona un alumno'),
  number: z.string().min(1, 'Obligatorio').max(40),
  concept: z.string().min(1, 'Obligatorio').max(160),
  amount: z
    .number({ invalid_type_error: 'Introduce un importe válido' })
    .positive('Debe ser > 0')
    .max(999999, 'Importe demasiado alto'),
  periodMonth: z
    .number({ invalid_type_error: 'Mes inválido' })
    .int()
    .min(1, 'Mes inválido')
    .max(12, 'Mes inválido'),
  periodYear: z
    .number({ invalid_type_error: 'Año inválido' })
    .int()
    .min(2020, 'Año inválido')
    .max(2100, 'Año inválido'),
  dueDate: z.string().min(1, 'La fecha de vencimiento es obligatoria'),
  issuedAt: z.string().optional(),
  status: z.enum(['pending', 'sent', 'paid', 'overdue', 'cancelled']),
  notes: z.string().max(500).or(z.literal('')).optional(),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;

const selectClassName =
  'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm dark:bg-input/30';

const textareaClassName =
  'w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm dark:bg-input/30';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  invoice?: InvoiceDto;
  students: StudentDto[];
  onSubmit: (data: InvoiceFormValues) => void;
}

function isoToDateInput(iso: string | undefined): string {
  if (!iso) return '';
  // datetime-local espera "YYYY-MM-DDTHH:mm"
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function InvoiceForm({
  mode,
  invoice,
  students,
  onSubmit,
  onCancel,
}: {
  mode: 'create' | 'edit';
  invoice?: InvoiceDto;
  students: StudentDto[];
  onSubmit: (data: InvoiceFormValues) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  const STATUS_OPTIONS: { value: InvoiceFormValues['status']; labelKey: string }[] = [
    { value: 'pending', labelKey: 'invoices.status.pending' },
    { value: 'sent',    labelKey: 'invoices.status.sent' },
    { value: 'paid',    labelKey: 'invoices.status.paid' },
    { value: 'overdue', labelKey: 'invoices.status.overdue' },
    { value: 'cancelled', labelKey: 'invoices.status.cancelled' },
  ];

  const today = new Date();
  const defaultMonth = today.getMonth() + 1;
  const defaultYear = today.getFullYear();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues:
      mode === 'edit' && invoice
        ? {
            studentId: invoice.studentId,
            number: invoice.number,
            concept: invoice.concept,
            amount: invoice.amount,
            periodMonth: invoice.periodMonth,
            periodYear: invoice.periodYear,
            dueDate: invoice.dueDate,
            issuedAt: isoToDateInput(invoice.issuedAt),
            status: invoice.status,
            notes: invoice.notes ?? '',
          }
        : {
            studentId: '',
            number: '',
            concept: '',
            amount: undefined as unknown as number,
            periodMonth: defaultMonth,
            periodYear: defaultYear,
            dueDate: '',
            issuedAt: '',
            status: 'pending',
            notes: '',
          },
  });

  // Cuando se elige alumno y aún no hay importe, autocompleta con su cuota mensual.
  const watchedStudentId = watch('studentId');
  function handleStudentChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const sid = e.target.value;
    setValue('studentId', sid, { shouldValidate: true });
    const s = students.find((x) => x.id === sid);
    if (s?.monthlyFee != null) {
      setValue('amount', s.monthlyFee, { shouldValidate: true });
    }
  }

  return (
    <>
      <form
        id="invoice-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-5 px-6 py-6"
        noValidate
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="invoice-student" className="text-sm font-medium">
            {t('invoice_sheet.field.student')} <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <select
            id="invoice-student"
            aria-invalid={!!errors.studentId}
            className={selectClassName}
            value={watchedStudentId ?? ''}
            onChange={handleStudentChange}
          >
            <option value="">{t('invoice_sheet.field.student_placeholder')}</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
                {s.monthlyFee != null ? ` · ${s.monthlyFee.toFixed(2)} €/mes` : ''}
              </option>
            ))}
          </select>
          {errors.studentId && (
            <p role="alert" className="text-xs text-destructive">{errors.studentId.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invoice-number" className="text-sm font-medium">
              {t('invoices.col.number')} <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <Input
              id="invoice-number"
              aria-invalid={!!errors.number}
              {...register('number')}
            />
            {errors.number && (
              <p role="alert" className="text-xs text-destructive">{errors.number.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invoice-amount" className="text-sm font-medium">
              {t('invoice_sheet.field.amount_eur')} <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <Input
              id="invoice-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              aria-invalid={!!errors.amount}
              {...register('amount', {
                setValueAs: (v) => {
                  if (v === '' || v === null || v === undefined) return undefined;
                  const n = typeof v === 'number' ? v : Number(v);
                  return Number.isNaN(n) ? undefined : n;
                },
              })}
            />
            {errors.amount && (
              <p role="alert" className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="invoice-concept" className="text-sm font-medium">
            {t('invoices.col.concept')} <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <Input
            id="invoice-concept"
            placeholder={t('invoice_sheet.field.concept_placeholder')}
            aria-invalid={!!errors.concept}
            {...register('concept')}
          />
          {errors.concept && (
            <p role="alert" className="text-xs text-destructive">{errors.concept.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invoice-period-month" className="text-sm font-medium">
              {t('invoice_sheet.field.period_month')} <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <select
              id="invoice-period-month"
              className={selectClassName}
              {...register('periodMonth', { valueAsNumber: true })}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
              ))}
            </select>
            {errors.periodMonth && (
              <p role="alert" className="text-xs text-destructive">{errors.periodMonth.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invoice-period-year" className="text-sm font-medium">
              {t('invoice_sheet.field.period_year')} <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <Input
              id="invoice-period-year"
              type="number"
              min="2020"
              max="2100"
              aria-invalid={!!errors.periodYear}
              {...register('periodYear', { valueAsNumber: true })}
            />
            {errors.periodYear && (
              <p role="alert" className="text-xs text-destructive">{errors.periodYear.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invoice-due" className="text-sm font-medium">
              {t('invoice_sheet.field.due_date_label')} <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <Input
              id="invoice-due"
              type="date"
              aria-invalid={!!errors.dueDate}
              {...register('dueDate')}
            />
            {errors.dueDate && (
              <p role="alert" className="text-xs text-destructive">{errors.dueDate.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invoice-issued" className="text-sm font-medium">
              {t('invoice_sheet.field.issued_at')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span>
            </label>
            <Input
              id="invoice-issued"
              type="datetime-local"
              {...register('issuedAt')}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="invoice-status" className="text-sm font-medium">{t('common.status')}</label>
          <select
            id="invoice-status"
            className={selectClassName}
            {...register('status')}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="invoice-notes" className="text-sm font-medium">
            {t('invoice_sheet.field.notes')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span>
          </label>
          <textarea
            id="invoice-notes"
            rows={3}
            className={textareaClassName}
            {...register('notes')}
          />
        </div>
      </form>

      <SheetFooter className="px-6 pb-6 pt-0 flex-row justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('sheet.cancel')}
        </Button>
        <Button type="submit" form="invoice-form" disabled={isSubmitting}>
          {mode === 'create' ? t('invoice_sheet.submit_create') : t('invoice_sheet.submit_edit')}
        </Button>
      </SheetFooter>
    </>
  );
}

export function InvoiceSheet({ open, onOpenChange, mode, invoice, students, onSubmit }: Props) {
  const { t } = useTranslation();

  function handleSubmit(data: InvoiceFormValues) {
    onSubmit(data);
    onOpenChange(false);
  }

  const formKey = mode === 'edit' && invoice ? invoice.id : 'create';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle>{mode === 'create' ? t('invoice_sheet.title_create') : t('invoice_sheet.title_edit')}</SheetTitle>
          <SheetDescription>
            {mode === 'create'
              ? t('invoice_sheet.desc_create_full')
              : t('invoice_sheet.desc_edit')}
          </SheetDescription>
        </SheetHeader>

        <InvoiceForm
          key={formKey}
          mode={mode}
          invoice={invoice}
          students={students}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
