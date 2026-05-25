import { useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Loader2, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/admin/PageHeader';
import { MOCK_STUDENTS } from '@/features/students/data/mock-students';
import { MOCK_SEPA_MANDATES } from '@/features/billing/data/mock-sepa-mandates';
import { PLATO_CREDITOR } from '@/features/billing/lib/sepa-creditor';
import {
  generateAndDownloadSepaRemittance,
  type SepaRemittanceLine,
  type SepaSequence,
} from '@/features/billing/lib/sepa-remittance';

const eurFmt = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

type GenerationState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'success'; filename: string; total: number; count: number }
  | { phase: 'error'; message: string };

interface RowData {
  studentId: string;
  studentName: string;
  mandateReference: string;
  mandateSignedAt: string; // ISO yyyy-mm-dd
  holderName: string;
  holderIban: string;
  defaultAmount: number;
  amount: number;
  sequence: SepaSequence;
  included: boolean;
  issue?: string;
}

const SEQUENCE_OPTIONS: { value: SepaSequence; label: string }[] = [
  { value: 'FRST', label: 'FRST (primero)' },
  { value: 'RCUR', label: 'RCUR (recurrente)' },
  { value: 'FNAL', label: 'FNAL (último)' },
  { value: 'OOFF', label: 'OOFF (único)' },
];

// "2026-05" → "FACT-0526"
function defaultDebitReference(date: Date): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `FACT-${mm}${yy}`;
}

function defaultConcept(date: Date): string {
  const month = new Intl.DateTimeFormat('ca-ES', { month: 'long' }).format(date);
  return `Pagament Centre d'Estudis Plató ${month}`;
}

function buildInitialRows(): RowData[] {
  return MOCK_STUDENTS.filter((s) => s.paymentMethod === 'sepa').map((s) => {
    const mandate = MOCK_SEPA_MANDATES.find((m) => m.studentIds.includes(s.id));
    const fee = s.monthlyFee ?? 0;
    const issue = !mandate
      ? 'Sin mandato SEPA asignado'
      : fee <= 0
        ? 'Sin cuota mensual definida'
        : undefined;
    return {
      studentId: s.id,
      studentName: `${s.firstName} ${s.lastName}`,
      mandateReference: mandate?.reference ?? '—',
      mandateSignedAt: mandate?.signedAt ?? '',
      holderName: mandate?.holderName ?? '—',
      holderIban: mandate?.iban ?? '—',
      defaultAmount: fee,
      amount: fee,
      sequence: 'RCUR',
      included: !issue,
      issue,
    };
  });
}

export function SepaRemittancePage() {
  const [rows, setRows] = useState<RowData[]>(buildInitialRows);

  const todayIso = new Date().toISOString().slice(0, 10);
  const [collectionDate, setCollectionDate] = useState<string>(todayIso);
  const [debitReference, setDebitReference] = useState<string>(
    defaultDebitReference(new Date()),
  );
  const [concept, setConcept] = useState<string>(defaultConcept(new Date()));
  const [state, setState] = useState<GenerationState>({ phase: 'idle' });

  const eligibleRows = useMemo(() => rows.filter((r) => !r.issue), [rows]);
  const includedRows = useMemo(() => rows.filter((r) => r.included && !r.issue), [rows]);
  const total = includedRows.reduce((acc, r) => acc + r.amount, 0);
  const allEligibleSelected =
    eligibleRows.length > 0 && eligibleRows.every((r) => r.included);

  function toggleAll() {
    const target = !allEligibleSelected;
    setRows((prev) => prev.map((r) => (r.issue ? r : { ...r, included: target })));
  }

  function toggleRow(studentId: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.studentId === studentId && !r.issue ? { ...r, included: !r.included } : r,
      ),
    );
  }

  function setAmount(studentId: string, value: number) {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, amount: value } : r)),
    );
  }

  function setSequence(studentId: string, seq: SepaSequence) {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, sequence: seq } : r)),
    );
  }

  async function handleGenerate() {
    if (includedRows.length === 0) {
      setState({
        phase: 'error',
        message: 'Selecciona al menos un alumno para generar la remesa.',
      });
      return;
    }

    setState({ phase: 'loading' });

    const lines: SepaRemittanceLine[] = includedRows.map((r) => ({
      holderName: r.holderName,
      holderIban: r.holderIban,
      mandateReference: r.mandateReference,
      mandateSignedAt: new Date(r.mandateSignedAt),
      sequence: r.sequence,
      debitReference,
      amount: r.amount,
      concept,
    }));

    const filename = `remesa-sepa-${collectionDate.replace(/-/g, '')}.xlsx`;

    try {
      // Pequeño retraso artificial para que el modal de carga sea visible
      // incluso con pocas líneas. exceljs en remesas reales (decenas de
      // recibos) ya bloquea perceptiblemente; aquí solo aseguramos UX.
      await new Promise((resolve) => setTimeout(resolve, 400));
      await generateAndDownloadSepaRemittance(
        {
          creditor: PLATO_CREDITOR,
          collectionDate: new Date(collectionDate),
          lines,
        },
        filename,
      );
      setState({
        phase: 'success',
        filename,
        total,
        count: includedRows.length,
      });
    } catch (err) {
      console.error(err);
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Error desconocido al generar el Excel',
      });
    }
  }

  function closeModal() {
    setState({ phase: 'idle' });
  }

  return (
    <>
      <PageHeader
        title="Remesa SEPA"
        breadcrumbs={[
          { label: 'Admin', to: '/admin' },
          { label: 'Recibos', to: '/admin/invoices' },
          { label: 'Remesa SEPA' },
        ]}
      />

      {/* Datos del acreedor (informativos) */}
      <div className="rounded-lg border bg-card shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold mb-2">Acreedor</h2>
        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Identificador</dt>
            <dd className="font-mono">{PLATO_CREDITOR.identifier}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Nombre</dt>
            <dd>{PLATO_CREDITOR.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Cuenta acreedor</dt>
            <dd className="font-mono">{PLATO_CREDITOR.iban}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Oficina BBVA</dt>
            <dd className="font-mono">{PLATO_CREDITOR.bbvaOffice}</dd>
          </div>
        </dl>
      </div>

      {/* Datos de la remesa */}
      <div className="rounded-lg border bg-card shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold mb-3">Datos de la remesa</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Fecha de cobro</span>
            <Input
              type="date"
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Referencia del adeudo</span>
            <Input
              value={debitReference}
              onChange={(e) => setDebitReference(e.target.value)}
              maxLength={35}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Concepto</span>
            <Input
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              maxLength={140}
            />
          </label>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" type="button" onClick={toggleAll} disabled={eligibleRows.length === 0}>
            {allEligibleSelected ? 'Desmarcar todos' : 'Marcar todos'}
          </Button>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{includedRows.length}</span> de {eligibleRows.length} alumnos seleccionados ·{' '}
            <span className="font-medium text-foreground">{eurFmt.format(total)}</span> total
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={includedRows.length === 0}>
          <Download className="h-4 w-4" />
          Generar remesa SEPA
        </Button>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allEligibleSelected}
                  onChange={toggleAll}
                  disabled={eligibleRows.length === 0}
                  aria-label="Marcar o desmarcar todos"
                  className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                />
              </TableHead>
              <TableHead>Alumno</TableHead>
              <TableHead>Titular</TableHead>
              <TableHead>IBAN</TableHead>
              <TableHead>Mandato</TableHead>
              <TableHead>Secuencia</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No hay alumnos con método de pago SEPA.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const disabled = !!r.issue;
                return (
                  <TableRow
                    key={r.studentId}
                    className={disabled ? 'opacity-60' : 'hover:bg-muted/30'}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={r.included}
                        onChange={() => toggleRow(r.studentId)}
                        disabled={disabled}
                        aria-label={`Incluir a ${r.studentName} en la remesa`}
                        className="h-4 w-4 rounded border-input accent-primary cursor-pointer disabled:cursor-not-allowed"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{r.studentName}</TableCell>
                    <TableCell className="text-muted-foreground">{r.holderName}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {r.holderIban}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {r.mandateReference}
                    </TableCell>
                    <TableCell>
                      <select
                        value={r.sequence}
                        onChange={(e) => setSequence(r.studentId, e.target.value as SepaSequence)}
                        disabled={disabled}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed"
                      >
                        {SEQUENCE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={r.amount}
                        onChange={(e) => setAmount(r.studentId, Number(e.target.value))}
                        disabled={disabled}
                        className="h-8 w-24 text-right ml-auto"
                      />
                    </TableCell>
                    <TableCell>
                      {r.issue ? (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          {r.issue}
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          Listo
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de estado */}
      {state.phase !== 'idle' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sepa-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-lg bg-card shadow-lg border">
            <div className="flex items-start justify-between p-5 pb-3">
              <h3 id="sepa-modal-title" className="text-base font-semibold">
                {state.phase === 'loading' && 'Generando remesa…'}
                {state.phase === 'success' && 'Remesa generada'}
                {state.phase === 'error' && 'No se pudo generar la remesa'}
              </h3>
              {state.phase !== 'loading' && (
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Cerrar"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="px-5 pb-5">
              {state.phase === 'loading' && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Generando el Excel para BBVA Net Cash…</span>
                </div>
              )}

              {state.phase === 'success' && (
                <div className="flex flex-col gap-3 text-sm">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p>
                        Se ha descargado <span className="font-mono">{state.filename}</span>.
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {state.count} adeudo{state.count === 1 ? '' : 's'} ·{' '}
                        {eurFmt.format(state.total)} en total.
                      </p>
                    </div>
                  </div>
                  <Button onClick={closeModal} className="self-end">
                    Hecho
                  </Button>
                </div>
              )}

              {state.phase === 'error' && (
                <div className="flex flex-col gap-3 text-sm">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <p>{state.message}</p>
                  </div>
                  <Button variant="outline" onClick={closeModal} className="self-end">
                    Cerrar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
