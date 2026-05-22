import {
  LayoutDashboard,
  UserPlus,
  GraduationCap,
  UserCog,
  Users,
  CalendarDays,
  Clock,
  Building2,
  Receipt,
  BarChart3,
  MessageSquare,
  Settings,
  LifeBuoy,
  BookOpen,
} from 'lucide-react';
import type { AuthUser, UserRole } from '@/features/auth/types';
import { userHasRole, userCanActAsTeacher } from '@/features/auth/lib/permissions';

export interface NavItem {
  to: string;
  // Clave i18n. El componente que renderice el nav debe traducir `labelKey` con t().
  labelKey: string;
  icon: typeof LayoutDashboard;
  // Si se define, el ítem solo se muestra si el usuario tiene AL MENOS uno de estos roles.
  roles?: UserRole[];
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { to: '/admin', labelKey: 'nav.dashboard', icon: LayoutDashboard, roles: ['admin', 'center_manager'] },
  { to: '/admin/leads', labelKey: 'nav.leads', icon: UserPlus, roles: ['admin', 'center_manager'] },
  { to: '/admin/students', labelKey: 'nav.students', icon: GraduationCap, roles: ['admin', 'center_manager'] },
  { to: '/admin/teachers', labelKey: 'nav.teachers', icon: UserCog, roles: ['admin', 'center_manager'] },
  { to: '/admin/groups', labelKey: 'nav.groups', icon: Users, roles: ['admin', 'center_manager'] },
  { to: '/admin/calendar', labelKey: 'nav.calendar', icon: CalendarDays },
  { to: '/admin/clocking', labelKey: 'nav.clocking', icon: Clock },
  { to: '/admin/centers', labelKey: 'nav.centers', icon: Building2, roles: ['admin'] },
  { to: '/admin/invoices', labelKey: 'nav.invoices', icon: Receipt, roles: ['admin', 'center_manager'] },
  { to: '/admin/analytics', labelKey: 'nav.analytics', icon: BarChart3, roles: ['admin', 'center_manager'] },
];

export const SETTINGS_NAV_ITEMS: NavItem[] = [
  { to: '/admin/messages', labelKey: 'nav.messages', icon: MessageSquare, roles: ['admin', 'center_manager'] },
  { to: '/admin/settings', labelKey: 'nav.settings', icon: Settings, roles: ['admin', 'center_manager'] },
  { to: '/admin/help', labelKey: 'nav.help', icon: LifeBuoy },
];

/**
 * Filtra los items de nav según el AuthUser completo.
 * - Sin `roles` en el item → siempre visible.
 * - Con `roles` → visible si el usuario tiene al menos uno de esos roles.
 * - Admin siempre pasa (jerarquía).
 */
export function filterNavItems(items: NavItem[], user: AuthUser): NavItem[] {
  return items.filter((item) => {
    if (!item.roles) return true;
    if (userHasRole(user, 'admin')) return true;
    return item.roles.some((r) => userHasRole(user, r));
  });
}

/**
 * Devuelve el item "Mi agenda" si el usuario puede actuar como profesor
 * y NO es teacher puro (el teacher puro ya ve su Calendario de forma natural).
 * Insertar en la sección principal del sidebar, tras "Calendario".
 */
export function getAgendaItem(user: AuthUser): NavItem | null {
  const isOnlyTeacher =
    user.roles.length === 1 && userHasRole(user, 'teacher');
  if (isOnlyTeacher) return null;
  if (!userCanActAsTeacher(user)) return null;
  return { to: '/admin/calendar', labelKey: 'nav.my_agenda', icon: BookOpen };
}

// Alias de compatibilidad para callers que pasaban un UserRole singular.
// Preferir filterNavItems(items, user) en código nuevo.
export function filterByRole(items: NavItem[], user: AuthUser): NavItem[] {
  return filterNavItems(items, user);
}
