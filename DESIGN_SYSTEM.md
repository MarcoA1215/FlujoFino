# Sistema de Diseño FlujoFino (Design System & UI Guidelines)

Este documento contiene la guía oficial de estilo, tokens de diseño y reglas de desarrollo visual para el frontend de FlujoFino. **Todo desarrollador y modelo de IA debe seguir estas reglas estrictamente.**

---

## 🚨 Regla de Oro #1: NUNCA USAR CLASES DE TAILWIND CSS
- **En este proyecto NO está instalado ni configurado Tailwind CSS.**
- Utilizar clases como `flex`, `grid`, `gap-4`, `p-4`, `rounded-xl`, `bg-slate-50`, `text-slate-800`, `space-y-4` **NO funcionará**. El navegador las ignorará y la interfaz se romperá por completo (los textos y botones se pegarán entre sí y los inputs perderán su alineación).
- **Cómo estilar en FlujoFino:**
  1. Utilizar las clases utilitarias del sistema de diseño `.ff-*` definidas en `theme.css`.
  2. Utilizar componentes oficiales de Ionic (`IonCard`, `IonButton`, `IonItem`, `IonToggle`, `IonBadge`, etc.).
  3. Utilizar estilos directos `style={{ display: 'flex', gap: '8px', ... }}` con las variables CSS del sistema o valores hexadecimales oficiales.

---

## 🎨 Paleta de Colores y Tokens Oficiales

FlujoFino sigue un diseño moderno inspirado en interfaces POS de Figma con base en **Esmeralda (Emerald), Pizarra (Slate) y Blanco Puro**.

### Colores de Marca y Tema
| Token / Variable | Hex | Uso |
| :--- | :--- | :--- |
| `--ff-emerald` / `--ion-color-primary` | `#10B981` | Color primario de acción, botones destacados, activos |
| `--ff-emerald-dark` | `#059669` / `#047857` | Hover / estados activos de botones primarios |
| `--ff-emerald-light` | `#ECFDF5` | Fondos de badges de éxito, pill online, estados aprobados |
| Texto Éxito | `#065F46` | Texto legible sobre fondo `#ECFDF5` |
| `--theme-header` | `#FFFFFF` | Barra superior del sistema (configurable por usuario) |

### Neutros y Superficies
| Token / Variable | Hex | Uso |
| :--- | :--- | :--- |
| `--ff-slate-50` / `--ion-background-color` | `#F8FAFC` | Fondo general de páginas y pantallas |
| Card Background | `#FFFFFF` | Fondo de tarjetas, modales y diálogos |
| `--ff-slate-100` | `#F1F5F9` | Fondos de chips inactivos, divisores sutiles |
| `--ff-slate-200` | `#E2E8F0` | Bordes oficiales de tarjetas y contenedores |
| Border Input | `#CBD5E1` | Bordes de inputs de texto, números y tiempo |
| `--ff-slate-500` | `#64748B` | Textos secundarios, descripciones, subtítulos, labels |
| `--ff-slate-800` | `#1E293B` | Encabezados de tarjetas, títulos secundarios |
| `--ff-slate-900` | `#0F172A` | Título principal, valores monetarios y textos clave |

### Colores de Estado y Acentos
| Estado | Color | Fondo Suave | Borde | Uso |
| :--- | :--- | :--- | :--- | :--- |
| **Atención / Sincronización / Turno 2** | `#B45309` / `#F59E0B` | `#FFFBEB` | `#FDE68A` | Avisos, pendientes, turnos de receso |
| **Peligro / Destructivo / Anulado** | `#EF4444` / `#DC2626` | `#FEF2F2` | `#FECACA` | Anulaciones, eliminar, botón cerrar sesión |
| **Informativo / Citas / Turno 1** | `#0369A1` / `#0284C7` | `#E0F2FE` | `#BAE6FD` | Turno 1, información de contacto |

---

## 📐 Tipografía y Radios

- **Fuente:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
- **Radios de bordes:**
  - `sm`: `8px` (inputs, badges pequeños)
  - `md`: `12px` (botones, contenedores internos)
  - `lg`: `14px - 16px` (tarjetas `.ff-card`, modales)
  - `full`: `9999px` (pills, badges, buscador tipo cápsula)

---

## 🧱 Componentes Clave del Sistema

### 1. Tarjeta Limpia (`.ff-card`)
Toda sección o elemento de lista debe agruparse en una tarjeta:
```tsx
<div className="ff-card" style={{ padding: '16px', background: '#ffffff' }}>
  {/* Cabecera, datos y acciones */}
</div>
```
Propiedades clave:
- Fondo blanco `#ffffff`
- Borde `1px solid #E2E8F0`
- Radio `14px` a `16px`
- Sombra sutil `var(--ff-shadow-sm)`

### 2. Badges y Píldoras de Estado (`.ff-pill`)
Para estados como Abierto/Cerrado, En Línea, Pagado, etc.:
```tsx
// Abierto / En línea
<span className="ff-pill ff-pill-online">
  <span className="ff-pill-dot" style={{ backgroundColor: '#10B981' }} />
  Abierto
</span>

// Cerrado / Inactivo
<span style={{
  fontSize: '11px',
  fontWeight: 700,
  padding: '2px 8px',
  borderRadius: '9999px',
  backgroundColor: '#f1f5f9',
  color: '#64748b',
  border: '1px solid #e2e8f0'
}}>
  Cerrado
</span>
```

### 3. Botones
- **Botón Primario Destacado:**
  Usar `.ff-btn-primary` o `<IonButton color="primary">`:
  ```tsx
  <button type="button" className="ff-btn-primary" style={{ padding: '10px 18px', borderRadius: '12px' }}>
    <IonIcon icon={addOutline} />
    Crear Pedido
  </button>
  ```
- **Botón de Guardar en Pantallas de Configuración:**
  Siempre expandido al 100%, altura de `48px-52px`, esquinas redondeadas (`12px`), texto en negrita y padding inferior asegurado.

### 4. Entradas de Formulario (Inputs)
- Altura táctil mínima de `38px` a `44px`.
- Relleno `8px 12px`, fondo `#ffffff` o `#f8fafc`, borde `1px solid #CBD5E1`, radio `8px` a `10px`.
- Etiquetas claras arriba del input con tamaño `11px - 12px`, `fontWeight: 600`, color `#64748B`.

---

## 📱 Reglas Móvil-Primero (Mobile-First)

1. **Ajuste Responsivo Automático (Grid)**:
   Siempre usar cuadrículas flexibles con `auto-fit` o `auto-fill`:
   ```tsx
   <div style={{
     display: 'grid',
     gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
     gap: '12px'
   }}>
   ```
   Esto asegura que en móviles de 360px-400px ocupe exactamente 1 columna bien proporcionada, y en tablets o monitores cree 2 o más columnas sin desbordamiento horizontal.

2. **Espacio para la Barra Inferior (`.ff-bottom-nav`)**:
   En móviles, la barra de navegación inferior mide `62px`. Todo contenedor principal debe incluir:
   ```tsx
   <IonContent fullscreen className="ff-has-bottom-nav">
     <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px 16px 90px 16px' }}>
       {/* Contenido de la página */}
     </div>
   </IonContent>
   ```

3. **Ionic Toggles y Elementos Interactivos**:
   - Nunca metas etiquetas directas dentro del `<IonToggle>` con `slot="label"`, ya que el Shadow DOM de Ionic puede ocultarlas.
   - Coloca el título del elemento a la izquierda y el `<IonToggle>` a la derecha dentro de un `display: 'flex'`, `justifyContent: 'space-between'`.
