# Flujo Fino - SaaS POS & ERP Multi-Sucursal

Plataforma de Punto de Venta (POS) y Gestión de Producción (ERP) diseñada bajo una arquitectura Multi-Tenant (Software as a Service) para franquicias y múltiples sucursales.

## 🛠️ Stack Tecnológico
* **Backend:** NestJS, TypeORM, PostgreSQL
* **Frontend:** React, Vite, Ionic Framework, Capacitor
* **Arquitectura:** Monorepo (Yarn Workspaces)

## ⚙️ Requisitos Previos
Para levantar este entorno en desarrollo, necesitas tener instalado:
* Node.js (v18 o superior)
* Yarn (Gestor de paquetes)
* PostgreSQL (Local o en la nube como Supabase)
* Git

## 🚀 Guía de Instalación Rápida

**1. Instalar dependencias globales**
En la raíz del proyecto, ejecuta:
```bash
yarn install
```

**2. Configurar Variables de Entorno (Backend)**
Ve a la carpeta  pps/backend y copia el archivo .env.template a .env con las credenciales de tu base de datos:
```env
DATABASE_URL="postgresql://user:password@host:port/database"
JWT_SECRET="tu_secreto_super_seguro_jwt"
COTIZAVE_API_KEY="tu_api_key_de_cotizave"
```

**3. Configurar Variables de Entorno (Frontend)**
Ve a la carpeta pps/frontend y copia el archivo .env.template a .env:
```env
VITE_API_URL=http://localhost:3000
```

## 💻 Levantar el Entorno de Desarrollo (Local)

Para desarrollar, necesitas levantar ambos servidores en terminales separadas:

**Terminal 1 (Backend):**
```bash
cd apps/backend
yarn start:dev
```

**Terminal 2 (Frontend):**
```bash
cd apps/frontend
yarn dev
```

La aplicación web estará disponible en http://localhost:5173.
