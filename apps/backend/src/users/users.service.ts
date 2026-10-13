import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { Tenant } from '../entities/tenant.entity';
import { AccessRequest, AccessRequestStatus } from '../entities/access-request.entity';
import { OperatingExpense } from '../entities/operating-expense.entity';
import { SalaryAdvance, SalaryAdvanceStatus } from '../entities/salary-advance.entity';
import { Reservation } from '../entities/reservation.entity';
import { Order } from '../entities/order.entity';
import { UserRole, ReservationStatus, OrderStatus, DEFAULT_SUPERADMIN_EMAIL } from '@finowork/shared-types';
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
    // Create default accounts if no users exist
    const count = await this.usersRepo.count();
    if (count === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      const admin = this.usersRepo.create({
        username: 'admin',
        name: 'Administrador Demo',
        email: 'admin@finowork.com',
        passwordHash: hash,
        role: UserRole.ADMIN,
        isEmailVerified: true,
      });
      await this.usersRepo.save(admin);
      console.log('Default admin user created: admin / admin123');

      const superAdminEmail = (process.env.SUPERADMIN_EMAIL || DEFAULT_SUPERADMIN_EMAIL).toLowerCase();
      const superPassword = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin2026!';
      const superHash = await bcrypt.hash(superPassword, 10);
      const superAdmin = this.usersRepo.create({
        username: 'superadmin',
        name: 'Super Administrador',
        email: superAdminEmail,
        passwordHash: superHash,
        role: UserRole.SUPERADMIN,
        isEmailVerified: true,
      });
      await this.usersRepo.save(superAdmin);
      console.log(`🛡️ SuperAdmin inicial creado: ${superAdminEmail}`);
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
        (user as any).compensationType = access.compensationType || 'FIJO';
        (user as any).commissionPercentage = (access.commissionPercentage !== null && access.commissionPercentage !== undefined)
          ? Number(access.commissionPercentage)
          : null;
      }
      delete (user as any).passwordHash;
      return user;
    });
  }

  async findActiveEmployees(tenantId?: string): Promise<{
    id: string;
    username: string;
    name: string;
    role: UserRole;
    roles?: UserRole[];
    jobTitle?: string;
    entryTime?: string;
    exitTime?: string;
    lunchStart?: string;
    lunchEnd?: string;
    compensationType?: string;
    commissionPercentage?: number | null;
  }[]> {
    if (!tenantId) return [];
    const users = await this.findAll(tenantId);
    return users.map(u => ({
      id: u.id,
      username: u.username,
      name: u.name || u.username,
      role: u.role,
      roles: (u as any).roles && (u as any).roles.length > 0 ? (u as any).roles : [u.role],
      jobTitle: (u as any).jobTitle || undefined,
      entryTime: (u as any).entryTime || undefined,
      exitTime: (u as any).exitTime || undefined,
      lunchStart: (u as any).lunchStart || undefined,
      lunchEnd: (u as any).lunchEnd || undefined,
      compensationType: (u as any).compensationType || 'FIJO',
      commissionPercentage: (u as any).commissionPercentage || null,
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
          username: generatedUsername,
          name: cleanName,
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
          compensationType: data.compensationType || 'FIJO',
          commissionPercentage: (data.commissionPercentage !== undefined && data.commissionPercentage !== null && data.commissionPercentage !== '')
            ? Number(data.commissionPercentage)
            : null,
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
          name: (data.name || data.fullName || data.username || '').trim(),
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
      const access = transactionalEntityManager.create(UserTenantAccess, {
        user: savedUser,
        tenantId,
        tenant: { id: tenantId } as any,
        role: primaryRole,
        roles: assignedRoles,
        isActive: true,
        status: status,
        salaryAmount: data.salaryAmount ? Number(data.salaryAmount) : null,
        salaryPeriod: data.salaryPeriod || null,
        compensationType: data.compensationType || 'FIJO',
        commissionPercentage: (data.commissionPercentage !== undefined && data.commissionPercentage !== null && data.commissionPercentage !== '')
          ? Number(data.commissionPercentage)
          : null,
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
    if (data.compensationType !== undefined) {
      access.compensationType = data.compensationType || 'FIJO';
    }
    if (data.commissionPercentage !== undefined) {
      access.commissionPercentage = (data.commissionPercentage !== null && data.commissionPercentage !== '')
        ? Number(data.commissionPercentage)
        : null;
    }

    if (data.identification !== undefined || data.phone !== undefined || data.name !== undefined) {
      await this.usersRepo.update(userId, {
        ...(data.name !== undefined ? { name: (data.name || '').trim() || null } : {}),
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
      // 1. Create expense in box / operating expenses
      const expense = manager.create(OperatingExpense, {
        tenantId,
        description: `Pago de Nómina - Empleado ${data.username || userId}`,
        amount: Number(data.amount),
        paymentMethod: data.method || 'CASH',
        category: 'PAYROLL',
        createdAt: data.date ? new Date(data.date) : new Date()
      });
      await manager.save(expense);

      // 2. Si se solicitó descontar vales / anticipos pendientes
      if (data.deductAdvances) {
        if (Array.isArray(data.advanceIds) && data.advanceIds.length > 0) {
          await manager.createQueryBuilder()
            .update(SalaryAdvance)
            .set({ status: SalaryAdvanceStatus.DESCONTADO })
            .where('id IN (:...advanceIds) AND negocioId = :tenantId AND userId = :userId', {
              advanceIds: data.advanceIds,
              tenantId,
              userId,
            })
            .execute();
        } else {
          await manager.createQueryBuilder()
            .update(SalaryAdvance)
            .set({ status: SalaryAdvanceStatus.DESCONTADO })
            .where('negocioId = :tenantId AND userId = :userId AND status = :status', {
              tenantId,
              userId,
              status: SalaryAdvanceStatus.PENDIENTE,
            })
            .execute();
        }
      }
    });
  }

  async getPayrollSummary(
    tenantId: string,
    userId: string,
    startDate?: string,
    endDate?: string,
  ) {
    if (!tenantId) throw new Error('Tenant ID required');

    const access = await this.usersRepo.manager.findOne(UserTenantAccess, {
      where: { userId, tenantId },
      relations: { user: true },
    });

    let userObj = access?.user;
    if (!userObj) {
      userObj = await this.usersRepo.findOne({ where: { id: userId } });
    }
    if (!userObj) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const compensationType = access?.compensationType || 'FIJO';
    const commissionPercentage = access?.commissionPercentage !== null && access?.commissionPercentage !== undefined
      ? Number(access.commissionPercentage)
      : 0;
    const salaryAmount = access?.salaryAmount !== null && access?.salaryAmount !== undefined
      ? Number(access.salaryAmount)
      : 0;
    const salaryPeriod = access?.salaryPeriod || null;

    // Reservas completadas atendidas por el empleado
    const reservationQuery = this.usersRepo.manager.createQueryBuilder(Reservation, 'res')
      .where('res.tenantId = :tenantId', { tenantId })
      .andWhere('res.employeeId = :userId', { userId })
      .andWhere('res.status = :resStatus', { resStatus: ReservationStatus.COMPLETED });

    if (startDate) {
      reservationQuery.andWhere('res.date >= :startDate', { startDate });
    }
    if (endDate) {
      reservationQuery.andWhere('res.date <= :endDate', { endDate });
    }
    reservationQuery.orderBy('res.date', 'DESC').addOrderBy('res.time', 'DESC');
    const reservations = await reservationQuery.getMany();

    // Pedidos entregados atendidos por el empleado (excluyendo órdenes vinculadas a reservas ya contadas)
    const orderQuery = this.usersRepo.manager.createQueryBuilder(Order, 'ord')
      .where('ord.tenantId = :tenantId', { tenantId })
      .andWhere('ord.employeeId = :userId', { userId })
      .andWhere('ord.status = :orderStatus', { orderStatus: OrderStatus.DELIVERED });

    if (startDate) {
      orderQuery.andWhere('ord.createdAt >= :startDateTime', { startDateTime: new Date(`${startDate}T00:00:00.000Z`) });
    }
    if (endDate) {
      orderQuery.andWhere('ord.createdAt <= :endDateTime', { endDateTime: new Date(`${endDate}T23:59:59.999Z`) });
    }
    orderQuery.orderBy('ord.createdAt', 'DESC');
    const orders = await orderQuery.getMany();

    const reservationIds = new Set(reservations.map(r => r.id));
    const standaloneOrders = orders.filter(o => !o.linkedReservationId || !reservationIds.has(o.linkedReservationId));

    const servicesTotalBilled = reservations.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
    const ordersTotalBilled = standaloneOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const totalBilled = Number((servicesTotalBilled + ordersTotalBilled).toFixed(2));

    let commissionEarned = 0;
    if (compensationType === 'COMISION' || compensationType === 'MIXTO') {
      commissionEarned = Number(((totalBilled * (commissionPercentage || 0)) / 100).toFixed(2));
    }

    let baseSalary = 0;
    if (compensationType === 'FIJO' || compensationType === 'MIXTO') {
      baseSalary = Number(salaryAmount.toFixed(2));
    }

    const grossTotal = Number((baseSalary + commissionEarned).toFixed(2));

    // Vales / Anticipos pendientes
    const pendingAdvances = await this.usersRepo.manager.find(SalaryAdvance, {
      where: {
        negocioId: tenantId,
        userId,
        status: SalaryAdvanceStatus.PENDIENTE,
      },
      order: { date: 'DESC', createdAt: 'DESC' },
    });

    const pendingAdvancesTotalUSD = Number(pendingAdvances.reduce((sum, a) => sum + Number(a.amountUSD || 0), 0).toFixed(2));
    const pendingAdvancesTotalBS = Number(pendingAdvances.reduce((sum, a) => sum + Number(a.amountBS || 0), 0).toFixed(2));

    const advancesDeduction = pendingAdvancesTotalUSD;
    const netPayableUSD = Math.max(0, Number((grossTotal - advancesDeduction).toFixed(2)));

    const workItems = [
      ...reservations.map(r => ({
        type: 'RESERVATION' as const,
        id: r.id,
        date: r.date,
        time: r.time,
        client: r.customerName || 'Cliente',
        description: r.serviceName || 'Servicio realizado',
        amount: Number(r.totalAmount || 0),
      })),
      ...standaloneOrders.map(o => ({
        type: 'ORDER' as const,
        id: o.id,
        date: o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '',
        time: o.createdAt ? new Date(o.createdAt).toISOString().split('T')[1]?.substring(0, 5) : '',
        client: o.customerName || 'Cliente',
        description: `Pedido #${o.id.substring(0, 6)}`,
        amount: Number(o.totalAmount || 0),
      })),
    ].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

    return {
      user: {
        id: userObj.id,
        username: userObj.username,
        name: userObj.name || userObj.username,
      },
      compensationType,
      salaryAmount,
      salaryPeriod,
      commissionPercentage,
      servicesCount: reservations.length,
      servicesTotalBilled: Number(servicesTotalBilled.toFixed(2)),
      ordersCount: standaloneOrders.length,
      ordersTotalBilled: Number(ordersTotalBilled.toFixed(2)),
      totalBilled,
      commissionEarned,
      baseSalary,
      grossTotal,
      pendingAdvancesTotalUSD,
      pendingAdvancesTotalBS,
      advancesDeduction,
      netPayableUSD,
      pendingAdvances,
      workItems,
    };
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
