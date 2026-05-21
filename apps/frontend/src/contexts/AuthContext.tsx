import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser } from '@/features/auth/types';
import { MOCK_USERS } from '@/features/auth/data/mock-users';

const STORAGE_KEY = 'plato.auth.currentUserId';

interface AuthContextValue {
  currentUser: AuthUser | null;
  login: (username: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadInitialUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) return null;
  return MOCK_USERS.find((u) => u.id === id) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(loadInitialUser);

  useEffect(() => {
    if (currentUser) {
      window.localStorage.setItem(STORAGE_KEY, currentUser.id);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [currentUser]);

  const login = useCallback((username: string, password: string) => {
    const normalized = username.trim().toLowerCase();
    const user = MOCK_USERS.find((u) => u.username.toLowerCase() === normalized);
    if (!user || user.password !== password) {
      return { ok: false as const, error: 'Usuario o contraseña incorrectos' };
    }
    setCurrentUser(user);
    return { ok: true as const };
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ currentUser, login, logout }),
    [currentUser, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Helper más cómodo cuando solo necesitas leer el usuario y no es opcional.
// Lanza si no hay sesión: úsalo solo dentro de rutas protegidas.
export function useCurrentUser(): AuthUser {
  const { currentUser } = useAuth();
  if (!currentUser) throw new Error('useCurrentUser called without an active session');
  return currentUser;
}
