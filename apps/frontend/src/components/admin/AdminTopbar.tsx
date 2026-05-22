import { useState } from 'react';
import { Bell, Mail, ChevronDown, LogOut, Menu } from 'lucide-react';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/features/auth/lib/role-labels';
import { AdminNavGroup } from './AdminSidebar';
import { MAIN_NAV_ITEMS, SETTINGS_NAV_ITEMS, filterByRole } from './AdminNavItems';
import platoLogo from '@/assets/logo/plato-logo.svg';

function getInitials(firstName: string, lastName: string): string {
  const f = firstName.trim().charAt(0);
  const l = lastName.trim().charAt(0);
  return `${f}${l}`.toUpperCase() || '?';
}

export function AdminTopbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!currentUser) return null;

  const fullName = `${currentUser.firstName} ${currentUser.lastName}`.trim();
  const initials = getInitials(currentUser.firstName, currentUser.lastName);
  const subline = `${ROLE_LABELS[currentUser.role]} · @${currentUser.username}`;

  const mainItems = filterByRole(MAIN_NAV_ITEMS, currentUser.role);
  const settingsItems = filterByRole(SETTINGS_NAV_ITEMS, currentUser.role);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <header className="h-14 lg:h-16 shrink-0 flex items-center justify-between gap-2 border-b border-border bg-background px-4 sm:px-6">
        {/* Hamburger — solo visible bajo lg */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Abrir menú"
          className="lg:hidden min-h-11 min-w-11"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Spacer para empujar los controles a la derecha en desktop
            (en desktop el sidebar ocupa la izquierda, no hace falta) */}
        <div className="flex-1 lg:hidden" />

        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" aria-label="Notificaciones" className="min-h-11 min-w-11">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Mensajes" className="min-h-11 min-w-11">
            <Mail className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ml-1 flex items-center gap-2 rounded-full p-1 pr-2 sm:pr-3 hover:bg-muted transition"
              >
                <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
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
        </div>
      </header>

      {/* Drawer de navegación móvil */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-zinc-950 text-zinc-300 border-r border-zinc-900 flex flex-col">
          <SheetHeader className="h-16 flex-row items-center px-6 bg-white shrink-0 space-y-0">
            <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
            <img src={platoLogo} alt="Plató" className="h-10 w-auto" />
          </SheetHeader>

          <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
            <AdminNavGroup items={mainItems} onNavClick={() => setDrawerOpen(false)} />
            {settingsItems.length > 0 && (
              <div>
                <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  Configuración
                </p>
                <AdminNavGroup items={settingsItems} onNavClick={() => setDrawerOpen(false)} />
              </div>
            )}
          </nav>

          <div className="border-t border-zinc-900 p-3 space-y-2 shrink-0">
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-white truncate">{fullName}</p>
              <p className="text-xs text-zinc-500 truncate">{subline}</p>
            </div>
            <button
              type="button"
              onClick={() => { setDrawerOpen(false); handleLogout(); }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
