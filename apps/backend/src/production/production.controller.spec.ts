import { ProductionController } from './production.controller';
import { UserRole } from '@finowork/shared-types';
import { ROLES_KEY } from '../auth/roles.decorator';

describe('ProductionController Roles Metadata', () => {
  it('debe autorizar al rol INVENTORY junto con ADMIN y KITCHEN', () => {
    const roles: UserRole[] = Reflect.getMetadata(ROLES_KEY, ProductionController);
    expect(roles).toBeDefined();
    expect(roles).toContain(UserRole.INVENTORY);
    expect(roles).toContain(UserRole.ADMIN);
    expect(roles).toContain(UserRole.KITCHEN);
  });
});
