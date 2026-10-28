---
name: fino-design-guardian
description: >-
  Guardián de diseño UI/UX y coherencia visual para FinoWork. Utilizar siempre
  que se cree una nueva pantalla, componente, formulario, modal o se edite
  cualquier interfaz visual en apps/frontend. Aplica estrictamente el Design
  System Slate & Emerald, la prohibición total de Tailwind CSS, el sistema
  mobile-first y el uso correcto de variables dinámicas de marca de clientes
  (--theme-primary, --theme-primary-contrast, --theme-header, etc.).
---

# FinoWork Design Guardian & UI Rules

Este skill rige el diseño, arquitectura visual y experiencia de usuario (UI/UX) para **FinoWork** (anteriormente conocido como Flujo Fino). Debe seguirse rigurosamente cada vez que se cree o modifique cualquier componente o vista en el frontend.

---

## 1. 🚨 Reglas Críticas Inviolables

1. **PROHIBICIÓN TOTAL DE TAILWIND CSS**:
   - En este proyecto **NO ESTÁ INSTALADO TAILWIND CSS**.
   - NUNCA uses clases como `flex`, `grid`, `gap-*`, `p-*`, `m-*`, `rounded-*`, `bg-*`, `text-*`, `space-y-*`, `w-*`, `h-*`.
   - El navegador las ignora y la interfaz se descompone por completo.
   - Todo layout y estilado debe hacerse mediante:
     - Clases utilitarias del sistema en `theme.css` (`.ff-card`, `.ff-pill`, `.ff-chip`, `.ff-btn-primary`, `.ff-search-pill`, etc.).
     - Componentes oficiales de Ionic (`IonCard`, `IonButton`, `IonItem`, `IonToggle`, `IonBadge`, etc.).
     - Estilos en línea React (`style={{ display: 'flex', gap: '8px', ... }}`).

2. **NOMBRE OFICIAL**:
   - La plataforma se llama **FinoWork**. Toda mención visible para el usuario, títulos, descripciones y documentación debe usar FinoWork.

---

## 2. 🎨 Variables Dinámicas de Marca de Clientes (Theming Multi-Tenant)

Cada cliente puede personalizar la paleta de su negocio (por ejemplo, verde esmeralda, índigo, azul real, púrpura, ámbar) y el color de su cabecera. El sistema inyecta estas preferencias dinámicamente en `:root` mediante CSS Variables.

### Matriz de Tokens Dinámicos:
| Variable CSS | Uso Obligatorio | Ejemplo |
| :--- | :--- | :--- |
| `var(--theme-primary)` | Botones primarios (CTA), chips/filtros activos, elemento de menú seleccionado, bordes de selección activa. | `style={{ backgroundColor: 'var(--theme-primary)' }}` |
| `var(--theme-primary-contrast, #ffffff)` | **SIEMPRE** que se aplique `var(--theme-primary)` como fondo, este token es el color del texto o icono para garantizar contraste (blanco o pizarra oscuro). | `style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-primary-contrast, #ffffff)' }}` |
| `var(--theme-primary-readable, #065F46)` | Color de marca oscurecido de forma segura para usar como texto o bordes sobre fondo blanco puro (`#FFFFFF`). | `style={{ color: 'var(--theme-primary-readable)' }}` |
| `var(--theme-primary-soft)` | Fondo sutil con ~10% de opacidad para badges de marca o filas seleccionadas. | `style={{ backgroundColor: 'var(--theme-primary-soft)' }}` |
| `var(--theme-header, #ffffff)` | Fondo de la barra de navegación superior en `AppHeader`. | `style={{ '--background': 'var(--theme-header, #ffffff)' }}` |
| `var(--theme-header-contrast, #0F172A)` | Textos, iconos y botones dentro de `AppHeader`. | `style={{ color: 'var(--theme-header-contrast, #0F172A)' }}` |

### Clases CSS de Conveniencia:
- `.ff-btn-primary`: Botón de acción principal con radio de 12px, sombra y color de marca.
- `.bg-theme-primary`: Aplica `var(--theme-primary)` y `var(--theme-primary-contrast)` automáticamente.
- `.text-theme-primary`: Aplica texto con el color primario.
- `.border-theme-primary`: Aplica borde con el color primario.

### ⚠️ Qué NUNCA debe tematizarse con el color del cliente:
- **Fondo de páginas**: Siempre `#F8FAFC` (`var(--ff-slate-50)`).
- **Tarjetas y modales**: Fondo blanco `#FFFFFF` con borde `#E2E8F0`.
- **Estados Semánticos del Sistema**:
  - Peligro / Cancelado / Eliminar: Rojo Coral `#EF4444` (Fondo `#FEF2F2`, Borde `#FECACA`).
  - Advertencia / Alerta / Turnos: Ámbar `#F59E0B` (Fondo `#FFFBEB`, Borde `#FDE68A`).
  - Información / Ayuda: Azul `#0284C7` (Fondo `#E0F2FE`, Borde `#BAE6FD`).

---

## 3. 📱 Directrices Mobile-First & Responsive

1. **Cuadrículas Adaptables (Auto-fit Grid)**:
   ```tsx
   <div style={{
     display: 'grid',
     gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
     gap: '12px'
   }}>
     {/* Tarjetas o ítems */}
   </div>
   ```
   En móviles (360px-420px) se formatea en 1 sola columna natural sin desbordamiento. En desktop se expande a 2, 3 o 4 columnas automáticamente.

2. **Margen Inferior para la Barra Móvil**:
   La barra inferior fija mide `62px`. Envolver el contenido con la clase o padding adecuado:
   ```tsx
   <IonContent fullscreen className="ff-has-bottom-nav">
     <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px 16px 90px 16px' }}>
       {/* Contenido */}
     </div>
   </IonContent>
   ```

3. **Formularios e Inputs Táctiles**:
   - Altura mínima: `minHeight: '40px'` a `44px`.
   - Borde: `1px solid #CBD5E1`, fondo: `#ffffff` o `#F8FAFC`, radio: `10px`.
   - Etiquetas claras ubicadas arriba del input con `fontSize: '12px'`, `fontWeight: 600`, `color: '#64748B'`.
   - No usar `slot="label"` dentro de `<IonToggle>`. Usar contenedor flex con el label a la izquierda y el toggle a la derecha.

4. **🚫 Prohibición de Selectores Nativos del Sistema Operativo**:
   - Está terminantemente prohibido usar `<input type="color">`, `<input type="date">`, `<input type="time">`, `<input type="datetime-local">` o `<select>`.
   - En su lugar, importar y usar los componentes oficiales de `components/ui`:
     - `FinoColorPicker`: Selector visual de color con paleta recomendada, vista previa en tiempo real y código HEX.
     - `FinoDatePicker`: Calendario interactivo con navegación mensual, indicador "Hoy" y presets rápidos.
     - `FinoTimePicker`: Selector táctil de hora 12h/24h con selector AM/PM y accesos de turnos comunes.
     - `FinoSelect`: Selector modal bottom sheet con buscador integrado, radio cards y checks activos.

---

## 4. ✅ Checklist de Validación Visual antes de finalizar cambios

- [ ] ¿Se eliminaron todas las clases de Tailwind CSS?
- [ ] ¿Se erradicaron selectores nativos (`type="color"`, `type="date"`, `type="time"`, `<select>`), usando en su lugar los componentes de `components/ui`?
- [ ] ¿Los botones principales usan `var(--theme-primary)` o `.ff-btn-primary` en lugar de `#10B981` estático?
- [ ] ¿Los textos sobre el fondo primario usan `var(--theme-primary-contrast, #ffffff)`?
- [ ] ¿Los textos de marca sobre fondo blanco usan `var(--theme-primary-readable)` para prevenir invisibilidad si el cliente elige amarillo/blanco?
- [ ] ¿Las tarjetas usan fondo blanco `#ffffff`, borde `1px solid #E2E8F0` y radio `14px-16px`?
- [ ] ¿El layout se adapta en móviles de 360px sin desbordamiento horizontal?
- [ ] ¿El contenedor principal tiene `paddingBottom: '90px'` o `ff-has-bottom-nav` para no quedar tapado por la barra móvil?
