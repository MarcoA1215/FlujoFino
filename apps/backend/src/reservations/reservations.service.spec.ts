import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { Reservation } from '../entities/reservation.entity';
import { CustomersService } from '../customers/customers.service';
import { ReservationStatus } from '@nutrideli/shared-types';

describe('ReservationsService (Appointments / Service Business Flow)', () => {
  let service: ReservationsService;
  let repo: any;
  let customersService: any;
  let settingsRepo: any;

  beforeEach(async () => {
    settingsRepo = {
      findOne: jest.fn(),
    };

    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
      create: jest.fn((dto) => dto),
      manager: {
        getRepository: jest.fn().mockImplementation((name) => {
          if (name === 'Settings') return settingsRepo;
          return { find: jest.fn().mockResolvedValue([]) };
        }),
      },
      createQueryBuilder: jest.fn(),
    };

    customersService = {
      recordCustomerOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: getRepositoryToken(Reservation), useValue: repo },
        { provide: CustomersService, useValue: customersService },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

  describe('validateBusinessHours', () => {
    it('throws BadRequestException if business is closed on that day', async () => {
      // 2026-09-27 is Sunday (UTC day 0)
      settingsRepo.findOne.mockResolvedValue({
        businessHours: {
          '0': { isOpen: false, startTime: '09:00', endTime: '18:00' },
        },
      });

      await expect(
        service.validateBusinessHours('tenant-1', '2026-09-27', '10:00'),
      ).rejects.toThrow('El local está cerrado ese día');
    });

    it('throws BadRequestException if requested time is outside working hours', async () => {
      // 2026-09-28 is Monday (UTC day 1)
      settingsRepo.findOne.mockResolvedValue({
        businessHours: {
          '1': { isOpen: true, startTime: '09:00', endTime: '17:00' },
        },
      });

      await expect(
        service.validateBusinessHours('tenant-1', '2026-09-28', '19:00'),
      ).rejects.toThrow('El horario laboral es de');
    });

    it('passes if requested time is inside working hours', async () => {
      settingsRepo.findOne.mockResolvedValue({
        businessHours: {
          '1': { isOpen: true, startTime: '09:00', endTime: '17:00' },
        },
      });

      await expect(
        service.validateBusinessHours('tenant-1', '2026-09-28', '11:00'),
      ).resolves.not.toThrow();
    });
  });

  describe('validateSlotOverlap', () => {
    it('passes if no existing reservations exist for that date', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.validateSlotOverlap('tenant-1', '2026-09-28', '10:00'),
      ).resolves.not.toThrow();
    });
  });
});
