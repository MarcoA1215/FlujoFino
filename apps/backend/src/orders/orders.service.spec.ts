import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrdersService, CreateOrderDto } from './orders.service';
import { CustomersService } from '../customers/customers.service';
import { Order } from '../entities/order.entity';
import { PaymentStatus, OrderStatus } from '@nutrideli/shared-types';

describe('OrdersService (POS / Orders Flow)', () => {
  let service: OrdersService;
  let dataSource: any;
  let customersService: any;
  let orderRepo: any;

  beforeEach(async () => {
    orderRepo = {
      findOne: jest.fn(),
      save: jest.fn((order) => Promise.resolve(order)),
    };

    dataSource = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === Order) return orderRepo;
        return {};
      }),
      transaction: jest.fn(),
    };

    customersService = {
      recordCustomerOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: DataSource, useValue: dataSource },
        { provide: CustomersService, useValue: customersService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('addAbono & Partial Payments', () => {
    it('throws BadRequestException if amount is 0 or negative', async () => {
      await expect(service.addAbono('tenant-1', 'order-1', 0)).rejects.toThrow(BadRequestException);
      await expect(service.addAbono('tenant-1', 'order-1', -10)).rejects.toThrow(BadRequestException);
    });

    it('throws error if order is not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.addAbono('tenant-1', 'order-not-found', 15)).rejects.toThrow('Order not found');
    });

    it('sets status to PARTIAL when abono is less than total amount', async () => {
      const mockOrder = {
        id: 'order-1',
        tenantId: 'tenant-1',
        totalAmount: 50.0,
        abonosTotal: 0,
        abonosHistory: [],
        paymentStatus: PaymentStatus.PENDING,
      };
      orderRepo.findOne.mockResolvedValue(mockOrder);

      const result = await service.addAbono('tenant-1', 'order-1', 20.0);
      expect(result.abonosTotal).toBe(20.0);
      expect(result.paymentStatus).toBe(PaymentStatus.PARTIAL);
      expect(result.abonosHistory.length).toBe(1);
      expect(orderRepo.save).toHaveBeenCalled();
    });

    it('sets status to PAID when abono reaches total amount', async () => {
      const mockOrder = {
        id: 'order-1',
        tenantId: 'tenant-1',
        totalAmount: 50.0,
        abonosTotal: 30.0,
        abonosHistory: [{ id: '1', amount: 30.0, date: new Date().toISOString() }],
        paymentStatus: PaymentStatus.PARTIAL,
      };
      orderRepo.findOne.mockResolvedValue(mockOrder);

      const result = await service.addAbono('tenant-1', 'order-1', 20.0);
      expect(result.abonosTotal).toBe(50.0);
      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
      expect(result.abonosHistory.length).toBe(2);
      expect(orderRepo.save).toHaveBeenCalled();
    });
  });

  describe('revertAbono', () => {
    it('reverts abono and restores PENDING status when abonosTotal becomes 0', async () => {
      const mockOrder = {
        id: 'order-1',
        tenantId: 'tenant-1',
        totalAmount: 50.0,
        abonosTotal: 20.0,
        abonosHistory: [{ id: '1', amount: 20.0, date: new Date().toISOString() }],
        paymentStatus: PaymentStatus.PARTIAL,
      };
      orderRepo.findOne.mockResolvedValue(mockOrder);

      const result = await service.revertAbono('tenant-1', 'order-1', 0);
      expect(result.abonosTotal).toBe(0);
      expect(result.paymentStatus).toBe(PaymentStatus.PENDING);
      expect(result.abonosHistory.length).toBe(0);
    });
  });

  describe('createOrder validation', () => {
    it('throws BadRequestException if items array is empty and payment is not PENDING', async () => {
      const dto: CreateOrderDto = {
        customerName: 'Juan Perez',
        items: [],
        paymentStatus: PaymentStatus.PAID,
      };

      await expect(service.createOrder('tenant-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if item quantity is <= 0', async () => {
      const dto: CreateOrderDto = {
        customerName: 'Juan Perez',
        items: [{ productId: 'prod-1', quantity: 0, unitPrice: 10 }],
        paymentStatus: PaymentStatus.PAID,
      };

      await expect(service.createOrder('tenant-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if unitPrice is negative', async () => {
      const dto: CreateOrderDto = {
        customerName: 'Juan Perez',
        items: [{ productId: 'prod-1', quantity: 2, unitPrice: -5 }],
        paymentStatus: PaymentStatus.PAID,
      };

      await expect(service.createOrder('tenant-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if discountAmount is negative', async () => {
      const dto: CreateOrderDto = {
        customerName: 'Juan Perez',
        items: [{ productId: 'prod-1', quantity: 1, unitPrice: 10 }],
        paymentStatus: PaymentStatus.PAID,
        discountAmount: -2,
      };

      await expect(service.createOrder('tenant-1', dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateOrderStatus', () => {
    it('throws BadRequestException if order not found', async () => {
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(null),
        };
        return cb(manager);
      });

      await expect(service.updateOrderStatus('tenant-1', 'order-none', OrderStatus.PREPARING)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if order is already canceled', async () => {
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue({
            id: 'order-1',
            status: OrderStatus.CANCELED,
            items: [],
          }),
        };
        return cb(manager);
      });

      await expect(service.updateOrderStatus('tenant-1', 'order-1', OrderStatus.DELIVERED)).rejects.toThrow(
        'El pedido ya está cancelado',
      );
    });
  });
});
