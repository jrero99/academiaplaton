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

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function StudentsListPage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MOCK_STUDENTS;
    return MOCK_STUDENTS.filter((s) =>
      [s.firstName, s.lastName, s.email]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [search]);

  return (
    <>
      <PageHeader
        title="Alumnos"
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Alumnos' }]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <Button>
          <Plus className="h-4 w-4" />
          Nuevo alumno
        </Button>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
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
                      <Button variant="ghost" size="icon" aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Borrar"
                        className="hover:text-destructive"
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
    </>
  );
}
