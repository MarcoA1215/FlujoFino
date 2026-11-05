import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { PushSubscription } from '../entities/push-subscription.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockPushRepo: any;
  let mockConfigService: any;
  let mockQueryBuilder: any;

  beforeEach(async () => {
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    mockPushRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((dto) => dto),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
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
      const [negocioId, payload, roles, resArg] = sendSpy.mock.calls[0];

      expect(negocioId).toBe('negocio-1');
      expect(payload.data.url).toBe('/reservations');
      expect(payload.data.url).not.toBe('/agenda');
      expect(payload.data.type).toBe('NEW_RESERVATION');
      expect(roles).toEqual(['ADMIN', 'CAJERO']);
      expect(resArg).toBe(reservation);
    });

    it('debe incluir la fecha y la hora formateada en el cuerpo del mensaje de nueva reserva', async () => {
      const sendSpy = jest.spyOn(service, 'sendNotificationToNegocio').mockResolvedValue(1);

      const reservation = {
        id: 'res-101',
        customerName: 'Pedro Pérez',
        serviceName: 'Corte y Barba',
        date: '2026-11-20',
        time: '15:30:00',
        employeeId: 'emp-uuid-1',
      };

      await service.notifyNewReservation('negocio-1', reservation);

      expect(sendSpy).toHaveBeenCalledTimes(1);
      const [, payload, , resArg] = sendSpy.mock.calls[0];

      expect(payload.body).toContain('2026-11-20');
      expect(payload.body).toContain('15:30');
      expect(payload.body).toBe('Pedro Pérez reservó "Corte y Barba" para el 2026-11-20 a las 15:30');
      expect(resArg.employeeId).toBe('emp-uuid-1');
    });
  });

  describe('notifyRescheduledReservation', () => {
    it('debe incluir fecha y hora en el cuerpo del mensaje de reprogramación', async () => {
      const sendSpy = jest.spyOn(service, 'sendNotificationToNegocio').mockResolvedValue(1);

      const reservation = {
        id: 'res-202',
        customerName: 'Laura Silva',
        date: '2026-11-25',
        time: '16:00:00',
        employeeId: 'emp-uuid-2',
      };

      await service.notifyRescheduledReservation('negocio-1', reservation, {
        oldDate: '2026-11-22',
        oldTime: '10:00:00',
        reason: 'Imprevisto laboral',
      });

      expect(sendSpy).toHaveBeenCalledTimes(1);
      const [negocioId, payload, roles, resArg] = sendSpy.mock.calls[0];

      expect(negocioId).toBe('negocio-1');
      expect(payload.title).toContain('Cita Reprogramada');
      expect(payload.body).toContain('2026-11-22');
      expect(payload.body).toContain('10:00');
      expect(payload.body).toContain('2026-11-25');
      expect(payload.body).toContain('16:00');
      expect(payload.body).toContain('Imprevisto laboral');
      expect(payload.data.type).toBe('APPOINTMENT_RESCHEDULED');
      expect(roles).toEqual(['ADMIN', 'CAJERO']);
      expect(resArg).toBe(reservation);
    });
  });

  describe('sendNotificationToNegocio con aislamiento de especialistas', () => {
    it('debe incluir condición para el especialista asignado si la reserva tiene especialista', async () => {
      const reservation = {
        id: 'res-303',
        employeeId: 'emp-juan-uuid',
      };

      await service.sendNotificationToNegocio(
        'tenant-spa',
        { title: 'Nueva Cita', body: 'Detalle' },
        ['ADMIN', 'CAJERO'],
        reservation,
      );

      expect(mockPushRepo.createQueryBuilder).toHaveBeenCalledWith('sub');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('sub.negocioId = :negocioId', { negocioId: 'tenant-spa' });

      // Debe haber llamado a andWhere con la cláusula que incluye al especialista
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('sub.role != :customerRole AND LOWER(sub.identifier) IN (:...specialistIdentifiers)'),
        expect.objectContaining({
          customerRole: 'CUSTOMER',
          specialistIdentifiers: expect.arrayContaining(['emp-juan-uuid']),
        }),
      );
    });

    it('NO debe incluir especialistas si la reserva no tiene especialista asociado', async () => {
      const reservation = {
        id: 'res-404',
        employeeId: null,
      };

      await service.sendNotificationToNegocio(
        'tenant-spa',
        { title: 'Nueva Cita', body: 'Detalle' },
        ['ADMIN', 'CAJERO'],
        reservation,
      );

      // Solo debe filtrar por roles de administración/caja sin cláusula de especialista
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'sub.role IN (:...roles)',
        expect.objectContaining({
          roles: expect.arrayContaining(['ADMIN', 'CAJERO']),
        }),
      );
    });
  });
});
