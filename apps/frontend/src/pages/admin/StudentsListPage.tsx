import { useMemo, useState } from 'react';
import { Plus, Search, ArrowUpRight, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
const CENTER_ID = '00000000-0000-0000-0000-0000000000c1';

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
    birthDate: data.birthDate,
    email: toOptional(data.email),
    phone: toOptional(data.phone),
    address: toOptional(data.address),
    notes: toOptional(data.notes),
    guardians: data.guardians.map((g) => ({
      firstName: g.firstName,
      lastName: g.lastName,
      relationship: g.relationship,
      phone: g.phone,
      email: toOptional(g.email),
    })),
  };
}

export function StudentsListPage() {
  const [students, setStudents] = useState<StudentDto[]>(MOCK_STUDENTS);
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState<SheetState>({ open: false });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.firstName, s.lastName, s.email]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [search, students]);

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
        centerId: CENTER_ID,
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
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-9 bg-muted"
            aria-label="Buscar alumnos"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead className="w-12 text-muted-foreground">#</TableHead>
              <TableHead>Nombre completo</TableHead>
              <TableHead>Fecha nacimiento</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Tutores</TableHead>
              <TableHead className="w-32 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No hay alumnos que coincidan con la búsqueda.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s, idx) => (
                <TableRow key={s.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-medium">
                    {s.firstName} {s.lastName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dateFmt.format(new Date(s.birthDate))}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.email ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{s.phone ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{s.guardians.length}</TableCell>
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

      <StudentSheet
        open={sheet.open}
        onOpenChange={(open) => { if (!open) closeSheet(); }}
        mode={sheet.open ? sheet.mode : 'create'}
        student={sheet.open && sheet.mode === 'edit' ? sheet.student : undefined}
        onSubmit={handleSheetSubmit}
      />
    </>
  );
}
