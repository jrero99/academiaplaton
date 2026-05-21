import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Estilo de select nativo alineado con shadcn Input.
export const filterSelectClass =
  'h-9 min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

// Mismo estilo para inputs de filtro de texto.
export const filterInputClass =
  'h-9 min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

interface FilterBarProps {
  children: ReactNode;
  hasActive: boolean;
  onClear: () => void;
}

export function FilterBar({ children, hasActive, onClear }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 px-3 py-2 mb-4">
      {children}
      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4" />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}

interface FilterFieldProps {
  label: string;
  children: ReactNode;
}

export function FilterField({ label, children }: FilterFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      {children}
    </div>
  );
}
