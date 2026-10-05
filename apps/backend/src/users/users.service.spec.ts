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
});
