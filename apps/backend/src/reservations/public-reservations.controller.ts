import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { Controller, Post, Body, Param, Get, NotFoundException, BadRequestException, Put, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReservationsService } from './reservations.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, In } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { Settings } from '../entities/settings.entity';
import { Reservation } from '../entities/reservation.entity';
import { Product } from '../entities/product.entity';
import { ReservationStatus, PaymentStatus, DeliveryMethod, OrderStatus } from '@finowork/shared-types';
import { decodeTenantId } from '../utils/tenant-crypto';
import { Public } from '../auth/public.decorator';
import { OrderItem } from '../entities/order-item.entity';
import { Order } from '../entities/order.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { CustomersService } from '../customers/customers.service';
import { StorageService } from '../storage/storage.service';
import { isTenantSuspendedOrExpired } from '../utils/tenant-status';

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
}

@Public()
@Controller('public/reservations')
export class PublicReservationsController {
  constructor(
    private readonly reservationsService: ReservationsService,
    private readonly customersService: CustomersService,
    private readonly storageService: StorageService,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>
  ) {}

  @Post('appointment/upload-proof')
  @UseInterceptors(FileInterceptor('file'))
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
        settings: { companyPhone: settings?.companyPhone || '' },
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

    const services = onlyServices.map(p => ({
      id: p.id,
      name: p.name,
      price: p.salePrice,
      durationMinutes: p.durationMinutes || settings?.slotInterval || 30,
      category: p.category,
      assignedStaffIds: p.assignedStaffIds || [],
      product_type: 'SERVICIO',
      is_service: true,
      image: p.images && p.images.length > 0 ? (Array.isArray(p.images) ? p.images[p.images.length - 1] : String(p.images).split(',').pop()?.trim()) : null
    }));

    // Fetch active staff if staff selection is allowed
    let staff: any[] = [];
    if (settings?.bookingAllowStaffSelection) {
      const accessRepo = this.tenantRepo.manager.getRepository(UserTenantAccess);
      const accesses = await accessRepo.find({
        where: { tenantId: id, isActive: true, status: 'ACCEPTED' },
        relations: { user: true },
        order: { user: { username: 'ASC' } }
      });
      staff = accesses
        .filter(a => !!a.user)
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
    }

    const hasStore = ((settings?.featureBuySell || settings?.featureRecipes) && settings?.featureShowCatalog !== false) ?? false;

    let rate = Number(settings?.exchangeRateBs || 0);
    if (!rate || rate === 40.0) {
      const globalSettings = await settingsRepo.findOne({ where: { id: 'GLOBAL' } });
      rate = Number(globalSettings?.exchangeRateBs || 40.0);
    }

    return { 
      id: token, 
      name: tenant.name,
      businessHours: settings?.businessHours || null,
      services: services,
      slotInterval: settings?.slotInterval || 30,
      featureShowCatalog: settings?.featureShowCatalog || false,
      bookingRequireService: settings?.bookingRequireService ?? true,
      bookingAllowStaffSelection: settings?.bookingAllowStaffSelection ?? false,
      bookingMaxAdvanceDays: Number(settings?.bookingMaxAdvanceDays || 365),
      featureBuySell: settings?.featureBuySell ?? false,
      featureRecipes: settings?.featureRecipes ?? false,
      featureCustomerSchedules: settings?.featureCustomerSchedules ?? false,
      hasStore: Boolean(hasStore),
      staff: staff,
      exchangeRateBs: rate,
      minDepositPercentage: Number(settings?.bookingDepositPercentage ?? settings?.minDepositPercentage ?? 0),
      bookingRequireDeposit: settings?.bookingRequireDeposit ?? (Number(settings?.bookingDepositPercentage ?? settings?.minDepositPercentage) > 0),
      bookingDepositPercentage: Number(settings?.bookingDepositPercentage ?? settings?.minDepositPercentage ?? 0),
      allowPartialPayments: settings?.allowPartialPayments ?? true,
      bankInfo: settings?.companyBank || '',
      companyCedula: settings?.companyCedula || '',
      companyPhone: settings?.companyPhone || '',
      companyAccountNumber: settings?.companyAccountNumber || '',
      companyAccountHolder: settings?.companyAccountHolder || '',
      binancePayId: settings?.binancePayId || '',
      binanceEmail: settings?.binanceEmail || '',
      acceptCashUsd: settings?.acceptCashUsd ?? true,
      acceptPagoMovil: settings?.acceptPagoMovil ?? true,
      acceptTransfer: settings?.acceptTransfer ?? false,
      acceptBinance: settings?.acceptBinance ?? false,
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
    
    // Check overlap using new logic
    const isAvailable = await this.checkSlotAvailability(id, dto.date, dto.time, dto.serviceId, undefined, dto.employeeId);
    if (!isAvailable) {
      throw new BadRequestException('El horario seleccionado ya no está disponible.');
    }

    const settingsRepo = this.tenantRepo.manager.getRepository(Settings);
    const settings = await settingsRepo.findOne({ where: { tenantId: id } });

    const totalAmount = Number(dto.totalAmount || 0);
    const isDepositRequired = settings?.bookingRequireDeposit ?? (Number(settings?.bookingDepositPercentage ?? settings?.minDepositPercentage) > 0);
    const minDepositPct = isDepositRequired ? Number(settings?.bookingDepositPercentage ?? settings?.minDepositPercentage ?? 0) : 0;

    // Validate payment reference and minimum deposit
    if (minDepositPct > 0 && totalAmount > 0) {
      if (dto.paymentMethod === 'CASH') {
        throw new BadRequestException(`Este negocio requiere un abono mínimo del ${minDepositPct}% para agendar citas. Debes abonar mediante un método electrónico.`);
      }
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
    } else if (dto.paymentMethod && dto.paymentMethod !== 'CASH') {
      if (!dto.paymentReference || !dto.paymentReference.trim()) {
        throw new BadRequestException('Por favor ingresa el número de referencia del comprobante de pago.');
      }
    }

    // Synchronize customer profile
    let resolvedCustomerId: string | undefined = undefined;
    let resolvedIdentification: string | undefined = dto.identification;
    if (dto.customerName && dto.customerPhone) {
      try {
        const customer = await this.customersService.findOrCreateOrUpdate(id, {
          name: dto.customerName,
          phone: dto.customerPhone,
          identification: dto.identification
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
      notes: dto.notes?.trim(),
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

    // Auto-crear y sincronizar orden vinculada para que aparezca en Pedidos/Tickets y Caja
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
        const timePart = dto.time ? `${dto.time}:00` : '12:00:00';
        const parsedD = new Date(`${dto.date}T${timePart}`);
        if (!isNaN(parsedD.getTime())) reqDeliveryDate = parsedD;
      }

      const linkedOrder = orderRepo.create({
        tenantId: id,
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
      });

      const savedOrder = await orderRepo.save(linkedOrder);
      finalReservation.orderId = savedOrder.id;
      const reservationRepo = this.tenantRepo.manager.getRepository(Reservation);
      await reservationRepo.save(finalReservation);

      if (finalReservation.serviceId) {
        const sIds = finalReservation.serviceId.split(',').map((s: string) => s.trim()).filter(Boolean);
        for (const sId of sIds) {
          const prod = await productRepo.findOne({ where: { id: sId } });
          if (prod) {
            const item = orderItemRepo.create({
              orderId: savedOrder.id,
              productId: prod.id,
              productName: prod.name,
              quantity: 1,
              unitPrice: Number(prod.salePrice || 0),
              subtotal: Number(prod.salePrice || 0),
            });
            await orderItemRepo.save(item);
          }
        }
      }
    } catch (orderErr) {
      console.error('Error auto-creating linked order for reservation:', orderErr);
    }

    return finalReservation;
  }

  @Get('appointment/:id')
  async getAppointment(@Param('id') id: string) {
    const reservationRepo = this.tenantRepo.manager.getRepository(Reservation);
    const reservation = await reservationRepo.findOne({ where: { id }, relations: { tenant: true } });
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
    // Si llega la hora de su anterior cita antes de la reprogramación y no ha aceptado, se marca como aceptada automáticamente
    if (reservation.rescheduleStatus === 'PENDING_ACCEPTANCE' && reservation.originalTime) {
      const origDateStr = reservation.originalDate || reservation.date;
      const [h, m] = reservation.originalTime.split(':').map(Number);
      const originalDateTime = new Date(`${origDateStr}T${(h || 0).toString().padStart(2, '0')}:${(m || 0).toString().padStart(2, '0')}:00`);
      
      if (new Date() >= originalDateTime) {
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
      serviceId: reservation.serviceId,
      serviceName: reservation.serviceName,
      status: reservation.status,
      tenantName: reservation.tenant.name,
      tenantId: reservation.tenantId, // Real tenant UUID is OK to return here since they already have the appointment UUID
      servicePrice: totalAmount,
      totalAmount: totalAmount,
      abonosTotal: abonosTotal,
      remainingAmount: remainingAmount,
      paymentStatus: reservation.paymentStatus || 'PENDING',
      paymentReported: Boolean(reservation.paymentReported),
      paymentProofUrl: reservation.paymentProofUrl || null,
      paymentRejectedReason: reservation.paymentRejectedReason || null,
      durationMinutes: serviceDetails?.durationMinutes || 30,
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
    reservation.notes = reservation.notes ? `${reservation.notes} | ${noteTag}` : noteTag;

    await reservationRepo.save(reservation);

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
    await reservationRepo.save(reservation);
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
    
    const products = await productRepo.find({ where: { tenantId: id } });
    const serviceProducts = products.filter(p => {
      if (p.product_type === 'SERVICIO') return true;
      if (p.product_type === 'REVENTA' || p.product_type === 'FORMULA') return false;
      return p.is_service === true || p.category === 'Servicios';
    });

    const productImages = serviceProducts
      .filter(p => p.images && p.images.length > 0)
      .flatMap(p => p.images.map((img, i) => ({
        id: `prod-${p.id}-${i}`,
        type: 'service',
        productId: p.id,
        badge: 'Servicio',
        url: img,
        title: p.name,
        subtitle: `Precio: $${Number(p.salePrice || 0).toFixed(2)}${p.durationMinutes ? ` • ${p.durationMinutes} min` : ''}`,
        date: p.updatedAt // Approximated
      })));

    const orderItems = await orderItemRepo.find({
      where: { order: { tenantId: id } },
      relations: { media: true, order: true }
    });
    
    const orderImages = orderItems
      .filter(oi => oi.media && oi.media.length > 0)
      .flatMap(oi => oi.media.map(m => ({
        id: `media-${m.id}`,
        type: 'work',
        badge: 'Trabajo Realizado',
        url: m.imageUrl,
        title: oi.productName || 'Trabajo Realizado',
        subtitle: oi.order?.customerName ? `Cliente: ${oi.order.customerName}` : 'Trabajo completado',
        date: m.createdAt
      })));

    const reservationRepo = this.tenantRepo.manager.getRepository(Reservation);
    const completedReservations = await reservationRepo.find({
      where: {
        tenantId: id,
        status: ReservationStatus.COMPLETED,
      },
    });

    const reservationImages = completedReservations
      .filter(r => Boolean(r.imageUrl))
      .map(r => ({
        id: `res-${r.id}`,
        type: 'work',
        productId: r.serviceId,
        badge: 'Trabajo Realizado',
        url: r.imageUrl,
        title: r.serviceName || 'Servicio Realizado',
        subtitle: r.customerName ? `Cliente: ${r.customerName}` : 'Servicio finalizado',
        date: r.updatedAt || r.date || r.createdAt,
      }));

    const combined = [...productImages, ...reservationImages, ...orderImages];
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
    const reservationRepo = this.tenantRepo.manager.getRepository(Reservation);
    const reservation = await reservationRepo.findOne({ where: { id } });
    
    if (!reservation) throw new NotFoundException('Cita no encontrada');
    if (reservation.status === ReservationStatus.COMPLETED || reservation.status === ReservationStatus.CANCELED) {
      throw new BadRequestException('No puedes reprogramar una cita pasada o cancelada.');
    }

    const today = new Date().toISOString().split('T')[0];
    if (dto.date < today) {
      throw new BadRequestException('No puedes agendar en el pasado.');
    }

    // validate availability
    const isAvailable = await this.checkSlotAvailability(reservation.tenantId, dto.date, dto.time, reservation.serviceId, reservation.id, reservation.employeeId);
    if (!isAvailable) {
      throw new BadRequestException('El nuevo horario no está disponible o choca con otra cita.');
    }

    reservation.date = dto.date;
    reservation.time = dto.time.length <= 5 ? dto.time + ':00' : dto.time;
    reservation.status = ReservationStatus.PENDING; // Rescheduling resets to pending usually
    reservation.rescheduleStatus = 'ACCEPTED';
    await reservationRepo.save(reservation);

    return { success: true };
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
    await reservationRepo.save(reservation);
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
    return { success: true };
  }

  // --- Helper Methods ---

  private async calculateAvailableSlots(tenantId: string, date: string, serviceId?: string, excludeReservationId?: string, employeeId?: string) {
    const settingsRepo = this.tenantRepo.manager.getRepository(Settings);
    const settings = await settingsRepo.findOne({ where: { tenantId } });

    const bHours = settings?.businessHours || {};
    const d = new Date(date + 'T12:00:00Z');
    const dayOfWeek = d.getUTCDay().toString();
    const dayConfig = bHours[dayOfWeek];

    if (!dayConfig || !dayConfig.isOpen) return [];

    const interval = Number(settings?.slotInterval) || 30;

    const shifts: { start: number; end: number }[] = [];
    const [sh, sm] = (dayConfig.startTime || '08:00').split(':').map(Number);
    const [eh, em] = (dayConfig.endTime || '18:00').split(':').map(Number);
    shifts.push({ start: sh * 60 + sm, end: eh * 60 + em });

    if (dayConfig.hasSecondShift && dayConfig.secondStartTime && dayConfig.secondEndTime) {
      const [s2h, s2m] = dayConfig.secondStartTime.split(':').map(Number);
      const [e2h, e2m] = dayConfig.secondEndTime.split(':').map(Number);
      shifts.push({ start: s2h * 60 + s2m, end: e2h * 60 + e2m });
    }

    // Fetch employee individual settings if employeeId provided
    let empAccess: UserTenantAccess | null = null;
    if (employeeId) {
      const accessRepo = this.tenantRepo.manager.getRepository(UserTenantAccess);
      empAccess = await accessRepo.findOne({
        where: { userId: employeeId, tenantId, isActive: true, status: 'ACCEPTED' },
      });
    }

    const toMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    // Fetch existing reservations
    const reservationRepo = this.tenantRepo.manager.getRepository(Reservation);
    const qb = reservationRepo.createQueryBuilder('res')
      .where('res.tenantId = :tenantId', { tenantId })
      .andWhere('res.date = :date', { date })
      .andWhere('res.status IN (:...statuses)', { statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] });
      
    if (excludeReservationId) {
      qb.andWhere('res.id != :exclude', { exclude: excludeReservationId });
    }
    if (employeeId) {
      qb.andWhere('(res.employeeId = :employeeId OR res.employeeId IS NULL)', { employeeId });
    }
    const existing = await qb.getMany();

    // Query products for service durations (match by ID and name)
    const productRepo = this.tenantRepo.manager.getRepository(Product);
    const allProducts = await productRepo.find({ where: { tenantId } });
    const productMap = new Map<string, Product>(allProducts.map(p => [p.id, p]));
    const productNameMap = new Map<string, Product>(allProducts.map(p => [p.name.trim().toLowerCase(), p]));

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

    // Map existing into busy intervals [startMins, endMins]
    const busyIntervals = existing.map(r => {
      const [rh, rm] = r.time.split(':').map(Number);
      const startMins = rh * 60 + rm;
      let rDuration = 0;
      
      if (r.serviceId) {
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

      return { start: startMins, end: startMins + rDuration };
    });

    const slots: string[] = [];
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const [vzH, vzM] = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Caracas', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).split(':').map(Number);
    const currentRealMins = vzH * 60 + vzM;

    for (const shift of shifts) {
      let currentMins = shift.start;
      while (currentMins + duration <= shift.end) {
        // If it's today, filter out past slots
        if (date === todayStr && currentMins <= currentRealMins) {
          currentMins += interval;
          continue;
        }

        const slotEnd = currentMins + duration;

        // Check employee constraints if employeeId provided
        if (empAccess) {
          // Lunch break exclusion: slotStart < toMins(lunchEnd) && slotEnd > toMins(lunchStart)
          if (empAccess.lunchStart && empAccess.lunchEnd) {
            const lStart = toMins(empAccess.lunchStart);
            const lEnd = toMins(empAccess.lunchEnd);
            if (currentMins < lEnd && slotEnd > lStart) {
              currentMins += interval;
              continue;
            }
          }

          // Individual shift constraints:
          if (empAccess.entryTime && currentMins < toMins(empAccess.entryTime)) {
            currentMins += interval;
            continue;
          }
          if (empAccess.exitTime && slotEnd > toMins(empAccess.exitTime)) {
            currentMins += interval;
            continue;
          }
        }

        // Check overlap: new slot [currentMins, slotEnd) overlaps with [busy.start, busy.end)
        const overlaps = busyIntervals.some(busy => {
          return currentMins < busy.end && slotEnd > busy.start;
        });

        if (!overlaps) {
          const timeStr = this.minutesToTime(currentMins).substring(0, 5);
          if (!slots.includes(timeStr)) {
            slots.push(timeStr);
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
