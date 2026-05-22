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
} from 'lucide-react';
import type { UserRole } from '@/features/auth/types';

export interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: UserRole[];
}

export const MAIN_NAV_ITEMS: NavItem[] = [
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

export const SETTINGS_NAV_ITEMS: NavItem[] = [
  { to: '/admin/messages', label: 'Mensajes', icon: MessageSquare, roles: ['admin', 'center_manager'] },
  { to: '/admin/settings', label: 'Ajustes', icon: Settings, roles: ['admin', 'center_manager'] },
  { to: '/admin/help', label: 'Ayuda', icon: LifeBuoy },
];

export function filterByRole(items: NavItem[], role: UserRole): NavItem[] {
  return items.filter((item) => !item.roles || item.roles.includes(role));
}
