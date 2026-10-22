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
import { Reservation } from '../entities/reservation.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { UserRole, ReservationStatus, PaymentStatus } from '@finowork/shared-types';
import * as tenantCrypto from '../utils/tenant-crypto';

describe('PublicReservationsController Suite', () => {
  let controller: PublicReservationsController;
  let mockTenantRepo: any;
  let mockSettingsRepo: any;
  let mockProductRepo: any;
  let mockAccessRepo: any;
  let mockReservationRepo: any;
  let mockNotificationsService: any;
  let mockReservationsService: any;

  beforeEach(async () => {
    mockSettingsRepo = {
      findOne: jest.fn().mockResolvedValue({
        bookingAllowStaffSelection: true,
        slotInterval: 30,
        businessHours: {
          '1': { isOpen: true, startTime: '09:00', endTime: '18:00' }, // Monday
          '2': { isOpen: true, startTime: '09:00', endTime: '18:00' },
          '3': { isOpen: true, startTime: '09:00', endTime: '18:00' },
          '4': { isOpen: true, startTime: '09:00', endTime: '18:00' },
          '5': { isOpen: true, startTime: '09:00', endTime: '18:00' },
          '6': { isOpen: true, startTime: '09:00', endTime: '18:00' },
          '0': { isOpen: false },
        },
      }),
    };

    mockProductRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };

    mockAccessRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };

    mockReservationRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn((e) => Promise.resolve(e)),
      createQueryBuilder: jest.fn(),
    };

    mockNotificationsService = {
      sendNotificationToNegocio: jest.fn().mockResolvedValue(true),
      notifyCustomerAppointment: jest.fn().mockResolvedValue(true),
      sendNotificationToIdentifier: jest.fn().mockResolvedValue(true),
      notifyNewReservation: jest.fn().mockResolvedValue(true),
    };

    mockReservationsService = {
      create: jest.fn(),
    };

    const manager = {
      getRepository: jest.fn((target: any) => {
        if (target === Settings || target?.name === 'Settings') return mockSettingsRepo;
        if (target === Product || target?.name === 'Product') return mockProductRepo;
        if (target === UserTenantAccess || target?.name === 'UserTenantAccess') return mockAccessRepo;
        if (target === Reservation || target?.name === 'Reservation') return mockReservationRepo;
        return { find: jest.fn(), findOne: jest.fn(), save: jest.fn() };
      }),
      transaction: jest.fn((cb) => cb(manager)),
      query: jest.fn().mockResolvedValue([]),
    };

    mockTenantRepo = {
      findOne: jest.fn(),
      manager,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicReservationsController],
      providers: [
        { provide: ReservationsService, useValue: mockReservationsService },
        { provide: CustomersService, useValue: {} },
        { provide: StorageService, useValue: {} },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: getRepositoryToken(Tenant), useValue: mockTenantRepo },
      ],
    }).compile();

    controller = module.get<PublicReservationsController>(PublicReservationsController);
  });

  describe('Staff Filtering', () => {
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

      expect(staffIds).not.toContain('u-delivery');
      expect(staffIds).not.toContain('u-operativo');
      expect(staffIds).toContain('u-pos');
      expect(staffIds).toContain('u-admin');
    });
  });

  describe('Flujo de Aceptación de Reprogramación (Anti-regresión "A lo arrecho")', () => {
    it('NO debe auto-aceptar prematuramente si la hora original ya pasó pero la nueva hora está en el futuro', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString().substring(0, 10);
      const mockReservation: any = {
        id: 'res-future',
        tenantId: 'tenant-1',
        customerName: 'Cliente Prueba',
        date: futureDate,
        time: '16:00:00',
        originalDate: '2020-01-01',
        originalTime: '09:00:00', // En el pasado
        rescheduleStatus: 'PENDING_ACCEPTANCE',
        totalAmount: 30,
        abonosTotal: 0,
        tenant: { name: 'Salon Spa' },
      };

      mockReservationRepo.findOne.mockResolvedValue(mockReservation);

      const result = await controller.getAppointment('res-future');

      // Debe permanecer estrictamente en PENDING_ACCEPTANCE para que el cliente decida
      expect(result.rescheduleStatus).toBe('PENDING_ACCEPTANCE');
      expect(mockReservation.rescheduleStatus).toBe('PENDING_ACCEPTANCE');
      expect(mockReservationRepo.save).not.toHaveBeenCalled();
    });

    it('debe marcar como ACCEPTED solo si la hora de la NUEVA cita ya transcurrió en el tiempo', async () => {
      const pastDate = '2020-01-01';
      const mockReservation: any = {
        id: 'res-past',
        tenantId: 'tenant-1',
        customerName: 'Cliente Pasado',
        date: pastDate,
        time: '10:00:00', // Nueva hora ya pasó hace años
        originalTime: '09:00:00',
        rescheduleStatus: 'PENDING_ACCEPTANCE',
        totalAmount: 30,
        abonosTotal: 0,
        tenant: { name: 'Salon Spa' },
      };

      mockReservationRepo.findOne.mockResolvedValue(mockReservation);

      const result = await controller.getAppointment('res-past');

      expect(result.rescheduleStatus).toBe('ACCEPTED');
      expect(mockReservation.rescheduleStatus).toBe('ACCEPTED');
      expect(mockReservationRepo.save).toHaveBeenCalled();
    });

    it('acceptReschedule debe actualizar rescheduleStatus a ACCEPTED y notificar al negocio y cliente', async () => {
      const mockReservation: any = {
        id: 'res-accept',
        tenantId: 'tenant-1',
        customerName: 'Manuel Gómez',
        date: '2026-10-20',
        time: '15:00:00',
        rescheduleStatus: 'PENDING_ACCEPTANCE',
      };

      mockReservationRepo.findOne.mockResolvedValue(mockReservation);

      const response = await controller.acceptReschedule('res-accept');

      expect(response.success).toBe(true);
      expect(mockReservation.rescheduleStatus).toBe('ACCEPTED');
      expect(mockReservationRepo.save).toHaveBeenCalledWith(mockReservation);

      // Notificación al negocio
      expect(mockNotificationsService.sendNotificationToNegocio).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({
          title: expect.stringContaining('Reprogramación Aceptada'),
          body: expect.stringContaining('Manuel Gómez'),
        }),
        expect.arrayContaining(['ADMIN', 'CAJERO']),
      );

      // Notificación al cliente
      expect(mockNotificationsService.notifyCustomerAppointment).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'res-accept' }),
        expect.objectContaining({
          title: expect.stringContaining('Horario Confirmado'),
        }),
      );
    });
  });

  describe('Cálculo de Disponibilidad de Bloques (Duraciones reales / 45 min)', () => {
    it('un servicio de 45 minutos debe bloquear tanto su bloque inicial como el subsiguiente', async () => {
      const tenantId = 'tenant-salon';
      jest.spyOn(tenantCrypto, 'decodeTenantId').mockReturnValue(tenantId);
      mockTenantRepo.findOne.mockResolvedValue({ id: tenantId, isActive: true });

      // Configuración: lunes de 09:00 a 12:00 con intervalos de 30 min
      mockSettingsRepo.findOne.mockResolvedValue({
        slotInterval: 30,
        businessHours: {
          '1': { isOpen: true, startTime: '09:00', endTime: '12:00' },
        },
      });

      // No hay staff adicional (negocio individual / solo business)
      mockAccessRepo.find.mockResolvedValue([]);

      // Cita existente a las 09:00 con duración explícita de 45 minutos (09:00 - 09:45)
      const mockExistingRes: any = {
        id: 'res-45min',
        tenantId,
        date: '2026-10-19', // Monday
        time: '09:00:00',
        durationMinutes: 45,
        status: ReservationStatus.CONFIRMED,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockExistingRes]),
      };
      mockReservationRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      // Consulta de disponibilidad para fecha futura (Monday)
      const slots = await controller.getAvailability('token-valido', '2026-10-19', undefined);

      // Bloques posibles normalmente: 09:00, 09:30, 10:00, 10:30, 11:00, 11:30
      // La cita dura de 09:00 a 09:45:
      // - 09:00 debe estar BLOQUEADO (09:00 < 09:45 && 09:30 > 09:00)
      // - 09:30 debe estar BLOQUEADO (09:30 < 09:45 && 10:00 > 09:00)
      // - 10:00 debe estar DISPONIBLE (empieza después de las 09:45)
      expect(slots).not.toContain('09:00');
      expect(slots).not.toContain('09:30');
      expect(slots).toContain('10:00');
      expect(slots).toContain('10:30');
      expect(slots).toContain('11:00');
      expect(slots).toContain('11:30');
    });
  });

  describe('Blindaje contra doble toque / duplicación de reservas y órdenes', () => {
    it('debe detectar doble toque del cliente y retornar la reservación existente sin duplicar', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      jest.spyOn(tenantCrypto, 'decodeTenantId').mockReturnValue(tenantId);
      mockTenantRepo.findOne.mockResolvedValue({ id: tenantId, name: 'Salon Spa', isActive: true, status: 'ACTIVE' });

      const existingRes = {
        id: 'res-existente-1',
        tenantId,
        date: '2026-10-20',
        time: '10:00',
        customerName: 'Maria Perez',
        customerPhone: '04141234567',
        status: ReservationStatus.CONFIRMED,
        createdAt: new Date(),
      };

      mockReservationRepo.findOne.mockResolvedValue(existingRes);

      const result = await controller.createPublicReservation('token-valido', {
        date: '2026-10-20',
        time: '10:00',
        customerName: 'Maria Perez',
        customerPhone: '04141234567',
      });

      expect(result).toBe(existingRes);
      expect(result.id).toBe('res-existente-1');
    });
  });

  describe('Disponibilidad de Horarios (calculateAvailableSlots fallback)', () => {
    it('debe retornar horarios disponibles incluso si el negocio no ha configurado businessHours (fallback 08:00 a 18:00)', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      jest.spyOn(tenantCrypto, 'decodeTenantId').mockReturnValue(tenantId);

      mockSettingsRepo.findOne.mockResolvedValueOnce({
        slotInterval: 60,
        businessHours: null, // Sin configuración de horario
      });

      mockReservationRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const slots = await controller.getAvailability('token-valido', '2026-10-28', '');
      expect(slots).toBeInstanceOf(Array);
      expect(slots.length).toBeGreaterThan(0);
      expect(slots).toContain('08:00');
      expect(slots).toContain('12:00');
      expect(slots).toContain('17:00');
    });

    it('debe retornar horarios para solo-business si no hay staff registrado o asignado', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      jest.spyOn(tenantCrypto, 'decodeTenantId').mockReturnValue(tenantId);

      mockSettingsRepo.findOne.mockResolvedValueOnce({
        slotInterval: 30,
        businessHours: {
          '3': { isOpen: true, startTime: '09:00', endTime: '12:00' },
        },
      });

      mockAccessRepo.find.mockResolvedValueOnce([]); // 0 staff accounts
      mockReservationRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const slots = await controller.getAvailability('token-valido', '2026-10-28', '');
      expect(slots).toBeInstanceOf(Array);
      expect(slots).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']);
    });

    it('debe calcular disponibilidad coordinada para múltiples servicios con especialistas distintos', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      jest.spyOn(tenantCrypto, 'decodeTenantId').mockReturnValue(tenantId);

      mockSettingsRepo.findOne.mockResolvedValueOnce({
        slotInterval: 30,
        businessHours: {
          '3': { isOpen: true, startTime: '10:00', endTime: '12:00' },
        },
      });

      mockAccessRepo.find.mockResolvedValueOnce([
        { userId: 'staff-1', role: 'ADMIN', user: { id: 'staff-1', username: 'Ana' } },
        { userId: 'staff-2', role: 'ADMIN', user: { id: 'staff-2', username: 'Carlos' } },
      ]);

      mockProductRepo.find.mockResolvedValueOnce([
        { id: 'svc-a', name: 'Corte', durationMinutes: 30, assignedStaffIds: ['staff-1'] },
        { id: 'svc-b', name: 'Uñas', durationMinutes: 30, assignedStaffIds: ['staff-2'] },
      ]);

      mockReservationRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { time: '11:00', durationMinutes: 30, employeeId: 'staff-1' },
        ]),
      });

      const slots = await controller.getAvailability('token-valido', '2026-10-28', 'svc-a,svc-b');
      expect(slots).toEqual(['10:00', '10:30']);
    });

    it('debe hacer fallback al equipo activo si uno de los servicios tiene un assignedStaffId obsoleto o inexistente', async () => {
      mockSettingsRepo.findOne.mockResolvedValueOnce({
        slotInterval: 30,
        businessHours: {
          '3': { isOpen: true, startTime: '10:00', endTime: '12:00' },
        },
      });

      mockAccessRepo.find.mockResolvedValueOnce([
        { userId: 'staff-1', role: 'ADMIN', user: { id: 'staff-1', username: 'Ana' } },
      ]);

      mockProductRepo.find.mockResolvedValueOnce([
        { id: 'svc-a', name: 'Corte', durationMinutes: 30, assignedStaffIds: ['staff-1'] },
        { id: 'svc-b', name: 'Uñas', durationMinutes: 30, assignedStaffIds: ['id-antiguo-inexistente'] },
      ]);

      mockReservationRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const slots = await controller.getAvailability('token-valido', '2026-10-28', 'svc-a,svc-b');
      expect(slots).toEqual(['10:00', '10:30', '11:00']);
    });
  });

  describe('Pago en Efectivo (CASH) en Reservas Públicas', () => {
    it('debe permitir agendar con pago en efectivo (CASH) incluso si el negocio tiene abono mínimo configurado', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      jest.spyOn(tenantCrypto, 'decodeTenantId').mockReturnValue(tenantId);
      mockTenantRepo.findOne.mockResolvedValue({ id: tenantId, name: 'Salon Spa', isActive: true, status: 'ACTIVE' });
      mockReservationRepo.findOne.mockResolvedValue(null);

      mockSettingsRepo.findOne.mockResolvedValue({
        bookingRequireDeposit: true,
        bookingDepositPercentage: 20,
        acceptCashUsd: true,
      });

      jest.spyOn<any, any>(controller, 'checkSlotAvailability').mockResolvedValue(true);

      mockReservationsService.create.mockResolvedValue({
        id: 'new-res-cash',
        tenantId,
        customerName: 'Carlos Cash',
        customerPhone: '04147778899',
        totalAmount: 50,
        notes: '[Pago en Efectivo al asistir]',
      });

      const res = await controller.createPublicReservation('token-valido', {
        date: '2026-10-25',
        time: '14:00',
        customerName: 'Carlos Cash',
        customerPhone: '04147778899',
        totalAmount: 50,
        paymentMethod: 'CASH',
      });

      expect(res).toBeDefined();
      expect(mockReservationsService.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          totalAmount: 50,
          paymentStatus: PaymentStatus.PENDING,
          abonosTotal: 0,
          notes: '[Pago en Efectivo al asistir]',
        })
      );
    });

    it('debe rechazar pago en efectivo (CASH) si el negocio desactivó explícitamente acceptCashUsd', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      jest.spyOn(tenantCrypto, 'decodeTenantId').mockReturnValue(tenantId);
      mockTenantRepo.findOne.mockResolvedValue({ id: tenantId, name: 'Salon Spa', isActive: true, status: 'ACTIVE' });
      mockReservationRepo.findOne.mockResolvedValue(null);

      mockSettingsRepo.findOne.mockResolvedValue({
        acceptCashUsd: false,
      });

      jest.spyOn<any, any>(controller, 'checkSlotAvailability').mockResolvedValue(true);

      await expect(controller.createPublicReservation('token-valido', {
        date: '2026-10-25',
        time: '14:00',
        customerName: 'Carlos Cash',
        customerPhone: '04147778899',
        totalAmount: 50,
        paymentMethod: 'CASH',
      })).rejects.toThrow('Este negocio no tiene habilitado el pago en efectivo.');
    });

    it('debe permitir agendar con modalidad ON_ARRIVAL (Cuenta abierta / Por pagar al asistir) sin exigir comprobante ni referencia', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      jest.spyOn(tenantCrypto, 'decodeTenantId').mockReturnValue(tenantId);
      mockTenantRepo.findOne.mockResolvedValue({ id: tenantId, name: 'Exotica Nails', isActive: true, status: 'ACTIVE' });
      mockReservationRepo.findOne.mockResolvedValue(null);

      mockSettingsRepo.findOne.mockResolvedValue({
        bookingRequireDeposit: false,
        bookingDepositPercentage: 30, // Aunque tenga un porcentaje guardado previo, bookingRequireDeposit es false
        acceptPagoMovil: true,
      });

      jest.spyOn<any, any>(controller, 'checkSlotAvailability').mockResolvedValue(true);

      mockReservationsService.create.mockResolvedValue({
        id: 'new-res-arrival',
        tenantId,
        customerName: 'Clienta Feliz',
        customerPhone: '04121234567',
        totalAmount: 25,
        notes: '[Por pagar al asistir (Cuenta abierta)]',
      });

      const res = await controller.createPublicReservation('token-valido', {
        date: '2026-10-25',
        time: '15:00',
        customerName: 'Clienta Feliz',
        customerPhone: '04121234567',
        totalAmount: 25,
        paymentMethod: 'ON_ARRIVAL',
      });

      expect(res).toBeDefined();
      expect(mockReservationsService.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          totalAmount: 25,
          paymentStatus: PaymentStatus.PENDING,
          abonosTotal: 0,
          notes: '[Por pagar al asistir (Cuenta abierta)]',
        })
      );
    });
  });
});

