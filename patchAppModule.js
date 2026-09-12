const fs = require('fs');

// Public Decorator
const publicDecorator = `import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
`;
fs.writeFileSync('apps/backend/src/auth/public.decorator.ts', publicDecorator);

// Update JwtAuthGuard to check for @Public
const jwtGuardUpdate = `import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}
`;
fs.writeFileSync('apps/backend/src/auth/jwt-auth.guard.ts', jwtGuardUpdate);

// Update AuthController to have @Public on login
let authCtrl = fs.readFileSync('apps/backend/src/auth/auth.controller.ts', 'utf8');
authCtrl = authCtrl.replace(/import { Controller/, "import { Public } from './public.decorator';\nimport { Controller");
authCtrl = authCtrl.replace(/@Post\('login'\)/, "@Public()\n  @Post('login')");
fs.writeFileSync('apps/backend/src/auth/auth.controller.ts', authCtrl, 'utf8');

// Update AppModule
let appModule = fs.readFileSync('apps/backend/src/app.module.ts', 'utf8');
if (!appModule.includes('AuthModule')) {
  appModule = `import { APP_GUARD } from '@nestjs/core';\nimport { JwtAuthGuard } from './auth/jwt-auth.guard';\nimport { RolesGuard } from './auth/roles.guard';\n` + appModule;
  appModule = appModule.replace(/import { Module } from '@nestjs\/common';/, "import { Module } from '@nestjs/common';\nimport { AuthModule } from './auth/auth.module';\nimport { UsersModule } from './users/users.module';\nimport { User } from './entities/user.entity';");
  
  // Add User to entities
  appModule = appModule.replace(/entities: \[([^\]]+)\]/, "entities: [$1, User]");
  
  // Add Modules to imports
  appModule = appModule.replace(/imports: \[/, "imports: [\n    AuthModule,\n    UsersModule,");

  // Add global guards
  appModule = appModule.replace(/providers: \[AppService\]/, "providers: [AppService, { provide: APP_GUARD, useClass: JwtAuthGuard }, { provide: APP_GUARD, useClass: RolesGuard }]");
  
  fs.writeFileSync('apps/backend/src/app.module.ts', appModule, 'utf8');
}
