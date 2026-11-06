import {
  calendarOutline,
  cartOutline,
  cubeOutline,
  receiptOutline,
  flaskOutline,
  constructOutline,
  peopleOutline,
  carOutline,
  statsChartOutline,
  calculatorOutline,
  settingsOutline,
  personAddOutline,
} from 'ionicons/icons';

export type ModuleGuideKey =
  | 'dashboard'
  | 'pos'
  | 'reservations'
  | 'products'
  | 'orders'
  | 'customers'
  | 'raw_materials'
  | 'production'
  | 'calculator'
  | 'delivery'
  | 'settings'
  | 'users';

export interface GuideStep {
  stepNumber: number;
  title: string;
  description: string;
  keyDetail?: string;
  actionLabel?: string;
  actionPath?: string;
}

export interface GuideTab {
  id: string;
  label: string;
  badge?: string;
  concept?: string;
  steps: GuideStep[];
  proTip?: string;
}

export interface ModuleGuideContent {
  key: ModuleGuideKey;
  title: string;
  subtitle: string;
  category: string;
  icon: string;
  concept: string;
  bestFor: string;
  tabs?: GuideTab[];
  steps: GuideStep[];
  proTip: string;
  relatedRoutes: string[];
}

export const MODULE_GUIDES: Record<ModuleGuideKey, ModuleGuideContent> = {
  products: {
    key: 'products',
    title: 'Catálogo: Productos y Servicios',
    subtitle: 'Administra productos físicos de reventa y servicios profesionales para citas',
    category: 'Inventario & Catálogo',
    icon: cubeOutline,
    concept:
      'En este módulo se gestiona todo lo que ofreces: desde productos físicos con control de stock (shampoos, esmaltes, ropa) hasta servicios profesionales sin inventario físico (cejas, pestañas, peluquería, masajes).',
    bestFor: 'Spas, estéticas, tiendas minoristas, salones de belleza y negocios con venta física o por citas.',
    tabs: [
      {
        id: 'services',
        label: '✨ Servicios / Citas',
        concept:
          'Los servicios representan atenciones profesionales de mano de obra. No tienen un stock físico que se agote, pero sí tienen duración en minutos y especialistas asignadas para la agenda.',
        steps: [
          {
            stepNumber: 1,
            title: 'Presiona "+ Nuevo" y selecciona "Servicio / Cita"',
            description:
              'Al abrir el formulario, selecciona el selector o pestaña "Servicio / Cita". El sistema adaptará los campos automáticamente.',
            keyDetail: 'Arquetipo: Servicio (sin stock físico que se descuente).',
          },
          {
            stepNumber: 2,
            title: 'Define Precio en USD y Duración en Minutos',
            description:
              'Asigna el nombre (ej. "Lifting de Pestañas", "Microblading"), categoría "Servicios", precio de venta y duración (ej. 30, 45, 60 o 90 min). La duración calcula los bloques exactos en tu agenda.',
            keyDetail: 'La duración determina los intervalos en tu calendario público.',
          },
          {
            stepNumber: 3,
            title: 'Asigna a tus Especialistas (Opcional)',
            description:
              'En la sección "Personal Asignado", marca qué colaboradoras de tu equipo pueden realizar este servicio. Si lo dejas vacío, todas estarán capacitadas.',
            keyDetail: 'Permite que tus clientas elijan con quién atenderse al reservar.',
          },
          {
            stepNumber: 4,
            title: 'Aparece de Inmediato en tu Enlace de Citas',
            description:
              'Al guardar el servicio, se sincroniza al instante con tu módulo de Citas y con tu enlace público de reservas (/book/tunegocio) para que las clientas lo elijan.',
            actionLabel: 'Ver Agenda de Citas',
            actionPath: '/reservations',
          },
        ],
        proTip:
          'Si un servicio consume insumos costosos (ej. 1 ampolla o un kit descartable), puedes asociarle materia prima para que el sistema calcule el costo exacto por atención.',
      },
      {
        id: 'retail',
        label: '📦 Productos Físicos',
        concept:
          'Productos tangibles de reventa directa. Tienen control de stock físico, costo de adquisición, precio de venta y alertas cuando queden pocas unidades.',
        steps: [
          {
            stepNumber: 1,
            title: 'Selecciona "Reventa Directa"',
            description:
              'Ingresa nombre del producto, código o SKU (opcional), precio de venta en USD y el costo que te cobró tu proveedor.',
            keyDetail: 'El costo es vital para calcular tu ganancia neta en el Dashboard.',
          },
          {
            stepNumber: 2,
            title: 'Ingresa Stock y Alerta Mínima',
            description:
              'Coloca las unidades reales disponibles en tu local y una cantidad mínima (ej. 3 unidades) para recibir alertas antes de quedarte sin mercancía.',
          },
          {
            stepNumber: 3,
            title: 'Agrega Variantes de Tallas o Tonos',
            description:
              'Si el producto viene en diferentes tonos, colores o presentaciones, crea variantes con su propia foto y control de stock independiente.',
          },
          {
            stepNumber: 4,
            title: 'Activa "Mostrar en Catálogo Web"',
            description:
              'Marca la casilla para que aparezca en tu tienda online pública (/store/tunegocio) con su galería de fotos y precio visible.',
          },
        ],
        proTip:
          'Puedes alternar la disponibilidad entre "Inmediato" (entrega al momento) o "Bajo Encargo" si trabajas con pedidos personalizados o contra pedido.',
      },
      {
        id: 'combos',
        label: '🎁 Combos y Promos',
        concept:
          'Crea paquetes combinados con un precio promocional especial (ej. "Pack Cejas HD + Bozo" o "Kit Cuidado Facial").',
        steps: [
          {
            stepNumber: 1,
            title: 'Crea un Combo Promocional',
            description:
              'Presiona el botón de combos para agrupar servicios y productos ya registrados con un precio total atractivo.',
          },
          {
            stepNumber: 2,
            title: 'Véndelo en POS o Citas',
            description:
              'Tus cajeros pueden cobrar el combo completo en 1 clic y el sistema registrará los servicios correspondientes.',
          },
        ],
        proTip:
          'Los combos con un 10% a 15% de descuento respecto a los servicios por separado aumentan tu ticket promedio por clienta hasta en un 35%.',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Elige si crearás un Producto Físico o un Servicio',
        description: 'Toca "+ Nuevo" y selecciona entre "Servicio / Cita" (para atenciones sin stock) o "Reventa Directa" (para artículos con inventario).',
      },
      {
        stepNumber: 2,
        title: 'Asigna Precios y Detalles Clave',
        description: 'Si es servicio, define duración en minutos y especialistas. Si es producto físico, define stock y costo de compra.',
      },
      {
        stepNumber: 3,
        title: 'Activa su Visibilidad Online',
        description: 'Tus servicios van al enlace de citas (/book) y tus productos a tu catálogo web (/store).',
      },
    ],
    proTip:
      'Mantén categorías ordenadas (ej. "Cejas", "Pestañas", "Cuidado Facial", "Reventa") para que tus clientas y cajeros encuentren todo al instante.',
    relatedRoutes: ['/products'],
  },

  reservations: {
    key: 'reservations',
    title: 'Citas y Reservaciones',
    subtitle: 'Agenda inteligente, auto-agendamiento por WhatsApp y control de turnos',
    category: 'Servicios & Agenda',
    icon: calendarOutline,
    concept:
      'Tu libro de citas digital: visualiza horas libres y ocupadas, permite que tus clientas agenden solas desde un enlace público y cobra las citas al momento.',
    bestFor: 'Spas, estéticas, micropigmentación (PMU), manicura, peluquerías, barberías y consultorios.',
    tabs: [
      {
        id: 'agenda',
        label: '📅 Agenda Diaria',
        concept:
          'Gestiona el flujo diario de atenciones en tu local. Revisa citas del día, quién atiende y el estado de cada clienta.',
        steps: [
          {
            stepNumber: 1,
            title: 'Visualiza tus Citas del Día',
            description:
              'Cambia entre vista de calendario y lista. Verás hora de inicio, servicio elegido, clienta y especialista asignada.',
          },
          {
            stepNumber: 2,
            title: 'Actualiza el Estado de la Cita',
            description:
              'Mueve las citas entre: Pendiente ➔ Confirmada ➔ En Atención ➔ Atendida ➔ Cancelada.',
            keyDetail: 'Mantener los estados al día sincroniza a todo tu equipo.',
          },
          {
            stepNumber: 3,
            title: 'Cobro en POS con Descuento de Anticipo',
            description:
              'Al finalizar la atención, presiona "Cobrar en POS". Si la clienta ya pagó un abono/seña previo, el sistema lo descuenta automáticamente y solo cobra el saldo pendiente.',
            actionLabel: 'Ir al Punto de Venta',
            actionPath: '/pos',
          },
        ],
        proTip:
          'Puedes registrar citas presenciales o telefónicas tocando "+ Nueva Cita" para bloquear el horario de inmediato.',
      },
      {
        id: 'simultaneous',
        label: '👥 Citas Simultáneas y Cabinas',
        concept:
          'Configura si tu negocio puede atender a varias clientas a la misma hora o si una sola cita ocupa todo el local.',
        steps: [
          {
            stepNumber: 1,
            title: 'Revisa "Permitir Citas Simultáneas" en Ajustes',
            description:
              'Si tienes varias especialistas o camillas trabajando al mismo tiempo, activa este interruptor en Ajustes > Citas.',
            actionLabel: 'Ver Ajustes de Citas',
            actionPath: '/settings',
          },
          {
            stepNumber: 2,
            title: 'Atención Paralela sin Choques',
            description:
              'El enlace público permitirá que dos clientas reserven a la misma hora (ej. 3:00 PM), siempre y cuando elijan especialistas diferentes.',
            keyDetail: 'Evita sobre-vender el tiempo de una misma profesional.',
          },
        ],
        proTip:
          'Si trabajas sola en tu cabina o estudio privado, mantén desactivadas las citas simultáneas para garantizar exclusividad total en cada turno.',
      },
      {
        id: 'public_link',
        label: '🔗 Auto-Reserva y Autogestión',
        concept:
          'Deja que tus clientas agenden solas las 24 horas y puedan consultar o reprogramar su cita sin llamarte.',
        steps: [
          {
            stepNumber: 1,
            title: 'Copia tu Enlace de Auto-Reserva',
            description:
              'Tu enlace tiene el formato www.finowork.com/book/tu-negocio. Cópialo y colócalo en el perfil de Instagram o envíalo por WhatsApp.',
          },
          {
            stepNumber: 2,
            title: 'Enlace de Autogestión para la Clienta',
            description:
              'Al reservar, la clienta recibe un enlace personal (/appointment/:id) donde puede consultar el estatus, ver la dirección o solicitar reprogramar.',
            keyDetail: 'Si solicita reprogramar, el negocio recibe la alerta para aprobar o rechazar.',
          },
          {
            stepNumber: 3,
            title: 'Intervalos Exactos de Tiempo (Slot Interval)',
            description:
              'En Ajustes define si tus turnos se dividen cada 15, 30, 45 o 60 minutos para adaptar la cuadrícula a tus servicios.',
          },
        ],
        proTip:
          'Activa "Permitir Selección de Especialista" para que tus clientas puedan elegir libremente a su profesional favorita.',
      },
      {
        id: 'deposit',
        label: '💳 Abonos y Señas Previas',
        concept:
          'Elimina las inasistencias y cancelaciones de última hora exigiendo un pago anticipado (seña) por Pago Móvil.',
        steps: [
          {
            stepNumber: 1,
            title: 'Activa "Solicitar Abono Previo"',
            description:
              'En Ajustes > Citas, activa la opción y define el porcentaje requerido (ej. 30% o 50% del valor del servicio).',
          },
          {
            stepNumber: 2,
            title: 'La Clienta Adjunta Referencia de Pago',
            description:
              'Al reservar, la app le muestra tus datos bancarios y le pide adjuntar el número de referencia y comprobante.',
          },
          {
            stepNumber: 3,
            title: 'Aprueba y Confirma el Cupo',
            description:
              'Verificas el dinero en tu banco y presionas "Aprobar Cita" para apartar definitivamente el turno.',
          },
        ],
        proTip:
          'Los centros de estética que exigen abono previo reducen sus citas fantasmas o inasistencias en más de un 85%.',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Crea tus Servicios en el Catálogo',
        description: 'Define duración en minutos, precios y especialistas capacitadas para cada servicio.',
        actionLabel: 'Ir a Catálogo de Servicios',
        actionPath: '/products',
      },
      {
        stepNumber: 2,
        title: 'Configura tus Horarios de Atención',
        description: 'En Ajustes > Citas, define tus días laborables, intervalo de turnos y datos de Pago Móvil.',
        actionLabel: 'Ir a Ajustes',
        actionPath: '/settings',
      },
      {
        stepNumber: 3,
        title: 'Comparte tu Enlace y Atiende',
        description: 'Coloca tu enlace público en tus redes sociales y recibe notificaciones cada vez que agenden.',
      },
    ],
    proTip:
      'Al terminar la cita, presiona "Cobrar en POS": el sistema cargará los montos a la caja registradora restando el abono ya entregado.',
    relatedRoutes: ['/reservations'],
  },

  pos: {
    key: 'pos',
    title: 'Punto de Venta (POS)',
    subtitle: 'Cobros rápidos multimoneda, tickets por WhatsApp y arqueo de caja',
    category: 'Ventas y Caja',
    icon: cartOutline,
    concept:
      'Tu caja registradora inteligente y multimoneda. Vende productos y servicios en segundos, calcula vueltos exactos en dólares o bolívares, opera incluso sin internet y concilia el dinero al cierre del día.',
    bestFor: 'Cobros en mostrador, recepción de salones, tiendas comerciales y cajas de atención rápida.',
    tabs: [
      {
        id: 'checkout',
        label: '💵 Cobro y Descuentos',
        concept: 'Procesa ventas de productos y servicios de forma inmediata.',
        steps: [
          {
            stepNumber: 1,
            title: 'Selecciona Ítems del Catálogo',
            description: 'Toca productos o servicios para agregarlos al carrito. Puedes ajustar cantidades con un toque.',
          },
          {
            stepNumber: 2,
            title: 'Aplica Descuentos en Mostrador',
            description: 'Puedes aplicar un descuento porcentual (ej. 10%) o un monto fijo de rebaja a toda la orden.',
            keyDetail: 'El ticket reflejará el descuento para total transparencia con el cliente.',
          },
          {
            stepNumber: 3,
            title: 'Asigna el Cliente o Deja en "Consumidor Final"',
            description: 'Busca a tu cliente habitual para acumular su historial o déjalo en genérico para ventas al paso.',
          },
          {
            stepNumber: 4,
            title: 'Ticket Digital por WhatsApp',
            description: 'Envía el comprobante térmico digital al WhatsApp del cliente con 1 solo toque.',
          },
        ],
        proTip:
          'Puedes vender a crédito (fiado) seleccionando a un cliente y marcando la venta con saldo pendiente en Órdenes.',
      },
      {
        id: 'offline',
        label: '⚡ Modo Sin Conexión (Offline-First)',
        concept:
          'FinoWork sigue cobrando y registrando ventas aunque se caiga el internet o la luz en tu local.',
        steps: [
          {
            stepNumber: 1,
            title: 'Vende sin Interrupciones',
            description:
              'Si se interrumpe la conexión, la app entra automáticamente en "Modo Sin Conexión" y almacena tus órdenes localmente en la memoria del dispositivo.',
            keyDetail: 'No pierdes ni una sola venta por fallas de conexión.',
          },
          {
            stepNumber: 2,
            title: 'Píldora de Órdenes Pendientes',
            description:
              'En la barra superior verás un indicador con las órdenes que están guardadas en tu teléfono.',
          },
          {
            stepNumber: 3,
            title: 'Auto-Sincronización en la Nube',
            description:
              'Apenas regresa el internet o los datos móviles, FinoWork sube todas las órdenes al servidor automáticamente sin duplicarlas.',
          },
        ],
        proTip:
          'Puedes tocar la píldora de conexión en la cabecera para forzar la sincronización en cualquier momento.',
      },
      {
        id: 'split_payments',
        label: '💱 Pagos Mixtos y Vueltos Cruzados',
        concept: 'Maneja la realidad multimoneda sin calculadora ni errores humanos.',
        steps: [
          {
            stepNumber: 1,
            title: 'Cobros Combinados (USD + Bs)',
            description: 'Si una cuenta es de $30 y el cliente paga $20 en efectivo y el resto por Pago Móvil, márcalos en la misma orden.',
            keyDetail: 'El sistema calcula cuánto falta exactamente en bolívares a la tasa del día.',
          },
          {
            stepNumber: 2,
            title: 'Vueltos Cruzados (Paga en $ y Vuelto en Bs)',
            description: 'Ingresa con cuánto billete te pagan. Si no tienes sencillo en dólares y das vuelto por Pago Móvil, regístralo como vuelto en Bs.',
            keyDetail: 'FinoWork descuenta el vuelto de la gaveta correcta sin descuadrar la caja.',
          },
        ],
        proTip:
          'Mantén tu tasa de cambio al día en la cabecera para que la conversión a bolívares sea matemáticamente exacta.',
      },
      {
        id: 'cash_close',
        label: '🔒 Fondo y Cierre de Caja',
        concept: 'Concilia tu gaveta física y cuentas bancarias al finalizar cada turno o jornada laboral.',
        steps: [
          {
            stepNumber: 1,
            title: 'Apertura con "Fondo de Caja"',
            description: 'Al iniciar el día, usa "Fondo de Caja" si ingresas billetes sencillos para dar vuelto. No se sumará a tus ventas.',
          },
          {
            stepNumber: 2,
            title: 'Toca el Ícono de Billetera en la Cabecera',
            description: 'El botón superior de Arqueo Diario te muestra el resumen en vivo de entradas, salidas y vueltos.',
          },
          {
            stepNumber: 3,
            title: 'Compara Físico vs Sistema',
            description: 'Verifica los billetes reales en tu gaveta contra el total de "Efectivo USD" reportado por la plataforma.',
          },
        ],
        proTip:
          'Genera el comprobante de cierre diario para auditar a tus cajeros y evitar faltantes de dinero al cambiar de turno.',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Selecciona Productos o Servicios',
        description: 'Toca los ítems de tu catálogo o búscalo por nombre o código de barra.',
      },
      {
        stepNumber: 2,
        title: 'Ingresa los Pagos Recibidos',
        description: 'Registra el monto en divisa o bolívares según cómo pague el cliente.',
      },
      {
        stepNumber: 3,
        title: 'Emite el Comprobante Digital',
        description: 'Genera el ticket o factura y envíasela al cliente por WhatsApp.',
      },
    ],
    proTip:
      'Mantén tu Tasa BCV actualizada en la barra superior tocando la píldora de tasa de cambio para que los bolívares siempre cuadren con el banco.',
    relatedRoutes: ['/pos'],
  },

  orders: {
    key: 'orders',
    title: 'Órdenes y Pedidos por Encargo',
    subtitle: 'Seguimiento de encargos personalizados, anticipos y saldos pendientes',
    category: 'Ventas y Operaciones',
    icon: receiptOutline,
    concept:
      'El centro de control para pedidos que no se entregan en el acto: confecciones, tortas, trabajos personalizados, encomiendas o entregas programadas.',
    bestFor: 'Talleres, reposterías, negocios con abono anticipado y tiendas con despacho programado.',
    tabs: [
      {
        id: 'abonos',
        label: '💰 Anticipos y Abonos',
        concept: 'Registra adelantos de dinero y mantén el control exacto de lo que el cliente aún te debe.',
        steps: [
          {
            stepNumber: 1,
            title: 'Crea el Pedido con el Anticipo Recibido',
            description: 'Registra los productos solicitados y el abono inicial (ej. 50% de seña en dólares o Pago Móvil).',
          },
          {
            stepNumber: 2,
            title: 'Saldo Pendiente Automático',
            description: 'El sistema calcula automáticamente la deuda restante y la refleja en la cuenta del cliente.',
          },
          {
            stepNumber: 3,
            title: 'Cobro del Saldo al Entregar',
            description: 'Cuando el cliente retire el encargo, presiona "Registrar Abono" y cobra el saldo final con cualquier método.',
          },
        ],
        proTip:
          'Puedes filtrar las órdenes por "Pendientes de Cobro" para saber exactamente cuánto dinero tienes pendiente por cobrar en la calle.',
      },
      {
        id: 'estados',
        label: '🔄 Flujo de Producción',
        concept: 'Mantén a tu equipo de trabajo informado sobre qué órdenes están en proceso.',
        steps: [
          {
            stepNumber: 1,
            title: 'Mueve el Estado según Avance',
            description: 'Cambia las órdenes entre: Pendiente ➔ En Preparación ➔ Listo para Entrega ➔ Entregado.',
          },
          {
            stepNumber: 2,
            title: 'Comunícale al Cliente por WhatsApp',
            description: 'Con 1 toque puedes avisarle al cliente: "¡Tu pedido ya está listo para ser retirado!".',
          },
        ],
        proTip:
          'El personal operativo o de cocina puede tener acceso solo al listado de pedidos para ver qué preparar sin ver los datos contables.',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Registra el Encargo con sus Detalles',
        description: 'Agrega los productos o servicios personalizados y la fecha acordada de entrega.',
      },
      {
        stepNumber: 2,
        title: 'Ingresa el Abono Inicial',
        description: 'Declara cuánto dinero te adelantó el cliente y con qué método.',
      },
      {
        stepNumber: 3,
        title: 'Entrega y Cobra el Restante',
        description: 'Actualiza el estado a entregado y registra la liquidación total de la orden.',
      },
    ],
    proTip:
      'Imprime o envía el ticket de encargo para que el cliente tenga su comprobante formal del anticipo recibido.',
    relatedRoutes: ['/orders'],
  },

  customers: {
    key: 'customers',
    title: 'Directorio de Clientes',
    subtitle: 'Fidelización, cuentas por cobrar (crédito/fiado) y mensajes directos',
    category: 'Clientes y Relaciones',
    icon: peopleOutline,
    concept:
      'Tu base de datos de clientes: conoce quiénes te compran más, cuántas citas han tenido, si tienen deudas pendientes y contáctalas por WhatsApp en 1 clic.',
    bestFor: 'Todos los negocios que deseen fidelizar clientas, cobrar fiados y llevar historial de servicio.',
    tabs: [
      {
        id: 'directorio',
        label: '👥 Directorio y Auto-Registro',
        concept: 'Base de datos unificada de contactos y compradores.',
        steps: [
          {
            stepNumber: 1,
            title: 'Auto-Registro Inteligente',
            description: 'Tus clientes se crean automáticamente al venderles en el POS o cuando agendan una cita por el enlace público.',
          },
          {
            stepNumber: 2,
            title: 'Historial Consolidado de Visitas y Compras',
            description: 'Toca cualquier cliente para ver todas sus compras anteriores, fechas de visita y preferencias registradas.',
          },
        ],
        proTip:
          'Agrega notas personales (ej. "Tono favorito: Castaño Claro", "Alérgica al látex") para brindar una atención VIP insuperable.',
      },
      {
        id: 'credit',
        label: '💳 Cuentas por Cobrar (Fiado)',
        concept: 'Controla el dinero en la calle y registra cobros directos sin errores.',
        steps: [
          {
            stepNumber: 1,
            title: 'Filtra Clientes con Saldo Deudor',
            description: 'Toca el filtro de "Con Deuda" para ver la lista exacta de quiénes tienen pagos pendientes y el total por cobrar.',
          },
          {
            stepNumber: 2,
            title: 'Registra Abonos Directos a la Deuda',
            description: 'Cuando la clienta te pague, presiona "Registrar Abono" en su perfil sin necesidad de crear una nueva venta.',
            keyDetail: 'El saldo se rebaja automáticamente y queda asentado en tu caja.',
          },
        ],
        proTip:
          'Establece un límite de crédito para no sobrepasar el monto que consideras seguro prestar a cada cliente.',
      },
      {
        id: 'whatsapp',
        label: '📲 WhatsApp Inteligente',
        concept: 'Comunícate al instante sin tener que agregar el número a tu agenda telefónica.',
        steps: [
          {
            stepNumber: 1,
            title: 'Botón Directo con Mensajes Precargados',
            description: 'Toca el botón verde junto a la clienta para abrir una conversación de WhatsApp con su saludo o recordatorio de cobro.',
          },
          {
            stepNumber: 2,
            title: 'Cobranza Educada y Automatizada',
            description: 'Si la clienta tiene saldo pendiente, el mensaje incluye con cortesía el monto adeudado y tus datos de Pago Móvil.',
          },
        ],
        proTip:
          'El contacto directo por WhatsApp con plantillas educadas acelera el cobro de cuentas vencidas en más de un 60%.',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Consulta tu Lista de Clientes',
        description: 'Revisa teléfonos, citas e historial acumulado.',
      },
      {
        stepNumber: 2,
        title: 'Monitorea Saldos Pendientes',
        description: 'Identifica cuentas por cobrar y registra abonos a la deuda.',
      },
      {
        stepNumber: 3,
        title: 'Escríbeles por WhatsApp',
        description: 'Saluda o recuerda pagos con 1 solo toque.',
      },
    ],
    proTip:
      'Puedes exportar tu lista de clientes a Excel cuando desees para respaldos o campañas de promociones.',
    relatedRoutes: ['/customers'],
  },

  dashboard: {
    key: 'dashboard',
    title: 'Dashboard Financiero y Tesorería',
    subtitle: 'El estado de salud de tu negocio, flujo de dinero y ganancias netas',
    category: 'Analítica y Tesorería',
    icon: statsChartOutline,
    concept:
      'Tu centro de control financiero: cuánto dinero real hay en tu gaveta física, en tus cuentas bancarias, ingresos cobrados, gastos del mes y ganancia limpia.',
    bestFor: 'Dueños de negocio y administradores para control total de finanzas.',
    tabs: [
      {
        id: 'treasury',
        label: '🏦 Tesorería y Fondos Reales',
        concept: 'Arqueo de dinero en tiempo real separado por ubicación física y digital.',
        steps: [
          {
            stepNumber: 1,
            title: 'Gaveta Física (Efectivo USD)',
            description: 'Billetes reales en dólares que deben estar físicamente en tu gaveta o caja fuerte.',
          },
          {
            stepNumber: 2,
            title: 'Bancos en Bolívares (Pago Móvil / Punto)',
            description: 'Saldo en bolívares recibido por pagos electrónicos, valorado a la tasa oficial del día.',
          },
          {
            stepNumber: 3,
            title: 'Ajusta tu Saldo Inicial',
            description: 'Toca "Ajustar Saldo" para declarar con cuánto dinero arrancó tu negocio en caja y bancos.',
          },
        ],
        proTip:
          'Si un saldo aparece en rojo, significa que registraste más egresos de los que ingresaron. Ajusta tu saldo inicial para cuadrarlo.',
      },
      {
        id: 'protect_bs',
        label: '🛡️ Comprar USD / Proteger Bs',
        concept: 'Blinda tu negocio contra la inflación cambiando bolívares a dólares.',
        steps: [
          {
            stepNumber: 1,
            title: 'Usa "Comprar USD / Proteger Bs"',
            description: 'Cuando acumules bolívares de tus ventas y compres dólares en efectivo o USDT, regístralo aquí.',
          },
          {
            stepNumber: 2,
            title: 'Cuadra tus Cuentas al Instante',
            description: 'El sistema restará los bolívares de tu banco y sumará los dólares a tu gaveta física sin alterar tus ventas netas.',
          },
        ],
        proTip:
          'Hacer esto regularmente garantiza que tu dinero nunca se devalúe y que tu arqueo de caja siempre esté 100% exacto.',
      },
      {
        id: 'investments',
        label: '📈 Inyección de Capital',
        concept: 'Registra aportes de socios o préstamos sin alterar las ventas operativas.',
        steps: [
          {
            stepNumber: 1,
            title: 'Presiona "Inversión / Capital"',
            description: 'Registra cualquier dinero aportado externamente para comprar equipos, mercancía o remodelaciones.',
          },
          {
            stepNumber: 2,
            title: 'Claridad Contable Total',
            description: 'El dinero entra a tu caja o banco pero no se cuenta como venta comercial, protegiendo tus reportes de rentabilidad real.',
          },
        ],
        proTip:
          'Diferenciar entre "Inversión de Capital" e "Ingreso por Ventas" es la clave para saber si un negocio es realmente rentable.',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Revisa tus Saldos de Apertura',
        description: 'Declara tus fondos reales en efectivo y bancos desde "Ajustar Saldo".',
      },
      {
        stepNumber: 2,
        title: 'Monitorea Ingresos vs Gastos',
        description: 'Revisa cuánto facturaste, cuánto cobraste y los gastos del mes para conocer tu margen neto real.',
      },
      {
        stepNumber: 3,
        title: 'Toca Cualquier Métrica para Ver su Fórmula',
        description: 'Cada tarjeta abre un desglose educativo explicando exactamente de dónde sale cada número.',
      },
    ],
    proTip:
      'Consulta las alertas de bajo inventario al pie del Dashboard para saber qué insumos o productos debes reponer urgentemente.',
    relatedRoutes: ['/dashboard'],
  },

  raw_materials: {
    key: 'raw_materials',
    title: 'Materia Prima e Insumos',
    subtitle: 'Inventario de materiales consumidos en servicios y recetas',
    category: 'Insumos & Costos',
    icon: flaskOutline,
    concept:
      'Controla los materiales que compras para trabajar (esmaltes, pestañas, pigmentos, tintes, harinas, telas, empaques) y conoce su costo unitario por uso.',
    bestFor: 'Spas, peluquerías, panaderías, manufactura y negocios con consumo de materiales.',
    tabs: [
      {
        id: 'insumos',
        label: '🧪 Insumos y Costos Unitarios',
        concept: 'Lleva el inventario y calcula cuánto cuesta cada gota o gramo de material.',
        steps: [
          {
            stepNumber: 1,
            title: 'Registra tus Insumos con su Unidad de Medida',
            description: 'Crea insumos indicando si los mides en gramos, mililitros, unidades, metros o frascos.',
          },
          {
            stepNumber: 2,
            title: 'Coloca el Costo de Compra y Contenido',
            description: 'Indica cuánto pagaste por el paquete (ej. $15 por un frasco de 500ml) para que el sistema calcule el costo por dosis.',
          },
          {
            stepNumber: 3,
            title: 'Define un Stock Mínimo para Alertas',
            description: 'El sistema te avisará antes de que se te agote un material crítico para atender.',
          },
        ],
        proTip:
          'Puedes registrar tus compras de insumos como un Gasto Operativo con 1 clic para que se descuente de tu caja bancaria o en efectivo.',
      },
      {
        id: 'mermas',
        label: '⚠️ Mermas y Ajustes de Stock',
        concept: 'Registra pérdidas, roturas o vencimientos sin descuadrar la contabilidad.',
        steps: [
          {
            stepNumber: 1,
            title: 'Usa "Ajuste de Stock / Merma"',
            description: 'Si se derramó un frasco de esmalte, se venció un producto o hubo una rotura, ajusta la cantidad.',
          },
          {
            stepNumber: 2,
            title: 'Indica el Motivo del Ajuste',
            description: 'Selecciona la razón (Vencimiento, Daño, Merma de Uso, Conteo Físico).',
            keyDetail: 'FinoWork registra la pérdida sin afectar el costo de ventas de tus órdenes cerradas.',
          },
        ],
        proTip:
          'Monitorear tus mermas mensuales te permite detectar fugas de dinero en materiales mal manipulados.',
      },
      {
        id: 'vinculacion',
        label: '🔗 Consumo en Servicios y Recetas',
        concept: 'Conecta insumos a servicios o productos terminados.',
        steps: [
          {
            stepNumber: 1,
            title: 'Asocia Insumos al Servicio',
            description: 'En el Catálogo de Productos > Servicio, vincula qué insumos gasta la especialista en cada cita (ej. 1 ampolla, 2 toallas).',
            actionLabel: 'Ir a Catálogo',
            actionPath: '/products',
          },
          {
            stepNumber: 2,
            title: 'Descuento Automático',
            description: 'Al cobrar la cita o procesar una receta, el sistema descuenta los insumos del almacén automáticamente.',
          },
        ],
        proTip:
          'Esto te permite saber con exactitud cuánto dinero te deja limpio cada servicio descontando insumos.',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Registra tus Insumos con su Unidad de Medida',
        description: 'Crea insumos indicando si los mides en gramos, mililitros, unidades, metros o frascos.',
      },
      {
        stepNumber: 2,
        title: 'Coloca el Costo de Compra y Contenido',
        description: 'Indica cuánto pagaste por el paquete para que el sistema calcule el costo por dosis.',
      },
      {
        stepNumber: 3,
        title: 'Vincúlalos a tus Servicios o Productos',
        description: 'En el Catálogo de Productos o en Recetas, indica cuántos gramos o ml consume cada atención.',
      },
    ],
    proTip:
      'Registra un stock mínimo en cada insumo: el sistema te avisará con anticipación antes de que te quedes sin materiales para atender clientas.',
    relatedRoutes: ['/raw-materials'],
  },

  production: {
    key: 'production',
    title: 'Producción y Recetas',
    subtitle: 'Fichas técnicas, cálculo de costo unitario y lotes de fabricación',
    category: 'Producción & Costos',
    icon: constructOutline,
    concept:
      'Asocia tu materia prima con tus productos terminados. Conoce cuánto te cuesta producir cada unidad y descuenta insumos de forma automática al fabricar.',
    bestFor: 'Reposterías, restaurantes, cosmética artesanal, talleres de confección y fábricas.',
    steps: [
      {
        stepNumber: 1,
        title: 'Crea la Receta de tu Producto',
        description: 'Selecciona el producto y agrega los insumos que utiliza con sus cantidades exactas.',
      },
      {
        stepNumber: 2,
        title: 'Conoce tu Margen de Ganancia Real',
        description: 'FinoWork sumará automáticamente el costo de cada insumo y te mostrará tu margen contra el precio de venta.',
      },
      {
        stepNumber: 3,
        title: 'Procesa Lotes de Producción',
        description: 'Al cocinar o fabricar un lote, el sistema descuenta la materia prima y añade los productos terminados al stock.',
      },
    ],
    proTip:
      'Si el precio de compra de un insumo sube, el costo de todos tus productos fabricados se actualiza automáticamente sin cálculos manuales.',
    relatedRoutes: ['/production'],
  },

  delivery: {
    key: 'delivery',
    title: 'Delivery y Despacho',
    subtitle: 'Tarifas fijas por zona y despacho con repartidores en tiempo real',
    category: 'Logística & Despacho',
    icon: carOutline,
    concept:
      'Organiza tus envíos a domicilio, establece tarifas fijas de transporte según el sector y asigna pedidos a tus repartidores en vivo.',
    bestFor: 'Comida rápida, restaurantes, tiendas de ropa y negocios con servicio a domicilio.',
    steps: [
      {
        stepNumber: 1,
        title: 'Configura tus Zonas de Envío',
        description: 'En "Zonas de Delivery", crea tus sectores frecuentes con su tarifa fija de transporte en USD.',
        actionLabel: 'Ir a Zonas de Delivery',
        actionPath: '/delivery-zones',
      },
      {
        stepNumber: 2,
        title: 'Asigna Repartidores a Pedidos',
        description: 'Desde el panel de órdenes, asigna qué repartidor llevará cada paquete con su teléfono y dirección.',
      },
      {
        stepNumber: 3,
        title: 'Cobro en Ruta y Liquidación',
        description: 'Controla si el pedido ya fue pagado online o si el repartidor debe cobrar efectivo o Pago Móvil en mano.',
      },
    ],
    proTip:
      'Crea usuarios con rol DELIVERY para que tus motorizados abran FinoWork en su celular y solo vean sus pedidos en calle sin acceso a la caja.',
    relatedRoutes: ['/delivery-panel', '/delivery-zones'],
  },

  calculator: {
    key: 'calculator',
    title: 'Calculadora de Precios y Costos',
    subtitle: 'Fijación de precios científica considerando costos fijos y punto de equilibrio',
    category: 'Finanzas & Precios',
    icon: calculatorOutline,
    concept:
      'Elimina la incertidumbre al fijar precios. Calcula cuánto debes cobrar por tus productos o servicios considerando alquiler, luz, nómina, materiales y ganancia deseada.',
    bestFor: 'Emprendedores que buscan fijar precios rentables y saber cuántas ventas mínimas necesitan para no perder dinero.',
    steps: [
      {
        stepNumber: 1,
        title: 'Declara tus Costos Fijos Mensuales',
        description: 'Ingresa los gastos que pagas sí o sí cada mes (alquiler del local, sueldos base, internet, electricidad).',
      },
      {
        stepNumber: 2,
        title: 'Agrega los Costos Variables por Unidad',
        description: 'Coloca el costo de insumos, materiales y empaques utilizados para crear 1 producto o realizar 1 atención.',
      },
      {
        stepNumber: 3,
        title: 'Establece tu Margen Neto Deseado',
        description: 'Elige qué porcentaje limpio deseas ganar (ej. 35%, 50% o 100%) para obtener el precio de venta recomendado.',
      },
    ],
    proTip:
      'El Punto de Equilibrio te indica la cantidad exacta de servicios o productos que debes vender al mes solo para pagar gastos antes de ver ganancias.',
    relatedRoutes: ['/calculator'],
  },

  settings: {
    key: 'settings',
    title: 'Configuración y Ajustes',
    subtitle: 'Tasas de cambio, cuentas bancarias, citas y marca de tu negocio',
    category: 'Administración',
    icon: settingsOutline,
    concept:
      'El motor de tu negocio: configura tus tasas de cambio en bolívares y pesos, tus datos bancarios para recibir pagos, tus horarios de citas y la identidad de tu marca.',
    bestFor: 'Propietarios y administradores para poner a punto toda la plataforma.',
    tabs: [
      {
        id: 'rates',
        label: '💱 Tasas y Monedas',
        concept: 'Define cómo se cotizan los cobros en bolívares y pesos colombianos.',
        steps: [
          {
            stepNumber: 1,
            title: 'Tasa Oficial BCV Automática',
            description: 'FinoWork consulta automáticamente el Banco Central todos los días hábiles a la 1:30 PM para que no tengas que cambiarla a mano.',
            keyDetail: 'Modo recomendado para negocios que cobran a tasa oficial.',
          },
          {
            stepNumber: 2,
            title: 'Modos Alternativos: Paralelo o Manual',
            description: 'Si tu negocio trabaja con tasa Paralelo o deseas fijar un valor manual fijo, selecciónalo con 1 clic.',
          },
          {
            stepNumber: 3,
            title: 'Habilita Pesos Colombianos (COP) si Aplica',
            description: 'Para negocios en zonas fronterizas (Táchira, Zulia), activa la moneda COP y fija su tasa de conversión.',
          },
        ],
        proTip:
          'Puedes actualizar la tasa del día en cualquier momento desde la barra superior de la app sin tener que venir a Ajustes.',
      },
      {
        id: 'bank_data',
        label: '🏦 Datos Bancarios',
        concept: 'Información visible para tus clientes en recibos y enlaces de auto-reserva.',
        steps: [
          {
            stepNumber: 1,
            title: 'Ingresa tus Datos de Pago Móvil',
            description: 'Selecciona tu banco, coloca tu cédula o RIF y el número telefónico receptor.',
          },
          {
            stepNumber: 2,
            title: 'Configura Cuentas Digitales (Zelle / Binance)',
            description: 'Si aceptas Binance Pay o transferencias, ingresa tu Pay ID o correo para agilizar cobros.',
          },
        ],
        proTip:
          'Tus clientes verán estos datos bancarios automáticamente cuando reserven citas por tu enlace o cuando tus cajeros emitan tickets.',
      },
      {
        id: 'brand_modules',
        label: '🎨 Marca y Módulos',
        concept: 'Personaliza la apariencia y apaga módulos que tu negocio no necesite.',
        steps: [
          {
            stepNumber: 1,
            title: 'Sube tu Logotipo y Elige tu Color',
            description: 'Elige el color primario de tu empresa y sube tu logo. Toda la app y tu catálogo público adoptarán tus colores.',
          },
          {
            stepNumber: 2,
            title: 'Simplifica tu Menú Desactivando Módulos',
            description: 'Si tu negocio solo presta servicios (como un spa), desactiva "Recetas" y "Delivery" para tener una interfaz limpia y rápida.',
          },
        ],
        proTip:
          'Un menú más corto y enfocado en tu rubro hace que tus colaboradoras aprendan a usar la app en menos de 5 minutos.',
      },
      {
        id: 'referrals',
        label: '🎁 Programa de Referidos',
        concept: 'Gana meses gratis de FinoWork recomendando la plataforma a colegas.',
        steps: [
          {
            stepNumber: 1,
            title: 'Copia tu Enlace Único de Invitación',
            description: 'En Ajustes > Mi Suscripción encontrarás tu código y enlace personal de recomendación.',
          },
          {
            stepNumber: 2,
            title: 'Gana Beneficios Automáticos',
            description: 'Cuando otro comercio se registre con tu enlace y active su suscripción, recibirás meses gratuitos acreditados a tu cuenta.',
          },
        ],
        proTip:
          'Muchos de nuestros usuarios disfrutan de FinoWork 100% gratis gracias a sus recomendaciones.',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Verifica tu Tasa de Cambio',
        description: 'Elige entre BCV automática o tasa manual.',
      },
      {
        stepNumber: 2,
        title: 'Completa tus Datos Bancarios',
        description: 'Configura tu Pago Móvil para que aparezca en comprobantes.',
      },
      {
        stepNumber: 3,
        title: 'Personaliza tu Marca',
        description: 'Sube tu logo y apaga los módulos que no vayas a usar.',
      },
    ],
    proTip:
      'Revisa la pestaña de "Ajustes de Citas" para afinar la duración de los intervalos de reserva y si requieres abono previo.',
    relatedRoutes: ['/settings'],
  },

  users: {
    key: 'users',
    title: 'Equipo, Nómina y Permisos',
    subtitle: 'Gestión de personal, roles con seguridad, esquemas de comisiones y adelantos',
    category: 'Seguridad & Equipo',
    icon: personAddOutline,
    concept:
      'Controla los accesos de tus empleados: crea usuarios con roles específicos (cajeros, especialistas, administradores) protegiendo tus datos financieros privados, calcula comisiones automáticas y gestiona vales de nómina.',
    bestFor: 'Negocios con colaboradores, recepcionistas, cajeros y especialistas.',
    tabs: [
      {
        id: 'roles',
        label: '🔐 Roles y Seguridad',
        concept: 'Protege la privacidad de tus finanzas asignando permisos específicos.',
        steps: [
          {
            stepNumber: 1,
            title: 'Crea la Cuenta para tu Colaborador',
            description: 'Presiona "Invitar Usuario", coloca nombre, correo y asígnale una clave inicial.',
          },
          {
            stepNumber: 2,
            title: 'Asigna el Rol Adecuado',
            description: 'Usa POS para cajeros (solo ven cobrar), INVENTORY para almacén o ADMIN para socios con acceso a todo.',
            keyDetail: 'Los roles POS y DELIVERY no pueden ver balances bancarios ni reportes de ganancias.',
          },
          {
            stepNumber: 3,
            title: 'Activa o Pausa Accesos al Instante',
            description: 'Si un colaborador deja de trabajar en tu negocio, desactiva su cuenta con 1 clic sin borrar su historial de ventas ni citas atendidas.',
          },
        ],
        proTip:
          'Nunca compartas tu clave de Admin principal. Cada colaboradora debe tener su propio usuario para auditar quién cobró o atendió cada servicio.',
      },
      {
        id: 'commissions',
        label: '💼 Comisiones y Liquidación',
        concept: 'Calcula automáticamente cuánto debes pagarle a cada colaboradora por sus servicios.',
        steps: [
          {
            stepNumber: 1,
            title: 'Elige el Esquema de Compensación',
            description: 'Al editar al usuario, elige entre: Sueldo FIJO, 100% Por COMISIÓN (% de cada servicio/venta) o MIXTO (Sueldo base + %).',
            keyDetail: 'En estética y salones, el esquema por comisión es el más utilizado.',
          },
          {
            stepNumber: 2,
            title: 'El Sistema Acumula las Comisiones',
            description: 'Cada vez que se atiende y cobra un servicio donde la colaboradora fue asignada, el sistema calcula su comisión ganada.',
          },
          {
            stepNumber: 3,
            title: 'Liquida y Marca como Pagado',
            description: 'Al llegar el día de pago, abre "Liquidar Comisiones", verifica el total acumulado y presiona "Marcar Liquidado".',
          },
        ],
        proTip:
          'Esto ahorra horas de cálculo en cuadernos y elimina discusiones con el personal sobre cuánto cobró cada quien.',
      },
      {
        id: 'advances',
        label: '💵 Vales y Adelantos de Sueldo',
        concept: 'Controla salidas de dinero por anticipos dados al personal.',
        steps: [
          {
            stepNumber: 1,
            title: 'Registra un Adelanto desde la Ficha',
            description: 'Si una colaboradora te pide $20 de anticipo a mitad de semana, presiona "Adelanto de Sueldo / Vale".',
          },
          {
            stepNumber: 2,
            title: 'Salida de Caja Automática',
            description: 'El dinero se descuenta de tu gaveta física o banco según cómo se lo hayas entregado.',
          },
          {
            stepNumber: 3,
            title: 'Deducción Automática en Nómina',
            description: 'Al liquidar su pago de quincena o comisiones, el sistema restará el adelanto automáticamente.',
          },
        ],
        proTip:
          'Llevar los vales en FinoWork evita que olvides descontar adelantos al final de mes.',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Crea una Cuenta para tu Colaborador',
        description: 'Presiona "Invitar Usuario", coloca nombre, correo y clave.',
      },
      {
        stepNumber: 2,
        title: 'Configura su Esquema de Sueldo o Comisión',
        description: 'Define si gana sueldo fijo o porcentaje por servicio realizado.',
      },
      {
        stepNumber: 3,
        title: 'Asígnala a los Servicios en el Catálogo',
        description: 'Marca qué servicios puede atender para que aparezca en la agenda de citas.',
        actionLabel: 'Ver Servicios',
        actionPath: '/products',
      },
    ],
    proTip:
      'Revisa los horarios de trabajo de tu equipo para que tus colaboradoras tengan claras sus horas de entrada, salida y almuerzo.',
    relatedRoutes: ['/users'],
  },
};

/**
 * Obtiene la guía adecuada según el pathname actual o la clave indicada
 */
export function getGuideForRoute(pathname: string): ModuleGuideContent | null {
  if (!pathname) return null;
  const cleanPath = pathname.toLowerCase().split('?')[0];

  for (const guide of Object.values(MODULE_GUIDES)) {
    if (guide.relatedRoutes.some(route => cleanPath === route || cleanPath.startsWith(`${route}/`))) {
      return guide;
    }
  }

  return null;
}
