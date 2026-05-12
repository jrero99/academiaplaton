import { Bell, Mail, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const MOCK_USER = {
  name: 'Javier Redondo',
  email: 'javier.redondo@platocrm.cat',
  initials: 'JR',
  hasUnreadNotifications: true,
};

export function AdminTopbar() {
  return (
    <header className="h-20 shrink-0 flex items-center justify-end gap-2 border-b border-border bg-background px-6">
      <Button variant="ghost" size="icon" aria-label="Notificaciones" className="relative">
        <Bell className="h-5 w-5" />
        {MOCK_USER.hasUnreadNotifications && (
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
        )}
      </Button>
      <Button variant="ghost" size="icon" aria-label="Mensajes">
        <Mail className="h-5 w-5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="ml-2 flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-muted transition"
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {MOCK_USER.initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm font-medium">{MOCK_USER.name}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{MOCK_USER.name}</p>
            <p className="text-xs text-muted-foreground">{MOCK_USER.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Mi perfil</DropdownMenuItem>
          <DropdownMenuItem>Preferencias</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive">Cerrar sesión</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
