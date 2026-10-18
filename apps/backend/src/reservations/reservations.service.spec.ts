import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CustomersService } from '../customers/customers.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { Reservation } from '../entities/reservation.entity';
import { Order } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
import { OrderItem } from '../entities/order-item.entity';
import { ReservationStatus, PaymentStatus, UserRole } from '@finowork/shared-types';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { Settings } from '../entities/settings.entity';

describe('ReservationsService Suite', () => {
  let service: ReservationsService;
  let mockRepo: any;
  let mockOrderRepo: any;
  let mockOrderItemRepo: any;
  let mockProductRepo: any;
  let mockNotificationsService: any;
  let mockCustomersService: any;
  let mockStorageService: any;
  let mockManager: any;

  beforeEach(async () => {
    mockOrderRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn((e) => Promise.resolve(e)),
      create: jest.fn((dto) => dto),
    };

    mockOrderItemRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn((e) => Promise.resolve(e)),
      create: jest.fn((dto) => dto),
    };

    mockProductRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn((e) => Promise.resolve(e)),
    };

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
        if (entity === Order || entity?.name === 'Order') {
          return mockOrderRepo;
        }
        if (entity === Reservation || entity?.name === 'Reservation') {
          return mockRepo;
        }
        if (entity === Product || entity === 'Product' || entity?.name === 'Product') {
          return mockProductRepo;
        }
        if (entity === OrderItem || entity === 'OrderItem' || entity?.name === 'OrderItem') {
          return mockOrderItemRepo;
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

  describe('Sincronización Bidireccional con el Tablero de Pedidos (Orders)', () => {
    it('al reprogramar una cita debe actualizar requestedDeliveryDate y las notas de la orden vinculada', async () => {
      const tenantId = 'tenant-123';
      const resId = 'res-sync-1';

      const mockReservation = {
        id: resId,
        tenantId,
        customerName: 'Cliente Sync',
        date: '2026-10-15',
        time: '10:00:00',
        durationMinutes: 30,
        status: ReservationStatus.CONFIRMED,
      };

      const mockLinkedOrder: any = {
        id: 'ord-linked-1',
        tenantId,
        linkedReservationId: resId,
        status: 'PENDING',
        notes: '[Cita: 2026-10-15 10:00] Pedido inicial',
        requestedDeliveryDate: new Date('2026-10-15T10:00:00Z'),
      };

      mockRepo.findOne.mockResolvedValue(mockReservation);
      mockOrderRepo.findOne.mockResolvedValue(mockLinkedOrder);

      await service.reschedule(tenantId, resId, {
        date: '2026-10-15',
        time: '14:30',
        reason: 'Retraso de transporte',
      });

      expect(mockOrderRepo.save).toHaveBeenCalled();
      expect(mockLinkedOrder.requestedDeliveryDate).toEqual(new Date('2026-10-15T14:30:00'));
      expect(mockLinkedOrder.notes).toContain('[Cita: 2026-10-15 14:30]');
    });

    it('al cancelar una cita debe cancelar la orden vinculada en el tablero de pedidos', async () => {
      const tenantId = 'tenant-123';
      const resId = 'res-cancel-sync';

      const mockReservation = {
        id: resId,
        tenantId,
        status: ReservationStatus.CONFIRMED,
      };

      const mockLinkedOrder: any = {
        id: 'ord-cancel-1',
        tenantId,
        linkedReservationId: resId,
        status: 'PENDING',
      };

      mockRepo.findOne.mockResolvedValue(mockReservation);
      mockOrderRepo.findOne.mockResolvedValue(mockLinkedOrder);

      await service.updateStatus(tenantId, resId, ReservationStatus.CANCELED);

      expect(mockOrderRepo.save).toHaveBeenCalled();
      expect(mockLinkedOrder.status).toBe('CANCELED');
    });

    it('al completar una cita debe marcar la orden vinculada como DELIVERED (entregada)', async () => {
      const tenantId = 'tenant-123';
      const resId = 'res-comp-sync';

      const mockReservation = {
        id: resId,
        tenantId,
        status: ReservationStatus.CONFIRMED,
      };

      const mockLinkedOrder: any = {
        id: 'ord-deliv-1',
        tenantId,
        linkedReservationId: resId,
        status: 'PENDING',
      };

      mockRepo.findOne.mockResolvedValue(mockReservation);
      mockOrderRepo.findOne.mockResolvedValue(mockLinkedOrder);

      await service.updateStatus(tenantId, resId, ReservationStatus.COMPLETED);

      expect(mockOrderRepo.save).toHaveBeenCalled();
      expect(mockLinkedOrder.status).toBe('DELIVERED');
    });

    it('al registrar un abono en la cita debe actualizar el saldo y abonos de la orden vinculada', async () => {
      const tenantId = 'tenant-123';
      const resId = 'res-abono-sync';

      const mockReservation = {
        id: resId,
        tenantId,
        totalAmount: 50,
        abonosTotal: 0,
        abonosHistory: [],
        paymentStatus: PaymentStatus.PENDING,
      };

      const mockLinkedOrder: any = {
        id: 'ord-abono-1',
        tenantId,
        linkedReservationId: resId,
        abonosTotal: 0,
        abonosHistory: [],
      };

      mockRepo.findOne.mockResolvedValue(mockReservation);
      mockOrderRepo.findOne.mockResolvedValue(mockLinkedOrder);

      await service.addAbono(tenantId, resId, 20);

      expect(mockOrderRepo.save).toHaveBeenCalled();
      expect(mockLinkedOrder.abonosTotal).toBe(20);
      expect(mockLinkedOrder.paymentStatus).toBe(PaymentStatus.PARTIAL);
    });

    it('al eliminar una cita debe cancelar la orden vinculada para no dejar tickets huérfanos', async () => {
      const tenantId = 'tenant-123';
      const resId = 'res-del-sync';

      const mockReservation = {
        id: resId,
        tenantId,
        serviceName: 'Masaje Relajante',
      };

      const mockLinkedOrder: any = {
        id: 'ord-del-orphan',
        tenantId,
        linkedReservationId: resId,
        status: 'PENDING',
      };

      mockRepo.findOne.mockResolvedValue(mockReservation);
      mockRepo.remove = jest.fn().mockResolvedValue(true);
      mockOrderRepo.findOne.mockResolvedValue(mockLinkedOrder);

      await service.delete(tenantId, resId);

      expect(mockOrderRepo.save).toHaveBeenCalled();
      expect(mockLinkedOrder.status).toBe('CANCELED');
      expect(mockRepo.remove).toHaveBeenCalledWith(mockReservation);
    });
  });

  describe('Gestión de Especialistas por Servicio y Órdenes Vinculadas', () => {
    it('al crear una reserva con múltiples servicios debe auto-asignar especialistas calificados a serviceSpecialists', async () => {
      const tenantId = 'tenant-123';
      const prodA = { id: 'svc-1', name: 'Corte', salePrice: 20, durationMinutes: 30, assignedStaffIds: ['emp-ana'] };
      const prodB = { id: 'svc-2', name: 'Manicura', salePrice: 15, durationMinutes: 30, assignedStaffIds: ['emp-carlos'] };

      mockProductRepo.findOne.mockImplementation(({ where }: any) => {
        if (where?.id === 'svc-1') return Promise.resolve(prodA);
        if (where?.id === 'svc-2') return Promise.resolve(prodB);
        return Promise.resolve(null);
      });
      mockProductRepo.find.mockResolvedValue([prodA, prodB]);

      const res = await service.create(tenantId, {
        customerName: 'Cliente Prueba',
        customerPhone: '123456',
        date: '2026-10-15',
        time: '10:00:00',
        serviceId: 'svc-1,svc-2',
        force: true,
      });

      expect(res.serviceSpecialists).toBeDefined();
      expect(res.serviceSpecialists).toHaveLength(2);
      expect(res.serviceSpecialists[0].serviceId).toBe('svc-1');
      expect(res.serviceSpecialists[0].employeeId).toBe('emp-ana');
      expect(res.serviceSpecialists[1].serviceId).toBe('svc-2');
      expect(res.serviceSpecialists[1].employeeId).toBe('emp-carlos');
    });

    it('al actualizar el especialista de un servicio en la cita debe sincronizar el employeeId en los OrderItems de la orden vinculada', async () => {
      const tenantId = 'tenant-123';
      const resId = 'res-spec-sync';

      const mockReservation = {
        id: resId,
        tenantId,
        date: '2026-10-15',
        time: '10:00:00',
        serviceId: 'svc-1,svc-2',
        serviceSpecialists: [
          { serviceId: 'svc-1', serviceName: 'Corte', employeeId: 'emp-ana' },
          { serviceId: 'svc-2', serviceName: 'Manicura', employeeId: 'emp-carlos' },
        ],
      };

      const mockLinkedOrder = {
        id: 'ord-linked-123',
        tenantId,
        linkedReservationId: resId,
      };

      const item1 = { id: 'item-1', orderId: 'ord-linked-123', productId: 'svc-1', productName: 'Corte', employeeId: 'emp-ana' };
      const item2 = { id: 'item-2', orderId: 'ord-linked-123', productId: 'svc-2', productName: 'Manicura', employeeId: 'emp-carlos' };

      mockRepo.findOne.mockResolvedValue(mockReservation);
      mockOrderRepo.findOne.mockResolvedValue(mockLinkedOrder);
      mockOrderItemRepo.find.mockResolvedValue([item1, item2]);

      // El admin cambia el especialista de Corte a 'emp-maria'
      const updatedSpecialists = [
        { serviceId: 'svc-1', serviceName: 'Corte', employeeId: 'emp-maria' },
        { serviceId: 'svc-2', serviceName: 'Manicura', employeeId: 'emp-carlos' },
      ];

      await service.update(tenantId, resId, {
        serviceSpecialists: updatedSpecialists,
        force: true,
      });

      expect(mockOrderItemRepo.save).toHaveBeenCalled();
      expect(item1.employeeId).toBe('emp-maria');
      expect(item2.employeeId).toBe('emp-carlos');
    });

    it('debe rechazar la cita si el especialista asignado a un servicio no está calificado para el mismo', async () => {
      const tenantId = 'tenant-123';
      const prodA = { id: 'svc-1', name: 'Corte', salePrice: 20, durationMinutes: 30, assignedStaffIds: ['emp-ana'] };

      mockProductRepo.findOne.mockResolvedValue(prodA);
      mockProductRepo.find.mockResolvedValue([prodA]);

      // Intentamos asignar a 'emp-no-calificado' para 'svc-1' sin force
      await expect(
        service.create(tenantId, {
          customerName: 'Cliente',
          customerPhone: '123',
          date: '2026-10-15',
          time: '10:00:00',
          serviceId: 'svc-1',
          serviceSpecialists: [
            { serviceId: 'svc-1', serviceName: 'Corte', employeeId: 'emp-no-calificado' },
          ],
          force: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe permitir especialistas estéticos con cargo como "limpieza facial" y no descartarlos como personal de limpieza/aseo', async () => {
      const tenantId = 'tenant-123';
      const prodFacial = { id: 'svc-facial', name: 'Limpieza Facial', salePrice: 35, durationMinutes: 60, assignedStaffIds: ['emp-doris'] };

      mockProductRepo.find.mockResolvedValue([prodFacial]);

      const accessDoris = {
        id: 'acc-doris',
        tenantId,
        isActive: true,
        status: 'ACCEPTED',
        jobTitle: 'pedicurista, masajista, limpieza facial',
        user: { id: 'emp-doris', name: 'Doris Especialista', role: UserRole.STAFF },
      };

      const accessRepoMock = {
        find: jest.fn().mockResolvedValue([accessDoris]),
      };

      (mockManager.getRepository as jest.Mock).mockImplementation((entity: any) => {
        if (entity === UserTenantAccess || entity?.name === 'UserTenantAccess') {
          return accessRepoMock;
        }
        if (entity === Settings || entity === 'Settings' || entity?.name === 'Settings') {
          return {
            findOne: jest.fn().mockResolvedValue({
              businessHours: {
                '4': { isOpen: true, startTime: '09:00', endTime: '18:00' },
              },
              slotInterval: 60,
            }),
          };
        }
        if (entity === Product || entity?.name === 'Product') {
          return mockProductRepo;
        }
        if (entity === Reservation || entity?.name === 'Reservation') {
          return mockRepo;
        }
        return {
          findOne: jest.fn().mockResolvedValue(null),
          find: jest.fn().mockResolvedValue([]),
          createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        };
      });

      const slots = await service.calculateAvailableSlots(tenantId, '2026-10-15', 'svc-facial', undefined, 'emp-doris');
      expect(slots).toBeDefined();
      expect(Array.isArray(slots)).toBe(true);
      expect(slots.length).toBeGreaterThan(0);
      expect(slots).toContain('09:00');
    });
  });
});
