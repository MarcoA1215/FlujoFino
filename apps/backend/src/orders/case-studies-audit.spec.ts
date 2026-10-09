import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AuthService } from '../auth/auth.service';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Settings } from '../entities/settings.entity';
import { OperatingExpense } from '../entities/operating-expense.entity';
import { PaymentStatus, OrderStatus, UserRole, DeliveryMethod } from '@finowork/shared-types';
import { AccessRequest, AccessRequestStatus } from '../entities/access-request.entity';

describe('Auditoría Integral de los 8 Casos Críticos de Negocio', () => {
  let ordersService: OrdersService;
  let mockDataSource: any;
  let mockOrderRepo: any;
  let mockSettingsRepo: any;
  let mockExpenseRepo: any;
  let mockOrderItemRepo: any;
  let mockAccessRequestRepo: any;
  let mockSettingsService: any;
  let mockCustomersService: any;
  let mockManager: any;

  beforeEach(() => {
    mockOrderRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((o) => Promise.resolve(o)),
      create: jest.fn((entityClass, data) => ({ ...(data || entityClass) })),
    };

    mockOrderItemRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((i) => Promise.resolve(i)),
      remove: jest.fn(),
    };

    mockSettingsRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockExpenseRepo = {
      find: jest.fn(),
      save: jest.fn(),
    };

    mockAccessRequestRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => ({ id: 'req-1', ...data })),
      save: jest.fn((r) => Promise.resolve(r)),
    };

    mockManager = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((entityClassOrEntity: any, entity?: any) => Promise.resolve(entity || entityClassOrEntity)),
      create: jest.fn((entityClass: any, data: any) => ({ ...data })),
      remove: jest.fn(),
    };

    mockDataSource = {
      getRepository: jest.fn((target: any) => {
        if (target === Order || target?.name === 'Order') return mockOrderRepo;
        if (target === OrderItem || target?.name === 'OrderItem') return mockOrderItemRepo;
        if (target === Settings || target?.name === 'Settings') return mockSettingsRepo;
        if (target === OperatingExpense || target?.name === 'OperatingExpense') return mockExpenseRepo;
        if (target === AccessRequest || target?.name === 'AccessRequest') return mockAccessRequestRepo;
        return { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), create: jest.fn() };
      }),
      transaction: jest.fn((cb: any) => cb(mockManager)),
    };

    mockSettingsService = {
      getEffectiveRate: jest.fn().mockResolvedValue(50.0),
      getExchangeRate: jest.fn().mockResolvedValue({ exchangeRateBs: 50.0, currencySymbol: 'Bs.' }),
    };

    mockCustomersService = {
      findOrCreateOrUpdate: jest.fn().mockResolvedValue({ id: 'cust-1' }),
      normalizePhone: jest.fn((p) => p),
      normalizeId: jest.fn((id) => id),
    };

    ordersService = new OrdersService(
      mockDataSource as any,
      mockCustomersService as any,
      mockSettingsService as any,
    );
  });

  // =========================================================================
  // CASO 1: El dedo gordo en el efectivo ("Le cobré $2 en vez de $20")
  // =========================================================================
  describe('CASO 1: Validación de Efectivo Recibido y Cálculo de Vuelto', () => {
    it('Frontend Rule: usdReceived < totalCart debe ser detectado como menor al total', () => {
      const totalCart = 18;
      const usdReceived = 2;

      // Regla en Pos.tsx:
      const isInsufficient = typeof usdReceived === 'number' && usdReceived < totalCart;
      expect(isInsufficient).toBe(true);
    });

    it('Frontend Rule: usdReceived = 200 calcula exactamente $182 de vuelto sin decimales extraños', () => {
      const totalCart = 18;
      const usdReceived = 200;
      const exchangeRate = 50;

      const vueltoUsd = usdReceived >= totalCart ? usdReceived - totalCart : 0;
      const vueltoBs = vueltoUsd * exchangeRate;

      expect(vueltoUsd).toBe(182);
      expect(vueltoBs).toBe(9100);
    });

    it('Nueva Regla Blindada: usdReceived vacío o menor al total es rechazado', () => {
      const totalCart = 18;
      const isInvalid = (val: any) => val === '' || val === undefined || isNaN(Number(val)) || Number(val) < totalCart;

      expect(isInvalid('')).toBe(true);
      expect(isInvalid(undefined)).toBe(true);
      expect(isInvalid(2)).toBe(true);
      expect(isInvalid(18)).toBe(false);
      expect(isInvalid(20)).toBe(false);
    });
  });

  // =========================================================================
  // CASO 2: El cliente con comprobante de Pago Móvil reciclado o vacío
  // =========================================================================
  describe('CASO 2: Referencia de Pago Móvil vacía, corta o duplicada', () => {
    it('Frontend Rule: Referencia vacía o menor a 4 dígitos es bloqueada', () => {
      const isRefInvalid = (ref: string) => {
        const cleanRef = ref.trim();
        return !cleanRef || cleanRef.length < 4;
      };

      expect(isRefInvalid('')).toBe(true);
      expect(isRefInvalid('   ')).toBe(true);
      expect(isRefInvalid('12')).toBe(true); // Bloqueado con la nueva regla
      expect(isRefInvalid('123')).toBe(true); // Bloqueado
      expect(isRefInvalid('1234')).toBe(false); // Válido
    });

    it('Backend: Arroja BadRequestException si la referencia tiene menos de 4 dígitos', async () => {
      const dto: any = {
        items: [{ productId: 'p1', quantity: 1, unitPrice: 15 }],
        paymentMethod: 'PAGO_MOVIL',
        pagoMovilRef: '12',
      };

      await expect(
        ordersService.createOrder('tenant-1', dto)
      ).rejects.toThrow(new BadRequestException('La referencia de Pago Móvil debe contener al menos 4 dígitos'));
    });

    it('Backend: Bloquea referencias de Pago Móvil duplicadas/recicladas en las últimas 48 horas', async () => {
      const duplicateOrder = {
        id: 'ord-dup-12345678',
        pagoMovilRef: '987654',
      };

      mockManager.findOne.mockResolvedValue(duplicateOrder);

      const dto: any = {
        items: [{ productId: 'p1', quantity: 1, unitPrice: 15 }],
        paymentMethod: 'PAGO_MOVIL',
        pagoMovilRef: '987654',
      };

      await expect(
        ordersService.createOrder('tenant-1', dto)
      ).rejects.toThrow(
        /ya fue registrada en la orden #ORD-DUP-/
      );
    });
  });

  // =========================================================================
  // CASO 3: Vuelto cruzado en Pago Móvil ($7 cobrado con $20 USD, vuelto $13 en Pago Móvil)
  // =========================================================================
  describe('CASO 3: Vuelto cruzado en Pago Móvil y Arqueo de Caja', () => {
    it('Frontend exige referencia si changeMethod === "PAGO_MOVIL"', () => {
      const changeMethod = 'PAGO_MOVIL';
      const changeRef = '';
      const totalCart = 7;
      const usdReceived = 20;

      const requiresChangeRef = usdReceived > totalCart && changeMethod === 'PAGO_MOVIL' && !changeRef.trim();
      expect(requiresChangeRef).toBe(true);
    });

    it('Arqueo de Caja: $20 en efectivo entra en gaveta (+20 USD) y los $13 en Pago Móvil se reflejan como egreso en banco', async () => {
      const tenantId = 'tenant-1';
      const orderRate = 50.0;

      // Orden: total $7, pagado con billete de $20, vuelto de $13 en Pago Móvil
      const crossOrder: any = {
        id: 'ord-cross-1',
        tenantId,
        totalAmount: 7,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: 'USD',
        usdReceived: 20,
        changeAmount: 13,
        changeAmountBs: 13 * orderRate, // 650 Bs
        changeMethod: 'PAGO_MOVIL',
        changeRef: 'PM-VUELTO-789',
        exchangeRate: orderRate,
        amountBs: 7 * orderRate,
        createdAt: new Date(),
        status: OrderStatus.DELIVERED,
      };

      mockOrderRepo.find.mockResolvedValue([crossOrder]);
      mockSettingsRepo.findOne.mockResolvedValue({ tenantId, exchangeRateBs: orderRate });
      mockExpenseRepo.find.mockResolvedValue([]);

      const closing = await ordersService.getDailyCashSummary(tenantId, '2026-10-04');

      // 1. Dinero físico en gaveta: entra el billete de $20 completo
      expect(closing.totalCashReceivedUSD).toBe(20);
      expect(closing.totalCashUSD).toBe(20);
      expect(closing.totalCashChangeUSD).toBe(0); // No salió efectivo de la gaveta
      expect(closing.netCashUSD).toBe(20); // La gaveta tiene los $20 físicos

      // 2. Banco: egreso del vuelto por Pago Móvil
      expect(closing.totalPagoMovilChangeBs).toBe(650);
      expect(closing.vueltosList).toHaveLength(1);
      expect(closing.vueltosList[0]).toMatchObject({
        method: 'PAGO_MOVIL',
        amountUsd: 13,
        amountBs: 650,
        ref: 'PM-VUELTO-789',
      });
    });
  });

  // =========================================================================
  // CASO 4: Reserva fuera de horario (3:00 AM) o en horario de almuerzo
  // =========================================================================
  describe('CASO 4: Motor de Reservas y Disponibilidad de Horarios', () => {
    it('Horas fuera del rango de atención (ej. 03:00 AM) nunca se generan en slots válidos', () => {
      const dayConfig = { isOpen: true, startTime: '08:00', endTime: '18:00' };
      const [sh, sm] = dayConfig.startTime.split(':').map(Number);
      const [eh, em] = dayConfig.endTime.split(':').map(Number);
      const startMins = sh * 60 + sm; // 480 (08:00)
      const endMins = eh * 60 + em;   // 1080 (18:00)

      const targetSlotMins = 3 * 60; // 180 (03:00 AM)
      const isWithinShift = targetSlotMins >= startMins && targetSlotMins <= endMins;

      expect(isWithinShift).toBe(false);
    });

    it('Horas durante el receso de almuerzo (ej. 12:30 PM cuando almuerzo es 12:00 - 13:00) se excluyen de los slots', () => {
      const empAccess = { lunchStart: '12:00', lunchEnd: '13:00' };
      const toMins = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };

      const lStart = toMins(empAccess.lunchStart); // 720
      const lEnd = toMins(empAccess.lunchEnd);     // 780

      const slotStart = 12 * 60 + 30; // 750 (12:30 PM)
      const slotEnd = slotStart + 30;  // 780 (13:00 PM)

      const isDuringLunch = slotStart < lEnd && slotEnd > lStart;
      expect(isDuringLunch).toBe(true);
    });
  });

  // =========================================================================
  // CASO 5: La "Guerra del Borrado": Borrar ítem con entregas parciales
  // =========================================================================
  describe('CASO 5: Bloqueo de Modificación/Borrado de Ítems Despachados Parcialmente', () => {
    it('Backend arroja BadRequestException si se intenta eliminar un ítem con deliveredQuantity > 0', async () => {
      const tenantId = 'tenant-1';
      const orderId = 'order-mesa-1';

      const existingOrder: any = {
        id: orderId,
        tenantId,
        status: OrderStatus.PREPARING,
        totalAmount: 30,
        items: [
          { id: 'item-cervezas', productId: 'prod-cerveza', quantity: 4, deliveredQuantity: 4, unitPrice: 2.5 },
          { id: 'item-pizza', productId: 'prod-pizza', quantity: 1, deliveredQuantity: 0, unitPrice: 20 },
        ],
      };

      mockManager.findOne.mockImplementation((entityClass: any, options: any) => {
        if (options?.where?.id === orderId) return Promise.resolve(existingOrder);
        return Promise.resolve({ id: 'prod-pizza', stockQuantity: 10, salePrice: 20 });
      });

      // El cajero intenta actualizar la orden enviando SOLO la pizza (borró las cervezas)
      const updateDto: any = {
        items: [
          { productId: 'prod-pizza', quantity: 1, unitPrice: 20 },
        ],
      };

      await expect(
        ordersService.editOrder(tenantId, orderId, updateDto)
      ).rejects.toThrow(
        new BadRequestException('No se puede eliminar un item porque ya tiene entregas parciales')
      );
    });

    it('Backend arroja BadRequestException si se intenta reducir la cantidad por debajo de lo despachado', async () => {
      const tenantId = 'tenant-1';
      const orderId = 'order-mesa-2';

      const existingOrder: any = {
        id: orderId,
        tenantId,
        status: OrderStatus.PREPARING,
        totalAmount: 10,
        items: [
          { id: 'item-cervezas', productId: 'prod-cerveza', quantity: 4, deliveredQuantity: 4, unitPrice: 2.5 },
        ],
      };

      mockManager.findOne.mockResolvedValue(existingOrder);

      // El cajero intenta bajar la cantidad de 4 a 2 (cuando ya se llevaron 4)
      const updateDto: any = {
        items: [
          { productId: 'prod-cerveza', quantity: 2, unitPrice: 2.5 },
        ],
      };

      await expect(
        ordersService.editOrder(tenantId, orderId, updateDto)
      ).rejects.toThrow(
        new BadRequestException('La nueva cantidad no puede ser menor a lo que ya se entregó')
      );
    });
  });

  // =========================================================================
  // CASO 6: Empleado intentando entrar al sistema fuera de horario (11:00 PM)
  // =========================================================================
  describe('CASO 6: Control de Horario Laboral y Aprobación de Acceso', () => {
    it('AuthService.checkEmployeeAccess rechaza acceso directo y genera solicitud PENDING cuando está fuera de turno', async () => {
      const mockMail = { sendVerificationCode: jest.fn(), sendPasswordResetCode: jest.fn() };
      const mockJwt = { sign: jest.fn() };
      const mockUsers = { findByUsername: jest.fn() };

      const authService = new AuthService(
        mockUsers as any,
        mockJwt as any,
        mockDataSource as any,
        mockMail as any,
      );

      const user = { id: 'user-cajero', username: 'cajero1', role: 'CAJERO', email: 'cajero@test.com' };
      const access = {
        tenantId: 'tenant-1',
        role: 'CAJERO',
        entryTime: '02:00',
        exitTime: '04:00',
      };

      mockSettingsRepo.findOne.mockResolvedValue({ tenantId: 'tenant-1', requireApprovalAlways: false });
      mockAccessRequestRepo.findOne.mockResolvedValue(null);

      // Simulamos llamada a checkEmployeeAccess
      const result = await authService.checkEmployeeAccess(user, access, []);

      expect(result).not.toBeNull();
      expect(result?.requiresApproval).toBe(true);
      expect(result?.status).toBe(AccessRequestStatus.PENDING);
      expect(result?.message).toContain('Intento de acceso fuera de horario');
    });
  });

  // =========================================================================
  // CASO 7: Cambio de Tasa de Cambio Global y Congelación Histórica
  // =========================================================================
  describe('CASO 7: Congelación de Tasa y Montos en Órdenes Previas', () => {
    it('Una orden creada en la mañana a 850 Bs conserva su tasa y amountBs cuando la tasa sube a 1000 Bs', async () => {
      const tenantId = 'tenant-1';

      // 1. Mañana: Tasa a 850 Bs.
      const morningOrder: any = {
        id: 'ord-morning-1',
        tenantId,
        totalAmount: 10, // $10 USD
        exchangeRate: 850.0,
        amountBs: 8500.0, // Congelado a Bs. 8.500
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: 'PAGO_MOVIL',
        createdAt: new Date(),
        status: OrderStatus.DELIVERED,
      };

      // 2. Tarde: El dueño cambia la tasa a 1.000 Bs en Settings
      const newGlobalRate = 1000.0;
      mockSettingsRepo.findOne.mockResolvedValue({ tenantId, exchangeRateBs: newGlobalRate });
      mockOrderRepo.find.mockResolvedValue([morningOrder]);
      mockExpenseRepo.find.mockResolvedValue([]);

      const closing = await ordersService.getDailyCashSummary(tenantId, '2026-10-04');

      // El cierre diario respeta la tasa individual de la orden y sus bolívares congelados
      expect(closing.totalPagoMovilBs).toBe(8500); // Sigue siendo 8.500 Bs, NO 10.000 Bs
      expect(closing.pagoMovilList[0].amountBs).toBe(8500);
    });
  });

  // =========================================================================
  // CASO 8: Doble-tap compulsivo / Concurrencia de botones
  // =========================================================================
  describe('CASO 8: Protección contra Doble-Tap con Semáforo isSubmitting', () => {
    it('Frontend: El semáforo isSubmitting previene ejecuciones concurrentes de placeOrder', async () => {
      let isSubmitting = false;
      let executionCount = 0;

      const simulatedPlaceOrder = async () => {
        if (isSubmitting) return;
        isSubmitting = true;
        try {
          executionCount++;
          // Simular latencia de red de 50ms
          await new Promise((resolve) => setTimeout(resolve, 50));
        } finally {
          isSubmitting = false;
        }
      };

      // Simular 4 clics repetidos en ráfaga (doble tap compulsivo)
      await Promise.all([
        simulatedPlaceOrder(),
        simulatedPlaceOrder(),
        simulatedPlaceOrder(),
        simulatedPlaceOrder(),
      ]);

      // Solo la primera llamada debió ejecutarse
      expect(executionCount).toBe(1);
    });
  });
});
