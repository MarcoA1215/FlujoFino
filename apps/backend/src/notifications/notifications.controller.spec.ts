import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let mockNotificationsService: any;
  let mockJwtService: any;

  beforeEach(async () => {
    mockNotificationsService = {
      getPublicKey: jest.fn().mockReturnValue({ publicKey: 'mock-pub-key' }),
      saveSubscription: jest.fn().mockResolvedValue({ id: 'sub-1' }),
      sendTestNotification: jest.fn().mockResolvedValue({ success: true }),
    };

    mockJwtService = {
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  describe('subscribe', () => {
    it('debe rechazar con ForbiddenException si un usuario anónimo intenta suscribirse como ADMIN', async () => {
      const mockReq: any = { headers: {} };
      const dto: any = {
        identifier: 'attacker@evil.com',
        subscription: { endpoint: 'https://push.com/abc' },
        negocioId: 'victim-tenant-id',
        role: 'ADMIN',
      };

      await expect(controller.subscribe(mockReq, dto)).rejects.toThrow(ForbiddenException);
      expect(mockNotificationsService.saveSubscription).not.toHaveBeenCalled();
    });

    it('debe permitir suscripción anónima si role es CUSTOMER o no se especifica', async () => {
      const mockReq: any = { headers: {} };
      const dto: any = {
        identifier: 'cliente@gmail.com',
        subscription: { endpoint: 'https://push.com/abc' },
        negocioId: 'tenant-1',
      };

      const result = await controller.subscribe(mockReq, dto);
      expect(result).toEqual({ success: true, id: 'sub-1' });
      expect(mockNotificationsService.saveSubscription).toHaveBeenCalledWith(
        'cliente@gmail.com',
        dto.subscription,
        'tenant-1',
        'CUSTOMER',
      );
    });

    it('debe adoptar el tenantId y role del usuario autenticado si se provee un Bearer token válido', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-admin-1',
        username: 'gerente',
        email: 'gerente@negocio.com',
        tenantId: 'tenant-real-123',
        role: 'ADMIN',
        roles: ['ADMIN', 'POS'],
      });

      const mockReq: any = {
        headers: { authorization: 'Bearer valid-jwt-token' },
      };
      const dto: any = {
        identifier: 'otro@correo.com',
        subscription: { endpoint: 'https://push.com/abc' },
        negocioId: 'tenant-falsificado-por-el-cliente',
        role: 'ADMIN',
      };

      const result = await controller.subscribe(mockReq, dto);
      expect(result).toEqual({ success: true, id: 'sub-1' });
      expect(mockNotificationsService.saveSubscription).toHaveBeenCalledWith(
        'gerente@negocio.com',
        dto.subscription,
        'tenant-real-123',
        'ADMIN',
      );
    });
  });

  describe('test', () => {
    it('debe enviar la notificación de prueba usando el tenantId del usuario autenticado', async () => {
      const mockReq: any = {
        user: {
          id: 'u-1',
          email: 'admin@negocio.com',
          tenantId: 'tenant-real-123',
          role: 'ADMIN',
        },
      };

      await controller.test(mockReq, {});
      expect(mockNotificationsService.sendTestNotification).toHaveBeenCalledWith(
        'admin@negocio.com',
        'tenant-real-123',
      );
    });
  });
});
