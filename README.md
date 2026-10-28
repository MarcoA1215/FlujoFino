# 🚀 FinoWork — SaaS POS, ERP, Agenda & Facturación Multi-Tenant

**FinoWork** (anteriormente conocido como *Flujo Fino*) es una plataforma integral **Todo-en-Uno** de **Punto de Venta (POS) Offline-First**, **Planificación de Recursos Empresariales (ERP)**, **Tienda Online**, **Agenda de Citas** y **Facturación Fiscal (SENIAT)** con arquitectura **Multi-Tenant (SaaS)** y soporte nativo **Trimoneda (USD, VES/Bs, COP)**, diseñada para comercios minoristas, franquicias, restaurantes, cafeterías, salones de belleza, barberías y prestadores de servicios.

---

## 📚 Documentación Oficial del Repositorio

Para facilitar el onboarding de cualquier desarrollador o agente de IA, el proyecto cuenta con documentación técnica especializada en la raíz:

| Documento | Descripción |
| :--- | :--- |
| 📄 **[`README.md`](./README.md)** | Guía general de arquitectura, instalación, variables de entorno, scripts y despliegue (este archivo). |
| 🗄️ **[`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md)** | **Esquema completo y desglosado de las 32 tablas de PostgreSQL**, diagrama Entidad-Relación (Mermaid), tipos de datos, relaciones, índices e historial de migraciones. |
| 🎨 **[`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)** | **Sistema de Diseño Oficial (Emerald & Slate)**, reglas de Theming Dinámico Multi-Tenant (`--theme-primary`), prohibición de Tailwind CSS y uso obligatorio de componentes `Fino*`. |
| 🧭 **[`ARCHITECTURE_ROADMAP.md`](./ARCHITECTURE_ROADMAP.md)** | Decisiones de arquitectura Offline-First, ciclo de vida de inquilinos y hoja de ruta de innovación. |
| 🤖 **[`AGENTS.md`](./AGENTS.md) / [`GEMINI.md`](./GEMINI.md) / [`CLAUDE.md`](./CLAUDE.md)** | Memoria unificada de contexto, reglas de ingeniería y checklist de producción para todos los agentes de IA (Gemini, Claude, GPT/Codex, Copilot, Cursor). |

---

## 🛠️ Stack Tecnológico y Arquitectura del Monorepo

El proyecto está estructurado como un **Monorepo administrado exclusivamente con Yarn 4 Berry (`yarn@4.12.0`)**:

```text
FinoWork/
├── apps/
│   ├── backend/                 # API RESTful en NestJS 11 + TypeORM + PostgreSQL
│   │   ├── src/
│   │   │   ├── entities/        # 32 Entidades de Base de Datos (TypeORM)
│   │   │   ├── database/        # DataSource, 13 Migraciones y Seeds
│   │   │   ├── auth/            # JWT, Guards (JwtAuth, Roles, TenantStatus, SuperAdmin)
│   │   │   ├── orders/          # POS, Cuentas Abiertas, Abonos, Sync Offline y Tienda Pública
│   │   │   ├── products/        # Catálogo, Variantes, Recetas, Combos y Kardex
│   │   │   ├── reservations/    # Agenda de Citas, Especialistas y Portal Público de Reservas
│   │   │   ├── fiscal/          # Facturación Fiscal SENIAT (Interna y Proveedor Unidigital)
│   │   │   ├── dashboard/       # Arqueo Mensual, Tesorería, Flujo de Caja y Libro Mayor Excel
│   │   │   ├── superadmin/      # Gobernanza SaaS, Suscripciones, Finanzas de Plataforma e IVA
│   │   │   ├── promoters/       # Sistema de Afiliados/Promotores por Rangos y Comisiones
│   │   │   └── ...              # (customers, deliveries, production, raw-materials, storage, mail, notifications)
│   └── frontend/                # SPA / PWA / App Móvil en React 19 + Vite 8 + Ionic 9 + Capacitor 8
│       ├── src/
│       │   ├── api/             # Cliente Axios con interceptores multi-tenant y manejo offline
│       │   ├── components/      # Modales financieros, Header inteligente y selectores UI (components/ui/Fino*)
│       │   ├── context/         # AuthContext, SettingsContext, SubscriptionContext, LoadingContext
│       │   ├── pages/           # 24 Vistas (POS, Orders, Dashboard, Products, Reservations, PublicStore, etc.)
│       │   └── services/        # Motor Offline-First con Dexie.js (IndexedDB) y Web Push / FCM
└── packages/
    └── shared-types/            # Contratos DTO, Enums y constantes compartidas (@finowork/shared-types)
```

### Tecnologías Clave
* **Gestor de Paquetes:** **Yarn 4 Berry** (`corepack enable`). *Está prohibido usar `npm`.*
* **Backend:** Node.js 20+, NestJS 11, TypeORM 1.1, PostgreSQL 14+, Passport JWT, Helmet, Throttler, AWS SDK v3 (S3 Compatible / Supabase Storage), Sharp (optimización WebP), Nodemailer, Web-Push (VAPID), Sentry v11.
* **Frontend & Mobile:** React 19, TypeScript, Vite 8, Ionic Framework 9, Capacitor 8 (compilación nativa Android `.apk` / `.aab`), Dexie.js (IndexedDB), FullCalendar 6, Recharts 3.
* **Testing & Calidad:** Jest (Backend Unit & E2E), Vitest + Testing Library (Frontend), Oxlint / ESLint.

---

## ✨ Módulos y Capacidades de Producción

1. **POS / Caja Táctil Inteligente (Offline-First & Trimoneda):**
   - Operación continua con o sin internet respaldada en **IndexedDB (`Dexie.js`)** y sincronización por lotes idempotente (`POST /orders/sync-offline`).
   - **Triángulo Cambiario en Tiempo Real:** Dólares (`USD`), Bolívares (`VES` con sincronización automática BCV / Paralelo / USDT / Manual) y Pesos Colombianos (`COP`).
   - Pagos simples o mixtos (`SPLIT`), control exacto de gaveta de efectivo y validación de fondos disponibles para entrega de vueltos por efectivo, Pago Móvil, Transferencia o Binance.

2. **Catálogo Avanzado, Variantes, Recetas y Producción:**
   - Tipos de ítem: **Reventa**, **Fórmula/Receta** (descuento automático de insumos por gramaje), **Combos** y **Servicios Agendables**.
   - **Variantes de Producto (`product_variant`)** por talla, color o modelo con SKU, precio, costo, stock e imágenes independientes.
   - Modalidad de venta inmediata o **Bajo Encargo / Pre-orden a Proveedor** con seguimiento de entregas parciales.

3. **Cuentas Abiertas, Créditos y Semáforo de Cobranza:**
   - Ventas con pago parcial (abonos iniciales configurables por porcentaje mínimo) o exoneración autorizada.
   - Historial detallado de abonos (`abonosHistory`), cálculo de deuda pendiente y **semáforo visual de vencimiento** (`nextAbonoDueDate`).

4. **Facturación Fiscal SENIAT y Libro de Ventas (`fiscal_invoices`):**
   - Emisión de Facturas, Notas de Crédito y Notas de Débito con cálculo de Base Imponible, Exentos e IVA (16% o configurable).
   - Soporte dual: Numeración correlativa **Interna** o integración con Imprenta Digital autorizada (**Unidigital**).
   - Generación y exportación del **Libro de Ventas Fiscal** mensual.

5. **Agenda Interactiva y Portal Público de Citas (`/book/:tenantToken`):**
   - Calendario administrativo (`FullCalendar`) con asignación de múltiples servicios y especialistas por cita (`serviceSpecialists`).
   - Portal público para clientes con validación de disponibilidad por horarios de negocio, turnos de personal (`work_schedule`), recesos de almuerzo y cobro opcional de anticipo con subida de comprobante.

6. **Tienda Online Pública y Rastreo de Pedidos (`/store/:tenantToken`):**
   - E-commerce autogestionado con carrito multimoneda, selector de variantes, cálculo de tarifas por zona de delivery (`delivery_zone`) y reporte de pago con captura.
   - Enlaces públicos cifrados con AES-256-CBC (`tenant-crypto.ts`) para proteger los UUIDs internos.

7. **ERP Financiero, Tesorería, Nómina y Contabilidad:**
   - **Arqueo Mensual y Cierre de Caja Diario:** Desglose de Facturación Bruta, Cobrado Real (Debe), Cuentas por Cobrar, Costos/Gastos (Haber) y Ganancia Neta.
   - **Módulo de Compra/Venta de Divisas (`cash_exchanges`)** e **Inversiones de Capital (`investments`)**.
   - **Nómina Híbrida y Adelantos de Sueldo (`salary_advances`):** Empleados con sueldo fijo, comisión porcentual por venta/servicio o esquema mixto, con liquidación automática que registra el egreso en `operating_expenses`.
   - **Exportador Contable a Excel (`.xls`):** Libro Mayor / Diario filtrable por rango de fechas.

8. **Gobernanza SaaS (SuperAdmin) y Ecosistema de Promotores:**
   - Panel `/platform-admin` para control de suscripciones (`TRIAL`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`), aprobación de reportes de pago SaaS, contabilidad de plataforma y declaración de IVA SENIAT.
   - Panel `/promoter` para afiliadores comerciales con sistema gamificado de rangos (`MADERA`, `BRONCE`, `PLATA`, `ORO`), comisiones de activación y recurrentes.

---

## ⚙️ Requisitos del Sistema

* **Node.js:** `v20.x LTS` o superior
* **Gestor de Paquetes:** `Yarn 4.12.0` (vía Corepack: `corepack enable`)
* **Base de Datos:** `PostgreSQL 14+` (Local, Supabase, Neon o Render)
* **Almacenamiento S3:** Bucket compatible con AWS S3 (Supabase Storage, Cloudflare R2, AWS S3) para imágenes y comprobantes.

---

## 🚀 Guía de Instalación y Configuración Paso a Paso

### 1. Clonar e instalar dependencias (Exclusivamente con Yarn)
```bash
git clone https://github.com/MarcoA1215/FlujoFino.git
cd FlujoFino

# Activar Yarn 4 Berry mediante Corepack
corepack enable
corepack prepare yarn@4.12.0 --activate

# Instalar todas las dependencias del monorepo
yarn install
```

### 2. Compilar el paquete de tipos compartidos (`@finowork/shared-types`)
Este paso es **obligatorio** antes de compilar o ejecutar el backend o el frontend por primera vez:
```bash
yarn build:types
```

### 3. Configurar Variables de Entorno

#### A. Backend (`apps/backend/.env`)
Copia la plantilla base:
```bash
cp apps/backend/.env.template apps/backend/.env
```
Edita `apps/backend/.env` con tus credenciales (en producción **todas** las claves secretas deben ser únicas y seguras):

```env
# Servidor y Entorno
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
BUSINESS_TIMEZONE="America/Caracas"

# Base de Datos PostgreSQL (TypeORM)
DATABASE_URL="postgresql://usuario:password@localhost:5432/finowork"
DB_SYNCHRONIZE=false

# Seguridad y Criptografía (Mínimo 32-64 caracteres aleatorios en Producción)
JWT_SECRET="reemplazar_con_secreto_aleatorio_de_64_caracteres"
JWT_EXPIRES_IN="30d"
TENANT_CRYPTO_SECRET="reemplazar_con_otro_secreto_aleatorio_de_64_caracteres"

# Cuenta SuperAdmin Inicial
SUPERADMIN_EMAIL="superadmin@finowork.com"
SUPERADMIN_PASSWORD="TuPasswordSuperSeguro2026!"

# Almacenamiento S3 (Supabase Storage / AWS S3 / R2)
S3_ENDPOINT="https://<project-ref>.supabase.co/storage/v1/s3"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="tu_s3_access_key"
S3_SECRET_ACCESS_KEY="tu_s3_secret_key"
S3_BUCKET_NAME="finowork-media"
S3_PUBLIC_URL="https://<project-ref>.supabase.co/storage/v1/object/public/finowork-media"

# Correo Transaccional (SMTP para OTP de verificación y recuperación)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_USER="notificaciones@tudominio.com"
SMTP_PASS="tu_app_password_smtp"
SMTP_FROM="FinoWork <notificaciones@tudominio.com>"

# Notificaciones Web Push (Generar par propio con: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY="tu_vapid_public_key"
VAPID_PRIVATE_KEY="tu_vapid_private_key"
VAPID_SUBJECT="mailto:soporte@finowork.com"

# Integraciones Opcionales (Tasas Cambiarias, Monitoreo y Facturación Digital)
COTIZAVE_API_KEY=""
SENTRY_DSN=""
UNIDIGITAL_API_URL=""
UNIDIGITAL_API_TOKEN=""
```

#### B. Frontend (`apps/frontend/.env`)
Copia la plantilla base:
```bash
cp apps/frontend/.env.template apps/frontend/.env
```
Configura las variables:
```env
VITE_API_URL=http://localhost:3001
VITE_PUBLIC_URL=http://localhost:5173
VITE_SUPPORT_WHATSAPP=584145652381
VITE_VAPID_PUBLIC_KEY=tu_vapid_public_key
VITE_SENTRY_DSN=
```

### 4. Ejecutar Migraciones de Base de Datos
```bash
yarn workspace finowork-backend migration:run
```

---

## 💻 Comandos de Desarrollo, Pruebas y Compilación

### Levantar Entorno de Desarrollo
```bash
# Terminal 1: Levantar API Backend en http://localhost:3001
yarn workspace finowork-backend start:dev

# Terminal 2: Levantar App Frontend en http://localhost:5173
yarn workspace frontend dev
```

### Ejecutar Suites de Pruebas y Linter
```bash
# Pruebas unitarias del Backend (Jest)
yarn workspace finowork-backend test --runInBand

# Pruebas unitarias del Frontend (Vitest)
yarn workspace frontend test

# Linter ultrarrápido del Frontend (Oxlint)
yarn workspace frontend lint
```

### Compilación para Producción (Web & API)
```bash
# Compilar shared-types + backend (genera apps/backend/dist)
yarn build:backend

# Compilar shared-types + frontend (genera apps/frontend/dist)
yarn build:frontend
```

### Compilación Móvil Android (Capacitor)
```bash
# Compilar frontend web y sincronizar con proyecto nativo Android
yarn build:frontend
yarn workspace frontend cap sync android

# Generar Android App Bundle (.aab) para Google Play Store (Windows PowerShell)
./build-bundle.ps1
```

---

## 🎨 Reglas de UI/UX para Nuevos Desarrolladores

Antes de modificar cualquier archivo en `apps/frontend/src`, lee **[`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)**:
1. **Cero Tailwind CSS:** Este proyecto **no utiliza Tailwind**. Usa las clases `.ff-*` de `src/theme.css`, componentes de Ionic (`@ionic/react`) y estilos inline React.
2. **Theming Dinámico del Cliente:** Usa siempre `var(--theme-primary)` y `var(--theme-primary-contrast, #ffffff)` para botones y elementos activos en lugar de colores fijos.
3. **Selectores Oficiales `Fino*`:** No uses `<select>`, `<input type="date">`, `<input type="time">` ni `<input type="color">` nativos del navegador; utiliza `<FinoSelect />`, `<FinoDatePicker />`, `<FinoTimePicker />` y `<FinoColorPicker />` ubicados en `apps/frontend/src/components/ui/`.

---

## 🌿 Flujo de Trabajo con Ramas (Git Flow)

* **`dev`**: Rama de integración continua y desarrollo diario.
* **`qa`**: Rama de pruebas de aceptación y validación pre-producción.
* **`main`**: Rama de producción estable desplegada en Render (Backend) y Vercel (Frontend).

---

## 📄 Licencia

Propiedad intelectual de **FinoWork** (Titular: Marco David Avila Pinto). Todos los derechos reservados.
