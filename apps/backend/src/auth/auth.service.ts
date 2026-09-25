import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { Settings } from '../entities/settings.entity';
import { AccessRequest, AccessRequestStatus } from '../entities/access-request.entity';

function toMinutes(hhmm: string): number {
  const parts = hhmm.split(':');
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}

function isWithinShiftWithTolerance(currentTimeStr: string, entryTimeStr: string, exitTimeStr: string, toleranceMinutes = 30): boolean {
  const current = toMinutes(currentTimeStr);
  const entry = toMinutes(entryTimeStr);
  const exit = toMinutes(exitTimeStr);

  if (entry <= exit) {
    const allowedStart = entry - toleranceMinutes;
    const allowedEnd = exit + toleranceMinutes;

    if (allowedStart < 0) {
      return current >= (allowedStart + 1440) || current <= allowedEnd;
    }
    if (allowedEnd >= 1440) {
      return current >= allowedStart || current <= (allowedEnd - 1440);
    }
    return current >= allowedStart && current <= allowedEnd;
  } else {
    let allowedStart = entry - toleranceMinutes;
    let allowedEnd = exit + toleranceMinutes;
    if (allowedStart < 0) allowedStart += 1440;
    if (allowedEnd >= 1440) allowedEnd -= 1440;
    return current >= allowedStart || current <= allowedEnd;
  }
}

function getVenezuelaTime(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Caracas',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}


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

    const approvalCheck = await this.checkEmployeeAccess(user, access, workspaces);
    if (approvalCheck) {
      return approvalCheck as any;
    }

    const effectiveRole = access.role || user.role;
    const tenantName = access?.tenant?.name || 'Sistema Central';
    return { user: result, tenantId: access?.tenantId || 'admin-system', role: effectiveRole, tenantName, workspaces };
  }

  async checkEmployeeAccess(
    user: any,
    access: any,
    workspaces: any[],
  ): Promise<{ requiresApproval: boolean; [key: string]: any } | null> {
    const effectiveRole = access.role || user.role;
    const isAdmin = user.role === 'ADMIN' || effectiveRole === 'ADMIN';

    if (isAdmin) {
      return null;
    }

    const nowInVenezuela = getVenezuelaTime();
    const settingsRepo = this.dataSource.getRepository(Settings);
    const tenantSettings = await settingsRepo.findOne({ where: { tenantId: access.tenantId } });
    const requireApprovalAlways = tenantSettings?.requireApprovalAlways || false;

    let requiresApproval = false;
    let reason: 'OUT_OF_SCHEDULE' | 'POLICY_ALWAYS_REQUIRE' = 'OUT_OF_SCHEDULE';

    if (requireApprovalAlways) {
      requiresApproval = true;
      reason = 'POLICY_ALWAYS_REQUIRE';
    } else if (access.entryTime && access.exitTime) {
      const inside = isWithinShiftWithTolerance(nowInVenezuela, access.entryTime, access.exitTime, 30);
      if (!inside) {
        requiresApproval = true;
        reason = 'OUT_OF_SCHEDULE';
      }
    }

    if (!requiresApproval) {
      return null;
    }

    const accessReqRepo = this.dataSource.getRepository(AccessRequest);
    let pendingReq = await accessReqRepo.findOne({
      where: {
        tenantId: access.tenantId,
        userId: user.id,
        status: AccessRequestStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    if (!pendingReq) {
      pendingReq = accessReqRepo.create({
        tenantId: access.tenantId,
        userId: user.id,
        userName: user.username,
        userEmail: user.email,
        jobTitle: access.jobTitle || undefined,
        role: effectiveRole,
        status: AccessRequestStatus.PENDING,
        reason,
        entryTime: access.entryTime || undefined,
        exitTime: access.exitTime || undefined,
        attemptTime: nowInVenezuela,
      });
      await accessReqRepo.save(pendingReq);
    } else {
      pendingReq.attemptTime = nowInVenezuela;
      pendingReq.reason = reason;
      await accessReqRepo.save(pendingReq);
    }

    return {
      requiresApproval: true,
      requestId: pendingReq.id,
      status: AccessRequestStatus.PENDING,
      tenantId: access.tenantId,
      tenantName: access.tenant?.name || 'Sucursal',
      message: reason === 'POLICY_ALWAYS_REQUIRE'
        ? 'Se requiere autorización de un administrador para ingresar (política activa).'
        : `Intento de acceso fuera de horario (${access.entryTime} - ${access.exitTime}). Esperando aprobación de un administrador.`,
      user: { id: user.id, username: user.username, jobTitle: access.jobTitle, role: effectiveRole },
      attemptTime: nowInVenezuela,
      workspaces,
    };
  }

  async getAccessRequestStatus(requestId: string) {
    const accessReqRepo = this.dataSource.getRepository(AccessRequest);
    const req = await accessReqRepo.findOne({ where: { id: requestId } });
    if (!req) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (req.status === AccessRequestStatus.APPROVED) {
      const payload = req.approvedPayload ? JSON.parse(req.approvedPayload) : null;
      return {
        status: AccessRequestStatus.APPROVED,
        access_token: req.approvedToken,
        user: payload?.user,
        workspaces: payload?.workspaces || [],
        message: 'Acceso aprobado por el administrador',
      };
    }

    if (req.status === AccessRequestStatus.REJECTED) {
      return {
        status: AccessRequestStatus.REJECTED,
        message: 'Tu solicitud de acceso ha sido rechazada por el administrador.',
      };
    }

    // PENDING (strictly never expose approvedToken here)
    return {
      status: AccessRequestStatus.PENDING,
      message: 'Esperando que un administrador apruebe la solicitud...',
      attemptTime: req.attemptTime,
      userName: req.userName,
    };
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

    const approvalCheck = await this.checkEmployeeAccess(user, access, workspaces);
    if (approvalCheck) {
      return approvalCheck;
    }

    return { user: result, tenantId: access.tenantId, role: access.role, tenantName: access.tenant?.name || 'Sucursal', workspaces };
  }

  async login(user: any, tenantId: string, role: string, tenantName?: string) {
    const payload = { username: user.username, email: user.email, sub: user.id, role: role, tenantId: tenantId, tenantName: tenantName || 'Flujo Fino' };
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
      // 1. Create Tenant with SaaS subscription details (15-day trial)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 15);

      // Generate unique referral code for this new business (e.g., BURG-9X2A)
      const cleanPrefix = (body.tenantName || 'FF')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 4)
        .toUpperCase() || 'FF';
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const myReferralCode = `${cleanPrefix}-${randomSuffix}`;

      // Resolve referrer if a referral code or ID was provided
      let referredByTenantId: string | null = null;
      if (body.referralCode && typeof body.referralCode === 'string' && body.referralCode.trim()) {
        const inputCode = body.referralCode.trim().toUpperCase();
        const referrerTenant: any = await queryRunner.manager.createQueryBuilder('Tenant', 't')
          .where('UPPER(t.referral_code) = :code', { code: inputCode })
          .orWhere('CAST(t.id AS VARCHAR) = :codeId', { codeId: body.referralCode.trim() })
          .getOne();
        if (referrerTenant) {
          referredByTenantId = referrerTenant.id;
        }
      }

      const tenant = queryRunner.manager.create('Tenant', {
        name: body.tenantName,
        isActive: true,
        status: 'TRIAL',
        plan_type: 'REGULAR',
        trial_ends_at: trialEndsAt,
        referred_by_tenant_id: referredByTenantId || body.referredByTenantId || null,
        referral_code: myReferralCode,
        base_price: 20.00,
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
