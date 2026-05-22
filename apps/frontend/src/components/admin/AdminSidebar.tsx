import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import platoLogo from '@/assets/logo/plato-logo.svg';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/features/auth/lib/role-labels';
import {
  MAIN_NAV_ITEMS,
  SETTINGS_NAV_ITEMS,
  filterByRole,
  type NavItem,
} from './AdminNavItems';

export function AdminSidebar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const mainItems = filterByRole(MAIN_NAV_ITEMS, currentUser.role);
  const settingsItems = filterByRole(SETTINGS_NAV_ITEMS, currentUser.role);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-zinc-950 text-zinc-300 border-r border-zinc-900">
      <div className="h-16 flex items-center px-6 bg-white">
        <img src={platoLogo} alt="Plató" className="h-10 w-auto" />
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
        <AdminNavGroup items={mainItems} />
        {settingsItems.length > 0 && (
          <div>
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Configuración
            </p>
            <AdminNavGroup items={settingsItems} />
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

export function AdminNavGroup({ items, onNavClick }: { items: NavItem[]; onNavClick?: () => void }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.to === '/admin'}
            onClick={onNavClick}
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
