import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  FilterBar,
  FilterField,
  filterInputClass,
  filterSelectClass,
} from '@/components/admin/FilterBar';
import type { CenterDto } from '@academiaplaton/shared';
import { MOCK_CENTERS } from '@/features/centers/data/mock-centers';
import {
  CenterSheet,
  type CenterFormValues,
} from '@/features/centers/components/CenterSheet';
import { useTranslation } from '@/contexts/LanguageContext';

const ORG_ID = '00000000-0000-0000-0000-000000000001';

type SheetState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; center: CenterDto };

type StatusFilter = 'any' | 'active' | 'inactive';

const initialFilters = {
  search: '',
  name: '',
  slug: '',
  address: '',
  phone: '',
  status: 'any' as StatusFilter,
};

function includesCi(haystack: string | null | undefined, needle: string): boolean {
  if (!needle) return true;
  return (haystack ?? '').toLowerCase().includes(needle.toLowerCase());
}

export function CentersListPage() {
  const { t } = useTranslation();
  const [centers, setCenters] = useState<CenterDto[]>(MOCK_CENTERS);
  const [filters, setFilters] = useState(initialFilters);
  const [sheet, setSheet] = useState<SheetState>({ open: false });

  const hasActiveFilters =
    filters.search !== '' ||
    filters.name !== '' ||
    filters.slug !== '' ||
    filters.address !== '' ||
    filters.phone !== '' ||
    filters.status !== 'any';

  function clearFilters() {
    setFilters(initialFilters);
  }

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return centers.filter((c) => {
      if (filters.status === 'active' && !c.active) return false;
      if (filters.status === 'inactive' && c.active) return false;

      if (!includesCi(c.name, filters.name)) return false;
      if (!includesCi(c.slug, filters.slug)) return false;
      if (!includesCi(c.address, filters.address)) return false;
      if (!includesCi(c.phone, filters.phone)) return false;

      if (q) {
        const hit = [c.name, c.slug, c.address ?? '', c.email ?? '', c.phone ?? '']
          .some((v) => v.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [centers, filters]);

  function openCreate() {
    setSheet({ open: true, mode: 'create' });
  }

  function openEdit(center: CenterDto) {
    setSheet({ open: true, mode: 'edit', center });
  }

  function closeSheet() {
    setSheet({ open: false });
  }

  function handleSheetSubmit(data: CenterFormValues) {
    if (!sheet.open) return;
    const now = new Date().toISOString();
    const normalized = {
      name: data.name,
      slug: data.slug,
      address: data.address || undefined,
      phone: data.phone || undefined,
      email: data.email || undefined,
      active: data.active,
    };

    if (sheet.mode === 'create') {
      const newCenter: CenterDto = {
        id: crypto.randomUUID(),
        organizationId: ORG_ID,
        ...normalized,
        createdAt: now,
        updatedAt: now,
      };
      setCenters((prev) => [...prev, newCenter]);
    } else {
      setCenters((prev) =>
        prev.map((c) =>
          c.id === sheet.center.id
            ? { ...c, ...normalized, updatedAt: now }
            : c,
        ),
      );
    }
  }

  function handleDelete(id: string) {
    setCenters((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <>
      <PageHeader
        title={t('centers.title')}
        breadcrumbs={[{ label: t('breadcrumb.admin'), to: '/admin' }, { label: t('centers.title') }]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t('centers.new')}
        </Button>
      </div>

      <FilterBar hasActive={hasActiveFilters} onClear={clearFilters}>
        <FilterField label={t('filterbar.search_label')}>
          <input
            type="text"
            className={filterInputClass}
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder={t('centers.filter.placeholder_search')}
            aria-label={t('common.search_general_aria')}
          />
        </FilterField>

        <FilterField label={t('common.name')}>
          <input
            type="text"
            className={filterInputClass}
            value={filters.name}
            onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
            aria-label={t('common.filter_by_name_aria')}
          />
        </FilterField>

        <FilterField label={t('centers.col.url_slug')}>
          <input
            type="text"
            className={filterInputClass}
            value={filters.slug}
            onChange={(e) => setFilters((f) => ({ ...f, slug: e.target.value }))}
            aria-label={t('centers.filter.slug_aria')}
          />
        </FilterField>

        <FilterField label={t('common.address')}>
          <input
            type="text"
            className={filterInputClass}
            value={filters.address}
            onChange={(e) => setFilters((f) => ({ ...f, address: e.target.value }))}
            aria-label={t('centers.filter.address_aria')}
          />
        </FilterField>

        <FilterField label={t('common.phone')}>
          <input
            type="text"
            className={filterInputClass}
            value={filters.phone}
            onChange={(e) => setFilters((f) => ({ ...f, phone: e.target.value }))}
            aria-label={t('common.filter_by_phone_aria')}
          />
        </FilterField>

        <FilterField label={t('common.status')}>
          <select
            className={filterSelectClass}
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as StatusFilter }))}
            aria-label={t('common.filter_by_status_aria')}
          >
            <option value="any">{t('centers.filter.status_any')}</option>
            <option value="active">{t('centers.filter.status_actives')}</option>
            <option value="inactive">{t('centers.filter.status_inactives')}</option>
          </select>
        </FilterField>
      </FilterBar>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="w-16 text-muted-foreground hidden sm:table-cell">#</TableHead>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('centers.col.url_slug')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('common.address')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('common.phone')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="w-24 text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {t('centers.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c, idx) => (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-muted-foreground hidden sm:table-cell">#{idx + 1}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs hidden sm:table-cell">
                      {c.slug}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">{c.address ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">{c.phone ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={c.active ? 'default' : 'secondary'}>
                        {c.active ? t('centers.status.active') : t('centers.status.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t('centers.action.edit_center', { name: c.name })}
                          onClick={() => openEdit(c)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t('centers.action.delete_center', { name: c.name })}
                          className="hover:text-destructive"
                          onClick={() => handleDelete(c.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CenterSheet
        open={sheet.open}
        onOpenChange={(open) => { if (!open) closeSheet(); }}
        mode={sheet.open ? sheet.mode : 'create'}
        center={sheet.open && sheet.mode === 'edit' ? sheet.center : undefined}
        onSubmit={handleSheetSubmit}
      />
    </>
  );
}
