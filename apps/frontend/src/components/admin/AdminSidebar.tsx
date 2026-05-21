import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UserPlus,
  GraduationCap,
  UserCog,
  Users,
  CalendarDays,
  Building2,
  Receipt,
  BarChart3,
  MessageSquare,
  Settings,
  LifeBuoy,
  LogOut,
} from 'lucide-react';
import platoLogo from '@/assets/logo/plato-logo.svg';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/features/auth/types';
import { ROLE_LABELS } from '@/features/auth/lib/role-labels';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  // Roles que pueden ver esta entrada. Si undefined, todos los logueados.
  roles?: UserRole[];
}

const MAIN_ITEMS: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'center_manager'] },
  { to: '/admin/leads', label: 'Leads', icon: UserPlus, roles: ['admin', 'center_manager'] },
  { to: '/admin/students', label: 'Alumnos', icon: GraduationCap, roles: ['admin', 'center_manager'] },
  { to: '/admin/teachers', label: 'Profesores', icon: UserCog, roles: ['admin', 'center_manager'] },
  { to: '/admin/groups', label: 'Grupos', icon: Users, roles: ['admin', 'center_manager'] },
  { to: '/admin/calendar', label: 'Calendario', icon: CalendarDays },
  { to: '/admin/centers', label: 'Academias', icon: Building2, roles: ['admin'] },
  { to: '/admin/invoices', label: 'Recibos', icon: Receipt, roles: ['admin', 'center_manager'] },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'center_manager'] },
];

const SETTINGS_ITEMS: NavItem[] = [
  { to: '/admin/messages', label: 'Mensajes', icon: MessageSquare, roles: ['admin', 'center_manager'] },
  { to: '/admin/settings', label: 'Ajustes', icon: Settings, roles: ['admin', 'center_manager'] },
  { to: '/admin/help', label: 'Ayuda', icon: LifeBuoy },
];

function filterByRole(items: NavItem[], role: UserRole): NavItem[] {
  return items.filter((item) => !item.roles || item.roles.includes(role));
}

export function AdminSidebar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const mainItems = filterByRole(MAIN_ITEMS, currentUser.role);
  const settingsItems = filterByRole(SETTINGS_ITEMS, currentUser.role);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-zinc-950 text-zinc-300 border-r border-zinc-900">
      <div className="h-20 flex items-center px-6 bg-white">
        <img src={platoLogo} alt="Plató" className="h-10 w-auto" />
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
        <SidebarGroup items={mainItems} />
        {settingsItems.length > 0 && (
          <div>
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Configuración
            </p>
            <SidebarGroup items={settingsItems} />
          </div>
        )}
      </nav>

      <div className="border-t border-zinc-900 p-3 space-y-2">
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-white truncate">
            {currentUser.firstName} {currentUser.lastName}
          </p>
          <p className="text-xs text-zinc-500 truncate">
            {ROLE_LABELS[currentUser.role]} · @{currentUser.username}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}

function SidebarGroup({ items }: { items: NavItem[] }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.to === '/admin'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
