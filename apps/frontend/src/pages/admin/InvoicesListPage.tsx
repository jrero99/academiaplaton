import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, FileText, Sparkles } from 'lucide-react';
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

const ORG_ID = '00000000-0000-0000-0000-000000000001';

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const eurFmt = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const STATUS_META: Record<InvoiceStatus, { label: string; className: string }> = {
  pending:   { label: 'Pendiente', className: 'bg-muted text-muted-foreground' },
  sent:      { label: 'Enviado',   className: 'bg-accent text-accent-foreground' },
  paid:      { label: 'Pagado',    className: 'bg-emerald-100 text-emerald-800' },
  overdue:   { label: 'Vencido',   className: 'bg-destructive/10 text-destructive' },
  cancelled: { label: 'Anulado',   className: 'bg-zinc-200 text-zinc-700' },
};

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
          concept: `Cuota ${monthLabel} ${year}`,
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
        alert('No hay nuevos recibos que generar para este mes.');
        return prev;
      }
      return [...generated, ...prev];
    });
  }

  function handlePdf(invoice: InvoiceDto) {
    const student = studentById.get(invoice.studentId);
    if (!student) {
      alert('Alumno no encontrado.');
      return;
    }
    const center = centerById.get(student.centerId);
    openInvoicePdf({
      invoice,
      student,
      centerName: center?.name,
    });
  }

  return (
    <>
      <PageHeader
        title="Recibos"
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Recibos' }]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo recibo
          </Button>
          <Button variant="outline" onClick={handleGenerateMonth}>
            <Sparkles className="h-4 w-4" />
            Generar recibos del mes
          </Button>
        </div>
      </div>

      <FilterBar hasActive={hasActiveFilters} onClear={clearFilters}>
        <FilterField label="Buscador">
          <input
            type="text"
            className={filterInputClass}
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Nº, concepto, alumno..."
            aria-label="Buscador general"
          />
        </FilterField>

        <FilterField label="Nº recibo">
          <input
            type="text"
            className={filterInputClass}
            value={filters.number}
            onChange={(e) => setFilters((f) => ({ ...f, number: e.target.value }))}
            aria-label="Filtrar por número de recibo"
          />
        </FilterField>

        <FilterField label="Alumno">
          <input
            type="text"
            className={filterInputClass}
            value={filters.student}
            onChange={(e) => setFilters((f) => ({ ...f, student: e.target.value }))}
            aria-label="Filtrar por alumno"
          />
        </FilterField>

        <FilterField label="Concepto">
          <input
            type="text"
            className={filterInputClass}
            value={filters.concept}
            onChange={(e) => setFilters((f) => ({ ...f, concept: e.target.value }))}
            aria-label="Filtrar por concepto"
          />
        </FilterField>

        <FilterField label="Estado">
          <select
            className={filterSelectClass}
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value as InvoiceStatus | '' }))
            }
            aria-label="Filtrar por estado"
          >
            <option value="">Todos</option>
            {(Object.entries(STATUS_META) as [InvoiceStatus, { label: string }][]).map(
              ([value, meta]) => (
                <option key={value} value={value}>{meta.label}</option>
              ),
            )}
          </select>
        </FilterField>

        <FilterField label="Mes">
          <select
            className={filterSelectClass}
            value={filters.periodMonth}
            onChange={(e) => setFilters((f) => ({ ...f, periodMonth: e.target.value }))}
            aria-label="Filtrar por mes"
          >
            <option value="">Todos</option>
            {MONTH_LABELS.map((label, i) => (
              <option key={i} value={i + 1}>{label}</option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Año">
          <select
            className={filterSelectClass}
            value={filters.periodYear}
            onChange={(e) => setFilters((f) => ({ ...f, periodYear: e.target.value }))}
            aria-label="Filtrar por año"
          >
            <option value="">Todos</option>
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
                <TableHead className="hidden sm:table-cell">Nº recibo</TableHead>
                <TableHead>Alumno</TableHead>
                <TableHead className="hidden md:table-cell">Concepto</TableHead>
                <TableHead>Importe</TableHead>
                <TableHead className="hidden md:table-cell">Vencimiento</TableHead>
                <TableHead className="hidden md:table-cell">Cobro enviado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No hay recibos que coincidan con los filtros.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((inv, idx) => {
                  const student = studentById.get(inv.studentId);
                  const studentName = student
                    ? `${student.firstName} ${student.lastName}`
                    : '— alumno no encontrado —';
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
                          {statusMeta.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Generar PDF del recibo ${inv.number}`}
                            onClick={() => handlePdf(inv)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar recibo ${inv.number}`}
                            onClick={() => openEdit(inv)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Borrar recibo ${inv.number}`}
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
        Mostrando {filtered.length} recibo{filtered.length === 1 ? '' : 's'} · Total facturado:{' '}
        <span className="font-semibold text-foreground">{eurFmt.format(filteredTotal)}</span>
      </div>

      <InvoiceSheet
        open={sheet.open}
        onOpenChange={(open) => { if (!open) closeSheet(); }}
        mode={sheet.open ? sheet.mode : 'create'}
        invoice={sheet.open && sheet.mode === 'edit' ? sheet.invoice : undefined}
        students={MOCK_STUDENTS}
        onSubmit={handleSheetSubmit}
      />
    </>
  );
}
