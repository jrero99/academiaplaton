import { Users, UserPlus, GraduationCap, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { MOCK_LEADS } from '@/features/leads/data/mock-leads';
import { MOCK_STUDENTS } from '@/features/students/data/mock-students';

export function AdminDashboardPage() {
  const newLeads = MOCK_LEADS.filter((l) => l.status === 'new').length;
  const inPipeline = MOCK_LEADS.filter((l) =>
    ['contacted', 'visit_scheduled', 'trial_class'].includes(l.status),
  ).length;
  const converted = MOCK_LEADS.filter((l) => l.status === 'converted').length;

  return (
    <>
      <PageHeader
        title="Dashboard"
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Dashboard' }]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat icon={UserPlus} label="Leads nuevos" value={newLeads} />
        <Stat icon={Users} label="En pipeline" value={inPipeline} />
        <Stat icon={TrendingUp} label="Convertidos" value={converted} />
        <Stat icon={GraduationCap} label="Alumnos activos" value={MOCK_STUDENTS.length} />
      </div>

      <div className="rounded-lg border bg-card shadow-sm p-6 text-sm text-muted-foreground">
        <p>Datos mock. Aquí irán los gráficos cuando conectemos al backend.</p>
      </div>
    </>
  );
}

interface StatProps {
  icon: typeof Users;
  label: string;
  value: number;
}

function Stat({ icon: Icon, label, value }: StatProps) {
  return (
    <div className="rounded-lg border bg-card shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-3xl font-semibold">{value}</p>
    </div>
  );
}
