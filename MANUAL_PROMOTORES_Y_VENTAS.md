# Manual de Campo y Flujos Operativos: Promotores FinoWork

Este documento constituye la guía oficial de formación comercial, técnica y operativa para el equipo de promotores de **FinoWork**.

> Nota de Impresión: Puedes abrir en tu navegador el archivo `manual-promotores.html` (o acceder a `https://tu-dominio/manual-promotores.html`) y presionar **Ctrl + P (Imprimir -> Guardar como PDF)** para obtener el folleto completo maquetado con el logo oficial y todas las capturas de pantalla de los flujos.

---

## 1. El Modelo de Negocio: Escalera de Rangos y Comisiones Reales

En FinoWork el promotor construye una cartera de ingresos mensuales recurrentes en dólares vinculada a sus comercios afiliados.

* **Cuota Oficial Base del Comercio:** **$20.00 USD / mes** (o **$200.00 USD / año** con descuento de dos meses).
* **Comisión de Activación (Primer cobro por comercio):**
  * Se genera en el momento en que el comercio referido completa sus 15 días de prueba gratuita y procesa su primer pago formal.
  * En una mensualidad de **$20.00 USD**, recibes de inmediato el **10% ($2.00 USD)** en Nivel Bronce.
  * En una anualidad de **$200.00 USD**, recibes **$20.00 USD** en un solo desembolso (10% en Bronce) o hasta **$40.00 USD** (20% en Oro).
  * *Bono de Bienvenida:* Tu primera activación desbloquea el Nivel Bronce y un bono complementario de **$10.00 USD**, totalizando **$12.00 USD en tu primer cliente**.
* **Comisión Recurrente (Ingreso mensual continuo):**
  * Todos los meses subsiguientes en los que el comercio renueva su cuota de $20 USD, recibes de forma automática el **10% ($2.00 USD/mes)** en Bronce.
  * Al alcanzar 50 comercios activos asciendes a Plata con **15% ($3.00 USD/mes)**.
  * Con 100 comercios activos asciendes a Oro con **20% ($4.00 USD/mes)** por cada negocio.

### Escalera Oficial de Rangos y Ganancias por Comercio:
| Nivel Oficial | Comercios Activos | % Comisión | Comisión por Mensualidad ($20) | Comisión por Anualidad ($200) | Bono de Ascenso |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Madera** | 0 comercios | **10%** | $2.00 USD | $20.00 USD | $0.00 USD |
| **Bronce** | 1 a 49 comercios | **10%** | **$2.00 USD / mes** | **$20.00 USD** | **+$10.00 USD** |
| **Plata** | 50 a 99 comercios | **15%** | **$3.00 USD / mes** | **$30.00 USD** | **+$25.00 USD** |
| **Oro** | 100+ comercios | **20%** | **$4.00 USD / mes** | **$40.00 USD** | **+$50.00 USD** |

### Proyección Mensual Recurrente del Promotor:
| Comercios Activos | Nivel | Cálculo Mensual | Ingreso Mensual Recurrente |
| :--- | :--- | :--- | :--- |
| **10 comercios** | Bronce (10%) | 10 x $2.00 USD | **$20.00 USD / mes** |
| **25 comercios** | Bronce (10%) | 25 x $2.00 USD | **$50.00 USD / mes** |
| **50 comercios** | Plata (15%) | 50 x $3.00 USD + $25 bono | **$175.00 USD / mes** |
| **80 comercios** | Plata (15%) | 80 x $3.00 USD | **$240.00 USD / mes** |
| **100 comercios** | Oro (20%) | 100 x $4.00 USD + $50 bono | **$450.00 USD / mes** |
| **150 comercios** | Oro (20%) | 150 x $4.00 USD | **$600.00 USD / mes** |

### Canales de Liquidación Oficial:
En tu panel de promotor (`/promoter`), configuras tus datos de retiro:
* **Pago Móvil:** Teléfono, Cédula y Banco (bolívares calculados a la tasa oficial del día).
* **Binance Pay:** USDT directo a tu Binance Pay ID.

---

## 2. Flujo 1: Punto de Venta (POS) y Caja Física

1. **Pantalla Principal de POS (`pos-catalog-desktop.png`):**
   * Visualización táctil de productos con fotos, precios en dólares y conversión automática a bolívares a tasa oficial.
   * Barra superior con indicador de conectividad y tasa BCV activa.
   * Carrito flotante con resumen acumulado.
2. **Resumen y Entrega Inmediata (`pos-order-summary.png`):**
   * Desglose de productos seleccionados con cantidades y ajuste rápido.
   * Opción de Entrega Inmediata para despejar pedidos que no requieren comanda de preparación.
3. **Buscador de Clientes y Descuentos (`pos-customer-discount.png`):**
   * Búsqueda por cédula o teléfono para autocompletar clientes recurrentes.
   * Asignación a empleado para control de comisiones de nómina.
   * Descuentos en monto fijo o porcentaje.
4. **Cobro Multimoneda (`pos-payment-methods.png`):**
   * Pago Móvil con banco emisor y número de referencia.
   * Efectivo en dólares o bolívares con cálculo de vuelto exacto.
   * Cuenta Abierta para registro de abonos parciales.

---

## 3. Flujo 2: Tienda Online Pública y Pedidos Web

Cada negocio dispone de su propio enlace web (`/public/store`):

1. **Catálogo Digital (`store-catalog-public.png`):**
   * Menú digital con filtro por categorías y buscador en tiempo real.
2. **Carrito y Modalidad de Entrega (`store-cart-checkout.png`):**
   * Selección entre Retiro en Tienda (gratuito) o Envío a Domicilio (delivery).
3. **Apartado de Inventario en Tiempo Real (`store-customer-form.png`):**
   * Formulario de contacto con autocompletado por Cédula / RIF.
   * Bloqueo temporal del stock para garantizar disponibilidad durante el pago.
4. **Reporte de Pago Móvil del Cliente (`store-pagomovil-modal.png`):**
   * Datos bancarios del comercio con botón para copiar el monto exacto en bolívares.

---

## 4. Flujo 3: Citas y Reservaciones Online (Servicios)

Orientado a barberías, peluquerías, salones de estética, spas y consultorios (`/public/reservations`):

1. **Selección Multi-Servicio (`booking-service-selection.png`):**
   * Selección de múltiples tratamientos sumando duración y monto total de forma coordinada.
2. **Calendario y Turnos Disponibles (`booking-calendar-date.png`, `booking-time-slots.png`):**
   * Calendario interactivo con bloqueo de días no laborables o turnos ocupados.
3. **Reserva con Cuenta Abierta (`booking-open-tab-confirm.png`):**
   * Opción de confirmar la cita con pago presencial al momento de la atención.
4. **Portal Privado de Autogestión (`booking-client-portal.png`):**
   * Enlace exclusivo del cliente con opciones para compartir en WhatsApp, reprogramar y recibir notificaciones Web Push.

---

## 5. Flujo 4: Control Financiero, Arqueo y Libro de Ventas

1. **Tesorería y Fondos Reales (`treasury-real-funds.png`):**
   * Patrimonio líquido total desglosado en Gaveta Física (USD) y Cuentas Bancarias Nacionales (Bs).
2. **Arqueo Mensual Detallado (`monthly-arqueo-kpis.png`):**
   * Facturado, Cobrado Real (DEBE), Gastos (HABER) y Ganancia Neta libre del mes, con exportación a Excel.
3. **Libro de Ventas Fiscal (`fiscal-sales-book-table.png`):**
   * Registro administrativo oficial de control de IVA con Nº Factura, Nº Control, Base Imponible y Débito Fiscal 16%.
4. **Arqueo Diario de Caja (`cash-close-drawer-modal.png`, `cash-close-whatsapp-report.png`):**
   * Declaración de base inicial y cuadre por métodos de pago con botón de copia directa para WhatsApp.

---

## 6. Guion de Calle: El Pitch de 2 Minutos

* **Paso 1 (Identificación del Problema Operativo):**
  > "Buenas tardes. Una consulta rápida: ¿cuánto tiempo invierten tú o tus cajeros calculando el vuelto en bolívares con la tasa del BCV o cuando un cliente paga una parte en dólares en efectivo y el resto por pago móvil?"
* **Paso 2 (Demostración Práctica):**
  > "Observa la pantalla un momento. Selecciono dos productos de $18 y $25. Total: $43. El cliente entrega $50 en efectivo. Al presionar cobrar, el sistema indica de inmediato: 'Vuelto: $7.00 o Bs. 6,216.84 a tasa oficial'. Todo exacto. Además, si se interrumpe la electricidad o la conexión, el punto de venta continúa operando sin conexión mediante su base de datos local."
* **Paso 3 (Cierre con Período de Prueba):**
  > "Te habilito el sistema de prueba durante 15 días en tu teléfono o computadora sin costo alguno. Pruebas la cuota oficial base de $20 al mes en tu propio mostrador. Si al término de la semana no te optimiza la cobranza, simplemente no continúas. ¿A qué correo te vinculo la cuenta?"

---

## 7. Protocolo de Seguimiento y Plantillas de WhatsApp

Tu panel de promotor (`/promoter`) incluye cuatro plantillas preconfiguradas para dar seguimiento profesional a tus comercios:
1. **Encuesta de Satisfacción:** Seguimiento tras los primeros tres días para apoyar con el catálogo.
2. **Acompañamiento en Prueba:** Recordatorio de días restantes de prueba con oferta de asesoría técnica.
3. **Recordatorio de Renovación:** Aviso preventivo previo al vencimiento de la cuota mensual de $20 USD.
4. **Recuperación de Inactivos:** Reactivación de comercios con ofertas y asistencia directa.
