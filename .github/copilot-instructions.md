# Instrucciones Oficiales para GitHub Copilot — FinoWork

Consulta siempre `AGENTS.md`, `DESIGN_SYSTEM.md` y `DATABASE_SCHEMA.md` en la raíz del proyecto para mayor detalle.

## Reglas Críticas
1. **Nombre del Proyecto**: **FinoWork** (antes Flujo Fino).
2. **Gestor de Paquetes**: **Yarn 4 Berry (`yarn`) exclusivamente**. Prohibido usar `npm` o `npx`.
3. **Prohibido Tailwind CSS**: No existe Tailwind CSS en `apps/frontend`. Usa las clases `.ff-*` de `apps/frontend/src/theme.css`, componentes de `@ionic/react` y estilos inline React.
4. **Theming Dinámico Multi-Tenant**:
   - Usa `var(--theme-primary)` y `var(--theme-primary-contrast, #ffffff)` para botones y elementos activos (nunca `#10B981` fijo).
   - Usa `var(--theme-primary-readable, #065F46)` para texto de marca sobre fondo blanco.
5. **Prohibidos Selectores Nativos del Navegador**:
   - Nunca uses `<select>`, `<input type="date">`, `<input type="time">`, `<input type="datetime-local">` ni `<input type="color">`.
   - Usa siempre `<FinoSelect />`, `<FinoDatePicker />`, `<FinoTimePicker />` y `<FinoColorPicker />` desde `apps/frontend/src/components/ui/`.
6. **Backend & Base de Datos (NestJS 11 + TypeORM + PostgreSQL)**:
   - Filtra siempre todas las consultas por el `tenantId` del usuario autenticado (`negocioId` en `investments`, `salary_advances` y `push_subscriptions`).
   - Usa `decimal` con `ColumnNumericTransformer` para valores monetarios y de inventario (nunca `float`).
   - Crea migraciones formales en `apps/backend/src/database/migrations/` en lugar de ejecutar `ALTER TABLE` en `onModuleInit()`.
