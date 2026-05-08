# CLAUDE.md — Academia Platón CRM

Este archivo da contexto a Claude Code sobre el proyecto. Manténlo corto, práctico y actualizado.

## 1. Qué es el proyecto

CRM interno para una academia. Cubre captación y seguimiento de **leads**, alta y ficha de **alumnos**, y a futuro **recibos** y **horarios/grupos**. Lo usará personal de la academia (admin, secretaría, profesorado), no es público.

**MVP (fase 1):**
- Gestión de leads: pipeline, estados, notas, conversión a alumno.
- Alta y ficha de alumnos: datos personales, tutores, asignación a grupo/curso.

**Fuera del MVP (fase 2+):** recibos/facturación, horarios y asistencia.

## 2. Stack y decisiones cerradas

| Capa | Decisión |
|---|---|
| Lenguaje | TypeScript en frontend y backend (estricto) |
| Frontend | React 19 + Vite |
| UI | Tailwind CSS + shadcn/ui |
| Estado/data | Context API + axios (sin TanStack Query, sin Redux) |
| Backend | Node + Express |
| ORM/DB | Prisma + MySQL |
| Repo | Monorepo con workspaces (`apps/frontend`, `apps/backend`, `packages/shared`) |
| Tests | Vitest (unit/integration) + Cypress (E2E) |
| Lint | ESLint (config flat) + Prettier |
| Validación | Zod (compartido frontend/backend vía `packages/shared`) |

### Decisiones pendientes
- **Auth**: aún por decidir (JWT en cookie httpOnly vs Auth0/Clerk vs sesiones). No empezar el módulo de auth hasta cerrarlo. Mientras tanto, dejar el frontend con un `AuthContext` mockeable.
- **Gestor de paquetes del monorepo**: pnpm vs npm workspaces. Recomendación: pnpm.

## 2.b Identidad de marca — Plató Centre d'estudis

**Logo:** SVG vectorial en `apps/frontend/src/assets/logo/plato-logo.svg`. Importar como URL (`import logo from '@/assets/logo/plato-logo.svg'`) y renderizar en `<img>`. Es horizontal (ratio ~3:1), pensado para header/navbar. Para favicon se necesitaría una versión cuadrada recortada (icono solo, sin wordmark) — pendiente.

**Tipografía:** Montserrat (instalada en `apps/frontend/src/assets/fonts/montserrat/`).

**Paleta oficial:**

| Rol | Color | Hex | RGB |
|---|---|---|---|
| Burgundy (primario) | borgoña | `#691a37` | 106 26 55 |
| Cream (acento) | crema | `#f4cea1` | 244 206 161 |
| Black | negro | `#000000` | 0 0 0 |
| White | blanco | `#ffffff` | 255 255 255 |

**Cómo usarla en código:**
- Tokens semánticos shadcn: `bg-primary` (borgoña), `bg-accent`/`bg-secondary` (crema), `text-foreground` (negro), `bg-background` (blanco), `ring-ring` (borgoña). Estos cambian automáticamente en dark mode.
- Utilidades de marca invariantes (mismo color en light/dark): `bg-brand-burgundy`, `bg-brand-cream`, `bg-brand-black`, `bg-brand-white` (y sus variantes `text-*`, `border-*`). Usar solo cuando se quiera el color literal de marca, no el rol semántico.
- En **dark mode** la borgoña se aclara a `oklch(0.55 0.18 5)` para mantener contraste sobre fondo negro. La crema se mantiene igual.
- No introducir colores fuera de paleta sin justificarlo. Para gráficos usar `--chart-1..5` (definidos en `index.css`).

## 3. Estructura del repositorio

```
academiaplaton/
├── apps/
│   ├── frontend/        # React + Vite + TS
│   │   ├── src/
│   │   │   ├── components/   # Reutilizables, dumb por defecto
│   │   │   ├── features/     # Módulos de negocio (leads, students, ...)
│   │   │   ├── pages/        # Rutas top-level
│   │   │   ├── contexts/     # AuthContext, ToastContext, ...
│   │   │   ├── hooks/        # Custom hooks
│   │   │   ├── lib/          # axios client, utils, zod schemas locales
│   │   │   └── types/        # Tipos UI-only (no contratos)
│   └── backend/         # Express + Prisma + TS
│       ├── src/
│       │   ├── modules/      # leads, students, ... (router + service + repo)
│       │   ├── middleware/
│       │   ├── lib/
│       │   └── prisma/
│       └── prisma/schema.prisma
└── packages/
    └── shared/          # Tipos + Zod schemas que cruzan front/back (DTOs)
```

## 4. Convenciones de código

### General
- TypeScript **strict: true**. Nada de `any` salvo justificación en comentario.
- Nombres en inglés en código (variables, funciones, tipos). Comentarios y commit messages en español están bien.
- Prefiere funciones puras y composición sobre clases.
- No introducir abstracciones hasta tener al menos 3 usos reales (regla del 3).

### Frontend
- **Componentes reutilizables**: viven en `components/`, no conocen lógica de negocio. Reciben props, emiten callbacks. Tipados con `interface Props`.
- **Componentes de feature**: viven en `features/<modulo>/components/`. Pueden consumir contextos y servicios.
- **Estado servidor**: hooks custom (`useLeads`, `useStudent(id)`) que envuelven `axios` y exponen `{ data, loading, error, refetch }`. No mezclar fetch dentro de componentes de UI.
- **Formularios**: react-hook-form + Zod (resolver). El schema vive en `packages/shared` si el DTO viaja al backend.
- **Estilos**: solo Tailwind. No CSS-in-JS, no `.module.css` salvo casos justificados. Variantes de componentes con `class-variance-authority` (cva), siguiendo patrón shadcn.
- **Accesibilidad**: labels asociados a inputs, focus visible, roles ARIA donde aplique. shadcn ya cumple gran parte.
- **Routing**: react-router-dom v6+. Rutas declaradas en `App.tsx` o `routes.tsx`.

### Backend
- Estructura por módulo: `modules/leads/leads.router.ts` → `leads.service.ts` → `leads.repo.ts`. El router solo valida (Zod) y llama al service. El service tiene la lógica. El repo habla con Prisma.
- Validación de input **siempre con Zod** en el router antes de llegar al service.
- Errores: clase `AppError` con `statusCode` + `code`. Middleware central convierte a respuesta JSON consistente `{ error: { code, message } }`.
- No exponer entidades Prisma directamente al cliente — mapear a DTOs definidos en `packages/shared`.
- Logs estructurados (pino o similar). Nunca loggear contraseñas, tokens ni datos personales completos.

### Shared (`packages/shared`)
- DTOs como tipos TS + schemas Zod parejos. Una sola fuente de verdad para contratos.
- No incluir lógica de negocio aquí — solo tipos, schemas, constantes.

## 5. Datos sensibles y LOPD

Esto va a contener datos de menores y tutores: tratarlo en serio.
- Datos personales mínimos (principio de minimización).
- Cifrado en tránsito (HTTPS obligatorio en producción).
- Passwords con bcrypt/argon2, nunca en texto plano.
- No commitear `.env` ni dumps de BD. `.env.example` sí.
- Logs no deben contener DNI, email completo ni teléfonos. Truncar/hashear si hace falta trazar.

## 6. Comandos

Desde la raíz del monorepo (asumiendo pnpm):

```bash
pnpm install                # instala todo el workspace
pnpm --filter frontend dev  # arranca frontend (Vite)
pnpm --filter backend dev   # arranca backend (tsx watch)
pnpm --filter backend prisma:migrate   # migraciones
pnpm test                   # vitest en todos los workspaces
pnpm e2e                    # cypress
pnpm lint                   # eslint
pnpm typecheck              # tsc --noEmit en todos los workspaces
```

## 7. Workflow esperado de Claude

- Al tocar el frontend, delega o invoca al agente **platonFront**.
- Al escribir/revisar tests o auditar seguridad, delega al agente **platonTest**.
- Antes de dar una tarea por completada en UI, levanta el dev server y verifica el flujo (golden path + un caso borde).
- Cualquier endpoint nuevo: schema Zod compartido en `packages/shared` antes de implementar router/service.
- No añadir dependencias sin justificar (peso, mantenimiento, alternativas nativas).

## 8. Estado actual del proyecto

- Monorepo montado: `apps/frontend` (Vite + React 19 + TSX + Tailwind v4 + shadcn/ui configurado), `apps/backend` (Express + Prisma + MySQL skeleton), `packages/shared` (Zod + DTOs skeleton).
- **Pendiente**: ejecutar `pnpm install` por primera vez (requiere activar pnpm vía `corepack enable` con permisos de admin), añadir componentes shadcn (`pnpm dlx shadcn@latest add button`), decidir auth, crear primera migración Prisma.
