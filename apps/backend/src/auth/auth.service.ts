import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private dataSource: DataSource
  ) {}

  async validateUser(username: string, pass: string, requestedTenantId?: string): Promise<{ user: any, tenantId: string | null, role: string, tenantName: string, workspaces: any[] } | null> {
    const user = await this.usersService.findByUsername(username);
    if (!user) return null;

    if (!(await bcrypt.compare(pass, user.passwordHash))) return null;

    const { passwordHash, ...result } = user;
    
    // Build workspaces list for the frontend
    const workspaces = user.tenantAccess.map(a => ({
      tenantId: a.tenantId,
      name: a.tenant?.name || 'Sucursal',
      role: a.role,
      status: a.status
    }));

    // Find the first accepted active tenant to issue the default token
    let access: any;
    if (requestedTenantId) {
      access = user.tenantAccess.find(a => a.tenantId === requestedTenantId && a.isActive && a.status === 'ACCEPTED');
    } else {
      access = user.tenantAccess.find(a => a.isActive && a.status === 'ACCEPTED');
    }

    const pending = workspaces.filter(w => w.status === 'PENDING');
    if (!requestedTenantId && (workspaces.length > 1 || pending.length > 0)) {
      // Force user to select a workspace
      return { user: result, tenantId: null, role: user.role, tenantName: '', workspaces };
    }

    if (!access && workspaces.length > 0) {
      // User has workspaces but none accepted or active.
      return { user: result, tenantId: null, role: user.role, tenantName: '', workspaces };
    }

    if (!access) {
      if (user.role === 'ADMIN') {
        return { user: result, tenantId: requestedTenantId || 'admin-system', role: user.role, tenantName: 'Sistema Central', workspaces };
      }
      throw new UnauthorizedException('El usuario no tiene acceso a ninguna sucursal');
    }

    if (access.workSchedules && access.workSchedules.length > 0) {
      const now = new Date();
      const currentDay = now.getDay();
      const currentHour = now.getHours().toString().padStart(2, '0');
      const currentMinute = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${currentHour}:${currentMinute}:00`;

      const inSchedule = access.workSchedules.some(ws => {
        if (ws.dayOfWeek !== currentDay) return false;
        return currentTime >= ws.startTime && currentTime <= ws.endTime;
      });

      if (!inSchedule) {
        throw new UnauthorizedException('Acceso denegado: Fuera del horario de trabajo permitido');
      }
    }

    const tenantName = access?.tenant?.name || 'Sistema Central';
    return { user: result, tenantId: access?.tenantId || 'admin-system', role: access?.role || user.role, tenantName, workspaces };
  }

  async validateUserToken(username: string, requestedTenantId: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const access = user.tenantAccess.find(a => a.tenantId === requestedTenantId && a.isActive && a.status === 'ACCEPTED');
    if (!access) throw new UnauthorizedException('No tiene acceso a esta sucursal o no ha aceptado la invitación');

    const { passwordHash, ...result } = user;
    const workspaces = user.tenantAccess.map(a => ({
      tenantId: a.tenantId,
      name: a.tenant?.name || 'Sucursal',
      role: a.role,
      status: a.status
    }));
    return { user: result, tenantId: access.tenantId, role: access.role, tenantName: access.tenant.name, workspaces };
  }

  async login(user: any, tenantId: string, role: string, tenantName?: string) {
    const payload = { username: user.username, sub: user.id, role: role, tenantId: tenantId, tenantName: tenantName || 'Flujo Fino' };
    return {
      access_token: this.jwtService.sign(payload),
      user: payload
    };
  }

  async registerTenant(body: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create Tenant
      const tenant = queryRunner.manager.create('Tenant', {
        name: body.tenantName,
        isActive: true,
      });
      const savedTenant: any = await queryRunner.manager.save(tenant);

      // 2. Create User
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(body.password, salt);
      const user = queryRunner.manager.create('User', {
        username: body.username,
        email: body.email,
        passwordHash: hashedPassword,
        role: 'ADMIN', // Global role
        isActive: true,
      });
      const savedUser: any = await queryRunner.manager.save(user);

      // 3. Link User to Tenant
      const access = queryRunner.manager.create('UserTenantAccess', {
        user: savedUser,
        tenant: savedTenant,
        role: 'ADMIN', // Local role
        isActive: true,
      });
      await queryRunner.manager.save(access);

      // 4. Create Settings with Onboarding Flags
      const { randomUUID } = require('crypto');
      const settings = queryRunner.manager.create('Settings', {
        id: randomUUID(),
        tenant: savedTenant,
        featureCustomerSchedules: body.featureCustomerSchedules || false,
        featureRecipes: body.featureRecipes || false,
        featureBuySell: body.featureBuySell || false,
      });
      await queryRunner.manager.save(settings);

      await queryRunner.commitTransaction();

      // Return auto-login
      const { passwordHash, ...userResult } = savedUser;
      const loginRes = await this.login(userResult, savedTenant.id, 'ADMIN', savedTenant.name);
      return {
        ...loginRes,
        workspaces: [
          {
            tenantId: savedTenant.id,
            name: savedTenant.name,
            role: 'ADMIN',
            status: 'ACCEPTED'
          }
        ]
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getWorkspaces(username: string): Promise<any[]> {
    const user = await this.usersService.findByUsername(username);
    if (!user || !user.tenantAccess) return [];
    return user.tenantAccess.map(a => ({
      tenantId: a.tenantId,
      name: a.tenant?.name || 'Sucursal',
      role: a.role,
      status: a.status
    }));
  }
}
