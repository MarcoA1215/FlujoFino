import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

describe('RedisService (Fallback & Resiliencia)', () => {
  let service: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined), // Simula entorno sin REDIS_URL
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    service.onModuleInit();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('debe inicializarse en modo fallback cuando no hay REDIS_URL', () => {
    expect(service.isReady()).toBe(false);
  });

  it('debe guardar y recuperar valores usando el fallback en RAM', async () => {
    await service.set('test_key', 'hello_world', 60);
    const value = await service.get('test_key');
    expect(value).toBe('hello_world');
  });

  it('debe guardar y recuperar objetos JSON correctamente en fallback', async () => {
    const payload = { userId: '123', role: 'ADMIN', active: true };
    await service.setJson('user_session_123', payload, 60);

    const result = await service.getJson<typeof payload>('user_session_123');
    expect(result).toEqual(payload);
  });

  it('debe respetar el borrado de claves', async () => {
    await service.set('temp_key', 'temp_value');
    await service.del('temp_key');
    const value = await service.get('temp_key');
    expect(value).toBeNull();
  });

  it('debe implementar bloqueo atómico distribuido (setNx) en fallback', async () => {
    // Primer intento: adquiere el lock
    const lockAcquired1 = await service.setNx('lock:order:100', 'worker-1', 10);
    expect(lockAcquired1).toBe(true);

    // Segundo intento mientras está bloqueado: debe rechazarlo
    const lockAcquired2 = await service.setNx('lock:order:100', 'worker-2', 10);
    expect(lockAcquired2).toBe(false);

    // Tras liberar el lock, otro worker puede adquirirlo
    await service.del('lock:order:100');
    const lockAcquired3 = await service.setNx('lock:order:100', 'worker-3', 10);
    expect(lockAcquired3).toBe(true);
  });
});
