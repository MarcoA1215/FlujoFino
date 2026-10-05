import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomersService } from './customers.service';
import { Customer } from '../entities/customer.entity';

describe('CustomersService', () => {
  let service: CustomersService;
  let mockCustomerRepo: any;

  beforeEach(async () => {
    mockCustomerRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn((c: any) => Promise.resolve(c)),
      create: jest.fn((data: any) => ({ ...data })),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepo,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  describe('findOrCreateOrUpdate', () => {
    it('NO debe inflar totalVisits al buscar o actualizar un cliente existente', async () => {
      const tenantId = 'tenant-1';
      const existingCustomer: any = {
        id: 'cust-1',
        tenantId,
        name: 'Carlos',
        phone: '04121234567',
        identification: 'V12345678',
        notes: 'Nota previa',
        totalVisits: 3,
      };

      mockCustomerRepo.findOne.mockResolvedValue(existingCustomer);

      const result = await service.findOrCreateOrUpdate(tenantId, {
        name: 'Carlos Actualizado',
        phone: '04121234567',
        identification: 'V12345678',
      });

      expect(result.totalVisits).toBe(3);
      expect(mockCustomerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          totalVisits: 3,
        })
      );
    });

    it('debe inicializar totalVisits en 0 para un cliente nuevo', async () => {
      const tenantId = 'tenant-1';
      mockCustomerRepo.findOne.mockResolvedValue(null);

      const result = await service.findOrCreateOrUpdate(tenantId, {
        name: 'Nuevo Cliente',
        phone: '04149876543',
        identification: 'V87654321',
      });

      expect(result.totalVisits).toBe(0);
      expect(mockCustomerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          totalVisits: 0,
        })
      );
    });
  });

  describe('incrementVisits', () => {
    it('debe incrementar en 1 el contador de visitas del cliente', async () => {
      const tenantId = 'tenant-1';
      const customer: any = {
        id: 'cust-1',
        tenantId,
        name: 'Carlos',
        totalVisits: 5,
      };

      mockCustomerRepo.findOne.mockResolvedValue(customer);

      await service.incrementVisits(tenantId, 'cust-1');

      expect(customer.totalVisits).toBe(6);
      expect(mockCustomerRepo.save).toHaveBeenCalledWith(customer);
    });
  });
});
