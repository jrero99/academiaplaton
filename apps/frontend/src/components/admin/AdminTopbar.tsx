import { Bell, Mail, ChevronDown, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/features/auth/lib/role-labels';

function getInitials(firstName: string, lastName: string): string {
  const f = firstName.trim().charAt(0);
  const l = lastName.trim().charAt(0);
  return `${f}${l}`.toUpperCase() || '?';
}

export function AdminTopbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const fullName = `${currentUser.firstName} ${currentUser.lastName}`.trim();
  const initials = getInitials(currentUser.firstName, currentUser.lastName);
  const subline = `${ROLE_LABELS[currentUser.role]} · @${currentUser.username}`;

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="h-20 shrink-0 flex items-center justify-end gap-2 border-b border-border bg-background px-6">
      <Button variant="ghost" size="icon" aria-label="Notificaciones" className="relative">
        <Bell className="h-5 w-5" />
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
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm font-medium">{fullName}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium truncate">{fullName}</p>
            <p className="text-xs text-muted-foreground truncate">{subline}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Mi perfil</DropdownMenuItem>
          <DropdownMenuItem>Preferencias</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onSelect={handleLogout}>
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
