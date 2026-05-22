import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Language } from '@/i18n/dictionaries';

// Senyera: 9 franges horitzontals (5 grogues + 4 vermelles) alternant des de
// dalt amb groc. La proporció real és 2:3 però la dibuixem 3:2 (24×16) per
// que encaixi en el botó del topbar; el rectangle redondejat tapa una mica
// les puntes per donar-li acabat tipus chip.
function FlagCatalan({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 16"
      role="img"
      aria-hidden="true"
      className={cn('h-4 w-6 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] overflow-hidden', className)}
    >
      {/* fondo amarillo */}
      <rect width="24" height="16" fill="#FCDD09" />
      {/* 4 franges vermelles, cada parell de stripes en una banda */}
      <g fill="#DA121A">
        <rect x="0" y="2" width="24" height="1.5" />
        <rect x="0" y="5.5" width="24" height="1.5" />
        <rect x="0" y="9" width="24" height="1.5" />
        <rect x="0" y="12.5" width="24" height="1.5" />
      </g>
    </svg>
  );
}

// Bandera española: tres franjas horizontales rojo (1/4) - amarillo (1/2) - rojo (1/4).
// No incluimos el escudo: en este tamaño se vería borroso.
function FlagSpain({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 16"
      role="img"
      aria-hidden="true"
      className={cn('h-4 w-6 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] overflow-hidden', className)}
    >
      <rect x="0" y="0" width="24" height="4" fill="#AA151B" />
      <rect x="0" y="4" width="24" height="8" fill="#F1BF00" />
      <rect x="0" y="12" width="24" height="4" fill="#AA151B" />
    </svg>
  );
}

function FlagFor({ language, className }: { language: Language; className?: string }) {
  if (language === 'ca') return <FlagCatalan className={className} />;
  return <FlagSpain className={className} />;
}

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('language.switch_aria')}
          className="min-h-11 min-w-11"
        >
          <FlagFor language={language} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => setLanguage('ca')}>
          <FlagCatalan />
          <span className="flex-1">{t('language.ca')}</span>
          {language === 'ca' && <Check className="h-4 w-4 text-muted-foreground" />}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setLanguage('es')}>
          <FlagSpain />
          <span className="flex-1">{t('language.es')}</span>
          {language === 'es' && <Check className="h-4 w-4 text-muted-foreground" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
