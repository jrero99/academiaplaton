import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import platoLogo from '@/assets/logo/plato-logo.svg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { MOCK_USERS } from '@/features/auth/data/mock-users';
import { MOCK_CENTERS } from '@/features/centers/data/mock-centers';
import { useRoleLabels } from '@/features/auth/lib/role-labels';
import type { AuthUser, UserRole } from '@/features/auth/types';
import { LanguageSwitcher } from '@/components/admin/LanguageSwitcher';

interface LocationState {
  from?: string;
}

const ROLE_ORDER: UserRole[] = ['admin', 'center_manager', 'teacher'];

export function LoginPage() {
  const { currentUser, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const roleLabelMap = useRoleLabels();
  const { t } = useTranslation();

  // Schema dependiente del idioma para que los mensajes salgan traducidos.
  const loginSchema = useMemo(
    () =>
      z.object({
        username: z.string().min(1, t('login.username_required')),
        password: z.string().min(1, t('login.password_required')),
      }),
    [t],
  );
  type LoginFormValues = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const centerNameById = useMemo(
    () => new Map(MOCK_CENTERS.map((c) => [c.id, c.name])),
    [],
  );

  // Agrupa mocks por su PRIMER rol para el panel demo.
  // Los usuarios con roles múltiples (adminprof, rteresasprof) aparecen en la
  // sección de su rol principal y muestran todos los roles en el subtítulo.
  const usersByRole = useMemo(() => {
    const groups: Record<UserRole, AuthUser[]> = {
      admin: [],
      center_manager: [],
      teacher: [],
    };
    for (const user of MOCK_USERS) {
      const primaryRole = user.roles[0];
      if (primaryRole) groups[primaryRole].push(user);
    }
    return groups;
  }, []);

  if (currentUser) {
    const from = (location.state as LocationState | null)?.from ?? '/admin';
    return <Navigate to={from} replace />;
  }

  function onSubmit(data: LoginFormValues) {
    const result = login(data.username, data.password);
    if (!result.ok) {
      setError(t(result.errorKey));
      return;
    }
    const from = (location.state as LocationState | null)?.from ?? '/admin';
    navigate(from, { replace: true });
  }

  function fillCredentials(user: AuthUser) {
    setValue('username', user.username, { shouldValidate: true });
    setValue('password', user.password, { shouldValidate: true });
    setError(null);
  }

  return (
    <main className="min-h-svh flex items-center justify-center bg-muted/40 px-4 py-8 sm:p-6">
      <div className="w-full max-w-4xl grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        {/* Form */}
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden self-start">
          <div className="flex items-center justify-between bg-white border-b py-8 px-6">
            <img src={platoLogo} alt={t('app.name')} className="h-14 w-auto" />
            <LanguageSwitcher />
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4 p-6"
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-username" className="text-sm font-medium">
                {t('login.username')}
              </label>
              <Input
                id="login-username"
                autoComplete="username"
                autoFocus
                aria-invalid={!!errors.username}
                {...register('username')}
              />
              {errors.username && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-sm font-medium">
                {t('login.password')}
              </label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              {errors.password && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="mt-2 h-11 sm:h-9">
              {t('login.submit')}
            </Button>
          </form>
        </div>

        {/* Cuentas demo */}
        <div className="rounded-lg border bg-card shadow-sm p-6">
          <h2 className="text-sm font-semibold">{t('login.demo_title')}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {t('login.demo_help_prefix')}
            <span className="font-mono">{t('login.demo_help_password')}</span>
            {t('login.demo_help_suffix')}
          </p>

          <div className="mt-4 space-y-5">
            {ROLE_ORDER.map((role) => {
              const users = usersByRole[role];
              if (users.length === 0) return null;
              return (
                <section key={role}>
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    {roleLabelMap[role]}
                  </h3>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {users.map((u) => {
                      const centerName = u.centerId ? centerNameById.get(u.centerId) : undefined;
                      const personName =
                        role === 'admin' ? null : `${u.firstName} ${u.lastName}`;
                      // Mostrar todos los roles si el usuario tiene más de uno
                      const rolesLabel =
                        u.roles.length > 1
                          ? u.roles.map((r) => roleLabelMap[r]).join(' + ')
                          : null;
                      return (
                        <li key={u.id}>
                          <button
                            type="button"
                            onClick={() => fillCredentials(u)}
                            className="w-full text-left rounded-md border border-input bg-background px-3 py-2 hover:bg-accent/40 hover:border-ring transition-colors"
                          >
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="font-mono text-sm font-medium">
                                {u.username}
                              </span>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {u.password}
                              </span>
                            </div>
                            {(personName || centerName || rolesLabel) && (
                              <div className="mt-0.5 text-xs text-muted-foreground truncate">
                                {rolesLabel && (
                                  <span className="font-medium text-foreground/70">{rolesLabel}</span>
                                )}
                                {rolesLabel && (personName || centerName) ? ' · ' : ''}
                                {personName}
                                {personName && centerName ? ' · ' : ''}
                                {centerName}
                              </div>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
