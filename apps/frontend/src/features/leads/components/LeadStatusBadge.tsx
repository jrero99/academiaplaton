import type { LeadStatus } from '@academiaplaton/shared';
import { cn } from '@/lib/utils';

interface Props {
  status: LeadStatus;
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  visit_scheduled: 'Visita',
  trial_class: 'Prueba',
  converted: 'Convertido',
  lost: 'Perdido',
};

const STATUS_DOT: Record<LeadStatus, string> = {
  new: 'bg-blue-500',
  contacted: 'bg-amber-500',
  visit_scheduled: 'bg-violet-500',
  trial_class: 'bg-cyan-500',
  converted: 'bg-emerald-500',
  lost: 'bg-rose-500',
};

export function LeadStatusBadge({ status }: Props) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className={cn('h-2 w-2 rounded-full', STATUS_DOT[status])} />
      <span>{STATUS_LABELS[status]}</span>
    </span>
  );
}
