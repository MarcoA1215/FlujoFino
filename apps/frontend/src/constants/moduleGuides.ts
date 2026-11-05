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
  actionLabel?: string;
  actionPath?: string;
}

export interface ModuleGuideContent {
  key: ModuleGuideKey;
  title: string;
  subtitle: string;
  category: string;
  icon: string;
  concept: string;
  bestFor: string;
  steps: GuideStep[];
  proTip: string;
  relatedRoutes: string[];
}

export const MODULE_GUIDES: Record<ModuleGuideKey, ModuleGuideContent> = {
  reservations: {
    key: 'reservations',
    title: 'Citas y Reservaciones',
    subtitle: 'Agenda inteligente y auto-agendamiento para clientas',
    category: 'Servicios & Agenda',
    icon: calendarOutline,
    concept:
      'Controla tu agenda diaria de citas, visualiza tus horas ocupadas y permite que tus clientas agenden solas desde un enlace público de WhatsApp o Instagram.',
    bestFor: 'Spas, estéticas, barberías, micropigmentación (PMU), manicura y servicios por cita.',
    steps: [
      {
        stepNumber: 1,
        title: 'Configura tus Servicios y Horarios',
        description: 'En Ajustes > Citas, define tus días de atención, duración de citas (ej. 30 o 60 min) y lista de servicios con sus precios.',
        actionLabel: 'Ir a Ajustes de Citas',
        actionPath: '/settings',
      },
      {
        stepNumber: 2,
        title: 'Comparte tu Enlace Público',
        description: 'Copia tu enlace personalizado de auto-reserva y colócalo en tu biografía de Instagram o envíalo por WhatsApp.',
      },
      {
        stepNumber: 3,
        title: 'Gestiona y Cobra tus Turnos',
        description: 'Cuando una clienta reserve, aparecerá aquí. Puedes confirmar la cita, marcarla como atendida o cobrarla al instante.',
      },
    ],
    proTip:
      'Si tienes alta demanda o inasistencias, activa "Solicitar Abono Previo" en Ajustes para exigir comprobante de Pago Móvil antes de apartar el turno.',
    relatedRoutes: ['/reservations'],
  },

  pos: {
    key: 'pos',
    title: 'Punto de Venta (POS)',
    subtitle: 'Cobros rápidos multimoneda y comprobantes en segundos',
    category: 'Ventas y Caja',
    icon: cartOutline,
    concept:
      'Tu caja registradora ultrarrápida. Vende productos o servicios en mostrador, calcula vueltos exactos en dólares o bolívares y registra pagos combinados.',
    bestFor: 'Cobros en mostrador, ventas rápidas de productos y servicios presenciales.',
    steps: [
      {
        stepNumber: 1,
        title: 'Selecciona Productos o Servicios',
        description: 'Toca los ítems de tu catálogo o búscalos por nombre. Puedes cambiar cantidades con un toque.',
      },
      {
        stepNumber: 2,
        title: 'Elige el Método de Pago',
        description: 'Acepta Efectivo USD, Pago Móvil, Punto de Venta, Bolívares Efectivo o pagos mixtos (parte en divisas y parte en Bs).',
      },
      {
        stepNumber: 3,
        title: 'Genera el Recibo y Cierra',
        description: 'El sistema calcula el vuelto exacto a la tasa del día y genera un comprobante digital listo para enviar por WhatsApp.',
      },
    ],
    proTip:
      'Puedes usar el botón superior de "Cierre de Caja" al final de tu jornada para ver cuánto dinero exacto debe haber en tu gaveta física y en tus bancos.',
    relatedRoutes: ['/pos'],
  },

  products: {
    key: 'products',
    title: 'Catálogo de Productos',
    subtitle: 'Inventario, precios, variantes y catálogo público',
    category: 'Inventario & Catálogo',
    icon: cubeOutline,
    concept:
      'Administra todo lo que vendes: productos físicos (shampoo, esmaltes, ropa) o servicios profesionales, controlando existencias y costos.',
    bestFor: 'Negocios con stock físico, tiendas minoristas, mayoristas o salones con venta de productos.',
    steps: [
      {
        stepNumber: 1,
        title: 'Crea tu Primer Producto',
        description: 'Presiona "Nuevo Producto", asigna nombre, categoría, precio de venta en USD y costo de adquisición.',
      },
      {
        stepNumber: 2,
        title: 'Configura Variantes o Tonos',
        description: 'Si tu producto tiene tallas, colores o presentaciones diferentes, agrégalas como variantes con su propio stock.',
      },
      {
        stepNumber: 3,
        title: 'Activa tu Catálogo Público',
        description: 'Marca la casilla "Mostrar en Catálogo Web" para que tus clientes puedan ver tus productos en línea sin que tengas que enviar fotos.',
      },
    ],
    proTip:
      'Mantén actualizado el costo de cada producto para que el Dashboard calcule con total exactitud tu ganancia neta real en cada venta.',
    relatedRoutes: ['/products'],
  },

  orders: {
    key: 'orders',
    title: 'Órdenes y Pedidos',
    subtitle: 'Seguimiento de encargos, abonos parciales y entregas',
    category: 'Ventas y Operaciones',
    icon: receiptOutline,
    concept:
      'El centro de control para pedidos que no se entregan de inmediato: pedidos por encargo, trabajos personalizados o entregas a domicilio.',
    bestFor: 'Pedidos por encargo, confecciones, pastelería, encargos con abono y ventas para llevar.',
    steps: [
      {
        stepNumber: 1,
        title: 'Registra el Encargo con Abono',
        description: 'Crea el pedido registrando el abono inicial que te dio el cliente (ej. 50% de anticipo).',
      },
      {
        stepNumber: 2,
        title: 'Cambia el Estado de Producción',
        description: 'Mueve el pedido entre "Pendiente", "En Preparación" y "Listo para Entrega" para mantener a tu equipo sincronizado.',
      },
      {
        stepNumber: 3,
        title: 'Cobra el Saldo Restante',
        description: 'Al momento de entregar el producto, registra el pago del saldo pendiente con cualquier método.',
      },
    ],
    proTip:
      'Puedes filtrar las órdenes por "Pendientes de Cobro" para saber exactamente cuánto dinero tienes en la calle por cobrar.',
    relatedRoutes: ['/orders'],
  },

  customers: {
    key: 'customers',
    title: 'Directorio de Clientes',
    subtitle: 'Historial de compras, saldos pendientes y fidelización',
    category: 'Clientes y Relaciones',
    icon: peopleOutline,
    concept:
      'Conoce quiénes son tus mejores clientes, cuánto te compran, si tienen saldo deudor pendiente y envíales mensajes directos de WhatsApp con 1 clic.',
    bestFor: 'Fidelización, cuentas por cobrar (crédito/fiado) y marketing personalizado.',
    steps: [
      {
        stepNumber: 1,
        title: 'Registra o Importa Clientes',
        description: 'Agrega a tus clientas con su nombre, teléfono y cédula. Al vender en el POS o recibir citas se guardan automáticamente.',
      },
      {
        stepNumber: 2,
        title: 'Revisa su Historial',
        description: 'Haz clic en cualquier cliente para ver todas las compras que ha hecho, fechas de visita y notas de servicio.',
      },
      {
        stepNumber: 3,
        title: 'Comunícate por WhatsApp',
        description: 'Usa el botón de WhatsApp junto al cliente para saludarlo o recordarle su saldo pendiente sin guardar su número en tu agenda.',
      },
    ],
    proTip:
      'Utiliza la sección de "Saldos Pendientes" para cobrar con cortesía a los clientes que tienen pagos a crédito o entregas pendientes.',
    relatedRoutes: ['/customers'],
  },

  dashboard: {
    key: 'dashboard',
    title: 'Dashboard Financiero',
    subtitle: 'El estado de salud de tu negocio en tiempo real',
    category: 'Analítica y Tesorería',
    icon: statsChartOutline,
    concept:
      'Tu panel de mando ejecutivo: visualiza cuánto dinero real hay en tu caja física, en tus cuentas bancarias en bolívares, ventas del mes y ganancias netas.',
    bestFor: 'Dueños de negocio y administradores para toma de decisiones y arqueo de dinero.',
    steps: [
      {
        stepNumber: 1,
        title: 'Configura tus Saldos Iniciales',
        description: 'En el bloque de Tesorería, toca "Ajustar Saldo" para declarar con cuánto efectivo y saldo en banco arrancas.',
      },
      {
        stepNumber: 2,
        title: 'Monitorea tus Ventas y Ganancias',
        description: 'Revisa tus ingresos facturados, cobrados y los gastos operativos del mes para conocer tu margen neto real.',
      },
      {
        stepNumber: 3,
        title: 'Toca Cualquier Métrica para Saber Más',
        description: 'Cada tarjeta tiene una explicación detallada con su fórmula y fuentes de datos al hacerle clic.',
      },
    ],
    proTip:
      'Si recibes bolívares por Pago Móvil o Punto y compras dólares en efectivo, usa el botón "Comprar USD / Proteger Bs" para mantener tu arqueo cuadrado.',
    relatedRoutes: ['/dashboard'],
  },

  raw_materials: {
    key: 'raw_materials',
    title: 'Materia Prima e Insumos',
    subtitle: 'Control de stock y costos de insumos para tus servicios o productos',
    category: 'Insumos & Costos',
    icon: flaskOutline,
    concept:
      'Lleva el inventario de los materiales que compras para trabajar (esmaltes, pestañas, pigmentos, harinas, telas, empaques) y su costo por unidad.',
    bestFor: 'Spas, peluquerías, panaderías, talleres de confección y negocios de manufactura.',
    steps: [
      {
        stepNumber: 1,
        title: 'Registra tus Insumos',
        description: 'Crea cada material especificando la unidad de medida (gramos, mililitros, unidades, metros).',
      },
      {
        stepNumber: 2,
        title: 'Ingresa el Costo de Compra',
        description: 'Coloca cuánto te cuesta comprar el insumo y su cantidad de paquete para que el sistema calcule el costo unitario.',
      },
      {
        stepNumber: 3,
        title: 'Define un Stock Mínimo',
        description: 'Establece alertas automáticas para que el sistema te avise antes de que se te agote un material crítico.',
      },
    ],
    proTip:
      'Al registrar tus compras de insumos, también puedes registrarlas como un Gasto Operativo para que se descuente de tu caja bancaria o en efectivo.',
    relatedRoutes: ['/raw-materials'],
  },

  production: {
    key: 'production',
    title: 'Producción y Recetas',
    subtitle: 'Costos unitarios exactos y consumo automático de insumos',
    category: 'Producción & Rendimiento',
    icon: constructOutline,
    concept:
      'Conecta tus materias primas con tus productos terminados. Define la receta o ficha técnica de cada producto y conoce cuánto te cuesta producirlo.',
    bestFor: 'Restaurantes, reposterías, fabricantes y servicios con consumo estandarizado de materiales.',
    steps: [
      {
        stepNumber: 1,
        title: 'Crea la Receta de un Producto',
        description: 'Selecciona el producto y agrega los insumos que utiliza con sus cantidades exactas.',
      },
      {
        stepNumber: 2,
        title: 'Conoce tu Margen de Ganancia Real',
        description: 'FinoWork sumará automáticamente el costo de cada insumo y te mostrará el costo unitario contra tu precio de venta.',
      },
      {
        stepNumber: 3,
        title: 'Registra Lotes de Fabricación',
        description: 'Al fabricar un lote, el sistema descontará la materia prima de tu almacén e incrementará el stock del producto listo.',
      },
    ],
    proTip:
      'Si sube el precio de un insumo, el costo de todos los productos asociados se actualizará automáticamente sin que tengas que recalcular nada.',
    relatedRoutes: ['/production'],
  },

  delivery: {
    key: 'delivery',
    title: 'Delivery y Despacho',
    subtitle: 'Tarifas fijas por zona y despacho ordenado con repartidores',
    category: 'Logística & Despacho',
    icon: carOutline,
    concept:
      'Organiza tus entregas a domicilio, define costos de envío por zonas o municipios y asigna pedidos a tus repartidores en tiempo real.',
    bestFor: 'Restaurantes, comida rápida, tiendas con envío propio y negocios de mensajería.',
    steps: [
      {
        stepNumber: 1,
        title: 'Configura tus Zonas de Envío',
        description: 'En "Zonas de Delivery", crea tus sectores frecuentes con su tarifa fija de despacho en USD.',
        actionLabel: 'Ir a Zonas de Delivery',
        actionPath: '/delivery-zones',
      },
      {
        stepNumber: 2,
        title: 'Asigna Repartidores',
        description: 'Desde el panel de pedidos, asigna qué repartidor llevará cada paquete con su dirección y teléfono.',
      },
      {
        stepNumber: 3,
        title: 'Monitorea el Estado en Calle',
        description: 'Marca los pedidos "En Ruta" y "Entregado", confirmando si el cliente ya pagó o si el repartidor debe cobrar en efectivo.',
      },
    ],
    proTip:
      'Tus repartidores pueden tener un usuario con rol DELIVERY para ver únicamente sus pedidos asignados en su teléfono móvil sin ver la caja.',
    relatedRoutes: ['/delivery-panel', '/delivery-zones'],
  },

  calculator: {
    key: 'calculator',
    title: 'Calculadora de Precios',
    subtitle: 'Fijación de precios científicos considerando costos fijos y margen',
    category: 'Finanzas y Costos',
    icon: calculatorOutline,
    concept:
      'Deja de adivinar precios. Calcula el precio de venta ideal de tus productos o servicios considerando alquiler, luz, nómina, materiales y tu ganancia deseada.',
    bestFor: 'Emprendedores y negocios que desean fijar precios rentables y calcular su punto de equilibrio.',
    steps: [
      {
        stepNumber: 1,
        title: 'Declara tus Costos Fijos',
        description: 'Ingresa los gastos mensuales que pagas sí o sí (alquiler del local, internet, sueldos base, servicios).',
      },
      {
        stepNumber: 2,
        title: 'Ingresa los Costos Variables',
        description: 'Coloca el costo de insumos, materiales y empaques utilizados para crear una unidad de tu producto o servicio.',
      },
      {
        stepNumber: 3,
        title: 'Establece tu Margen Neto',
        description: 'Elige qué porcentaje de ganancia neta deseas (ej. 30%, 40% o 50%) para obtener el precio de venta recomendado.',
      },
    ],
    proTip:
      'El punto de equilibrio te dirá cuántas ventas o servicios necesitas hacer cada mes sólo para cubrir costos antes de empezar a ganar dinero.',
    relatedRoutes: ['/calculator'],
  },

  settings: {
    key: 'settings',
    title: 'Configuración y Ajustes',
    subtitle: 'El corazón de tu negocio: monedas, cuentas y personalización',
    category: 'Administración',
    icon: settingsOutline,
    concept:
      'Configura la identidad de tu marca, activa o apaga módulos según tu rubro, selecciona la tasa de cambio en bolívares/pesos y define tus datos bancarios.',
    bestFor: 'Propietarios para configurar la operación completa del negocio.',
    steps: [
      {
        stepNumber: 1,
        title: 'Ajusta tu Tasa de Cambio',
        description: 'Elige entre Tasa Oficial BCV automática, Paralelo o una Tasa Manual personalizada para tus cobros.',
      },
      {
        stepNumber: 2,
        title: 'Ingresa tus Datos de Pago Móvil',
        description: 'Coloca banco, cédula y teléfono de tu cuenta para que tus clientes y cajeros los vean claramente en comprobantes y links.',
      },
      {
        stepNumber: 3,
        title: 'Personaliza los Colores y Logo',
        description: 'Sube tu logo y elige el color primario de tu marca. Toda la aplicación y tu catálogo público se adaptarán a tu estilo.',
      },
    ],
    proTip:
      'Si tu negocio es únicamente de servicios (como un spa o barbería), desactiva "Módulo de Recetas" y "Módulo Delivery" para que el menú quede mucho más limpio.',
    relatedRoutes: ['/settings'],
  },

  users: {
    key: 'users',
    title: 'Equipo y Accesos',
    subtitle: 'Invita a tus colaboradores y protege tus datos privados',
    category: 'Seguridad & Equipo',
    icon: personAddOutline,
    concept:
      'Controla quién tiene acceso a FinoWork. Otorga permisos específicos para que tus cajeros o encargados cobren sin ver tus balances bancarios privados.',
    bestFor: 'Negocios con empleados, recepcionistas, cajeros o socios.',
    steps: [
      {
        stepNumber: 1,
        title: 'Crea una Cuenta para tu Colaborador',
        description: 'Presiona "Invitar Usuario", coloca su nombre, correo y asígnale una contraseña temporal.',
      },
      {
        stepNumber: 2,
        title: 'Selecciona el Rol Adecuado',
        description: 'Usa POS para cajeros (solo ven cobrar), INVENTORY para bodegueros o ADMIN para administradores con acceso completo.',
      },
      {
        stepNumber: 3,
        title: 'Activa o Desactiva Accesos al Instante',
        description: 'Si un colaborador deja de trabajar en tu negocio, puedes desactivar su cuenta con un solo interruptor sin borrar su historial.',
      },
    ],
    proTip:
      'Nunca compartas tu clave de Admin principal con el personal. Cada empleado debe tener su propio usuario para auditar quién registró cada venta.',
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
