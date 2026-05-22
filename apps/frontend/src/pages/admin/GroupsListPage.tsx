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
import { useTranslation } from '@/contexts/LanguageContext';

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
  const { t, locale } = useTranslation();

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
    return Array.from(set).sort((a, b) => a.localeCompare(b, locale));
  }, [groups, locale]);

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
        classType: 'GRUPAL',
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
        title={t('groups.title')}
        breadcrumbs={[{ label: t('breadcrumb.admin'), to: '/admin' }, { label: t('groups.title') }]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t('groups.new')}
        </Button>
      </div>

      <FilterBar hasActive={hasActiveFilters} onClear={clearFilters}>
        <FilterField label={t('filterbar.search_label')}>
          <input
            type="text"
            className={filterInputClass}
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder={t('groups.filter.placeholder_search')}
            aria-label={t('common.search_general_aria')}
          />
        </FilterField>

        <FilterField label={t('groups.col.group')}>
          <input
            type="text"
            className={filterInputClass}
            value={filters.name}
            onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
            aria-label={t('groups.filter.name_aria')}
          />
        </FilterField>

        <FilterField label={t('groups.col.description')}>
          <input
            type="text"
            className={filterInputClass}
            value={filters.description}
            onChange={(e) => setFilters((f) => ({ ...f, description: e.target.value }))}
            aria-label={t('groups.filter.description_aria')}
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
              <option value="">{t('groups.filter.center_all')}</option>
              {accessibleCenters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </FilterField>
        )}

        <FilterField label={t('groups.col.subject')}>
          <select
            className={filterSelectClass}
            value={filters.subject}
            onChange={(e) => setFilters((f) => ({ ...f, subject: e.target.value }))}
            aria-label={t('groups.filter.subject_aria')}
          >
            <option value="">{t('common.all_f')}</option>
            {subjectOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </FilterField>

        <FilterField label={t('groups.col.head_teacher')}>
          <select
            className={filterSelectClass}
            value={filters.teacherId}
            onChange={(e) => setFilters((f) => ({ ...f, teacherId: e.target.value }))}
            aria-label={t('groups.filter.teacher_aria')}
          >
            <option value="">{t('groups.filter.teacher_all')}</option>
            {MOCK_TEACHERS.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.firstName} {teacher.lastName}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label={t('common.status')}>
          <select
            className={filterSelectClass}
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value as StatusFilter }))
            }
            aria-label={t('common.filter_by_status_aria')}
          >
            <option value="any">{t('common.any')}</option>
            <option value="active">{t('common.actives_m')}</option>
            <option value="inactive">{t('common.inactives_m')}</option>
          </select>
        </FilterField>
      </FilterBar>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="w-12 text-muted-foreground hidden sm:table-cell">#</TableHead>
                <TableHead>{t('groups.col.group')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('groups.col.subject')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('groups.col.description')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('groups.col.head_teacher')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('groups.col.students')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="w-24 text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {t('groups.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((g, idx) => {
                  const teacher = teacherById.get(g.teacherId);
                  return (
                    <TableRow key={g.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-muted-foreground hidden sm:table-cell">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">{g.subject ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[260px] truncate hidden md:table-cell" title={g.description ?? undefined}>
                        {g.description ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">
                        {teacher ? `${teacher.firstName} ${teacher.lastName}` : '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary" className="gap-1">
                          <Users className="h-3 w-3" />
                          {g.studentCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={g.active ? 'default' : 'secondary'}>
                          {g.active ? t('groups.status.active') : t('groups.status.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('groups.action.edit_group', { name: g.name })}
                            onClick={() => openEdit(g)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('groups.action.delete_group', { name: g.name })}
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
      </div>

      <GroupSheet
        open={sheet.open}
        onOpenChange={(open) => { if (!open) closeSheet(); }}
        mode={sheet.open ? sheet.mode : 'create'}
        group={sheet.open && sheet.mode === 'edit' ? sheet.group : undefined}
        teachers={
          scopedCenter === null
            ? MOCK_TEACHERS
            : MOCK_TEACHERS.filter((teacher) => teacher.centerId === scopedCenter)
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
