import { useState } from 'react';
import { useCurrentUser } from '@/contexts/AuthContext';
import { userHasRole } from '@/features/auth/lib/permissions';
import { PageHeader } from '@/components/admin/PageHeader';
import { MOCK_CLOCK_ENTRIES } from '@/features/clocking/data/mock-clocking';
import { MOCK_TEACHERS } from '@/features/teachers/data/mock-teachers';
import { TeacherClockCard } from '@/features/clocking/components/TeacherClockCard';
import { AdminClockingControl } from '@/features/clocking/components/AdminClockingControl';
import type { ClockEntry } from '@/features/clocking/types';

export function ClockingPage() {
  const currentUser = useCurrentUser();
  const [entries, setEntries] = useState<ClockEntry[]>(MOCK_CLOCK_ENTRIES);

  function handleClockIn(teacherId: string) {
    const newEntry: ClockEntry = {
      id: crypto.randomUUID(),
      organizationId: '00000000-0000-0000-0000-000000000001',
      teacherId,
      clockIn: new Date().toISOString(),
      clockOut: null,
    };
    setEntries((prev) => [newEntry, ...prev]);
  }

  function handleClockOut(entryId: string) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, clockOut: new Date().toISOString() } : e,
      ),
    );
  }

  const isTeacherOnly =
    userHasRole(currentUser, 'teacher') &&
    !userHasRole(currentUser, 'admin') &&
    !userHasRole(currentUser, 'center_manager');

  const isManager =
    userHasRole(currentUser, 'admin') || userHasRole(currentUser, 'center_manager');

  return (
    <>
      <PageHeader
        title="Fichaje"
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Fichaje' }]}
      />

      {isTeacherOnly && (
        <TeacherClockCard
          entries={entries}
          currentUser={currentUser}
          onClockIn={handleClockIn}
          onClockOut={handleClockOut}
        />
      )}

      {isManager && (
        <AdminClockingControl entries={entries} teachers={MOCK_TEACHERS} />
      )}

      {!isTeacherOnly && !isManager && (
        <p className="text-muted-foreground text-sm">
          No tienes permiso para acceder a esta sección.
        </p>
      )}
    </>
  );
}
