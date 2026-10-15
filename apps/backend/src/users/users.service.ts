import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { Tenant } from '../entities/tenant.entity';
import { AccessRequest, AccessRequestStatus } from '../entities/access-request.entity';
import { OperatingExpense } from '../entities/operating-expense.entity';
import { SalaryAdvance, SalaryAdvanceStatus } from '../entities/salary-advance.entity';
import { Reservation } from '../entities/reservation.entity';
import { Order } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
import { OrderItem } from '../entities/order-item.entity';
import { UserRole, ReservationStatus, OrderStatus, PaymentStatus, DEFAULT_SUPERADMIN_EMAIL, TenantStatus, TenantPlanType } from '@finowork/shared-types';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { isValidUUID } from '../utils/tenant-crypto';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    try {
      if (this.usersRepo.manager?.query) {
        await this.usersRepo.manager.query(`
          ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "salaryAmount" numeric(12,2);
          ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "salaryPeriod" character varying;
          ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "compensation_type" character varying DEFAULT 'FIJO';
          ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "commission_percentage" numeric(5,2);
        `);
      }
    } catch (err) {
      console.warn('[UsersService] Auto-migration columns check:', err);
    }

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

    // Asegurar aislamiento multi-inquilino estricto y auto-curación de negocios
    try {
      if (this.usersRepo.manager?.query) {
        // 1. Desvincular inmediatamente al usuario demo 'admin' de cualquier negocio real de clientes (como 'Techno')
        await this.usersRepo.manager.query(`
          DELETE FROM "user_tenant_access"
          WHERE "userId" IN (SELECT id FROM users WHERE username = 'admin')
            AND "tenantId" IN (SELECT id FROM tenant WHERE name != 'FinoWork Central');
        `);

        // Desvincular cualquier vinculación accidental de Eva (exitoca) con Techno
        await this.usersRepo.manager.query(`
          DELETE FROM "user_tenant_access"
          WHERE "userId" IN (SELECT id FROM users WHERE username = 'exitoca' OR username = 'exitoca ')
            AND "tenantId" IN (SELECT id FROM tenant WHERE name = 'Techno');
        `);

        // 2. Normalizar espacios residuales en nombres de usuario y correos
        await this.usersRepo.manager.query(`
          UPDATE users SET username = TRIM(username) WHERE username != TRIM(username);
          UPDATE users SET email = LOWER(TRIM(email)) WHERE email != LOWER(TRIM(email));
        `);
      }

      const tenantRepo = this.usersRepo.manager?.getRepository
        ? this.usersRepo.manager.getRepository(Tenant)
        : null;
      const accessRepo = this.usersRepo.manager?.getRepository
        ? this.usersRepo.manager.getRepository(UserTenantAccess)
        : null;

      if (tenantRepo && accessRepo) {
        // 3. Crear o asegurar sucursal demo dedicada 'FinoWork Central' para el usuario demo 'admin'
        let centralTenant = await tenantRepo.findOne({ where: { name: 'FinoWork Central' } });
        if (!centralTenant) {
          centralTenant = tenantRepo.create({
            name: 'FinoWork Central',
            isActive: true,
            status: TenantStatus.ACTIVE,
            plan_type: TenantPlanType.REGULAR,
          });
          centralTenant = await tenantRepo.save(centralTenant);
        }

        const adminUser = await this.usersRepo.findOne({
          where: { username: 'admin' },
          relations: { tenantAccess: true },
        });

        if (adminUser) {
          const hasCentralAccess = adminUser.tenantAccess?.some(a => a.tenantId === centralTenant!.id);
          if (!hasCentralAccess) {
            const demoAccess = accessRepo.create({
              user: adminUser,
              userId: adminUser.id,
              tenant: centralTenant,
              tenantId: centralTenant.id,
              role: UserRole.ADMIN,
              roles: [UserRole.ADMIN],
              isActive: true,
              status: 'ACCEPTED',
            });
            await accessRepo.save(demoAccess);
            console.log(`[UsersService] Vinculado admin demo a sucursal dedicada: ${centralTenant.name} (${centralTenant.id})`);
          }
        }
      }
    } catch (e: any) {
      console.warn('[UsersService] Limpieza de sucursales:', e?.message || e);
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

    // Si el tenantId no es un UUID válido (ej: 'admin-system', 'platform-admin', 'default'):
    // No podemos consultar la columna UUID de PostgreSQL porque arroja DatabaseError.
    // En su lugar, retornamos de forma segura todos los usuarios del sistema.
    if (!isValidUUID(tenantId)) {
      const allUsers = await this.usersRepo.find({
        order: { createdAt: 'DESC' },
      });
      return allUsers.map(user => {
        delete (user as any).passwordHash;
        return user;
      });
    }

    // Consultar directamente los registros de UserTenantAccess para este tenantId
    const accesses = await this.usersRepo.manager.find(UserTenantAccess, {
      where: { tenantId },
      relations: { user: true, tenant: true },
      order: { id: 'DESC' }
    });

    const tenantUsers: User[] = [];
    const seenUserIds = new Set<string>();

    for (const access of accesses) {
      if (access.user && !seenUserIds.has(access.user.id)) {
        // AISLAMIENTO ESTRICTO:
        // El usuario demo 'admin' NUNCA debe figurar en negocios reales de clientes
        if (access.user.username === 'admin' && access.tenant?.name && access.tenant.name !== 'FinoWork Central') {
          continue;
        }

        seenUserIds.add(access.user.id);
        const user = access.user;
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
        delete (user as any).passwordHash;
        tenantUsers.push(user);
      }
    }

    // Asegurar que si el tenant tiene un administrador registrado, aparezca como líder del equipo
    const hasAdminInList = tenantUsers.some(u => u.role === UserRole.ADMIN);
    if (!hasAdminInList) {
      const adminAccess = await this.usersRepo.manager.findOne(UserTenantAccess, {
        where: { tenantId, role: UserRole.ADMIN },
        relations: { user: true },
      });
      if (adminAccess?.user && !seenUserIds.has(adminAccess.user.id) && adminAccess.user.username !== 'admin') {
        const u = adminAccess.user;
        u.role = UserRole.ADMIN;
        (u as any).roles = [UserRole.ADMIN];
        (u as any).status = 'ACCEPTED';
        delete (u as any).passwordHash;
        tenantUsers.unshift(u);
      }
    }

    // Fallback: Si no hay accesos creados todavía para este tenantId pero existen usuarios,
    // retornamos los usuarios del sistema para no dejar al administrador con la tabla vacía.
    if (tenantUsers.length === 0) {
      const allUsers = await this.usersRepo.find({
        order: { createdAt: 'DESC' },
      });
      const filtered = allUsers.filter(u => u.username !== 'admin' && u.username !== 'superadmin');
      const listToReturn = filtered.length > 0 ? filtered : allUsers;
      return listToReturn.map(user => {
        delete (user as any).passwordHash;
        return user;
      });
    }

    return tenantUsers;
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

    let effectiveTenantId = tenantId;
    if (!isValidUUID(effectiveTenantId)) {
      try {
        const accessRepo = this.usersRepo.manager.getRepository(UserTenantAccess);
        const userAccess = await accessRepo.findOne({
          where: { role: UserRole.ADMIN, isActive: true },
          order: { id: 'DESC' },
        });
        if (userAccess?.tenantId) effectiveTenantId = userAccess.tenantId;
      } catch (err) {}
    }
    
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
          tenantId: effectiveTenantId,
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
        tenantId: effectiveTenantId,
        tenant: { id: effectiveTenantId } as any,
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

    let effectiveTenantId = tenantId;
    if (!isValidUUID(effectiveTenantId)) {
      try {
        const accessRepo = this.usersRepo.manager.getRepository(UserTenantAccess);
        const userAccess = await accessRepo.findOne({
          where: { role: UserRole.ADMIN, isActive: true },
          order: { id: 'DESC' },
        });
        if (userAccess?.tenantId) effectiveTenantId = userAccess.tenantId;
      } catch (err) {}
    }

    let access = await this.usersRepo.manager.findOne(UserTenantAccess, {
      where: { userId, tenantId: effectiveTenantId }
    });

    if (!access) {
      const user = await this.usersRepo.findOne({ where: { id: userId } });
      if (!user) throw new Error('Usuario no encontrado');
      const fallbackRoles = (data.roles && Array.isArray(data.roles) && data.roles.length > 0)
        ? data.roles
        : (data.role ? [data.role] : [user.role || UserRole.POS]);

      access = this.usersRepo.manager.create(UserTenantAccess, {
        userId,
        tenantId: effectiveTenantId,
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
    
    if (!isValidUUID(tenantId)) {
      await this.usersRepo.manager.query(
        `DELETE FROM "user_tenant_access" WHERE "userId" = $1`,
        [id]
      );
      return;
    }

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

    let userObj: User | null | undefined = access?.user;
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

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Reservas completadas atendidas por el empleado (o vinculadas a órdenes entregadas)
    const reservationQuery = this.usersRepo.manager.createQueryBuilder(Reservation, 'res')
      .where('res.tenantId = :tenantId', { tenantId })
      .andWhere(
        '(res.employeeId = :userId OR (res."serviceSpecialists" IS NOT NULL AND CAST(res."serviceSpecialists" AS text) LIKE :userSearch))',
        { tenantId, userId, userSearch: `%"employeeId":"${userId}"%` }
      )
      .andWhere('(res.status = :resStatus OR EXISTS (SELECT 1 FROM "order" ord_link WHERE (CAST(ord_link.id AS text) = res."orderId" OR ord_link."linkedReservationId" = CAST(res.id AS text)) AND ord_link.status = :ordDelivered))', {
        resStatus: ReservationStatus.COMPLETED,
        ordDelivered: OrderStatus.DELIVERED,
      });

    if (startDate) {
      reservationQuery.andWhere('res.date >= :startDate', { startDate });
    }
    if (endDate) {
      reservationQuery.andWhere('res.date <= :endDate', { endDate });
    }
    reservationQuery.orderBy('res.date', 'DESC').addOrderBy('res.time', 'DESC');
    const rawReservations = await reservationQuery.getMany();
    const reservations = rawReservations.filter(r => {
      if (Array.isArray(r.serviceSpecialists) && r.serviceSpecialists.length > 0) {
        return r.serviceSpecialists.some(s => s.employeeId === userId);
      }
      return !r.employeeId || r.employeeId === userId;
    });

    // Auto-curar y calcular montos de reservas que tengan totalAmount <= 0
    for (const r of reservations) {
      try {
        // Identificar desglose por especialista si existe serviceSpecialists
        if (Array.isArray(r.serviceSpecialists) && r.serviceSpecialists.length > 0) {
          const myServices = r.serviceSpecialists.filter(s => s.employeeId === userId);
          if (myServices.length > 0) {
            (r as any).userServicesDescription = myServices.map(s => s.serviceName || 'Servicio').join(', ');
            let sum = myServices.reduce((acc, s) => acc + Number(s.price || 0), 0);
            if (sum <= 0) {
              for (const ms of myServices) {
                if (ms.serviceId) {
                  try {
                    const p = await this.usersRepo.manager.findOne(Product, { where: { id: ms.serviceId, tenantId } });
                    if (p?.salePrice) sum += Number(p.salePrice);
                  } catch (e) {}
                }
              }
            }
            (r as any).userPortion = sum;
          }
        }

        let rAmount = Number(r.totalAmount || 0);
        if (rAmount <= 0) {
          // 1. Buscar orden vinculada
          let linkedOrder: Order | null = null;
          if (r.orderId && UUID_REGEX.test(r.orderId)) {
            try {
              linkedOrder = await this.usersRepo.manager.findOne(Order, {
                where: { id: r.orderId, tenantId },
              });
            } catch (e) {}
          }
          if (!linkedOrder) {
            try {
              linkedOrder = await this.usersRepo.manager.findOne(Order, {
                where: { linkedReservationId: r.id, tenantId },
              });
            } catch (e) {}
          }

          if (linkedOrder) {
            if (Number(linkedOrder.totalAmount || 0) > 0) {
              rAmount = Number(linkedOrder.totalAmount);
            } else {
              try {
                const items = await this.usersRepo.manager.find(OrderItem, {
                  where: { orderId: linkedOrder.id },
                });
                const itemsSum = items.reduce((s, it) => s + (Number(it.subtotal || 0) || (Number(it.quantity || 1) * Number(it.unitPrice || 0))), 0);
                if (itemsSum > 0) {
                  rAmount = itemsSum;
                  linkedOrder.totalAmount = itemsSum;
                  this.usersRepo.manager.update(Order, { id: linkedOrder.id }, { totalAmount: itemsSum }).catch(() => {});
                }
              } catch (e) {}
            }
          }

          // 2. Si sigue en 0, calcular desde catálogo de productos con serviceId
          if (rAmount <= 0 && r.serviceId) {
            const rawIds = r.serviceId.split(',').map((s: string) => s.trim()).filter(Boolean);
            const validUuids = rawIds.filter(id => UUID_REGEX.test(id));
            if (validUuids.length > 0) {
              try {
                const products = await this.usersRepo.manager.find(Product, {
                  where: validUuids.map(id => ({ id, tenantId })),
                });
                const prodSum = products.reduce((s, p) => s + Number(p.salePrice || 0), 0);
                if (prodSum > 0) {
                  rAmount = prodSum;
                }
              } catch (e) {}
            }
          }

          // 3. Si sigue en 0, calcular desde catálogo de productos con serviceName o IDs
          if (rAmount <= 0 && (r.serviceName || r.serviceId)) {
            const tokens = [
              ...(r.serviceName ? r.serviceName.split(',').map((s: string) => s.trim().toLowerCase()) : []),
              ...(r.serviceId ? r.serviceId.split(',').map((s: string) => s.trim().toLowerCase()) : []),
            ].filter(Boolean);

            if (tokens.length > 0) {
              try {
                const allProducts = await this.usersRepo.manager.find(Product, {
                  where: { tenantId },
                });
                const matching = allProducts.filter(p => 
                  (p.name && tokens.includes(p.name.trim().toLowerCase())) ||
                  (p.id && tokens.includes(p.id.toLowerCase()))
                );
                const nameSum = matching.reduce((s, p) => s + Number(p.salePrice || 0), 0);
                if (nameSum > 0) {
                  rAmount = nameSum;
                }
              } catch (e) {}
            }
          }

          if (rAmount > 0) {
            r.totalAmount = rAmount;
            this.usersRepo.manager.update(Reservation, { id: r.id }, { totalAmount: rAmount }).catch(() => {});
            if (linkedOrder && Number(linkedOrder.totalAmount || 0) <= 0) {
              this.usersRepo.manager.update(Order, { id: linkedOrder.id }, { totalAmount: rAmount }).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.warn(`[getPayrollSummary] Advertencia curando reserva ${r.id}:`, err);
      }
    }

    // Pedidos entregados atendidos por el empleado (excluyendo órdenes vinculadas a reservas ya contadas)
    const orderQuery = this.usersRepo.manager.createQueryBuilder(Order, 'ord')
      .where('ord.tenantId = :tenantId', { tenantId })
      .andWhere(
        '(ord.employeeId = :userId OR EXISTS (SELECT 1 FROM order_item oi WHERE oi."orderId" = ord.id AND oi."employeeId" = :userId))',
        { tenantId, userId }
      )
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

    const relevantStandaloneOrders: Order[] = [];
    // Auto-curar y calcular montos de órdenes independientes si totalAmount <= 0
    for (const o of standaloneOrders) {
      try {
        const items = await this.usersRepo.manager.find(OrderItem, {
          where: { orderId: o.id },
        });

        // Identificar si la orden tiene ítems con especialistas específicos
        const hasSpecificEmployees = items.some(it => !!it.employeeId);
        if (hasSpecificEmployees) {
          const userItems = items.filter(it => it.employeeId === userId);
          if (userItems.length === 0) {
            // Este empleado no participó en los ítems de esta orden compartida
            continue;
          }
          const userPortion = userItems.reduce((s, it) => s + (Number(it.subtotal || 0) || (Number(it.quantity || 1) * Number(it.unitPrice || 0))), 0);
          (o as any).userPortion = userPortion;
          (o as any).userItemsDescription = userItems.map(it => it.productName || 'Servicio').join(', ');
        } else if (o.employeeId && o.employeeId !== userId) {
          // Si la orden no tiene especialistas por ítem y el empleado general es de otra persona, no corresponde
          continue;
        }

        let oAmount = Number(o.totalAmount || 0);
        if (oAmount <= 0) {
          const itemsSum = items.reduce((s, it) => s + (Number(it.subtotal || 0) || (Number(it.quantity || 1) * Number(it.unitPrice || 0))), 0);
          if (itemsSum > 0) {
            o.totalAmount = itemsSum;
            this.usersRepo.manager.update(Order, { id: o.id }, { totalAmount: itemsSum }).catch(() => {});
          }
        }
        relevantStandaloneOrders.push(o);
      } catch (err) {
        console.warn(`[getPayrollSummary] Advertencia curando orden ${o.id}:`, err);
        relevantStandaloneOrders.push(o);
      }
    }

    // Determinar cobros efectivos y montos pendientes por cobrar
    let totalPaidBilled = 0;
    let totalPendingBilled = 0;

    const processedReservations = reservations.map(r => {
      const fullAmt = Number(r.totalAmount || 0);
      const isCustomUser = (r as any).userPortion !== null && (r as any).userPortion !== undefined;
      const amt = isCustomUser ? Number((r as any).userPortion) : fullAmt;

      const isPaid = r.paymentStatus === PaymentStatus.PAID || (!r.paymentStatus && r.status === ReservationStatus.COMPLETED);
      const abono = Number(r.abonosTotal || 0);

      let paid = 0;
      if (isPaid) {
        paid = amt;
      } else if (r.paymentStatus === PaymentStatus.PARTIAL && abono > 0) {
        if (isCustomUser && fullAmt > 0) {
          const ratio = Math.min(1, abono / fullAmt);
          paid = Number((amt * ratio).toFixed(2));
        } else {
          paid = Math.min(amt, abono);
        }
      }
      const pending = Math.max(0, amt - paid);
      totalPaidBilled += paid;
      totalPendingBilled += pending;
      return {
        ...r,
        userBilledAmount: amt,
        calcPaid: paid,
        calcPending: pending,
        isPaidEffective: isPaid,
        calcPaymentStatus: isPaid ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'PENDING'),
      };
    });

    const processedOrders = relevantStandaloneOrders.map(o => {
      const fullAmt = Number(o.totalAmount || 0);
      const isCustomUser = (o as any).userPortion !== null && (o as any).userPortion !== undefined;
      const amt = isCustomUser ? Number((o as any).userPortion) : fullAmt;

      const isPaid = o.paymentStatus === PaymentStatus.PAID || (!o.paymentStatus && o.status === OrderStatus.DELIVERED);
      const abono = Number(o.abonosTotal || 0);

      let paid = 0;
      if (isPaid) {
        paid = amt;
      } else if (o.paymentStatus === PaymentStatus.PARTIAL && abono > 0) {
        if (isCustomUser && fullAmt > 0) {
          const ratio = Math.min(1, abono / fullAmt);
          paid = Number((amt * ratio).toFixed(2));
        } else {
          paid = Math.min(amt, abono);
        }
      }
      const pending = Math.max(0, amt - paid);
      totalPaidBilled += paid;
      totalPendingBilled += pending;
      return {
        ...o,
        userBilledAmount: amt,
        calcPaid: paid,
        calcPending: pending,
        isPaidEffective: isPaid,
        calcPaymentStatus: isPaid ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'PENDING'),
      };
    });

    const servicesTotalBilled = processedReservations.reduce((sum, r) => sum + Number(r.userBilledAmount || 0), 0);
    const ordersTotalBilled = processedOrders.reduce((sum, o) => sum + Number(o.userBilledAmount || 0), 0);

    totalPaidBilled = Number(totalPaidBilled.toFixed(2));
    totalPendingBilled = Number(totalPendingBilled.toFixed(2));
    const totalBilled = Number((totalPaidBilled + totalPendingBilled).toFixed(2));

    // Comisión liquidable a pagar: SOLO sobre trabajos cobrados
    let commissionEarned = 0;
    // Comisión por cobrar: trabajos completados pero aún no pagados por el cliente
    let pendingCommission = 0;

    if (compensationType === 'COMISION' || compensationType === 'MIXTO') {
      commissionEarned = Number(((totalPaidBilled * (commissionPercentage || 0)) / 100).toFixed(2));
      pendingCommission = Number(((totalPendingBilled * (commissionPercentage || 0)) / 100).toFixed(2));
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
      ...processedReservations.map(r => ({
        type: 'RESERVATION' as const,
        id: r.id,
        date: r.date,
        time: r.time,
        client: r.customerName || 'Cliente',
        description: (r as any).userServicesDescription || r.serviceName || 'Servicio realizado',
        amount: Number(r.userBilledAmount !== undefined ? r.userBilledAmount : (r.totalAmount || 0)),
        paidAmount: r.calcPaid,
        pendingAmount: r.calcPending,
        isPaid: r.isPaidEffective,
        paymentStatus: r.calcPaymentStatus,
        commissionAmount: Number(((r.calcPaid * (commissionPercentage || 0)) / 100).toFixed(2)),
      })),
      ...processedOrders.map(o => ({
        type: 'ORDER' as const,
        id: o.id,
        date: o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '',
        time: o.createdAt ? new Date(o.createdAt).toISOString().split('T')[1]?.substring(0, 5) : '',
        client: o.customerName || 'Cliente',
        description: (o as any).userItemsDescription ? `Pedido #${o.id.substring(0, 6)} (${(o as any).userItemsDescription})` : `Pedido #${o.id.substring(0, 6)}`,
        amount: Number(o.userBilledAmount !== undefined ? o.userBilledAmount : (o.totalAmount || 0)),
        paidAmount: o.calcPaid,
        pendingAmount: o.calcPending,
        isPaid: o.isPaidEffective,
        paymentStatus: o.calcPaymentStatus,
        commissionAmount: Number(((o.calcPaid * (commissionPercentage || 0)) / 100).toFixed(2)),
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
      servicesCount: processedReservations.length,
      servicesTotalBilled: Number(servicesTotalBilled.toFixed(2)),
      ordersCount: processedOrders.length,
      ordersTotalBilled: Number(ordersTotalBilled.toFixed(2)),
      totalBilled,
      totalPaidBilled,
      totalPendingBilled,
      commissionEarned,
      pendingCommission,
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
    if (!isValidUUID(tenantId)) {
      return accessReqRepo.find({
        where: { status: AccessRequestStatus.PENDING },
        order: { createdAt: 'DESC' },
      });
    }
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
