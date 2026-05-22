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
import { MOCK_STUDENTS } from '@/features/students/data/mock-students';
import { MOCK_CENTERS } from '@/features/centers/data/mock-centers';
import { useCurrentUser } from '@/contexts/AuthContext';
import { scopedCenterId } from '@/features/auth/lib/scope';
import {
  StudentSheet,
  type StudentFormValues,
} from '@/features/students/components/StudentSheet';
import type { StudentDto } from '@academiaplaton/shared';

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const ORG_ID = '00000000-0000-0000-0000-000000000001';

type SheetState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; student: StudentDto };

function toOptional(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function formToStudentFields(data: StudentFormValues) {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    centerId: data.centerId,
    birthDate: data.birthDate,
    email: toOptional(data.email),
    phone: toOptional(data.phone),
    address: toOptional(data.address),
    notes: toOptional(data.notes),
    monthlyFee: data.monthlyFee,
    guardians: data.guardians.map((g) => ({
      firstName: g.firstName,
      lastName: g.lastName,
      relationship: g.relationship,
      phone: g.phone,
      email: toOptional(g.email),
    })),
  };
}

const eurFmt = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

type FeeFilter = 'any' | 'none' | 'has';

const initialFilters = {
  search: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  centerId: '',
  fee: 'any' as FeeFilter,
};

function includesCi(haystack: string | null | undefined, needle: string): boolean {
  if (!needle) return true;
  return (haystack ?? '').toLowerCase().includes(needle.toLowerCase());
}

export function StudentsListPage() {
  const currentUser = useCurrentUser();
  const scopedCenter = scopedCenterId(currentUser);

  const [students, setStudents] = useState<StudentDto[]>(MOCK_STUDENTS);
  const [filters, setFilters] = useState(initialFilters);
  const [sheet, setSheet] = useState<SheetState>({ open: false });

  const centerById = useMemo(
    () => new Map(MOCK_CENTERS.map((c) => [c.id, c])),
    [],
  );

  // Centros a los que tiene acceso el usuario: admin todos, manager solo el suyo.
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
    filters.fee !== 'any';

  function clearFilters() {
    setFilters(initialFilters);
  }

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return students.filter((s) => {
      if (scopedCenter !== null && s.centerId !== scopedCenter) return false;
      if (filters.centerId && s.centerId !== filters.centerId) return false;
      if (filters.fee === 'none' && s.monthlyFee != null) return false;
      if (filters.fee === 'has' && s.monthlyFee == null) return false;

      if (!includesCi(s.firstName, filters.firstName)) return false;
      if (!includesCi(s.lastName, filters.lastName)) return false;
      if (!includesCi(s.email, filters.email)) return false;
      if (!includesCi(s.phone, filters.phone)) return false;

      if (q) {
        const center = centerById.get(s.centerId);
        const hit = [s.firstName, s.lastName, s.email ?? '', s.phone ?? '', center?.name ?? '']
          .some((v) => v.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [students, centerById, filters, scopedCenter]);

  function openCreate() {
    setSheet({ open: true, mode: 'create' });
  }

  function openEdit(student: StudentDto) {
    setSheet({ open: true, mode: 'edit', student });
  }

  function closeSheet() {
    setSheet({ open: false });
  }

  function handleSheetSubmit(data: StudentFormValues) {
    if (!sheet.open) return;

    const fields = formToStudentFields(data);

    if (sheet.mode === 'create') {
      const now = new Date().toISOString();
      const newStudent: StudentDto = {
        id: crypto.randomUUID(),
        organizationId: ORG_ID,
        paymentMethod: 'cash',
        createdAt: now,
        updatedAt: now,
        ...fields,
      };
      setStudents((prev) => [newStudent, ...prev]);
    } else {
      const id = sheet.student.id;
      setStudents((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, ...fields, updatedAt: new Date().toISOString() }
            : s,
        ),
      );
    }
  }

  function handleDelete(id: string) {
    setStudents((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <>
      <PageHeader
        title="Alumnos"
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Alumnos' }]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo alumno
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

        <FilterField label="Cuota">
          <select
            className={filterSelectClass}
            value={filters.fee}
            onChange={(e) => setFilters((f) => ({ ...f, fee: e.target.value as FeeFilter }))}
            aria-label="Filtrar por cuota"
          >
            <option value="any">Cualquiera</option>
            <option value="has">Con cuota</option>
            <option value="none">Sin cuota</option>
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
                <TableHead className="hidden md:table-cell">Fecha nacimiento</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                <TableHead className="hidden sm:table-cell">Cuota</TableHead>
                <TableHead className="hidden md:table-cell">Tutores</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No hay alumnos que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s, idx) => (
                  <TableRow key={s.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-muted-foreground hidden sm:table-cell">{idx + 1}</TableCell>
                    <TableCell className="font-medium">
                      {s.firstName} {s.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {centerById.get(s.centerId)?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {dateFmt.format(new Date(s.birthDate))}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">{s.email ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">{s.phone ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">
                      {s.monthlyFee != null ? eurFmt.format(s.monthlyFee) : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">{s.guardians.length}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Abrir">
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar a ${s.firstName} ${s.lastName}`}
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Borrar a ${s.firstName} ${s.lastName}`}
                          className="hover:text-destructive"
                          onClick={() => handleDelete(s.id)}
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

      <StudentSheet
        open={sheet.open}
        onOpenChange={(open) => { if (!open) closeSheet(); }}
        mode={sheet.open ? sheet.mode : 'create'}
        student={sheet.open && sheet.mode === 'edit' ? sheet.student : undefined}
        centers={accessibleCenters}
        onSubmit={handleSheetSubmit}
      />
    </>
  );
}
