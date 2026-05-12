import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UserPlus,
  GraduationCap,
  BarChart3,
  MessageSquare,
  Settings,
  LifeBuoy,
} from 'lucide-react';
import platoLogo from '@/assets/logo/plato-logo.svg';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const MAIN_ITEMS: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/leads', label: 'Leads', icon: UserPlus },
  { to: '/admin/students', label: 'Alumnos', icon: GraduationCap },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

const SETTINGS_ITEMS: NavItem[] = [
  { to: '/admin/messages', label: 'Mensajes', icon: MessageSquare },
  { to: '/admin/settings', label: 'Ajustes', icon: Settings },
  { to: '/admin/help', label: 'Ayuda', icon: LifeBuoy },
];

export function AdminSidebar() {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-zinc-950 text-zinc-300 border-r border-zinc-900">
      <div className="h-20 flex items-center px-6 bg-white">
        <img src={platoLogo} alt="Plató" className="h-10 w-auto" />
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
        <SidebarGroup items={MAIN_ITEMS} />
        <div>
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Configuración
          </p>
          <SidebarGroup items={SETTINGS_ITEMS} />
        </div>
      </nav>
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
