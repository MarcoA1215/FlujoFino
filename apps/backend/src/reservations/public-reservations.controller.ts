import { Controller, Post, Body, Param, Get, NotFoundException, BadRequestException, Put, Query } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, In } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { Settings } from '../entities/settings.entity';
import { Reservation } from '../entities/reservation.entity';
import { Product } from '../entities/product.entity';
import { ReservationStatus } from '@nutrideli/shared-types';
import { decodeTenantId } from '../utils/tenant-crypto';
import { Public } from '../auth/public.decorator';
import { OrderItem } from '../entities/order-item.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { CustomersService } from '../customers/customers.service';

@Public()
@Controller('public/reservations')
export class PublicReservationsController {
  constructor(
    private readonly reservationsService: ReservationsService,
    private readonly customersService: CustomersService,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>
  ) {}

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
        .map(a => ({
          id: a.user.id,
          name: a.user.username,
          jobTitle: a.jobTitle || undefined
        }));
    }

    const hasStore = (settings?.featureBuySell || settings?.featureRecipes) ?? false;

    return { 
      id: token, 
      name: tenant.name,
      businessHours: settings?.businessHours || null,
      services: services,
      slotInterval: settings?.slotInterval || 30,
      featureShowCatalog: settings?.featureShowCatalog || false,
      bookingRequireService: settings?.bookingRequireService ?? true,
      bookingAllowStaffSelection: settings?.bookingAllowStaffSelection ?? false,
      featureBuySell: settings?.featureBuySell ?? false,
      featureRecipes: settings?.featureRecipes ?? false,
      featureCustomerSchedules: settings?.featureCustomerSchedules ?? false,
      hasStore: Boolean(hasStore),
      staff: staff
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
  async createPublicReservation(@Param('tenantId') token: string, @Body() dto: any) {
    let id: string;
    try {
      id = decodeTenantId(token);
    } catch {
      throw new NotFoundException('Enlace inválido');
    }
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Negocio no encontrado');
    
    // Check overlap using new logic
    const isAvailable = await this.checkSlotAvailability(id, dto.date, dto.time, dto.serviceId, undefined, dto.employeeId);
    if (!isAvailable) {
      throw new BadRequestException('El horario seleccionado ya no está disponible.');
    }

    // Synchronize customer profile
    if (dto.customerName && dto.customerPhone) {
      try {
        const customer = await this.customersService.findOrCreateOrUpdate(id, {
          name: dto.customerName,
          phone: dto.customerPhone,
          identification: dto.identification
        });
        dto.customerId = customer.id;
        if (!dto.identification && customer.identification) {
          dto.identification = customer.identification;
        }
      } catch (err) {
        console.error('Customer sync error in public reservation:', err);
      }
    }

    // Create reservation natively
    return this.reservationsService.create(id, dto);
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

    return {
      id: reservation.id,
      customerName: reservation.customerName,
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
      servicePrice: Number(reservation.totalAmount) || serviceDetails?.price || 0,
      durationMinutes: serviceDetails?.durationMinutes || 30,
      bankInfo: settings?.companyBank,
      companyCedula: settings?.companyCedula,
      companyPhone: settings?.companyPhone,
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

    const combined = [...productImages, ...orderImages];
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

    const [sh, sm] = dayConfig.startTime.split(':').map(Number);
    const [eh, em] = dayConfig.endTime.split(':').map(Number);
    const closeMinutes = eh * 60 + em;

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
    let currentMins = sh * 60 + sm;
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const [vzH, vzM] = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Caracas', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).split(':').map(Number);
    const currentRealMins = vzH * 60 + vzM;

    while (currentMins + duration <= closeMinutes) {
      // If it's today, filter out past slots
      if (date === todayStr && currentMins <= currentRealMins) {
        currentMins += interval;
        continue;
      }

      // Check overlap: new slot [currentMins, currentMins + duration) overlaps with [busy.start, busy.end)
      const slotEnd = currentMins + duration;
      const overlaps = busyIntervals.some(busy => {
        return currentMins < busy.end && slotEnd > busy.start;
      });

      if (!overlaps) {
        slots.push(this.minutesToTime(currentMins).substring(0, 5));
      }

      currentMins += interval;
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
