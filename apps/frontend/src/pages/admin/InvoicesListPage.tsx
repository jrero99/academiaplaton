import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, FileText, Sparkles, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/admin/PageHeader';
import {
  FilterBar,
  FilterField,
  filterInputClass,
  filterSelectClass,
} from '@/components/admin/FilterBar';
import { MOCK_INVOICES } from '@/features/billing/data/mock-invoices';
import { MOCK_STUDENTS } from '@/features/students/data/mock-students';
import { MOCK_CENTERS } from '@/features/centers/data/mock-centers';
import { useCurrentUser } from '@/contexts/AuthContext';
import { scopedCenterId } from '@/features/auth/lib/scope';
import {
  InvoiceSheet,
  type InvoiceFormValues,
} from '@/features/billing/components/InvoiceSheet';
import { openInvoicePdf } from '@/features/billing/lib/invoice-pdf';
import type { InvoiceDto, InvoiceStatus } from '@academiaplaton/shared';
import { useTranslation } from '@/contexts/LanguageContext';

const ORG_ID = '00000000-0000-0000-0000-000000000001';

type SheetState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; invoice: InvoiceDto };

const initialFilters = {
  search: '',
  number: '',
  student: '',
  concept: '',
  status: '' as '' | InvoiceStatus,
  periodMonth: '' as '' | string, // '' = todos
  periodYear: '' as '' | string,
};

function includesCi(haystack: string | null | undefined, needle: string): boolean {
  if (!needle) return true;
  return (haystack ?? '').toLowerCase().includes(needle.toLowerCase());
}

function buildInvoiceNumber(year: number, month: number, seq: number): string {
  return `${year}-${month.toString().padStart(2, '0')}-${seq.toString().padStart(4, '0')}`;
}

function lastDayOfMonth(year: number, month1to12: number): string {
  // month1to12 = 1..12. Día 0 del mes siguiente = último día del mes.
  const d = new Date(Date.UTC(year, month1to12, 0));
  return d.toISOString().slice(0, 10);
}

function formToInvoiceFields(data: InvoiceFormValues) {
  const issuedIso = data.issuedAt
    ? new Date(data.issuedAt).toISOString()
    : undefined;
  return {
    studentId: data.studentId,
    number: data.number,
    concept: data.concept,
    amount: data.amount,
    periodMonth: data.periodMonth,
    periodYear: data.periodYear,
    dueDate: data.dueDate,
    issuedAt: issuedIso,
    status: data.status,
    notes: data.notes && data.notes.trim() ? data.notes : undefined,
  };
}

export function InvoicesListPage() {
  const currentUser = useCurrentUser();
  const scopedCenter = scopedCenterId(currentUser);
  const { t, locale } = useTranslation();

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }),
    [locale],
  );

  const eurFmt = useMemo(
    () => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }),
    [locale],
  );

  // Month labels from translations — reactive to locale
  const MONTH_LABELS = useMemo(() => [
    t('invoices.month.1'), t('invoices.month.2'), t('invoices.month.3'),
    t('invoices.month.4'), t('invoices.month.5'), t('invoices.month.6'),
    t('invoices.month.7'), t('invoices.month.8'), t('invoices.month.9'),
    t('invoices.month.10'), t('invoices.month.11'), t('invoices.month.12'),
  ], [t]);

  const STATUS_META: Record<InvoiceStatus, { labelKey: string; className: string }> = useMemo(() => ({
    pending:   { labelKey: 'invoices.status.pending',   className: 'bg-muted text-muted-foreground' },
    sent:      { labelKey: 'invoices.status.sent',      className: 'bg-accent text-accent-foreground' },
    paid:      { labelKey: 'invoices.status.paid',      className: 'bg-emerald-100 text-emerald-800' },
    overdue:   { labelKey: 'invoices.status.overdue',   className: 'bg-destructive/10 text-destructive' },
    cancelled: { labelKey: 'invoices.status.cancelled', className: 'bg-zinc-200 text-zinc-700' },
  }), []);

  const [invoices, setInvoices] = useState<InvoiceDto[]>(MOCK_INVOICES);
  const [filters, setFilters] = useState(initialFilters);
  const [sheet, setSheet] = useState<SheetState>({ open: false });

  const studentById = useMemo(
    () => new Map(MOCK_STUDENTS.map((s) => [s.id, s])),
    [],
  );
  const centerById = useMemo(
    () => new Map(MOCK_CENTERS.map((c) => [c.id, c])),
    [],
  );

  // Alumnos accesibles para el rol actual (admin todos, manager solo los de su centro).
  const accessibleStudents = useMemo(
    () => (scopedCenter === null ? MOCK_STUDENTS : MOCK_STUDENTS.filter((s) => s.centerId === scopedCenter)),
    [scopedCenter],
  );

  // Año actual y años visibles en los recibos (para el filtro).
  const availableYears = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    invoices.forEach((i) => set.add(i.periodYear));
    return Array.from(set).sort((a, b) => b - a);
  }, [invoices]);

  const hasActiveFilters =
    filters.search !== '' ||
    filters.number !== '' ||
    filters.student !== '' ||
    filters.concept !== '' ||
    filters.status !== '' ||
    filters.periodMonth !== '' ||
    filters.periodYear !== '';

  function clearFilters() {
    setFilters(initialFilters);
  }

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return invoices.filter((inv) => {
      const student = studentById.get(inv.studentId);
      // Scope por centro vía el alumno asociado al recibo.
      if (scopedCenter !== null && (!student || student.centerId !== scopedCenter)) return false;
      if (filters.status && inv.status !== filters.status) return false;
      if (filters.periodMonth && inv.periodMonth !== Number(filters.periodMonth)) return false;
      if (filters.periodYear && inv.periodYear !== Number(filters.periodYear)) return false;

      const studentName = student ? `${student.firstName} ${student.lastName}` : '';

      if (!includesCi(inv.number, filters.number)) return false;
      if (!includesCi(studentName, filters.student)) return false;
      if (!includesCi(inv.concept, filters.concept)) return false;

      if (q) {
        const hit = [inv.number, inv.concept, studentName]
          .some((v) => v.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [invoices, filters, studentById, scopedCenter]);

  const filteredTotal = useMemo(
    () => filtered.reduce((acc, inv) => acc + Number(inv.amount), 0),
    [filtered],
  );

  function openCreate() {
    setSheet({ open: true, mode: 'create' });
  }

  function openEdit(invoice: InvoiceDto) {
    setSheet({ open: true, mode: 'edit', invoice });
  }

  function closeSheet() {
    setSheet({ open: false });
  }

  function handleSheetSubmit(data: InvoiceFormValues) {
    if (!sheet.open) return;
    const fields = formToInvoiceFields(data);

    if (sheet.mode === 'create') {
      const now = new Date().toISOString();
      const created: InvoiceDto = {
        id: crypto.randomUUID(),
        organizationId: ORG_ID,
        createdAt: now,
        updatedAt: now,
        ...fields,
      };
      setInvoices((prev) => [created, ...prev]);
    } else {
      const id = sheet.invoice.id;
      setInvoices((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, ...fields, updatedAt: new Date().toISOString() } : i,
        ),
      );
    }
  }

  function handleDelete(id: string) {
    setInvoices((prev) => prev.filter((i) => i.id !== id));
  }

  function handleGenerateMonth() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const monthLabel = (MONTH_LABELS[month - 1] ?? '').toLowerCase();
    const dueDate = lastDayOfMonth(year, month);
    const now = new Date().toISOString();

    setInvoices((prev) => {
      // Alumnos con cuota > 0 que aún no tienen recibo para este periodo.
      const eligible = MOCK_STUDENTS.filter(
        (s) => s.monthlyFee != null && s.monthlyFee > 0,
      ).filter(
        (s) =>
          !prev.some(
            (i) =>
              i.studentId === s.id &&
              i.periodMonth === month &&
              i.periodYear === year,
          ),
      );

      // Numeración correlativa partiendo del nº más alto existente para el periodo.
      const existingForPeriod = prev.filter(
        (i) => i.periodMonth === month && i.periodYear === year,
      );
      let nextSeq = existingForPeriod.length + 1;

      const generated: InvoiceDto[] = eligible.map((s) => {
        const number = buildInvoiceNumber(year, month, nextSeq++);
        return {
          id: crypto.randomUUID(),
          organizationId: ORG_ID,
          studentId: s.id,
          number,
          concept: t('invoices.generated_concept', { month: monthLabel, year }),
          amount: s.monthlyFee!,
          periodMonth: month,
          periodYear: year,
          dueDate,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        };
      });

      if (generated.length === 0) {
        alert(t('invoices.no_new_this_month'));
        return prev;
      }
      return [...generated, ...prev];
    });
  }

  function handlePdf(invoice: InvoiceDto) {
    const student = studentById.get(invoice.studentId);
    if (!student) {
      alert(t('invoices.student_not_found_alert'));
      return;
    }
    const center = centerById.get(student.centerId);
    openInvoicePdf({
      invoice,
      student,
      centerName: center?.name,
      t,
      locale,
    });
  }

  const invoiceUnit = (count: number) =>
    count === 1 ? t('invoices.unit_singular') : t('invoices.unit_plural');

  return (
    <>
      <PageHeader
        title={t('invoices.title')}
        breadcrumbs={[{ label: t('breadcrumb.admin'), to: '/admin' }, { label: t('invoices.title') }]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('invoices.new')}
          </Button>
          <Button variant="outline" onClick={handleGenerateMonth}>
            <Sparkles className="h-4 w-4" />
            {t('invoices.generate_month')}
          </Button>
          {currentUser.roles.includes('admin') && (
            <Button asChild variant="outline">
              <Link to="/admin/sepa-remittance">
                <Banknote className="h-4 w-4" />
                Remesa SEPA
              </Link>
            </Button>
          )}
        </div>
      </div>

      <FilterBar hasActive={hasActiveFilters} onClear={clearFilters}>
        <FilterField label={t('filterbar.search_label')}>
          <input
            type="text"
            className={filterInputClass}
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder={t('invoices.filter.placeholder_search')}
            aria-label={t('common.search_general_aria')}
          />
        </FilterField>

        <FilterField label={t('invoices.col.number')}>
          <input
            type="text"
            className={filterInputClass}
            value={filters.number}
            onChange={(e) => setFilters((f) => ({ ...f, number: e.target.value }))}
            aria-label={t('invoices.filter.number_aria')}
          />
        </FilterField>

        <FilterField label={t('invoices.col.student')}>
          <input
            type="text"
            className={filterInputClass}
            value={filters.student}
            onChange={(e) => setFilters((f) => ({ ...f, student: e.target.value }))}
            aria-label={t('invoices.filter.student_aria')}
          />
        </FilterField>

        <FilterField label={t('invoices.col.concept')}>
          <input
            type="text"
            className={filterInputClass}
            value={filters.concept}
            onChange={(e) => setFilters((f) => ({ ...f, concept: e.target.value }))}
            aria-label={t('invoices.filter.concept_aria')}
          />
        </FilterField>

        <FilterField label={t('common.status')}>
          <select
            className={filterSelectClass}
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value as InvoiceStatus | '' }))
            }
            aria-label={t('common.filter_by_status_aria')}
          >
            <option value="">{t('invoices.filter.status_all')}</option>
            {(Object.entries(STATUS_META) as [InvoiceStatus, { labelKey: string }][]).map(
              ([value, meta]) => (
                <option key={value} value={value}>{t(meta.labelKey)}</option>
              ),
            )}
          </select>
        </FilterField>

        <FilterField label={t('invoices.filter.month')}>
          <select
            className={filterSelectClass}
            value={filters.periodMonth}
            onChange={(e) => setFilters((f) => ({ ...f, periodMonth: e.target.value }))}
            aria-label={t('invoices.filter.month_aria')}
          >
            <option value="">{t('invoices.filter.month_all')}</option>
            {MONTH_LABELS.map((label, i) => (
              <option key={i} value={i + 1}>{label}</option>
            ))}
          </select>
        </FilterField>

        <FilterField label={t('invoices.filter.year')}>
          <select
            className={filterSelectClass}
            value={filters.periodYear}
            onChange={(e) => setFilters((f) => ({ ...f, periodYear: e.target.value }))}
            aria-label={t('invoices.filter.year_aria')}
          >
            <option value="">{t('invoices.filter.year_all')}</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </FilterField>
      </FilterBar>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="w-12 text-muted-foreground hidden sm:table-cell">#</TableHead>
                <TableHead className="hidden sm:table-cell">{t('invoices.col.number')}</TableHead>
                <TableHead>{t('invoices.col.student')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('invoices.col.concept')}</TableHead>
                <TableHead>{t('invoices.col.amount')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('invoices.col.due_date')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('invoices.col.sent_at')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="w-24 text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    {t('invoices.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((inv, idx) => {
                  const student = studentById.get(inv.studentId);
                  const studentName = student
                    ? `${student.firstName} ${student.lastName}`
                    : t('invoices.student_missing');
                  const statusMeta = STATUS_META[inv.status];
                  return (
                    <TableRow key={inv.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-muted-foreground hidden sm:table-cell">{idx + 1}</TableCell>
                      <TableCell className="font-medium hidden sm:table-cell">{inv.number}</TableCell>
                      <TableCell>{studentName}</TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">{inv.concept}</TableCell>
                      <TableCell className="font-medium">{eurFmt.format(Number(inv.amount))}</TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">
                        {dateFmt.format(new Date(inv.dueDate))}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">
                        {inv.issuedAt ? dateFmt.format(new Date(inv.issuedAt)) : '—'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusMeta.className}`}
                        >
                          {t(statusMeta.labelKey)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('invoices.action.pdf', { number: inv.number })}
                            onClick={() => handlePdf(inv)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('invoices.action.edit', { number: inv.number })}
                            onClick={() => openEdit(inv)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('invoices.action.delete', { number: inv.number })}
                            className="hover:text-destructive"
                            onClick={() => handleDelete(inv.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-3 text-sm text-muted-foreground">
        {t('invoices.summary', { count: filtered.length, recibo: invoiceUnit(filtered.length) })}
        <span className="font-semibold text-foreground">{eurFmt.format(filteredTotal)}</span>
      </div>

      <InvoiceSheet
        open={sheet.open}
        onOpenChange={(open) => { if (!open) closeSheet(); }}
        mode={sheet.open ? sheet.mode : 'create'}
        invoice={sheet.open && sheet.mode === 'edit' ? sheet.invoice : undefined}
        students={accessibleStudents}
        onSubmit={handleSheetSubmit}
      />
    </>
  );
}
