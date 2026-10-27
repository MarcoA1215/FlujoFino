IGNORR LA REGLA CAVEMAN A MENOS QUE SE ESPECIFIQUE LO CONTRARIO

# NOMBRE OFICIAL DEL PROYECTO: FinoWork
El proyecto ahora se llama **FinoWork** (anteriormente conocido como Flujo Fino). Todas las referencias de marca y archivos generados deben usar FinoWork.

# REGLAS ESTRICTAS DE DISEÑO UI / FRONTEND (FINOWORK)
1. **PROHIBIDO EL USO DE CLASES DE TAILWIND CSS**:
   - En este proyecto **NO EXISTE NI ESTÁ INSTALADO TAILWIND CSS**.
   - NUNCA uses clases como `flex`, `grid`, `gap-*`, `p-*`, `m-*`, `rounded-*`, `bg-*`, `text-*`, `space-y-*`. El navegador las ignora y la interfaz se rompe por completo.
   - Usa estilos inline (`style={{ display: 'flex', gap: '8px', ... }}`), componentes de Ionic (`IonCard`, `IonButton`, `IonToggle`, etc.) y las clases de `theme.css` (`.ff-card`, `.ff-pill`, `.ff-btn-primary`).

2. **SISTEMA DE DISEÑO OFICIAL (EMERALD & SLATE) + THEMING DINÁMICO DE CLIENTES**:
   - **Agente Guardián de Diseño**: Subagente `fino_ui_designer` y skill `fino-design-guardian` (.agents/skills/fino-design-guardian/SKILL.md).
   - **Fondo de páginas**: `#F8FAFC` (`var(--ff-slate-50)`).
   - **Tarjetas**: Superficie `#FFFFFF`, borde `1px solid #E2E8F0`, radio `14px - 16px`, sombra `.ff-card` o `var(--ff-shadow-sm)`.
   - **Color de Marca Configurable por el Cliente**:
     - Cada cliente puede personalizar su color (`themePrimaryColor`, `themeHeaderColor`).
     - **Acción/Botones Primarios/Chips Activos**: Usar `var(--theme-primary)` o `.ff-btn-primary`. NUNCA hardcodear `#10B981` en estilos en línea directos.
     - **Texto sobre Fondo Primario**: SIEMPRE usar `color: 'var(--theme-primary-contrast, #ffffff)'` o `.bg-theme-primary` (garantiza legibilidad si el cliente elige colores claros).
     - **Texto de Marca sobre Fondo Blanco**: Usar `var(--theme-primary-readable, #065F46)`.
     - **Header Superior**: Usar `var(--theme-header, #ffffff)` y `var(--theme-header-contrast, #0F172A)` en `AppHeader`.
   - **Textos**: Títulos `#0F172A`, Secundario `#1E293B`, Labels/Muted `#64748B`.
   - **Inputs**: Altura táctil cómoda (38-42px), borde `#CBD5E1`, fondo `#ffffff` o `#f8fafc`, radio 8-10px.
   - **Responsive**: Usar siempre `display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px'` para que en móvil sea 1 columna y en desktop se auto-distribuya en varias columnas.
   - **Margen inferior**: Las páginas deben tener `padding-bottom: 80px-90px` o `className="ff-has-bottom-nav"` para no quedar tapadas por la barra de navegación inferior en móviles.
   - Ver guía detallada en `DESIGN_SYSTEM.md` y `.agents/skills/fino-design-guardian/SKILL.md`.

3. **GESTOR DE PAQUETES OFICIAL: YARN EXCLUSIVAMENTE**:
   - Este monorepo está administrado con **Yarn 4 Berry**.
   - **ESTRICTAMENTE PROHIBIDO EL USO DE NPM**: NUNCA ejecutes `npm run`, `npm test`, `npm install`, etc.
   - Usa siempre `yarn workspace <nombre> <comando>` o ejecuta comandos en el subdirectorio con `yarn`.

<!-- # REGLA CAVEMAN (AHORRO ESTRICTO DE TOKENS)
- Sé extremadamente conciso y directo (habla como cavernícola: frases telegráficas cortas).
- Elimina saludos, introducciones amables, conclusiones y cortesías ("¡Claro!", "Con gusto te ayudo", etc.).
- Entrega ÚNICAMENTE el bloque de código o diff necesario para resolver la tarea.
- Si hay un error, explica la causa en una sola línea.
- No expliques la teoría ni el funcionamiento a menos que te lo pida explícitamente. -->