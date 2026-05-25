import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  ListChecks,
  Plus,
} from 'lucide-react';
import type {
  CenterDto,
  ExpenseDto,
  IncomeDto,
  MonthlySummaryCenter,
  MonthlySummarySalaryLine,
  PeriodMonth,
} from '@academiaplaton/shared';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser } from '@/contexts/AuthContext';
import { userHasRole } from '@/features/auth/lib/permissions';
import { useTranslation } from '@/contexts/LanguageContext';
import { MOCK_CENTERS } from '@/features/centers/data/mock-centers';
import { cn } from '@/lib/utils';

import { useAccountingSummary } from '@/features/accounting/hooks/useAccountingSummary';
import { useAccountingCategories } from '@/features/accounting/hooks/useAccountingCategories';
import { useAccountingTemplates } from '@/features/accounting/hooks/useAccountingTemplates';
import { useAccountingExpenses } from '@/features/accounting/hooks/useAccountingExpenses';
import { useAccountingIncomes } from '@/features/accounting/hooks/useAccountingIncomes';
import { useGenerateMonth } from '@/features/accounting/hooks/useGenerateMonth';
import {
  comparePeriodMonth,
  currentPeriodMonth,
  formatPeriodMonthLong,
  shiftPeriodMonth,
} from '@/features/accounting/lib/period';
import { ExpenseSheet } from '@/features/accounting/components/ExpenseSheet';
import { IncomeSheet } from '@/features/accounting/components/IncomeSheet';
import { CategoryManagerSheet } from '@/features/accounting/components/CategoryManagerSheet';
import { TemplateManagerSheet } from '@/features/accounting/components/TemplateManagerSheet';
import { SalaryEditSheet } from '@/features/accounting/components/SalaryEditSheet';

type CenterFilter = 'all' | string;
type PaymentMethodFilter = 'all' | 'sepa' | 'transfer' | 'cash' | 'other';

type ExpenseSheetState =
  | { open: false }
  | { open: true; mode: 'create'; categoryId?: string; centerId?: string }
  | { open: true; mode: 'edit'; expense: ExpenseDto };

type IncomeSheetState =
  | { open: false }
  | { open: true; mode: 'create'; centerId?: string }
  | { open: true; mode: 'edit'; income: IncomeDto };

export function AccountingPage() {
  const currentUser = useCurrentUser();
  const { t, locale } = useTranslation();

  const isAdmin = userHasRole(currentUser, 'admin');

  // ─── Estado de filtros principales ─────────────────────────────────────
  const [centerId, setCenterId] = useState<CenterFilter>('all');
  const [periodMonth, setPeriodMonth] = useState<PeriodMonth>(() => currentPeriodMonth());
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethodFilter>('all');

  // ─── Estado de las sheets ──────────────────────────────────────────────
  const [expenseSheet, setExpenseSheet] = useState<ExpenseSheetState>({ open: false });
  const [incomeSheet, setIncomeSheet] = useState<IncomeSheetState>({ open: false });
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [salarySheet, setSalarySheet] = useState<{ open: boolean; salary: MonthlySummarySalaryLine | null }>({ open: false, salary: null });

  // ─── Carga de datos ────────────────────────────────────────────────────
  const summaryQuery = useAccountingSummary(centerId, isAdmin ? periodMonth : null);
  const categoriesQuery = useAccountingCategories();
  const templatesQuery = useAccountingTemplates();
  const expensesApi = useAccountingExpenses({ onMutated: summaryQuery.refetch });
  const incomesApi = useAccountingIncomes({ onMutated: summaryQuery.refetch });
  const generator = useGenerateMonth();

  const eurFmt = useMemo(
    () => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }),
    [locale],
  );

  const monthLabel = useMemo(
    () => formatPeriodMonthLong(periodMonth, locale),
    [periodMonth, locale],
  );

  const todayPeriod = currentPeriodMonth();
  const isPast = comparePeriodMonth(periodMonth, todayPeriod) < 0;
  const isToday = periodMonth === todayPeriod;

  // El selector usa centros del mock mientras no haya endpoint /api/centers.
  // Filtramos a los activos por defecto y los ordenamos por nombre.
  const visibleCenters: CenterDto[] = useMemo(
    () => MOCK_CENTERS.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const selectedCenter =
    centerId !== 'all' ? visibleCenters.find((c) => c.id === centerId) ?? null : null;

  // Centros que se renderizan como columnas en la tabla.
  const tableCenters: MonthlySummaryCenter[] = useMemo(() => {
    if (!summaryQuery.summary) return [];
    return summaryQuery.summary.centers;
  }, [summaryQuery.summary]);

  // ─── Acciones ──────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    const msg = t('accounting.generate_month.confirm', { month: monthLabel });
    if (!window.confirm(msg)) return;
    try {
      await generator.generate({
        periodMonth,
        centerId: centerId === 'all' ? undefined : centerId,
      });
      void summaryQuery.refetch();
    } catch {
      // El error queda visible en generator.error.
    }
  }, [t, monthLabel, generator, periodMonth, centerId, summaryQuery]);

  function goPrev() { setPeriodMonth((p) => shiftPeriodMonth(p, -1)); }
  function goNext() { setPeriodMonth((p) => shiftPeriodMonth(p, 1)); }
  function goToday() { setPeriodMonth(currentPeriodMonth()); }

  // ─── Guard de rol ──────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <>
        <PageHeader
          title={t('accounting.title')}
          breadcrumbs={[{ label: t('breadcrumb.admin'), to: '/admin' }, { label: t('accounting.title') }]}
        />
        <div className="rounded-md border bg-card p-8 text-center flex flex-col items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          <p className="text-base font-medium">{t('accounting.no_admin')}</p>
          <Link to="/admin" className="text-sm text-primary hover:underline">
            {t('accounting.back_to_dashboard')}
          </Link>
        </div>
      </>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader
        title={t('accounting.title')}
        breadcrumbs={[{ label: t('breadcrumb.admin'), to: '/admin' }, { label: t('accounting.title') }]}
      />

      {/* Barra superior: centro + navegador + acciones */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="acc-center" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {t('common.center')}
            </label>
            <select
              id="acc-center"
              value={centerId}
              onChange={(e) => setCenterId(e.target.value as CenterFilter)}
              className="h-9 min-w-[14rem] rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">{t('accounting.center.all')}</option>
              {visibleCenters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{!c.active ? ` (${t('common.inactive_f')})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Navegador de mes */}
          <div className="flex items-center gap-1" role="group" aria-label={t('accounting.period_nav_aria')}>
            <Button variant="outline" size="icon" aria-label={t('accounting.prev_month')} onClick={goPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 h-9 inline-flex items-center rounded-md border bg-background text-sm font-medium min-w-[10rem] justify-center">
              {monthLabel}
            </div>
            <Button variant="outline" size="icon" aria-label={t('accounting.next_month')} onClick={goNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday} disabled={isToday}>
              {t('accounting.today')}
            </Button>
          </div>

          <div className="flex-1" />

          <Button variant="outline" size="sm" onClick={() => setCategoriesOpen(true)}>
            <FolderTree className="h-4 w-4" />
            {t('accounting.category.manage')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTemplatesOpen(true)}>
            <ListChecks className="h-4 w-4" />
            {t('accounting.template.manage')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generator.loading}>
            <CalendarPlus className="h-4 w-4" />
            {generator.loading ? t('accounting.generate_month.loading') : t('accounting.generate_month')}
          </Button>
          <Button size="sm" onClick={() => setIncomeSheet({ open: true, mode: 'create', centerId: selectedCenter?.id })}>
            <Plus className="h-4 w-4" />
            {t('accounting.income.add')}
          </Button>
          <Button size="sm" onClick={() => setExpenseSheet({ open: true, mode: 'create', centerId: selectedCenter?.id })}>
            <Plus className="h-4 w-4" />
            {t('accounting.expense.add')}
          </Button>
        </div>

        {/* Filtro método de pago (filtra solo qué movimientos se muestran) */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="acc-pm" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {t('accounting.filter.payment_method')}
            </label>
            <select
              id="acc-pm"
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value as PaymentMethodFilter)}
              className="h-9 min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">{t('accounting.payment_method.all')}</option>
              <option value="sepa">{t('accounting.payment_method.sepa')}</option>
              <option value="transfer">{t('accounting.payment_method.transfer')}</option>
              <option value="cash">{t('accounting.payment_method.cash')}</option>
              <option value="other">{t('accounting.payment_method.other')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Banners */}
      {isPast && (
        <div className="mb-3 rounded-md border border-yellow-400/60 bg-yellow-50 px-3 py-2 text-sm text-yellow-900 flex items-start gap-2 dark:bg-yellow-950/40 dark:text-yellow-200 dark:border-yellow-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{t('accounting.banner.live_reference')}</span>
        </div>
      )}
      {selectedCenter && !selectedCenter.active && (
        <div className="mb-3 rounded-md border border-muted px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
          <Badge variant="outline">{t('common.inactive_f')}</Badge>
          {t('accounting.center.inactive_notice', { name: selectedCenter.name })}
        </div>
      )}
      {generator.error && (
        <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {generator.error}
        </div>
      )}
      {generator.result && (
        <div className="mb-3 rounded-md border bg-card px-3 py-2 text-sm flex flex-col gap-1">
          <span className="font-medium">
            {t('accounting.generate_month.result', {
              templates: generator.result.templatesGenerated,
              salaries: generator.result.salariesGenerated,
              warnings: generator.result.warnings.length,
            })}
          </span>
          {generator.result.warnings.length > 0 && (
            <ul className="text-xs text-muted-foreground list-disc list-inside">
              {generator.result.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {summaryQuery.error && (
        <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {summaryQuery.error}
        </div>
      )}

      {/* Tabla mensual */}
      <SummaryTable
        loading={summaryQuery.loading}
        centers={tableCenters}
        grandTotalIncome={summaryQuery.summary?.grandTotalIncome ?? 0}
        grandTotalExpense={summaryQuery.summary?.grandTotalExpense ?? 0}
        grandTotalProfit={summaryQuery.summary?.grandTotalProfit ?? 0}
        eurFmt={eurFmt}
        paymentMethodFilter={paymentMethodFilter}
        onEditExpense={(e) => setExpenseSheet({ open: true, mode: 'edit', expense: e })}
        onEditIncome={(i) => setIncomeSheet({ open: true, mode: 'edit', income: i })}
        onAddIncome={(cid) => setIncomeSheet({ open: true, mode: 'create', centerId: cid })}
        onAddExpense={(cid, catId) => setExpenseSheet({ open: true, mode: 'create', centerId: cid, categoryId: catId })}
        onEditSalary={(salary) => setSalarySheet({ open: true, salary })}
      />

      {/* Sheets */}
      <ExpenseSheet
        open={expenseSheet.open}
        onOpenChange={(o) => { if (!o) setExpenseSheet({ open: false }); }}
        mode={expenseSheet.open ? expenseSheet.mode : 'create'}
        expense={expenseSheet.open && expenseSheet.mode === 'edit' ? expenseSheet.expense : undefined}
        categories={categoriesQuery.categories}
        centers={visibleCenters}
        defaultCenterId={expenseSheet.open && expenseSheet.mode === 'create' ? expenseSheet.centerId ?? selectedCenter?.id : undefined}
        defaultCategoryId={expenseSheet.open && expenseSheet.mode === 'create' ? expenseSheet.categoryId : undefined}
        defaultPeriodMonth={periodMonth}
        onCreate={async (input) => { await expensesApi.create(input); }}
        onUpdate={async (id, input) => { await expensesApi.update(id, input); }}
        onDelete={async (id) => { await expensesApi.remove(id); }}
      />

      <IncomeSheet
        open={incomeSheet.open}
        onOpenChange={(o) => { if (!o) setIncomeSheet({ open: false }); }}
        mode={incomeSheet.open ? incomeSheet.mode : 'create'}
        income={incomeSheet.open && incomeSheet.mode === 'edit' ? incomeSheet.income : undefined}
        centers={visibleCenters}
        defaultCenterId={incomeSheet.open && incomeSheet.mode === 'create' ? incomeSheet.centerId ?? selectedCenter?.id : undefined}
        defaultPeriodMonth={periodMonth}
        onCreate={async (input) => { await incomesApi.create(input); }}
        onUpdate={async (id, input) => { await incomesApi.update(id, input); }}
        onDelete={async (id) => { await incomesApi.remove(id); }}
      />

      <CategoryManagerSheet
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        categories={categoriesQuery.categories}
        onCreate={async (input) => {
          const created = await categoriesQuery.create(input);
          summaryQuery.refetch();
          return created;
        }}
        onUpdate={async (id, input) => {
          const updated = await categoriesQuery.update(id, input);
          summaryQuery.refetch();
          return updated;
        }}
        onDelete={async (id) => {
          await categoriesQuery.remove(id);
          summaryQuery.refetch();
        }}
      />

      <TemplateManagerSheet
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        templates={templatesQuery.templates}
        categories={categoriesQuery.categories}
        centers={visibleCenters}
        onCreate={templatesQuery.create}
        onUpdate={templatesQuery.update}
        onDelete={templatesQuery.remove}
      />

      <SalaryEditSheet
        open={salarySheet.open}
        onOpenChange={(o) => { if (!o) setSalarySheet({ open: false, salary: null }); }}
        salary={salarySheet.salary}
        onUpdate={async (id, input) => { await expensesApi.update(id, input); }}
      />
    </>
  );
}

// ─── Tabla ────────────────────────────────────────────────────────────────
interface SummaryTableProps {
  loading: boolean;
  centers: MonthlySummaryCenter[];
  grandTotalIncome: number;
  grandTotalExpense: number;
  grandTotalProfit: number;
  eurFmt: Intl.NumberFormat;
  paymentMethodFilter: PaymentMethodFilter;
  onEditExpense: (e: ExpenseDto) => void;
  onEditIncome: (i: IncomeDto) => void;
  onAddIncome: (centerId: string) => void;
  onAddExpense: (centerId: string, categoryId?: string) => void;
  onEditSalary: (salary: MonthlySummarySalaryLine) => void;
}

function SummaryTable({
  loading,
  centers,
  grandTotalIncome,
  grandTotalExpense,
  grandTotalProfit,
  eurFmt,
  paymentMethodFilter,
  onEditExpense,
  onEditIncome,
  onAddIncome,
  onAddExpense,
  onEditSalary,
}: SummaryTableProps) {
  const { t } = useTranslation();
  const showTotalsCol = centers.length > 1;

  if (loading) {
    return (
      <div className="rounded-lg border bg-card shadow-sm p-8 text-center text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  if (centers.length === 0) {
    return (
      <div className="rounded-lg border bg-card shadow-sm p-8 text-center text-muted-foreground">
        {t('accounting.empty')}
      </div>
    );
  }

  // Categorías "no-salary" unidas de todos los centros (para crear filas
  // homogéneas). Las salary se renderizan aparte como "Salarios".
  const allNonSalaryCats = new Map<string, { id: string; name: string; isSalary: boolean }>();
  for (const c of centers) {
    for (const g of c.expenses.byCategory) {
      if (!g.isSalary) {
        allNonSalaryCats.set(g.categoryId, { id: g.categoryId, name: g.categoryName, isSalary: false });
      }
    }
  }
  const nonSalaryCategories = Array.from(allNonSalaryCats.values());

  function matchesPm(pm: string): boolean {
    return paymentMethodFilter === 'all' || pm === paymentMethodFilter;
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="text-left font-medium px-3 py-2 sticky left-0 bg-muted z-10">
                {t('accounting.col.concept')}
              </th>
              {centers.map((c) => (
                <th key={c.centerId} className="text-right font-medium px-3 py-2 min-w-[10rem]">
                  {c.centerName}
                </th>
              ))}
              {showTotalsCol && (
                <th className="text-right font-medium px-3 py-2 min-w-[10rem]">{t('accounting.col.total')}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {/* INGRESOS ─────────────────────────────────────────────── */}
            <SectionHeaderRow label={t('accounting.income.title')} span={centers.length + (showTotalsCol ? 1 : 0) + 1} />

            {/* Rebuts (fees_auto) */}
            <tr className="border-t hover:bg-muted/30">
              <td className="px-3 py-2 sticky left-0 bg-card">
                {t('accounting.income.fees_auto')}
              </td>
              {centers.map((c) => (
                <td key={c.centerId} className="px-3 py-2 text-right">
                  <Link
                    to={`/admin/students?centerId=${c.centerId}`}
                    className="hover:underline tabular-nums"
                  >
                    {eurFmt.format(c.income.feesAuto)}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({c.income.activeStudents})
                    </span>
                  </Link>
                </td>
              ))}
              {showTotalsCol && (
                <td className="px-3 py-2 text-right tabular-nums">
                  {eurFmt.format(centers.reduce((s, c) => s + c.income.feesAuto, 0))}
                </td>
              )}
            </tr>

            {/* Ingresos manuales: una fila por unión de fuentes distintas */}
            <ManualIncomesRows
              centers={centers}
              eurFmt={eurFmt}
              showTotalsCol={showTotalsCol}
              matchesPm={matchesPm}
              onEditIncome={onEditIncome}
            />

            {/* Ghost: añadir ingreso (en cada centro) */}
            <tr className="border-t">
              <td className="px-3 py-2 sticky left-0 bg-card text-xs text-muted-foreground">
                {t('accounting.income.add_row')}
              </td>
              {centers.map((c) => (
                <td key={c.centerId} className="px-3 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => onAddIncome(c.centerId)}>
                    <Plus className="h-3 w-3" />
                    {t('accounting.income.add')}
                  </Button>
                </td>
              ))}
              {showTotalsCol && <td />}
            </tr>

            {/* Subtotal INGRESOS */}
            <tr className="border-t bg-muted/40 font-medium">
              <td className="px-3 py-2 sticky left-0 bg-muted/40">{t('accounting.income.subtotal')}</td>
              {centers.map((c) => (
                <td key={c.centerId} className="px-3 py-2 text-right tabular-nums">
                  {eurFmt.format(c.income.total)}
                </td>
              ))}
              {showTotalsCol && (
                <td className="px-3 py-2 text-right tabular-nums">
                  {eurFmt.format(grandTotalIncome)}
                </td>
              )}
            </tr>

            {/* GASTOS ──────────────────────────────────────────────── */}
            <SectionHeaderRow label={t('accounting.expense.title')} span={centers.length + (showTotalsCol ? 1 : 0) + 1} />

            {nonSalaryCategories.map((cat) => (
              <CategoryRows
                key={cat.id}
                categoryId={cat.id}
                categoryName={cat.name}
                centers={centers}
                eurFmt={eurFmt}
                showTotalsCol={showTotalsCol}
                matchesPm={matchesPm}
                onEditExpense={onEditExpense}
                onAddExpense={onAddExpense}
              />
            ))}

            {/* Salarios */}
            <SectionHeaderRow
              label={t('accounting.expense.salaries')}
              span={centers.length + (showTotalsCol ? 1 : 0) + 1}
              tone="subtle"
            />
            <SalaryRows
              centers={centers}
              eurFmt={eurFmt}
              showTotalsCol={showTotalsCol}
              onEditSalary={onEditSalary}
            />

            {/* Subtotal GASTOS */}
            <tr className="border-t bg-muted/40 font-medium">
              <td className="px-3 py-2 sticky left-0 bg-muted/40">{t('accounting.expense.subtotal')}</td>
              {centers.map((c) => (
                <td key={c.centerId} className="px-3 py-2 text-right tabular-nums">
                  {eurFmt.format(c.expenses.total)}
                </td>
              ))}
              {showTotalsCol && (
                <td className="px-3 py-2 text-right tabular-nums">
                  {eurFmt.format(grandTotalExpense)}
                </td>
              )}
            </tr>

            {/* BENEFICIO ───────────────────────────────────────────── */}
            <SectionHeaderRow label={t('accounting.profit.title')} span={centers.length + (showTotalsCol ? 1 : 0) + 1} tone="strong" />
            <tr className="border-t font-semibold">
              <td className="px-3 py-2 sticky left-0 bg-card">
                <span aria-label={t('accounting.profit.aria_label')}>{t('accounting.profit.title')}</span>
              </td>
              {centers.map((c) => (
                <td
                  key={c.centerId}
                  className={cn(
                    'px-3 py-2 text-right tabular-nums',
                    c.profit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400',
                  )}
                  aria-label={t('accounting.profit.cell_aria', { center: c.centerName, amount: eurFmt.format(c.profit) })}
                >
                  {eurFmt.format(c.profit)}
                </td>
              ))}
              {showTotalsCol && (
                <td
                  className={cn(
                    'px-3 py-2 text-right tabular-nums',
                    grandTotalProfit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400',
                  )}
                  aria-label={t('accounting.profit.grand_aria', { amount: eurFmt.format(grandTotalProfit) })}
                >
                  {eurFmt.format(grandTotalProfit)}
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer: 4 mini-cards por método de pago (sumando todos los centros) */}
      <PaymentMethodFooter centers={centers} eurFmt={eurFmt} />
    </div>
  );
}

function SectionHeaderRow({
  label,
  span,
  tone = 'default',
}: {
  label: string;
  span: number;
  tone?: 'default' | 'subtle' | 'strong';
}) {
  return (
    <tr>
      <td
        colSpan={span}
        className={cn(
          'px-3 py-2 text-xs font-semibold uppercase tracking-wider',
          tone === 'default' && 'bg-primary/5 text-foreground border-t',
          tone === 'subtle' && 'bg-muted/30 text-muted-foreground border-t',
          tone === 'strong' && 'bg-primary/10 text-foreground border-t',
        )}
      >
        {label}
      </td>
    </tr>
  );
}

function ManualIncomesRows({
  centers,
  eurFmt,
  showTotalsCol,
  matchesPm,
  onEditIncome,
}: {
  centers: MonthlySummaryCenter[];
  eurFmt: Intl.NumberFormat;
  showTotalsCol: boolean;
  matchesPm: (pm: string) => boolean;
  onEditIncome: (i: IncomeDto) => void;
}) {
  const { t } = useTranslation();
  // Reunimos todos los ingresos manuales en una lista plana ordenada por
  // (source, centerId) para que cada fila represente una fuente y una
  // columna por centro. Si una fuente solo está en algunos centros, las
  // demás celdas quedan vacías. Para mantenerlo simple, en el MVP cada
  // income se renderiza como una fila propia con su centro como única
  // celda con valor — el formato exacto del PDF era por centro x mes.
  const rows: Array<{ income: IncomeDto; centerIdx: number }> = [];
  centers.forEach((c, idx) => {
    for (const inc of c.income.manualIncomes) {
      if (!matchesPm(inc.paymentMethod)) continue;
      rows.push({ income: inc, centerIdx: idx });
    }
  });

  if (rows.length === 0) {
    return (
      <tr className="border-t">
        <td className="px-3 py-2 sticky left-0 bg-card text-xs text-muted-foreground italic">
          {t('accounting.income.no_manual')}
        </td>
        {centers.map((c) => <td key={c.centerId} />)}
        {showTotalsCol && <td />}
      </tr>
    );
  }

  return (
    <>
      {rows.map(({ income, centerIdx }) => (
        <tr key={income.id} className="border-t hover:bg-muted/30">
          <td className="px-3 py-2 sticky left-0 bg-card">
            <button
              type="button"
              className="text-left hover:underline w-full"
              onClick={() => onEditIncome(income)}
              aria-label={t('accounting.income.edit_aria', { source: income.source })}
            >
              <span>{income.source}</span>
              <Badge variant="secondary" className="ml-2">
                {t(`accounting.payment_method.${income.paymentMethod}`)}
              </Badge>
            </button>
          </td>
          {centers.map((c, idx) => (
            <td key={c.centerId} className="px-3 py-2 text-right tabular-nums">
              {idx === centerIdx ? eurFmt.format(income.amount) : ''}
            </td>
          ))}
          {showTotalsCol && (
            <td className="px-3 py-2 text-right tabular-nums">{eurFmt.format(income.amount)}</td>
          )}
        </tr>
      ))}
    </>
  );
}

function CategoryRows({
  categoryId,
  categoryName,
  centers,
  eurFmt,
  showTotalsCol,
  matchesPm,
  onEditExpense,
  onAddExpense,
}: {
  categoryId: string;
  categoryName: string;
  centers: MonthlySummaryCenter[];
  eurFmt: Intl.NumberFormat;
  showTotalsCol: boolean;
  matchesPm: (pm: string) => boolean;
  onEditExpense: (e: ExpenseDto) => void;
  onAddExpense: (centerId: string, categoryId?: string) => void;
}) {
  const { t } = useTranslation();

  // Items por centro
  const itemsByCenter: ExpenseDto[][] = centers.map((c) => {
    const group = c.expenses.byCategory.find((g) => g.categoryId === categoryId);
    return (group?.items ?? []).filter((it) => matchesPm(it.paymentMethod));
  });

  const subtotalByCenter: number[] = centers.map((c) => {
    const group = c.expenses.byCategory.find((g) => g.categoryId === categoryId);
    return group?.subtotal ?? 0;
  });

  const maxRows = Math.max(1, ...itemsByCenter.map((arr) => arr.length));

  return (
    <>
      <tr className="border-t bg-accent/20">
        <td className="px-3 py-1.5 sticky left-0 bg-accent/20 font-medium text-xs uppercase tracking-wider">
          {categoryName}
        </td>
        {centers.map((c) => <td key={c.centerId} />)}
        {showTotalsCol && <td />}
      </tr>
      {Array.from({ length: maxRows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="border-t hover:bg-muted/30">
          <td className="px-3 py-1 sticky left-0 bg-card text-xs text-muted-foreground">
            {/* descripciones quedarían si las hubiera */}
          </td>
          {centers.map((c, ci) => {
            const item = itemsByCenter[ci]?.[rowIdx];
            return (
              <td key={c.centerId} className="px-3 py-1 text-right tabular-nums">
                {item ? (
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() => onEditExpense(item)}
                    aria-label={t('accounting.expense.edit_aria', { amount: eurFmt.format(item.amount) })}
                  >
                    {eurFmt.format(item.amount)}
                  </button>
                ) : ''}
              </td>
            );
          })}
          {showTotalsCol && <td />}
        </tr>
      ))}
      {/* Ghost: añadir gasto en categoría */}
      <tr className="border-t">
        <td className="px-3 py-1 sticky left-0 bg-card text-xs text-muted-foreground" />
        {centers.map((c) => (
          <td key={c.centerId} className="px-3 py-1 text-right">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => onAddExpense(c.centerId, categoryId)}
            >
              <Plus className="h-3 w-3" />
              {t('accounting.expense.add_in_category')}
            </Button>
          </td>
        ))}
        {showTotalsCol && <td />}
      </tr>
      {/* Subtotal de categoría */}
      <tr className="border-t bg-muted/20 text-sm">
        <td className="px-3 py-1.5 sticky left-0 bg-muted/20 italic">
          {t('accounting.expense.category_subtotal', { name: categoryName })}
        </td>
        {subtotalByCenter.map((s, idx) => (
          <td key={centers[idx]!.centerId} className="px-3 py-1.5 text-right tabular-nums">
            {eurFmt.format(s)}
          </td>
        ))}
        {showTotalsCol && (
          <td className="px-3 py-1.5 text-right tabular-nums">
            {eurFmt.format(subtotalByCenter.reduce((a, b) => a + b, 0))}
          </td>
        )}
      </tr>
    </>
  );
}

function SalaryRows({
  centers,
  eurFmt,
  showTotalsCol,
  onEditSalary,
}: {
  centers: MonthlySummaryCenter[];
  eurFmt: Intl.NumberFormat;
  showTotalsCol: boolean;
  onEditSalary: (s: MonthlySummarySalaryLine) => void;
}) {
  const { t } = useTranslation();

  // Unión de todos los profesores presentes en al menos un centro.
  const teacherIds = new Set<string>();
  const teacherInfo = new Map<string, { firstName: string; lastName: string }>();
  centers.forEach((c) => {
    c.expenses.salaries.forEach((s) => {
      teacherIds.add(s.teacherId);
      teacherInfo.set(s.teacherId, {
        firstName: s.teacherFirstName,
        lastName: s.teacherLastName,
      });
    });
  });

  if (teacherIds.size === 0) {
    return (
      <tr className="border-t">
        <td className="px-3 py-2 sticky left-0 bg-card text-xs text-muted-foreground italic">
          {t('accounting.expense.no_salaries')}
        </td>
        {centers.map((c) => <td key={c.centerId} />)}
        {showTotalsCol && <td />}
      </tr>
    );
  }

  const teachersSorted = Array.from(teacherIds).sort((a, b) => {
    const ai = teacherInfo.get(a)!;
    const bi = teacherInfo.get(b)!;
    return (ai.lastName + ai.firstName).localeCompare(bi.lastName + bi.firstName);
  });

  return (
    <>
      {teachersSorted.map((tid) => {
        const info = teacherInfo.get(tid)!;
        let totalRow = 0;
        return (
          <tr key={tid} className="border-t hover:bg-muted/30">
            <td className="px-3 py-1.5 sticky left-0 bg-card text-sm">
              {info.firstName} {info.lastName}
            </td>
            {centers.map((c) => {
              const salary = c.expenses.salaries.find((s) => s.teacherId === tid);
              if (!salary) return <td key={c.centerId} />;
              const value = salary.override ?? salary.computed;
              totalRow += value;
              return (
                <td key={c.centerId} className="px-3 py-1.5 text-right">
                  <button
                    type="button"
                    onClick={() => onEditSalary(salary)}
                    className="inline-flex flex-col items-end gap-0.5 hover:underline"
                    aria-label={t('accounting.expense.edit_salary_aria', { name: `${info.firstName} ${info.lastName}` })}
                  >
                    <span className="tabular-nums">{eurFmt.format(value)}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {salary.hoursWorked.toFixed(1)} h
                      {salary.override != null ? ` · ${t('accounting.expense.salary_override')}` : ''}
                      {' · '}
                      {salary.paid ? (
                        <Badge variant="default" className="ml-1 text-[9px] py-0">{t('accounting.expense.salary_paid')}</Badge>
                      ) : (
                        <Badge variant="outline" className="ml-1 text-[9px] py-0">{t('accounting.expense.salary_pending')}</Badge>
                      )}
                    </span>
                  </button>
                </td>
              );
            })}
            {showTotalsCol && (
              <td className="px-3 py-1.5 text-right tabular-nums">{eurFmt.format(totalRow)}</td>
            )}
          </tr>
        );
      })}
    </>
  );
}

function PaymentMethodFooter({
  centers,
  eurFmt,
}: {
  centers: MonthlySummaryCenter[];
  eurFmt: Intl.NumberFormat;
}) {
  const { t } = useTranslation();

  const totals = centers.reduce(
    (acc, c) => {
      // Combina ingreso − gasto por método para ver el "neto" en cada método.
      (['sepa', 'transfer', 'cash', 'other'] as const).forEach((m) => {
        acc[m] += c.income.totalByPaymentMethod[m] - c.expenses.totalByPaymentMethod[m];
      });
      return acc;
    },
    { sepa: 0, transfer: 0, cash: 0, other: 0 },
  );

  return (
    <div className="border-t p-3 bg-muted/10">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        {t('accounting.footer.by_method')}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['sepa', 'transfer', 'cash', 'other'] as const).map((m) => (
          <div key={m} className="rounded-md border bg-card px-3 py-2 flex flex-col">
            <span className="text-[11px] uppercase text-muted-foreground tracking-wide">
              {t(`accounting.payment_method.${m}`)}
            </span>
            <span className={cn('text-base font-semibold tabular-nums', totals[m] >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
              {eurFmt.format(totals[m])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
