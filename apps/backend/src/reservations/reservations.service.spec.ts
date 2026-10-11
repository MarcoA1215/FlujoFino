import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CustomersService } from '../customers/customers.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { Reservation } from '../entities/reservation.entity';
import { ReservationStatus, PaymentStatus } from '@finowork/shared-types';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';

describe('ReservationsService Suite', () => {
  let service: ReservationsService;
  let mockRepo: any;
  let mockNotificationsService: any;
  let mockCustomersService: any;
  let mockStorageService: any;
  let mockManager: any;

  beforeEach(async () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    mockRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
      create: jest.fn((dto) => dto),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    mockManager = {
      getRepository: jest.fn((entity: any) => {
        if (entity === 'Settings' || entity?.name === 'Settings') {
          return {
            findOne: jest.fn().mockResolvedValue({
              businessHours: {
                '4': { isOpen: true, startTime: '08:00', endTime: '18:00' }, // Thursday
              },
              slotInterval: 30,
            }),
          };
        }
        if (entity === UserTenantAccess || entity?.name === 'UserTenantAccess') {
          return {
            findOne: jest.fn().mockResolvedValue({
              userId: 'emp-1',
              exitTime: '17:00:00',
              isActive: true,
              status: 'ACCEPTED',
            }),
            find: jest.fn().mockResolvedValue([]),
          };
        }
        if (entity === Reservation || entity?.name === 'Reservation') {
          return mockRepo;
        }
        return {
          findOne: jest.fn().mockResolvedValue(null),
          find: jest.fn().mockResolvedValue([]),
          save: jest.fn((e) => Promise.resolve(e)),
          createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        };
      }),
      query: jest.fn().mockResolvedValue([]),
      save: jest.fn((target: any, entity?: any) => Promise.resolve(entity || target)),
    };

    mockRepo.manager = {
      ...mockManager,
      transaction: jest.fn((cb) => cb(mockManager)),
    };

    mockNotificationsService = {
      sendNotificationToIdentifier: jest.fn().mockResolvedValue(1),
      notifyCustomerAppointment: jest.fn().mockResolvedValue(1),
      sendNotificationToNegocio: jest.fn().mockResolvedValue(1),
    };

    mockCustomersService = {
      findOrCreateOrUpdate: jest.fn().mockResolvedValue({ id: 'cust-1', name: 'Laura', phone: '123' }),
    };

    mockStorageService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: getRepositoryToken(Reservation), useValue: mockRepo },
        { provide: CustomersService, useValue: mockCustomersService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

  describe('notifyDelay', () => {
    it('debe construir la notificación con data.url = "/appointment/" + id y mover la hora', async () => {
      const tenantId = 'tenant-123';
      const reservationId = 'res-abc-789';

      const mockReservation = {
        id: reservationId,
        tenantId,
        customerName: 'Laura Martínez',
        customerPhone: '+584121234567',
        identification: 'V12345678',
        time: '10:00:00',
        date: '2026-10-15', // Thursday (day 4)
        durationMinutes: 30,
        originalTime: null,
      };

      mockRepo.findOne.mockResolvedValue(mockReservation);

      const result = await service.notifyDelay(tenantId, reservationId, 20);

      expect(result.success).toBe(true);
      expect(mockNotificationsService.notifyCustomerAppointment).toHaveBeenCalled();

      const [, payload] = mockNotificationsService.notifyCustomerAppointment.mock.calls[0];
      expect(payload.data.url).toBe(`/appointment/${reservationId}`);
      expect(payload.data.url).not.toBe('/booking');
      expect(payload.data.reservationId).toBe(reservationId);
      expect(payload.body).toContain('20 minutos');
      expect(mockReservation.time).toBe('10:20:00');
      expect(mockReservation.originalTime).toBe('10:00');
      expect(mockReservation.rescheduleStatus).toBe('DELAYED');
    });

    it('debe arrojar BadRequestException si el retraso excede la hora de cierre del negocio', async () => {
      const mockReservation = {
        id: 'res-late',
        tenantId: 'tenant-123',
        customerName: 'Pedro',
        time: '17:40:00',
        date: '2026-10-15',
        durationMinutes: 30,
      };

      mockRepo.findOne.mockResolvedValue(mockReservation);

      // Cierre a las 18:00. 17:40 + 15 min = 17:55. Con 30 min de servicio termina 18:25 (> 18:00)
      await expect(service.notifyDelay('tenant-123', 'res-late', 15)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe arrojar BadRequestException si el retraso excede el horario de salida del especialista', async () => {
      const mockReservation = {
        id: 'res-emp-exit',
        tenantId: 'tenant-123',
        customerName: 'Sofia',
        time: '16:45:00',
        date: '2026-10-15',
        durationMinutes: 30,
        employeeId: 'emp-1', // Sale a las 17:00
      };

      mockRepo.findOne.mockResolvedValue(mockReservation);

      // 16:45 + 15 min = 17:00. Con 30 min finaliza 17:30 (> exitTime 17:00)
      await expect(service.notifyDelay('tenant-123', 'res-emp-exit', 15)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe arrojar NotFoundException si la reserva no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.notifyDelay('tenant-1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reschedule (Admin / Negocio)', () => {
    it('debe marcar rescheduleStatus como PENDING_ACCEPTANCE, registrar originalTime y notificar al cliente', async () => {
      const tenantId = 'tenant-123';
      const resId = 'res-resched-1';

      const mockReservation = {
        id: resId,
        tenantId,
        customerName: 'Carlos Ruiz',
        customerPhone: '+584141112233',
        date: '2026-10-15',
        time: '10:00:00',
        durationMinutes: 30,
        status: ReservationStatus.CONFIRMED,
        rescheduleStatus: null,
      };

      mockRepo.findOne.mockResolvedValue(mockReservation);

      const result = await service.reschedule(tenantId, resId, {
        date: '2026-10-15',
        time: '14:00',
        reason: 'Especialista indispuesto en la mañana',
      });

      expect(result.success).toBe(true);
      expect(mockReservation.date).toBe('2026-10-15');
      expect(mockReservation.time).toBe('14:00:00');
      expect(mockReservation.originalTime).toBe('10:00');
      expect(mockReservation.originalDate).toBe('2026-10-15');
      expect(mockReservation.rescheduleStatus).toBe('PENDING_ACCEPTANCE');
      expect(mockReservation['rescheduleReason']).toBe('Especialista indispuesto en la mañana');

      // Notificación push enviada al cliente
      expect(mockNotificationsService.notifyCustomerAppointment).toHaveBeenCalledWith(
        expect.objectContaining({
          id: resId,
          rescheduleStatus: 'PENDING_ACCEPTANCE',
        }),
        expect.objectContaining({
          title: expect.stringContaining('Reprogramada'),
          body: expect.stringContaining('14:00'),
        }),
      );
    });

    it('no debe permitir reprogramar una cita ya completada o cancelada', async () => {
      const mockReservation = {
        id: 'res-comp',
        tenantId: 'tenant-123',
        status: ReservationStatus.COMPLETED,
      };

      mockRepo.findOne.mockResolvedValue(mockReservation);

      await expect(
        service.reschedule('tenant-123', 'res-comp', { date: '2026-10-15', time: '11:00' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update (Modificaciones de Horario)', () => {
    it('debe asignar PENDING_ACCEPTANCE y respaldar originalTime cuando el admin cambia la hora en update', async () => {
      const tenantId = 'tenant-123';
      const resId = 'res-upd-1';

      const mockReservation = {
        id: resId,
        tenantId,
        customerName: 'Valeria',
        date: '2026-10-15',
        time: '09:00:00',
        durationMinutes: 30,
        status: ReservationStatus.PENDING,
      };

      mockRepo.findOne.mockResolvedValue(mockReservation);

      const saved = await service.update(tenantId, resId, {
        time: '11:30',
        force: true,
      });

      expect(saved.time).toBe('11:30');
      expect(saved.originalTime).toBe('09:00');
      expect(saved.rescheduleStatus).toBe('PENDING_ACCEPTANCE');
      expect(mockNotificationsService.notifyCustomerAppointment).toHaveBeenCalled();
    });
  });

  describe('Notificaciones en pagos y estado', () => {
    it('addAbono debe notificar al cliente el abono y saldo restante', async () => {
      const tenantId = 'tenant-123';
      const resId = 'res-pay-1';

      const mockReservation = {
        id: resId,
        tenantId,
        totalAmount: 100,
        abonosTotal: 0,
        abonosHistory: [],
        paymentStatus: PaymentStatus.PENDING,
      };

      mockRepo.findOne.mockResolvedValue(mockReservation);

      await service.addAbono(tenantId, resId, 40);

      expect(mockNotificationsService.notifyCustomerAppointment).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: expect.stringContaining('Abono Registrado'),
          body: expect.stringContaining('$40.00'),
        }),
      );
    });

    it('payFull debe saldar la cita y notificar al cliente', async () => {
      const tenantId = 'tenant-123';
      const resId = 'res-pay-full';

      const mockReservation = {
        id: resId,
        tenantId,
        totalAmount: 50,
        abonosTotal: 0,
        abonosHistory: [],
        paymentStatus: PaymentStatus.PENDING,
      };

      mockRepo.findOne.mockResolvedValue(mockReservation);

      await service.payFull(tenantId, resId);

      expect(mockReservation.paymentStatus).toBe(PaymentStatus.PAID);
      expect(mockNotificationsService.notifyCustomerAppointment).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: expect.stringContaining('Pago Completo Registrado'),
        }),
      );
    });
  });
});
