# Documento de Arquitectura, Innovación y Roadmap Técnico: FinoWork

**Proyecto:** FinoWork (Sistema de Gestión & POS Todo en Uno)  
**Titular:** Marco David Avila Pinto  
**Fecha:** Octubre 2026  
**Documento:** Propuesta de Arquitectura, Ciclo de Vida y Estrategia de Crecimiento  

---

## 1. Sincronización Offline-First con IndexedDB

### Desafío
Operaciones concurrentes de punto de venta (POS) y cierres de caja en escenarios de conectividad inestable o intermitente (3G / fallas eléctricas), evitando pérdida de transacciones y desajustes contables.

### Arquitectura Técnica
1. **Patrón Outbox + Event-Sourcing Append-Only:**
   - Las terminales no sincronizan estados calculados directos, sino transacciones/eventos inmutables (`ORDER_CREATED`, `PAYMENT_RECEIVED`, `SHIFT_CLOSED`).
   - Cada mutación almacena: `id` (UUIDv4), `tenantId`, `terminalId`, `shiftId`, `payload`, `clientTimestamp`, `retryCount` y `serverSyncedAt`.
2. **Correlativos Descentralizados:**
   - Numeración de tickets y comandas offline mediante esquema compuesto: `{TerminalID}-{DailySequence}` (ej. `CAJA1-0042`) para garantizar unicidad global sin depender de un autoincremento centralizado.
3. **Cierre de Caja Ciego (Blind Reconciliation):**
   - El arqueo físico declarado por el cajero en modo offline se envía como evento. El servidor calcula el saldo contable reconciliado a partir de las transacciones idempotentes acumuladas.
   - En caso de diferencia, genera un evento de ajuste `CASH_DISCREPANCY` (sobrante o faltante) manteniendo la pista de auditoría intacta.
4. **Motor de Sincronización:**
   - Procesamiento en lotes (`batching`) con reintentos basados en retroceso exponencial (`exponential backoff`) activado por el listener `navigator.onLine` y eventos de visibilidad de la app.

---

## 2. Retención, Ciclo de Vida de Tenants y Depuración Automática (Cron Jobs)

### Política de Términos de Uso y Datos
- **Día 0 (Vencimiento de Suscripción):** La cuenta pasa a estado `PAUSED`. Acceso restringido únicamente a la pasarela de pago (`/billing`) y al panel de descarga de respaldos (`/export`).
- **Días 1 a 45 (Periodo de Gracia):** Los datos permanecen intactos en modo solo lectura para exportación.
- **Día 46+ (Data Wiping):** Proceso seguro de purga de datos sin afectar el rendimiento del servidor multi-tenant.

### Implementación del Cron Job
1. **Detección y Transición de Estados:**
   - Tarea programada diaria que actualiza cuentas vencidas a `PAUSED`.
   - Consulta de tenants que superan los 45 días en gracia con `purgedAt: null`.
2. **Borrado por Lotes (Batch Cleanup):**
   - Eliminación en cascada particionada en bloques de 500 registros con `LIMIT` por tabla (`SaleItem`, `Sale`, `InventoryMovement`, `Ingredient`, `Product`, `Customer`, `Appointment`), evitando bloqueos de tabla (*table locks*) o sobrecarga en el Write-Ahead Log (WAL).
   - Marcado final del tenant como `PURGED` reteniendo únicamente trazas indispensables de facturación por auditoría legal.
3. **Servicio Asíncrono de Exportación:**
   - Generación de respaldos en `.csv` y `.xlsx` procesados como streams asíncronos con enlace de descarga temporal pre-firmado (TTL de 2 horas).

---

## 3. Micro-Módulos de Alto Valor (Nicho Restaurantes & Estética)

Propuestas para maximizar el valor de la suscripción de **$20 USD/mes**:

### Restaurantes y Cafeterías
- **Comanda Digital KDS (Kitchen Display System):**
  - Vista táctil para cocina con alerta sonora WebAudio API y 3 estados: *En Cola*, *En Preparación*, *Listo para Despacho*.
  - Despiece automático de recetas por gramaje (ej. venta de hamburguesa descuenta pan, carne y aderezos en tiempo real).
- **Alertas de Stock Crítico vía WhatsApp:**
  - Enlaces de acción rápida o webhook para notificar al administrador cuando un ingrediente caiga por debajo del stock de seguridad.

### Salones de Belleza, Barberías y Spas
- **Agenda con Confirmación Rápida "1-Click WhatsApp":**
  - Enlace público autogestionado por el cliente con selector de profesional y servicio.
  - Generación de mensaje rápido de confirmación vía WhatsApp para reducir inasistencias (*no-shows*).
- **Liquidación Automática de Comisiones:**
  - División automática de ingresos por servicio entre el establecimiento y el estilista al cerrar cada ticket, consolidado en el reporte diario.

### Soporte Multimoneda Local
- Cobro dinámico en USD, Bolívares (Tasa Oficial BCV / Paralelo) y USDT.
- Registro rápido de número de referencia para validación de transferencias y Pago Móvil.

---

## 4. Estrategia de Conversión en Landing Page

- **Simulador Interactivo de POS:** Widget en la cabecera sin necesidad de registro previo que permite simular la adición de productos, cálculo multimoneda y cierre de un ticket de venta en segundos.
- **Calculadora de Costeo de Recetas y Merma:** Mini-herramienta donde el usuario ingresa el costo de materia prima y calcula margen de ganancia y precio sugerido.
- **Demostración de Resiliencia Offline:** Demostración interactiva en la landing destacando la operatividad continua aun sin conexión a internet.
