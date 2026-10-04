import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { Tenant } from '../entities/tenant.entity';
import { AccessRequest, AccessRequestStatus } from '../entities/access-request.entity';
import { UserRole } from '@finowork/shared-types';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    // Create default admin if no users exist
    const count = await this.usersRepo.count();
    if (count === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      const admin = this.usersRepo.create({
        username: 'admin',
        email: 'admin@finowork.com',
        passwordHash: hash,
        role: UserRole.ADMIN,
      });
      await this.usersRepo.save(admin);
      console.log('Default admin user created: admin / admin123');
    }
  }

  async findByUsername(identifier: string): Promise<User | undefined> {
    const user = await this.usersRepo.findOne({
      where: [
        { username: identifier },
        { email: identifier }
      ],
      relations: {
        tenantAccess: {
          tenant: true,
          workSchedules: true,
        },
      },
    });
    return user || undefined;
  }

  async findAll(tenantId?: string): Promise<User[]> {
    if (!tenantId) return [];
    
    // Find users that have a UserTenantAccess record for this tenantId
    const users = await this.usersRepo.createQueryBuilder('user')
      .innerJoinAndSelect('user.tenantAccess', 'access')
      .where('access.tenantId = :tenantId', { tenantId })
      .orderBy('user.createdAt', 'DESC')
      .getMany();
      
    // Because a user can have different roles in different tenants, map the tenant's specific role to the user object
    return users.map(user => {
      const access = user.tenantAccess?.find(a => a.tenantId === tenantId);
      if (access) {
        user.role = access.role as UserRole;
        (user as any).roles = (access.roles && access.roles.length > 0) ? access.roles : [access.role as UserRole];
        (user as any).status = access.status;
        (user as any).jobTitle = access.jobTitle;
        (user as any).entryTime = access.entryTime;
        (user as any).exitTime = access.exitTime;
        (user as any).lunchStart = access.lunchStart;
        (user as any).lunchEnd = access.lunchEnd;
        (user as any).salaryAmount = access.salaryAmount;
        (user as any).salaryPeriod = access.salaryPeriod;
      }
      delete (user as any).passwordHash;
      return user;
    });
  }

  async findActiveEmployees(tenantId?: string): Promise<{ id: string; username: string; name: string; role: UserRole; roles?: UserRole[]; jobTitle?: string; entryTime?: string; exitTime?: string; lunchStart?: string; lunchEnd?: string }[]> {
    if (!tenantId) return [];

    const accesses = await this.usersRepo.manager.find(UserTenantAccess, {
      where: {
        tenantId,
        isActive: true,
        status: 'ACCEPTED',
      },
      relations: {
        user: true,
      },
      order: {
        user: {
          username: 'ASC',
        },
      },
    });

    return accesses
      .filter(a => !!a.user)
      .map(a => ({
        id: a.user.id,
        username: a.user.username,
        name: a.user.username,
        role: a.role,
        roles: (a.roles && a.roles.length > 0) ? a.roles : [a.role],
        jobTitle: a.jobTitle || undefined,
        entryTime: a.entryTime || undefined,
        exitTime: a.exitTime || undefined,
        lunchStart: a.lunchStart || undefined,
        lunchEnd: a.lunchEnd || undefined,
      }));
  }

  async create(tenantId: string, data: any): Promise<User> {
    if (!tenantId) throw new Error('Se requiere tenantId para crear un usuario');
    
    return await this.usersRepo.manager.transaction(async transactionalEntityManager => {
      if (data.role === UserRole.OPERATIVO) {
        const cleanName = data.name || data.username || 'Personal Operativo';
        const generatedUsername = (data.username || `operativo_${Date.now()}`).trim();
        const generatedEmail = (data.email && data.email.trim())
          ? data.email.trim().toLowerCase()
          : `${generatedUsername.toLowerCase()}@no-access.local`;

        const randomHash = await bcrypt.hash(`no_login_${Date.now()}_${Math.random()}`, 10);

        const user = transactionalEntityManager.create(User, {
          username: cleanName,
          email: generatedEmail,
          identification: data.identification || null,
          phone: data.phone || null,
          passwordHash: randomHash,
          role: UserRole.OPERATIVO,
          isEmailVerified: false,
        });
        const savedUser = await transactionalEntityManager.save(user);

        const access = transactionalEntityManager.create(UserTenantAccess, {
          user: savedUser,
          tenantId,
          role: UserRole.OPERATIVO,
          roles: [UserRole.OPERATIVO],
          isActive: true,
          status: 'ACCEPTED',
          salaryAmount: data.salaryAmount ? Number(data.salaryAmount) : null,
          salaryPeriod: data.salaryPeriod || 'SEMANAL',
          jobTitle: data.jobTitle || 'Personal Operativo (Limpieza / Mantenimiento)',
          entryTime: data.entryTime || null,
          exitTime: data.exitTime || null,
          lunchStart: data.lunchStart || data.lunch_start || null,
          lunchEnd: data.lunchEnd || data.lunch_end || null,
        });
        await transactionalEntityManager.save(access);
        return savedUser;
      }

      // Resolve roles list & primary role
      let assignedRoles: UserRole[];
      if (data.roles && Array.isArray(data.roles) && data.roles.length > 0) {
        assignedRoles = data.roles;
      } else if (data.role) {
        assignedRoles = [data.role];
      } else {
        assignedRoles = [UserRole.POS];
      }
      const primaryRole = (data.role && assignedRoles.includes(data.role)) ? data.role : assignedRoles[0];

      // 1. Check if user already exists
      let existingUser = await transactionalEntityManager.findOne(User, {
        where: [
          { username: data.username },
          { email: data.email }
        ],
        relations: { tenantAccess: true }
      });

      let savedUser;
      let status = 'ACCEPTED';

      if (existingUser) {
        // User exists, send an invitation instead of creating a new user
        savedUser = existingUser;
        status = 'PENDING';
        
        // Check if they already have access to this tenant
        const alreadyHasAccess = savedUser.tenantAccess?.some(a => a.tenantId === tenantId);
        if (alreadyHasAccess) {
          throw new Error('El usuario ya pertenece a esta sucursal o tiene una invitación pendiente');
        }
      } else {
        // Create new user
        const hash = await bcrypt.hash(data.password, 10);
        const user = transactionalEntityManager.create(User, {
          username: data.username,
          email: data.email,
          identification: data.identification || null,
          phone: data.phone || null,
          passwordHash: hash,
          role: primaryRole,
          isEmailVerified: false,
        });
        savedUser = await transactionalEntityManager.save(user);
        status = 'ACCEPTED';
      }

      // Create access link
      const access = transactionalEntityManager.create('UserTenantAccess', {
        user: savedUser,
        tenant: { id: tenantId },
        role: primaryRole,
        roles: assignedRoles,
        isActive: true,
        status: status,
        salaryAmount: data.salaryAmount ? Number(data.salaryAmount) : null,
        salaryPeriod: data.salaryPeriod || null,
        jobTitle: data.jobTitle || data.job_title || null,
        entryTime: data.entryTime || data.entry_time || null,
        exitTime: data.exitTime || data.exit_time || null,
        lunchStart: data.lunchStart || data.lunch_start || null,
        lunchEnd: data.lunchEnd || data.lunch_end || null,
      });
      await transactionalEntityManager.save(access);

      return savedUser;
    });
  }

  async update(tenantId: string, userId: string, data: any): Promise<any> {
    if (!tenantId) throw new Error('Tenant ID required');

    let access = await this.usersRepo.manager.findOne(UserTenantAccess, {
      where: { userId, tenantId }
    });

    if (!access) {
      const user = await this.usersRepo.findOne({ where: { id: userId } });
      if (!user) throw new Error('Usuario no encontrado');
      const fallbackRoles = (data.roles && Array.isArray(data.roles) && data.roles.length > 0)
        ? data.roles
        : (data.role ? [data.role] : [user.role || UserRole.POS]);

      access = this.usersRepo.manager.create(UserTenantAccess, {
        userId,
        tenantId,
        isActive: true,
        status: 'ACCEPTED',
        role: data.role || fallbackRoles[0] || UserRole.POS,
        roles: fallbackRoles,
      });
    }

    if (data.roles !== undefined) {
      if (Array.isArray(data.roles) && data.roles.length > 0) {
        access.roles = data.roles;
        if (data.role && data.roles.includes(data.role)) {
          access.role = data.role;
        } else if (!data.roles.includes(access.role)) {
          access.role = data.roles[0];
        }
      } else {
        access.roles = data.role ? [data.role] : [access.role || UserRole.POS];
      }
    } else if (data.role !== undefined) {
      access.role = data.role;
      if (!access.roles || access.roles.length === 0) {
        access.roles = [data.role];
      } else if (!access.roles.includes(data.role)) {
        access.roles = [data.role, ...access.roles];
      }
    }

    if (data.jobTitle !== undefined || data.job_title !== undefined) {
      access.jobTitle = (data.jobTitle !== undefined ? data.jobTitle : data.job_title) || null;
    }
    if (data.entryTime !== undefined || data.entry_time !== undefined) {
      access.entryTime = (data.entryTime !== undefined ? data.entryTime : data.entry_time) || null;
    }
    if (data.exitTime !== undefined || data.exit_time !== undefined) {
      access.exitTime = (data.exitTime !== undefined ? data.exitTime : data.exit_time) || null;
    }
    if (data.lunchStart !== undefined || data.lunch_start !== undefined) {
      access.lunchStart = (data.lunchStart !== undefined ? data.lunchStart : data.lunch_start) || null;
    }
    if (data.lunchEnd !== undefined || data.lunch_end !== undefined) {
      access.lunchEnd = (data.lunchEnd !== undefined ? data.lunchEnd : data.lunch_end) || null;
    }
    if (data.salaryAmount !== undefined) {
      access.salaryAmount = data.salaryAmount ? Number(data.salaryAmount) : null;
    }
    if (data.salaryPeriod !== undefined) {
      access.salaryPeriod = data.salaryPeriod || null;
    }

    if (data.identification !== undefined || data.phone !== undefined) {
      await this.usersRepo.update(userId, {
        ...(data.identification !== undefined ? { identification: data.identification } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
      });
    }

    await this.usersRepo.manager.save(access);
    return { success: true, access };
  }

  async delete(tenantId: string, id: string): Promise<void> {
    if (!tenantId) return;
    
    await this.usersRepo.manager.query(
      `DELETE FROM "user_tenant_access" WHERE "userId" = $1 AND "tenantId" = $2`,
      [id, tenantId]
    );
  }

  async paySalary(tenantId: string, userId: string, data: any): Promise<void> {
    if (!tenantId) throw new Error('Tenant ID required');
    
    await this.usersRepo.manager.transaction(async manager => {
      // Create expense
      const expense = manager.create('OperatingExpense', {
        tenantId,
        description: `Pago de Nómina - Empleado ${data.username || userId}`,
        amount: Number(data.amount),
        paymentMethod: data.method || 'CASH',
        category: 'PAYROLL',
        createdAt: data.date ? new Date(data.date) : new Date()
      });
      await manager.save(expense);
    });
  }

  async acceptInvite(userId: string, tenantId: string): Promise<void> {
    const access = await this.usersRepo.manager.findOne(UserTenantAccess, {
      where: { userId, tenantId, status: 'PENDING' }
    });
    if (!access) throw new Error('Invitación no encontrada o ya procesada');
    access.status = 'ACCEPTED';
    await this.usersRepo.manager.save(access);
  }

  async rejectInvite(userId: string, tenantId: string): Promise<void> {
    const access = await this.usersRepo.manager.findOne(UserTenantAccess, {
      where: { userId, tenantId, status: 'PENDING' }
    });
    if (!access) throw new Error('Invitación no encontrada o ya procesada');
    access.status = 'REJECTED';
    await this.usersRepo.manager.save(access);
  }

  async getAccessRequests(tenantId: string): Promise<AccessRequest[]> {
    if (!tenantId) return [];
    const accessReqRepo = this.usersRepo.manager.getRepository(AccessRequest);
    return accessReqRepo.find({
      where: { tenantId, status: AccessRequestStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  async approveAccessRequest(tenantId: string, requestId: string): Promise<AccessRequest> {
    const accessReqRepo = this.usersRepo.manager.getRepository(AccessRequest);
    const req = await accessReqRepo.findOne({ where: { id: requestId, tenantId } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');

    const user = await this.usersRepo.findOne({
      where: { id: req.userId },
      relations: { tenantAccess: { tenant: true } },
    });

    const tenant = await this.usersRepo.manager.findOne(Tenant, { where: { id: tenantId } });
    const tenantName = tenant ? tenant.name : 'FinoWork';

    const access = user?.tenantAccess?.find(a => a.tenantId === req.tenantId);
    const authorizedRoles = (access?.roles && access.roles.length > 0) ? access.roles : [req.role];

    const payload = {
      id: user?.id || req.userId,
      username: req.userName,
      email: user?.email,
      identification: user?.identification,
      phone: user?.phone,
      isEmailVerified: !!user?.isEmailVerified,
      sub: req.userId,
      role: req.role,
      roles: authorizedRoles,
      tenantId: req.tenantId,
      tenantName: tenantName,
    };

    const allWorkspaces = user?.tenantAccess?.map(a => ({
      tenantId: a.tenantId,
      name: a.tenant?.name || 'Sucursal',
      role: a.role,
      roles: (a.roles && a.roles.length > 0) ? a.roles : [a.role],
      status: a.status,
    })) || [{
      tenantId: req.tenantId,
      name: payload.tenantName,
      role: req.role,
      roles: authorizedRoles,
      status: 'ACCEPTED',
    }];

    const token = this.jwtService.sign(payload);
    req.status = AccessRequestStatus.APPROVED;
    req.approvedToken = token;
    req.approvedPayload = JSON.stringify({
      user: payload,
      workspaces: allWorkspaces,
    });

    return accessReqRepo.save(req);
  }

  async rejectAccessRequest(tenantId: string, requestId: string): Promise<AccessRequest> {
    const accessReqRepo = this.usersRepo.manager.getRepository(AccessRequest);
    const req = await accessReqRepo.findOne({ where: { id: requestId, tenantId } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');

    req.status = AccessRequestStatus.REJECTED;
    return accessReqRepo.save(req);
  }
}
