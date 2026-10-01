import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CustomersService } from '../customers/customers.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { Reservation } from '../entities/reservation.entity';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let mockRepo: any;
  let mockNotificationsService: any;
  let mockCustomersService: any;
  let mockStorageService: any;

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((dto) => dto),
    };

    mockNotificationsService = {
      sendNotificationToIdentifier: jest.fn().mockResolvedValue(1),
    };

    mockCustomersService = {};
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
    it('debe construir la notificación con data.url = "/appointment/" + id (nunca /booking)', async () => {
      const tenantId = 'tenant-123';
      const reservationId = 'res-abc-789';

      const mockReservation = {
        id: reservationId,
        tenantId,
        customerName: 'Laura Martínez',
        customerPhone: '+584121234567',
        identification: 'V12345678',
      };

      mockRepo.findOne.mockResolvedValue(mockReservation);

      const result = await service.notifyDelay(tenantId, reservationId, 20);

      expect(result.success).toBe(true);
      expect(mockNotificationsService.sendNotificationToIdentifier).toHaveBeenCalled();

      // Verificar que el payload contenga la URL correcta
      const [, payload] = mockNotificationsService.sendNotificationToIdentifier.mock.calls[0];
      expect(payload.data.url).toBe(`/appointment/${reservationId}`);
      expect(payload.data.url).not.toBe('/booking');
      expect(payload.data.reservationId).toBe(reservationId);
      expect(payload.body).toContain('20 minutos');
    });

    it('debe arrojar NotFoundException si la reserva no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.notifyDelay('tenant-1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
