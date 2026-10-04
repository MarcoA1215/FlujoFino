IGNORR LA REGLA CAVEMAN A MENOS QUE SE ESPECIFIQUE LO CONTRARIO

# REGLAS ESTRICTAS DE DISEÑO UI / FRONTEND (FLUJO FINO)
1. **PROHIBIDO EL USO DE CLASES DE TAILWIND CSS**:
   - En este proyecto **NO EXISTE NI ESTÁ INSTALADO TAILWIND CSS**.
   - NUNCA uses clases como `flex`, `grid`, `gap-*`, `p-*`, `m-*`, `rounded-*`, `bg-*`, `text-*`, `space-y-*`. El navegador las ignora y la interfaz se rompe por completo.
   - Usa estilos inline (`style={{ display: 'flex', gap: '8px', ... }}`), componentes de Ionic (`IonCard`, `IonButton`, `IonToggle`, etc.) y las clases de `theme.css` (`.ff-card`, `.ff-pill`, `.ff-btn-primary`).

2. **SISTEMA DE DISEÑO OFICIAL (EMERALD & SLATE)**:
   - **Fondo de páginas**: `#F8FAFC` (`var(--ff-slate-50)`).
   - **Tarjetas**: Superficie `#FFFFFF`, borde `1px solid #E2E8F0`, radio `14px - 16px`, sombra `.ff-card` o `var(--ff-shadow-sm)`.
   - **Color Primario (Acción/Éxito)**: Emerald `#10B981` (Hover `#059669`, Suave `#ECFDF5`, Texto `#065F46`).
   - **Textos**: Títulos `#0F172A`, Secundario `#1E293B`, Labels/Muted `#64748B`.
   - **Inputs**: Altura táctil cómoda (38-42px), borde `#CBD5E1`, fondo `#ffffff` o `#f8fafc`, radio 8-10px.
   - **Responsive**: Usar siempre `display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px'` para que en móvil sea 1 columna y en desktop se auto-distribuya en varias columnas.
   - **Margen inferior**: Las páginas deben tener `padding-bottom: 80px-90px` o `className="ff-has-bottom-nav"` para no quedar tapadas por la barra de navegación inferior en móviles.
   - Ver guía detallada en `DESIGN_SYSTEM.md`.

<!-- # REGLA CAVEMAN (AHORRO ESTRICTO DE TOKENS)
- Sé extremadamente conciso y directo (habla como cavernícola: frases telegráficas cortas).
- Elimina saludos, introducciones amables, conclusiones y cortesías ("¡Claro!", "Con gusto te ayudo", etc.).
- Entrega ÚNICAMENTE el bloque de código o diff necesario para resolver la tarea.
- Si hay un error, explica la causa en una sola línea.
- No expliques la teoría ni el funcionamiento a menos que te lo pida explícitamente. -->