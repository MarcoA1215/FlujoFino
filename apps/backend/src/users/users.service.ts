import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { Tenant } from '../entities/tenant.entity';
import { AccessRequest, AccessRequestStatus } from '../entities/access-request.entity';
import { UserRole } from '@nutrideli/shared-types';
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
        email: 'admin@flujofino.com',
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
        (user as any).status = access.status;
        (user as any).jobTitle = access.jobTitle;
        (user as any).entryTime = access.entryTime;
        (user as any).exitTime = access.exitTime;
        (user as any).salaryAmount = access.salaryAmount;
        (user as any).salaryPeriod = access.salaryPeriod;
      }
      delete (user as any).passwordHash;
      return user;
    });
  }

  async findActiveEmployees(tenantId?: string): Promise<{ id: string; username: string; name: string; role: UserRole; jobTitle?: string; entryTime?: string; exitTime?: string }[]> {
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
        jobTitle: a.jobTitle || undefined,
        entryTime: a.entryTime || undefined,
        exitTime: a.exitTime || undefined,
      }));
  }

  async create(tenantId: string, data: any): Promise<User> {
    if (!tenantId) throw new Error('Se requiere tenantId para crear un usuario');
    
    return await this.usersRepo.manager.transaction(async transactionalEntityManager => {
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
          passwordHash: hash,
          role: data.role || UserRole.POS,
        });
        savedUser = await transactionalEntityManager.save(user);
        // We can auto-accept if the admin created them, but let's make them PENDING too for consistency, 
        // OR ACCEPTED because they were created specifically for this store. 
        status = 'ACCEPTED'; // Or PENDING, let's keep ACCEPTED for brand new users.
      }

      // Create access link
      const access = transactionalEntityManager.create('UserTenantAccess', {
        user: savedUser,
        tenant: { id: tenantId },
        role: data.role || UserRole.POS,
        isActive: true,
        status: status,
        salaryAmount: data.salaryAmount ? Number(data.salaryAmount) : null,
        salaryPeriod: data.salaryPeriod || null,
        jobTitle: data.jobTitle || data.job_title || null,
        entryTime: data.entryTime || data.entry_time || null,
        exitTime: data.exitTime || data.exit_time || null,
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
      access = this.usersRepo.manager.create(UserTenantAccess, {
        userId,
        tenantId,
        isActive: true,
        status: 'ACCEPTED',
        role: data.role || user.role || UserRole.POS
      });
    }

    if (data.role !== undefined) {
      access.role = data.role;
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
    if (data.salaryAmount !== undefined) {
      access.salaryAmount = data.salaryAmount ? Number(data.salaryAmount) : null;
    }
    if (data.salaryPeriod !== undefined) {
      access.salaryPeriod = data.salaryPeriod || null;
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

    const payload = {
      username: req.userName,
      sub: req.userId,
      role: req.role,
      tenantId: req.tenantId,
      tenantName: 'Flujo Fino',
    };

    const tenant = await this.usersRepo.manager.findOne(Tenant, { where: { id: tenantId } });
    if (tenant) {
      payload.tenantName = tenant.name;
    }

    const user = await this.usersRepo.findOne({
      where: { id: req.userId },
      relations: { tenantAccess: { tenant: true } },
    });
    const allWorkspaces = user?.tenantAccess?.map(a => ({
      tenantId: a.tenantId,
      name: a.tenant?.name || 'Sucursal',
      role: a.role,
      status: a.status,
    })) || [{
      tenantId: req.tenantId,
      name: payload.tenantName,
      role: req.role,
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
