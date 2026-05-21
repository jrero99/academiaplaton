import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
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
import { MOCK_CENTERS } from '@/features/centers/data/mock-centers';
import { MOCK_GROUPS } from '@/features/groups/data/mock-groups';
import { useCurrentUser } from '@/contexts/AuthContext';
import { scopedCenterId } from '@/features/auth/lib/scope';
import {
  GroupSheet,
  type GroupFormSubmit,
} from '@/features/groups/components/GroupSheet';
import { MOCK_TEACHERS } from '@/features/teachers/data/mock-teachers';
import { MOCK_STUDENTS } from '@/features/students/data/mock-students';
import type { GroupDto } from '@academiaplaton/shared';

const ORG_ID = '00000000-0000-0000-0000-000000000001';
const CENTER_ID = '00000000-0000-0000-0000-0000000000c1';

type SheetState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; group: GroupDto };

type StatusFilter = 'any' | 'active' | 'inactive';

type FilterState = {
  search: string;
  name: string;
  description: string;
  centerId: string;
  teacherId: string;
  status: StatusFilter;
  subject: string;
};

const initialFilters: FilterState = {
  search: '',
  name: '',
  description: '',
  centerId: '',
  teacherId: '',
  status: 'any',
  subject: '',
};

function includesCi(haystack: string | null | undefined, needle: string): boolean {
  if (!needle) return true;
  return (haystack ?? '').toLowerCase().includes(needle.toLowerCase());
}

export function GroupsListPage() {
  const currentUser = useCurrentUser();
  const scopedCenter = scopedCenterId(currentUser);

  const [groups, setGroups] = useState<GroupDto[]>(MOCK_GROUPS);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [sheet, setSheet] = useState<SheetState>({ open: false });

  const accessibleCenters = useMemo(
    () => (scopedCenter === null ? MOCK_CENTERS : MOCK_CENTERS.filter((c) => c.id === scopedCenter)),
    [scopedCenter],
  );

  const teacherById = useMemo(
    () => new Map(MOCK_TEACHERS.map((t) => [t.id, t])),
    [],
  );

  const subjectOptions = useMemo(() => {
    const set = new Set<string>();
    for (const g of groups) {
      if (g.subject) set.add(g.subject);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [groups]);

  const hasActiveFilters =
    filters.search !== '' ||
    filters.name !== '' ||
    filters.description !== '' ||
    filters.centerId !== '' ||
    filters.teacherId !== '' ||
    filters.status !== 'any' ||
    filters.subject !== '';

  function clearFilters() {
    setFilters(initialFilters);
  }

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return groups.filter((g) => {
      if (scopedCenter !== null && g.centerId !== scopedCenter) return false;
      if (filters.centerId && g.centerId !== filters.centerId) return false;
      if (filters.teacherId && g.teacherId !== filters.teacherId) return false;
      if (filters.status === 'active' && !g.active) return false;
      if (filters.status === 'inactive' && g.active) return false;
      if (filters.subject && g.subject !== filters.subject) return false;

      if (!includesCi(g.name, filters.name)) return false;
      if (!includesCi(g.description, filters.description)) return false;

      if (q) {
        const teacher = teacherById.get(g.teacherId);
        const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : '';
        const hit = [g.name, g.subject ?? '', g.description ?? '', teacherName]
          .some((v) => v.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [groups, teacherById, filters, scopedCenter]);

  function openCreate() {
    setSheet({ open: true, mode: 'create' });
  }

  function openEdit(group: GroupDto) {
    setSheet({ open: true, mode: 'edit', group });
  }

  function closeSheet() {
    setSheet({ open: false });
  }

  function handleSheetSubmit(data: GroupFormSubmit) {
    if (!sheet.open) return;
    const now = new Date().toISOString();

    if (sheet.mode === 'create') {
      const newGroup: GroupDto = {
        id: crypto.randomUUID(),
        organizationId: ORG_ID,
        centerId: CENTER_ID,
        teacherId: data.teacherId,
        name: data.name,
        subject: data.subject || undefined,
        description: data.description || undefined,
        active: data.active,
        notes: data.notes || undefined,
        studentIds: data.studentIds,
        studentCount: data.studentIds.length,
        createdAt: now,
        updatedAt: now,
      };
      setGroups((prev) => [newGroup, ...prev]);
    } else {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === sheet.group.id
            ? {
                ...g,
                teacherId: data.teacherId,
                name: data.name,
                subject: data.subject || undefined,
                description: data.description || undefined,
                active: data.active,
                notes: data.notes || undefined,
                studentIds: data.studentIds,
                studentCount: data.studentIds.length,
                updatedAt: now,
              }
            : g,
        ),
      );
    }
  }

  function handleDelete(id: string) {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }

  return (
    <>
      <PageHeader
        title="Grupos"
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Grupos' }]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo grupo
        </Button>
      </div>

      <FilterBar hasActive={hasActiveFilters} onClear={clearFilters}>
        <FilterField label="Buscador">
          <input
            type="text"
            className={filterInputClass}
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Nombre, asignatura, descripción..."
            aria-label="Buscador general"
          />
        </FilterField>

        <FilterField label="Grupo">
          <input
            type="text"
            className={filterInputClass}
            value={filters.name}
            onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
            aria-label="Filtrar por nombre de grupo"
          />
        </FilterField>

        <FilterField label="Descripción">
          <input
            type="text"
            className={filterInputClass}
            value={filters.description}
            onChange={(e) => setFilters((f) => ({ ...f, description: e.target.value }))}
            aria-label="Filtrar por descripción"
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

        <FilterField label="Asignatura">
          <select
            className={filterSelectClass}
            value={filters.subject}
            onChange={(e) => setFilters((f) => ({ ...f, subject: e.target.value }))}
            aria-label="Filtrar por asignatura"
          >
            <option value="">Todas</option>
            {subjectOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Profesor titular">
          <select
            className={filterSelectClass}
            value={filters.teacherId}
            onChange={(e) => setFilters((f) => ({ ...f, teacherId: e.target.value }))}
            aria-label="Filtrar por profesor titular"
          >
            <option value="">Todos</option>
            {MOCK_TEACHERS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.firstName} {t.lastName}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Estado">
          <select
            className={filterSelectClass}
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value as StatusFilter }))
            }
            aria-label="Filtrar por estado"
          >
            <option value="any">Cualquiera</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </FilterField>
      </FilterBar>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead className="w-12 text-muted-foreground">#</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Asignatura</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Profesor titular</TableHead>
              <TableHead>Alumnos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-32 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No hay grupos que coincidan con la búsqueda.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((g, idx) => {
                const teacher = teacherById.get(g.teacherId);
                return (
                  <TableRow key={g.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell className="text-muted-foreground">{g.subject ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[260px] truncate" title={g.description ?? undefined}>
                      {g.description ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {teacher ? `${teacher.firstName} ${teacher.lastName}` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" />
                        {g.studentCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={g.active ? 'default' : 'secondary'}>
                        {g.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar grupo ${g.name}`}
                          onClick={() => openEdit(g)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Borrar grupo ${g.name}`}
                          className="hover:text-destructive"
                          onClick={() => handleDelete(g.id)}
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

      <GroupSheet
        open={sheet.open}
        onOpenChange={(open) => { if (!open) closeSheet(); }}
        mode={sheet.open ? sheet.mode : 'create'}
        group={sheet.open && sheet.mode === 'edit' ? sheet.group : undefined}
        teachers={
          scopedCenter === null
            ? MOCK_TEACHERS
            : MOCK_TEACHERS.filter((t) => t.centerId === scopedCenter)
        }
        students={
          scopedCenter === null
            ? MOCK_STUDENTS
            : MOCK_STUDENTS.filter((s) => s.centerId === scopedCenter)
        }
        onSubmit={handleSheetSubmit}
      />
    </>
  );
}
