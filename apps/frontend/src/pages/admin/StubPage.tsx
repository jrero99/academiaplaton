import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';

interface Props {
  title: string;
}

export function StubPage({ title }: Props) {
  return (
    <>
      <PageHeader
        title={title}
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: title }]}
      />
      <div className="rounded-lg border bg-card shadow-sm p-12 flex flex-col items-center justify-center text-center gap-3">
        <Construction className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">{title}</p>
        <p className="text-sm text-muted-foreground max-w-md">
          Esta sección aún no está implementada. Cuando definamos el flujo, la montamos.
        </p>
      </div>
    </>
  );
}
