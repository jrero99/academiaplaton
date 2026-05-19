import { useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Users } from 'lucide-react';
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
import { MOCK_GROUPS } from '@/features/groups/data/mock-groups';
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

export function GroupsListPage() {
  const [groups, setGroups] = useState<GroupDto[]>(MOCK_GROUPS);
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState<SheetState>({ open: false });

  const teacherById = useMemo(
    () => new Map(MOCK_TEACHERS.map((t) => [t.id, t])),
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => {
      const teacher = teacherById.get(g.teacherId);
      const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : '';
      return [g.name, g.subject ?? '', g.description ?? '', teacherName]
        .some((v) => v.toLowerCase().includes(q));
    });
  }, [search, groups, teacherById]);

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
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-9 bg-muted"
            aria-label="Buscar grupos"
          />
        </div>
      </div>

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
        teachers={MOCK_TEACHERS}
        students={MOCK_STUDENTS}
        onSubmit={handleSheetSubmit}
      />
    </>
  );
}
