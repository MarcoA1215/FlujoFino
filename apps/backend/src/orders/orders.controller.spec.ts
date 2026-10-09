import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { StorageService } from '../storage/storage.service';
import { UserRole } from '@finowork/shared-types';

describe('OrdersController', () => {
  let controller: OrdersController;
  let mockOrdersService: any;
  let mockStorageService: any;

  beforeEach(async () => {
    mockOrdersService = {
      createOrder: jest.fn().mockResolvedValue({ id: 'ord-1' }),
      syncOfflineOrders: jest.fn().mockResolvedValue({ success: true }),
      revertAbono: jest.fn().mockResolvedValue({ id: 'ord-1' }),
      addAbono: jest.fn().mockResolvedValue({ id: 'ord-1' }),
    };

    mockStorageService = {
      uploadFile: jest.fn().mockResolvedValue('http://file.test'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  describe('revertAbono', () => {
    it('debe reenviar el identificador de abono (UUID o string) al servicio', async () => {
      const req = { user: { tenantId: 'tenant-1' } };
      const orderId = 'order-abc';
      const abonoUuid = 'abono-uuid-1234';

      await controller.revertAbono(req, orderId, abonoUuid);
      expect(mockOrdersService.revertAbono).toHaveBeenCalledWith('tenant-1', orderId, abonoUuid);
    });
  });

  describe('createOrder and syncOffline role forwarding', () => {
    it('debe propagar req.user?.role a createOrder', async () => {
      const req = { user: { tenantId: 'tenant-1', id: 'usr-1', role: UserRole.POS } };
      const dto: any = { items: [] };

      await controller.createOrder(req, dto);
      expect(mockOrdersService.createOrder).toHaveBeenCalledWith('tenant-1', dto, 'usr-1', UserRole.POS);
    });

    it('debe propagar req.user?.role a syncOfflineOrders', async () => {
      const req = { user: { tenantId: 'tenant-1', id: 'usr-1', role: UserRole.POS } };
      const orders = [{ offlineId: 'off-1' }];

      await controller.syncOffline(req, orders);
      expect(mockOrdersService.syncOfflineOrders).toHaveBeenCalledWith('tenant-1', orders, 'usr-1', UserRole.POS);
    });
  });
});
