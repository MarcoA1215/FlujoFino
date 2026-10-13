import { UsersService } from './users.service';
import { UserRole, ReservationStatus, OrderStatus } from '@finowork/shared-types';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { Reservation } from '../entities/reservation.entity';
import { Order } from '../entities/order.entity';
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
  });

  describe('paySalary', () => {
    it('debe registrar el egreso y descontar vales pendientes cuando deductAdvances sea true', async () => {
      const updateQb = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
      };

      const mockManager = {
        create: jest.fn((entityClass, data) => ({ ...data })),
        save: jest.fn((entity) => Promise.resolve(entity)),
        createQueryBuilder: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue(updateQb),
        }),
      };

      mockUsersRepo.manager.transaction.mockImplementation(async (cb: any) => cb(mockManager));

      await service.paySalary('tenant-1', 'user-1', {
        username: 'juan_barbero',
        amount: 80,
        method: 'CASH',
        date: '2026-10-12',
        deductAdvances: true,
      });

      expect(mockManager.create).toHaveBeenCalledWith(
        OperatingExpense,
        expect.objectContaining({
          tenantId: 'tenant-1',
          category: 'PAYROLL',
          amount: 80,
        }),
      );
      expect(mockManager.createQueryBuilder).toHaveBeenCalled();
      expect(updateQb.set).toHaveBeenCalledWith({ status: SalaryAdvanceStatus.DESCONTADO });
    });
  });
});
