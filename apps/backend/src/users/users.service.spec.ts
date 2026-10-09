import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockUsersRepo: any;
  let mockJwtService: any;

  beforeEach(() => {
    mockUsersRepo = {
      count: jest.fn().mockResolvedValue(1),
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };
    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };
    service = new UsersService(mockUsersRepo, mockJwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('onModuleInit should not create default admin if users already exist', async () => {
    mockUsersRepo.count.mockResolvedValue(2);
    await service.onModuleInit();
    expect(mockUsersRepo.save).not.toHaveBeenCalled();
  });

  it('al crear un usuario OPERATIVO, debe asignar username generatedUsername y name cleanName para evitar colisión UNIQUE', async () => {
    const mockEntityManager = {
      create: jest.fn((entityClass, data) => ({ ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    mockUsersRepo.manager = {
      transaction: jest.fn(async (cb) => cb(mockEntityManager)),
    };

    const result = await service.create('tenant-1', {
      name: 'Carlos Mendoza',
      role: 'OPERATIVO',
    });

    expect(result).toBeDefined();
    expect(result.name).toBe('Carlos Mendoza');
    expect(result.username).toMatch(/^operativo_\d+/);
    expect(result.username).not.toBe('Carlos Mendoza');
  });
});
