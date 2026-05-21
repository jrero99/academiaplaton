# CLAUDE.md — Plató SaaS

Este archivo da contexto a Claude Code sobre el proyecto. Manténlo corto, práctico y actualizado.

## 1. Qué es el proyecto

**Plataforma SaaS multi-tenant** para gestión integral de academias. La empresa que la desarrolla es **Plató Centre d'estudis**; el primer cliente es Plató con sus distintas sedes, pero la plataforma se diseña desde día 1 para vender a otras academias en el futuro (white-label).

Cada academia/sede es un **tenant** (entidad `Organization`). Los datos están aislados por tenant. La interfaz se rebrandea por tenant (logo, colores, dominio).

### 1.a Módulos de la plataforma

| Módulo | Estado | Qué hace |
|---|---|---|
| **CRM** (`crm`) | MVP — fase 1 | Pipeline de leads, conversión a alumno, ficha de alumno + tutores |
| **Facturación** (`billing`) | Fase 2 | Recibos, cobros, exportación contable |
| **Horarios** (`scheduling`) | Fase 2 | Calendario de clases, grupos, profesorado, asistencia |
| **Comunicaciones** (`communications`) | Fase 2 | Email transaccional (vía n8n), WhatsApp Business (API oficial), eventualmente SMS |

Cada `Organization` tiene un campo `enabledModules: string[]` que decide qué módulos están activos. El backend rechaza requests a módulos no habilitados (403); el frontend oculta su menú.

### 1.b Modelo MVP (fase 1)

- Multi-tenancy básica: `Organization`, `User`, relación N:N `UserOrganization` con rol.
- Branding por tenant: logo, paleta de colores, nombre comercial.
- Módulo CRM: leads + alumnos (con tutores).
- Auth (pendiente decidir).
- Routing por slug de organización: `/o/{slug}/...` (path-based para MVP, valorar subdominios en prod).

## 2. Stack y decisiones cerradas

| Capa | Decisión |
|---|---|
| Lenguaje | TypeScript en frontend y backend (estricto) |
| Frontend | React 19 + Vite |
| UI | Tailwind v4 + shadcn/ui (CSS variables, themeable por tenant) |
| Estado/data | Context API + axios (sin TanStack Query, sin Redux) |
| Backend | Node + Express |
| ORM/DB | Prisma + MySQL |
| Repo | Monorepo con workspaces (`apps/frontend`, `apps/backend`, `packages/shared`) |
| Tests | Vitest (unit/integration) + Cypress (E2E) |
| Lint | ESLint (config flat) + Prettier |
| Validación | Zod (compartido frontend/backend vía `packages/shared`) |
| Email/marketing | **n8n** (webhooks salientes desde el backend; n8n maneja plantillas y envío) |
| WhatsApp | **WhatsApp Business Cloud API** de Meta (config por tenant) |

### 2.a Decisiones pendientes

- **Auth**: aún por decidir (JWT en cookie httpOnly vs Auth0/Clerk vs sesiones). En SaaS multi-tenant la auth implica resolver el tenant actual (por slug en URL, por header, o vía claim del JWT). No empezar el módulo de auth hasta cerrar esto. Mientras tanto, frontend con `AuthContext` + `OrganizationContext` mockeables.
- **Subdominios vs path-based en producción**: arrancamos con path-based (`/o/{slug}/...`). Cuando llegue prod, valorar wildcard subdomain (`{slug}.plato.app`).
- **Favicon**: pendiente generar versión cuadrada del logo (icono solo, sin wordmark).
- **n8n hosting**: ¿n8n cloud o self-hosted? La URL del webhook va por organización, así que el backend no necesita saberlo, pero a nivel infra hay que decidirlo.

## 2.b Multi-tenancy & white-label

**Modelo:**
- `Organization` (= academia/sede). Campos clave: `id`, `slug` (único, URL-safe), `name`, `branding` (logoUrl, primaryColor, accentColor), `enabledModules: string[]`.
- `User` puede pertenecer a varias `Organization` vía `UserOrganization` (con rol: `admin`, `staff`, `teacher`, etc.). Esto permite que un admin de Plató gestione varias sedes.
- Toda entidad de dominio (Lead, Student, Invoice, etc.) lleva `organizationId` como FK obligatoria. **Toda query de servicio filtra por `organizationId`** del request actual — no hay queries globales en el código de negocio.

**Resolución del tenant en cada request:**
- El frontend manda el slug en la URL (`/o/{slug}/...`).
- Middleware backend (`tenantContext`) lee el slug, valida que el user actual pertenezca a esa Organization, y deja `req.organization` disponible para el resto del handler. Si no pertenece → 403.

**Branding por tenant:**
- Frontend al cargar una org descarga su `branding` y aplica los colores como override de las CSS variables (`--primary`, `--accent`, etc.) en el root. El logo se muestra desde `branding.logoUrl`.
- La paleta de Plató (sección 2.c) es el default y el ejemplo. Otros tenants tendrán los suyos.
- shadcn ya está configurado con tokens semánticos sobre CSS vars: rebrandear un tenant es solo override de variables, no recompilar CSS.

**Módulos opcionales:**
- `enabledModules: string[]` en `Organization`. Valores válidos: `crm`, `billing`, `scheduling`, `communications`.
- Backend: middleware `requireModule('billing')` que devuelve 403 si la org no lo tiene.
- Frontend: hook `useEnabledModules()` que oculta items de menú y rutas no permitidas.

## 2.c Identidad de marca de referencia — Plató Centre d'estudis

(Esto es la marca del **primer tenant**, no de la plataforma. La plataforma SaaS no tiene marca propia todavía. Otros tenants override estos valores via `Organization.branding`.)

**Logo:** SVG vectorial en `apps/frontend/src/assets/logo/plato-logo.svg`. Uso temporal mientras solo Plató sea cliente. En multi-tenant real, el logo viene de `Organization.branding.logoUrl`.

**Tipografía:** Montserrat (instalada en `apps/frontend/src/assets/fonts/montserrat/`). De momento la usan todos los tenants; si en el futuro cada tenant elige su tipografía, habrá que añadir font-loading dinámico.

**Paleta oficial Plató:**

| Rol | Color | Hex | RGB |
|---|---|---|---|
| Burgundy (primario) | borgoña | `#691a37` | 106 26 55 |
| Cream (acento) | crema | `#f4cea1` | 244 206 161 |
| Black | negro | `#000000` | 0 0 0 |
| White | blanco | `#ffffff` | 255 255 255 |

**Cómo usarla:**
- Tokens semánticos shadcn: `bg-primary`, `bg-accent`, `text-foreground`, etc. Cambian con dark mode y con el branding del tenant cargado. **Estos son los que se deben usar en componentes.**
- Utilidades de marca invariantes (solo Plató, no cambian con tenant ni dark): `bg-brand-burgundy`, `bg-brand-cream`, `bg-brand-black`, `bg-brand-white`. Usar **solo** en pantallas explícitamente "powered by Plató" o assets propios de la plataforma — nunca en UI de aplicación porque rompería el rebranding por tenant.
- En **dark mode** la borgoña se aclara a `oklch(0.55 0.18 5)` para mantener contraste sobre fondo negro.

## 2.d Integraciones externas

### n8n (email / mailing / automatizaciones)
- Backend NO usa SDK de proveedores de email. En su lugar, **emite webhooks** a n8n y n8n se encarga de plantillas y envío.
- Cada `Organization` tiene su `n8nWebhookUrl` (configurable). Si está vacío, se usa la URL por defecto de la plataforma.
- Eventos emitidos: `lead.created`, `lead.status_changed`, `student.enrolled`, `invoice.issued`, etc. Payload JSON con la entidad + metadatos.
- Implementación: servicio `eventBus.emit(eventName, payload, organization)` en backend que hace POST al webhook con firma HMAC para validación.

### WhatsApp Business Cloud API (Meta)
- API oficial de Meta. Cada `Organization` que use el módulo `communications` tiene su `whatsappPhoneNumberId` y `whatsappAccessToken` (cifrado en BD).
- Módulo backend `whatsapp` con:
  - Endpoint para enviar plantillas aprobadas por Meta (texto + variables).
  - Webhook entrante para recibir mensajes de alumnos/familias y enrutarlos al CRM (vincular a Lead/Student por número).
- **No usar APIs no oficiales** (riesgo de bloqueo de cuenta y problemas de cumplimiento).

## 3. Estructura del repositorio

```
academiaplaton/
├── apps/
│   ├── frontend/        # React + Vite + TS + Tailwind v4 + shadcn
│   │   ├── src/
│   │   │   ├── components/   # Reutilizables (UI agnóstica de feature)
│   │   │   ├── components/ui/ # shadcn (button, input, dialog, ...)
│   │   │   ├── features/     # Módulos de negocio (leads, students, billing, ...)
│   │   │   ├── pages/        # Rutas top-level
│   │   │   ├── contexts/     # AuthContext, OrganizationContext, ToastContext
│   │   │   ├── hooks/        # useEnabledModules, useLeads, ...
│   │   │   ├── lib/          # axios client, utils (cn), helpers
│   │   │   └── assets/       # logo, fonts
│   └── backend/         # Express + Prisma + TS
│       ├── src/
│       │   ├── modules/      # crm/, billing/, scheduling/, communications/, organizations/
│       │   ├── middleware/   # tenantContext, requireModule, validate, error
│       │   ├── lib/          # prisma, AppError, logger, eventBus (n8n), whatsapp
│       │   └── config/
│       └── prisma/schema.prisma
└── packages/
    └── shared/          # DTOs + Zod schemas comunes
```

## 4. Convenciones de código

### General
- TypeScript **strict: true**. Nada de `any` salvo justificación en comentario.
- Nombres en inglés en código. Comentarios y commit messages en español están bien.
- Prefiere funciones puras y composición sobre clases.
- No introducir abstracciones hasta tener al menos 3 usos reales (regla del 3).

### Frontend
- **Componentes reutilizables** en `components/`: presentacionales, sin lógica de negocio.
- **Componentes de feature** en `features/<modulo>/components/`: pueden consumir contextos y servicios.
- **Estado servidor**: hooks custom (`useLeads`, `useStudent(id)`) que envuelven `axios`. No mezclar fetch en componentes de UI.
- **Formularios**: react-hook-form + Zod (resolver). Schema en `packages/shared` si el payload viaja al backend.
- **Estilos**: solo Tailwind. Tokens semánticos (`bg-primary`, `bg-card`, `text-muted-foreground`) — **nunca** colores literales `bg-brand-*` en componentes de aplicación (rompería el rebranding por tenant).
- **Routing**: react-router-dom v6+. Rutas anidadas bajo `/o/:slug/...` para inyectar el contexto de organización.
- **Tenant context**: hook `useOrganization()` para leer la org actual. Todo fetch debe ir scoped por la org actual (el axios interceptor inyecta el slug en URLs/headers).

### Backend
- Estructura por módulo: `modules/<feature>/<feature>.router.ts` → `<feature>.service.ts` → `<feature>.repo.ts`.
- **Toda query de dominio filtra por `organizationId`**. El service recibe la `organization` desde el middleware `tenantContext` y la pasa al repo. Repos nunca exponen métodos sin scope de tenant.
- Validación de input **siempre con Zod** en el router antes del service.
- Errores: `AppError` con `statusCode` + `code`. Middleware central serializa a `{ error: { code, message } }`.
- No exponer entidades Prisma — mapear a DTOs en `packages/shared`.
- Logs estructurados (pino) con redacción de PII y secretos (passwords, tokens, etc.).
- Eventos de dominio (lead creado, alumno alta, etc.) → `eventBus.emit()` que llega a n8n.

### Shared (`packages/shared`)
- DTOs como tipos TS + schemas Zod parejos. Una sola fuente de verdad para contratos.
- No incluir lógica de negocio aquí.

## 5. Datos sensibles y LOPD

- Datos de menores y tutores → minimización.
- Cifrado en tránsito (HTTPS obligatorio en producción).
- Passwords con bcrypt/argon2, nunca en texto plano.
- **Tokens de WhatsApp y n8n webhook URLs**: cifrar en BD (no en plano). Nunca devolverlos en respuestas API.
- No commitear `.env`. `.env.example` sí.
- Logs no contienen DNI, email completo, teléfonos, ni tokens. Redacted vía pino.
- Aislamiento por tenant: una query mal escrita que olvide el `organizationId` es un leak entre clientes. Tests obligatorios para esto en cada módulo nuevo (ver agente platonTest).

## 6. Comandos

Desde la raíz del monorepo:

```bash
pnpm install                       # instala todo el workspace
pnpm dev:frontend                  # arranca frontend (Vite, http://localhost:5173)
pnpm dev:backend                   # arranca backend (tsx watch, http://localhost:3000)
pnpm prisma:migrate                # crea/aplica migraciones (en backend)
pnpm prisma:studio                 # GUI de la BD
pnpm test                          # vitest en todos los workspaces
pnpm e2e                           # cypress
pnpm lint                          # eslint
pnpm typecheck                     # tsc --noEmit
```

## 7. Workflow obligatorio de agentes

Reglas concretas sobre cuándo invocar cada agente. Aplican salvo que el usuario diga lo contrario explícitamente. **Ante la duda, invocar.**

### 7.a Briefings — primer paso de cualquier agente

Cada agente lee sus briefings en `.claude/agent-state/` antes de tocar nada:

- `briefing-front.md` — TODO/FIXME/HACK/XXX nuevos en `apps/frontend` + `packages/shared` desde el último briefing.
- `briefing-back.md` — idem para `apps/backend` + `packages/shared`.
- `briefing-domain.md` — commits recientes que tocan `apps/backend/prisma/schema.prisma`, `packages/shared/**` o `CLAUDE.md`. **Lo leen TODOS los agentes** (front, back, test, sec, qa) — y el flujo principal también — para no trabajar con un modelo de negocio desactualizado.

Los briefings se regeneran al arrancar `pnpm dev:frontend` / `pnpm dev:backend`. Forzar regeneración manual: `pnpm brief:front` / `pnpm brief:back` / `pnpm brief:domain`.

### 7.b Cuándo invocar a cada agente

| Tipo de cambio | Agente |
|---|---|
| Componente, página, formulario, hook, contexto, layout o navegación en `apps/frontend/` | `platonFront` |
| Endpoint, service, repo, schema Prisma, migración, evento n8n o middleware en `apps/backend/` | `platonBack` |
| Cambio en `packages/shared/` (DTOs, Zod, errores) | Quien implemente la capa que lo usa primero (front o back) + actualización de briefing-domain |
| Antes de declarar una UI "hecha" | `platonSecFront` para revisión de seguridad cliente |
| Antes de declarar una feature "hecha" | `platonQA` para producir matriz de casos a verificar |
| Tras `platonQA`, escribir y ejecutar los tests | `platonTest` (Vitest unit/integration + Cypress E2E + audit OWASP backend) |

**Excepciones razonables (puedo hacerlo yo directamente)**:
- Ediciones < 20 líneas en un único fichero sin cambio de patrón.
- Fixes de typo, lint o formato.
- Mocks puntuales y demos UI throwaway.

### 7.c Reglas no negociables

- Schema Zod compartido en `packages/shared` SIEMPRE antes de implementar router/service. `platonBack` bloquea PRs que no lo cumplan.
- Toda query de dominio filtra por `organizationId`. `platonBack` y `platonTest` lo verifican.
- No añadir dependencias sin justificar (peso, mantenimiento, alternativas nativas).
- Antes de declarar UI hecha: arrancar dev server y verificar al menos golden path + un caso borde. Si no se puede abrir navegador, decirlo explícitamente.
- Después de mergear cambios que tocan schema, shared o CLAUDE.md: ejecutar `pnpm brief:domain` (o esperar al próximo `pnpm dev:*`) para que el siguiente trabajo de cualquier agente arranque con el modelo actualizado.

## 8. Estado actual del proyecto

- Monorepo montado e instalado (pnpm 9.12.0).
- `apps/frontend` arrancable (`pnpm dev:frontend`): Vite + React 19 + TS + Tailwind v4 + shadcn (configurado, sin componentes añadidos aún) + Montserrat + logo de Plató + paleta en CSS vars.
- `apps/backend` skeleton: Express + Prisma + MySQL + módulos `leads` y `students` (sin tenant scoping todavía).
- `packages/shared`: DTOs + Zod para Leads y Students (sin `organizationId` todavía).
- **Pendiente inmediato**:
  - Schema Prisma: añadir `Organization`, `User`, `UserOrganization`, y FK `organizationId` en Lead/Student.
  - Shared DTOs: añadir `OrganizationDto`, `organizationId` en Lead/Student.
  - Decidir auth (bloquea el resto del backend SaaS).
  - Crear primera migración Prisma cuando MySQL esté listo localmente.
  - Backend: middleware `tenantContext` y `requireModule`.
  - Frontend: `OrganizationContext`, hook `useOrganization`, routing `/o/:slug/...`.
- **Pendiente medio**:
  - Componentes shadcn iniciales (`pnpm dlx shadcn@latest add button input form dialog table`).
  - Layout principal con sidebar (módulos visibles según `enabledModules`).
  - Servicio `eventBus` que emita webhooks a n8n.
  - Módulo `whatsapp` (envío de templates + webhook entrante).
  - Favicon cuadrado.
