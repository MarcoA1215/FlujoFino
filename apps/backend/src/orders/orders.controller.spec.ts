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
      updateDiscount: jest.fn().mockResolvedValue({ id: 'ord-1' }),
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

  describe('updateDiscount', () => {
    it('debe propagar el tenantId y el dto de descuento a updateDiscount', async () => {
      const req = { user: { tenantId: 'tenant-1' } };
      const dto = { discountType: 'FIXED' as const, discountValue: 5 };
      await controller.updateDiscount(req, 'ord-1', dto);
      expect(mockOrdersService.updateDiscount).toHaveBeenCalledWith('tenant-1', 'ord-1', dto);
    });
  });

  describe('exportCsv', () => {
    it('debe exportar órdenes en CSV y configurar los encabezados de respuesta correctamente', async () => {
      const req = { user: { tenantId: 'tenant-xyz' } };
      mockOrdersService.exportOrdersCsv = jest.fn().mockResolvedValue('\uFEFFFecha_Operacion;Numero_Orden\r\n2026-10-24;ord-1');
      const mockRes: any = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockImplementation((val) => val),
      };

      await controller.exportCsv(req, '2026-10-01', '2026-10-24', mockRes);

      expect(mockOrdersService.exportOrdersCsv).toHaveBeenCalledWith('tenant-xyz', '2026-10-01', '2026-10-24');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="reporte_transaccional_2026-10-01_2026-10-24.csv"');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith('\uFEFFFecha_Operacion;Numero_Orden\r\n2026-10-24;ord-1');
    });
  });
});
