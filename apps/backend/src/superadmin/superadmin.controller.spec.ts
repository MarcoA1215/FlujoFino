import { SuperAdminController } from './superadmin.controller';

describe('SuperAdminController', () => {
  let controller: SuperAdminController;
  let mockSuperAdminService: any;

  beforeEach(() => {
    mockSuperAdminService = {
      getMySubscription: jest.fn().mockResolvedValue({ status: 'ACTIVE' }),
      reportPayment: jest.fn().mockResolvedValue({ success: true }),
    };
    controller = new SuperAdminController(mockSuperAdminService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getMySubscription should call superadminService.getMySubscription', async () => {
    const req = { user: { tenantId: '11111111-1111-1111-1111-111111111111' } };
    const res = await controller.getMySubscription(req);
    expect(mockSuperAdminService.getMySubscription).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
    expect(res).toEqual({ status: 'ACTIVE' });
  });
});
