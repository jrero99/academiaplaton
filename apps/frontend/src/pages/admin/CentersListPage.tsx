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
        title="Academias"
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Academias' }]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nueva academia
        </Button>
      </div>

      <FilterBar hasActive={hasActiveFilters} onClear={clearFilters}>
        <FilterField label="Buscador">
          <input
            type="text"
            className={filterInputClass}
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Nombre, dirección, teléfono..."
            aria-label="Buscador general"
          />
        </FilterField>

        <FilterField label="Nombre">
          <input
            type="text"
            className={filterInputClass}
            value={filters.name}
            onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
            aria-label="Filtrar por nombre"
          />
        </FilterField>

        <FilterField label="Identificador URL">
          <input
            type="text"
            className={filterInputClass}
            value={filters.slug}
            onChange={(e) => setFilters((f) => ({ ...f, slug: e.target.value }))}
            aria-label="Filtrar por identificador URL"
          />
        </FilterField>

        <FilterField label="Dirección">
          <input
            type="text"
            className={filterInputClass}
            value={filters.address}
            onChange={(e) => setFilters((f) => ({ ...f, address: e.target.value }))}
            aria-label="Filtrar por dirección"
          />
        </FilterField>

        <FilterField label="Teléfono">
          <input
            type="text"
            className={filterInputClass}
            value={filters.phone}
            onChange={(e) => setFilters((f) => ({ ...f, phone: e.target.value }))}
            aria-label="Filtrar por teléfono"
          />
        </FilterField>

        <FilterField label="Estado">
          <select
            className={filterSelectClass}
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as StatusFilter }))}
            aria-label="Filtrar por estado"
          >
            <option value="any">Cualquiera</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
          </select>
        </FilterField>
      </FilterBar>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead className="w-16 text-muted-foreground">#</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Identificador URL</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-32 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No hay academias que coincidan con la búsqueda.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c, idx) => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-muted-foreground">#{idx + 1}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {c.slug}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.address ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={c.active ? 'default' : 'secondary'}>
                      {c.active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar ${c.name}`}
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Borrar ${c.name}`}
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
