const fs = require('fs');

fs.mkdirSync('apps/backend/src/auth', { recursive: true });
fs.mkdirSync('apps/backend/src/users', { recursive: true });

// 1. User Entity
const userEntity = `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from '@nutrideli/shared-types';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'varchar', default: UserRole.POS })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
`;
fs.writeFileSync('apps/backend/src/entities/user.entity.ts', userEntity);

// 2. Users Module
const usersModule = `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
`;
fs.writeFileSync('apps/backend/src/users/users.module.ts', usersModule);

// 3. Users Service
const usersService = `import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '@nutrideli/shared-types';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    // Create default admin if no users exist
    const count = await this.usersRepo.count();
    if (count === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      const admin = this.usersRepo.create({
        username: 'admin',
        passwordHash: hash,
        role: UserRole.ADMIN,
      });
      await this.usersRepo.save(admin);
      console.log('Default admin user created: admin / admin123');
    }
  }

  async findByUsername(username: string): Promise<User | undefined> {
    const user = await this.usersRepo.findOne({ where: { username } });
    return user || undefined;
  }

  async findAll(): Promise<User[]> {
    return this.usersRepo.find({ order: { createdAt: 'DESC' } });
  }

  async create(data: any): Promise<User> {
    const hash = await bcrypt.hash(data.password, 10);
    const user = this.usersRepo.create({
      username: data.username,
      passwordHash: hash,
      role: data.role || UserRole.POS,
    });
    return this.usersRepo.save(user);
  }

  async delete(id: string): Promise<void> {
    await this.usersRepo.delete(id);
  }
}
`;
fs.writeFileSync('apps/backend/src/users/users.service.ts', usersService);

// 4. Users Controller
const usersCtrl = `import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@nutrideli/shared-types';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() data: any) {
    return this.usersService.create(data);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
`;
fs.writeFileSync('apps/backend/src/users/users.controller.ts', usersCtrl);

// 5. Auth Module
const authModule = `import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { env } from 'process';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: env.JWT_SECRET || 'super-secret-key-nutrideli',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
`;
fs.writeFileSync('apps/backend/src/auth/auth.module.ts', authModule);

// 6. Auth Service
const authService = `import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (user && await bcrypt.compare(pass, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: payload
    };
  }
}
`;
fs.writeFileSync('apps/backend/src/auth/auth.service.ts', authService);

// 7. Auth Controller
const authCtrl = `import { Controller, Post, Body, UnauthorizedException, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(body.username, body.password);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req) {
    return req.user;
  }
}
`;
fs.writeFileSync('apps/backend/src/auth/auth.controller.ts', authCtrl);

// 8. JWT Strategy
const jwtStrategy = `import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { env } from 'process';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_SECRET || 'super-secret-key-nutrideli',
    });
  }

  async validate(payload: any) {
    return { id: payload.sub, username: payload.username, role: payload.role };
  }
}
`;
fs.writeFileSync('apps/backend/src/auth/jwt.strategy.ts', jwtStrategy);

// 9. JwtAuthGuard
const jwtAuthGuard = `import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
`;
fs.writeFileSync('apps/backend/src/auth/jwt-auth.guard.ts', jwtAuthGuard);

// 10. Roles Guard
const rolesGuard = `import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@nutrideli/shared-types';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    // Admin has access to everything
    if (user?.role === UserRole.ADMIN) return true;
    return requiredRoles.includes(user?.role);
  }
}
`;
fs.writeFileSync('apps/backend/src/auth/roles.guard.ts', rolesGuard);

// 11. Roles Decorator
const rolesDecorator = `import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@nutrideli/shared-types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
`;
fs.writeFileSync('apps/backend/src/auth/roles.decorator.ts', rolesDecorator);

console.log("Backend Auth boilerplate written");
