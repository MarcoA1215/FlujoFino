import { FeedbackController } from './feedback.controller';
import { UserRole } from '@finowork/shared-types';
import { ROLES_KEY } from '../auth/roles.decorator';

describe('FeedbackController Security', () => {
  it('debe restringir la bandeja global de feedback getPlatformFeedbacks exclusivamente a SUPERADMIN', () => {
    const roles: UserRole[] = Reflect.getMetadata(
      ROLES_KEY,
      FeedbackController.prototype.getPlatformFeedbacks
    );
    expect(roles).toBeDefined();
    expect(roles).toEqual([UserRole.SUPERADMIN]);
    expect(roles).not.toContain(UserRole.ADMIN);
  });
});
