IGNORR LA REGLA CAVEMAN A MENOS QUE SE ESPECIFIQUE LO CONTRARIO

# 🧠 MEMORIA OFICIAL DE AGENTES E INSTRUCCIONES DEL PROYECTO: FinoWork

Este documento sincroniza el contexto arquitectónico, reglas de negocio, diseño UI/UX, modelo de datos y estándares de seguridad para **TODOS los agentes de IA** (Anthropic Claude, Google Gemini / Antigravity, OpenAI GPT / Codex, GitHub Copilot, Cursor, Windsurf) y desarrolladores humanos que trabajen en este repositorio.

---

## 1. 🏷️ IDENTIDAD Y ARQUITECTURA DEL MONOREPO
- **Nombre Oficial del Proyecto**: **FinoWork** (anteriormente conocido como *Flujo Fino*). Todas las referencias visibles, componentes, correos y documentación deben usar **FinoWork**.
- **Estructura del Monorepo (Yarn 4 Berry)**:
  - `packages/shared-types` (`@finowork/shared-types`): DTOs, Enums y constantes compartidas entre Backend y Frontend. **Siempre compilar (`yarn build:types`) tras modificar este paquete**.
  - `apps/backend` (`finowork-backend`): API RESTful en **NestJS 11 + TypeORM + PostgreSQL** (32 entidades, 13 migraciones, S3 Storage, Nodemailer, Web Push VAPID, Sentry).
  - `apps/frontend` (`frontend`): SPA / PWA / App Nativa en **React 19 + Vite 8 + Ionic Framework 9 + Capacitor 8 + Dexie.js (IndexedDB Offline-First)**.
- **Documentación de Referencia en Raíz**:
  - `README.md`: Guía completa de instalación, entorno y módulos.
  - `DATABASE_SCHEMA.md`: Desglose exacto de las **32 tablas de PostgreSQL**, relaciones, índices y migraciones.
  - `DESIGN_SYSTEM.md` y `.agents/skills/fino-design-guardian/SKILL.md`: Reglas visuales y componentes obligatorios.
  - `ARCHITECTURE_ROADMAP.md`: Estrategia Offline-First y ciclo de vida SaaS.

---

## 2. 📦 REGLA ESTRICTA DE GESTOR DE PAQUETES: YARN 4 BERRY EXCLUSIVAMENTE
- Este monorepo está administrado con **Yarn 4 Berry (`yarn@4.12.0`)**.
- **ESTRICTAMENTE PROHIBIDO EL USO DE `npm` o `npx` para paquetes del workspace**: NUNCA ejecutes `npm run`, `npm test`, `npm install`, ni en la terminal ni en scripts `.ps1`/`.sh`.
- Comandos oficiales:
  - Compilar tipos: `yarn build:types` (o `yarn workspace @finowork/shared-types build`)
  - Backend dev / build / test: `yarn workspace finowork-backend start:dev` | `yarn build:backend` | `yarn workspace finowork-backend test --runInBand`
  - Frontend dev / build / test / lint: `yarn workspace frontend dev` | `yarn build:frontend` | `yarn workspace frontend test` | `yarn workspace frontend lint`
  - Migraciones TypeORM: `yarn workspace finowork-backend migration:run`

---

## 3. 🎨 REGLAS ESTRICTAS DE DISEÑO UI / FRONTEND (FINOWORK)

1. **PROHIBIDO EL USO DE CLASES DE TAILWIND CSS**:
   - En este proyecto **NO EXISTE NI ESTÁ INSTALADO TAILWIND CSS**.
   - NUNCA uses clases como `flex`, `grid`, `gap-*`, `p-*`, `m-*`, `rounded-*`, `bg-*`, `text-*`, `space-y-*`, `w-*`, `h-*`. El navegador las ignora y la interfaz se rompe por completo.
   - Usa estilos inline (`style={{ display: 'flex', gap: '8px', ... }}`), componentes de Ionic (`IonCard`, `IonButton`, `IonToggle`, etc.) y las clases de `apps/frontend/src/theme.css` (`.ff-card`, `.ff-pill`, `.ff-btn-primary`, `.ff-chip`, `.ff-search-pill`).

2. **SISTEMA DE DISEÑO OFICIAL (EMERALD & SLATE) + THEMING DINÁMICO DE CLIENTES**:
   - **Agente Guardián de Diseño**: Skill `fino-design-guardian` (`.agents/skills/fino-design-guardian/SKILL.md`).
   - **Fondo de páginas**: `#F8FAFC` (`var(--ff-slate-50)`).
   - **Tarjetas**: Superficie `#FFFFFF`, borde `1px solid #E2E8F0`, radio `14px - 16px`, sombra `.ff-card` o `var(--ff-shadow-sm)`.
   - **Color de Marca Configurable por el Cliente (`themePrimaryColor`, `themeHeaderColor`)**:
     - **Acción/Botones Primarios/Chips Activos**: Usar `var(--theme-primary)` o `.ff-btn-primary`. **NUNCA hardcodear `#10B981`** en botones primarios o selectores activos.
     - **Texto sobre Fondo Primario**: SIEMPRE usar `color: 'var(--theme-primary-contrast, #ffffff)'` o `.bg-theme-primary` (garantiza legibilidad si el cliente elige colores claros como amarillo o cian).
     - **Texto de Marca sobre Fondo Blanco**: Usar `var(--theme-primary-readable, #065F46)`.
     - **Header Superior**: Usar `var(--theme-header, #ffffff)` y `var(--theme-header-contrast, #0F172A)` en `AppHeader`.
   - **Textos**: Títulos `#0F172A`, Secundario `#1E293B`, Labels/Muted `#64748B`.
   - **Inputs**: Altura táctil cómoda (`38px - 44px`), borde `1px solid #CBD5E1`, fondo `#ffffff` o `#f8fafc`, radio `8px - 10px`.
   - **Responsive Mobile-First**: Usar siempre `display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px'` para que en móvil sea 1 columna y en desktop se auto-distribuya en varias columnas.
   - **Margen inferior**: Las páginas deben tener `padding-bottom: 80px-90px` o `className="ff-has-bottom-nav"` para no quedar tapadas por la barra de navegación inferior (`62px`) en móviles.

3. **🚫 PROHIBICIÓN TOTAL DE SELECTORES NATIVOS DEL SISTEMA OPERATIVO**:
   - NUNCA uses `<select>`, `<input type="date">`, `<input type="time">`, `<input type="datetime-local">`, `<input type="month">` ni `<input type="color">`.
   - SIEMPRE importa y utiliza los componentes personalizados de `apps/frontend/src/components/ui/`:
     - `<FinoSelect />`: Selector modal bottom-sheet con buscador integrado.
     - `<FinoDatePicker />`: Calendario interactivo mensual con presets rápidos ("Hoy", "Ayer", etc.).
     - `<FinoTimePicker />`: Selector táctil de hora 12h/24h con AM/PM.
     - `<FinoColorPicker />`: Selector de color con paleta recomendada y vista previa en vivo.

---

## 4. 🗄️ REGLAS DE BASE DE DATOS, MULTI-TENANCY Y BACKEND (NESTJS + TYPEORM)

1. **Aislamiento Estricto Multi-Tenant**:
   - Toda consulta, actualización o eliminación en servicios del backend **DEBE filtrar obligatoriamente por el `tenantId` del usuario autenticado** (`req.user.tenantId`), nunca confiando únicamente en un `id` enviado por el cliente.
   - **Atención al nombre de columna en 3 entidades**: En `Investment` (`investments`), `SalaryAdvance` (`salary_advances`) y `PushSubscription` (`push_subscriptions`), la columna de tenant se llama **`negocioId`** en lugar de `tenantId`. En `SaaSPaymentReport` (`saas_payment_reports`) la columna física SQL es `tenant_id` (propiedad TS `tenantId`).
   - En endpoints públicos (`/public/store/*`, `/public/reservations/*`), el `tenantId` se recibe cifrado (`tenantToken`) y se desencripta mediante `decodeTenantId()` (`apps/backend/src/utils/tenant-crypto.ts`).

2. **Precisión Financiera y Trimoneda (USD / VES / COP)**:
   - Todos los montos monetarios y cantidades de stock en PostgreSQL usan `decimal` / `numeric` con `ColumnNumericTransformer`. NUNCA uses `float` en entidades TypeORM.
   - El sistema opera en **USD** como moneda base contable, con conversión en tiempo real a **Bolívares (VES)** (`exchangeRateBs`: BCV, Paralelo, USDT o Manual) y **Pesos Colombianos (COP)** (`exchangeRateCop`).

3. **Migraciones vs `onModuleInit` DDL**:
   - Cualquier cambio en entidades (`apps/backend/src/entities/*.entity.ts`) debe ir acompañado de su respectiva migración en `apps/backend/src/database/migrations/`.
   - **NO agregues nuevos `ALTER TABLE` o `CREATE TABLE` dentro de `onModuleInit()`** en los servicios; usa siempre migraciones formales de TypeORM para evitar bloqueos de tabla (`AccessExclusiveLock`) en despliegues de producción.
   - Nunca actives `DB_SYNCHRONIZE=true` en bases de datos de producción.

4. **Seguridad, Guards y Concurrencia**:
   - Cuando uses el decorador `@Roles(...)` en un controlador, asegúrate de que `RolesGuard` esté activo en ese controlador (`@UseGuards(JwtAuthGuard, RolesGuard)`).
   - Todos los DTOs recibidos por `@Body()` deben tener decoradores de `class-validator` (`@IsString()`, `@IsNumber()`, `@IsOptional()`, etc.) porque el `ValidationPipe` global tiene `whitelist: true` y `forbidNonWhitelisted: true`.
   - En operaciones que descuenten stock (`Product`, `ProductVariant`, `RawMaterial`) o emitan correlativos fiscales (`FiscalInvoice`), utiliza transacciones (`dataSource.transaction`) con bloqueo pesimista (`pessimistic_write`) o locks transaccionales para prevenir condiciones de carrera.