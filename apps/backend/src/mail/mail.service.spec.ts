import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('MailService', () => {
  let mockConfigService: any;
  let mockTransporter: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransporter = {
      verify: jest.fn((cb) => cb(null)),
      sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-123' }),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
  });

  it('debe seleccionar service: "gmail" cuando MAIL_USER contenga @gmail.com o MAIL_HOST contenga gmail', async () => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'MAIL_USER') return 'micuenta@gmail.com';
        if (key === 'MAIL_PASS') return 'app-password-secret';
        if (key === 'MAIL_HOST') return 'smtp.gmail.com';
        if (key === 'MAIL_PORT') return 587;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    const service = module.get<MailService>(MailService);
    expect(service).toBeDefined();
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'gmail',
        auth: { user: 'micuenta@gmail.com', pass: 'app-password-secret' },
      }),
    );
  });

  it('en modo simulación (sin credenciales), sendMail debe registrar el código en consola y retornar true', async () => {
    mockConfigService = {
      get: jest.fn(() => null), // sin credenciales
    };

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    const service = module.get<MailService>(MailService);
    const result = await service.sendVerificationCode('test@test.com', '654321');

    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[MODO SIMULACIÓN] CÓDIGO DE VERIFICACIÓN:'),
      '654321',
    );
    consoleSpy.mockRestore();
  });

  it('si transporter.sendMail arroja un error en el transporte real, debe capturarlo en el catch y retornar false', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'MAIL_USER') return 'user@domain.com';
        if (key === 'MAIL_PASS') return 'secret';
        if (key === 'MAIL_HOST') return 'smtp.otherdomain.com';
        return null;
      }),
    };

    mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Connection timeout'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    const service = module.get<MailService>(MailService);
    const result = await service.sendVerificationCode('user@domain.com', '123456');

    expect(result).toBe(false);

    errorSpy.mockRestore();
    logSpy.mockRestore();
  });
});
