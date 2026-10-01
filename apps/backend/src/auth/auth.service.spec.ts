import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { User } from '../entities/user.entity';

describe('AuthService - Email Verification & Password Reset', () => {
  let service: AuthService;
  let mockUserRepo: any;
  let mockDataSource: any;
  let mockMailService: any;
  let mockUsersService: any;
  let mockJwtService: any;

  beforeEach(async () => {
    mockUserRepo = {
      findOne: jest.fn(),
      save: jest.fn((u) => Promise.resolve(u)),
    };

    mockDataSource = {
      getRepository: jest.fn((entity: any) => {
        if (entity === User || entity?.name === 'User') return mockUserRepo;
        return mockUserRepo;
      }),
    };

    mockMailService = {
      sendVerificationCode: jest.fn(),
      sendPasswordResetCode: jest.fn(),
    };

    mockUsersService = {
      findByUsername: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: DataSource, useValue: mockDataSource },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('sendVerificationCode', () => {
    it('debe arrojar BadRequestException cuando mailService.sendVerificationCode retorne false', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'tester',
        verificationCode: null,
        verificationCodeExpires: null,
      };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockMailService.sendVerificationCode.mockResolvedValue(false);

      await expect(
        service.sendVerificationCode('test@example.com'),
      ).rejects.toThrow(BadRequestException);

      expect(mockUserRepo.save).toHaveBeenCalled();
      expect(mockMailService.sendVerificationCode).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringMatching(/^\d{6}$/),
      );
    });

    it('debe generar y guardar código de 6 dígitos con expiración de 15 min y retornar success: true cuando el envío es exitoso', async () => {
      const user: any = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'tester',
        verificationCode: null,
        verificationCodeExpires: null,
      };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockMailService.sendVerificationCode.mockResolvedValue(true);

      const before = Date.now();
      const result = await service.sendVerificationCode('test@example.com');
      const after = Date.now();

      expect(result.success).toBe(true);
      expect(user.emailVerificationCode).toMatch(/^\d{6}$/);
      expect(user.emailVerificationExpiresAt).toBeDefined();

      const expiresTime = new Date(user.emailVerificationExpiresAt).getTime();
      expect(expiresTime).toBeGreaterThanOrEqual(before + 14 * 60 * 1000);
      expect(expiresTime).toBeLessThanOrEqual(after + 16 * 60 * 1000);
      expect(mockUserRepo.save).toHaveBeenCalledWith(user);
    });
  });

  describe('forgotPassword', () => {
    it('debe arrojar BadRequestException si mailService.sendPasswordResetCode retorna false', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'tester',
        resetPasswordCode: null,
        resetPasswordExpires: null,
      };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockMailService.sendPasswordResetCode.mockResolvedValue(false);

      await expect(service.forgotPassword('test@example.com')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockUserRepo.save).toHaveBeenCalled();
      expect(mockMailService.sendPasswordResetCode).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringMatching(/^\d{6}$/),
      );
    });

    it('debe guardar resetPasswordCode y resetPasswordExpires si el envío es exitoso', async () => {
      const user: any = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'tester',
        resetPasswordCode: null,
        resetPasswordExpires: null,
      };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockMailService.sendPasswordResetCode.mockResolvedValue(true);

      const before = Date.now();
      const result = await service.forgotPassword('test@example.com');
      const after = Date.now();

      expect(result.success).toBe(true);
      expect(user.resetPasswordCode).toMatch(/^\d{6}$/);
      expect(user.resetPasswordExpires).toBeDefined();

      const expiresTime = new Date(user.resetPasswordExpires).getTime();
      expect(expiresTime).toBeGreaterThanOrEqual(before + 14 * 60 * 1000);
      expect(expiresTime).toBeLessThanOrEqual(after + 16 * 60 * 1000);
      expect(mockUserRepo.save).toHaveBeenCalledWith(user);
    });
  });
});
