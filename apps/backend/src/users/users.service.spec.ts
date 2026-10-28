import { UsersService } from './users.service';
import { UserRole, ReservationStatus, OrderStatus, PaymentStatus } from '@finowork/shared-types';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { Reservation } from '../entities/reservation.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Product } from '../entities/product.entity';
import { SalaryAdvance, SalaryAdvanceStatus } from '../entities/salary-advance.entity';
import { OperatingExpense } from '../entities/operating-expense.entity';

describe('UsersService', () => {
  let service: UsersService;
  let mockUsersRepo: any;
  let mockJwtService: any;

  beforeEach(() => {
    mockUsersRepo = {
      count: jest.fn().mockResolvedValue(1),
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      manager: {
        findOne: jest.fn(),
        find: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
        transaction: jest.fn(),
        createQueryBuilder: jest.fn(),
      },
    };
    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };
    service = new UsersService(mockUsersRepo, mockJwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('onModuleInit should not create default admin if users already exist', async () => {
    mockUsersRepo.count.mockResolvedValue(2);
    await service.onModuleInit();
    expect(mockUsersRepo.save).not.toHaveBeenCalled();
  });

  it('al crear un usuario OPERATIVO, debe asignar username generatedUsername y name cleanName para evitar colisión UNIQUE', async () => {
    const mockEntityManager = {
      create: jest.fn((entityClass, data) => ({ ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    mockUsersRepo.manager.transaction.mockImplementation(async (cb: any) => cb(mockEntityManager));

    const result = await service.create('tenant-1', {
      name: 'Carlos Mendoza',
      role: 'OPERATIVO',
      compensationType: 'COMISION',
      commissionPercentage: 45,
    });

    expect(result).toBeDefined();
    expect(result.name).toBe('Carlos Mendoza');
    expect(result.username).toMatch(/^operativo_\d+/);
    expect(result.username).not.toBe('Carlos Mendoza');
    expect(mockEntityManager.create).toHaveBeenCalledWith(
      UserTenantAccess,
      expect.objectContaining({
        compensationType: 'COMISION',
        commissionPercentage: 45,
      }),
    );
  });

  describe('findAll', () => {
    it('debe retornar array vacío si tenantId no es provisto', async () => {
      const result = await service.findAll(undefined);
      expect(result).toEqual([]);
    });

    it('debe retornar array vacío de forma segura si tenantId no es un UUID válido para evitar fuga multi-tenant', async () => {
      const result = await service.findAll('admin-system');
      expect(result).toEqual([]);
      expect(mockUsersRepo.find).not.toHaveBeenCalled();
    });

    it('debe consultar UserTenantAccess si tenantId es un UUID válido y mapear roles correctamente', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const mockAccesses = [
        {
          id: 'acc-1',
          tenantId: validUuid,
          role: UserRole.ADMIN,
          roles: [UserRole.ADMIN, UserRole.POS],
          status: 'ACCEPTED',
          jobTitle: 'Gerente General',
          user: { id: 'u-admin', username: 'admin', name: 'Administrador', passwordHash: 'secret' },
        },
        {
          id: 'acc-2',
          tenantId: validUuid,
          role: UserRole.POS,
          roles: [UserRole.POS],
          status: 'ACCEPTED',
          jobTitle: 'Cajero',
          user: { id: 'u-pos', username: 'cajero1', name: 'Cajero Uno', passwordHash: 'secret' },
        },
      ];
      mockUsersRepo.manager.find.mockResolvedValue(mockAccesses);

      const result = await service.findAll(validUuid);

      expect(mockUsersRepo.manager.find).toHaveBeenCalledWith(
        UserTenantAccess,
        expect.objectContaining({ where: { tenantId: validUuid } })
      );
      expect(result).toHaveLength(2);
      expect(result[0].username).toBe('admin');
      expect((result[0] as any).roles).toEqual([UserRole.ADMIN, UserRole.POS]);
      expect((result[0] as any).jobTitle).toBe('Gerente General');
      expect((result[0] as any).passwordHash).toBeUndefined();
    });

    it('debe retornar array vacío si el tenant UUID no tiene accesos creados aún (sin fuga multi-tenant)', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      mockUsersRepo.manager.find.mockResolvedValue([]);

      const result = await service.findAll(validUuid);

      expect(result).toEqual([]);
      expect(mockUsersRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('no debe ejecutar eliminación si tenantId no es un UUID válido', async () => {
      mockUsersRepo.manager.query = jest.fn();
      await service.delete('invalid-tenant', 'u-1');
      expect(mockUsersRepo.manager.query).not.toHaveBeenCalled();
    });

    it('debe eliminar filtrando estrictamente por userId y tenantId cuando tenantId es válido', async () => {
      mockUsersRepo.manager.query = jest.fn();
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      await service.delete(validUuid, 'u-1');
      expect(mockUsersRepo.manager.query).toHaveBeenCalledWith(
        `DELETE FROM "user_tenant_access" WHERE "userId" = $1 AND "tenantId" = $2`,
        ['u-1', validUuid]
      );
    });
  });

  describe('getPayrollSummary', () => {
    it('debe calcular correctamente la nómina por comisión pura con descuento de vales', async () => {
      const mockAccess = {
        userId: 'emp-1',
        tenantId: 'tenant-1',
        compensationType: 'COMISION',
        commissionPercentage: 40, // 40% de comisión
        salaryAmount: 0,
        salaryPeriod: 'SEMANAL',
        user: { id: 'emp-1', username: 'juan_barbero', name: 'Juan Pérez' },
      };

      const mockReservations = [
        {
          id: 'res-1',
          date: '2026-10-10',
          time: '10:00',
          customerName: 'Cliente A',
          serviceName: 'Corte de Cabello',
          totalAmount: 50,
          status: ReservationStatus.COMPLETED,
        },
        {
          id: 'res-2',
          date: '2026-10-11',
          time: '14:00',
          customerName: 'Cliente B',
          serviceName: 'Barba y Corte',
          totalAmount: 100,
          status: ReservationStatus.COMPLETED,
        },
      ];

      const mockAdvances = [
        {
          id: 'adv-1',
          userId: 'emp-1',
          negocioId: 'tenant-1',
          amountUSD: 20,
          amountBS: 800,
          reason: 'Anticipo transporte',
          date: '2026-10-09',
          status: SalaryAdvanceStatus.PENDIENTE,
        },
      ];

      // Mocks
      mockUsersRepo.manager.findOne.mockResolvedValue(mockAccess);

      const reservationQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockReservations),
      };

      const orderQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockUsersRepo.manager.createQueryBuilder.mockImplementation((entity: any) => {
        if (entity === Reservation) return reservationQb;
        return orderQb;
      });

      mockUsersRepo.manager.find.mockResolvedValue(mockAdvances);

      const summary = await service.getPayrollSummary('tenant-1', 'emp-1', '2026-10-01', '2026-10-15');

      expect(summary).toBeDefined();
      expect(summary.user.username).toBe('juan_barbero');
      expect(summary.compensationType).toBe('COMISION');
      expect(summary.commissionPercentage).toBe(40);
      expect(summary.servicesCount).toBe(2);
      expect(summary.totalBilled).toBe(150); // 50 + 100
      expect(summary.commissionEarned).toBe(60); // 40% de 150 = 60
      expect(summary.baseSalary).toBe(0);
      expect(summary.grossTotal).toBe(60);
      expect(summary.advancesDeduction).toBe(20);
      expect(summary.netPayableUSD).toBe(40); // 60 - 20 = 40
      expect(summary.workItems.length).toBe(2);
    });

    it('debe calcular correctamente la nómina mixta (sueldo fijo + comisión) deduciendo vales', async () => {
      const mockAccess = {
        userId: 'emp-2',
        tenantId: 'tenant-1',
        compensationType: 'MIXTO',
        commissionPercentage: 20, // 20%
        salaryAmount: 80, // $80 base
        salaryPeriod: 'QUINCENAL',
        user: { id: 'emp-2', username: 'maria_estilista', name: 'María Gomez' },
      };

      const mockReservations = [
        {
          id: 'res-3',
          date: '2026-10-12',
          time: '11:00',
          customerName: 'Cliente C',
          serviceName: 'Balayage',
          totalAmount: 200,
          status: ReservationStatus.COMPLETED,
        },
      ];

      mockUsersRepo.manager.findOne.mockResolvedValue(mockAccess);

      const reservationQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockReservations),
      };
      const orderQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockUsersRepo.manager.createQueryBuilder.mockImplementation((entity: any) => {
        if (entity === Reservation) return reservationQb;
        return orderQb;
      });

      mockUsersRepo.manager.find.mockResolvedValue([]);

      const summary = await service.getPayrollSummary('tenant-1', 'emp-2');

      expect(summary.compensationType).toBe('MIXTO');
      expect(summary.totalBilled).toBe(200);
      expect(summary.commissionEarned).toBe(40); // 20% de 200 = 40
      expect(summary.baseSalary).toBe(80);
      expect(summary.grossTotal).toBe(120); // 80 + 40
      expect(summary.advancesDeduction).toBe(0);
      expect(summary.netPayableUSD).toBe(120);
    });

    it('debe proteger contra montos negativos si los vales superan el total ganado', async () => {
      const mockAccess = {
        userId: 'emp-3',
        tenantId: 'tenant-1',
        compensationType: 'COMISION',
        commissionPercentage: 30,
        salaryAmount: 0,
        user: { id: 'emp-3', username: 'pedro', name: 'Pedro' },
      };

      mockUsersRepo.manager.findOne.mockResolvedValue(mockAccess);
      mockUsersRepo.manager.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      // Vales por $50 pero no produjo nada
      mockUsersRepo.manager.find.mockResolvedValue([
        { id: 'adv-2', amountUSD: 50, amountBS: 2000, status: SalaryAdvanceStatus.PENDIENTE },
      ]);

      const summary = await service.getPayrollSummary('tenant-1', 'emp-3');
      expect(summary.grossTotal).toBe(0);
      expect(summary.advancesDeduction).toBe(50);
      expect(summary.netPayableUSD).toBe(0);
    });

    it('debe auto-curar y calcular la nómina si la reserva tiene totalAmount en 0 recuperando el precio del servicio', async () => {
      const mockAccess = {
        userId: 'emp-4',
        tenantId: 'tenant-1',
        compensationType: 'COMISION',
        commissionPercentage: 20, // 20%
        user: { id: 'emp-4', username: 'employeC', name: 'Empleado C' },
      };

      const mockReservations = [
        {
          id: 'res-healed',
          date: '2026-10-12',
          time: '15:00',
          customerName: 'Cliente Z',
          serviceId: 'prod-serv-1',
          serviceName: 'Corte y Lavado',
          totalAmount: 0, // En 0 originalmente
          status: ReservationStatus.COMPLETED,
        },
      ];

      mockUsersRepo.manager.findOne.mockImplementation((entity: any, criteria: any) => {
        if (entity === UserTenantAccess) return Promise.resolve(mockAccess);
        if (entity === Order) return Promise.resolve(null);
        return Promise.resolve(null);
      });

      const reservationQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockReservations),
      };
      const orderQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockUsersRepo.manager.createQueryBuilder.mockImplementation((entity: any) => {
        if (entity === Reservation) return reservationQb;
        return orderQb;
      });

      mockUsersRepo.manager.find.mockImplementation((entity: any) => {
        if (entity === Product) {
          return Promise.resolve([{ id: 'prod-serv-1', name: 'Corte y Lavado', salePrice: 30 }]);
        }
        return Promise.resolve([]); // Advances = []
      });

      mockUsersRepo.manager.update = jest.fn().mockResolvedValue({ affected: 1 });

      const summary = await service.getPayrollSummary('tenant-1', 'emp-4');

      expect(summary.servicesCount).toBe(1);
      expect(summary.totalBilled).toBe(30);
      expect(summary.servicesTotalBilled).toBe(30);
      expect(summary.commissionEarned).toBe(6); // 20% de 30 = 6
      expect(summary.grossTotal).toBe(6);
      expect(summary.netPayableUSD).toBe(6);
      expect(mockUsersRepo.manager.update).toHaveBeenCalledWith(
        Reservation,
        { id: 'res-healed' },
        { totalAmount: 30 }
      );
    });

    it('debe calcular comisiones a pagar SOLO sobre trabajos cobrados y colocar los pendientes en pendingCommission', async () => {
      const mockAccess = {
        userId: 'emp-5',
        tenantId: 'tenant-1',
        compensationType: 'COMISION',
        commissionPercentage: 50, // 50%
        user: { id: 'emp-5', username: 'carla', name: 'Carla Manicurista' },
      };

      const mockReservations = [
        {
          id: 'res-paid',
          date: '2026-10-13',
          time: '09:00',
          customerName: 'Cliente Pagado',
          serviceName: 'Uñas Acrílicas',
          totalAmount: 40,
          status: ReservationStatus.COMPLETED,
          paymentStatus: PaymentStatus.PAID,
        },
        {
          id: 'res-pending',
          date: '2026-10-13',
          time: '11:00',
          customerName: 'Cliente Debe',
          serviceName: 'Pedicure Spa',
          totalAmount: 30,
          status: ReservationStatus.COMPLETED,
          paymentStatus: PaymentStatus.PENDING, // Cliente aún no paga
        },
      ];

      mockUsersRepo.manager.findOne.mockResolvedValue(mockAccess);
      mockUsersRepo.manager.createQueryBuilder.mockImplementation((entity: any) => {
        if (entity === Reservation) {
          return {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue(mockReservations),
          };
        }
        return {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };
      });
      mockUsersRepo.manager.find.mockResolvedValue([]); // Sin vales

      const summary = await service.getPayrollSummary('tenant-1', 'emp-5');

      expect(summary.totalBilled).toBe(70);
      expect(summary.totalPaidBilled).toBe(40);
      expect(summary.totalPendingBilled).toBe(30);
      // Solo debe ganar 50% de 40 = 20 USD a liquidar
      expect(summary.commissionEarned).toBe(20);
      // Los 50% de 30 = 15 USD quedan como comisión por cobrar
      expect(summary.pendingCommission).toBe(15);
      expect(summary.netPayableUSD).toBe(20);
    });

    it('debe calcular comisiones proporcionadas cuando una reserva tiene múltiples especialistas por servicio', async () => {
      const mockAccessEmp1 = {
        userId: 'emp-1',
        tenantId: 'tenant-1',
        compensationType: 'COMISION',
        commissionPercentage: 40,
        salaryAmount: 0,
        user: { id: 'emp-1', username: 'ana_estilista', name: 'Ana' },
      };

      const sharedReservation = {
        id: 'res-shared-1',
        date: '2026-10-14',
        time: '11:00',
        customerName: 'Cliente VIP',
        serviceName: 'Corte, Tinte',
        totalAmount: 100,
        status: ReservationStatus.COMPLETED,
        paymentStatus: PaymentStatus.PAID,
        serviceSpecialists: [
          { serviceId: 's-1', serviceName: 'Corte', employeeId: 'emp-1', employeeName: 'Ana', price: 30, durationMinutes: 30 },
          { serviceId: 's-2', serviceName: 'Tinte', employeeId: 'emp-2', employeeName: 'Carlos', price: 70, durationMinutes: 60 },
        ],
      };

      mockUsersRepo.manager.findOne.mockResolvedValue(mockAccessEmp1);

      const reservationQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([sharedReservation]),
      };

      const orderQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockUsersRepo.manager.createQueryBuilder.mockImplementation((entity: any) => {
        if (entity === Reservation) return reservationQb;
        return orderQb;
      });
      mockUsersRepo.manager.find.mockResolvedValue([]);

      const summary = await service.getPayrollSummary('tenant-1', 'emp-1');

      expect(summary.servicesCount).toBe(1);
      expect(summary.totalBilled).toBe(30); // Solo su parte de $30, NO los $100 totales
      expect(summary.commissionEarned).toBe(12); // 40% de $30 = $12
      expect(summary.workItems[0].amount).toBe(30);
      expect(summary.workItems[0].description).toBe('Corte');
    });

    it('debe calcular la comisión en ventas de Compra-Venta sobre la ganancia neta (precio venta - costo) y no sobre el monto bruto', async () => {
      const mockAccessVendedor = {
        userId: 'emp-retail',
        tenantId: 'tenant-1',
        compensationType: 'COMISION',
        commissionPercentage: 20, // 20% sobre la ganancia
        salaryAmount: 0,
        user: { id: 'emp-retail', username: 'vendedor_1', name: 'Luis Vendedor' },
      };

      const retailOrder = {
        id: 'ord-retail-100',
        tenantId: 'tenant-1',
        customerName: 'Cliente Tienda',
        totalAmount: 100,
        totalCost: 60,
        netProfit: 40,
        employeeId: 'emp-retail',
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
        createdAt: new Date('2026-10-14T15:00:00.000Z'),
      };

      const retailItems = [
        {
          id: 'item-1',
          orderId: 'ord-retail-100',
          productId: 'prod-1',
          productName: 'Zapatos Deportivos',
          quantity: 1,
          unitPrice: 100,
          unitCost: 60,
          subtotal: 100,
          employeeId: null,
          product: { id: 'prod-1', is_service: false, category: 'Calzado', cost: 60 },
        },
      ];

      mockUsersRepo.manager.findOne.mockResolvedValue(mockAccessVendedor);

      const reservationQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      const orderQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([retailOrder]),
      };

      mockUsersRepo.manager.createQueryBuilder.mockImplementation((entity: any) => {
        if (entity === Reservation) return reservationQb;
        return orderQb;
      });

      mockUsersRepo.manager.find.mockImplementation((entity: any) => {
        if (entity === OrderItem) return Promise.resolve(retailItems);
        return Promise.resolve([]);
      });

      const summary = await service.getPayrollSummary('tenant-1', 'emp-retail');

      expect(summary.ordersCount).toBe(1);
      expect(summary.ordersTotalBilled).toBe(100);
      // Ganancia del producto = $100 - $60 = $40 -> 20% de $40 = $8 USD
      expect(summary.commissionEarned).toBe(8);
      expect(summary.workItems[0].amount).toBe(100);
      expect((summary.workItems[0] as any).commissionableAmount).toBe(40);
      expect(summary.workItems[0].commissionAmount).toBe(8);
    });

    it('debe atribuir productos de compra-venta sin especialista individual al empleado general de una orden mixta', async () => {
      const mockAccessCajero = {
        userId: 'emp-cajero',
        tenantId: 'tenant-1',
        compensationType: 'COMISION',
        commissionPercentage: 10, // 10%
        salaryAmount: 0,
        user: { id: 'emp-cajero', username: 'cajero_ventas', name: 'Cajero' },
      };

      const mixedOrder = {
        id: 'ord-mixed-1',
        tenantId: 'tenant-1',
        customerName: 'Cliente Mixto',
        totalAmount: 80, // $30 servicio + $50 producto
        employeeId: 'emp-cajero',
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
        createdAt: new Date('2026-10-14T16:00:00.000Z'),
      };

      const mixedItems = [
        {
          id: 'it-serv',
          orderId: 'ord-mixed-1',
          productId: 's-1',
          productName: 'Corte',
          quantity: 1,
          unitPrice: 30,
          unitCost: 0,
          subtotal: 30,
          employeeId: 'emp-estilista', // Especialista del servicio
          product: { id: 's-1', is_service: true, category: 'Servicios' },
        },
        {
          id: 'it-prod',
          orderId: 'ord-mixed-1',
          productId: 'p-shampoo',
          productName: 'Shampoo Profesional',
          quantity: 1,
          unitPrice: 50,
          unitCost: 30, // Ganancia = $20
          subtotal: 50,
          employeeId: null, // Sin especialista individual -> hereda o.employeeId ('emp-cajero')
          product: { id: 'p-shampoo', is_service: false, category: 'Productos', cost: 30 },
        },
      ];

      mockUsersRepo.manager.findOne.mockResolvedValue(mockAccessCajero);

      const reservationQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      const orderQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mixedOrder]),
      };

      mockUsersRepo.manager.createQueryBuilder.mockImplementation((entity: any) => {
        if (entity === Reservation) return reservationQb;
        return orderQb;
      });

      mockUsersRepo.manager.find.mockImplementation((entity: any) => {
        if (entity === OrderItem) return Promise.resolve(mixedItems);
        return Promise.resolve([]);
      });

      const summary = await service.getPayrollSummary('tenant-1', 'emp-cajero');

      expect(summary.ordersCount).toBe(1);
      expect(summary.ordersTotalBilled).toBe(50); // Solo el Shampoo de $50
      // Ganancia del Shampoo = $50 - $30 = $20 -> 10% de $20 = $2 USD
      expect(summary.commissionEarned).toBe(2);
    });

    it('no debe volver a calcular comisión de reservas u órdenes con commissionPaid = true', async () => {
      const mockAccess = {
        userId: 'claudia-1',
        tenantId: 'tenant-1',
        compensationType: 'COMISION',
        commissionPercentage: 35, // 35%
        user: { id: 'claudia-1', username: 'claudia', name: 'Claudia Fisioterapeuta' },
      };

      const mockReservations = [
        {
          id: 'res-already-paid',
          date: '2026-10-26',
          time: '10:00',
          customerName: 'Cliente Antiguo',
          serviceName: 'Masaje Terapéutico',
          totalAmount: 28,
          status: ReservationStatus.COMPLETED,
          paymentStatus: PaymentStatus.PAID,
          commissionPaid: true, // Ya fue liquidada en la nómina anterior!
        },
        {
          id: 'res-new-unpaid',
          date: '2026-10-27',
          time: '14:00',
          customerName: 'Cliente Nuevo',
          serviceName: 'Terapia Manual',
          totalAmount: 40,
          status: ReservationStatus.COMPLETED,
          paymentStatus: PaymentStatus.PAID,
          commissionPaid: false, // Nueva, pendiente por liquidar
        },
      ];

      mockUsersRepo.manager.findOne.mockResolvedValue(mockAccess);
      mockUsersRepo.manager.createQueryBuilder.mockImplementation((entity: any) => {
        if (entity === Reservation) {
          return {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue(mockReservations),
          };
        }
        return {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };
      });
      mockUsersRepo.manager.find.mockResolvedValue([]);

      const summary = await service.getPayrollSummary('tenant-1', 'claudia-1', '2026-10-20', '2026-10-27');

      expect(summary.servicesCount).toBe(2);
      expect(summary.settledServicesCount).toBe(1);
      expect(summary.pendingServicesCount).toBe(1);
      // Solo debe comisionar la nueva: 35% de $40 = $14 USD
      // La de $28 ya liquidada ($9.80) NO debe estar en commissionEarned!
      expect(summary.commissionEarned).toBe(14);
      expect(summary.settledCommission).toBe(9.8);
      expect(summary.netPayableUSD).toBe(14);
    });

    it('debe reconocer si el sueldo base ya fue liquidado para el período seleccionado', async () => {
      const mockAccess = {
        userId: 'claudia-2',
        tenantId: 'tenant-1',
        compensationType: 'MIXTO',
        salaryAmount: 40,
        salaryPeriod: 'SEMANAL',
        commissionPercentage: 35,
        lastPayrollDate: '2026-10-27',
        lastPayrollPeriodStart: '2026-10-20',
        lastPayrollPeriodEnd: '2026-10-27', // Período liquidado hasta el 27
        user: { id: 'claudia-2', username: 'claudia', name: 'Claudia Fisioterapeuta' },
      };

      mockUsersRepo.manager.findOne.mockResolvedValue(mockAccess);
      mockUsersRepo.manager.createQueryBuilder.mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }));
      mockUsersRepo.manager.find.mockResolvedValue([]);

      // Si se consulta el mismo período ya liquidado
      const summary = await service.getPayrollSummary('tenant-1', 'claudia-2', '2026-10-20', '2026-10-27');

      expect(summary.baseSalaryAlreadySettled).toBe(true);
      expect(summary.baseSalary).toBe(0); // No cobra sueldo base repetido por defecto!
      expect(summary.baseSalaryConfigured).toBe(40);
      expect(summary.netPayableUSD).toBe(0);

      // Si el usuario fuerza la inclusión del sueldo base (includeBaseSalary: true)
      const summaryForced = await service.getPayrollSummary('tenant-1', 'claudia-2', '2026-10-20', '2026-10-27', true);
      expect(summaryForced.baseSalaryAlreadySettled).toBe(true);
      expect(summaryForced.baseSalary).toBe(40);
      expect(summaryForced.netPayableUSD).toBe(40);
    });
  });

  describe('paySalary', () => {
    it('debe registrar el egreso, descontar vales y marcar reservas y UserTenantAccess como liquidados', async () => {
      const updateQb = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };

      const mockManager = {
        create: jest.fn((entityClass, data) => ({ ...data, id: 'expense-123' })),
        save: jest.fn((entity) => Promise.resolve(entity)),
        createQueryBuilder: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue(updateQb),
        }),
      };

      mockUsersRepo.manager.transaction.mockImplementation(async (cb: any) => cb(mockManager));

      await service.paySalary('tenant-1', 'claudia-1', {
        username: 'claudia',
        amount: 49.8,
        method: 'CASH',
        date: '2026-10-27',
        periodStart: '2026-10-20',
        periodEnd: '2026-10-27',
        reservationIds: ['res-1'],
        deductAdvances: true,
      });

      expect(mockManager.create).toHaveBeenCalledWith(
        OperatingExpense,
        expect.objectContaining({
          tenantId: 'tenant-1',
          category: 'PAYROLL',
          amount: 49.8,
        }),
      );
      expect(mockManager.createQueryBuilder).toHaveBeenCalled();
      // Debe actualizar UserTenantAccess con la fecha y período
      expect(updateQb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          lastPayrollDate: '2026-10-27',
          lastPayrollPeriodStart: '2026-10-20',
          lastPayrollPeriodEnd: '2026-10-27',
          lastPayrollAmount: 49.8,
        }),
      );
      // Debe marcar las reservas como liquidadas
      expect(updateQb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          commissionPaid: true,
          payrollExpenseId: 'expense-123',
        }),
      );
    });
  });

  describe('settleWorkItems', () => {
    it('debe actualizar el estado commissionPaid de reservas y órdenes', async () => {
      const updateQb = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };

      mockUsersRepo.manager.createQueryBuilder = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue(updateQb),
      });

      const res = await service.settleWorkItems('tenant-1', 'user-1', {
        reservationIds: ['res-abc'],
        orderIds: ['ord-xyz'],
        settled: true,
      });

      expect(res.success).toBe(true);
      expect(res.settled).toBe(true);
      expect(updateQb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          commissionPaid: true,
        }),
      );
    });
  });
});
