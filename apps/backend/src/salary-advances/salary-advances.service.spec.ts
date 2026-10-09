import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SalaryAdvancesService } from './salary-advances.service';
import { SalaryAdvance, SalaryAdvanceStatus } from '../entities/salary-advance.entity';
import { OperatingExpense } from '../entities/operating-expense.entity';
import { User } from '../entities/user.entity';
import { Settings } from '../entities/settings.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';

describe('SalaryAdvancesService', () => {
  let service: SalaryAdvancesService;
  let mockAdvanceRepo: any;
  let mockExpenseRepo: any;
  let mockUserRepo: any;
  let mockSettingsRepo: any;
  let mockAccessRepo: any;
  let mockDataSource: any;
  let mockManager: any;

  beforeEach(async () => {
    mockAdvanceRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((adv) => Promise.resolve(adv)),
      create: jest.fn((dto) => dto),
    };

    mockExpenseRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((exp) => Promise.resolve(exp)),
      create: jest.fn((dto) => dto),
    };

    mockUserRepo = {
      findOne: jest.fn(),
    };

    mockSettingsRepo = {
      findOne: jest.fn(),
    };

    mockAccessRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'acc-1', userId: 'emp-1', tenantId: 'tenant-xyz', isActive: true }),
    };

    mockManager = {
      create: jest.fn((entityClass, data) => ({ ...data })),
      save: jest.fn(async (entityOrClass, maybeData) => maybeData || entityOrClass),
    };

    mockDataSource = {
      transaction: jest.fn(async (cb: (manager: any) => Promise<any>) => cb(mockManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalaryAdvancesService,
        { provide: getRepositoryToken(SalaryAdvance), useValue: mockAdvanceRepo },
        { provide: getRepositoryToken(OperatingExpense), useValue: mockExpenseRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Settings), useValue: mockSettingsRepo },
        { provide: getRepositoryToken(UserTenantAccess), useValue: mockAccessRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<SalaryAdvancesService>(SalaryAdvancesService);
  });

  describe('create', () => {
    it('debe aplicar tasa dinámica activa del tenant sin caer en 40.0 y registrar OperatingExpense en CASH con categoría VALE_EMPLEADO', async () => {
      const tenantId = 'tenant-xyz';
      const employee = { id: 'emp-1', username: 'mariaperez' };
      mockUserRepo.findOne.mockResolvedValue(employee);

      // Tasa configurada en el tenant: 58.75 (diferente al 40.0)
      mockSettingsRepo.findOne.mockResolvedValue({
        tenantId,
        exchangeRateBs: 58.75,
      });

      const dto = {
        userId: 'emp-1',
        amountUSD: 50,
        reason: 'Adelanto quincena',
      };

      const result = await service.create(tenantId, dto);

      // 1. Validar que la tasa dinámica aplicada sea 58.75 y no 40.0
      expect(result.exchangeRate).toBe(58.75);
      expect(result.amountBS).toBe(Number((50 * 58.75).toFixed(2))); // 2937.50

      // 2. Validar que se guardó el vale con estado PENDIENTE
      expect(mockManager.create).toHaveBeenCalledWith(
        SalaryAdvance,
        expect.objectContaining({
          userId: 'emp-1',
          negocioId: tenantId,
          amountUSD: 50,
          amountBS: 2937.5,
          exchangeRate: 58.75,
          status: SalaryAdvanceStatus.PENDIENTE,
        })
      );

      // 3. Validar que se creó el egreso OperatingExpense con categoría VALE_EMPLEADO y paymentMethod CASH
      expect(mockManager.create).toHaveBeenCalledWith(
        OperatingExpense,
        expect.objectContaining({
          tenantId,
          amount: 50,
          paymentMethod: 'CASH',
          category: 'VALE_EMPLEADO',
          description: expect.stringContaining('mariaperez'),
        })
      );
    });

    it('debe consultar Settings (id: GLOBAL) si el tenant no tiene tasa configurada', async () => {
      const tenantId = 'tenant-sin-tasa';
      const employee = { id: 'emp-2', username: 'juan' };
      mockUserRepo.findOne.mockResolvedValue(employee);

      // Tenant no tiene tasa, GLOBAL tiene 62.0
      mockSettingsRepo.findOne.mockImplementation(({ where }: any) => {
        if (where?.id === 'GLOBAL') {
          return Promise.resolve({ id: 'GLOBAL', exchangeRateBs: 62.0 });
        }
        return Promise.resolve(null);
      });

      const dto = {
        userId: 'emp-2',
        amountUSD: 10,
      };

      const result = await service.create(tenantId, dto);

      expect(result.exchangeRate).toBe(62.0);
      expect(result.amountBS).toBe(620.0);
    });

    it('debe lanzar BadRequestException si el empleado no pertenece a este negocio', async () => {
      const tenantId = 'tenant-xyz';
      mockUserRepo.findOne.mockResolvedValue({ id: 'emp-3', username: 'carlos' });
      mockAccessRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(tenantId, { userId: 'emp-3', amountUSD: 20 })
      ).rejects.toThrow('El empleado no pertenece a este negocio');
    });
  });

  describe('markAsDeducted', () => {
    it('debe cambiar el estado del vale a DESCONTADO', async () => {
      const tenantId = 'tenant-xyz';
      const existingAdvance = {
        id: 'adv-100',
        negocioId: tenantId,
        status: SalaryAdvanceStatus.PENDIENTE,
        amountUSD: 25,
      };

      mockAdvanceRepo.findOne.mockResolvedValue(existingAdvance);

      const result = await service.markAsDeducted(tenantId, 'adv-100');

      expect(result.status).toBe(SalaryAdvanceStatus.DESCONTADO);
      expect(mockAdvanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'adv-100',
          status: SalaryAdvanceStatus.DESCONTADO,
        })
      );
    });
  });
});
