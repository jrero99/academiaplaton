import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { GroupDto } from '@academiaplaton/shared';
import type { Teacher } from '@/features/teachers/types';
import type { StudentDto } from '@academiaplaton/shared';
import { GroupAttendanceHistoryPanel } from '@/features/attendance/components/GroupAttendanceHistoryPanel';
import { useTranslation } from '@/contexts/LanguageContext';

const groupSchema = z.object({
  name: z.string().min(1, 'El nombre del grupo es obligatorio').max(120),
  subject: z.string().max(120).optional(),
  description: z.string().max(240).optional(),
  teacherId: z.string().min(1, 'Selecciona un profesor titular'),
  active: z.boolean(),
  notes: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof groupSchema>;

export interface GroupFormSubmit extends FormValues {
  studentIds: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  group?: GroupDto;
  teachers: Teacher[];
  students: StudentDto[];
  onSubmit: (data: GroupFormSubmit) => void;
}

function GroupForm({
  mode,
  group,
  teachers,
  students,
  onSubmit,
  onCancel,
}: {
  mode: 'create' | 'edit';
  group?: GroupDto;
  teachers: Teacher[];
  students: StudentDto[];
  onSubmit: (data: GroupFormSubmit) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const initialActive = mode === 'edit' && group ? group.active : true;
  const [activeChecked, setActiveChecked] = useState(initialActive);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    () => new Set(mode === 'edit' && group ? group.studentIds : []),
  );
  const [studentFilter, setStudentFilter] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues:
      mode === 'edit' && group
        ? {
            name: group.name,
            subject: group.subject ?? '',
            description: group.description ?? '',
            teacherId: group.teacherId,
            active: group.active,
            notes: group.notes ?? '',
          }
        : {
            name: '',
            subject: '',
            description: '',
            teacherId: '',
            active: true,
            notes: '',
          },
  });

  function toggleStudent(id: string) {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleFormSubmit(values: FormValues) {
    onSubmit({ ...values, studentIds: Array.from(selectedStudents) });
  }

  const q = studentFilter.trim().toLowerCase();
  const visibleStudents = q
    ? students.filter((s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q),
      )
    : students;

  return (
    <>
      <form
        id="group-form"
        onSubmit={handleSubmit(handleFormSubmit)}
        className="flex flex-col gap-5 px-6 py-6"
        noValidate
      >
        {/* Nombre */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="group-name" className="text-sm font-medium">
            {t('group_sheet.field.name')} <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <Input id="group-name" aria-invalid={!!errors.name} {...register('name')} />
          {errors.name && (
            <p role="alert" className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Asignatura */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="group-subject" className="text-sm font-medium">
            {t('group_sheet.field.subject')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span>
          </label>
          <Input id="group-subject" {...register('subject')} />
        </div>

        {/* Descripción */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="group-description" className="text-sm font-medium">
            {t('group_sheet.field.description')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span>
          </label>
          <textarea
            id="group-description"
            rows={2}
            placeholder={t('group_sheet.field.description_placeholder')}
            maxLength={240}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            {...register('description')}
          />
          {errors.description && (
            <p role="alert" className="text-xs text-destructive">{errors.description.message}</p>
          )}
        </div>

        {/* Profesor titular */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="group-teacher" className="text-sm font-medium">
            {t('group_sheet.field.teacher')} <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <select
            id="group-teacher"
            aria-invalid={!!errors.teacherId}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            {...register('teacherId')}
          >
            <option value="">{t('group_sheet.field.teacher_placeholder')}</option>
            {teachers
              .filter((tch) => tch.active || (group && tch.id === group.teacherId))
              .map((tch) => (
                <option key={tch.id} value={tch.id}>
                  {tch.firstName} {tch.lastName}
                  {!tch.active ? t('group_sheet.field.teacher_inactive_suffix') : ''}
                </option>
              ))}
          </select>
          {errors.teacherId && (
            <p role="alert" className="text-xs text-destructive">{errors.teacherId.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {t('group_sheet.field.teacher_substitution_hint')}
          </p>
        </div>

        {/* Activo */}
        <div className="flex items-center gap-3">
          <input
            id="group-active"
            type="checkbox"
            checked={activeChecked}
            onChange={(e) => {
              setActiveChecked(e.target.checked);
              setValue('active', e.target.checked);
            }}
            className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
          />
          <label htmlFor="group-active" className="text-sm font-medium cursor-pointer">
            {t('group_sheet.field.active_label')}
          </label>
        </div>

        {/* Notas */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="group-notes" className="text-sm font-medium">
            {t('group_sheet.field.notes')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span>
          </label>
          <textarea
            id="group-notes"
            rows={3}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            {...register('notes')}
          />
        </div>

        <Separator />

        {/* Alumnos asignados */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{t('group_sheet.field.students_assigned')}</p>
            <span className="text-xs text-muted-foreground">
              {t('group_sheet.field.students_selected', {
                count: selectedStudents.size,
                suffix: selectedStudents.size === 1 ? '' : 's',
              })}
            </span>
          </div>
          <Input
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            placeholder={t('group_sheet.field.students_filter_placeholder')}
            className="bg-muted"
          />
          <div className="max-h-56 overflow-y-auto rounded-md border border-input divide-y">
            {visibleStudents.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">{t('group_sheet.field.students_empty')}</p>
            ) : (
              visibleStudents.map((s) => {
                const checked = selectedStudents.has(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStudent(s.id)}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    <span>
                      {s.firstName} {s.lastName}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </form>

      <SheetFooter className="px-6 pb-6 pt-0 flex-row justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('sheet.cancel')}
        </Button>
        <Button type="submit" form="group-form" disabled={isSubmitting}>
          {mode === 'create' ? t('group_sheet.submit_create') : t('group_sheet.submit_edit')}
        </Button>
      </SheetFooter>
    </>
  );
}

export function GroupSheet({
  open,
  onOpenChange,
  mode,
  group,
  teachers,
  students,
  onSubmit,
}: Props) {
  const { t } = useTranslation();

  function handleSubmit(data: GroupFormSubmit) {
    onSubmit(data);
    onOpenChange(false);
  }

  const formKey = mode === 'edit' && group ? group.id : 'create';
  const showAttendanceTab = mode === 'edit' && !!group;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle>{mode === 'create' ? t('group_sheet.title_create') : t('group_sheet.title_edit')}</SheetTitle>
          <SheetDescription>
            {mode === 'create'
              ? t('group_sheet.desc_create_full')
              : t('group_sheet.desc_edit')}
          </SheetDescription>
        </SheetHeader>

        {showAttendanceTab && group ? (
          <Tabs defaultValue="data" className="px-6 pt-4">
            <TabsList className="w-full">
              <TabsTrigger value="data">{t('group_sheet.tab.data')}</TabsTrigger>
              <TabsTrigger value="attendance">{t('group_sheet.tab.attendance')}</TabsTrigger>
            </TabsList>
            <TabsContent value="data" className="-mx-6">
              <GroupForm
                key={formKey}
                mode={mode}
                group={group}
                teachers={teachers}
                students={students}
                onSubmit={handleSubmit}
                onCancel={() => onOpenChange(false)}
              />
            </TabsContent>
            <TabsContent value="attendance" className="px-0 pt-4 pb-6">
              <GroupAttendanceHistoryPanel groupId={group.id} />
            </TabsContent>
          </Tabs>
        ) : (
          <GroupForm
            key={formKey}
            mode={mode}
            group={group}
            teachers={teachers}
            students={students}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
