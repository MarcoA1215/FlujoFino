import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { randomUUID } from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

// Entities
import { User } from '../../entities/user.entity';
import { Tenant } from '../../entities/tenant.entity';
import { UserTenantAccess } from '../../entities/user-tenant-access.entity';
import { Settings } from '../../entities/settings.entity';
import { Product } from '../../entities/product.entity';
import { RawMaterial } from '../../entities/raw-material.entity';
import { RecipeItem } from '../../entities/recipe-item.entity';
import { ComboItem } from '../../entities/combo-item.entity';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Reservation } from '../../entities/reservation.entity';
import { DeliveryZone } from '../../entities/delivery-zone.entity';
import { ProductionBatch } from '../../entities/production-batch.entity';
import { StockMovement } from '../../entities/stock-movement.entity';
import { WorkSchedule } from '../../entities/work-schedule.entity';
import { OperatingExpense } from '../../entities/operating-expense.entity';
import { AccessRequest } from '../../entities/access-request.entity';
import { Feedback } from '../../entities/feedback.entity';
import { OrderItemMedia } from '../../entities/order-item-media.entity';
import { Customer } from '../../entities/customer.entity';
import { SaaSPaymentReport } from '../../entities/saas-payment-report.entity';
import { PlatformConfig } from '../../entities/platform-config.entity';
import { Promoter } from '../../entities/promoter.entity';
import { PromoterCommission } from '../../entities/promoter-commission.entity';
import { SalaryAdvance, SalaryAdvanceStatus } from '../../entities/salary-advance.entity';
import { CashExchange } from '../../entities/cash-exchange.entity';
import { Investment } from '../../entities/investment.entity';
import { PushSubscription } from '../../entities/push-subscription.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { FiscalInvoice } from '../../entities/fiscal-invoice.entity';
import { AppUpdate } from '../../entities/app-update.entity';
import { PlatformExpense } from '../../entities/platform-expense.entity';

export interface DemoSeedResult {
  success: boolean;
  message: string;
  demoTenants: string[];
}

// Enums
import { 
  UserRole, 
  TenantStatus, 
  TenantPlanType, 
  OrderStatus, 
  PaymentStatus, 
  ReservationStatus, 
  DeliveryMethod,
  FiscalDocumentType,
  FiscalInvoiceStatus,
  FiscalProviderType,
} from '@finowork/shared-types';

export async function runDemoSeed(
  dataSource: DataSource,
  options: { skipSuperAdmin?: boolean } = {}
): Promise<DemoSeedResult> {
  if (!dataSource || !dataSource.isInitialized) {
    throw new Error("DataSource debe estar inicializado para ejecutar runDemoSeed.");
  }

// Columnas seguras en caso de faltar en esquemas previos
  const safeColumns = [
    `ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "companyLogoUrl" character varying;`,
    `ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "logoShape" character varying DEFAULT 'ROUNDED';`,
    `ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "logoFit" character varying DEFAULT 'contain';`,
    `ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "bookingAllowStaffSelection" boolean DEFAULT true;`,
    `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "duration_minutes" integer;`,
    `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "durationMinutes" integer;`,
    `ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "roles" text DEFAULT '';`,
    `ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "job_title" character varying;`,
    `ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "compensation_type" character varying DEFAULT 'FIJO';`,
    `ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "commission_percentage" numeric(5,2);`,
    `ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "salaryAmount" numeric(12,2);`,
    `ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "salaryPeriod" character varying;`,
    `ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "entry_time" character varying;`,
    `ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "exit_time" character varying;`,
    `ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "lunch_start" character varying;`,
    `ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "lunch_end" character varying;`,
    `ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "initialCashCop" numeric(14,2) DEFAULT 0;`,
    `ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "featureFiscalSupport" boolean DEFAULT false;`,
    `ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "fiscalDefaultTaxRate" numeric(5,2) DEFAULT 16.00;`,
    `ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "fiscalRif" character varying;`,
    `ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "fiscalCompanyName" character varying;`,
    `ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "fiscalAddress" character varying;`,
    `ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "fiscalPhone" character varying;`,
    `ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "fiscalMode" character varying DEFAULT 'INTERNAL';`,
    `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "isTaxExempt" boolean DEFAULT false;`,
    `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "taxRate" numeric(5,2) DEFAULT 16.00;`,
    `ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "subtotalExempt" numeric(12,4) DEFAULT 0;`,
    `ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "taxableBase" numeric(12,4) DEFAULT 0;`,
    `ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "taxAmount" numeric(12,4) DEFAULT 0;`,
    `ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "fiscalInvoiceId" character varying;`,
    `ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "fiscalStatus" character varying;`,
    `ALTER TABLE "order_item" ADD COLUMN IF NOT EXISTS "isTaxExempt" boolean DEFAULT false;`,
    `ALTER TABLE "order_item" ADD COLUMN IF NOT EXISTS "taxRate" numeric(5,2) DEFAULT 16.00;`,
    `ALTER TABLE "order_item" ADD COLUMN IF NOT EXISTS "taxAmount" numeric(12,2) DEFAULT 0;`,
  ];
  for (const sql of safeColumns) {
    try {
      await dataSource.query(sql);
    } catch {
      // Ignorar
    }
  }

  const userRepo = dataSource.getRepository(User);
  const tenantRepo = dataSource.getRepository(Tenant);
  const accessRepo = dataSource.getRepository(UserTenantAccess);
  const settingsRepo = dataSource.getRepository(Settings);
  const productRepo = dataSource.getRepository(Product);
  const rawMaterialRepo = dataSource.getRepository(RawMaterial);
  const recipeRepo = dataSource.getRepository(RecipeItem);
  const orderRepo = dataSource.getRepository(Order);
  const orderItemRepo = dataSource.getRepository(OrderItem);
  const reservationRepo = dataSource.getRepository(Reservation);
  const deliveryZoneRepo = dataSource.getRepository(DeliveryZone);
  const promoterRepo = dataSource.getRepository(Promoter);
  const customerRepo = dataSource.getRepository(Customer);
  const expenseRepo = dataSource.getRepository(OperatingExpense);
  const variantRepo = dataSource.getRepository(ProductVariant);
  const fiscalInvoiceRepo = dataSource.getRepository(FiscalInvoice);
  const salaryAdvanceRepo = dataSource.getRepository(SalaryAdvance);

  try {
    const passwordHash = await bcrypt.hash('123456', 10);
    const superPasswordHash = await bcrypt.hash('SuperAdmin2026!', 10);
    let tasaActual = 855.66;
    try {
      const anySettings = await settingsRepo.findOne({ where: {} });
      if (anySettings?.exchangeRateBs && Number(anySettings.exchangeRateBs) > 0) {
        tasaActual = Number(anySettings.exchangeRateBs);
      }
    } catch {
      // fallback
    }
    const todayIso = new Date().toISOString().split('T')[0];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString().split('T')[0];

    // Helpers seguros e idempotentes
    async function getOrCreateUser(email: string, username: string, role: UserRole, name?: string, customHash?: string) {
      const normalizedEmail = email.toLowerCase().trim();
      let user = await userRepo.findOne({ 
        where: [
          { email: normalizedEmail }, 
          { username: username.trim() }
        ] 
      });

      if (!user) {
        user = userRepo.create({
          email: normalizedEmail,
          username: username.trim(),
          name: name || username,
          passwordHash: customHash || passwordHash,
          role,
          isEmailVerified: true,
        });
        user = await userRepo.save(user);
        console.log(` ✅ [NUEVO] Usuario creado: ${normalizedEmail} (${role})`);
      }
      return user;
    }

    interface CompensationConfig {
      compensationType?: 'FIJO' | 'COMISION' | 'MIXTO';
      commissionPercentage?: number;
      salaryAmount?: number;
      salaryPeriod?: 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
      entryTime?: string;
      exitTime?: string;
    }

    async function linkAccess(
      userId: string,
      tenantId: string,
      role: UserRole,
      jobTitle: string,
      compensation?: CompensationConfig,
    ) {
      let access = await accessRepo.findOne({ where: { userId, tenantId } });
      const compType = compensation?.compensationType || 'FIJO';
      const commPct = compensation?.commissionPercentage ?? null;
      const salary = compensation?.salaryAmount ?? null;
      const period = compensation?.salaryPeriod ?? (compType === 'COMISION' ? null : 'SEMANAL');

      if (!access) {
        access = accessRepo.create({
          userId,
          tenantId,
          role,
          roles: [role],
          isActive: true,
          status: 'ACCEPTED',
          jobTitle,
          compensationType: compType,
          commissionPercentage: commPct !== null ? commPct : undefined,
          salaryAmount: salary !== null ? salary : undefined,
          salaryPeriod: period || undefined,
          entryTime: compensation?.entryTime || undefined,
          exitTime: compensation?.exitTime || undefined,
        });
        access = await accessRepo.save(access);
        console.log(`   ✅ [ACCESO] ${jobTitle}: vinculado (${compType})`);
      } else {
        let updated = false;
        if (access.jobTitle !== jobTitle) {
          access.jobTitle = jobTitle;
          updated = true;
        }
        if (access.role !== role) {
          access.role = role;
          updated = true;
        }
        if (!access.roles || access.roles.length === 0) {
          access.roles = [role];
          updated = true;
        }
        if (compensation) {
          if (access.compensationType !== compType) {
            access.compensationType = compType;
            updated = true;
          }
          if (commPct !== null && Number(access.commissionPercentage) !== commPct) {
            access.commissionPercentage = commPct as any;
            updated = true;
          }
          if (salary !== null && Number(access.salaryAmount) !== salary) {
            access.salaryAmount = salary as any;
            updated = true;
          }
          if (period && access.salaryPeriod !== period) {
            access.salaryPeriod = period;
            updated = true;
          }
          if (compensation.entryTime && access.entryTime !== compensation.entryTime) {
            access.entryTime = compensation.entryTime;
            updated = true;
          }
          if (compensation.exitTime && access.exitTime !== compensation.exitTime) {
            access.exitTime = compensation.exitTime;
            updated = true;
          }
        }
        if (updated) {
          access = await accessRepo.save(access);
          console.log(`   🔄 [ACCESO ACTUALIZADO] ${jobTitle}: compensación ${compType}`);
        }
      }
      return access;
    }

    async function getOrCreateSalaryAdvance(tenantId: string, data: Partial<SalaryAdvance>) {
      let adv = await salaryAdvanceRepo.findOne({ 
        where: { negocioId: tenantId, userId: data.userId, reason: data.reason } 
      });
      if (!adv) {
        adv = salaryAdvanceRepo.create({ 
          ...data, 
          negocioId: tenantId,
          exchangeRate: data.exchangeRate || tasaActual,
          amountBS: data.amountBS || (data.amountUSD ? Number((data.amountUSD * tasaActual).toFixed(2)) : 0),
          status: data.status || SalaryAdvanceStatus.PENDIENTE,
          date: data.date || todayIso,
        });
        adv = await salaryAdvanceRepo.save(adv);
        console.log(`   💸 [VALE] ${data.reason}: $${adv.amountUSD} USD (${adv.status})`);
      }
      return adv;
    }

    async function getOrCreateCustomer(tenantId: string, data: Partial<Customer>) {
      let cust = await customerRepo.findOne({ 
        where: [
          { tenantId, phone: data.phone },
          { tenantId, name: data.name }
        ] 
      });
      if (!cust) {
        cust = customerRepo.create({ ...data, tenantId });
        cust = await customerRepo.save(cust);
        console.log(`   ✅ [CLIENTE] ${cust.name} (${cust.phone})`);
      }
      return cust;
    }

    async function getOrCreateProduct(tenantId: string, data: Partial<Product>) {
      let prod = await productRepo.findOne({ where: { tenantId, name: data.name } });
      if (!prod) {
        prod = productRepo.create({ ...data, tenantId });
        prod = await productRepo.save(prod);
        console.log(`   ✅ [PRODUCTO] ${prod.name} ($${prod.salePrice})`);
      } else if (data.isTaxExempt !== undefined) {
        prod.isTaxExempt = data.isTaxExempt;
        if (data.taxRate !== undefined) prod.taxRate = data.taxRate;
        await productRepo.save(prod);
      }
      return prod;
    }

    async function getOrCreateExpense(tenantId: string, data: Partial<OperatingExpense>) {
      let exp = await expenseRepo.findOne({ where: { tenantId, description: data.description } });
      if (!exp) {
        exp = expenseRepo.create({ ...data, tenantId });
        exp = await expenseRepo.save(exp);
        console.log(`   ✅ [GASTO] ${exp.description} ($${exp.amount})`);
      }
      return exp;
    }

    async function getOrCreateReservation(tenantId: string, data: Partial<Reservation>) {
      let res = await reservationRepo.findOne({ 
        where: { tenantId, customerName: data.customerName, date: data.date, time: data.time } 
      });
      if (!res) {
        res = reservationRepo.create({ ...data, tenantId });
        res = await reservationRepo.save(res);
        console.log(`   ✅ [CITA] ${res.customerName} - ${res.serviceName} (${res.date} ${res.time})`);
      }
      return res;
    }

    const invoiceSequenceMap: Record<string, number> = {};

    async function getNextInvoiceSeq(tenantId: string): Promise<number> {
      if (invoiceSequenceMap[tenantId] === undefined) {
        const count = await fiscalInvoiceRepo.count({ where: { tenantId } });
        invoiceSequenceMap[tenantId] = count;
      }
      invoiceSequenceMap[tenantId] += 1;
      return invoiceSequenceMap[tenantId];
    }

    async function ensureOrderFiscalInvoice(
      ord: Order,
      tenantId: string,
      items: { productId: string; productName: string; quantity: number; unitPrice: number; unitCost: number; isTaxExempt?: boolean; taxRate?: number }[] = [],
      dateOffsetDays = 0,
    ) {
      let invoice = await fiscalInvoiceRepo.findOne({ where: { tenantId, orderId: ord.id } });
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const targetDay = Math.max(1, Math.min(28, now.getDate() - (dateOffsetDays % 25)));
      const targetDate = new Date(currentYear, currentMonth, targetDay, 10 + (dateOffsetDays % 8), 15 + ((dateOffsetDays * 7) % 40));

      let effectiveItems = items;
      if (!effectiveItems || effectiveItems.length === 0) {
        const dbItems = await orderItemRepo.find({ where: { orderId: ord.id } });
        effectiveItems = dbItems.map(it => ({
          productId: it.productId,
          productName: it.productName || 'Producto',
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
          unitCost: Number(it.unitCost || 0),
          isTaxExempt: it.isTaxExempt,
          taxRate: it.taxRate,
        }));
      }

      let subtotalExempt = 0;
      let taxableBase = 0;
      let taxAmount = 0;
      const invoiceItems: any[] = [];

      for (const item of effectiveItems) {
        let isExempt = item.isTaxExempt;
        let rate = item.taxRate;
        if (isExempt === undefined && item.productId) {
          const prod = await productRepo.findOne({ where: { id: item.productId } });
          if (prod) {
            isExempt = Boolean(prod.isTaxExempt);
            rate = prod.taxRate;
          }
        }
        isExempt = Boolean(isExempt);
        const effectiveRate = isExempt ? 0 : (rate !== undefined && rate !== null ? Number(rate) : 16.0);
        const lineSubtotal = Number(item.quantity) * Number(item.unitPrice);
        const lineTax = isExempt ? 0 : Number(((lineSubtotal * effectiveRate) / 100).toFixed(2));

        if (isExempt) {
          subtotalExempt += lineSubtotal;
        } else {
          taxableBase += lineSubtotal;
        }
        taxAmount += lineTax;

        invoiceItems.push({
          productId: item.productId,
          name: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          isTaxExempt: isExempt,
          taxRate: effectiveRate,
          taxAmount: lineTax,
          subtotal: lineSubtotal,
        });
      }

      const totalAmount = Number(ord.totalAmount) || (subtotalExempt + taxableBase + taxAmount);
      if (taxableBase === 0 && subtotalExempt === 0) {
        taxableBase = totalAmount;
        taxAmount = Number(((taxableBase * 16.0) / 100).toFixed(2));
      }

      const rateBs = Number(ord.exchangeRate) || tasaActual;
      const amountBs = totalAmount * rateBs;

      if (!invoice) {
        const seq = await getNextInvoiceSeq(tenantId);
        const invoiceNumber = `FAC-${String(seq).padStart(8, '0')}`;
        const fiscalControlNumber = `00-${String(seq).padStart(8, '0')}`;

        let customerRif = 'V-00000000-0';
        if (ord.customerId) {
          const cust = await customerRepo.findOne({ where: { id: ord.customerId } });
          if (cust?.identification) customerRif = cust.identification;
        }
        if (customerRif === 'V-00000000-0' && ord.customerPhone) {
          const digits = ord.customerPhone.replace(/\D/g, '').slice(-8);
          customerRif = `V-${digits.padStart(8, '1')}`;
        }

        const tenantSettings = await settingsRepo.findOne({ where: { tenantId } });
        const issuerRif = tenantSettings?.fiscalRif || 'J-50000000-0';
        const dateStr = targetDate.toISOString().split('T')[0];
        const qrPayload = `${issuerRif}|${invoiceNumber}|${fiscalControlNumber}|${dateStr}|${amountBs.toFixed(2)}|${(taxAmount * rateBs).toFixed(2)}`;
        const qrCodeUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(qrPayload)}`;

        invoice = fiscalInvoiceRepo.create({
          tenantId,
          orderId: ord.id,
          documentType: FiscalDocumentType.INVOICE,
          provider: FiscalProviderType.INTERNAL,
          status: FiscalInvoiceStatus.ISSUED,
          invoiceNumber,
          fiscalControlNumber,
          series: 'A',
          customerName: ord.customerName || 'Cliente General',
          customerRif,
          customerAddress: 'Caracas, Venezuela',
          customerPhone: ord.customerPhone || '',
          subtotalExempt,
          taxableBase,
          taxRate: 16.0,
          taxAmount,
          totalAmount,
          amountBs,
          exchangeRate: rateBs,
          qrCodeUrl,
          items: invoiceItems,
          metadata: {
            generationMode: 'INTERNAL_AUTONOMOUS',
            issuerRif,
            issuerName: tenantSettings?.fiscalCompanyName || 'FinoWork Business',
            qrPayload,
            issuedAt: targetDate.toISOString(),
          },
          createdAt: targetDate,
          updatedAt: targetDate,
        } as Partial<FiscalInvoice>);

        invoice = await fiscalInvoiceRepo.save(invoice);
        console.log(`     🧾 [COMPROBANTE FISCAL] ${invoice.invoiceNumber} -> ${invoice.customerName} ($${invoice.totalAmount})`);
      }

      ord.fiscalInvoiceId = invoice.id;
      ord.fiscalStatus = invoice.status;
      ord.subtotalExempt = subtotalExempt;
      ord.taxableBase = taxableBase;
      ord.taxAmount = taxAmount;
      ord.createdAt = targetDate;
      await orderRepo.save(ord);

      return invoice;
    }

    async function createCreditNoteForInvoice(
      tenantId: string,
      invoiceId: string,
      reason: string,
      dateOffsetDays = 1,
    ) {
      const originalInvoice = await fiscalInvoiceRepo.findOne({ where: { id: invoiceId, tenantId } });
      if (!originalInvoice) return;

      const existingNc = await fiscalInvoiceRepo.findOne({
        where: {
          tenantId,
          documentType: FiscalDocumentType.CREDIT_NOTE,
        },
      });
      if (existingNc) return;

      const ncCount = await fiscalInvoiceRepo.count({
        where: { tenantId, documentType: FiscalDocumentType.CREDIT_NOTE },
      });
      const ncSeq = ncCount + 1;
      const creditNoteNumber = `NC-${String(ncSeq).padStart(8, '0')}`;
      const creditNoteControlNumber = `NC-00-${String(ncSeq).padStart(8, '0')}`;

      const now = new Date();
      const targetDay = Math.max(1, Math.min(28, now.getDate() - (dateOffsetDays % 25)));
      const targetDate = new Date(now.getFullYear(), now.getMonth(), targetDay, 15, 30);

      originalInvoice.status = FiscalInvoiceStatus.CANCELED;
      originalInvoice.rejectionReason = `Anulada: ${reason}`;
      await fiscalInvoiceRepo.save(originalInvoice);

      const creditNote = fiscalInvoiceRepo.create({
        tenantId,
        orderId: originalInvoice.orderId,
        documentType: FiscalDocumentType.CREDIT_NOTE,
        provider: FiscalProviderType.INTERNAL,
        status: FiscalInvoiceStatus.ISSUED,
        invoiceNumber: creditNoteNumber,
        fiscalControlNumber: creditNoteControlNumber,
        series: originalInvoice.series,
        customerName: originalInvoice.customerName,
        customerRif: originalInvoice.customerRif,
        customerAddress: originalInvoice.customerAddress,
        customerPhone: originalInvoice.customerPhone,
        subtotalExempt: -Math.abs(Number(originalInvoice.subtotalExempt)),
        taxableBase: -Math.abs(Number(originalInvoice.taxableBase)),
        taxRate: originalInvoice.taxRate,
        taxAmount: -Math.abs(Number(originalInvoice.taxAmount)),
        totalAmount: -Math.abs(Number(originalInvoice.totalAmount)),
        amountBs: -Math.abs(Number(originalInvoice.amountBs)),
        exchangeRate: originalInvoice.exchangeRate,
        items: originalInvoice.items,
        metadata: {
          affectedInvoiceId: originalInvoice.id,
          affectedInvoiceNumber: originalInvoice.invoiceNumber,
          reason,
          canceledAt: targetDate.toISOString(),
        },
        createdAt: targetDate,
        updatedAt: targetDate,
      } as Partial<FiscalInvoice>);

      await fiscalInvoiceRepo.save(creditNote);

      if (originalInvoice.orderId) {
        const order = await orderRepo.findOne({ where: { id: originalInvoice.orderId, tenantId } });
        if (order) {
          order.fiscalStatus = FiscalInvoiceStatus.CANCELED;
          await orderRepo.save(order);
        }
      }

      console.log(`     🧾 [NOTA DE CRÉDITO] ${creditNoteNumber} anulando ${originalInvoice.invoiceNumber} (${reason})`);
    }

    async function getOrCreateOrder(
      tenantId: string, 
      orderData: Partial<Order>, 
      items: { productId: string; productName: string; quantity: number; unitPrice: number; unitCost: number; isTaxExempt?: boolean; taxRate?: number }[],
      dateOffsetDays = 0,
      skipFiscalInvoice = false,
    ) {
      let ord = await orderRepo.findOne({ 
        where: { tenantId, notes: orderData.notes } 
      });

      const now = new Date();
      const targetDay = Math.max(1, Math.min(28, now.getDate() - (dateOffsetDays % 25)));
      const targetDate = new Date(now.getFullYear(), now.getMonth(), targetDay, 10 + (dateOffsetDays % 8), 15 + ((dateOffsetDays * 7) % 40));

      if (!ord) {
        ord = orderRepo.create({ 
          ...orderData, 
          tenantId,
          createdAt: targetDate,
        });
        ord = await orderRepo.save(ord);
        for (const item of items) {
          const itemExempt = Boolean(item.isTaxExempt);
          const itemRate = itemExempt ? 0 : (item.taxRate ?? 16.0);
          const itemSubtotal = item.quantity * item.unitPrice;
          const itemTax = itemExempt ? 0 : Number(((itemSubtotal * itemRate) / 100).toFixed(2));

          await orderItemRepo.save(orderItemRepo.create({
            orderId: ord.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitCost: item.unitCost,
            subtotal: itemSubtotal,
            isTaxExempt: itemExempt,
            taxRate: itemRate,
            taxAmount: itemTax,
          }));
        }
        console.log(`   ✅ [ORDEN] ${ord.customerName} -> $${ord.totalAmount} (${ord.status})`);
      }

      if (!skipFiscalInvoice) {
        await ensureOrderFiscalInvoice(ord, tenantId, items, dateOffsetDays);
      }

      return ord;
    }

    // =========================================================================
    // 0. USUARIOS Y EQUIPOS DE TRABAJO MULTI-ROL
    // =========================================================================
    console.log('\n👥 Verificando cuentas de usuarios del sistema...');
    // Cuentas Maestras
    let superAdmin = await userRepo.findOne({ where: { role: UserRole.SUPERADMIN } });
    if (!options?.skipSuperAdmin && !superAdmin) {
      superAdmin = await getOrCreateUser('superadmin@finowork.com', 'superadmin', UserRole.SUPERADMIN, 'Super Administrador', superPasswordHash);
      console.log(' ✅ [SUPERADMIN NUEVO] Cuenta maestra creada: superadmin@finowork.com');
    } else if (superAdmin) {
      console.log(` 🛡️ [SUPERADMIN PRESERVADO] Se preservó la cuenta SuperAdmin existente (${superAdmin.email}). No se creó otra.`);
    }
    const promoter = await getOrCreateUser('promotor@finowork.com', 'promotor', UserRole.PROMOTOR, 'Promotor Oficial FinoWork');
    if (promoter.role !== UserRole.PROMOTOR) {
      promoter.role = UserRole.PROMOTOR;
      await userRepo.save(promoter);
      console.log('   🔄 [ROL ACTUALIZADO] promotor@finowork.com actualizado a PROMOTOR');
    }
    const demoAdmin = await getOrCreateUser('admin@finowork.com', 'admin', UserRole.ADMIN, 'Administrador Demo');

    // Cuentas de Especialistas / Roles específicos
    const deliveryUser = await getOrCreateUser('delivery@finowork.com', 'delivery_carlos', UserRole.DELIVERY, 'Carlos Repartidor');
    const delivery2User = await getOrCreateUser('delivery2.burger@finowork.com', 'delivery_javier', UserRole.DELIVERY, 'Javier Repartidor Moto');
    const kitchenUser = await getOrCreateUser('cocina@finowork.com', 'cocina_chef', UserRole.KITCHEN, 'Chef Ramón Cocina');
    const parrilleroUser = await getOrCreateUser('parrillero.burger@finowork.com', 'parrillero_alvaro', UserRole.OPERATIVO, 'Álvaro Maestro Parrillero');
    const cashierUser = await getOrCreateUser('cajero@finowork.com', 'cajero_maria', UserRole.POS, 'María Cajera');
    const meseroUser = await getOrCreateUser('mesero@finowork.com', 'mesero_pedro', UserRole.POS, 'Pedro Capitán de Meseros');
    const mesera2User = await getOrCreateUser('mesera2.burger@finowork.com', 'mesera_lucia', UserRole.POS, 'Lucía Mesonera');
    const specialistUser = await getOrCreateUser('especialista@finowork.com', 'especialista_ana', UserRole.OPERATIVO, 'Dra. Ana Especialista');
    const terapeutaUser = await getOrCreateUser('terapeuta.glow@finowork.com', 'terapeuta_claudia', UserRole.OPERATIVO, 'Claudia Fisioterapeuta');
    const recepcionGlowUser = await getOrCreateUser('recepcion.glow@finowork.com', 'recepcion_camila', UserRole.POS, 'Camila Recepción');
    const panaderoUser = await getOrCreateUser('panadero@finowork.com', 'panadero_luis', UserRole.OPERATIVO, 'Luis Maestro Panadero');
    const pasteleroUser = await getOrCreateUser('pastelero.pan@finowork.com', 'pastelero_gabriel', UserRole.OPERATIVO, 'Gabriel Maestro Pastelero');
    const despachoPanUser = await getOrCreateUser('despacho.pan@finowork.com', 'despacho_rosa', UserRole.POS, 'Rosa Atención & Mostrador');
    const barberoUser = await getOrCreateUser('barbero@finowork.com', 'barbero_victor', UserRole.OPERATIVO, 'Víctor Master Barber');
    const barbero2User = await getOrCreateUser('barbero2.spa@finowork.com', 'barbero_daniel', UserRole.OPERATIVO, 'Daniel Fades & Barbas');
    const manicuristaUser = await getOrCreateUser('manicurista.spa@finowork.com', 'manicurista_sofia', UserRole.OPERATIVO, 'Sofía Especialista Nails');
    const lavadorUser = await getOrCreateUser('lavador@finowork.com', 'lavador_jose', UserRole.OPERATIVO, 'José Lavador Pro');
    const lavador2User = await getOrCreateUser('lavador2.autolavado@finowork.com', 'lavador_miguel', UserRole.OPERATIVO, 'Miguel Detailing & Pulitura');
    const supervisorLavadoUser = await getOrCreateUser('supervisor.autolavado@finowork.com', 'supervisor_fernando', UserRole.OPERATIVO, 'Fernando Supervisor Bahías');
    const asesorBoutiqueUser = await getOrCreateUser('asesor1.boutique@finowork.com', 'asesora_valentina', UserRole.POS, 'Valentina Asesora de Moda');
    const almacenBoutiqueUser = await getOrCreateUser('almacen.boutique@finowork.com', 'almacen_andres', UserRole.OPERATIVO, 'Andrés Encargado Almacén');

    // Registrar perfil de promotor si no existe
    let promoterProfile = await promoterRepo.findOne({ where: { userId: promoter.id } });
    if (!promoterProfile) {
      promoterProfile = promoterRepo.create({
        userId: promoter.id,
        code: 'PROMO-FINO',
        pagoMovilPhone: '04141234567',
        pagoMovilCedula: 'V-12345678',
        pagoMovilBank: '0102 - Banco de Venezuela',
        binancePayId: '123456789',
        isActive: true,
      });
      promoterProfile = await promoterRepo.save(promoterProfile);
      console.log(' ✅ [NUEVO] Perfil de Promotor registrado con código: PROMO-FINO');
    }

    // =========================================================================
    // 1. ESPACIO 1: BOUTIQUE MODA URBANA (demo-retail) -> Tri-Moneda COP + Variantes + Crédito
    // =========================================================================
    console.log('\n🛍️ Espacio 1: Boutique Moda Urbana (demo-retail)...');
    let tenantRetail = await tenantRepo.findOne({ where: [{ referral_code: 'demo-retail' }, { name: 'Boutique Moda Urbana' }] });
    if (!tenantRetail) {
      tenantRetail = await tenantRepo.save(tenantRepo.create({
        name: 'Boutique Moda Urbana',
        referral_code: 'demo-retail',
        status: TenantStatus.ACTIVE,
        plan_type: TenantPlanType.PIONEER,
        base_price: 25.00,
        isActive: true,
        isTest: true,
        promoterId: promoterProfile ? promoterProfile.id : undefined,
      }));
    } else {
      let updated = false;
      if (!tenantRetail.isTest) {
        tenantRetail.isTest = true;
        updated = true;
      }
      if (promoterProfile && tenantRetail.promoterId !== promoterProfile.id) {
        tenantRetail.promoterId = promoterProfile.id;
        updated = true;
      }
      if (updated) {
        tenantRetail = await tenantRepo.save(tenantRetail);
      }
    }
    // Accesos del equipo Boutique
    await linkAccess(promoter.id, tenantRetail.id, UserRole.ADMIN, 'Gerente General', { compensationType: 'FIJO', salaryAmount: 120.0, salaryPeriod: 'SEMANAL', entryTime: '08:30', exitTime: '17:30' });
    await linkAccess(demoAdmin.id, tenantRetail.id, UserRole.ADMIN, 'Administrador', { compensationType: 'FIJO', salaryAmount: 100.0, salaryPeriod: 'SEMANAL', entryTime: '08:30', exitTime: '17:30' });
    await linkAccess(cashierUser.id, tenantRetail.id, UserRole.POS, 'Cajera Principal', { compensationType: 'FIJO', salaryAmount: 50.0, salaryPeriod: 'SEMANAL', entryTime: '08:30', exitTime: '17:30' });
    await linkAccess(asesorBoutiqueUser.id, tenantRetail.id, UserRole.POS, 'Asesora de Moda & Ventas', { compensationType: 'MIXTO', salaryAmount: 35.0, salaryPeriod: 'SEMANAL', commissionPercentage: 5.0, entryTime: '09:00', exitTime: '18:00' });
    await linkAccess(almacenBoutiqueUser.id, tenantRetail.id, UserRole.OPERATIVO, 'Control de Stock & Almacén', { compensationType: 'FIJO', salaryAmount: 45.0, salaryPeriod: 'SEMANAL', entryTime: '08:00', exitTime: '17:00' });

    let settingsRetail = await settingsRepo.findOne({ where: { tenantId: tenantRetail.id } });
    if (!settingsRetail) {
      settingsRetail = settingsRepo.create({
        id: randomUUID(),
        tenantId: tenantRetail.id,
        featureBuySell: true,
        featureCustomerSchedules: false,
        featureRecipes: false,
        featureProduction: false,
        featureShowCatalog: true,
        exchangeRateBs: tasaActual,
        enableCopCurrency: true,
        exchangeRateCop: 4000.0,
        exchangeRateCopMode: 'MANUAL',
        manualExchangeRateCop: 4000.0,
        companyCopBank: 'Bancolombia / Nequi',
        companyCopAccountNumber: '3129876543',
        companyCopAccountHolder: 'Boutique Moda Urbana SAS',
        acceptCashCop: true,
        acceptTransferCop: true,
        allowPartialPayments: true,
        abonoDefaultDueDays: 7,
        themePrimaryColor: '#2563eb',
        themeHeaderColor: '#eff6ff',
        acceptCashUsd: true,
        acceptPagoMovil: true,
        initialCashUSD: 160.00,
        initialBankBs: 180000.00,
        initialDigitalUSD: 50.00,
        initialCashCop: 600000.00,
        featureFiscalSupport: true,
        fiscalDefaultTaxRate: 16.0,
        fiscalRif: 'J-50123456-7',
        fiscalCompanyName: 'Boutique Moda Urbana, C.A.',
        fiscalAddress: 'Av. Las Delicias, Centro Comercial La Cascada, Nivel 1, Local 12, Caracas',
        fiscalPhone: '0414-1112233',
        fiscalMode: 'INTERNAL',
      });
      await settingsRepo.save(settingsRetail);
    } else {
      settingsRetail.enableCopCurrency = true;
      settingsRetail.exchangeRateCop = 4000.0;
      settingsRetail.initialCashUSD = 160.00;
      settingsRetail.initialBankBs = 180000.00;
      settingsRetail.initialDigitalUSD = 50.00;
      settingsRetail.initialCashCop = 600000.00;
      settingsRetail.featureFiscalSupport = true;
      settingsRetail.fiscalDefaultTaxRate = 16.0;
      settingsRetail.fiscalRif = 'J-50123456-7';
      settingsRetail.fiscalCompanyName = 'Boutique Moda Urbana, C.A.';
      settingsRetail.fiscalAddress = 'Av. Las Delicias, Centro Comercial La Cascada, Nivel 1, Local 12, Caracas';
      settingsRetail.fiscalPhone = '0414-1112233';
      settingsRetail.fiscalMode = 'INTERNAL';
      await settingsRepo.save(settingsRetail);
    }

    // Clientes de Boutique
    const cFuentes = await getOrCreateCustomer(tenantRetail.id, { name: 'Elena Fuentes', phone: '0414-1112233', identification: 'V-18456123', totalVisits: 6, notes: 'Clienta VIP con línea de crédito.' });
    const cGomez = await getOrCreateCustomer(tenantRetail.id, { name: 'Santiago Gómez', phone: '0414-9988776', identification: 'V-23456789', totalVisits: 4, notes: 'Paga habitualmente en Pesos Colombianos (COP).' });
    const cCastillo = await getOrCreateCustomer(tenantRetail.id, { name: 'Mariana Castillo', phone: '0412-5544332', identification: 'V-25678901', totalVisits: 3, notes: 'Compra vestidos y accesorios.' });
    const cPena = await getOrCreateCustomer(tenantRetail.id, { name: 'Carlos Eduardo Peña', phone: '0416-3322114', identification: 'V-19876543', totalVisits: 2, notes: 'Prefiere pagar por Pago Móvil Banesco.' });
    const cMorales = await getOrCreateCustomer(tenantRetail.id, { name: 'Gabriela Morales', phone: '0424-7788990', identification: 'V-27123456', totalVisits: 5, notes: 'Clienta frecuente de fin de semana.' });

    // Productos Boutique
    const pJean = await getOrCreateProduct(tenantRetail.id, { name: 'Pantalón Jean Clásico', salePrice: 22.0, cost: 10.0, estimatedCost: 10.0, stock: 20, stockQuantity: 20, physicalStock: 20, category: 'Pantalones', is_service: false, product_type: 'REVENTA', images: ['https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80'] });
    const pVestido = await getOrCreateProduct(tenantRetail.id, { name: 'Vestido Casual Floral', salePrice: 28.0, cost: 12.0, estimatedCost: 12.0, stock: 15, stockQuantity: 15, physicalStock: 15, category: 'Vestidos', is_service: false, product_type: 'REVENTA', images: ['https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&auto=format&fit=crop&q=80'] });
    const pChaqueta = await getOrCreateProduct(tenantRetail.id, { name: 'Chaqueta Denim Vintage', salePrice: 38.0, cost: 18.0, estimatedCost: 18.0, stock: 10, stockQuantity: 10, physicalStock: 10, category: 'Chaquetas', is_service: false, product_type: 'REVENTA', images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80'] });
    const pFranela = await getOrCreateProduct(tenantRetail.id, { name: 'Franela Básica Cuello Redondo', salePrice: 10.0, cost: 4.0, estimatedCost: 4.0, stock: 30, stockQuantity: 30, physicalStock: 30, category: 'Camisetas', is_service: false, product_type: 'REVENTA', images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80'] });
    const pCinturon = await getOrCreateProduct(tenantRetail.id, { name: 'Cinturón de Cuero Genuino', salePrice: 12.0, cost: 4.5, estimatedCost: 4.5, stock: 25, stockQuantity: 25, physicalStock: 25, category: 'Accesorios', is_service: false, product_type: 'REVENTA', images: ['https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=600&auto=format&fit=crop&q=80'] });

    // Producto Estrella con Variantes
    let pCamisa = await productRepo.findOne({ where: { tenantId: tenantRetail.id, name: 'Camisa Oversize Algodón' } });
    if (!pCamisa) {
      pCamisa = await productRepo.save(productRepo.create({
        name: 'Camisa Oversize Algodón',
        salePrice: 15.0,
        cost: 7.0,
        estimatedCost: 7.0,
        stock: 35,
        stockQuantity: 35,
        physicalStock: 35,
        category: 'Camisas',
        is_service: false,
        product_type: 'REVENTA',
        hasVariants: true,
        tenantId: tenantRetail.id,
        images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&auto=format&fit=crop&q=80'],
      }));

      await variantRepo.save([
        variantRepo.create({ productId: pCamisa.id, tenantId: tenantRetail.id, name: 'Blanco / Talla S', sku: 'CAM-WHT-S', stockQuantity: 8, salePrice: 15.0, cost: 7.0, attributes: { color: 'Blanco', talla: 'S' } }),
        variantRepo.create({ productId: pCamisa.id, tenantId: tenantRetail.id, name: 'Blanco / Talla M', sku: 'CAM-WHT-M', stockQuantity: 12, salePrice: 15.0, cost: 7.0, attributes: { color: 'Blanco', talla: 'M' } }),
        variantRepo.create({ productId: pCamisa.id, tenantId: tenantRetail.id, name: 'Negro / Talla M', sku: 'CAM-BLK-M', stockQuantity: 10, salePrice: 16.0, cost: 7.5, attributes: { color: 'Negro', talla: 'M' } }),
        variantRepo.create({ productId: pCamisa.id, tenantId: tenantRetail.id, name: 'Negro / Talla L', sku: 'CAM-BLK-L', stockQuantity: 5, salePrice: 16.0, cost: 7.5, attributes: { color: 'Negro', talla: 'L' } }),
      ]);
    }

    // Gastos y Fondo
    await getOrCreateExpense(tenantRetail.id, { description: 'Base de Apertura en Gaveta (Efectivo)', amount: 80.00, category: 'FONDO_CAJA', paymentMethod: 'CASH_USD' });
    await getOrCreateExpense(tenantRetail.id, { description: 'Servicio de Internet Fibra Óptica', amount: 30.00, category: 'UTILITIES', paymentMethod: 'PAGO_MOVIL' });
    await getOrCreateExpense(tenantRetail.id, { description: 'Bolsas y Empaques Ecológicos', amount: 25.00, category: 'SUPPLIES', paymentMethod: 'CASH_USD' });
    await getOrCreateExpense(tenantRetail.id, { description: 'Quincena Nómina Asesora Valentina', amount: 70.00, category: 'PAYROLL', paymentMethod: 'PAGO_MOVIL' });
    await getOrCreateSalaryAdvance(tenantRetail.id, {
      userId: asesorBoutiqueUser.id,
      amountUSD: 15.00,
      reason: 'Anticipo de nómina solicitado para transporte',
      status: SalaryAdvanceStatus.PENDIENTE,
      paymentMethod: 'CASH',
    });

    // Ventas de Boutique
    await getOrCreateOrder(tenantRetail.id, {
      customerName: cCastillo.name,
      customerPhone: cCastillo.phone,
      customerId: cCastillo.id,
      employeeId: cashierUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'USD',
      usdReceived: 30.00,
      changeAmount: 2.00,
      changeMethod: 'CASH_USD',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 28.00,
      totalCost: 12.00,
      netProfit: 16.00,
      exchangeRate: tasaActual,
      notes: 'Venta de mostrador vestido casual. Pagó $30 billete, vuelto $2 USD.',
    }, [{ productId: pVestido.id, productName: pVestido.name, quantity: 1, unitPrice: 28.00, unitCost: 12.00 }], 1);

    await getOrCreateOrder(tenantRetail.id, {
      customerName: cGomez.name,
      customerPhone: cGomez.phone,
      customerId: cGomez.id,
      employeeId: cashierUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'CASH_COP',
      amountCop: 60000,
      exchangeRateCop: 4000,
      copReceived: 100000,
      changeAmountCop: 40000,
      changeMethod: 'CASH_COP',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 15.00,
      totalCost: 7.00,
      netProfit: 8.00,
      exchangeRate: tasaActual,
      notes: 'Pago en Efectivo Pesos COP: $60.000 COP. Billete $100k, vuelto $40k COP.',
    }, [{ productId: pCamisa.id, productName: 'Camisa Oversize Algodón (Blanco / Talla M)', quantity: 1, unitPrice: 15.00, unitCost: 7.00 }], 3);

    const due5Days = new Date();
    due5Days.setDate(due5Days.getDate() + 5);
    await getOrCreateOrder(tenantRetail.id, {
      customerName: cFuentes.name,
      customerPhone: cFuentes.phone,
      customerId: cFuentes.id,
      employeeId: cashierUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PARTIAL,
      paymentMethod: 'PAGO_MOVIL',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 44.00,
      totalCost: 20.00,
      netProfit: 24.00,
      exchangeRate: tasaActual,
      abonosTotal: 20.00,
      nextAbonoDueDate: due5Days,
      abonosHistory: [{ amount: 20.00, date: new Date().toISOString(), method: 'PAGO_MOVIL', ref: 'PM-99238', notes: 'Abono inicial 45% al retirar' }],
      notes: 'Prendas entregadas bajo abono parcial. Próximo abono acordado en 5 días.',
    }, [{ productId: pJean.id, productName: pJean.name, quantity: 2, unitPrice: 22.00, unitCost: 10.00 }], 5);

    await getOrCreateOrder(tenantRetail.id, {
      customerName: cPena.name,
      customerPhone: cPena.phone,
      customerId: cPena.id,
      employeeId: asesorBoutiqueUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      amountBs: 38.00 * tasaActual,
      pagoMovilRef: 'PM-772109',
      pagoMovilBank: '0134 - Banesco',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 38.00,
      totalCost: 18.00,
      netProfit: 20.00,
      exchangeRate: tasaActual,
      notes: 'Compra de chaqueta denim pagada por Pago Móvil Banesco.',
    }, [{ productId: pChaqueta.id, productName: pChaqueta.name, quantity: 1, unitPrice: 38.00, unitCost: 18.00 }], 7);

    await getOrCreateOrder(tenantRetail.id, {
      customerName: cMorales.name,
      customerPhone: cMorales.phone,
      customerId: cMorales.id,
      employeeId: asesorBoutiqueUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'USD',
      usdReceived: 20.00,
      changeAmount: 8.00,
      changeMethod: 'CASH_USD',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 12.00,
      totalCost: 4.50,
      netProfit: 7.50,
      exchangeRate: tasaActual,
      notes: 'Venta rápida mostrador de cinturón en efectivo.',
    }, [{ productId: pCinturon.id, productName: pCinturon.name, quantity: 1, unitPrice: 12.00, unitCost: 4.50 }], 9);

    await getOrCreateOrder(tenantRetail.id, {
      customerName: cCastillo.name,
      customerPhone: cCastillo.phone,
      customerId: cCastillo.id,
      employeeId: asesorBoutiqueUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      amountBs: 38.00 * tasaActual,
      pagoMovilRef: 'PM-901122',
      pagoMovilBank: '0134 - Banesco',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 38.00,
      totalCost: 16.00,
      netProfit: 22.00,
      exchangeRate: tasaActual,
      notes: 'Combo vestido floral y franela básica pagado por Pago Móvil.',
    }, [
      { productId: pVestido.id, productName: pVestido.name, quantity: 1, unitPrice: 28.00, unitCost: 12.00 },
      { productId: pFranela.id, productName: pFranela.name, quantity: 1, unitPrice: 10.00, unitCost: 4.00 },
    ], 11);

    await getOrCreateOrder(tenantRetail.id, {
      customerName: cGomez.name,
      customerPhone: cGomez.phone,
      customerId: cGomez.id,
      employeeId: cashierUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'CASH_COP',
      amountCop: 152000,
      exchangeRateCop: 4000,
      copReceived: 200000,
      changeAmountCop: 48000,
      changeMethod: 'CASH_COP',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 38.00,
      totalCost: 18.00,
      netProfit: 20.00,
      exchangeRate: tasaActual,
      notes: 'Compra de chaqueta Denim pagada en pesos colombianos. $152.000 COP cobrados.',
    }, [{ productId: pChaqueta.id, productName: pChaqueta.name, quantity: 1, unitPrice: 38.00, unitCost: 18.00 }], 13);

    await getOrCreateOrder(tenantRetail.id, {
      customerName: cFuentes.name,
      customerPhone: cFuentes.phone,
      customerId: cFuentes.id,
      employeeId: asesorBoutiqueUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'USD',
      usdReceived: 20.00,
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 20.00,
      totalCost: 8.00,
      netProfit: 12.00,
      exchangeRate: tasaActual,
      notes: '2 Franelas básicas de algodón pagadas exactas en efectivo divisa.',
    }, [{ productId: pFranela.id, productName: pFranela.name, quantity: 2, unitPrice: 10.00, unitCost: 4.00 }], 16);

    await getOrCreateOrder(tenantRetail.id, {
      customerName: cMorales.name,
      customerPhone: cMorales.phone,
      customerId: cMorales.id,
      employeeId: cashierUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PUNTO',
      amountBs: 22.00 * tasaActual,
      puntoRef: 'POS-11902',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 22.00,
      totalCost: 10.00,
      netProfit: 12.00,
      exchangeRate: tasaActual,
      notes: 'Pantalón Jean clásico pagado con tarjeta de débito en Punto POS.',
    }, [{ productId: pJean.id, productName: pJean.name, quantity: 1, unitPrice: 22.00, unitCost: 10.00 }], 18);

    await getOrCreateOrder(tenantRetail.id, {
      customerName: cPena.name,
      customerPhone: cPena.phone,
      customerId: cPena.id,
      employeeId: asesorBoutiqueUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      amountBs: 15.00 * tasaActual,
      pagoMovilRef: 'PM-445566',
      pagoMovilBank: '0102 - Banco de Venezuela',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 15.00,
      totalCost: 7.00,
      netProfit: 8.00,
      exchangeRate: tasaActual,
      notes: 'Camisa Oversize Algodón blanca pagada por Pago Móvil BDV.',
    }, [{ productId: pCamisa.id, productName: 'Camisa Oversize Algodón (Blanco / Talla M)', quantity: 1, unitPrice: 15.00, unitCost: 7.00 }], 21);

    await getOrCreateOrder(tenantRetail.id, {
      customerName: cCastillo.name,
      customerPhone: cCastillo.phone,
      customerId: cCastillo.id,
      employeeId: cashierUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'USD',
      usdReceived: 50.00,
      changeAmount: 26.00,
      changeMethod: 'CASH_USD',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 24.00,
      totalCost: 9.00,
      netProfit: 15.00,
      exchangeRate: tasaActual,
      notes: '2 cinturones de cuero de regalo. Pagó billete $50, vuelto $26 USD.',
    }, [{ productId: pCinturon.id, productName: pCinturon.name, quantity: 2, unitPrice: 12.00, unitCost: 4.50 }], 24);

    // Simular 1 Nota de Crédito reglamentaria para comprobar el libro de ventas (deducciones y cálculo neto)
    const firstInvoice = await fiscalInvoiceRepo.findOne({ 
      where: { tenantId: tenantRetail.id, documentType: FiscalDocumentType.INVOICE },
      order: { createdAt: 'DESC' }
    });
    if (firstInvoice) {
      await createCreditNoteForInvoice(tenantRetail.id, firstInvoice.id, 'Devolución de prenda por talla no adecuada', 2);
    }

    // =========================================================================
    // 2. ESPACIO 2: PANADERÍA LA ESPIGA (demo-panaderia) -> Producción + Fórmulas
    // =========================================================================
    console.log('\n🥖 Espacio 2: Panadería La Espiga (demo-panaderia)...');
    let tenantPan = await tenantRepo.findOne({ where: [{ referral_code: 'demo-panaderia' }, { name: 'Panadería La Espiga' }] });
    if (!tenantPan) {
      tenantPan = await tenantRepo.save(tenantRepo.create({
        name: 'Panadería La Espiga',
        referral_code: 'demo-panaderia',
        status: TenantStatus.ACTIVE,
        plan_type: TenantPlanType.PIONEER,
        base_price: 25.00,
        isActive: true,
        isTest: true,
        promoterId: promoterProfile ? promoterProfile.id : undefined,
      }));
    } else {
      let updated = false;
      if (!tenantPan.isTest) {
        tenantPan.isTest = true;
        updated = true;
      }
      if (promoterProfile && tenantPan.promoterId !== promoterProfile.id) {
        tenantPan.promoterId = promoterProfile.id;
        updated = true;
      }
      if (updated) {
        tenantPan = await tenantRepo.save(tenantPan);
      }
    }
    // Accesos Panadería
    await linkAccess(promoter.id, tenantPan.id, UserRole.ADMIN, 'Gerente', { compensationType: 'FIJO', salaryAmount: 100.0, salaryPeriod: 'SEMANAL' });
    await linkAccess(demoAdmin.id, tenantPan.id, UserRole.ADMIN, 'Administrador', { compensationType: 'FIJO', salaryAmount: 90.0, salaryPeriod: 'SEMANAL' });
    await linkAccess(panaderoUser.id, tenantPan.id, UserRole.OPERATIVO, 'Jefe de Producción & Panadero', { compensationType: 'FIJO', salaryAmount: 75.0, salaryPeriod: 'SEMANAL', entryTime: '05:00', exitTime: '13:00' });
    await linkAccess(pasteleroUser.id, tenantPan.id, UserRole.OPERATIVO, 'Maestro Pastelero', { compensationType: 'FIJO', salaryAmount: 70.0, salaryPeriod: 'SEMANAL', entryTime: '06:00', exitTime: '14:00' });
    await linkAccess(despachoPanUser.id, tenantPan.id, UserRole.POS, 'Atención Mostrador & Despacho', { compensationType: 'MIXTO', salaryAmount: 35.0, salaryPeriod: 'SEMANAL', commissionPercentage: 3.0, entryTime: '06:30', exitTime: '15:00' });

    let settingsPan = await settingsRepo.findOne({ where: { tenantId: tenantPan.id } });
    if (!settingsPan) {
      settingsPan = settingsRepo.create({
        id: randomUUID(),
        tenantId: tenantPan.id,
        featureBuySell: true,
        featureCustomerSchedules: false,
        featureRecipes: true,
        featureProduction: true,
        featureShowCatalog: true,
        exchangeRateBs: tasaActual,
        themePrimaryColor: '#d97706',
        themeHeaderColor: '#fffbeb',
        acceptCashUsd: true,
        acceptPagoMovil: true,
        initialCashUSD: 140.00,
        initialBankBs: 160000.00,
        featureFiscalSupport: true,
        fiscalDefaultTaxRate: 16.0,
        fiscalRif: 'J-31415926-5',
        fiscalCompanyName: 'Panadería y Pastelería La Espiga, C.A.',
        fiscalAddress: 'Av. Rómulo Gallegos con Calle El Carmen, Edif. La Espiga, Caracas',
        fiscalPhone: '0414-2223344',
        fiscalMode: 'INTERNAL',
      });
      await settingsRepo.save(settingsPan);
    } else {
      settingsPan.initialCashUSD = 140.00;
      settingsPan.initialBankBs = 160000.00;
      settingsPan.featureFiscalSupport = true;
      settingsPan.fiscalDefaultTaxRate = 16.0;
      settingsPan.fiscalRif = 'J-31415926-5';
      settingsPan.fiscalCompanyName = 'Panadería y Pastelería La Espiga, C.A.';
      settingsPan.fiscalAddress = 'Av. Rómulo Gallegos con Calle El Carmen, Edif. La Espiga, Caracas';
      settingsPan.fiscalPhone = '0414-2223344';
      settingsPan.fiscalMode = 'INTERNAL';
      await settingsRepo.save(settingsPan);
    }

    // Insumos
    const panInsumos = [
      { name: 'Harina de Trigo Panadera', unit: 'kg', costPerUnit: 1.2, stockQuantity: 80, minStockAlert: 15 },
      { name: 'Azúcar Refinada', unit: 'kg', costPerUnit: 1.1, stockQuantity: 40, minStockAlert: 8 },
      { name: 'Mantequilla Industrial', unit: 'kg', costPerUnit: 3.5, stockQuantity: 25, minStockAlert: 5 },
      { name: 'Levadura Seca Instantánea', unit: 'kg', costPerUnit: 6.0, stockQuantity: 12, minStockAlert: 3 },
      { name: 'Jamón Ahumado Cocido', unit: 'kg', costPerUnit: 5.5, stockQuantity: 18, minStockAlert: 4 },
      { name: 'Queso Crema Pasteurizado', unit: 'kg', costPerUnit: 4.8, stockQuantity: 15, minStockAlert: 3 },
    ];
    const savedInsumosPan: Record<string, RawMaterial> = {};
    for (const raw of panInsumos) {
      let r = await rawMaterialRepo.findOne({ where: { tenantId: tenantPan.id, name: raw.name } });
      if (!r) {
        r = rawMaterialRepo.create({ ...raw, tenantId: tenantPan.id });
        r = await rawMaterialRepo.save(r);
      }
      savedInsumosPan[raw.name] = r;
    }

    // Productos Panadería
    let panCampesino = await getOrCreateProduct(tenantPan.id, { name: 'Pan Campesino Tradicional', salePrice: 1.5, cost: 0.6, estimatedCost: 0.6, stock: 40, stockQuantity: 40, physicalStock: 40, category: 'Panadería', is_service: false, product_type: 'FORMULA', isTaxExempt: true, taxRate: 0, images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80'] });
    let croissant = await getOrCreateProduct(tenantPan.id, { name: 'Croissant Francés de Mantequilla', salePrice: 2.0, cost: 0.8, estimatedCost: 0.8, stock: 30, stockQuantity: 30, physicalStock: 30, category: 'Bollería', is_service: false, product_type: 'FORMULA', isTaxExempt: false, taxRate: 16.0, images: ['https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80'] });
    let cachito = await getOrCreateProduct(tenantPan.id, { name: 'Cachito Tradicional de Jamón', salePrice: 2.5, cost: 1.1, estimatedCost: 1.1, stock: 25, stockQuantity: 25, physicalStock: 25, category: 'Bollería', is_service: false, product_type: 'FORMULA', isTaxExempt: false, taxRate: 16.0, images: ['https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=600&auto=format&fit=crop&q=80'] });
    let canilla = await getOrCreateProduct(tenantPan.id, { name: 'Pan Canilla Artesanal', salePrice: 1.0, cost: 0.4, estimatedCost: 0.4, stock: 50, stockQuantity: 50, physicalStock: 50, category: 'Panadería', is_service: false, product_type: 'FORMULA', isTaxExempt: true, taxRate: 0, images: ['https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=600&auto=format&fit=crop&q=80'] });
    let tortaChoco = await getOrCreateProduct(tenantPan.id, { name: 'Torta Húmeda de Chocolate', salePrice: 18.0, cost: 7.0, estimatedCost: 7.0, stock: 8, stockQuantity: 8, physicalStock: 8, category: 'Pastelería', is_service: false, product_type: 'FORMULA', isTaxExempt: false, taxRate: 16.0, images: ['https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80'] });
    let cafeEspresso = await getOrCreateProduct(tenantPan.id, { name: 'Café Espresso Doble', salePrice: 1.5, cost: 0.3, estimatedCost: 0.3, stock: 100, stockQuantity: 100, physicalStock: 100, category: 'Cafetería', is_service: true, product_type: 'SERVICIO', isTaxExempt: false, taxRate: 16.0, images: ['https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&auto=format&fit=crop&q=80'] });

    // Clientes Panadería
    const panBenitez = await getOrCreateCustomer(tenantPan.id, { name: 'Sra. Carmen Benítez', phone: '0414-2223344', identification: 'V-11223344', totalVisits: 12, notes: 'Compra pan caliente todas las tardes.' });
    const panRincon = await getOrCreateCustomer(tenantPan.id, { name: 'Restaurante El Rincón', phone: '0416-3334455', identification: 'J-31415926', totalVisits: 8, notes: 'Cliente corporativo con despacho matutino.' });
    const panDelgado = await getOrCreateCustomer(tenantPan.id, { name: 'Marcos Delgado', phone: '0412-4445566', identification: 'V-22334455', totalVisits: 5, notes: 'Prefiere pagar en divisa o Pago Móvil.' });
    const panDuarte = await getOrCreateCustomer(tenantPan.id, { name: 'Lic. Patricia Duarte', phone: '0424-8899002', identification: 'V-19445566', totalVisits: 7, notes: 'Clienta habitual de desayunos y cachitos.' });

    // Gastos y Fondo Panadería
    await getOrCreateExpense(tenantPan.id, { description: 'Base de Caja / Gaveta Panadería', amount: 40.00, category: 'FONDO_CAJA', paymentMethod: 'CASH_USD' });
    await getOrCreateExpense(tenantPan.id, { description: 'Servicio de Gas Industrial Hornos', amount: 20.00, category: 'UTILITIES', paymentMethod: 'CASH_USD' });
    await getOrCreateExpense(tenantPan.id, { description: 'Mantenimiento Preventivo Horno Convector', amount: 35.00, category: 'MAINTENANCE', paymentMethod: 'PAGO_MOVIL' });
    await getOrCreateExpense(tenantPan.id, { description: 'Quincena Nómina Ayudante de Panadería', amount: 60.00, category: 'PAYROLL', paymentMethod: 'PAGO_MOVIL' });
    await getOrCreateSalaryAdvance(tenantPan.id, {
      userId: despachoPanUser.id,
      amountUSD: 10.00,
      reason: 'Adelanto en efectivo para compra de medicinas',
      status: SalaryAdvanceStatus.PENDIENTE,
      paymentMethod: 'CASH',
    });

    // Ventas Panadería
    await getOrCreateOrder(tenantPan.id, {
      customerName: panBenitez.name,
      customerPhone: panBenitez.phone,
      customerId: panBenitez.id,
      employeeId: despachoPanUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'USD',
      usdReceived: 10.00,
      changeAmount: 0,
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 10.00,
      totalCost: 4.00,
      netProfit: 6.00,
      exchangeRate: tasaActual,
      notes: '5 panes campesinos y 1 croissant crujiente.',
    }, [
      { productId: panCampesino.id, productName: panCampesino.name, quantity: 5, unitPrice: 1.5, unitCost: 0.6 },
      { productId: croissant.id, productName: croissant.name, quantity: 1, unitPrice: 2.0, unitCost: 0.8 },
    ]);

    await getOrCreateOrder(tenantPan.id, {
      customerName: panRincon.name,
      customerPhone: panRincon.phone,
      customerId: panRincon.id,
      employeeId: despachoPanUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      amountBs: 30.00 * tasaActual,
      pagoMovilRef: 'PM-883921',
      pagoMovilBank: '0134 - Banesco',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 30.00,
      totalCost: 12.00,
      netProfit: 18.00,
      exchangeRate: tasaActual,
      notes: 'Despacho mayorista de 20 panes campesinos para restaurante.',
    }, [{ productId: panCampesino.id, productName: panCampesino.name, quantity: 20, unitPrice: 1.5, unitCost: 0.6 }]);

    await getOrCreateOrder(tenantPan.id, {
      customerName: panDuarte.name,
      customerPhone: panDuarte.phone,
      customerId: panDuarte.id,
      employeeId: despachoPanUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'USD',
      usdReceived: 10.00,
      changeAmount: 2.00,
      changeMethod: 'CASH_USD',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 8.00,
      totalCost: 3.10,
      netProfit: 4.90,
      exchangeRate: tasaActual,
      notes: '2 cachitos de jamón y 2 cafés dobles espresso.',
    }, [
      { productId: cachito.id, productName: cachito.name, quantity: 2, unitPrice: 2.5, unitCost: 1.1 },
      { productId: cafeEspresso.id, productName: cafeEspresso.name, quantity: 2, unitPrice: 1.5, unitCost: 0.3 },
    ]);

    await getOrCreateOrder(tenantPan.id, {
      customerName: panDelgado.name,
      customerPhone: panDelgado.phone,
      customerId: panDelgado.id,
      employeeId: despachoPanUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'USD',
      usdReceived: 20.00,
      changeAmount: 2.00,
      changeMethod: 'CASH_USD',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 18.00,
      totalCost: 7.00,
      netProfit: 11.00,
      exchangeRate: tasaActual,
      notes: 'Torta húmeda de chocolate para cumpleaños.',
    }, [{ productId: tortaChoco.id, productName: tortaChoco.name, quantity: 1, unitPrice: 18.0, unitCost: 7.0 }]);

    await getOrCreateOrder(tenantPan.id, {
      customerName: panBenitez.name,
      customerPhone: panBenitez.phone,
      customerId: panBenitez.id,
      employeeId: despachoPanUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      amountBs: 25.00 * tasaActual,
      pagoMovilRef: 'PM-223344',
      pagoMovilBank: '0102 - Banco de Venezuela',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 25.00,
      totalCost: 11.00,
      netProfit: 14.00,
      exchangeRate: tasaActual,
      notes: '10 cachitos de jamón para evento matutino pagados por Pago Móvil BDV.',
    }, [{ productId: cachito.id, productName: cachito.name, quantity: 10, unitPrice: 2.5, unitCost: 1.1 }]);

    await getOrCreateOrder(tenantPan.id, {
      customerName: panRincon.name,
      customerPhone: panRincon.phone,
      customerId: panRincon.id,
      employeeId: despachoPanUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      amountBs: 45.00 * tasaActual,
      pagoMovilRef: 'PM-556677',
      pagoMovilBank: '0134 - Banesco',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 45.00,
      totalCost: 18.00,
      netProfit: 27.00,
      exchangeRate: tasaActual,
      notes: '30 panes campesinos despacho al mayor pagado por Pago Móvil Banesco.',
    }, [{ productId: panCampesino.id, productName: panCampesino.name, quantity: 30, unitPrice: 1.5, unitCost: 0.6 }]);

    await getOrCreateOrder(tenantPan.id, {
      customerName: panDuarte.name,
      customerPhone: panDuarte.phone,
      customerId: panDuarte.id,
      employeeId: despachoPanUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'USD',
      usdReceived: 20.00,
      changeAmount: 4.00,
      changeMethod: 'CASH_USD',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 16.00,
      totalCost: 6.00,
      netProfit: 10.00,
      exchangeRate: tasaActual,
      notes: 'Torta húmeda de chocolate familiar pagada en efectivo divisa.',
    }, [{ productId: tortaChoco.id, productName: tortaChoco.name, quantity: 1, unitPrice: 18.0, unitCost: 7.0 }]);

    await getOrCreateOrder(tenantPan.id, {
      customerName: panDelgado.name,
      customerPhone: panDelgado.phone,
      customerId: panDelgado.id,
      employeeId: despachoPanUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PUNTO',
      amountBs: 14.00 * tasaActual,
      puntoRef: 'POS-88912',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 14.00,
      totalCost: 4.40,
      netProfit: 9.60,
      exchangeRate: tasaActual,
      notes: 'Desayuno de 4 croissants y 4 cafés espresso pagado por Punto POS.',
    }, [
      { productId: croissant.id, productName: croissant.name, quantity: 4, unitPrice: 2.0, unitCost: 0.8 },
      { productId: cafeEspresso.id, productName: cafeEspresso.name, quantity: 4, unitPrice: 1.5, unitCost: 0.3 },
    ]);

    // Despacho Corporativo Catering Matutino - Pago Móvil
    await getOrCreateOrder(tenantPan.id, {
      customerName: panRincon.name,
      customerPhone: panRincon.phone,
      customerId: panRincon.id,
      employeeId: despachoPanUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      amountBs: 112.50 * tasaActual,
      pagoMovilRef: 'PM-882299',
      pagoMovilBank: '0134 - Banesco',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 112.50,
      totalCost: 42.50,
      netProfit: 70.00,
      exchangeRate: tasaActual,
      notes: 'Catering corporativo: 20 cachitos + 20 croissants + 15 cafés espresso.',
    }, [
      { productId: cachito.id, productName: cachito.name, quantity: 20, unitPrice: 2.50, unitCost: 1.10 },
      { productId: croissant.id, productName: croissant.name, quantity: 20, unitPrice: 2.00, unitCost: 0.80 },
      { productId: cafeEspresso.id, productName: cafeEspresso.name, quantity: 15, unitPrice: 1.50, unitCost: 0.30 },
    ]);

    // Evento Familiar Tortas y Bollería - Efectivo USD
    await getOrCreateOrder(tenantPan.id, {
      customerName: panDuarte.name,
      customerPhone: panDuarte.phone,
      customerId: panDuarte.id,
      employeeId: despachoPanUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'USD',
      usdReceived: 70.00,
      changeAmount: 4.00,
      changeMethod: 'CASH_USD',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 66.00,
      totalCost: 26.00,
      netProfit: 40.00,
      exchangeRate: tasaActual,
      notes: '2 tortas de chocolate familiares y 15 croissants para reunión.',
    }, [
      { productId: tortaChoco.id, productName: tortaChoco.name, quantity: 2, unitPrice: 18.00, unitCost: 7.00 },
      { productId: croissant.id, productName: croissant.name, quantity: 15, unitPrice: 2.00, unitCost: 0.80 },
    ], 23);

    // Simular 1 Nota de Crédito reglamentaria para comprobar el libro de ventas (deducciones y cálculo neto)
    const firstPanInvoice = await fiscalInvoiceRepo.findOne({ 
      where: { tenantId: tenantPan.id, documentType: FiscalDocumentType.INVOICE },
      order: { createdAt: 'DESC' }
    });
    if (firstPanInvoice) {
      await createCreditNoteForInvoice(tenantPan.id, firstPanInvoice.id, 'Ajuste de despacho por rotura de empaque', 3);
    }

    // =========================================================================
    // 3. ESPACIO 3: BARBERÍA & SPA ÉLITE (demo-servicios) -> Citas con Agenda + Turnos
    // =========================================================================
    console.log('\n💇 Espacio 3: Barbería & Spa Élite (demo-servicios)...');
    let tenantSpa = await tenantRepo.findOne({ where: [{ referral_code: 'demo-servicios' }, { name: 'Barbería & Spa Élite' }] });
    if (!tenantSpa) {
      tenantSpa = await tenantRepo.save(tenantRepo.create({
        name: 'Barbería & Spa Élite',
        referral_code: 'demo-servicios',
        status: TenantStatus.ACTIVE,
        plan_type: TenantPlanType.PIONEER,
        base_price: 25.00,
        isActive: true,
        isTest: true,
        promoterId: promoterProfile ? promoterProfile.id : undefined,
      }));
    } else {
      let updated = false;
      if (!tenantSpa.isTest) {
        tenantSpa.isTest = true;
        updated = true;
      }
      if (promoterProfile && tenantSpa.promoterId !== promoterProfile.id) {
        tenantSpa.promoterId = promoterProfile.id;
        updated = true;
      }
      if (updated) {
        tenantSpa = await tenantRepo.save(tenantSpa);
      }
    }
    // Accesos Barbería & Spa
    await linkAccess(promoter.id, tenantSpa.id, UserRole.ADMIN, 'Gerente', { compensationType: 'FIJO', salaryAmount: 100.0, salaryPeriod: 'SEMANAL' });
    await linkAccess(demoAdmin.id, tenantSpa.id, UserRole.ADMIN, 'Administrador', { compensationType: 'FIJO', salaryAmount: 90.0, salaryPeriod: 'SEMANAL' });
    await linkAccess(barberoUser.id, tenantSpa.id, UserRole.OPERATIVO, 'Master Barber', { compensationType: 'COMISION', commissionPercentage: 50.0, entryTime: '09:00', exitTime: '19:00' });
    await linkAccess(barbero2User.id, tenantSpa.id, UserRole.OPERATIVO, 'Especialista Fades & Barbas', { compensationType: 'COMISION', commissionPercentage: 45.0, entryTime: '09:00', exitTime: '19:00' });
    await linkAccess(manicuristaUser.id, tenantSpa.id, UserRole.OPERATIVO, 'Especialista Manicura & Spa', { compensationType: 'MIXTO', salaryAmount: 30.0, salaryPeriod: 'SEMANAL', commissionPercentage: 35.0, entryTime: '10:00', exitTime: '19:00' });

    let settingsSpa = await settingsRepo.findOne({ where: { tenantId: tenantSpa.id } });
    if (!settingsSpa) {
      settingsSpa = settingsRepo.create({
        id: randomUUID(),
        tenantId: tenantSpa.id,
        featureCustomerSchedules: true,
        featureRecipes: false,
        featureBuySell: true,
        featureProduction: false,
        featureShowCatalog: true,
        exchangeRateBs: tasaActual,
        themePrimaryColor: '#db2777',
        themeHeaderColor: '#fdf2f8',
        bookingRequireService: true,
        bookingAllowStaffSelection: true,
        slotInterval: 30,
        initialCashUSD: 100.00,
        initialBankBs: 140000.00,
        acceptCashUsd: true,
        acceptPagoMovil: true,
        featureFiscalSupport: true,
        fiscalDefaultTaxRate: 16.0,
        fiscalRif: 'J-40987654-3',
        fiscalCompanyName: 'Barbería y Estilo El Máster, C.A.',
        fiscalAddress: 'Calle San Ignacio, Local 4, Chacao, Caracas',
        fiscalPhone: '0412-8877665',
        fiscalMode: 'INTERNAL',
        businessHours: {
          '1': { isOpen: true, startTime: '09:00', endTime: '19:00' },
          '2': { isOpen: true, startTime: '09:00', endTime: '19:00' },
          '3': { isOpen: true, startTime: '09:00', endTime: '19:00' },
          '4': { isOpen: true, startTime: '09:00', endTime: '19:00' },
          '5': { isOpen: true, startTime: '09:00', endTime: '20:00' },
          '6': { isOpen: true, startTime: '09:00', endTime: '20:00' },
          '0': { isOpen: false, startTime: '09:00', endTime: '14:00' },
        },
      });
      await settingsRepo.save(settingsSpa);
    } else {
      settingsSpa.initialCashUSD = 100.00;
      settingsSpa.initialBankBs = 140000.00;
      settingsSpa.acceptCashUsd = true;
      settingsSpa.acceptPagoMovil = true;
      settingsSpa.featureFiscalSupport = true;
      settingsSpa.fiscalDefaultTaxRate = 16.0;
      settingsSpa.fiscalRif = 'J-40987654-3';
      settingsSpa.fiscalCompanyName = 'Barbería y Estilo El Máster, C.A.';
      settingsSpa.fiscalAddress = 'Calle San Ignacio, Local 4, Chacao, Caracas';
      settingsSpa.fiscalPhone = '0412-8877665';
      settingsSpa.fiscalMode = 'INTERNAL';
      await settingsRepo.save(settingsSpa);
    }

    // Clientes Barbería
    const bMorales = await getOrCreateCustomer(tenantSpa.id, { name: 'Alejandro Morales', phone: '0412-3334455', identification: 'V-20123987', totalVisits: 6, notes: 'Cliente frecuente, fade bajo y perfilado de cejas.' });
    const bColmenares = await getOrCreateCustomer(tenantSpa.id, { name: 'Javier Colmenares', phone: '0414-5566778', identification: 'V-24112233', totalVisits: 4, notes: 'Corte y afeitado tradicional con navaja.' });
    const bHenriquez = await getOrCreateCustomer(tenantSpa.id, { name: 'Mauricio Henríquez', phone: '0424-6677889', identification: 'V-17890123', totalVisits: 5, notes: 'Limpieza facial y vapor de ozono mensual.' });
    const bBriceno = await getOrCreateCustomer(tenantSpa.id, { name: 'Andrea Briceño', phone: '0412-1122334', identification: 'V-21987654', totalVisits: 3, notes: 'Manicura rusa y spa de manos.' });

    // Servicios & Productos Barbería
    const sCorte = await getOrCreateProduct(tenantSpa.id, { name: 'Corte Degradado & Barba', salePrice: 10.0, cost: 1.0, estimatedCost: 1.0, durationMinutes: 45, category: 'Barbería', is_service: true, product_type: 'SERVICIO', images: ['https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&auto=format&fit=crop&q=80'] });
    const sFacial = await getOrCreateProduct(tenantSpa.id, { name: 'Limpieza Facial Profunda & Mascarilla Negra', salePrice: 18.0, cost: 3.0, estimatedCost: 3.0, durationMinutes: 60, category: 'Faciales', is_service: true, product_type: 'SERVICIO', images: ['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&auto=format&fit=crop&q=80'] });
    const sAfeitado = await getOrCreateProduct(tenantSpa.id, { name: 'Afeitado Clásico Toalla Caliente', salePrice: 7.0, cost: 0.8, estimatedCost: 0.8, durationMinutes: 30, category: 'Barbería', is_service: true, product_type: 'SERVICIO', images: ['https://images.unsplash.com/photo-1517832606299-7ae9b720a186?w=600&auto=format&fit=crop&q=80'] });
    const sManicura = await getOrCreateProduct(tenantSpa.id, { name: 'Manicura Rusa & Esmaltado', salePrice: 14.0, cost: 2.5, estimatedCost: 2.5, durationMinutes: 50, category: 'Estética', is_service: true, product_type: 'SERVICIO', images: ['https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&auto=format&fit=crop&q=80'] });
    const pPomada = await getOrCreateProduct(tenantSpa.id, { name: 'Pomada Fijadora Mate Arcilla 100g', salePrice: 12.0, cost: 5.0, estimatedCost: 5.0, stock: 15, stockQuantity: 15, physicalStock: 15, category: 'Productos', is_service: false, product_type: 'REVENTA', images: ['https://images.unsplash.com/photo-1597854710119-a5a8fc52c28d?w=600&auto=format&fit=crop&q=80'] });
    const pAceite = await getOrCreateProduct(tenantSpa.id, { name: 'Aceite Nutritivo Barba con Gotero', salePrice: 9.0, cost: 3.5, estimatedCost: 3.5, stock: 12, stockQuantity: 12, physicalStock: 12, category: 'Productos', is_service: false, product_type: 'REVENTA', images: ['https://images.unsplash.com/photo-1621607512214-68297480165e?w=600&auto=format&fit=crop&q=80'] });

    // Gastos y Fondo Barbería
    await getOrCreateExpense(tenantSpa.id, { description: 'Base de Apertura en Barbería', amount: 30.00, category: 'FONDO_CAJA', paymentMethod: 'CASH_USD' });
    await getOrCreateExpense(tenantSpa.id, { description: 'Cuchillas, Toallas Desechables y Aftershave', amount: 20.00, category: 'SUPPLIES', paymentMethod: 'CASH_USD' });
    await getOrCreateExpense(tenantSpa.id, { description: 'Comisión / Nómina Semanal Barbero Daniel', amount: 40.00, category: 'PAYROLL', paymentMethod: 'PAGO_MOVIL' });
    await getOrCreateSalaryAdvance(tenantSpa.id, {
      userId: barberoUser.id,
      amountUSD: 10.00,
      reason: 'Adelanto para compra de cuchillas y desinfectante de máquina',
      status: SalaryAdvanceStatus.PENDIENTE,
      paymentMethod: 'CASH',
    });

    // Citas Agendadas Barbería
    await getOrCreateReservation(tenantSpa.id, {
      customerName: bMorales.name,
      customerPhone: bMorales.phone,
      customerId: bMorales.id,
      date: todayIso,
      time: '10:00',
      durationMinutes: 45,
      serviceId: sCorte.id,
      serviceName: sCorte.name,
      employeeId: barberoUser.id,
      employeeName: 'Víctor Master Barber',
      status: ReservationStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      totalAmount: 10.00,
      notes: 'Corte y barba completado y cobrado.',
    });

    await getOrCreateReservation(tenantSpa.id, {
      customerName: bHenriquez.name,
      customerPhone: bHenriquez.phone,
      customerId: bHenriquez.id,
      date: todayIso,
      time: '14:30',
      durationMinutes: 60,
      serviceId: sFacial.id,
      serviceName: sFacial.name,
      employeeId: barberoUser.id,
      employeeName: 'Víctor Master Barber',
      status: ReservationStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      totalAmount: 18.00,
      notes: 'Cita de limpieza facial confirmada para hoy.',
    });

    await getOrCreateReservation(tenantSpa.id, {
      customerName: bColmenares.name,
      customerPhone: bColmenares.phone,
      customerId: bColmenares.id,
      date: todayIso,
      time: '16:30',
      durationMinutes: 45,
      serviceId: sCorte.id,
      serviceName: sCorte.name,
      employeeId: barbero2User.id,
      employeeName: 'Daniel Fades & Barbas',
      status: ReservationStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      totalAmount: 10.00,
      notes: 'Cita con Daniel completada y cobrada.',
    });

    await getOrCreateReservation(tenantSpa.id, {
      customerName: 'Mariana Castillo',
      customerPhone: '0412-5544332',
      date: todayIso,
      time: '12:00',
      durationMinutes: 50,
      serviceId: sManicura.id,
      serviceName: sManicura.name,
      employeeId: manicuristaUser.id,
      employeeName: 'Sofía Especialista Nails',
      status: ReservationStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      totalAmount: 14.00,
      notes: 'Manicura rusa completada y cobrada.',
    });

    await getOrCreateReservation(tenantSpa.id, {
      customerName: bBriceno.name,
      customerPhone: bBriceno.phone,
      customerId: bBriceno.id,
      date: tomorrowIso,
      time: '11:00',
      durationMinutes: 50,
      serviceId: sManicura.id,
      serviceName: sManicura.name,
      employeeId: manicuristaUser.id,
      employeeName: 'Sofía Especialista Nails',
      status: ReservationStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PENDING,
      totalAmount: 14.00,
      notes: 'Manicura rusa agendada para mañana.',
    });

    // Ventas de Mostrador Barbería
    await getOrCreateOrder(tenantSpa.id, {
      customerName: bMorales.name,
      customerPhone: bMorales.phone,
      customerId: bMorales.id,
      employeeId: barberoUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'USD',
      usdReceived: 25.00,
      changeAmount: 3.00,
      changeMethod: 'CASH_USD',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 22.00,
      totalCost: 6.00,
      netProfit: 16.00,
      exchangeRate: tasaActual,
      notes: 'Corte Degradado + Pomada Mate Arcilla pagados en efectivo.',
    }, [
      { productId: sCorte.id, productName: sCorte.name, quantity: 1, unitPrice: 10.00, unitCost: 1.00 },
      { productId: pPomada.id, productName: pPomada.name, quantity: 1, unitPrice: 12.00, unitCost: 5.00 },
    ]);

    await getOrCreateOrder(tenantSpa.id, {
      customerName: bHenriquez.name,
      customerPhone: bHenriquez.phone,
      customerId: bHenriquez.id,
      employeeId: barberoUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      amountBs: 18.00 * tasaActual,
      pagoMovilRef: 'PM-904321',
      pagoMovilBank: '0102 - Banco de Venezuela',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 18.00,
      totalCost: 3.00,
      netProfit: 15.00,
      exchangeRate: tasaActual,
      notes: 'Limpieza facial profunda pagada por Pago Móvil BDV.',
    }, [{ productId: sFacial.id, productName: sFacial.name, quantity: 1, unitPrice: 18.00, unitCost: 3.00 }]);

    await getOrCreateOrder(tenantSpa.id, {
      customerName: bColmenares.name,
      customerPhone: bColmenares.phone,
      customerId: bColmenares.id,
      employeeId: barberoUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      amountBs: 17.00 * tasaActual,
      pagoMovilRef: 'PM-778899',
      pagoMovilBank: '0134 - Banesco',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 17.00,
      totalCost: 1.80,
      netProfit: 15.20,
      exchangeRate: tasaActual,
      notes: 'Corte degradado con barba y afeitado tradicional con toalla caliente.',
    }, [
      { productId: sCorte.id, productName: sCorte.name, quantity: 1, unitPrice: 10.00, unitCost: 1.00 },
      { productId: sAfeitado.id, productName: sAfeitado.name, quantity: 1, unitPrice: 7.00, unitCost: 0.80 },
    ]);

    await getOrCreateOrder(tenantSpa.id, {
      customerName: bBriceno.name,
      customerPhone: bBriceno.phone,
      customerId: bBriceno.id,
      employeeId: manicuristaUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'USD',
      usdReceived: 20.00,
      changeAmount: 6.00,
      changeMethod: 'CASH_USD',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 14.00,
      totalCost: 2.50,
      netProfit: 11.50,
      exchangeRate: tasaActual,
      notes: 'Manicura rusa y esmaltado semipermanente pagado en efectivo.',
    }, [{ productId: sManicura.id, productName: sManicura.name, quantity: 1, unitPrice: 14.00, unitCost: 2.50 }]);

    await getOrCreateOrder(tenantSpa.id, {
      customerName: bHenriquez.name,
      customerPhone: bHenriquez.phone,
      customerId: bHenriquez.id,
      employeeId: barbero2User.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PUNTO',
      amountBs: 10.00 * tasaActual,
      puntoRef: 'POS-90123',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 10.00,
      totalCost: 1.00,
      netProfit: 9.00,
      exchangeRate: tasaActual,
      notes: 'Corte degradado fade pagado por Punto POS.',
    }, [{ productId: sCorte.id, productName: sCorte.name, quantity: 1, unitPrice: 10.00, unitCost: 1.00 }]);

    // =========================================================================
    // 4. ESPACIO 4: AUTO LAVADO EXPRESS (demo-autolavado) -> Servicios Rápidos
    // =========================================================================
    console.log('\n🚗 Espacio 4: Auto Lavado Express (demo-autolavado)...');
    let tenantLavado = await tenantRepo.findOne({ where: [{ referral_code: 'demo-autolavado' }, { name: 'Auto Lavado Express' }] });
    if (!tenantLavado) {
      tenantLavado = await tenantRepo.save(tenantRepo.create({
        name: 'Auto Lavado Express',
        referral_code: 'demo-autolavado',
        status: TenantStatus.ACTIVE,
        plan_type: TenantPlanType.PIONEER,
        base_price: 25.00,
        isActive: true,
        isTest: true,
        promoterId: promoterProfile ? promoterProfile.id : undefined,
      }));
    } else {
      let updated = false;
      if (!tenantLavado.isTest) {
        tenantLavado.isTest = true;
        updated = true;
      }
      if (promoterProfile && tenantLavado.promoterId !== promoterProfile.id) {
        tenantLavado.promoterId = promoterProfile.id;
        updated = true;
      }
      if (updated) {
        tenantLavado = await tenantRepo.save(tenantLavado);
      }
    }
    // Accesos Auto Lavado
    await linkAccess(promoter.id, tenantLavado.id, UserRole.ADMIN, 'Gerente', { compensationType: 'FIJO', salaryAmount: 100.0, salaryPeriod: 'SEMANAL' });
    await linkAccess(demoAdmin.id, tenantLavado.id, UserRole.ADMIN, 'Administrador', { compensationType: 'FIJO', salaryAmount: 85.0, salaryPeriod: 'SEMANAL' });
    await linkAccess(lavadorUser.id, tenantLavado.id, UserRole.OPERATIVO, 'Lavador Principal', { compensationType: 'COMISION', commissionPercentage: 40.0, entryTime: '08:00', exitTime: '18:00' });
    await linkAccess(lavador2User.id, tenantLavado.id, UserRole.OPERATIVO, 'Detailing & Pulitura', { compensationType: 'MIXTO', salaryAmount: 30.0, salaryPeriod: 'SEMANAL', commissionPercentage: 30.0, entryTime: '08:00', exitTime: '18:00' });
    await linkAccess(supervisorLavadoUser.id, tenantLavado.id, UserRole.OPERATIVO, 'Supervisor de Bahías', { compensationType: 'FIJO', salaryAmount: 70.0, salaryPeriod: 'SEMANAL', entryTime: '07:30', exitTime: '18:30' });

    let settingsLavado = await settingsRepo.findOne({ where: { tenantId: tenantLavado.id } });
    if (!settingsLavado) {
      settingsLavado = settingsRepo.create({
        id: randomUUID(),
        tenantId: tenantLavado.id,
        featureCustomerSchedules: false,
        featureRecipes: false,
        featureBuySell: true,
        featureProduction: false,
        featureShowCatalog: true,
        exchangeRateBs: tasaActual,
        themePrimaryColor: '#0284c7',
        themeHeaderColor: '#f0f9ff',
        acceptCashUsd: true,
        acceptPagoMovil: true,
        initialCashUSD: 100.00,
        initialBankBs: 140000.00,
        featureFiscalSupport: true,
        fiscalDefaultTaxRate: 16.0,
        fiscalRif: 'J-41122334-9',
        fiscalCompanyName: 'Autolavado y Detailing Express Pro, C.A.',
        fiscalAddress: 'Av. Francisco de Miranda, Estación de Servicio El Rosal, Caracas',
        fiscalPhone: '0416-5544332',
        fiscalMode: 'INTERNAL',
      });
      await settingsRepo.save(settingsLavado);
    } else {
      settingsLavado.initialCashUSD = 100.00;
      settingsLavado.initialBankBs = 140000.00;
      settingsLavado.featureFiscalSupport = true;
      settingsLavado.fiscalDefaultTaxRate = 16.0;
      settingsLavado.fiscalRif = 'J-41122334-9';
      settingsLavado.fiscalCompanyName = 'Autolavado y Detailing Express Pro, C.A.';
      settingsLavado.fiscalAddress = 'Av. Francisco de Miranda, Estación de Servicio El Rosal, Caracas';
      settingsLavado.fiscalPhone = '0416-5544332';
      settingsLavado.fiscalMode = 'INTERNAL';
      await settingsRepo.save(settingsLavado);
    }

    // Clientes Auto Lavado
    const lMendez = await getOrCreateCustomer(tenantLavado.id, { name: 'Ricardo Méndez', phone: '0414-8899001', identification: 'V-14234567', totalVisits: 8, notes: 'Toyota Hilux Placa A45BB01. Lavado chasis y cera.' });
    const lVelasquez = await getOrCreateCustomer(tenantLavado.id, { name: 'Dr. Gustavo Velásquez', phone: '0412-7788990', identification: 'V-12987654', totalVisits: 5, notes: 'Ford Explorer Placa AF120CD. Pulitura 3M periódica.' });
    const lValera = await getOrCreateCustomer(tenantLavado.id, { name: 'Karina Valera', phone: '0424-3344556', identification: 'V-25443322', totalVisits: 3, notes: 'Chevrolet Spark Placa AC778EE.' });
    const lLugo = await getOrCreateCustomer(tenantLavado.id, { name: 'Ing. Marcos Lugo', phone: '0414-1122334', identification: 'V-18556677', totalVisits: 4, notes: 'Mitsubishi Montero Placa AH892BB.' });

    // Servicios & Productos Auto Lavado
    const sCamioneta = await getOrCreateProduct(tenantLavado.id, { name: 'Lavado Completo Camioneta', salePrice: 12.0, cost: 2.0, estimatedCost: 2.0, category: 'Lavado', is_service: true, product_type: 'SERVICIO', images: ['https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=600&auto=format&fit=crop&q=80'] });
    const sSedan = await getOrCreateProduct(tenantLavado.id, { name: 'Lavado Sencillo Sedan', salePrice: 7.0, cost: 1.2, estimatedCost: 1.2, category: 'Lavado', is_service: true, product_type: 'SERVICIO', images: ['https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=600&auto=format&fit=crop&q=80'] });
    const sMotor = await getOrCreateProduct(tenantLavado.id, { name: 'Lavado de Motor & Chasis a Vapor', salePrice: 15.0, cost: 3.0, estimatedCost: 3.0, category: 'Especiales', is_service: true, product_type: 'SERVICIO', images: ['https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600&auto=format&fit=crop&q=80'] });
    const sPulitura = await getOrCreateProduct(tenantLavado.id, { name: 'Pulitura y Encerado 3M Orbital', salePrice: 35.0, cost: 8.0, estimatedCost: 8.0, category: 'Detailing', is_service: true, product_type: 'SERVICIO', images: ['https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=600&auto=format&fit=crop&q=80'] });
    const sTapiceria = await getOrCreateProduct(tenantLavado.id, { name: 'Lavado y Desinfección de Tapicería a Vapor', salePrice: 25.0, cost: 4.0, estimatedCost: 4.0, category: 'Especiales', is_service: true, product_type: 'SERVICIO', images: ['https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&auto=format&fit=crop&q=80'] });
    const pAroma = await getOrCreateProduct(tenantLavado.id, { name: 'Aromatizante Little Trees Black Ice', salePrice: 3.0, cost: 1.2, estimatedCost: 1.2, stock: 40, stockQuantity: 40, physicalStock: 40, category: 'Accesorios', is_service: false, product_type: 'REVENTA', images: ['https://images.unsplash.com/photo-1616423640778-28d1b53229bd?w=600&auto=format&fit=crop&q=80'] });

    // Gastos y Fondo Auto Lavado
    await getOrCreateExpense(tenantLavado.id, { description: 'Base de Apertura en Patio', amount: 35.00, category: 'FONDO_CAJA', paymentMethod: 'CASH_USD' });
    await getOrCreateExpense(tenantLavado.id, { description: 'Detergente Espumógeno y Desengrasante Motor', amount: 25.00, category: 'SUPPLIES', paymentMethod: 'CASH_USD' });
    await getOrCreateExpense(tenantLavado.id, { description: 'Quincena Nómina Lavador Miguel', amount: 50.00, category: 'PAYROLL', paymentMethod: 'PAGO_MOVIL' });
    await getOrCreateSalaryAdvance(tenantLavado.id, {
      userId: lavadorUser.id,
      amountUSD: 12.00,
      reason: 'Vale de caja para gastos personales de fin de semana',
      status: SalaryAdvanceStatus.PENDIENTE,
      paymentMethod: 'CASH',
    });

    // Ventas Auto Lavado
    await getOrCreateOrder(tenantLavado.id, {
      customerName: lMendez.name,
      customerPhone: lMendez.phone,
      customerId: lMendez.id,
      employeeId: lavadorUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'USD',
      usdReceived: 20.00,
      changeAmount: 8.00,
      changeMethod: 'CASH_USD',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 12.00,
      totalCost: 2.00,
      netProfit: 10.00,
      exchangeRate: tasaActual,
      notes: 'Lavado completo Hilux con aspirado y cera express.',
    }, [{ productId: sCamioneta.id, productName: sCamioneta.name, quantity: 1, unitPrice: 12.00, unitCost: 2.00 }]);

    await getOrCreateOrder(tenantLavado.id, {
      customerName: lValera.name,
      customerPhone: lValera.phone,
      customerId: lValera.id,
      employeeId: lavadorUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      amountBs: 7.00 * tasaActual,
      pagoMovilRef: 'PM-332145',
      pagoMovilBank: '0134 - Banesco',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 7.00,
      totalCost: 1.20,
      netProfit: 5.80,
      exchangeRate: tasaActual,
      notes: 'Lavado sencillo carro Sedan Spark.',
    }, [{ productId: sSedan.id, productName: sSedan.name, quantity: 1, unitPrice: 7.00, unitCost: 1.20 }]);

    await getOrCreateOrder(tenantLavado.id, {
      customerName: lLugo.name,
      customerPhone: lLugo.phone,
      customerId: lLugo.id,
      employeeId: supervisorLavadoUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'USD',
      usdReceived: 20.00,
      changeAmount: 5.00,
      changeMethod: 'CASH_USD',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 15.00,
      totalCost: 3.00,
      netProfit: 12.00,
      exchangeRate: tasaActual,
      notes: 'Lavado a vapor de motor y chasis de Montero.',
    }, [{ productId: sMotor.id, productName: sMotor.name, quantity: 1, unitPrice: 15.00, unitCost: 3.00 }]);

    await getOrCreateOrder(tenantLavado.id, {
      customerName: lVelasquez.name,
      customerPhone: lVelasquez.phone,
      customerId: lVelasquez.id,
      employeeId: lavador2User.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      amountBs: 38.00 * tasaActual,
      pagoMovilRef: 'PM-456789',
      pagoMovilBank: '0102 - Banco de Venezuela',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 38.00,
      totalCost: 9.20,
      netProfit: 28.80,
      exchangeRate: tasaActual,
      notes: 'Pulitura orbital 3M + aromatizante Black Ice para Ford Explorer.',
    }, [
      { productId: sPulitura.id, productName: sPulitura.name, quantity: 1, unitPrice: 35.00, unitCost: 8.00 },
      { productId: pAroma.id, productName: pAroma.name, quantity: 1, unitPrice: 3.00, unitCost: 1.20 },
    ]);

    await getOrCreateOrder(tenantLavado.id, {
      customerName: lMendez.name,
      customerPhone: lMendez.phone,
      customerId: lMendez.id,
      employeeId: lavadorUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'USD',
      usdReceived: 20.00,
      changeAmount: 8.00,
      changeMethod: 'CASH_USD',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 12.00,
      totalCost: 2.50,
      netProfit: 9.50,
      exchangeRate: tasaActual,
      notes: 'Lavado completo de camioneta Hilux con cera líquida.',
    }, [{ productId: sCamioneta.id, productName: sCamioneta.name, quantity: 1, unitPrice: 12.00, unitCost: 2.50 }]);

    await getOrCreateOrder(tenantLavado.id, {
      customerName: lValera.name,
      customerPhone: lValera.phone,
      customerId: lValera.id,
      employeeId: lavadorUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      amountBs: 10.00 * tasaActual,
      pagoMovilRef: 'PM-990011',
      pagoMovilBank: '0102 - Banco de Venezuela',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 10.00,
      totalCost: 2.40,
      netProfit: 7.60,
      exchangeRate: tasaActual,
      notes: 'Lavado sencillo Sedan + aromatizante Black Ice.',
    }, [
      { productId: sSedan.id, productName: sSedan.name, quantity: 1, unitPrice: 7.00, unitCost: 1.20 },
      { productId: pAroma.id, productName: pAroma.name, quantity: 1, unitPrice: 3.00, unitCost: 1.20 },
    ]);

    await getOrCreateOrder(tenantLavado.id, {
      customerName: lMendez.name,
      customerPhone: lMendez.phone,
      customerId: lMendez.id,
      employeeId: supervisorLavadoUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      amountBs: 15.00 * tasaActual,
      pagoMovilRef: 'PM-331122',
      pagoMovilBank: '0134 - Banesco',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 15.00,
      totalCost: 3.00,
      netProfit: 12.00,
      exchangeRate: tasaActual,
      notes: 'Lavado a vapor de motor y chasis.',
    }, [{ productId: sMotor.id, productName: sMotor.name, quantity: 1, unitPrice: 15.00, unitCost: 3.00 }]);

    // Servicio Detailing Completo (Tapicería + Motor) - Pago Móvil
    await getOrCreateOrder(tenantLavado.id, {
      customerName: lVelasquez.name,
      customerPhone: lVelasquez.phone,
      customerId: lVelasquez.id,
      employeeId: supervisorLavadoUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      amountBs: 40.00 * tasaActual,
      pagoMovilRef: 'PM-776655',
      pagoMovilBank: '0134 - Banesco',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 40.00,
      totalCost: 7.00,
      netProfit: 33.00,
      exchangeRate: tasaActual,
      notes: 'Limpieza profunda de tapicería a vapor y lavado de motor.',
    }, [
      { productId: sTapiceria.id, productName: sTapiceria.name, quantity: 1, unitPrice: 25.00, unitCost: 4.00 },
      { productId: sMotor.id, productName: sMotor.name, quantity: 1, unitPrice: 15.00, unitCost: 3.00 },
    ]);

    // Pulitura 3M y Lavado General Camioneta - Efectivo USD
    await getOrCreateOrder(tenantLavado.id, {
      customerName: lMendez.name,
      customerPhone: lMendez.phone,
      customerId: lMendez.id,
      employeeId: lavador2User.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'USD',
      usdReceived: 50.00,
      changeAmount: 3.00,
      changeMethod: 'CASH_USD',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 47.00,
      totalCost: 10.50,
      netProfit: 36.50,
      exchangeRate: tasaActual,
      notes: 'Pulitura orbital 3M y lavado completo de camioneta en divisa.',
    }, [
      { productId: sPulitura.id, productName: sPulitura.name, quantity: 1, unitPrice: 35.00, unitCost: 8.00 },
      { productId: sCamioneta.id, productName: sCamioneta.name, quantity: 1, unitPrice: 12.00, unitCost: 2.50 },
    ]);

    // =========================================================================
    // 5. ESPACIO 5: BURGER HOUSE GOURMET (demo-gastronomia) -> Cocina + Salón + Delivery
    // =========================================================================
    console.log('\n🍔 Espacio 5: Burger House Gourmet (demo-gastronomia)...');
    let tenantBurger = await tenantRepo.findOne({ where: [{ referral_code: 'demo-gastronomia' }, { name: 'Burger House Gourmet' }] });
    if (!tenantBurger) {
      tenantBurger = await tenantRepo.save(tenantRepo.create({
        name: 'Burger House Gourmet',
        referral_code: 'demo-gastronomia',
        status: TenantStatus.ACTIVE,
        plan_type: TenantPlanType.PIONEER,
        base_price: 25.00,
        isActive: true,
        isTest: true,
        promoterId: promoterProfile ? promoterProfile.id : undefined,
      }));
    } else {
      let updated = false;
      if (!tenantBurger.isTest) {
        tenantBurger.isTest = true;
        updated = true;
      }
      if (promoterProfile && tenantBurger.promoterId !== promoterProfile.id) {
        tenantBurger.promoterId = promoterProfile.id;
        updated = true;
      }
      if (updated) {
        tenantBurger = await tenantRepo.save(tenantBurger);
      }
    }
    // Accesos Burger House
    await linkAccess(promoter.id, tenantBurger.id, UserRole.ADMIN, 'Gerente General', { compensationType: 'FIJO', salaryAmount: 120.0, salaryPeriod: 'SEMANAL' });
    await linkAccess(demoAdmin.id, tenantBurger.id, UserRole.ADMIN, 'Administrador', { compensationType: 'FIJO', salaryAmount: 100.0, salaryPeriod: 'SEMANAL' });
    await linkAccess(kitchenUser.id, tenantBurger.id, UserRole.KITCHEN, 'Jefe de Cocina', { compensationType: 'FIJO', salaryAmount: 85.0, salaryPeriod: 'SEMANAL', entryTime: '11:00', exitTime: '23:00' });
    await linkAccess(parrilleroUser.id, tenantBurger.id, UserRole.OPERATIVO, 'Maestro Parrillero', { compensationType: 'FIJO', salaryAmount: 65.0, salaryPeriod: 'SEMANAL', entryTime: '11:00', exitTime: '23:00' });
    await linkAccess(meseroUser.id, tenantBurger.id, UserRole.POS, 'Capitán de Mesoneros', { compensationType: 'MIXTO', salaryAmount: 30.0, salaryPeriod: 'SEMANAL', commissionPercentage: 4.0, entryTime: '12:00', exitTime: '23:30' });
    await linkAccess(mesera2User.id, tenantBurger.id, UserRole.POS, 'Mesonera de Salón', { compensationType: 'MIXTO', salaryAmount: 25.0, salaryPeriod: 'SEMANAL', commissionPercentage: 4.0, entryTime: '12:00', exitTime: '23:30' });
    await linkAccess(deliveryUser.id, tenantBurger.id, UserRole.DELIVERY, 'Repartidor Principal Moto', { compensationType: 'MIXTO', salaryAmount: 30.0, salaryPeriod: 'SEMANAL', commissionPercentage: 10.0, entryTime: '12:00', exitTime: '23:30' });
    await linkAccess(delivery2User.id, tenantBurger.id, UserRole.DELIVERY, 'Repartidor Express', { compensationType: 'COMISION', commissionPercentage: 15.0, entryTime: '13:00', exitTime: '23:30' });

    let settingsBurger = await settingsRepo.findOne({ where: { tenantId: tenantBurger.id } });
    if (!settingsBurger) {
      settingsBurger = settingsRepo.create({
        id: randomUUID(),
        tenantId: tenantBurger.id,
        featureRecipes: true,
        featureProduction: true,
        featureBuySell: true,
        featureCustomerSchedules: false,
        featureShowCatalog: true,
        exchangeRateBs: tasaActual,
        themePrimaryColor: '#ea580c',
        themeHeaderColor: '#fff7ed',
        acceptCashUsd: true,
        acceptPagoMovil: true,
        initialCashUSD: 150.00,
        initialBankBs: 200000.00,
        featureFiscalSupport: true,
        fiscalDefaultTaxRate: 16.0,
        fiscalRif: 'J-50876543-2',
        fiscalCompanyName: 'Inversiones El Rincón del Sabor, C.A.',
        fiscalAddress: 'Av. Principal de Las Mercedes, Calle Monterrey, Caracas',
        fiscalPhone: '0424-9988776',
        fiscalMode: 'INTERNAL',
      });
      await settingsRepo.save(settingsBurger);
    } else {
      settingsBurger.initialCashUSD = 150.00;
      settingsBurger.initialBankBs = 200000.00;
      settingsBurger.featureFiscalSupport = true;
      settingsBurger.fiscalDefaultTaxRate = 16.0;
      settingsBurger.fiscalRif = 'J-50876543-2';
      settingsBurger.fiscalCompanyName = 'Inversiones El Rincón del Sabor, C.A.';
      settingsBurger.fiscalAddress = 'Av. Principal de Las Mercedes, Calle Monterrey, Caracas';
      settingsBurger.fiscalPhone = '0424-9988776';
      settingsBurger.fiscalMode = 'INTERNAL';
      await settingsRepo.save(settingsBurger);
    }

    // Zonas Delivery
    let zoneCentro = await deliveryZoneRepo.findOne({ where: { tenantId: tenantBurger.id, name: 'Zona Centro' } });
    if (!zoneCentro) {
      zoneCentro = await deliveryZoneRepo.save(deliveryZoneRepo.create({ name: 'Zona Centro', feePrice: 1.5, tenantId: tenantBurger.id }));
    }
    let zoneVaryna = await deliveryZoneRepo.findOne({ where: { tenantId: tenantBurger.id, name: 'Ciudad Varyná' } });
    if (!zoneVaryna) {
      zoneVaryna = await deliveryZoneRepo.save(deliveryZoneRepo.create({ name: 'Ciudad Varyná', feePrice: 2.0, tenantId: tenantBurger.id }));
    }

    // Clientes Burger House
    const bSilva = await getOrCreateCustomer(tenantBurger.id, { name: 'Andrés Silva', phone: '0416-5551234', identification: 'V-19223344', totalVisits: 6, notes: 'Av. Bolívar, Edf. Rosal, Apto 4B. Prefiere entrega en moto rápida.' });
    const bRivas = await getOrCreateCustomer(tenantBurger.id, { name: 'Karla Rivas', phone: '0412-8877665', identification: 'V-22112233', totalVisits: 5, notes: 'Urb. Los Criollitos, Casa 14. Pide combos dobles con papas.' });
    const bMendoza = await getOrCreateCustomer(tenantBurger.id, { name: 'Miguel Mendoza', phone: '0414-3322114', identification: 'V-17889900', totalVisits: 4, notes: 'Cliente corporativo almuerzos oficina.' });
    const bFamilia = await getOrCreateCustomer(tenantBurger.id, { name: 'Familia Colmenares', phone: '0414-9988112', identification: 'V-15443322', totalVisits: 7, notes: 'Frecuentes de fin de semana en salón (Mesa 2).' });

    // Insumos y Receta Burger
    const burgerInsumos = [
      { name: 'Pan de Hamburguesa Brioche', unit: 'und', costPerUnit: 0.5, stockQuantity: 60, minStockAlert: 15 },
      { name: 'Carne Molida Premium', unit: 'kg', costPerUnit: 4.0, stockQuantity: 25, minStockAlert: 5 },
      { name: 'Queso Cheddar Rebanado', unit: 'kg', costPerUnit: 5.0, stockQuantity: 12, minStockAlert: 3 },
      { name: 'Tocineta Ahumada Crujiente', unit: 'kg', costPerUnit: 6.5, stockQuantity: 10, minStockAlert: 2 },
    ];
    const savedInsumosBurger: Record<string, RawMaterial> = {};
    for (const raw of burgerInsumos) {
      let r = await rawMaterialRepo.findOne({ where: { tenantId: tenantBurger.id, name: raw.name } });
      if (!r) {
        r = rawMaterialRepo.create({ ...raw, tenantId: tenantBurger.id });
        r = await rawMaterialRepo.save(r);
      }
      savedInsumosBurger[raw.name] = r;
    }

    // Productos Burger
    let pBurgerDoble = await getOrCreateProduct(tenantBurger.id, { name: 'Hamburguesa Doble Queso', salePrice: 7.5, cost: 2.5, estimatedCost: 2.5, stock: 20, stockQuantity: 20, physicalStock: 20, category: 'Hamburguesas', is_service: false, product_type: 'FORMULA', images: ['https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80'] });
    let pBurgerEspecial = await getOrCreateProduct(tenantBurger.id, { name: 'Burger House Especial Tocineta', salePrice: 9.5, cost: 3.2, estimatedCost: 3.2, stock: 15, stockQuantity: 15, physicalStock: 15, category: 'Hamburguesas', is_service: false, product_type: 'FORMULA', images: ['https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&auto=format&fit=crop&q=80'] });
    let pPapas = await getOrCreateProduct(tenantBurger.id, { name: 'Papas Fritas Rústicas con Cheddar', salePrice: 4.0, cost: 1.2, estimatedCost: 1.2, stock: 30, stockQuantity: 30, physicalStock: 30, category: 'Acompañantes', is_service: false, product_type: 'FORMULA', images: ['https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80'] });
    let pAlitas = await getOrCreateProduct(tenantBurger.id, { name: 'Alitas BBQ Crispy (8 und)', salePrice: 6.5, cost: 2.2, estimatedCost: 2.2, stock: 18, stockQuantity: 18, physicalStock: 18, category: 'Entradas', is_service: false, product_type: 'FORMULA', images: ['https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&auto=format&fit=crop&q=80'] });
    let pCocaCola = await getOrCreateProduct(tenantBurger.id, { name: 'Coca-Cola Sabor Original Lata 355ml', salePrice: 1.5, cost: 0.7, estimatedCost: 0.7, stock: 48, stockQuantity: 48, physicalStock: 48, category: 'Bebidas', is_service: false, product_type: 'REVENTA', images: ['https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80'] });
    let pCerveza = await getOrCreateProduct(tenantBurger.id, { name: 'Cerveza Zulia Polar Fría 330ml', salePrice: 2.0, cost: 0.9, estimatedCost: 0.9, stock: 36, stockQuantity: 36, physicalStock: 36, category: 'Bebidas', is_service: false, product_type: 'REVENTA', images: ['https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&auto=format&fit=crop&q=80'] });

    // Gastos y Fondo Burger
    await getOrCreateExpense(tenantBurger.id, { description: 'Fondo Inicial de Caja / Gaveta', amount: 50.00, category: 'FONDO_CAJA', paymentMethod: 'CASH_USD' });
    await getOrCreateExpense(tenantBurger.id, { description: 'Carbón Vegetal y Gas para Parrilla', amount: 28.00, category: 'UTILITIES', paymentMethod: 'CASH_USD' });
    await getOrCreateExpense(tenantBurger.id, { description: 'Cajas Térmicas y Papel Antigrasa Delivery', amount: 22.00, category: 'SUPPLIES', paymentMethod: 'PAGO_MOVIL' });
    await getOrCreateExpense(tenantBurger.id, { description: 'Nómina Semanal Reparto y Cocina', amount: 80.00, category: 'PAYROLL', paymentMethod: 'PAGO_MOVIL' });
    await getOrCreateSalaryAdvance(tenantBurger.id, {
      userId: deliveryUser.id,
      amountUSD: 10.00,
      reason: 'Adelanto para gasolina de la moto de reparto',
      status: SalaryAdvanceStatus.PENDIENTE,
      paymentMethod: 'CASH',
    });

    // Comandas Gastronomía (Cocina + Reparto + Entregados)
    // 1. Comanda Cocina (PREPARING) en Mesa 4
    await getOrCreateOrder(tenantBurger.id, {
      customerName: 'Mesa 4 (Salón)',
      customerPhone: '0414-0000000',
      tableNumber: '4',
      employeeId: meseroUser.id,
      status: OrderStatus.PREPARING,
      paymentStatus: PaymentStatus.PENDING,
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 15.00,
      totalCost: 5.00,
      netProfit: 10.00,
      exchangeRate: tasaActual,
      notes: 'Mesa 4: 2 dobles queso marchando a cocina. Una sin cebolla.',
    }, [{ productId: pBurgerDoble.id, productName: pBurgerDoble.name, quantity: 2, unitPrice: 7.50, unitCost: 2.50 }]);

    // 2. Comanda Salón Lista (READY) en Mesa 2
    await getOrCreateOrder(tenantBurger.id, {
      customerName: bFamilia.name,
      customerPhone: bFamilia.phone,
      customerId: bFamilia.id,
      tableNumber: '2',
      employeeId: mesera2User.id,
      status: OrderStatus.READY,
      paymentStatus: PaymentStatus.PENDING,
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 21.50,
      totalCost: 7.30,
      netProfit: 14.20,
      exchangeRate: tasaActual,
      notes: 'Mesa 2: Pedido listo para servir en mesa con refrescos.',
    }, [
      { productId: pBurgerEspecial.id, productName: pBurgerEspecial.name, quantity: 1, unitPrice: 9.50, unitCost: 3.20 },
      { productId: pBurgerDoble.id, productName: pBurgerDoble.name, quantity: 1, unitPrice: 7.50, unitCost: 2.50 },
      { productId: pCocaCola.id, productName: pCocaCola.name, quantity: 3, unitPrice: 1.50, unitCost: 0.70 },
    ]);

    // 3. Comanda Delivery en Tránsito (IN_TRANSIT) para Repartidor Carlos
    await getOrCreateOrder(tenantBurger.id, {
      customerName: bSilva.name,
      customerPhone: bSilva.phone,
      customerId: bSilva.id,
      customerAddress: 'Av. Bolívar, Edf. Rosal, Apto 4B',
      status: OrderStatus.IN_TRANSIT,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      deliveryMethod: DeliveryMethod.DELIVERY,
      deliveryZoneId: zoneCentro?.id,
      deliveryFee: 1.50,
      deliveryUserId: deliveryUser.id,
      driverId: deliveryUser.id,
      totalAmount: 9.00,
      totalCost: 2.50,
      netProfit: 6.50,
      exchangeRate: tasaActual,
      pagoMovilRef: 'REF-89472',
      notes: 'Delivery asignado a Carlos. Entregar en reja de vigilancia.',
    }, [{ productId: pBurgerDoble.id, productName: pBurgerDoble.name, quantity: 1, unitPrice: 7.50, unitCost: 2.50 }]);

    // 4. Comanda Delivery Entregada y Cobrada
    await getOrCreateOrder(tenantBurger.id, {
      customerName: bRivas.name,
      customerPhone: bRivas.phone,
      customerId: bRivas.id,
      customerAddress: 'Urb. Los Criollitos, Casa 14',
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      deliveryMethod: DeliveryMethod.DELIVERY,
      deliveryZoneId: zoneVaryna?.id,
      deliveryFee: 2.00,
      deliveryUserId: delivery2User.id,
      driverId: delivery2User.id,
      totalAmount: 20.00,
      totalCost: 6.80,
      netProfit: 13.20,
      exchangeRate: tasaActual,
      pagoMovilRef: 'PM-112233',
      notes: 'Delivery completado por Javier. Pago Móvil verificado.',
    }, [
      { productId: pBurgerEspecial.id, productName: pBurgerEspecial.name, quantity: 1, unitPrice: 9.50, unitCost: 3.20 },
      { productId: pAlitas.id, productName: pAlitas.name, quantity: 1, unitPrice: 6.50, unitCost: 2.20 },
      { productId: pCerveza.id, productName: pCerveza.name, quantity: 1, unitPrice: 2.00, unitCost: 0.90 },
    ]);

    // 5. Venta Salón pagada en Efectivo USD
    await getOrCreateOrder(tenantBurger.id, {
      customerName: bMendoza.name,
      customerPhone: bMendoza.phone,
      customerId: bMendoza.id,
      employeeId: meseroUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'USD',
      usdReceived: 25.00,
      changeAmount: 2.50,
      changeMethod: 'CASH_USD',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 22.50,
      totalCost: 7.50,
      netProfit: 15.00,
      exchangeRate: tasaActual,
      notes: '3 combos de hamburguesa doble entregados en salón.',
    }, [{ productId: pBurgerDoble.id, productName: pBurgerDoble.name, quantity: 3, unitPrice: 7.50, unitCost: 2.50 }]);

    // 6. Combo Familiar en Salón - Pago Móvil
    await getOrCreateOrder(tenantBurger.id, {
      customerName: bFamilia.name,
      customerPhone: bFamilia.phone,
      customerId: bFamilia.id,
      employeeId: meseroUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      amountBs: 44.50 * tasaActual,
      pagoMovilRef: 'PM-993812',
      pagoMovilBank: '0134 - Banesco',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 44.50,
      totalCost: 15.00,
      netProfit: 29.50,
      exchangeRate: tasaActual,
      notes: 'Combo Familiar Salón: 3 especiales + 2 papas cheddar + 4 refrescos.',
    }, [
      { productId: pBurgerEspecial.id, productName: pBurgerEspecial.name, quantity: 3, unitPrice: 9.50, unitCost: 3.20 },
      { productId: pPapas.id, productName: pPapas.name, quantity: 2, unitPrice: 4.00, unitCost: 1.20 },
      { productId: pCocaCola.id, productName: pCocaCola.name, quantity: 4, unitPrice: 1.50, unitCost: 0.70 },
    ]);

    // 7. Pedido Corporativo Delivery - Pago Móvil
    await getOrCreateOrder(tenantBurger.id, {
      customerName: bMendoza.name,
      customerPhone: bMendoza.phone,
      customerId: bMendoza.id,
      customerAddress: 'Torre Empresarial, Piso 5',
      employeeId: deliveryUser.id,
      driverId: deliveryUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      amountBs: 46.00 * tasaActual,
      pagoMovilRef: 'PM-554411',
      pagoMovilBank: '0102 - Banco de Venezuela',
      deliveryMethod: DeliveryMethod.DELIVERY,
      deliveryZoneId: zoneCentro?.id,
      deliveryFee: 1.50,
      totalAmount: 46.00,
      totalCost: 14.80,
      netProfit: 31.20,
      exchangeRate: tasaActual,
      notes: 'Almuerzo corporativo: 4 Doble Queso + 4 Papas Rústicas.',
    }, [
      { productId: pBurgerDoble.id, productName: pBurgerDoble.name, quantity: 4, unitPrice: 7.50, unitCost: 2.50 },
      { productId: pPapas.id, productName: pPapas.name, quantity: 4, unitPrice: 4.00, unitCost: 1.20 },
    ]);

    // 8. Takeout en Mostrador - Efectivo USD
    await getOrCreateOrder(tenantBurger.id, {
      customerName: bRivas.name,
      customerPhone: bRivas.phone,
      customerId: bRivas.id,
      employeeId: mesera2User.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'USD',
      usdReceived: 25.00,
      changeAmount: 2.00,
      changeMethod: 'CASH_USD',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 23.00,
      totalCost: 8.20,
      netProfit: 14.80,
      exchangeRate: tasaActual,
      notes: 'Para llevar: 2 especiales y 2 cervezas frías.',
    }, [
      { productId: pBurgerEspecial.id, productName: pBurgerEspecial.name, quantity: 2, unitPrice: 9.50, unitCost: 3.20 },
      { productId: pCerveza.id, productName: pCerveza.name, quantity: 2, unitPrice: 2.00, unitCost: 0.90 },
    ]);

    // 9. Salón Celebración - Pago Móvil
    await getOrCreateOrder(tenantBurger.id, {
      customerName: bSilva.name,
      customerPhone: bSilva.phone,
      customerId: bSilva.id,
      employeeId: meseroUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      amountBs: 69.50 * tasaActual,
      pagoMovilRef: 'PM-778899',
      pagoMovilBank: '0134 - Banesco',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 69.50,
      totalCost: 24.10,
      netProfit: 45.40,
      exchangeRate: tasaActual,
      notes: 'Mesa larga amigos: 5 Especiales + 3 Papas + 5 Cervezas.',
    }, [
      { productId: pBurgerEspecial.id, productName: pBurgerEspecial.name, quantity: 5, unitPrice: 9.50, unitCost: 3.20 },
      { productId: pPapas.id, productName: pPapas.name, quantity: 3, unitPrice: 4.00, unitCost: 1.20 },
      { productId: pCerveza.id, productName: pCerveza.name, quantity: 5, unitPrice: 2.00, unitCost: 0.90 },
    ]);

    // =========================================================================
    // 6. ESPACIO 6: CENTRO ESTÉTICO GLOW (demo-estetica) -> Citas Médicas + Retail
    // =========================================================================
    console.log('\n✨ Espacio 6: Centro Estético Glow (demo-estetica)...');
    let tenantGlow = await tenantRepo.findOne({ where: [{ referral_code: 'demo-estetica' }, { name: 'Centro Estético Glow' }] });
    if (!tenantGlow) {
      tenantGlow = await tenantRepo.save(tenantRepo.create({
        name: 'Centro Estético Glow',
        referral_code: 'demo-estetica',
        status: TenantStatus.ACTIVE,
        plan_type: TenantPlanType.PIONEER,
        base_price: 25.00,
        isActive: true,
        isTest: true,
        promoterId: promoterProfile ? promoterProfile.id : undefined,
      }));
    } else {
      let updated = false;
      if (!tenantGlow.isTest) {
        tenantGlow.isTest = true;
        updated = true;
      }
      if (promoterProfile && tenantGlow.promoterId !== promoterProfile.id) {
        tenantGlow.promoterId = promoterProfile.id;
        updated = true;
      }
      if (updated) {
        tenantGlow = await tenantRepo.save(tenantGlow);
      }
    }
    // Accesos Centro Glow
    await linkAccess(promoter.id, tenantGlow.id, UserRole.ADMIN, 'Directora Estética', { compensationType: 'FIJO', salaryAmount: 120.0, salaryPeriod: 'SEMANAL' });
    await linkAccess(demoAdmin.id, tenantGlow.id, UserRole.ADMIN, 'Administrador', { compensationType: 'FIJO', salaryAmount: 100.0, salaryPeriod: 'SEMANAL' });
    await linkAccess(specialistUser.id, tenantGlow.id, UserRole.OPERATIVO, 'Dra. Ana Cosmiatra & Médico Estético', { compensationType: 'COMISION', commissionPercentage: 45.0, entryTime: '10:00', exitTime: '18:00' });
    await linkAccess(terapeutaUser.id, tenantGlow.id, UserRole.OPERATIVO, 'Claudia Fisioterapeuta & Drenaje', { compensationType: 'MIXTO', salaryAmount: 40.0, salaryPeriod: 'SEMANAL', commissionPercentage: 35.0, entryTime: '09:00', exitTime: '17:00' });
    await linkAccess(recepcionGlowUser.id, tenantGlow.id, UserRole.POS, 'Camila Recepcionista & Atención', { compensationType: 'FIJO', salaryAmount: 60.0, salaryPeriod: 'QUINCENAL', entryTime: '08:30', exitTime: '18:30' });

    let settingsGlow = await settingsRepo.findOne({ where: { tenantId: tenantGlow.id } });
    if (!settingsGlow) {
      settingsGlow = settingsRepo.create({
        id: randomUUID(),
        tenantId: tenantGlow.id,
        featureBuySell: true,
        featureCustomerSchedules: true,
        featureRecipes: false,
        featureProduction: false,
        featureShowCatalog: true,
        exchangeRateBs: tasaActual,
        themePrimaryColor: '#059669',
        themeHeaderColor: '#ecfdf5',
        bookingRequireService: true,
        bookingAllowStaffSelection: true,
        acceptCashUsd: true,
        acceptPagoMovil: true,
        initialCashUSD: 160.00,
        initialBankBs: 200000.00,
        featureFiscalSupport: true,
        fiscalDefaultTaxRate: 16.0,
        fiscalRif: 'J-50334455-1',
        fiscalCompanyName: 'Centro de Estética Glow Spa, C.A.',
        fiscalAddress: 'Centro Comercial San Ignacio, Nivel Jardín, Local J-18, Caracas',
        fiscalPhone: '0414-6655443',
        fiscalMode: 'INTERNAL',
      });
      await settingsRepo.save(settingsGlow);
    } else {
      settingsGlow.initialCashUSD = 160.00;
      settingsGlow.initialBankBs = 200000.00;
      settingsGlow.featureFiscalSupport = true;
      settingsGlow.fiscalDefaultTaxRate = 16.0;
      settingsGlow.fiscalRif = 'J-50334455-1';
      settingsGlow.fiscalCompanyName = 'Centro de Estética Glow Spa, C.A.';
      settingsGlow.fiscalAddress = 'Centro Comercial San Ignacio, Nivel Jardín, Local J-18, Caracas';
      settingsGlow.fiscalPhone = '0414-6655443';
      settingsGlow.fiscalMode = 'INTERNAL';
      await settingsRepo.save(settingsGlow);
    }

    // Clientes Centro Glow
    const gMendoza = await getOrCreateCustomer(tenantGlow.id, { name: 'Valeria Mendoza', phone: '0424-5544332', identification: 'V-23998877', totalVisits: 5, notes: 'Tratamiento facial y sérums antimanchas.' });
    const gSalas = await getOrCreateCustomer(tenantGlow.id, { name: 'Mariana Salas', phone: '0414-7766554', identification: 'V-19334455', totalVisits: 4, notes: 'Sesiones de masaje descontracturante quincenal.' });
    const gColmenares = await getOrCreateCustomer(tenantGlow.id, { name: 'Patricia Colmenares', phone: '0412-9900112', identification: 'V-25112233', totalVisits: 3, notes: 'Paciente de drenaje linfático con Claudia.' });
    const gZambrano = await getOrCreateCustomer(tenantGlow.id, { name: 'Daniela Zambrano', phone: '0416-4433221', identification: 'V-18665544', totalVisits: 6, notes: 'Limpieza profunda hidrafacial cada mes.' });

    // Servicios & Cosméticos Centro Glow
    const gMasaje = await getOrCreateProduct(tenantGlow.id, { name: 'Masaje Descontracturante 50min', salePrice: 25.0, cost: 4.0, estimatedCost: 4.0, durationMinutes: 50, category: 'Masajes', is_service: true, product_type: 'SERVICIO', images: ['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&auto=format&fit=crop&q=80'] });
    const gHidrafacial = await getOrCreateProduct(tenantGlow.id, { name: 'Limpieza Facial Profunda Hidrafacial', salePrice: 30.0, cost: 5.5, estimatedCost: 5.5, durationMinutes: 60, category: 'Faciales', is_service: true, product_type: 'SERVICIO', images: ['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&auto=format&fit=crop&q=80'] });
    const gDrenaje = await getOrCreateProduct(tenantGlow.id, { name: 'Drenaje Linfático Post-Quirúrgico', salePrice: 28.0, cost: 4.0, estimatedCost: 4.0, durationMinutes: 45, category: 'Terapéutico', is_service: true, product_type: 'SERVICIO', images: ['https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=600&auto=format&fit=crop&q=80'] });
    const gSerum = await getOrCreateProduct(tenantGlow.id, { name: 'Sérum Facial Vitamina C 30ml', salePrice: 18.0, cost: 8.0, estimatedCost: 8.0, stock: 15, stockQuantity: 15, physicalStock: 15, category: 'Cosméticos', is_service: false, product_type: 'REVENTA', images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80'] });
    const gSolar = await getOrCreateProduct(tenantGlow.id, { name: 'Protector Solar Toque Seco FPS 50', salePrice: 22.0, cost: 10.0, estimatedCost: 10.0, stock: 12, stockQuantity: 12, physicalStock: 12, category: 'Cosméticos', is_service: false, product_type: 'REVENTA', images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80'] });
    const gAcido = await getOrCreateProduct(tenantGlow.id, { name: 'Ácido Hialurónico Sérum Antiedad 30ml', salePrice: 25.0, cost: 11.0, estimatedCost: 11.0, stock: 10, stockQuantity: 10, physicalStock: 10, category: 'Cosméticos', is_service: false, product_type: 'REVENTA', images: ['https://images.unsplash.com/photo-1608248597359-561352136932?w=600&auto=format&fit=crop&q=80'] });

    // Gastos y Fondo Glow
    await getOrCreateExpense(tenantGlow.id, { description: 'Base de Apertura en Gaveta', amount: 60.00, category: 'FONDO_CAJA', paymentMethod: 'CASH_USD' });
    await getOrCreateExpense(tenantGlow.id, { description: 'Aceites Esenciales, Mascarillas e Insumos Spa', amount: 35.00, category: 'SUPPLIES', paymentMethod: 'CASH_USD' });
    await getOrCreateExpense(tenantGlow.id, { description: 'Servicio de Internet Fibra Óptica', amount: 35.00, category: 'UTILITIES', paymentMethod: 'PAGO_MOVIL' });
    await getOrCreateExpense(tenantGlow.id, { description: 'Honorarios Médicos Quincenales Dra. Ana', amount: 90.00, category: 'PAYROLL', paymentMethod: 'PAGO_MOVIL' });
    await getOrCreateSalaryAdvance(tenantGlow.id, {
      userId: terapeutaUser.id,
      amountUSD: 20.00,
      reason: 'Anticipo para compra de uniforme y calzado clínico',
      status: SalaryAdvanceStatus.PENDIENTE,
      paymentMethod: 'CASH',
    });

    // Citas Agendadas Glow
    await getOrCreateReservation(tenantGlow.id, {
      customerName: gZambrano.name,
      customerPhone: gZambrano.phone,
      customerId: gZambrano.id,
      date: todayIso,
      time: '11:00',
      durationMinutes: 60,
      serviceId: gHidrafacial.id,
      serviceName: gHidrafacial.name,
      employeeId: specialistUser.id,
      employeeName: 'Dra. Ana Especialista',
      status: ReservationStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      totalAmount: 30.00,
      notes: 'Sesión de hidrafacial realizada con éxito.',
    });

    await getOrCreateReservation(tenantGlow.id, {
      customerName: gSalas.name,
      customerPhone: gSalas.phone,
      customerId: gSalas.id,
      date: todayIso,
      time: '09:30',
      durationMinutes: 45,
      serviceId: gDrenaje.id,
      serviceName: gDrenaje.name,
      employeeId: terapeutaUser.id,
      employeeName: 'Claudia Fisioterapeuta',
      status: ReservationStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      totalAmount: 28.00,
      notes: 'Sesión de drenaje post-operatorio completada y pagada.',
    });

    await getOrCreateReservation(tenantGlow.id, {
      customerName: gSalas.name,
      customerPhone: gSalas.phone,
      customerId: gSalas.id,
      date: todayIso,
      time: '16:00',
      durationMinutes: 50,
      serviceId: gMasaje.id,
      serviceName: gMasaje.name,
      employeeId: specialistUser.id,
      employeeName: 'Dra. Ana Especialista',
      status: ReservationStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      totalAmount: 25.00,
      notes: 'Paciente reservada con Dra. Ana para masaje.',
    });

    await getOrCreateReservation(tenantGlow.id, {
      customerName: gColmenares.name,
      customerPhone: gColmenares.phone,
      customerId: gColmenares.id,
      date: tomorrowIso,
      time: '10:00',
      durationMinutes: 45,
      serviceId: gDrenaje.id,
      serviceName: gDrenaje.name,
      employeeId: terapeutaUser.id,
      employeeName: 'Claudia Fisioterapeuta',
      status: ReservationStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PENDING,
      totalAmount: 28.00,
      notes: 'Drenaje linfático post-operatorio agendado.',
    });

    // Ventas Retail & Servicios Glow
    await getOrCreateOrder(tenantGlow.id, {
      customerName: gMendoza.name,
      customerPhone: gMendoza.phone,
      customerId: gMendoza.id,
      employeeId: recepcionGlowUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      amountBs: 40.00 * tasaActual,
      pagoMovilRef: 'PM-482019',
      pagoMovilBank: '0102 - Banco de Venezuela',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 40.00,
      totalCost: 18.00,
      netProfit: 22.00,
      exchangeRate: tasaActual,
      notes: 'Venta de cosméticos con Pago Móvil confirmado en cuenta bancaria.',
    }, [
      { productId: gSerum.id, productName: gSerum.name, quantity: 1, unitPrice: 18.00, unitCost: 8.00 },
      { productId: gSolar.id, productName: gSolar.name, quantity: 1, unitPrice: 22.00, unitCost: 10.00 },
    ]);

    await getOrCreateOrder(tenantGlow.id, {
      customerName: gSalas.name,
      customerPhone: gSalas.phone,
      customerId: gSalas.id,
      employeeId: specialistUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'USD',
      usdReceived: 30.00,
      changeAmount: 5.00,
      changeMethod: 'CASH_USD',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 25.00,
      totalCost: 4.00,
      netProfit: 21.00,
      exchangeRate: tasaActual,
      notes: 'Pago en efectivo de sesión de masaje descontracturante.',
    }, [{ productId: gMasaje.id, productName: gMasaje.name, quantity: 1, unitPrice: 25.00, unitCost: 4.00 }]);

    await getOrCreateOrder(tenantGlow.id, {
      customerName: gZambrano.name,
      customerPhone: gZambrano.phone,
      customerId: gZambrano.id,
      employeeId: recepcionGlowUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'USD',
      usdReceived: 50.00,
      changeAmount: 3.00,
      changeMethod: 'CASH_USD',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 47.00,
      totalCost: 21.00,
      netProfit: 26.00,
      exchangeRate: tasaActual,
      notes: 'Compra de Ácido Hialurónico y Protector Solar en efectivo.',
    }, [
      { productId: gAcido.id, productName: gAcido.name, quantity: 1, unitPrice: 25.00, unitCost: 11.00 },
      { productId: gSolar.id, productName: gSolar.name, quantity: 1, unitPrice: 22.00, unitCost: 10.00 },
    ]);

    await getOrCreateOrder(tenantGlow.id, {
      customerName: gColmenares.name,
      customerPhone: gColmenares.phone,
      customerId: gColmenares.id,
      employeeId: terapeutaUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      amountBs: 46.00 * tasaActual,
      pagoMovilRef: 'PM-889901',
      pagoMovilBank: '0134 - Banesco',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 46.00,
      totalCost: 12.00,
      netProfit: 34.00,
      exchangeRate: tasaActual,
      notes: 'Sesión Drenaje Linfático y Sérum Vitamina C pagado con Pago Móvil.',
    }, [
      { productId: gDrenaje.id, productName: gDrenaje.name, quantity: 1, unitPrice: 28.00, unitCost: 4.00 },
      { productId: gSerum.id, productName: gSerum.name, quantity: 1, unitPrice: 18.00, unitCost: 8.00 },
    ]);

    await getOrCreateOrder(tenantGlow.id, {
      customerName: gSalas.name,
      customerPhone: gSalas.phone,
      customerId: gSalas.id,
      employeeId: specialistUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      amountBs: 52.00 * tasaActual,
      pagoMovilRef: 'PM-334455',
      pagoMovilBank: '0102 - Banco de Venezuela',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 52.00,
      totalCost: 15.50,
      netProfit: 36.50,
      exchangeRate: tasaActual,
      notes: 'Limpieza Hidrafacial Profunda y Protector Solar FPS 50.',
    }, [
      { productId: gHidrafacial.id, productName: gHidrafacial.name, quantity: 1, unitPrice: 30.00, unitCost: 5.50 },
      { productId: gSolar.id, productName: gSolar.name, quantity: 1, unitPrice: 22.00, unitCost: 10.00 },
    ]);

    await getOrCreateOrder(tenantGlow.id, {
      customerName: gMendoza.name,
      customerPhone: gMendoza.phone,
      customerId: gMendoza.id,
      employeeId: terapeutaUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'USD',
      usdReceived: 50.00,
      changeAmount: 0.00,
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 50.00,
      totalCost: 15.00,
      netProfit: 35.00,
      exchangeRate: tasaActual,
      notes: 'Masaje Descontracturante y Sérum Ácido Hialurónico en efectivo USD.',
    }, [
      { productId: gMasaje.id, productName: gMasaje.name, quantity: 1, unitPrice: 25.00, unitCost: 4.00 },
      { productId: gAcido.id, productName: gAcido.name, quantity: 1, unitPrice: 25.00, unitCost: 11.00 },
    ]);

    await getOrCreateOrder(tenantGlow.id, {
      customerName: gZambrano.name,
      customerPhone: gZambrano.phone,
      customerId: gZambrano.id,
      employeeId: recepcionGlowUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'PAGO_MOVIL',
      amountBs: 58.00 * tasaActual,
      pagoMovilRef: 'PM-123789',
      pagoMovilBank: '0134 - Banesco',
      deliveryMethod: DeliveryMethod.IN_STORE,
      totalAmount: 58.00,
      totalCost: 9.50,
      netProfit: 48.50,
      exchangeRate: tasaActual,
      notes: 'Sesión integral: Limpieza Hidrafacial + Drenaje Linfático.',
    }, [
      { productId: gHidrafacial.id, productName: gHidrafacial.name, quantity: 1, unitPrice: 30.00, unitCost: 5.50 },
      { productId: gDrenaje.id, productName: gDrenaje.name, quantity: 1, unitPrice: 28.00, unitCost: 4.00 },
    ]);

    // Espacio Central FinoWork
    const tenantCentral = await tenantRepo.findOne({ where: { name: 'FinoWork Central' } });
    if (tenantCentral) {
      await linkAccess(demoAdmin.id, tenantCentral.id, UserRole.ADMIN, 'Administrador');
      let settingsCentral = await settingsRepo.findOne({ where: { tenantId: tenantCentral.id } });
      if (settingsCentral) {
        settingsCentral.initialCashUSD = Math.max(Number(settingsCentral.initialCashUSD || 0), 100.00);
        settingsCentral.initialBankBs = Math.max(Number(settingsCentral.initialBankBs || 0), 100000.00);
        await settingsRepo.save(settingsCentral);
      }
    }

    // =========================================================================
    // 7. BARRIDO RETROACTIVO: COMPROBANTES FISCALES PARA ÓRDENES EXISTENTES
    // =========================================================================
    console.log('\n🧾 Sincronizando órdenes existentes sin comprobante fiscal para el Libro de Ventas...');
    const demoTenants = [tenantRetail, tenantPan, tenantSpa, tenantLavado, tenantBurger, tenantGlow].filter(Boolean);
    for (const t of demoTenants) {
      const uninvoicedOrders = await orderRepo
        .createQueryBuilder('o')
        .where('o.tenantId = :tenantId', { tenantId: t.id })
        .andWhere('(o.fiscalInvoiceId IS NULL OR o.fiscalInvoiceId = \'\')')
        .orderBy('o.createdAt', 'ASC')
        .getMany();

      if (uninvoicedOrders.length > 0) {
        console.log(`   🔄 Negocio ${t.name}: ${uninvoicedOrders.length} órdenes vinculando comprobante fiscal...`);
        let offset = 2;
        for (const ord of uninvoicedOrders) {
          await ensureOrderFiscalInvoice(ord, t.id, [], offset);
          offset = (offset + 3) % 25;
        }
      }
    }

    console.log('\n==================================================');
    console.log('🎉 SEED COMPLETADO EXITOSAMENTE');
    console.log('==================================================');
    console.log('🛡️ SuperAdmin de Plataforma:');
    console.log('👉 Correo:   superadmin@finowork.com');
    console.log('👉 Clave:    SuperAdmin2026!');
    console.log('\n👤 Administrador General Demo (Acceso a todos los negocios):');
    console.log('👉 Correo:   admin@finowork.com');
    console.log('👉 Clave:    123456');
    console.log('\n💼 Promotor Oficial:');
    console.log('👉 Correo:   promotor@finowork.com');
    console.log('👉 Clave:    123456');
    console.log('👉 Código:   PROMO-FINO');
    console.log('\n🛵 Repartidores / Delivery:');
    console.log('👉 Carlos:   delivery@finowork.com (123456)');
    console.log('👉 Javier:   delivery2.burger@finowork.com (123456)');
    console.log('\n👨‍🍳 Cocina & Parrilla:');
    console.log('👉 Ramón:    cocina@finowork.com (123456) [Chef de Cocina]');
    console.log('👉 Álvaro:   parrillero.burger@finowork.com (123456) [Parrillero]');
    console.log('\n🍽️ Mesoneros & Salón:');
    console.log('👉 Pedro:    mesero@finowork.com (123456) [Capitán]');
    console.log('👉 Lucía:    mesera2.burger@finowork.com (123456) [Mesonera]');
    console.log('\n💳 Cajas & Mostrador:');
    console.log('👉 María:    cajero@finowork.com (123456) [Cajera Boutique]');
    console.log('👉 Valentina: asesor1.boutique@finowork.com (123456) [Asesora]');
    console.log('👉 Rosa:     despacho.pan@finowork.com (123456) [Despacho Pan]');
    console.log('👉 Camila:   recepcion.glow@finowork.com (123456) [Recepción Glow]');
    console.log('\n🥖 Panadería & Pastelería:');
    console.log('👉 Luis:     panadero@finowork.com (123456) [Panadero]');
    console.log('👉 Gabriel:  pastelero.pan@finowork.com (123456) [Pastelero]');
    console.log('\n✂️ Barberos & Estética:');
    console.log('👉 Víctor:   barbero@finowork.com (123456) [Master Barber]');
    console.log('👉 Daniel:   barbero2.spa@finowork.com (123456) [Fades & Barbas]');
    console.log('👉 Sofía:    manicurista.spa@finowork.com (123456) [Nails]');
    console.log('\n👩‍⚕️ Salud & Spa:');
    console.log('👉 Dra. Ana: especialista@finowork.com (123456) [Cosmiatra & Médico]');
    console.log('👉 Claudia:  terapeuta.glow@finowork.com (123456) [Fisioterapeuta]');
    console.log('\n🚗 Auto Lavado:');
    console.log('👉 José:     lavador@finowork.com (123456) [Lavador Pro]');
    console.log('👉 Miguel:   lavador2.autolavado@finowork.com (123456) [Detailing]');
    console.log('👉 Fernando: supervisor.autolavado@finowork.com (123456) [Supervisor]');
    console.log('\n🏪 Negocios Demo:');
    console.log('1. Boutique Moda Urbana       (demo-retail)');
    console.log('2. Panadería La Espiga        (demo-panaderia)');
    console.log('3. Barbería & Spa Élite       (demo-servicios)');
    console.log('4. Auto Lavado Express        (demo-autolavado)');
    console.log('5. Burger House Gourmet       (demo-gastronomia)');
    console.log('6. Centro Estético Glow       (demo-estetica)');
    console.log('==================================================\n');

    return {
      success: true,
      message: 'Negocios de prueba sincronizados correctamente con etiqueta isTest=true. Tu cuenta SuperAdmin y negocios activos se mantienen intactos.',
      demoTenants: [
        'Boutique Moda Urbana (demo-retail)',
        'Panadería La Espiga (demo-panaderia)',
        'Barbería & Spa Élite (demo-servicios)',
        'Auto Lavado Express (demo-autolavado)',
        'Burger House Gourmet (demo-gastronomia)',
        'Centro Estético Glow (demo-estetica)',
      ],
    };
  } catch (error) {
    console.error('❌ Error durante la ejecución del seed:', error);
    throw error;
  }
}

async function runStandaloneCli() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL no está definida en las variables de entorno.');
    process.exit(1);
  }

  const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    entities: [
      User, Tenant, UserTenantAccess, Settings, Product, ProductVariant, RawMaterial, RecipeItem,
      ComboItem, Order, OrderItem, Reservation, DeliveryZone, ProductionBatch,
      StockMovement, WorkSchedule, OperatingExpense, AccessRequest, Feedback,
      OrderItemMedia, Customer, SaaSPaymentReport, PlatformConfig,
      Promoter, PromoterCommission, SalaryAdvance, CashExchange, Investment, PushSubscription,
      FiscalInvoice, AppUpdate, PlatformExpense,
    ],
    synchronize: false,
  });

  console.log('🔄 Conectando a la base de datos (synchronize: false)...');
  await dataSource.initialize();
  try {
    const res = await runDemoSeed(dataSource, { skipSuperAdmin: false });
    console.log(`✅ ${res.message}`);
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  runStandaloneCli()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
