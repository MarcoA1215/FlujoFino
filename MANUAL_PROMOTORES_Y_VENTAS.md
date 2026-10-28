# 📗 GUÍA MAESTRA DE CAMPO Y FLUJOS OPERATIVOS: PROMOTORES FINOWORK

Este documento es el manual oficial de formación comercial, técnica y operativa para el equipo de promotores de **FinoWork**.

> 💡 **Versión imprimible y gráfica en PDF:** Puedes abrir en cualquier navegador el archivo `manual-promotores.html` (o en `https://tu-dominio/manual-promotores.html`) y presionar **Ctrl + P (Imprimir -> Guardar como PDF)** para obtener el folleto completo a todo color con todas las capturas de pantalla reales maquetadas editorialmente.

---

## 1. 💰 EL MODELO DE NEGOCIO: ESCALERA DE RANGOS Y COMISIONES REALES

En FinoWork el promotor no cobra una comisión aislada de una sola vez. Construye una **cartera de ingresos mensuales recurrentes en dólares**.

* **Cuota Oficial Base del Comercio:** **$20.00 USD / mes**.
* **Comisión de Activación:** Se genera la primera vez que el negocio referido paga su suscripción tras el periodo de prueba.
* **Comisión Recurrente:** Se genera todos los meses siguientes en los que el comercio renueva su cuota de $20 USD.

### 🧗 Escalera Oficial de Rangos (Según clientes activos en el mes):
| Rango Oficial | Comercios Activos | % Comisión | Ganancia por Comercio | Bono Extra de Rango |
| :--- | :--- | :--- | :--- | :--- |
| **🪵 Madera** | 0 comercios | **10%** | $2.00 USD | $0.00 USD |
| **🥉 Bronce** | 1 a 49 comercios | **10%** | **$2.00 USD / mes** | **+$10.00 USD** |
| **🥈 Plata** | 50 a 99 comercios | **15%** | **$3.00 USD / mes** | **+$25.00 USD** |
| **🥇 Oro** | 100+ comercios | **20%** | **$4.00 USD / mes** | **+$50.00 USD** |

### 📈 Tabla de Proyección de Ganancias Reales del Promotor:
| Comercios Activos | Rango | Cálculo Mensual | Ingreso Mensual Recurrente |
| :--- | :--- | :--- | :--- |
| **10 comercios** | 🥉 Bronce (10%) | 10 x $2.00 USD | **$20.00 USD / mes** |
| **25 comercios** | 🥉 Bronce (10%) | 25 x $2.00 USD | **$50.00 USD / mes** |
| **50 comercios** | 🥈 Plata (15%) | 50 x $3.00 USD + $25 bono | **$175.00 USD / mes** |
| **80 comercios** | 🥈 Plata (15%) | 80 x $3.00 USD | **$240.00 USD / mes** |
| **100 comercios** | 🥇 Oro (20%) | 100 x $4.00 USD + $50 bono | **$450.00 USD / mes** |
| **150 comercios** | 🥇 Oro (20%) | 150 x $4.00 USD | **$600.00 USD / mes** |

### 🏦 Liquidación y Métodos de Cobro:
En el panel del promotor (`/promoter`), configuras tus datos de retiro:
* **Pago Móvil:** Teléfono, Cédula y Banco (recibes bolívares a la tasa oficial del día).
* **Binance Pay:** Recibes USDT directo a tu Binance Pay ID.

---

## 2. 🛒 FLUJO 1: PUNTO DE VENTA (POS) Y CAJA FÍSICA

1. **Pantalla Principal de POS (`pos-catalog-desktop.png`):**
   * Visualización táctil de productos con fotos, precios en **Dólares ($)** y conversión en vivo a **Bolívares (Bs a tasa oficial BCV)**.
   * Barra superior con indicador de conectividad (*"En línea"* o modo offline de contingencia) y tasa BCV activa.
   * Carrito flotante con resumen acumulado: *"3 items • $65.00 (Bs. 57.727,69) -> Cobrar"*.
2. **Resumen y Entrega Inmediata (`pos-order-summary.png`):**
   * Desglose de productos seleccionados con cantidades (+/-) y papelera de eliminación rápida.
   * Switch de **Entrega Inmediata**: al pagar, la orden se marca directamente como entregada sin saturar la comanda de cocina.
3. **Buscador de Clientes y Descuentos (`pos-customer-discount.png`):**
   * Buscador predictivo por número de cédula o teléfono para autocompletar clientes frecuentes.
   * Asignación a empleado (*"Atendido por"*) para el cálculo automático de comisiones de nómina.
   * Descuento especial en monto fijo ($) o porcentaje (%).
4. **Cobro Multimoneda y Métodos de Pago (`pos-payment-methods.png`):**
   * **Pago Móvil:** Registro con número de referencia y banco emisor (selector con buscador).
   * **Efectivo USD:** Registro de billetes entregados y cálculo de vuelto en dólares o bolívares.
   * **Efectivo Bs:** Cobro en moneda nacional.
   * **Cuenta Abierta (Abono / Por Pagar):** Permite registrar ventas a crédito o abonos parciales.

---

## 3. 🌐 FLUJO 2: TIENDA ONLINE PÚBLICA Y PEDIDOS POR WHATSAPP

Cada comercio afiliado cuenta con su propio enlace web (`/public/store`):

1. **Catálogo Digital Responsive (`store-catalog-public.png`):**
   * Menú digital con filtro interactivo por categorías (ej. Cosméticos, Comida, Bebidas).
   * Buscador en tiempo real de productos.
2. **Carrito de Compras y Tipo de Entrega (`store-cart-checkout.png`):**
   * Selector entre **Retiro en Tienda (Gratis)** o **Envío a Domicilio (Delivery)**.
3. **Protección de Stock en Tiempo Real (`store-customer-form.png`):**
   * Formulario de contacto con autocompletado por Cédula / RIF.
   * **Apartado Inmediato al Pagar:** Al pulsar pagar, el inventario se descuenta y se reserva para el cliente durante su proceso de pago.
4. **Reporte de Pago Móvil para el Cliente (`store-pagomovil-modal.png`):**
   * El cliente visualiza los datos bancarios del comercio, copia el monto exacto en bolívares con un clic y reporta los últimos dígitos de su transferencia.

---

## 4. 📅 FLUJO 3: CITAS Y RESERVAS ONLINE (PARA SERVICIOS)

Diseñado para barberías, peluquerías, salones de estética, spas y consultorios (`/public/reservations`):

1. **Selección Multi-Servicio (`booking-service-selection.png`):**
   * El cliente selecciona uno o varios tratamientos (ej. Drenaje Linfático + Limpieza Facial). El sistema acumula duración (105 min) y monto total ($58.00).
2. **Calendario y Turnos Disponibles (`booking-calendar-date.png`, `booking-time-slots.png`):**
   * Vista interactiva mensual de días hábiles.
   * Despliegue de bloques de horas disponibles basadas en la duración real de los servicios y especialistas calificados.
3. **Reserva Flexible con Cuenta Abierta (`booking-open-tab-confirm.png`):**
   * El cliente puede elegir **"Por pagar al asistir (Cuenta abierta)"**, eliminando la fricción de exigir pagos adelantados.
4. **Portal Privado de Autogestión (`booking-client-portal.png`):**
   * El cliente recibe un enlace privado con botones directos para **compartir en WhatsApp**, **reprogramar fecha** o **registrar abonos**.

---

## 5. 📊 FLUJO 4: CONTROL FINANCIERO, ARQUEO Y LIBRO DE VENTAS (SENIAT)

1. **Tesorería y Fondos Reales (`treasury-real-funds.png`):**
   * Muestra el **Patrimonio Líquido Total en Caja y Bancos**.
   * Separa con claridad:
     * **Gaveta Física USD:** Billetes reales en caja para vueltos.
     * **Bancos Venezuela (Cuentas Nacionales en Bs):** Dinero digital en cuentas bancarias por Pago Móvil o Punto.
2. **Arqueo Mensual y Ganancia Neta (`monthly-arqueo-kpis.png`):**
   * Desglose mensual: Facturado, Cobrado Real (DEBE), Por Cobrar, Gastos y Costos (HABER), y **Ganancia Neta (Utilidad libre del mes)**.
   * Exportación instantánea a Excel del libro contable.
3. **Libro de Ventas Fiscal (`fiscal-sales-book-summary.png`, `fiscal-sales-book-table.png`):**
   * Reporte administrativo oficial de control de IVA.
   * Tabla con: Nº Factura, Nº Control, RIF, Razón Social, Base Imponible y Débito Fiscal (IVA 16%).
   * Exportable a Excel (.xls) y CSV para el contador del negocio.
4. **Arqueo Diario de Gaveta y Cuadre por WhatsApp (`cash-close-drawer-modal.png`, `cash-close-whatsapp-report.png`):**
   * Declaración de base inicial de caja.
   * Cuadre de efectivo cobrado menos vueltos y egresos.
   * Botón **"Copiar Reporte para WhatsApp"**: envía un resumen profesional formateado al WhatsApp del dueño en 1 segundo.

---

## 6. 🗣️ EL PITCH DE VENTA DE 2 MINUTOS (GUION DE CALLE)

* **Minuto 0 (La Pregunta de Dolor):**
  > *"Buenas tardes, amigo. Una pregunta rápida: ¿cuánto tiempo pierden tú o tus cajeros calculando el vuelto en bolívares con la tasa del BCV o cuando un cliente te paga mitad en dólares y mitad en pago móvil?"*
* **Minuto 1 (La Demostración en el Teléfono):**
  > *"Mira mi teléfono un segundo. Toco dos productos de $18 y $25. Total: $43. El cliente me da $50 en efectivo. Le doy a cobrar y mira esto: la app me dice de inmediato: 'Vuelto: $7.00 o Bs. 6,216.84 a tasa BCV'. Todo al centavo. Y si ahorita mismo se nos corta la luz, la app sigue cobrando sin internet gracias a su base de datos offline."*
* **Minuto 2 (El Cierre Sin Riesgo):**
  > *"Te la instalo ahorita en tu propio teléfono o en tu computadora en 3 minutos. Te doy 15 días gratis para que la pruebes en tu mostrador con la cuota oficial base de $20 al mes. Si al final de la semana no te ahorró dolores de cabeza, la desinstalas y listo. ¿Cuál es tu correo para vincularte?"*

---

## 7. 📱 HERRAMIENTAS Y PLANTILLAS DE WHATSAPP DEL PROMOTOR

Dentro de tu panel (`/promoter`), cuentas con 4 plantillas automáticas de WhatsApp:
1. **Satisfacción:** Seguimiento a los 3 días de uso para resolver dudas y apoyar con el catálogo.
2. **Acompañamiento en Prueba (Trial):** Recordatorio de días restantes de prueba con oferta de asesoría.
3. **Cobro y Renovación Amigable:** Notificación preventiva cuando su cuota de $20 USD está por vencer con opciones de Pago Móvil y Binance.
4. **Recuperación de Inactivos:** Reactivación de comercios que pausaron sus operaciones.
