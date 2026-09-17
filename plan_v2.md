# Plan de Arquitectura Multi-Tenant (SaaS)

Transformar el sistema de un solo negocio a un SaaS donde múltiples negocios (Tenants) operan simultáneamente y de forma aislada.

## 1. Nueva Entidad: Tenant (Negocio)
Crearemos una tabla Tenant (o Empresa) que será el nivel más alto de la jerarquía.
- id (UUID)
- 
ame (String) Ej: 'NutriDeli', 'Panadería X'
- isActive (Boolean)

## 2. Inyección de tenantId en Tablas Existentes
Para garantizar que los datos nunca se crucen entre clientes, TODAS las tablas principales recibirán la columna 	enantId:
- User
- Product & RawMaterial
- Order & OrderItem
- ProductionBatch & StockMovement
- Settings (Ahora cada negocio tendrá su propia tasa de cambio y configuraciones)
- DeliveryZone

## 3. Estrategia de Migración de Datos (Tu DB actual)
Como clonaste tu base de datos de producción, no podemos simplemente borrarla. El plan es:
1. Crear la tabla Tenant.
2. Insertar un Tenant por defecto llamado "NutriDeli".
3. Actualizar todas las tablas existentes para que su 	enantId apunte al ID de "NutriDeli".
4. Hacer que la columna sea obligatoria de ahí en adelante.

## 4. Refactorización del Backend
- **Autenticación (JWT):** El token del usuario ahora guardará internamente el 	enantId al que pertenece.
- **Consultas (TypeORM):** Modificaremos todos los servicios (products.service, orders.service, etc.) para que toda búsqueda exija el 	enantId. Ej: ind({ where: { tenantId: user.tenantId } }). Nadie podrá ver los pedidos de otra empresa.
- **Roles:** Crearemos un concepto de "Dueño de Empresa" (Admin local) y a futuro un "Súper Admin" (Tú, para gestionar quién usa tu software).

## 5. Refactorización del Frontend (A futuro)
- Al iniciar sesión, el frontend recibirá el tenant del usuario.
- Si vas a tener administradores que manejen varias sucursales, necesitaremos un selector de "Tienda/Empresa" en el panel superior.
