import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PublicReservationsController } from './public-reservations.controller';
import { ReservationsService } from './reservations.service';
import { CustomersService } from '../customers/customers.service';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Tenant } from '../entities/tenant.entity';
import { Settings } from '../entities/settings.entity';
import { Product } from '../entities/product.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { UserRole } from '@finowork/shared-types';
import * as tenantCrypto from '../utils/tenant-crypto';

describe('PublicReservationsController Staff Filtering', () => {
  let controller: PublicReservationsController;
  let mockTenantRepo: any;
  let mockSettingsRepo: any;
  let mockProductRepo: any;
  let mockAccessRepo: any;

  beforeEach(async () => {
    mockSettingsRepo = {
      findOne: jest.fn().mockResolvedValue({
        bookingAllowStaffSelection: true,
        slotInterval: 30,
      }),
    };

    mockProductRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    mockAccessRepo = {
      find: jest.fn(),
    };

    mockTenantRepo = {
      findOne: jest.fn(),
      manager: {
        getRepository: jest.fn((target: any) => {
          if (target === Settings) return mockSettingsRepo;
          if (target === Product) return mockProductRepo;
          if (target === UserTenantAccess) return mockAccessRepo;
          return { find: jest.fn(), findOne: jest.fn() };
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicReservationsController],
      providers: [
        { provide: ReservationsService, useValue: {} },
        { provide: CustomersService, useValue: {} },
        { provide: StorageService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
        { provide: getRepositoryToken(Tenant), useValue: mockTenantRepo },
      ],
    }).compile();

    controller = module.get<PublicReservationsController>(PublicReservationsController);
  });

  it('debe excluir de la lista de personal a empleados con roles exclusivamente DELIVERY u OPERATIVO', async () => {
    const tenantId = '00000000-0000-0000-0000-000000000002';
    jest.spyOn(tenantCrypto, 'decodeTenantId').mockReturnValue(tenantId);
    mockTenantRepo.findOne.mockResolvedValue({ id: tenantId, name: 'Salon Spa', isActive: true, status: 'ACTIVE' });

    mockAccessRepo.find.mockResolvedValue([
      {
        id: 'acc-1',
        roles: [UserRole.DELIVERY],
        user: { id: 'u-delivery', username: 'repartidor_juan', name: 'Juan Repartidor' },
      },
      {
        id: 'acc-2',
        roles: [UserRole.OPERATIVO],
        user: { id: 'u-operativo', username: 'limpieza_maria', name: 'Maria Limpieza' },
      },
      {
        id: 'acc-3',
        roles: [UserRole.POS],
        user: { id: 'u-pos', username: 'estilista_pedro', name: 'Pedro Estilista' },
      },
      {
        id: 'acc-4',
        roles: [UserRole.ADMIN],
        user: { id: 'u-admin', username: 'admin_ana', name: 'Ana Dueña' },
      },
    ]);

    const result = await controller.getTenantInfo('token-valido');

    expect(result).toBeDefined();
    expect(result.staff).toBeDefined();
    const staffIds = result.staff.map((s: any) => s.id);

    // Los roles exclusivos de DELIVERY u OPERATIVO quedan excluidos del selector público
    expect(staffIds).not.toContain('u-delivery');
    expect(staffIds).not.toContain('u-operativo');

    // Los roles válidos permanecen
    expect(staffIds).toContain('u-pos');
    expect(staffIds).toContain('u-admin');
  });
});
