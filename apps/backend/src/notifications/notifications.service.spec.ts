import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { PushSubscription } from '../entities/push-subscription.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockPushRepo: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockPushRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((dto) => dto),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };

    mockConfigService = {
      get: jest.fn(() => null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(PushSubscription), useValue: mockPushRepo },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('notifyNewOrder', () => {
    it('debe enviar el payload con data.url = "/orders" (nunca /pedidos)', async () => {
      const sendSpy = jest.spyOn(service, 'sendNotificationToNegocio').mockResolvedValue(1);

      const order = {
        id: '12345678-abcd-1234',
        customerName: 'Carlos Pérez',
        totalAmount: 45.5,
      };

      await service.notifyNewOrder('negocio-1', order);

      expect(sendSpy).toHaveBeenCalledTimes(1);
      const [negocioId, payload, roles] = sendSpy.mock.calls[0];

      expect(negocioId).toBe('negocio-1');
      expect(payload.data.url).toBe('/orders');
      expect(payload.data.url).not.toBe('/pedidos');
      expect(payload.data.type).toBe('NEW_ORDER');
      expect(roles).toEqual(['ADMIN', 'CAJERO']);
    });
  });

  describe('notifyNewReservation', () => {
    it('debe enviar el payload con data.url = "/reservations" (nunca /agenda)', async () => {
      const sendSpy = jest.spyOn(service, 'sendNotificationToNegocio').mockResolvedValue(1);

      const reservation = {
        id: 'res-999',
        customerName: 'María Gómez',
        serviceName: 'Limpieza Facial',
        time: '14:00',
      };

      await service.notifyNewReservation('negocio-1', reservation);

      expect(sendSpy).toHaveBeenCalledTimes(1);
      const [negocioId, payload, roles] = sendSpy.mock.calls[0];

      expect(negocioId).toBe('negocio-1');
      expect(payload.data.url).toBe('/reservations');
      expect(payload.data.url).not.toBe('/agenda');
      expect(payload.data.type).toBe('NEW_RESERVATION');
      expect(roles).toEqual(['ADMIN', 'CAJERO']);
    });
  });
});
