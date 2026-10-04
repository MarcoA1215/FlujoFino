import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController (Unit Tests)', () => {
  let controller: DashboardController;
  let service: DashboardService;

  const mockDashboardService = {
    getSummary: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: mockDashboardService,
        },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
    service = module.get<DashboardService>(DashboardService);
  });

  it('getSummary debe llamar al servicio con el tenantId del usuario autenticado', async () => {
    const mockSummary = {
      historicalRevenue: 1500,
      historicalProfit: 900,
      lowStockMaterials: [],
    };
    mockDashboardService.getSummary.mockResolvedValue(mockSummary);

    const req = { user: { tenantId: 'tenant-barinas-1' } };
    const result = await controller.getSummary(req);

    expect(service.getSummary).toHaveBeenCalledWith('tenant-barinas-1');
    expect(result).toEqual(mockSummary);
  });
});
