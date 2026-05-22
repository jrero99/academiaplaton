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
import { MOCK_TEACHERS } from '@/features/teachers/data/mock-teachers';
import { MOCK_CENTERS } from '@/features/centers/data/mock-centers';
import { TeacherSheet } from '@/features/teachers/components/TeacherSheet';
import type { Teacher } from '@/features/teachers/types';
import { useCurrentUser } from '@/contexts/AuthContext';
import { scopedCenterId } from '@/features/auth/lib/scope';

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const ORG_ID = '00000000-0000-0000-0000-000000000001';

type SheetState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; teacher: Teacher };

type StatusFilter = 'any' | 'active' | 'inactive';

const initialFilters = {
  search: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  centerId: '',
  status: 'any' as StatusFilter,
};

function includesCi(haystack: string | null | undefined, needle: string): boolean {
  if (!needle) return true;
  return (haystack ?? '').toLowerCase().includes(needle.toLowerCase());
}

export function TeachersListPage() {
  const currentUser = useCurrentUser();
  const scopedCenter = scopedCenterId(currentUser);

  const [teachers, setTeachers] = useState<Teacher[]>(MOCK_TEACHERS);
  const [filters, setFilters] = useState(initialFilters);
  const [sheet, setSheet] = useState<SheetState>({ open: false });

  const centerById = useMemo(
    () => new Map(MOCK_CENTERS.map((c) => [c.id, c])),
    [],
  );

  const accessibleCenters = useMemo(
    () => (scopedCenter === null ? MOCK_CENTERS : MOCK_CENTERS.filter((c) => c.id === scopedCenter)),
    [scopedCenter],
  );

  const hasActiveFilters =
    filters.search !== '' ||
    filters.firstName !== '' ||
    filters.lastName !== '' ||
    filters.email !== '' ||
    filters.phone !== '' ||
    filters.centerId !== '' ||
    filters.status !== 'any';

  function clearFilters() {
    setFilters(initialFilters);
  }

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return teachers.filter((t) => {
      if (scopedCenter !== null && t.centerId !== scopedCenter) return false;
      if (filters.centerId && t.centerId !== filters.centerId) return false;
      if (filters.status === 'active' && !t.active) return false;
      if (filters.status === 'inactive' && t.active) return false;

      if (!includesCi(t.firstName, filters.firstName)) return false;
      if (!includesCi(t.lastName, filters.lastName)) return false;
      if (!includesCi(t.email, filters.email)) return false;
      if (!includesCi(t.phone, filters.phone)) return false;

      if (q) {
        const center = centerById.get(t.centerId);
        const hit = [t.firstName, t.lastName, t.email, t.phone ?? '', center?.name ?? '']
          .some((v) => v.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [teachers, filters, centerById, scopedCenter]);

  function openCreate() {
    setSheet({ open: true, mode: 'create' });
  }

  function openEdit(teacher: Teacher) {
    setSheet({ open: true, mode: 'edit', teacher });
  }

  function closeSheet() {
    setSheet({ open: false });
  }

  function handleSheetSubmit(data: Omit<Teacher, 'id' | 'organizationId' | 'createdAt'>) {
    if (!sheet.open) return;

    if (sheet.mode === 'create') {
      const newTeacher: Teacher = {
        id: crypto.randomUUID(),
        organizationId: ORG_ID,
        createdAt: new Date().toISOString(),
        ...data,
      };
      setTeachers((prev) => [newTeacher, ...prev]);
    } else {
      setTeachers((prev) =>
        prev.map((t) => (t.id === sheet.teacher.id ? { ...t, ...data } : t)),
      );
    }
  }

  function handleDelete(id: string) {
    setTeachers((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <>
      <PageHeader
        title="Profesores"
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Profesores' }]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo profesor
        </Button>
      </div>

      <FilterBar hasActive={hasActiveFilters} onClear={clearFilters}>
        <FilterField label="Buscador">
          <input
            type="text"
            className={filterInputClass}
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Nombre, email, teléfono..."
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

        <FilterField label="Teléfono">
          <input
            type="text"
            className={filterInputClass}
            value={filters.phone}
            onChange={(e) => setFilters((f) => ({ ...f, phone: e.target.value }))}
            aria-label="Filtrar por teléfono"
          />
        </FilterField>

        {accessibleCenters.length > 1 && (
          <FilterField label="Academia">
            <select
              className={filterSelectClass}
              value={filters.centerId}
              onChange={(e) => setFilters((f) => ({ ...f, centerId: e.target.value }))}
              aria-label="Filtrar por academia"
            >
              <option value="">Todas</option>
              {accessibleCenters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </FilterField>
        )}

        <FilterField label="Estado">
          <select
            className={filterSelectClass}
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as StatusFilter }))}
            aria-label="Filtrar por estado"
          >
            <option value="any">Cualquiera</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
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
                <TableHead className="hidden md:table-cell">Academia</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden md:table-cell">Alta</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No hay profesores que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t, idx) => (
                  <TableRow key={t.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-muted-foreground hidden sm:table-cell">{idx + 1}</TableCell>
                    <TableCell className="font-medium">
                      {t.firstName} {t.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {centerById.get(t.centerId)?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">{t.email}</TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">{t.phone ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={t.active ? 'default' : 'secondary'}>
                        {t.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {dateFmt.format(new Date(t.createdAt))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar a ${t.firstName} ${t.lastName}`}
                          onClick={() => openEdit(t)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Borrar a ${t.firstName} ${t.lastName}`}
                          className="hover:text-destructive"
                          onClick={() => handleDelete(t.id)}
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

      <TeacherSheet
        open={sheet.open}
        onOpenChange={(open) => { if (!open) closeSheet(); }}
        mode={sheet.open ? sheet.mode : 'create'}
        teacher={sheet.open && sheet.mode === 'edit' ? sheet.teacher : undefined}
        centers={accessibleCenters}
        existingTeachers={teachers}
        onSubmit={handleSheetSubmit}
      />
    </>
  );
}
