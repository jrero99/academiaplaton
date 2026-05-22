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
import { useTranslation } from '@/contexts/LanguageContext';

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
  const { t, locale } = useTranslation();

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }),
    [locale],
  );

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
    return teachers.filter((teacher) => {
      if (scopedCenter !== null && teacher.centerId !== scopedCenter) return false;
      if (filters.centerId && teacher.centerId !== filters.centerId) return false;
      if (filters.status === 'active' && !teacher.active) return false;
      if (filters.status === 'inactive' && teacher.active) return false;

      if (!includesCi(teacher.firstName, filters.firstName)) return false;
      if (!includesCi(teacher.lastName, filters.lastName)) return false;
      if (!includesCi(teacher.email, filters.email)) return false;
      if (!includesCi(teacher.phone, filters.phone)) return false;

      if (q) {
        const center = centerById.get(teacher.centerId);
        const hit = [teacher.firstName, teacher.lastName, teacher.email, teacher.phone ?? '', center?.name ?? '']
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
        prev.map((teacher) => (teacher.id === sheet.teacher.id ? { ...teacher, ...data } : teacher)),
      );
    }
  }

  function handleDelete(id: string) {
    setTeachers((prev) => prev.filter((teacher) => teacher.id !== id));
  }

  return (
    <>
      <PageHeader
        title={t('teachers.title')}
        breadcrumbs={[{ label: t('breadcrumb.admin'), to: '/admin' }, { label: t('teachers.title') }]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t('teachers.new')}
        </Button>
      </div>

      <FilterBar hasActive={hasActiveFilters} onClear={clearFilters}>
        <FilterField label={t('filterbar.search_label')}>
          <input
            type="text"
            className={filterInputClass}
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder={t('common.placeholder_search_name_email_phone')}
            aria-label={t('common.search_general_aria')}
          />
        </FilterField>

        <FilterField label={t('common.name')}>
          <input
            type="text"
            className={filterInputClass}
            value={filters.firstName}
            onChange={(e) => setFilters((f) => ({ ...f, firstName: e.target.value }))}
            aria-label={t('common.filter_by_name_aria')}
          />
        </FilterField>

        <FilterField label={t('common.surname')}>
          <input
            type="text"
            className={filterInputClass}
            value={filters.lastName}
            onChange={(e) => setFilters((f) => ({ ...f, lastName: e.target.value }))}
            aria-label={t('common.filter_by_surname_aria')}
          />
        </FilterField>

        <FilterField label={t('common.email')}>
          <input
            type="text"
            className={filterInputClass}
            value={filters.email}
            onChange={(e) => setFilters((f) => ({ ...f, email: e.target.value }))}
            aria-label={t('common.filter_by_email_aria')}
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

        {accessibleCenters.length > 1 && (
          <FilterField label={t('common.center')}>
            <select
              className={filterSelectClass}
              value={filters.centerId}
              onChange={(e) => setFilters((f) => ({ ...f, centerId: e.target.value }))}
              aria-label={t('common.center_filter_aria')}
            >
              <option value="">{t('teachers.filter.center_all')}</option>
              {accessibleCenters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </FilterField>
        )}

        <FilterField label={t('common.status')}>
          <select
            className={filterSelectClass}
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as StatusFilter }))}
            aria-label={t('common.filter_by_status_aria')}
          >
            <option value="any">{t('teachers.filter.status_any')}</option>
            <option value="active">{t('teachers.filter.status_active')}</option>
            <option value="inactive">{t('teachers.filter.status_inactive')}</option>
          </select>
        </FilterField>
      </FilterBar>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="w-12 text-muted-foreground hidden sm:table-cell">#</TableHead>
                <TableHead>{t('common.full_name')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('common.center')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('common.email')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('common.phone')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('teachers.col.created_at')}</TableHead>
                <TableHead className="w-24 text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {t('teachers.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((teacher, idx) => (
                  <TableRow key={teacher.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-muted-foreground hidden sm:table-cell">{idx + 1}</TableCell>
                    <TableCell className="font-medium">
                      {teacher.firstName} {teacher.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {centerById.get(teacher.centerId)?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">{teacher.email}</TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">{teacher.phone ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={teacher.active ? 'default' : 'secondary'}>
                        {teacher.active ? t('teachers.status.active') : t('teachers.status.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {dateFmt.format(new Date(teacher.createdAt))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t('teachers.action.edit_person', { name: `${teacher.firstName} ${teacher.lastName}` })}
                          onClick={() => openEdit(teacher)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t('teachers.action.delete_person', { name: `${teacher.firstName} ${teacher.lastName}` })}
                          className="hover:text-destructive"
                          onClick={() => handleDelete(teacher.id)}
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
