import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReservationsService } from './reservations.service';
import { CustomersService } from '../customers/customers.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { Reservation } from '../entities/reservation.entity';
import { PaymentStatus } from '@finowork/shared-types';

describe('Reservations JSONB Abonos History Integrity Suite', () => {
  let service: ReservationsService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(async (entity) => entity),
      create: jest.fn((dto) => dto),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: getRepositoryToken(Reservation), useValue: mockRepo },
        { provide: CustomersService, useValue: {} },
        { provide: NotificationsService, useValue: { sendNotificationToIdentifier: jest.fn() } },
        { provide: StorageService, useValue: {} },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

  it('debe asignar UUID estructural inmutable a cada abono nuevo insertado con addAbono', async () => {
    const tenantId = 'tenant-1';
    const resId = 'res-100';

    const reservation: any = {
      id: resId,
      tenantId,
      totalAmount: 100,
      abonosTotal: 0,
      abonosHistory: [],
      paymentStatus: PaymentStatus.PENDING,
    };

    mockRepo.findOne.mockResolvedValue(reservation);

    const updated = await service.addAbono(tenantId, resId, 25);

    expect(updated.abonosHistory).toHaveLength(1);
    const abono = updated.abonosHistory[0];
    expect(abono.amount).toBe(25);
    expect(abono.id).toBeDefined();
    expect(typeof abono.id).toBe('string');
    // Validar formato UUID v4
    expect(abono.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(updated.abonosTotal).toBe(25);
  });

  it('debe revertir el abono exacto por UUID aún tras alteración asíncrona del orden del array JSONB', async () => {
    const tenantId = 'tenant-1';
    const resId = 'res-200';

    // Crear 3 abonos iniciales con UUIDs identificables
    const abono1 = { id: 'uuid-abono-1', amount: 15, date: '2026-10-01T10:00:00.000Z' };
    const abono2 = { id: 'uuid-abono-2', amount: 35, date: '2026-10-02T10:00:00.000Z' };
    const abono3 = { id: 'uuid-abono-3', amount: 50, date: '2026-10-03T10:00:00.000Z' };

    const reservation: any = {
      id: resId,
      tenantId,
      totalAmount: 100,
      abonosTotal: 100, // 15 + 35 + 50
      abonosHistory: [abono1, abono2, abono3],
      paymentStatus: PaymentStatus.PAID,
    };

    // Simulamos que una operación asíncrona o actualización concurrente reordenó el array:
    // Ahora el orden en JSONB es [abono3, abono1, abono2]
    reservation.abonosHistory = [abono3, abono1, abono2];

    mockRepo.findOne.mockResolvedValue(reservation);

    // Si se usara el índice viejo (ej. index 1 que antes era abono2), borraría abono1 por error!
    // Pero con el blindaje por UUID, revertAbono busca 'uuid-abono-2' estrictamente:
    const updated = await service.revertAbono(tenantId, resId, 'uuid-abono-2');

    // 1. Debe haber eliminado ÚNICAMENTE el abono con uuid-abono-2
    expect(updated.abonosHistory).toHaveLength(2);
    expect(updated.abonosHistory.find((a: any) => a.id === 'uuid-abono-2')).toBeUndefined();

    // 2. Los abonos colindantes deben conservarse intactos
    expect(updated.abonosHistory.find((a: any) => a.id === 'uuid-abono-1')).toBeDefined();
    expect(updated.abonosHistory.find((a: any) => a.id === 'uuid-abono-3')).toBeDefined();

    // 3. El total de abonos debe descontar exactamente los 35 de abono2: 100 - 35 = 65
    expect(updated.abonosTotal).toBe(65);
    expect(updated.paymentStatus).toBe(PaymentStatus.PARTIAL);
  });
});
