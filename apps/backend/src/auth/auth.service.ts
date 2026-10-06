import { Injectable, UnauthorizedException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { Settings } from '../entities/settings.entity';
import { AccessRequest, AccessRequestStatus } from '../entities/access-request.entity';
import { UserRole, DEFAULT_TENANT_NAME, DEFAULT_SUPERADMIN_EMAIL } from '@finowork/shared-types';
import { MailService } from '../mail/mail.service';
import { User } from '../entities/user.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { PlatformConfig } from '../entities/platform-config.entity';
import { Promoter } from '../entities/promoter.entity';
import { Tenant } from '../entities/tenant.entity';

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
    private dataSource: DataSource,
    private mailService: MailService,
  ) {}

  async validateUser(username: string, pass: string, requestedTenantId?: string): Promise<{ user: any, tenantId: string | null, role: string, roles?: UserRole[], tenantName: string, workspaces: any[] } | null> {
    const user = await this.usersService.findByUsername(username);
    if (!user) return null;

    if (user.role === UserRole.OPERATIVO) {
      throw new UnauthorizedException('Este usuario está registrado como personal operativo sin acceso a la plataforma.');
    }

    if (!(await bcrypt.compare(pass, user.passwordHash))) return null;

    const { passwordHash, ...result } = user;
    
    // Build workspaces list for the frontend
    const workspaces = (user.tenantAccess || []).map(a => ({
      tenantId: a.tenantId,
      name: a.tenant?.name || 'Sucursal',
      role: a.role,
      roles: (a.roles && a.roles.length > 0) ? a.roles : [a.role],
      status: a.status
    }));

    // Check if user is SuperAdmin
    const isSuperAdmin = user.role === UserRole.SUPERADMIN || (user.role as string) === 'SUPERADMIN' || (user.email && user.email.toLowerCase() === (process.env.SUPERADMIN_EMAIL || DEFAULT_SUPERADMIN_EMAIL).toLowerCase());
    if (isSuperAdmin) {
      let activeAccess = requestedTenantId ? user.tenantAccess?.find(a => a.tenantId === requestedTenantId) : user.tenantAccess?.[0];
      return {
        user: result,
        tenantId: requestedTenantId || (activeAccess?.tenantId || 'platform-admin'),
        role: UserRole.SUPERADMIN,
        roles: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.POS, UserRole.INVENTORY, UserRole.DELIVERY, UserRole.KITCHEN],
        tenantName: activeAccess?.tenant?.name || 'Plataforma Global',
        workspaces
      };
    }

    // Find the first accepted active tenant to issue the default token
    let access: any;
    if (requestedTenantId) {
      access = (user.tenantAccess || []).find(a => a.tenantId === requestedTenantId && a.isActive && a.status === 'ACCEPTED');
    } else {
      access = (user.tenantAccess || []).find(a => a.isActive && a.status === 'ACCEPTED');
    }

    const pending = workspaces.filter(w => w.status === 'PENDING');
    if (!requestedTenantId && (workspaces.length > 1 || pending.length > 0)) {
      // Force user to select a workspace
      return { user: result, tenantId: null, role: user.role, roles: [user.role], tenantName: '', workspaces };
    }

    if (!access && workspaces.length > 0) {
      // User has workspaces but none accepted or active.
      return { user: result, tenantId: null, role: user.role, roles: [user.role], tenantName: '', workspaces };
    }

    if (!access) {
      if ((user.role as string) === 'ADMIN' || isSuperAdmin) {
        return { user: result, tenantId: requestedTenantId || 'admin-system', role: user.role, roles: [user.role], tenantName: 'Sistema Central', workspaces };
      }
      if (user.role === UserRole.PROMOTOR || (user.role as string) === 'PROMOTOR') {
        return { user: result, tenantId: requestedTenantId || 'promoter-space', role: UserRole.PROMOTOR, roles: [UserRole.PROMOTOR], tenantName: 'Red de Promotores', workspaces };
      }
      throw new UnauthorizedException('El usuario no tiene acceso a ninguna sucursal');
    }

    const approvalCheck = await this.checkEmployeeAccess(user, access, workspaces);
    if (approvalCheck) {
      return approvalCheck as any;
    }

    const effectiveRole = access.role || user.role;
    const effectiveRoles = (access.roles && access.roles.length > 0) ? access.roles : [effectiveRole];
    const tenantName = access?.tenant?.name || 'Sistema Central';
    return { user: result, tenantId: access?.tenantId || 'admin-system', role: effectiveRole, roles: effectiveRoles, tenantName, workspaces };
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

    const isSuperAdmin = user.role === UserRole.SUPERADMIN || (user.role as string) === 'SUPERADMIN' || (user.email && user.email.toLowerCase() === (process.env.SUPERADMIN_EMAIL || DEFAULT_SUPERADMIN_EMAIL).toLowerCase());
    const { passwordHash, ...result } = user;
    const workspaces = (user.tenantAccess || []).map(a => ({
      tenantId: a.tenantId,
      name: a.tenant?.name || 'Sucursal',
      role: a.role,
      roles: (a.roles && a.roles.length > 0) ? a.roles : [a.role],
      status: a.status
    }));

    if (isSuperAdmin) {
      let tenantName = 'Plataforma Global';
      if (requestedTenantId && requestedTenantId !== 'platform-admin') {
        const tenantRepo = this.dataSource.getRepository(Tenant);
        const t = await tenantRepo.findOne({ where: { id: requestedTenantId } });
        if (t) tenantName = t.name;
      }
      return {
        user: result,
        tenantId: requestedTenantId,
        role: UserRole.SUPERADMIN,
        roles: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.POS, UserRole.INVENTORY, UserRole.DELIVERY, UserRole.KITCHEN],
        tenantName,
        workspaces
      };
    }

    const access = (user.tenantAccess || []).find(a => a.tenantId === requestedTenantId && a.isActive && a.status === 'ACCEPTED');
    if (!access) throw new UnauthorizedException('No tiene acceso a esta sucursal o no ha aceptado la invitación');

    const approvalCheck = await this.checkEmployeeAccess(user, access, workspaces);
    if (approvalCheck) {
      return approvalCheck;
    }

    const authorizedRoles = (access.roles && access.roles.length > 0) ? access.roles : [access.role];

    return { user: result, tenantId: access.tenantId, role: access.role, roles: authorizedRoles, tenantName: access.tenant?.name || 'Sucursal', workspaces };
  }

  async login(user: any, tenantId: string, role: string, tenantName?: string, roles?: UserRole[]) {
    const effectiveRoles = roles || (user.roles && user.roles.length > 0 ? user.roles : (role ? [role as UserRole] : []));
    const payload = {
      id: user.id || user.sub,
      username: user.username,
      name: user.name || user.username,
      email: user.email,
      identification: user.identification,
      phone: user.phone,
      isEmailVerified: !!user.isEmailVerified,
      sub: user.id || user.sub,
      role: role,
      roles: effectiveRoles,
      tenantId: tenantId,
      tenantName: tenantName || DEFAULT_TENANT_NAME,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: payload,
    };
  }

  async switchMode(userId: string, tenantId: string, targetRole: UserRole, currentUser: any) {
    const isSuperAdmin = currentUser?.role === UserRole.SUPERADMIN || (currentUser?.email && currentUser.email.toLowerCase() === (process.env.SUPERADMIN_EMAIL || DEFAULT_SUPERADMIN_EMAIL).toLowerCase());

    const accessRepo = this.dataSource.getRepository(UserTenantAccess);
    const access = await accessRepo.findOne({
      where: { userId, tenantId },
      relations: { tenant: true }
    });

    if (!access && !isSuperAdmin) {
      throw new ForbiddenException('No tienes acceso a esta sucursal');
    }

    let authorizedRoles: UserRole[] = [];
    if (isSuperAdmin) {
      authorizedRoles = [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.POS, UserRole.INVENTORY, UserRole.DELIVERY, UserRole.KITCHEN];
    } else if (access) {
      authorizedRoles = (access.roles && access.roles.length > 0) ? access.roles : [access.role];
      if (access.role === UserRole.ADMIN && !authorizedRoles.includes(UserRole.ADMIN)) {
        authorizedRoles = [UserRole.ADMIN, ...authorizedRoles];
      }
    }

    const isAdmin = isSuperAdmin || access?.role === UserRole.ADMIN || authorizedRoles.includes(UserRole.ADMIN);
    const isAuthorized = isAdmin || authorizedRoles.includes(targetRole);

    if (!isAuthorized) {
      throw new ForbiddenException('Rol no autorizado para este usuario');
    }

    if (isAdmin && !authorizedRoles.includes(targetRole)) {
      authorizedRoles = [...authorizedRoles, targetRole];
    }

    const tenantName = access?.tenant?.name || currentUser?.tenantName || DEFAULT_TENANT_NAME;

    return this.login(
      currentUser,
      tenantId,
      targetRole,
      tenantName,
      authorizedRoles,
    );
  }

  async registerTenant(body: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Consultar PlatformConfig ('default') para sincronizar valores globales
      const platformConfig = await queryRunner.manager.findOne(PlatformConfig, { where: { id: 'default' } });
      const trialDays = platformConfig?.defaultTrialDays ?? 15;
      const basePrice = platformConfig?.defaultMonthlyPrice !== undefined ? Number(platformConfig.defaultMonthlyPrice) : 20.00;

      // 1. Create Tenant with SaaS subscription details
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

      // Generate unique referral code for this new business with 6 random chars and collision check
      const cleanPrefix = (body.tenantName || 'FF')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 4)
        .toUpperCase() || 'FF';

      let myReferralCode = '';
      let codeExists = true;
      let attempts = 0;
      while (codeExists && attempts < 10) {
        attempts++;
        const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
        myReferralCode = `${cleanPrefix}-${randomSuffix}`;
        const existing = await queryRunner.manager.createQueryBuilder(Tenant, 't')
          .where('t.referral_code = :code', { code: myReferralCode })
          .getOne();
        if (!existing) {
          codeExists = false;
        }
      }

      // Resolve referrer or promoter if a referral code or ID was provided
      let referredByTenantId: string | null = null;
      let promoterId: string | null = null;

      if (body.referralCode && typeof body.referralCode === 'string' && body.referralCode.trim()) {
        const inputCode = body.referralCode.trim().toUpperCase();
        if (inputCode.startsWith('PROM-')) {
          const promoter = await queryRunner.manager.findOne(Promoter, {
            where: { code: inputCode },
          });
          if (promoter) {
            promoterId = promoter.id;
          }
        } else {
          const referrerTenant = await queryRunner.manager.createQueryBuilder(Tenant, 't')
            .where('t.referral_code = :code', { code: inputCode })
            .getOne();
          if (referrerTenant) {
            referredByTenantId = referrerTenant.id;
          }
        }
      }

      const tenant = queryRunner.manager.create(Tenant, {
        name: body.tenantName,
        trial_ends_at: trialEndsAt,
        base_price: basePrice,
        referral_code: myReferralCode,
        referred_by_tenant_id: referredByTenantId || undefined,
        promoterId: promoterId || undefined,
      });
      const savedTenant = await queryRunner.manager.save(Tenant, tenant);

      // 2. Create User as ADMIN
      const hashedPassword = await bcrypt.hash(body.password, 10);
      const user = queryRunner.manager.create(User, {
        username: body.username,
        name: (body.fullName || body.name || body.username || '').trim(),
        email: body.email,
        identification: body.identification || null,
        phone: body.phone || null,
        passwordHash: hashedPassword,
        role: UserRole.ADMIN, // Global role
        isEmailVerified: false,
      });
      const savedUser: any = await queryRunner.manager.save(user);

      // 3. Link User to Tenant
      const access = queryRunner.manager.create(UserTenantAccess, {
        user: savedUser,
        tenant: savedTenant,
        role: UserRole.ADMIN, // Local role
        roles: [UserRole.ADMIN],
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
      const loginRes = await this.login(userResult, savedTenant.id, 'ADMIN', savedTenant.name, [UserRole.ADMIN]);
      return {
        ...loginRes,
        workspaces: [
          {
            tenantId: savedTenant.id,
            name: savedTenant.name,
            role: 'ADMIN',
            roles: [UserRole.ADMIN],
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
    if (!user) return [];

    if (!user.tenantAccess) return [];
    return user.tenantAccess.map(a => ({
      tenantId: a.tenantId,
      name: a.tenant?.name || 'Sucursal',
      role: a.role,
      roles: (a.roles && a.roles.length > 0) ? a.roles : [a.role],
      status: a.status
    }));
  }

  async sendVerificationCode(email: string, username?: string) {
    const userRepo = this.dataSource.getRepository(User);
    const trimmedEmail = email ? email.trim().toLowerCase() : '';
    const trimmedUsername = username ? username.trim() : '';

    const conditions: any[] = [];
    if (trimmedEmail) conditions.push({ email: trimmedEmail });
    if (trimmedUsername) conditions.push({ username: trimmedUsername });

    if (conditions.length === 0) {
      throw new BadRequestException('Debes proporcionar el correo o nombre de usuario');
    }

    const user = await userRepo.findOne({ where: conditions });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.isEmailVerified) {
      return { success: true, message: 'El correo electrónico ya se encuentra verificado.', isEmailVerified: true };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    user.emailVerificationCode = code;
    user.emailVerificationExpiresAt = expires;
    await userRepo.save(user);

    const mailSent = await this.mailService.sendVerificationCode(user.email, code);
    if (!mailSent) {
      const errorDetail = (this.mailService as any).getLastError?.();
      if (errorDetail && errorDetail.includes('Render bloquea')) {
        return {
          success: true,
          message: 'Render bloquea SMTP en su plan gratuito. Tu código de verificación de 6 dígitos se imprimió en los Logs de Render.',
          simulated: true,
        };
      }
      const errorMsg = errorDetail
        ? `No se pudo enviar el correo electrónico (${errorDetail}). Revisa las credenciales SMTP en Render/servidor.`
        : 'No se pudo enviar el correo electrónico. Revisa las credenciales SMTP o la consola del servidor.';
      throw new BadRequestException(errorMsg);
    }

    return {
      success: true,
      message: 'Código de verificación enviado al correo',
    };
  }

  async verifyEmail(email: string, code: string) {
    if (!email || !code) {
      throw new BadRequestException('Correo y código son requeridos');
    }

    const userRepo = this.dataSource.getRepository(User);
    const trimmedEmail = email.trim().toLowerCase();
    const user = await userRepo.findOne({
      where: [
        { email: trimmedEmail },
        { username: email.trim() }
      ]
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!user.emailVerificationCode || !user.emailVerificationExpiresAt) {
      throw new BadRequestException('No hay un código de verificación pendiente para esta cuenta');
    }

    if (new Date() > new Date(user.emailVerificationExpiresAt)) {
      throw new BadRequestException('El código es inválido o ha expirado');
    }

    if (user.emailVerificationCode.trim() !== code.trim()) {
      throw new BadRequestException('El código es inválido o ha expirado');
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpiresAt = null;
    await userRepo.save(user);

    return {
      success: true,
      message: 'Correo verificado con éxito',
    };
  }

  async forgotPassword(email: string) {
    if (!email) {
      throw new BadRequestException('El correo es requerido');
    }

    const userRepo = this.dataSource.getRepository(User);
    const trimmedEmail = email.trim();
    const user = await userRepo.findOne({
      where: [
        { email: trimmedEmail.toLowerCase() },
        { username: trimmedEmail }
      ]
    });

    if (!user) {
      throw new NotFoundException('No existe una cuenta registrada con este correo electrónico');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    user.resetPasswordCode = code;
    user.resetPasswordExpires = expires;
    await userRepo.save(user);

    const mailSent = await this.mailService.sendPasswordResetCode(user.email, code);
    if (!mailSent) {
      const errorDetail = (this.mailService as any).getLastError?.();
      const errorMsg = errorDetail
        ? `No se pudo enviar el correo electrónico (${errorDetail}). Revisa las credenciales SMTP en Render/servidor.`
        : 'No se pudo enviar el correo electrónico. Revisa las credenciales SMTP o la consola del servidor.';
      throw new BadRequestException(errorMsg);
    }

    return {
      success: true,
      message: `Código de recuperación enviado a ${user.email}`,
      email: user.email,
    };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    if (!email || !code || !newPassword) {
      throw new BadRequestException('Correo, código y nueva contraseña son requeridos');
    }

    if (newPassword.trim().length < 6) {
      throw new BadRequestException('La nueva contraseña debe tener al menos 6 caracteres');
    }

    const userRepo = this.dataSource.getRepository(User);
    const trimmedEmail = email.trim();
    const user = await userRepo.findOne({
      where: [
        { email: trimmedEmail.toLowerCase() },
        { username: trimmedEmail }
      ]
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!user.resetPasswordCode || !user.resetPasswordExpires) {
      throw new BadRequestException('No hay una solicitud de recuperación activa para esta cuenta');
    }

    if (new Date() > new Date(user.resetPasswordExpires)) {
      throw new BadRequestException('El código de recuperación ha expirado. Solicita uno nuevo.');
    }

    if (user.resetPasswordCode.trim() !== code.trim()) {
      throw new BadRequestException('El código de recuperación es incorrecto');
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.resetPasswordCode = null as any;
    user.resetPasswordExpires = null as any;
    await userRepo.save(user);

    return {
      success: true,
      message: 'Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión.',
    };
  }
}
