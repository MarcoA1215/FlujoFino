# FinoWork - SaaS POS & ERP Multi-Tenant

**FinoWork** (anteriormente conocido como Flujo Fino) es una plataforma integral de **Punto de Venta (POS)** y **Planificación de Recursos Empresariales (ERP)** con arquitectura **Multi-Tenant (SaaS)** diseñada para negocios comerciales, franquicias, restaurantes y prestadores de servicios.

---

## 🛠️ Stack Tecnológico

* **Monorepo:** Yarn Berry (v4) Workspaces
* **Backend:** [NestJS 11](https://nestjs.com/), TypeORM, PostgreSQL, Web Push, Nodemailer, Sentry
* **Frontend:** React 19, [Vite](https://vitejs.dev/), [Ionic Framework 9](https://ionicframework.com/), [Capacitor 8](https://capacitorjs.com/) (Android APK / iOS)
* **Almacenamiento Local (Offline):** Dexie.js (IndexedDB) para sincronización de ventas sin conexión
* **Tipos Compartidos:** `@finowork/shared-types`
* **Diseño UI:** Sistema de Diseño oficial **Emerald & Slate** (`theme.css` + componentes Ionic). *Nota: No utiliza Tailwind CSS.*

---

## ✨ Características y Módulos Principales

1. **POS / Caja Táctil Inteligente (Offline-First):**
   - Venta rápida adaptada a móviles y tablets.
   - Soporte multimoneda en tiempo real (USD, Bolívares a tasa oficial BCV, COP, USDT Binance).
   - Control estricto de gaveta de efectivo y fondos en banco para entrega de vueltos.
   - Sincronización automática de ventas locales al recuperar la conexión.

2. **Sub-divisiones y Variantes de Productos con Stock Propio:**
   - Variantes por color, talla, modelo o diseño con control de inventario independiente.
   - Galería de múltiples imágenes para el producto base y hasta 3 imágenes adicionales por variante.
   - Selector interactivo de variantes en POS y en Tienda Online.

3. **Control de Cuentas Abiertas y Alertas de Vencimiento de Abonos:**
   - Ventas a crédito o con abonos iniciales (pago parcial o exonerado).
   - Días de vencimiento personalizables por negocio y fecha de vencimiento por abono.
   - Semáforo visual de alerta (Vencido, Vence hoy, Próximo a vencer) y filtro rápido de pedidos vencidos.

4. **Arqueo Mensual Detallado y Dashboard Financiero:**
   - Visualización del arqueo mensual (Facturación, Cobrado Real [Debe], Por Cobrar, Gastos/Costos [Haber], Ganancia Neta y desglose por método de pago) antes de las métricas históricas.
   - Gráficas interactivas de ventas y flujo de caja con Recharts.

5. **Exportador Contable a Excel (Libro Mayor / Diario):**
   - Descarga de reportes contables en Excel (`.xls`) seleccionando rango de fechas **Desde** y **Hasta**.
   - Resumen y cálculo automático de **Total Debe (Ingresos)**, **Total Haber (Egresos)** y **Saldo Acumulado**.

6. **Códigos SKU / Slug por Producto:**
   - Identificador rápido `#CÓDIGO` autogenerado o editable por el usuario.
   - Búsqueda instantánea en catálogo, inventario, caja y tienda online.

7. **Comprobante y Código de Venta Copiable:**
   - Botón de 1 clic para copiar el código (`#ORD-XXXXXX`) y resumen estructurado de la venta para clientes que no usan WhatsApp.

8. **Tienda Online Pública y Agenda de Citas:**
   - Catálogo web público por inquilino (`/store/:tenantId`).
   - Módulo de reservas y agendamiento de citas online con especialistas (`/book/:tenantId`).

---

## ⚙️ Requisitos del Sistema

* **Node.js:** Versión 20.x LTS o superior
* **Yarn:** Yarn Berry (habilitado mediante `corepack enable`)
* **Base de Datos:** PostgreSQL 14+ (Local, Supabase, Neon o Render)
* **Git**

---

## 🚀 Guía de Instalación Rápida

### 1. Clonar el repositorio e instalar dependencias
```bash
git clone https://github.com/MarcoA1215/FlujoFino.git
cd FlujoFino

# Habilitar Yarn Berry
corepack enable
corepack prepare yarn@4.12.0 --activate

# Instalar dependencias del monorepo
yarn install
```

### 2. Compilar el paquete de tipos compartidos
```bash
yarn workspace @finowork/shared-types build
```

### 3. Configurar Variables de Entorno

#### Backend (`apps/backend/.env`)
Copia el archivo de plantilla:
```bash
cp apps/backend/.env.template apps/backend/.env
```
Configura los valores esenciales:
```env
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://usuario:clave@localhost:5432/finowork"
JWT_SECRET="clave-super-secreta-de-minimo-32-caracteres"
FRONTEND_URL="http://localhost:5173"
BUSINESS_TIMEZONE="America/Caracas"
```

#### Frontend (`apps/frontend/.env`)
Copia el archivo de plantilla:
```bash
cp apps/frontend/.env.template apps/frontend/.env
```
Configura los valores esenciales:
```env
VITE_API_URL=http://localhost:3001
VITE_PUBLIC_URL=http://localhost:5173
VITE_SUPPORT_WHATSAPP=584145652381
```

### 4. Ejecutar Migraciones de Base de Datos
```bash
yarn workspace finowork-backend migration:run
```

---

## 💻 Ejecución en Desarrollo (Local)

Para levantar el entorno completo de desarrollo, ejecuta en terminales independientes:

### Terminal 1: Backend (NestJS)
```bash
yarn workspace finowork-backend start:dev
```
> La API estará disponible en `http://localhost:3001`.

### Terminal 2: Frontend (Vite + React)
```bash
yarn workspace frontend dev
```
> La aplicación web estará disponible en `http://localhost:5173`.

---

## 🧪 Pruebas y Validación de Código

```bash
# Ejecutar pruebas unitarias del backend
yarn workspace finowork-backend test --runInBand

# Ejecutar pruebas del frontend
yarn workspace frontend test

# Validar compilación completa de producción
yarn build:backend
yarn build:frontend
```

---

## 🌿 Flujo de Ramas y Despliegues

* **`dev`**: Rama de desarrollo activo e integraciones continuas.
* **`qa`**: Rama de control de calidad y pruebas de aceptación previas a producción.
* **`main`**: Rama de producción estable.

---

## 📄 Licencia

Propiedad exclusiva de **FinoWork**. Todos los derechos reservados.
