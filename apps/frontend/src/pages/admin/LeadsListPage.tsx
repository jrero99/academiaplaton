import { useMemo, useState } from 'react';
import { Plus, ArrowUpRight, Pencil, Trash2 } from 'lucide-react';
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
import { LeadStatusBadge } from '@/features/leads/components/LeadStatusBadge';
import { MOCK_LEADS } from '@/features/leads/data/mock-leads';
import type { LeadStatus } from '@academiaplaton/shared';

const STATUS_OPTIONS: Array<{ value: LeadStatus; label: string }> = [
  { value: 'new', label: 'Nuevo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'visit_scheduled', label: 'Visita' },
  { value: 'trial_class', label: 'Prueba' },
  { value: 'converted', label: 'Convertido' },
  { value: 'lost', label: 'Perdido' },
];

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

type FilterState = {
  search: string;
  firstName: string;
  lastName: string;
  email: string;
  status: LeadStatus | '';
  course: string;
};

const initialFilters: FilterState = {
  search: '',
  firstName: '',
  lastName: '',
  email: '',
  status: '',
  course: '',
};

function includesCi(haystack: string | null | undefined, needle: string): boolean {
  if (!needle) return true;
  return (haystack ?? '').toLowerCase().includes(needle.toLowerCase());
}

export function LeadsListPage() {
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const courseOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of MOCK_LEADS) {
      if (l.interestedCourse) set.add(l.interestedCourse);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, []);

  const hasActiveFilters =
    filters.search !== '' ||
    filters.firstName !== '' ||
    filters.lastName !== '' ||
    filters.email !== '' ||
    filters.status !== '' ||
    filters.course !== '';

  function clearFilters() {
    setFilters(initialFilters);
  }

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return MOCK_LEADS.filter((lead) => {
      if (filters.status && lead.status !== filters.status) return false;
      if (filters.course && lead.interestedCourse !== filters.course) return false;

      if (!includesCi(lead.firstName, filters.firstName)) return false;
      if (!includesCi(lead.lastName, filters.lastName)) return false;
      if (!includesCi(lead.email, filters.email)) return false;

      if (q) {
        const hit = [lead.firstName, lead.lastName, lead.email, lead.interestedCourse]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [filters]);

  return (
    <>
      <PageHeader
        title="Leads"
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Leads' }]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <Button>
          <Plus className="h-4 w-4" />
          Nuevo lead
        </Button>
      </div>

      <FilterBar hasActive={hasActiveFilters} onClear={clearFilters}>
        <FilterField label="Buscador">
          <input
            type="text"
            className={filterInputClass}
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Nombre, email, curso..."
            aria-label="Buscador general"
          />
        </FilterField>

        <FilterField label="Nombre">
          <input
            type="text"
            className={filterInputClass}
            value={filters.firstName}
            onChange={(e) => setFilters((f) => ({ ...f, firstName: e.target.value }))}
            aria-label="Filtrar por nombre"
          />
        </FilterField>

        <FilterField label="Apellidos">
          <input
            type="text"
            className={filterInputClass}
            value={filters.lastName}
            onChange={(e) => setFilters((f) => ({ ...f, lastName: e.target.value }))}
            aria-label="Filtrar por apellidos"
          />
        </FilterField>

        <FilterField label="Email">
          <input
            type="text"
            className={filterInputClass}
            value={filters.email}
            onChange={(e) => setFilters((f) => ({ ...f, email: e.target.value }))}
            aria-label="Filtrar por email"
          />
        </FilterField>

        <FilterField label="Estado">
          <select
            className={filterSelectClass}
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value as LeadStatus | '' }))
            }
            aria-label="Filtrar por estado"
          >
            <option value="">Todos</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Curso de interés">
          <select
            className={filterSelectClass}
            value={filters.course}
            onChange={(e) => setFilters((f) => ({ ...f, course: e.target.value }))}
            aria-label="Filtrar por curso de interés"
          >
            <option value="">Todos</option>
            {courseOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
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
                <TableHead>Nombre completo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Curso de interés</TableHead>
                <TableHead className="hidden md:table-cell">Fecha de alta</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No hay leads que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((lead, idx) => (
                  <TableRow key={lead.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-muted-foreground hidden sm:table-cell">{idx + 1}</TableCell>
                    <TableCell className="font-medium">
                      {lead.firstName} {lead.lastName}
                    </TableCell>
                    <TableCell>
                      <LeadStatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">
                      {lead.email ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {lead.interestedCourse ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {dateFmt.format(new Date(lead.createdAt))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <RowAction icon={ArrowUpRight} label="Abrir" />
                        <RowAction icon={Pencil} label="Editar" />
                        <RowAction icon={Trash2} label="Borrar" destructive />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}

interface RowActionProps {
  icon: typeof Pencil;
  label: string;
  destructive?: boolean;
}

function RowAction({ icon: Icon, label, destructive }: RowActionProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      className={destructive ? 'hover:text-destructive' : undefined}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
