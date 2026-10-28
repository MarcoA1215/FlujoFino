import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsArray } from 'class-validator';
import { Controller, Post, Body, Param, Get, NotFoundException, BadRequestException, Put, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReservationsService } from './reservations.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, In } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { Settings } from '../entities/settings.entity';
import { Reservation } from '../entities/reservation.entity';
import { Product } from '../entities/product.entity';
import { ReservationStatus, PaymentStatus, DeliveryMethod, OrderStatus, UserRole } from '@finowork/shared-types';
import { decodeTenantId } from '../utils/tenant-crypto';
import { Public } from '../auth/public.decorator';
import { OrderItem } from '../entities/order-item.entity';
import { Order } from '../entities/order.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { CustomersService } from '../customers/customers.service';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { isTenantSuspendedOrExpired } from '../utils/tenant-status';
import { safeImageUploadOptions } from '../common/utils/multer-options';

export class CreatePublicReservationDto {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  time: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  identification?: string;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsOptional()
  @IsString()
  serviceName?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  numberOfPeople?: number;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsNumber()
  paymentAmount?: number;

  @IsOptional()
  @IsNumber()
  paymentAmountBs?: number;

  @IsOptional()
  @IsString()
  paymentNotes?: string;

  @IsOptional()
  @IsString()
  paymentProofUrl?: string;

  @IsOptional()
  @IsString()
  tableNumber?: string;

  @IsOptional()
  @IsString()
  employeeName?: string;

  @IsOptional()
  @IsString()
  referralSource?: string;

  @IsOptional()
  @IsArray()
  serviceSpecialists?: any[];
}

@Public()
@Controller('public/reservations')
export class PublicReservationsController {
  constructor(
    private readonly reservationsService: ReservationsService,
    private readonly customersService: CustomersService,
    private readonly storageService: StorageService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>
  ) {}

  @Post('appointment/upload-proof')
  @UseInterceptors(FileInterceptor('file', safeImageUploadOptions))
  async uploadProof(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Archivo requerido');
    const url = await this.storageService.uploadFile(file, `public-proofs`);
    return { url };
  }

  @Get('tenant/:id')
  async getTenantInfo(@Param('id') token: string) {
    let id: string;
    try {
      id = decodeTenantId(token);
    } catch {
      throw new NotFoundException('Enlace inválido o negocio no encontrado');
    }
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Negocio no encontrado');

    const settingsRepo = this.tenantRepo.manager.getRepository(Settings);
    const settings = await settingsRepo.findOne({ where: { tenantId: id } });

    if (isTenantSuspendedOrExpired(tenant)) {
      return {
        id: token,
        name: tenant.name,
        isSuspended: true,
        themePrimaryColor: settings?.themePrimaryColor || '#10b981',
        themeHeaderColor: settings?.themeHeaderColor || settings?.themePrimaryColor || '#10b981',
        companyLogoUrl: settings?.companyLogoUrl || null,
        logoShape: settings?.logoShape || 'ROUNDED',
        logoFit: settings?.logoFit || 'contain',
        settings: {
          companyPhone: settings?.companyPhone || '',
          themePrimaryColor: settings?.themePrimaryColor || '#10b981',
          themeHeaderColor: settings?.themeHeaderColor || settings?.themePrimaryColor || '#10b981',
          companyLogoUrl: settings?.companyLogoUrl || null,
          logoShape: settings?.logoShape || 'ROUNDED',
          logoFit: settings?.logoFit || 'contain',
        },
        services: [],
        staff: []
      };
    }

    const productRepo = this.tenantRepo.manager.getRepository(Product);
    const products = await productRepo.find({
      where: { tenantId: id },
      order: { name: 'ASC' }
    });

    // Filtramos estrictamente solo los que son de tipo SERVICIO:
    const onlyServices = products.filter(p => {
      if (p.product_type === 'SERVICIO') return true;
      if (p.product_type === 'REVENTA' || p.product_type === 'FORMULA') return false;
      return p.is_service === true || p.category === 'Servicios';
    });

    const services = onlyServices.map(p => {
      const rawImages = Array.isArray(p.images)
        ? p.images
        : (typeof p.images === 'string' && (p.images as string).trim() ? (p.images as string).split(',').map(s => s.trim()) : []);
      const validImages = rawImages.filter(Boolean);
      return {
        id: p.id,
        name: p.name,
        price: p.salePrice,
        durationMinutes: p.durationMinutes || settings?.slotInterval || 30,
        category: p.category,
        assignedStaffIds: p.assignedStaffIds || [],
        product_type: 'SERVICIO',
        is_service: true,
        image: validImages[0] || null,
        images: validImages,
      };
    });

    // Fetch active staff if staff selection is allowed (defaults to true unless explicitly disabled)
    let staff: any[] = [];
    const allowStaffSelection = settings?.bookingAllowStaffSelection !== false;
    if (allowStaffSelection) {
      try {
        const accessRepo = this.tenantRepo.manager.getRepository(UserTenantAccess);
        const accesses = await accessRepo.find({
          where: { tenantId: id, isActive: true, status: 'ACCEPTED' },
          relations: { user: true },
          order: { user: { username: 'ASC' } }
        });

        // Collect all assigned staff IDs across services to ensure any designated specialist is always included
        const allAssignedStaffIds = new Set<string>();
        for (const p of products) {
          const raw = (p as any)?.assignedStaffIds;
          if (Array.isArray(raw)) {
            raw.forEach(sid => allAssignedStaffIds.add(String(sid).trim()));
          } else if (typeof raw === 'string' && raw.trim()) {
            raw.split(',').forEach(sid => allAssignedStaffIds.add(sid.trim()));
          }
        }

        staff = accesses
          .filter(a => {
            if (!a.user) return false;
            const userRoles: string[] = Array.isArray(a.roles) && a.roles.length > 0
              ? a.roles
              : [a.role || a.user.role].filter(Boolean);
            
            // Exclude delivery drivers completely from appointment specialists
            const isExclusivelyDelivery = userRoles.length > 0 && userRoles.every(r => r === UserRole.DELIVERY);
            if (isExclusivelyDelivery) return false;

            // If explicitly assigned to a service, always include as qualified specialist
            const isAssigned = allAssignedStaffIds.has(a.user.id) || allAssignedStaffIds.has(a.id);
            if (isAssigned) return true;

            // Exclude employees whose role/title indicates purely janitorial/security duties
            const titleAndName = `${a.jobTitle || ''} ${a.user?.name || ''} ${a.user?.username || ''}`.toLowerCase();
            const isCosmetic = /limpieza\s*(facial|cutis|profunda|cejas)|faciales|facial\b/i.test(titleAndName);
            const isJanitorial = !isCosmetic && /(personal de limpieza|aseador|conserje|vigilancia|seguridad|\baseo\b|\blimpieza\b)/i.test(titleAndName);
            if (isJanitorial) return false;

            return true;
          })
          .map(a => {
            const rawName = (a.user.name && a.user.name.trim()) ? a.user.name.trim() : '';
            const cleanUsername = (a.user.username || '')
              .replace(/[-_]?(admin|operativo|pos|delivery)$/i, '')
              .replace(/[._]/g, ' ')
              .trim();
            const displayName = rawName || cleanUsername || a.user.username;
            return {
              id: a.user.id,
              name: displayName,
              jobTitle: a.jobTitle || undefined
            };
          });
      } catch (staffErr) {
        console.warn('[PublicReservations] Error cargando staff del negocio:', staffErr);
        staff = [];
      }
    }

    const hasStore = ((settings?.featureBuySell || settings?.featureRecipes) && settings?.featureShowCatalog !== false) ?? false;

    let rate = Number(settings?.exchangeRateBs || 0);
    if (!rate || rate === 40.0) {
      const globalSettings = await settingsRepo.findOne({ where: { id: 'GLOBAL' } });
      rate = Number(globalSettings?.exchangeRateBs || 40.0);
    }

    const enableCopCurrency = Boolean(settings?.enableCopCurrency);
    let rateCop = Number(settings?.exchangeRateCop || 0);
    if (!rateCop) {
      const globalSettings = await settingsRepo.findOne({ where: { id: 'GLOBAL' } });
      rateCop = Number(globalSettings?.ratesCache?.cop || globalSettings?.exchangeRateCop || 4000.0);
    }

    const isDepositReq = settings?.bookingRequireDeposit === true;
    const depositPct = isDepositReq ? Number(settings?.bookingDepositPercentage ?? settings?.minDepositPercentage ?? 0) : 0;

    return {
      id: token,
      tenantId: tenant.id,
      name: tenant.name,
      businessHours: settings?.businessHours || null,
      services: services,
      slotInterval: settings?.slotInterval || 30,
        featureDelivery: settings?.featureDelivery ?? true,
        featureShowCatalog: settings?.featureShowCatalog || false,
        bookingRequireService: settings?.bookingRequireService ?? true,
        bookingAllowStaffSelection: allowStaffSelection,
        bookingMaxAdvanceDays: Number(settings?.bookingMaxAdvanceDays || 365),
        featureBuySell: settings?.featureBuySell ?? false,
        featureRecipes: settings?.featureRecipes ?? false,
        featureCustomerSchedules: settings?.featureCustomerSchedules ?? false,
        hasStore: Boolean(hasStore),
        staff: staff,
        exchangeRateBs: rate,
        enableCopCurrency,
        exchangeRateCop: rateCop,
        minDepositPercentage: depositPct,
        bookingRequireDeposit: isDepositReq,
        bookingDepositPercentage: depositPct,
      allowPartialPayments: settings?.allowPartialPayments ?? true,
      bankInfo: settings?.companyBank || '',
      companyCedula: settings?.companyCedula || '',
      companyPhone: settings?.companyPhone || '',
      companyAccountNumber: settings?.companyAccountNumber || '',
      companyAccountHolder: settings?.companyAccountHolder || '',
      companyCopBank: settings?.companyCopBank || '',
      companyCopAccountNumber: settings?.companyCopAccountNumber || '',
      companyCopAccountHolder: settings?.companyCopAccountHolder || '',
      companyCopAccountType: settings?.companyCopAccountType || 'AHORROS',
      companyCopCedula: settings?.companyCopCedula || '',
      binancePayId: settings?.binancePayId || '',
      binanceEmail: settings?.binanceEmail || '',
      acceptCashUsd: settings?.acceptCashUsd ?? true,
      acceptCashBs: settings?.acceptCashBs !== false,
      acceptPagoMovil: settings?.acceptPagoMovil ?? true,
      acceptTransfer: settings?.acceptTransfer ?? false,
      acceptBinance: settings?.acceptBinance ?? false,
      acceptCashCop: settings?.acceptCashCop !== false,
      acceptTransferCop: settings?.acceptTransferCop === true,
      themePrimaryColor: settings?.themePrimaryColor || '#10b981',
      themeHeaderColor: settings?.themeHeaderColor || settings?.themePrimaryColor || '#10b981',
      companyLogoUrl: settings?.companyLogoUrl || null,
      logoShape: settings?.logoShape || 'ROUNDED',
      logoFit: settings?.logoFit || 'contain',
      settings: {
        companyPhone: settings?.companyPhone || '',
        themePrimaryColor: settings?.themePrimaryColor || '#10b981',
        themeHeaderColor: settings?.themeHeaderColor || settings?.themePrimaryColor || '#10b981',
        companyLogoUrl: settings?.companyLogoUrl || null,
        logoShape: settings?.logoShape || 'ROUNDED',
        logoFit: settings?.logoFit || 'contain',
      },
    };
  }

  @Get('tenant/:tenantId/customer-lookup')
  async customerLookup(
    @Param('tenantId') token: string,
    @Query('query') query: string
  ) {
    let id: string;
    try {
      id = decodeTenantId(token);
    } catch {
      throw new NotFoundException('Negocio no encontrado');
    }
    return this.customersService.lookup(id, query);
  }

  @Post(':tenantId')
  async createPublicReservation(@Param('tenantId') token: string, @Body() dto: CreatePublicReservationDto) {
    let id: string;
    try {
      id = decodeTenantId(token);
    } catch {
      throw new NotFoundException('Enlace inválido');
    }
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Negocio no encontrado');

    if (isTenantSuspendedOrExpired(tenant)) {
      throw new BadRequestException('Este negocio se encuentra temporalmente en pausa y no está recibiendo citas.');
    }

    // Detección y blindaje contra doble toque / envíos concurrentes duplicados
    const reservationRepo = this.tenantRepo.manager.getRepository(Reservation);
    const recentWindow = new Date(Date.now() - 120 * 1000); // 2 minutos
    const cleanPhone = dto.customerPhone?.trim();
    const cleanCedula = typeof this.customersService?.normalizeId === 'function'
      ? this.customersService.normalizeId(dto.identification)
      : dto.identification?.trim();

    const duplicateConditions: any[] = [];
    if (cleanPhone) {
      duplicateConditions.push({
        tenantId: id,
        date: dto.date,
        time: dto.time,
        customerPhone: cleanPhone,
        status: In([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]),
        createdAt: MoreThanOrEqual(recentWindow),
      });
    }
    if (cleanCedula) {
      duplicateConditions.push({
        tenantId: id,
        date: dto.date,
        time: dto.time,
        identification: cleanCedula,
        status: In([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]),
        createdAt: MoreThanOrEqual(recentWindow),
      });
    }

    if (duplicateConditions.length > 0) {
      const existingDuplicate = await reservationRepo.findOne({
        where: duplicateConditions,
      });
      if (existingDuplicate) {
        console.warn(`[Blindaje Doble Toque] Solicitud duplicada detectada para cliente "${dto.customerName}" (${dto.date} ${dto.time}). Retornando cita existente #${existingDuplicate.id}`);
        return existingDuplicate;
      }
    }
    
    // Check overlap using new logic
    const isAvailable = await this.checkSlotAvailability(id, dto.date, dto.time, dto.serviceId, undefined, dto.employeeId);
    if (!isAvailable) {
      throw new BadRequestException('El horario seleccionado ya no está disponible.');
    }

    const settingsRepo = this.tenantRepo.manager.getRepository(Settings);
    const settings = await settingsRepo.findOne({ where: { tenantId: id } });

    const totalAmount = Number(dto.totalAmount || 0);
    const isDepositRequired = settings?.bookingRequireDeposit === true;
    const minDepositPct = isDepositRequired ? Number(settings?.bookingDepositPercentage ?? settings?.minDepositPercentage ?? 0) : 0;
    const isPayOnArrival = ['ON_ARRIVAL', 'PENDING', 'CASH'].includes((dto.paymentMethod || '').toUpperCase());

    // Validate payment reference and minimum deposit
    if (isPayOnArrival) {
      if (dto.paymentMethod === 'CASH' && settings?.acceptCashUsd === false) {
        throw new BadRequestException('Este negocio no tiene habilitado el pago en efectivo.');
      }
      // El cliente pagará en el local / cuenta abierta al asistir a su cita
    } else if (minDepositPct > 0 && totalAmount > 0) {
      if (!dto.paymentReference || !dto.paymentReference.trim()) {
        throw new BadRequestException(`Este negocio requiere un abono mínimo del ${minDepositPct}% para reservar. Por favor ingresa el comprobante de pago.`);
      }
      const requiredMin = Number(((totalAmount * minDepositPct) / 100).toFixed(2));
      const payAmount = Number(dto.paymentAmount || 0);
      if (payAmount < requiredMin) {
        throw new BadRequestException(
          `El monto abonado ($${payAmount.toFixed(2)}) es inferior al abono mínimo requerido del ${minDepositPct}% ($${requiredMin.toFixed(2)}).`
        );
      }
    } else if (dto.paymentReference && dto.paymentReference.trim()) {
      // Abono opcional o voluntario
    }

    // Synchronize customer profile
    let resolvedCustomerId: string | undefined = undefined;
    let resolvedIdentification: string | undefined = cleanCedula || dto.identification;
    if (dto.customerName && dto.customerPhone) {
      try {
        const customer = await this.customersService.findOrCreateOrUpdate(id, {
          name: dto.customerName,
          phone: dto.customerPhone,
          identification: cleanCedula || dto.identification
        });
        resolvedCustomerId = customer.id;
        if (!resolvedIdentification && customer.identification) {
          resolvedIdentification = customer.identification;
        }
      } catch (err) {
        console.error('Customer sync error in public reservation:', err);
      }
    }

    const sanitizedReservationPayload = {
      date: dto.date,
      time: dto.time,
      customerName: dto.customerName?.trim(),
      customerPhone: dto.customerPhone?.trim(),
      identification: resolvedIdentification?.trim(),
      customerId: resolvedCustomerId,
      serviceId: dto.serviceId,
      serviceName: dto.serviceName,
      numberOfPeople: dto.numberOfPeople || 1,
      employeeId: dto.employeeId,
      employeeName: dto.employeeName?.trim() || undefined,
      serviceSpecialists: dto.serviceSpecialists || undefined,
      notes: (dto.paymentMethod === 'ON_ARRIVAL' || dto.paymentMethod === 'PENDING')
        ? (dto.notes?.trim() ? `${dto.notes.trim()} | [Por pagar al asistir (Cuenta abierta)]` : '[Por pagar al asistir (Cuenta abierta)]')
        : dto.paymentMethod === 'CASH'
        ? (dto.notes?.trim() ? `${dto.notes.trim()} | [Pago en Efectivo al asistir]` : '[Pago en Efectivo al asistir]')
        : dto.notes?.trim(),
      totalAmount: Number(dto.totalAmount || 0),
      tableNumber: dto.tableNumber?.trim(),
      // Sanitización estricta: nunca permitir que el payload del cliente fuerce estos estados
      status: ReservationStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PENDING,
      abonosTotal: 0,
      abonosHistory: [],
    };

    // Create reservation natively
    const res = await this.reservationsService.create(id, sanitizedReservationPayload);
    let resDb: any = null;

    // If payment was reported during booking, attach it to abonosHistory and calculate status
    if (dto.paymentReference && dto.paymentReference.trim()) {
      const reservationRepo = this.tenantRepo.manager.getRepository(Reservation);
      resDb = await reservationRepo.findOne({ where: { id: res.id } });
      if (resDb) {
        const rawPayAmt = Number(dto.paymentAmount || totalAmount);
        const payAmt = totalAmount > 0 ? Math.min(rawPayAmt, totalAmount) : rawPayAmt;
        let rate = Number(settings?.exchangeRateBs || 0);
        if (!rate || rate === 40.0) {
          const globalSettings = await settingsRepo.findOne({ where: { id: 'GLOBAL' } });
          rate = Number(globalSettings?.exchangeRateBs || 40.0);
        }
        const payAmtBs = dto.paymentAmountBs ? Number(dto.paymentAmountBs) : Math.round(payAmt * rate * 100) / 100;

        const paymentEntry = {
          id: Date.now().toString(),
          amount: payAmt,
          amountBs: payAmtBs,
          method: dto.paymentMethod || 'PAGO_MOVIL',
          reference: dto.paymentReference.trim(),
          date: new Date().toISOString(),
          notes: dto.paymentNotes ? dto.paymentNotes.trim() : 'Pago inicial al reservar',
          status: 'REPORTED_PENDING_APPROVAL',
        };

        resDb.abonosHistory = [paymentEntry];
        resDb.abonosTotal = payAmt;
        // Regla: Ninguna cita online con método electrónico se marca automáticamente como PAID
        resDb.paymentStatus = PaymentStatus.PENDING;
        resDb.paymentReported = true;
        if (dto.paymentProofUrl) {
          resDb.paymentProofUrl = dto.paymentProofUrl;
        }
        const methodLabel = dto.paymentMethod === 'PAGO_MOVIL' ? 'Pago Móvil' : dto.paymentMethod === 'BINANCE' ? 'Binance' : dto.paymentMethod === 'TRANSFER' ? 'Transferencia' : 'Pago';
        const noteTag = `[Pago Inicial: $${payAmt.toFixed(2)} vía ${methodLabel} Ref: ${dto.paymentReference.trim()}]`;
        resDb.notes = resDb.notes ? `${resDb.notes} | ${noteTag}` : noteTag;
        await reservationRepo.save(resDb);
      }
    }

    const finalReservation = resDb || res;

    // Sincronizar orden vinculada para que aparezca en Pedidos/Tickets y Caja con el pago reportado sin duplicar órdenes
    try {
      const orderRepo = this.tenantRepo.manager.getRepository(Order);
      const productRepo = this.tenantRepo.manager.getRepository(Product);
      const orderItemRepo = this.tenantRepo.manager.getRepository(OrderItem);

      let rate = Number(settings?.exchangeRateBs || 0);
      if (!rate || rate === 40.0) {
        const globalSettings = await settingsRepo.findOne({ where: { id: 'GLOBAL' } });
        rate = Number(globalSettings?.exchangeRateBs || 40.0);
      }

      let reqDeliveryDate: Date | undefined;
      if (dto.date) {
        const timePart = dto.time ? (dto.time.length <= 5 ? `${dto.time}:00` : dto.time) : '12:00:00';
        const parsedD = new Date(`${dto.date}T${timePart}-04:00`);
        if (!isNaN(parsedD.getTime())) reqDeliveryDate = parsedD;
      }

      // Buscar si ya existe la orden vinculada (creada por reservationsService.create)
      let linkedOrder = finalReservation.orderId
        ? await orderRepo.findOne({ where: { id: finalReservation.orderId, tenantId: id } })
        : null;

      if (!linkedOrder) {
        linkedOrder = await orderRepo.findOne({
          where: { linkedReservationId: finalReservation.id, tenantId: id },
        });
      }

      const orderData: Partial<Order> = {
        customerId: finalReservation.customerId,
        customerName: finalReservation.customerName,
        customerPhone: finalReservation.customerPhone || '',
        identification: finalReservation.identification || undefined,
        notes: finalReservation.notes ? `[Cita: ${dto.date} ${dto.time || ''}] ${finalReservation.notes}` : `[Cita: ${dto.date} ${dto.time || ''}]`,
        tableNumber: finalReservation.tableNumber || '',
        requestedDeliveryDate: reqDeliveryDate,
        status: OrderStatus.PENDING,
        paymentStatus: finalReservation.paymentStatus || PaymentStatus.PENDING,
        paymentReported: Boolean(finalReservation.paymentReported),
        paymentProofUrl: finalReservation.paymentProofUrl || undefined,
        paymentRejectedReason: finalReservation.paymentRejectedReason || undefined,
        deliveryMethod: DeliveryMethod.IN_STORE,
        totalAmount: Number(finalReservation.totalAmount || 0),
        abonosTotal: Number(finalReservation.abonosTotal || 0),
        abonosHistory: finalReservation.abonosHistory || [],
        employeeId: finalReservation.employeeId || undefined,
        linkedReservationId: finalReservation.id,
        paymentMethod: dto.paymentMethod || undefined,
        pagoMovilRef: dto.paymentMethod === 'PAGO_MOVIL' ? dto.paymentReference : undefined,
        binanceRef: dto.paymentMethod === 'BINANCE' ? dto.paymentReference : undefined,
        transferRef: dto.paymentMethod === 'TRANSFER' ? dto.paymentReference : undefined,
        exchangeRate: rate,
        amountBs: dto.paymentAmountBs ? Number(dto.paymentAmountBs) : undefined,
        splitPayments: (finalReservation.abonosHistory && finalReservation.abonosHistory.length > 0) ? [{
          method: dto.paymentMethod || 'PAGO_MOVIL',
          amountUSD: Number(finalReservation.abonosTotal || 0),
          amountBS: Number(finalReservation.abonosHistory[0]?.amountBs || 0),
          reference: dto.paymentReference || undefined,
        }] : undefined,
      };

      let savedOrder: Order;
      if (linkedOrder) {
        Object.assign(linkedOrder, orderData);
        savedOrder = await orderRepo.save(linkedOrder);
      } else {
        linkedOrder = orderRepo.create({
          tenantId: id,
          ...orderData,
        });
        savedOrder = await orderRepo.save(linkedOrder);
      }

      if (finalReservation.orderId !== savedOrder.id) {
        finalReservation.orderId = savedOrder.id;
        const reservationRepo = this.tenantRepo.manager.getRepository(Reservation);
        await reservationRepo.save(finalReservation);
      }

      // Asegurar OrderItems solo si la orden no tenía items
      const existingItems = await orderItemRepo.count({ where: { orderId: savedOrder.id } });
      if (existingItems === 0 && finalReservation.serviceId) {
        let itemsSum = 0;
        const sIds = finalReservation.serviceId.split(',').map((s: string) => s.trim()).filter(Boolean);
        for (const sId of sIds) {
          const prod = await productRepo.findOne({ where: { id: sId } });
          if (prod) {
            const price = Number(prod.salePrice || 0);
            itemsSum += price;
            const spec = Array.isArray(finalReservation.serviceSpecialists)
              ? finalReservation.serviceSpecialists.find((s: any) => 
                  (s.serviceId && prod.id && s.serviceId === prod.id) ||
                  (s.serviceName && prod.name && s.serviceName.trim().toLowerCase() === prod.name.trim().toLowerCase())
                )
              : null;
            const itemEmployeeId = spec?.employeeId || finalReservation.employeeId || undefined;

            const item = orderItemRepo.create({
              orderId: savedOrder.id,
              productId: prod.id,
              productName: prod.name,
              employeeId: itemEmployeeId,
              quantity: 1,
              unitPrice: price,
              subtotal: price,
            });
            await orderItemRepo.save(item);
          }
        }
        if (Number(savedOrder.totalAmount || 0) <= 0 && itemsSum > 0) {
          savedOrder.totalAmount = itemsSum;
          await orderRepo.save(savedOrder);
          if (Number(finalReservation.totalAmount || 0) <= 0) {
            finalReservation.totalAmount = itemsSum;
            const reservationRepo = this.tenantRepo.manager.getRepository(Reservation);
            await reservationRepo.save(finalReservation);
          }
        }
      }

      // Limpieza de órdenes duplicadas huérfanas vinculadas a esta misma reservación
      const allLinkedOrders = await orderRepo.find({
        where: { linkedReservationId: finalReservation.id, tenantId: id },
      });
      if (allLinkedOrders.length > 1) {
        for (const extraOrder of allLinkedOrders) {
          if (extraOrder.id !== savedOrder.id) {
            await orderItemRepo.delete({ orderId: extraOrder.id });
            await orderRepo.delete({ id: extraOrder.id });
          }
        }
      }
    } catch (orderErr) {
      console.error('Error syncing or creating linked order for reservation:', orderErr);
    }

    // Notificar al negocio / administradores en tiempo real vía Push
    try {
      await this.notificationsService.notifyNewReservation(id, finalReservation);
    } catch (notifyErr) {
      console.error('Error notifying admins of new reservation:', notifyErr);
    }

    return finalReservation;
  }

  @Get('appointment/:id')
  async getAppointment(@Param('id') id: string) {
    const reservationRepo = this.tenantRepo.manager.getRepository(Reservation);
    const reservation = await reservationRepo.findOne({ where: { id }, relations: { tenant: true, employee: true } });
    if (!reservation) throw new NotFoundException('Cita no encontrada');

    const settingsRepo = this.tenantRepo.manager.getRepository(Settings);
    const settings = await settingsRepo.findOne({ where: { tenantId: reservation.tenantId } });

    const productRepo = this.tenantRepo.manager.getRepository(Product);
    let serviceDetails: any = null;
    if (reservation.serviceId) {
      const ids = reservation.serviceId.split(',').map(s => s.trim()).filter(Boolean);
      let totalPrice = 0;
      let totalDuration = 0;
      for (const sId of ids) {
        const p = await productRepo.findOne({ where: { id: sId } });
        if (p) {
          totalPrice += Number(p.salePrice || 0);
          totalDuration += Number(p.durationMinutes || 0);
        }
      }
      serviceDetails = { price: totalPrice, durationMinutes: totalDuration };
    }

    // Auto-acceptance logic:
    // Solo si llega y pasa la hora de la NUEVA cita reprogramada se considera aceptada por transcurso del tiempo
    if ((reservation.rescheduleStatus === 'PENDING_ACCEPTANCE' || reservation.rescheduleStatus === 'RESCHEDULED_BY_ADMIN') && reservation.time && reservation.date) {
      const targetDateStr = reservation.date;
      const [h, m] = (reservation.time || '00:00').trim().split(':').map(Number);
      const targetDateTime = new Date(`${targetDateStr}T${(h || 0).toString().padStart(2, '0')}:${(m || 0).toString().padStart(2, '0')}:00`);

      if (new Date() >= targetDateTime) {
        reservation.rescheduleStatus = 'ACCEPTED';
        await reservationRepo.save(reservation);
      }
    }

    const totalAmount = Number(reservation.totalAmount || serviceDetails?.price || 0);
    const abonosTotal = Number(reservation.abonosTotal || 0);
    const remainingAmount = Math.max(0, totalAmount - abonosTotal);
    let exchangeRate = Number(settings?.exchangeRateBs || 0);
    if (!exchangeRate || exchangeRate === 40.0) {
      const globalSettings = await settingsRepo.findOne({ where: { id: 'GLOBAL' } });
      exchangeRate = Number(globalSettings?.exchangeRateBs || 40.0);
    }

    return {
      id: reservation.id,
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
      date: reservation.date,
      time: reservation.time.substring(0, 5),
      originalTime: reservation.originalTime ? reservation.originalTime.substring(0, 5) : null,
      originalDate: reservation.originalDate || reservation.date,
      rescheduleStatus: reservation.rescheduleStatus,
      rescheduleReason: reservation.rescheduleReason || null,
      serviceId: reservation.serviceId,
      serviceName: reservation.serviceName,
      employeeId: reservation.employeeId || null,
      employeeName: reservation.employeeName || reservation.employee?.name || reservation.employee?.username || null,
      serviceSpecialists: reservation.serviceSpecialists || [],
      status: reservation.status,
      tenantName: reservation.tenant?.name || '',
      tenantId: reservation.tenantId, // Real tenant UUID is OK to return here since they already have the appointment UUID
      servicePrice: totalAmount,
      totalAmount: totalAmount,
      abonosTotal: abonosTotal,
      remainingAmount: remainingAmount,
      paymentStatus: reservation.paymentStatus || 'PENDING',
      paymentReported: Boolean(reservation.paymentReported),
      paymentProofUrl: reservation.paymentProofUrl || null,
      paymentRejectedReason: reservation.paymentRejectedReason || null,
      durationMinutes: reservation.durationMinutes || serviceDetails?.durationMinutes || 30,
      abonosHistory: reservation.abonosHistory || [],
      // Financial settings:
      exchangeRateBs: exchangeRate,
      totalAmountBs: Math.round(totalAmount * exchangeRate * 100) / 100,
      remainingAmountBs: Math.round(remainingAmount * exchangeRate * 100) / 100,
      bankInfo: settings?.companyBank || '',
      companyCedula: settings?.companyCedula || '',
      companyPhone: settings?.companyPhone || '',
      companyAccountNumber: settings?.companyAccountNumber || '',
      companyAccountHolder: settings?.companyAccountHolder || '',
      binancePayId: settings?.binancePayId || '',
      binanceEmail: settings?.binanceEmail || '',
      acceptCashUsd: settings?.acceptCashUsd ?? true,
      acceptPagoMovil: settings?.acceptPagoMovil ?? true,
      acceptBinance: settings?.acceptBinance ?? false,
      acceptTransfer: settings?.acceptTransfer ?? false,
      minDepositPercentage: Number(settings?.minDepositPercentage || 0),
      themePrimaryColor: settings?.themePrimaryColor || '#10b981',
      themeHeaderColor: settings?.themeHeaderColor || settings?.themePrimaryColor || '#10b981',
      companyLogoUrl: settings?.companyLogoUrl || null,
      logoShape: settings?.logoShape || 'ROUNDED',
      logoFit: settings?.logoFit || 'contain',
      settings: {
        companyPhone: settings?.companyPhone || '',
        themePrimaryColor: settings?.themePrimaryColor || '#10b981',
        themeHeaderColor: settings?.themeHeaderColor || settings?.themePrimaryColor || '#10b981',
        companyLogoUrl: settings?.companyLogoUrl || null,
        logoShape: settings?.logoShape || 'ROUNDED',
        logoFit: settings?.logoFit || 'contain',
      },
    };
  }

  @Post('appointment/:id/payment')
  async reportAppointmentPayment(
    @Param('id') id: string,
    @Body() dto: {
      amount: number;
      amountBs?: number;
      method: string;
      reference: string;
      notes?: string;
      paymentProofUrl?: string;
    }
  ) {
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('El monto reportado debe ser mayor a 0');
    }
    if (!dto.reference || !dto.reference.trim()) {
      throw new BadRequestException('Por favor, ingresa el número de referencia del comprobante');
    }

    const reservationRepo = this.tenantRepo.manager.getRepository(Reservation);
    const reservation = await reservationRepo.findOne({ where: { id } });
    if (!reservation) throw new NotFoundException('Cita no encontrada');

    const paymentEntry = {
      id: Date.now().toString(),
      amount: Number(dto.amount),
      amountBs: dto.amountBs ? Number(dto.amountBs) : undefined,
      method: dto.method || 'PAGO_MOVIL',
      reference: dto.reference.trim(),
      date: new Date().toISOString(),
      notes: dto.notes ? dto.notes.trim() : undefined,
      status: 'REPORTED_PENDING_APPROVAL',
    };

    reservation.abonosHistory = reservation.abonosHistory || [];
    reservation.abonosHistory.push(paymentEntry);
    reservation.abonosTotal = Number(reservation.abonosTotal || 0) + Number(dto.amount);

    // Mantiene PENDING hasta verificación administrativa
    reservation.paymentStatus = PaymentStatus.PENDING;
    reservation.paymentReported = true;
    if (dto.paymentProofUrl) {
      reservation.paymentProofUrl = dto.paymentProofUrl;
    }

    const methodLabel = dto.method === 'PAGO_MOVIL' ? 'Pago Móvil' : dto.method === 'BINANCE' ? 'Binance' : dto.method === 'TRANSFER' ? 'Transferencia' : 'Pago';
    const noteTag = `[Pago Reportado: $${Number(dto.amount).toFixed(2)} vía ${methodLabel} Ref: ${dto.reference.trim()}]`;
    await reservationRepo.save(reservation);
    try {
      await this.reservationsService.syncLinkedOrder(reservation.tenantId, reservation);
    } catch (e) {
      console.error('Error syncing linked order on reportPayment:', e);
    }

    try {
      await this.notificationsService.sendNotificationToNegocio(reservation.tenantId, {
        title: '📱 Comprobante de Pago Recibido',
        body: `${reservation.customerName} reportó un pago de $${Number(dto.amount).toFixed(2)} (${methodLabel}). Revisa y valida en Citas.`,
        data: {
          url: '/reservations',
          reservationId: reservation.id,
          type: 'PAYMENT_REPORTED'
        }
      }, ['ADMIN', 'CAJERO']);
    } catch (err) {}

    return {
      success: true,
      message: 'Pago reportado con éxito. El local verificará tu comprobante.',
      abonosTotal: reservation.abonosTotal,
      paymentStatus: reservation.paymentStatus,
      paymentReported: reservation.paymentReported,
      entry: paymentEntry,
    };
  }

  @Put('appointment/:id/accept-reschedule')
  async acceptReschedule(@Param('id') id: string) {
    const reservationRepo = this.tenantRepo.manager.getRepository(Reservation);
    const reservation = await reservationRepo.findOne({ where: { id } });
    if (!reservation) throw new NotFoundException('Cita no encontrada');
    
    reservation.rescheduleStatus = 'ACCEPTED';
    const saved = await reservationRepo.save(reservation);

    try {
      await this.notificationsService.sendNotificationToNegocio(saved.tenantId, {
        title: '✅ Reprogramación Aceptada',
        body: `${saved.customerName} ha aceptado el nuevo horario para su cita del ${saved.date} a las ${saved.time.substring(0, 5)}.`,
        data: {
          url: '/reservations',
          reservationId: saved.id,
          type: 'APPOINTMENT_ACCEPTED'
        }
      }, ['ADMIN', 'CAJERO']);
    } catch (err) {}

    try {
      await this.notificationsService.notifyCustomerAppointment(saved, {
        title: '✅ Horario Confirmado',
        body: `Tu cita ha quedado confirmada para el ${saved.date} a las ${saved.time.substring(0, 5)}.`
      });
    } catch (err) {}

    return { success: true, message: 'Reprogramación aceptada' };
  }

  @Get('tenant/:tenantId/availability')
  async getAvailability(
    @Param('tenantId') tenantToken: string, 
    @Query('date') date: string, 
    @Query('serviceId') serviceId: string,
    @Query('exclude') excludeReservationId?: string,
    @Query('employeeId') employeeId?: string
  ) {
    let id: string;
    try {
      id = decodeTenantId(tenantToken);
    } catch {
      throw new NotFoundException('Negocio no encontrado o enlace inválido');
    }
    return this.calculateAvailableSlots(id, date, serviceId, excludeReservationId, employeeId);
  }

  @Get('tenant/:tenantId/catalog')
  async getCatalog(@Param('tenantId') token: string, @Query('page') pageStr: string = '1', @Query('limit') limitStr: string = '10') {
    let id: string;
    try { id = decodeTenantId(token); } catch { throw new NotFoundException('Enlace inválido'); }
    
    const page = parseInt(pageStr, 10) || 1;
    const limit = parseInt(limitStr, 10) || 10;
    const offset = (page - 1) * limit;

    const settingsRepo = this.tenantRepo.manager.getRepository(Settings);
    const settings = await settingsRepo.findOne({ where: { tenantId: id } });
    if (!settings?.featureShowCatalog) {
      throw new BadRequestException('El catálogo no está habilitado');
    }

    const productRepo = this.tenantRepo.manager.getRepository(Product);
    const orderItemRepo = this.tenantRepo.manager.getRepository(OrderItem);

    // We want to combine Product images and OrderItem media.
    // For simplicity, we can fetch all product images and order media, sort by date, and paginate.
    // Since we don't have created_at on Product images natively (it's a JSON array), we will fetch:
    // 1. OrderItemMedia (descending by createdAt)
    // 2. Products with images (we'll just use the products and append them)
    
    // Instead of complex SQL, we'll fetch them, map into a unified format, sort, and slice.
    // This is fine for small to medium scale. For huge scale, we'd need a unified view or unified table.
    
    const products = await productRepo.find({
      where: { tenantId: id },
      relations: { variants: true },
    });
    const serviceProducts = products.filter(p => {
      if (p.product_type === 'SERVICIO') return true;
      if (p.product_type === 'REVENTA' || p.product_type === 'FORMULA') return false;
      return p.is_service === true || p.category === 'Servicios';
    });

    const productItems = serviceProducts
      .filter(p => {
        const hasImgs = Array.isArray(p.images) ? p.images.length > 0 : Boolean(p.images);
        const hasVariantImgs = p.variants?.some(v => Array.isArray(v.images) && v.images.length > 0);
        return hasImgs || hasVariantImgs;
      })
      .map(p => {
        const rawImages = Array.isArray(p.images)
          ? p.images
          : (typeof p.images === 'string' && (p.images as string).trim() ? (p.images as string).split(',').map(s => s.trim()) : []);
        const variantImages = (p.variants || []).flatMap(v => Array.isArray(v.images) ? v.images : []);
        const validImages = Array.from(new Set([...rawImages, ...variantImages].filter(Boolean)));

        return {
          id: `prod-${p.id}`,
          type: 'service',
          productId: p.id,
          badge: 'Servicio',
          url: validImages[0] || '',
          images: validImages,
          title: p.name,
          subtitle: `Precio: $${Number(p.salePrice || 0).toFixed(2)}${p.durationMinutes ? ` • ${p.durationMinutes} min` : ''}`,
          date: p.updatedAt || p.createdAt || new Date(),
        };
      });

    const orderItems = await orderItemRepo.find({
      where: { order: { tenantId: id } },
      relations: { media: true, order: true }
    });
    
    const orderItemsWithMedia = orderItems
      .filter(oi => oi.media && oi.media.length > 0)
      .map(oi => {
        const validImages = oi.media.map(m => m.imageUrl).filter(Boolean);
        return {
          id: `order-item-${oi.id}`,
          type: 'work',
          badge: 'Trabajo Realizado',
          url: validImages[0] || '',
          images: validImages,
          title: oi.productName || 'Trabajo Realizado',
          subtitle: oi.order?.customerName ? `Cliente: ${oi.order.customerName}` : 'Trabajo completado',
          date: oi.media[0]?.createdAt || oi.order?.createdAt || new Date(),
        };
      });

    const reservationRepo = this.tenantRepo.manager.getRepository(Reservation);
    const completedReservations = await reservationRepo.find({
      where: {
        tenantId: id,
        status: ReservationStatus.COMPLETED,
      },
    });

    const reservationItems = completedReservations
      .filter(r => Boolean(r.imageUrl))
      .map(r => ({
        id: `res-${r.id}`,
        type: 'work',
        productId: r.serviceId,
        badge: 'Trabajo Realizado',
        url: r.imageUrl,
        images: [r.imageUrl],
        title: r.serviceName || 'Servicio Realizado',
        subtitle: r.customerName ? `Cliente: ${r.customerName}` : 'Servicio finalizado',
        date: r.updatedAt || r.date || r.createdAt || new Date(),
      }));

    const combined = [...productItems, ...reservationItems, ...orderItemsWithMedia];
    // Sort descending by date
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = combined.length;
    const paginated = combined.slice(offset, offset + limit);

    return {
      data: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  @Put('appointment/:id/reschedule')
  async rescheduleAppointment(@Param('id') id: string, @Body() dto: { date: string, time: string }) {
    return await this.tenantRepo.manager.transaction(async (manager) => {
      const reservationRepo = manager.getRepository(Reservation);
      const reservation = await reservationRepo.findOne({ where: { id } });

      if (!reservation) throw new NotFoundException('Cita no encontrada');
      if (reservation.status === ReservationStatus.COMPLETED || reservation.status === ReservationStatus.CANCELED) {
        throw new BadRequestException('No puedes reprogramar una cita pasada o cancelada.');
      }

      const today = new Date().toISOString().split('T')[0];
      if (dto.date < today) {
        throw new BadRequestException('No puedes agendar en el pasado.');
      }

      // Concurrency lock for date & tenant
      await manager.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`${reservation.tenantId}_${dto.date}`]);

      // validate availability
      const isAvailable = await this.checkSlotAvailability(reservation.tenantId, dto.date, dto.time, reservation.serviceId, reservation.id, reservation.employeeId);
      if (!isAvailable) {
        throw new BadRequestException('El nuevo horario no está disponible o choca con otra cita.');
      }

      const oldTimeStr = reservation.time.substring(0, 5);
      const oldDateStr = reservation.date;
      if (!reservation.originalTime) reservation.originalTime = oldTimeStr;
      if (!reservation.originalDate) reservation.originalDate = oldDateStr;

      reservation.date = dto.date;
      reservation.time = dto.time.length <= 5 ? dto.time + ':00' : dto.time;
      reservation.status = ReservationStatus.PENDING; // Rescheduling resets to pending usually
      reservation.rescheduleStatus = 'ACCEPTED';
      const saved = await reservationRepo.save(reservation);

      const newTimeDisplay = saved.time.substring(0, 5);

      // Notificar al negocio
      try {
        await this.notificationsService.sendNotificationToNegocio(reservation.tenantId, {
          title: '🗓️ Cita Reprogramada por Cliente',
          body: `${reservation.customerName} reprogramó su cita del ${oldDateStr} (${oldTimeStr}) para el ${saved.date} a las ${newTimeDisplay}.`,
          data: {
            url: '/reservations',
            reservationId: reservation.id,
            type: 'APPOINTMENT_RESCHEDULED'
          }
        }, ['ADMIN', 'CAJERO']);
      } catch (err) {}

      // Notificar confirmación al cliente
      try {
        await this.notificationsService.notifyCustomerAppointment(saved, {
          title: '🗓️ Cita Reprogramada Exitosamente',
          body: `Tu cita fue actualizada para el ${saved.date} a las ${newTimeDisplay}.`
        });
      } catch (err) {}

      // Sincronizar orden vinculada (fecha/hora requerida y notas)
      try {
        const orderRepo = manager.getRepository(Order);
        const linkedOrder = await orderRepo.findOne({
          where: [
            ...(saved.orderId ? [{ id: saved.orderId, tenantId: saved.tenantId }] : []),
            { linkedReservationId: saved.id, tenantId: saved.tenantId }
          ]
        });
        if (linkedOrder) {
          const timePart = saved.time ? (saved.time.length <= 5 ? `${saved.time}:00` : saved.time) : '12:00:00';
          const parsedD = new Date(`${saved.date}T${timePart}-04:00`);
          if (!isNaN(parsedD.getTime())) linkedOrder.requestedDeliveryDate = parsedD;
          const prefix = `[Cita: ${saved.date} ${newTimeDisplay}]`;
          if (linkedOrder.notes && linkedOrder.notes.includes('[Cita:')) {
            linkedOrder.notes = linkedOrder.notes.replace(/\[Cita:[^\]]*\]/, prefix);
          } else if (linkedOrder.notes) {
            linkedOrder.notes = `${prefix} ${linkedOrder.notes}`;
          } else {
            linkedOrder.notes = prefix;
          }
          await orderRepo.save(linkedOrder);
        }
      } catch (orderErr) {
        console.error('Error sincronizando Order en rescheduleAppointment:', orderErr);
      }

      return { success: true };
    });
  }

  @Put('appointment/:id/cancel')
  async cancelAppointment(@Param('id') id: string) {
    const reservationRepo = this.tenantRepo.manager.getRepository(Reservation);
    const reservation = await reservationRepo.findOne({ where: { id } });
    
    if (!reservation) throw new NotFoundException('Cita no encontrada');
    if (reservation.status === ReservationStatus.COMPLETED) {
      throw new BadRequestException('No puedes cancelar una cita completada.');
    }
    
    reservation.status = ReservationStatus.CANCELED;
    const saved = await reservationRepo.save(reservation);

    // Sincronizar cancelación en orden vinculada
    try {
      const orderRepo = this.tenantRepo.manager.getRepository(Order);
      const linkedOrder = await orderRepo.findOne({
        where: [
          ...(saved.orderId ? [{ id: saved.orderId, tenantId: saved.tenantId }] : []),
          { linkedReservationId: saved.id, tenantId: saved.tenantId }
        ]
      });
      if (linkedOrder && linkedOrder.status !== OrderStatus.CANCELED) {
        linkedOrder.status = OrderStatus.CANCELED;
        await orderRepo.save(linkedOrder);
      }
    } catch (orderErr) {
      console.error('Error sincronizando Order en cancelAppointment:', orderErr);
    }

    try {
      await this.notificationsService.sendNotificationToNegocio(saved.tenantId, {
        title: '❌ Cita Cancelada por Cliente',
        body: `${saved.customerName} canceló su cita del ${saved.date} a las ${saved.time.substring(0, 5)}.`,
        data: {
          url: '/reservations',
          reservationId: saved.id,
          type: 'APPOINTMENT_CANCELED'
        }
      }, ['ADMIN', 'CAJERO']);
    } catch (err) {}

    try {
      await this.notificationsService.notifyCustomerAppointment(saved, {
        title: '❌ Cita Cancelada',
        body: `Tu cita para "${saved.serviceName || 'Servicio'}" del ${saved.date} ha sido cancelada exitosamente.`
      });
    } catch (err) {}

    return { success: true };
  }

  @Post('appointment/:id/feedback')
  async submitAppointmentFeedback(@Param('id') id: string, @Body() dto: { content: string; clientName?: string }) {
    const reservationRepo = this.tenantRepo.manager.getRepository(Reservation);
    const reservation = await reservationRepo.findOne({ where: { id } });
    if (!reservation) throw new NotFoundException('Cita no encontrada');
    
    // We will save this feedback. It requires importing Feedback entity and FeedbackType from entities.
    // We can also just use manager.
    const feedbackRepo = this.tenantRepo.manager.getRepository('Feedback');
    const feedback = feedbackRepo.create({
      tenantId: reservation.tenantId,
      type: 'CLIENT_TO_BUSINESS',
      content: dto.content,
      clientName: dto.clientName || reservation.customerName,
      clientPhone: reservation.customerPhone
    });
    await feedbackRepo.save(feedback);

    try {
      await this.notificationsService.sendNotificationToNegocio(reservation.tenantId, {
        title: '⭐ Nueva Opinión de Cita',
        body: `${dto.clientName || reservation.customerName} dejó una opinión: "${dto.content.substring(0, 80)}${dto.content.length > 80 ? '...' : ''}"`,
        data: {
          url: '/feedback',
          type: 'NEW_FEEDBACK'
        }
      }, ['ADMIN', 'CAJERO']);
    } catch (err) {}

    return { success: true };
  }

  // --- Helper Methods ---

  private async calculateAvailableSlots(tenantId: string, date: string, serviceId?: string, excludeReservationId?: string, employeeId?: string) {
    const settingsRepo = this.tenantRepo.manager.getRepository(Settings);
    const settings = await settingsRepo.findOne({ where: { tenantId } });

    const hasConfiguredHours = settings?.businessHours && Object.keys(settings.businessHours).length > 0;
    const bHours = hasConfiguredHours ? settings.businessHours : {};
    const d = new Date(date + 'T12:00:00Z');
    const dayOfWeek = d.getUTCDay().toString();
    let dayConfig = bHours[dayOfWeek];

    if (!hasConfiguredHours) {
      // Default fallback when business hasn't configured custom hours yet:
      // Open all days from 08:00 to 18:00
      dayConfig = { isOpen: true, startTime: '08:00', endTime: '18:00' };
    } else if (!dayConfig || !dayConfig.isOpen) {
      return [];
    }

    const interval = Number(settings?.slotInterval) || 30;

    const shifts: { start: number; end: number }[] = [];
    const [sh, sm] = (dayConfig.startTime || '08:00').split(':').map(Number);
    const [eh, em] = (dayConfig.endTime || '18:00').split(':').map(Number);
    shifts.push({ start: (sh || 8) * 60 + (sm || 0), end: (eh || 18) * 60 + (em || 0) });

    if (dayConfig.hasSecondShift && dayConfig.secondStartTime && dayConfig.secondEndTime) {
      const [s2h, s2m] = dayConfig.secondStartTime.split(':').map(Number);
      const [e2h, e2m] = dayConfig.secondEndTime.split(':').map(Number);
      shifts.push({ start: (s2h || 0) * 60 + (s2m || 0), end: (e2h || 0) * 60 + (e2m || 0) });
    }

    const toMins = (t?: string | null) => {
      if (!t || typeof t !== 'string' || !t.includes(':')) return null;
      const [h, m] = t.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return null;
      return h * 60 + m;
    };

    const getStaffBounds = (st: any) => {
      const entry = toMins(st?.entryTime);
      let exit = toMins(st?.exitTime);
      // Auto-corrección defensiva: si salida < entrada pero sumar 12 horas la hace válida (error común 12h vs 24h, ej: 05:00 o 06:00 en vez de 17:00 o 18:00)
      if (entry !== null && exit !== null && exit < entry && exit + 720 <= 1440 && exit + 720 > entry) {
        exit += 720;
      }
      const lStart = toMins(st?.lunchStart);
      const lEnd = toMins(st?.lunchEnd);
      return { entry, exit, lStart, lEnd };
    };

    // Query products for service durations (match by ID and name)
    const productRepo = this.tenantRepo.manager.getRepository(Product);
    const allProducts = await productRepo.find({ where: { tenantId } });
    const productMap = new Map<string, Product>(allProducts.map(p => [p.id, p]));
    const productNameMap = new Map<string, Product>(allProducts.map(p => [p.name.trim().toLowerCase(), p]));

    const allAssignedStaffIds = new Set<string>();
    for (const p of allProducts) {
      const raw = (p as any)?.assignedStaffIds;
      if (Array.isArray(raw)) {
        raw.forEach(sid => allAssignedStaffIds.add(String(sid).trim()));
      } else if (typeof raw === 'string' && raw.trim()) {
        raw.split(',').forEach(sid => allAssignedStaffIds.add(sid.trim()));
      }
    }

    // Query active staff in tenant
    const accessRepo = this.tenantRepo.manager.getRepository(UserTenantAccess);
    let staffList: any[] = [];
    try {
      const allAccesses = await accessRepo.find({
        where: { tenantId, isActive: true, status: 'ACCEPTED' },
        relations: { user: true },
      });
      staffList = allAccesses.filter(a => {
        if (!a.user) return false;
        if (employeeId && (a.user.id === employeeId || a.id === employeeId)) return true;
        if (allAssignedStaffIds.has(a.user.id) || allAssignedStaffIds.has(a.id)) return true;

        const userRoles: string[] = Array.isArray(a.roles) && a.roles.length > 0
          ? a.roles
          : [a.role || a.user.role].filter(Boolean);
        const isExclusivelyDelivery = userRoles.length > 0 && userRoles.every(r => r === UserRole.DELIVERY);
        if (isExclusivelyDelivery) return false;

        const titleAndName = `${a.jobTitle || ''} ${a.user?.name || ''} ${a.user?.username || ''}`.toLowerCase();
        const isCosmetic = /limpieza\s*(facial|cutis|profunda|cejas)|faciales|facial\b/i.test(titleAndName);
        const isJanitorial = !isCosmetic && /(personal de limpieza|aseador|conserje|vigilancia|seguridad|\baseo\b|\blimpieza\b)/i.test(titleAndName);
        if (isJanitorial) return false;

        return true;
      });
    } catch (staffErr) {
      console.warn('[PublicReservations] Error consultando staff en slots:', staffErr);
      staffList = [];
    }

    let duration = 0;
    if (serviceId) {
      const sIds = serviceId.split(',').map(s => s.trim()).filter(Boolean);
      for (const sId of sIds) {
        const sp = productMap.get(sId);
        if (sp && sp.durationMinutes) {
          duration += Number(sp.durationMinutes);
        } else {
          duration += interval;
        }
      }
    }
    if (duration <= 0) {
      duration = interval;
    }

    // Determine candidate staff pool
    let candidateStaff = staffList;
    const requestedServices = serviceId
      ? serviceId.split(',').map(s => productMap.get(s.trim())).filter(Boolean) as Product[]
      : [];
    if (requestedServices.length > 0) {
      const requiredStaffIdSets = requestedServices
        .map(s => {
          const raw = (s as any)?.assignedStaffIds;
          if (Array.isArray(raw)) return raw;
          if (typeof raw === 'string' && raw.trim()) return raw.split(',').map((x: string) => x.trim()).filter(Boolean);
          return [];
        })
        .filter(arr => Array.isArray(arr) && arr.length > 0);

      if (requiredStaffIdSets.length > 0) {
        const isStaffInSet = (st: any, set: string[]) =>
          set.includes(st.userId) || set.includes(st.id) || (st.user && set.includes(st.user.id));

        const activeStaffIdSets = requiredStaffIdSets.filter(set =>
          staffList.some(st => isStaffInSet(st, set))
        );

        if (activeStaffIdSets.length > 0) {
          const staffDoingAll = candidateStaff.filter(st =>
            activeStaffIdSets.every(set => isStaffInSet(st, set))
          );
          if (staffDoingAll.length > 0) {
            candidateStaff = staffDoingAll;
          } else {
            const partialStaff = candidateStaff.filter(st =>
              activeStaffIdSets.some(set => isStaffInSet(st, set))
            );
            if (partialStaff.length > 0) {
              candidateStaff = partialStaff;
            }
          }
        }
      }
    }

    if (employeeId) {
      const empFiltered = candidateStaff.filter(s => s.userId === employeeId || s.id === employeeId || s.user?.id === employeeId);
      if (empFiltered.length > 0) {
        candidateStaff = empFiltered;
      } else {
        const single = await accessRepo.findOne({
          where: { userId: employeeId, tenantId, isActive: true, status: 'ACCEPTED' },
          relations: { user: true },
        });
        if (single) {
          candidateStaff = [single];
        } else {
          candidateStaff = [];
        }
      }
    }

    if (employeeId && candidateStaff.length === 0) {
      return [];
    }

    // Fetch existing reservations
    const reservationRepo = this.tenantRepo.manager.getRepository(Reservation);
    const qb = reservationRepo.createQueryBuilder('res')
      .where('res.tenantId = :tenantId', { tenantId })
      .andWhere('res.date = :date', { date })
      .andWhere('res.status IN (:...statuses)', { statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] });

    if (excludeReservationId) {
      qb.andWhere('res.id != :exclude', { exclude: excludeReservationId });
    }
    const existing = await qb.getMany();

    interface BusyBooking {
      employeeId: string | null;
      start: number;
      end: number;
      isBlock?: boolean;
      serviceId?: string;
    }

    const busyBookings: BusyBooking[] = [];
    for (const r of existing) {
      const [rh, rm] = (r.time || '00:00').trim().split(':').map(Number);
      const startMins = (rh || 0) * 60 + (rm || 0);
      let rDuration = Number(r.durationMinutes) || 0;

      if (rDuration === 0 && r.serviceId) {
        const ids = r.serviceId.split(',').map(s => s.trim()).filter(Boolean);
        for (const id of ids) {
          const sp = productMap.get(id);
          if (sp && sp.durationMinutes) {
            rDuration += Number(sp.durationMinutes);
          } else {
            rDuration += interval;
          }
        }
      }
      if (rDuration === 0 && r.serviceName) {
        const names = r.serviceName.split(',').map(s => s.trim().toLowerCase());
        for (const nm of names) {
          const sp = productNameMap.get(nm);
          if (sp && sp.durationMinutes) {
            rDuration += Number(sp.durationMinutes);
          } else {
            rDuration += interval;
          }
        }
      }
      if (rDuration === 0) {
        rDuration = interval;
      }

      if (Array.isArray(r.serviceSpecialists) && r.serviceSpecialists.length > 0 && !r.isBlock) {
        let segStart = startMins;
        for (const s of r.serviceSpecialists) {
          const sp = s.serviceId ? productMap.get(s.serviceId) : null;
          const dur = Number(s.durationMinutes) || Number(sp?.durationMinutes) || interval;
          busyBookings.push({
            employeeId: s.employeeId || null,
            start: segStart,
            end: segStart + dur,
            isBlock: false,
            serviceId: s.serviceId || r.serviceId,
          });
          segStart += dur;
        }
      } else {
        busyBookings.push({
          employeeId: r.employeeId || null,
          start: startMins,
          end: startMins + rDuration,
          isBlock: Boolean(r.isBlock),
          serviceId: r.serviceId,
        });
      }
    }

    const slots: string[] = [];
    const timeZone = (settings as any)?.timezone || process.env.BUSINESS_TIMEZONE || 'America/Caracas';
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const [nowH, nowM] = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()).split(':').map(Number);
    const currentRealMins = (nowH || 0) * 60 + (nowM || 0);

    const isSoloBusiness = staffList.length === 0 || candidateStaff.length === 0;

    for (const shift of shifts) {
      let currentMins = shift.start;
      while (currentMins + duration <= shift.end) {
        // If it's today, filter out past slots
        if (date === todayStr && currentMins <= currentRealMins) {
          currentMins += interval;
          continue;
        }

        const slotEnd = currentMins + duration;

        // Check store-wide schedule blocks first (isBlock = true and no employeeId)
        const hasStoreBlock = busyBookings.some(b => b.isBlock && !b.employeeId && currentMins < b.end && slotEnd > b.start);
        if (hasStoreBlock) {
          currentMins += interval;
          continue;
        }

        if (isSoloBusiness) {
          // Solo business (single operator / no staff accounts configured)
          const hasOverlap = busyBookings.some(b => currentMins < b.end && slotEnd > b.start);
          if (!hasOverlap) {
            const timeStr = this.minutesToTime(currentMins).substring(0, 5);
            if (!slots.includes(timeStr)) {
              slots.push(timeStr);
            }
          }
        } else if (employeeId) {
          // Specific employee requested
          const emp = candidateStaff[0];
          if (emp) {
            // Check shift bounds
            const { entry: empEntry, exit: empExit, lStart, lEnd } = getStaffBounds(emp);
            if (empEntry !== null && currentMins < empEntry) {
              currentMins += interval;
              continue;
            }
            if (empExit !== null && slotEnd > empExit) {
              currentMins += interval;
              continue;
            }
            // Check lunch break
            if (lStart !== null && lEnd !== null && currentMins < lEnd && slotEnd > lStart) {
              currentMins += interval;
              continue;
            }
            // Check direct overlapping reservations for this employee
            const empDirectOverlap = busyBookings.some(
              b => (b.employeeId === emp.userId || b.employeeId === emp.id || b.employeeId === emp.user?.id) && currentMins < b.end && slotEnd > b.start
            );
            if (!empDirectOverlap) {
              // Also ensure unassigned bookings haven't exhausted capacity or locked this specialist
              const overlappingUnassigned = busyBookings.filter(
                b => !b.employeeId && !b.isBlock && currentMins < b.end && slotEnd > b.start
              );
              let isBlockedByUnassigned = false;
              for (const ub of overlappingUnassigned) {
                let ubQualifiedStaff = staffList;
                if (ub.serviceId) {
                  const ubProd = productMap.get(ub.serviceId);
                  const raw: any = ubProd?.assignedStaffIds;
                  let ubAssignedIds: string[] = [];
                  if (Array.isArray(raw)) ubAssignedIds = raw;
                  else if (typeof raw === 'string' && raw.trim()) ubAssignedIds = raw.split(',').map((x: string) => x.trim()).filter(Boolean);
                  if (ubAssignedIds.length > 0) {
                    const match = staffList.filter(st => ubAssignedIds.includes(st.userId) || ubAssignedIds.includes(st.id) || (st.user && ubAssignedIds.includes(st.user.id)));
                    if (match.length > 0) ubQualifiedStaff = match;
                  }
                }
                const isEmpQualifiedForUb = ubQualifiedStaff.some(st => st.userId === emp.userId || st.id === emp.id || st.user?.id === emp.user?.id);
                if (isEmpQualifiedForUb) {
                  const otherFree = ubQualifiedStaff.filter(st => {
                    if (st.userId === emp.userId || st.id === emp.id || st.user?.id === emp.user?.id) return false;
                    const { entry: se, exit: sx, lStart: sls, lEnd: sle } = getStaffBounds(st);
                    if (se !== null && currentMins < se) return false;
                    if (sx !== null && slotEnd > sx) return false;
                    if (sls !== null && sle !== null && currentMins < sle && slotEnd > sls) return false;
                    return !busyBookings.some(b => (b.employeeId === st.userId || b.employeeId === st.id || b.employeeId === st.user?.id) && currentMins < b.end && slotEnd > b.start);
                  });
                  if (otherFree.length === 0) {
                    isBlockedByUnassigned = true;
                    break;
                  }
                }
              }
              if (isBlockedByUnassigned) {
                currentMins += interval;
                continue;
              }

              if (overlappingUnassigned.length > 0) {
                const totalFreeWorkingStaff = staffList.filter(s => {
                  const { entry: sEntry, exit: sExit, lStart: sLStart, lEnd: sLEnd } = getStaffBounds(s);
                  if (sEntry !== null && currentMins < sEntry) return false;
                  if (sExit !== null && slotEnd > sExit) return false;
                  if (sLStart !== null && sLEnd !== null && currentMins < sLEnd && slotEnd > sLStart) return false;
                  return !busyBookings.some(b => (b.employeeId === s.userId || b.employeeId === s.id || b.employeeId === s.user?.id) && currentMins < b.end && slotEnd > b.start);
                }).length;

                if (totalFreeWorkingStaff <= overlappingUnassigned.length) {
                  currentMins += interval;
                  continue;
                }
              }

              const timeStr = this.minutesToTime(currentMins).substring(0, 5);
              if (!slots.includes(timeStr)) {
                slots.push(timeStr);
              }
            }
          }
        } else if (requestedServices.length > 1) {
          // Multi-service coordinated availability:
          // Check if each sequential service segment has qualified staff available during its specific time window
          let segStart = currentMins;
          let allSegmentsFeasible = true;

          for (const sProd of requestedServices) {
            const sDur = Number((sProd as any).durationMinutes) || interval;
            const segEnd = segStart + sDur;

            let segQualifiedStaff = staffList;
            const raw = (sProd as any)?.assignedStaffIds;
            let assignedIds: string[] = [];
            if (Array.isArray(raw)) assignedIds = raw;
            else if (typeof raw === 'string' && raw.trim()) assignedIds = raw.split(',').map((x: string) => x.trim()).filter(Boolean);

            if (assignedIds.length > 0) {
              const matched = segQualifiedStaff.filter(st =>
                assignedIds.includes(st.userId) || assignedIds.includes(st.id) || assignedIds.includes(st.user?.id)
              );
              // Graceful fallback: Si los especialistas asignados no están activos o ya no existen,
              // no bloquear la disponibilidad completa del día; usar el equipo activo disponible
              segQualifiedStaff = matched.length > 0 ? matched : staffList;
            }

            const freeForThisSegment = segQualifiedStaff.filter(st => {
              const { entry: stEntry, exit: stExit, lStart: stLStart, lEnd: stLEnd } = getStaffBounds(st);
              if (stEntry !== null && segStart < stEntry) return false;
              if (stExit !== null && segEnd > stExit) return false;
              if (stLStart !== null && stLEnd !== null && segStart < stLEnd && segEnd > stLStart) return false;
              return !busyBookings.some(b =>
                (b.employeeId === st.userId || b.employeeId === st.id || b.employeeId === st.user?.id) &&
                segStart < b.end && segEnd > b.start
              );
            });

            const unassignedInSegment = busyBookings.filter(
              b => !b.employeeId && !b.isBlock && segStart < b.end && segEnd > b.start
            ).length;

            if (freeForThisSegment.length - unassignedInSegment <= 0) {
              allSegmentsFeasible = false;
              break;
            }

            segStart = segEnd;
          }

          if (allSegmentsFeasible) {
            const timeStr = this.minutesToTime(currentMins).substring(0, 5);
            if (!slots.includes(timeStr)) {
              slots.push(timeStr);
            }
          }
        } else {
          // General / Multi-staff capacity calculation
          const freeCandidateStaff = candidateStaff.filter(st => {
            const { entry: stEntry, exit: stExit, lStart: stLStart, lEnd: stLEnd } = getStaffBounds(st);
            if (stEntry !== null && currentMins < stEntry) return false;
            if (stExit !== null && slotEnd > stExit) return false;
            if (stLStart !== null && stLEnd !== null && currentMins < stLEnd && slotEnd > stLStart) return false;
            return !busyBookings.some(b => (b.employeeId === st.userId || b.employeeId === st.id || b.employeeId === st.user?.id) && currentMins < b.end && slotEnd > b.start);
          });

          const unassignedOverlapCount = busyBookings.filter(
            b => !b.employeeId && !b.isBlock && currentMins < b.end && slotEnd > b.start
          ).length;

          const availableCapacity = freeCandidateStaff.length - unassignedOverlapCount;

          if (availableCapacity > 0) {
            const timeStr = this.minutesToTime(currentMins).substring(0, 5);
            if (!slots.includes(timeStr)) {
              slots.push(timeStr);
            }
          }
        }

        currentMins += interval;
      }
    }

    return slots;
  }

  private async checkSlotAvailability(tenantId: string, date: string, time: string, serviceId?: string, excludeReservationId?: string, employeeId?: string) {
    const slots = await this.calculateAvailableSlots(tenantId, date, serviceId, excludeReservationId, employeeId);
    return slots.includes(time.substring(0, 5));
  }

  private minutesToTime(m: number): string {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`;
  }
}
