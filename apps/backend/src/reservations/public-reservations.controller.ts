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

@Public()
@Controller('public/reservations')
export class PublicReservationsController {
  constructor(
    private readonly reservationsService: ReservationsService,
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

    const services = products.map(p => ({
      id: p.id,
      name: p.name,
      price: p.salePrice,
      durationMinutes: p.durationMinutes || settings?.slotInterval || 30,
      category: p.category
    }));

    return { 
      id: token, 
      name: tenant.name,
      businessHours: settings?.businessHours || null,
      services: services,
      slotInterval: settings?.slotInterval || 30,
      featureShowCatalog: settings?.featureShowCatalog || false
    };
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
    const isAvailable = await this.checkSlotAvailability(id, dto.date, dto.time, dto.serviceId);
    if (!isAvailable) {
      throw new BadRequestException('El horario seleccionado ya no está disponible.');
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
      const p = await productRepo.findOne({ where: { id: reservation.serviceId } });
      if (p) {
        serviceDetails = { price: p.salePrice, durationMinutes: p.durationMinutes };
      }
    }

    return {
      id: reservation.id,
      customerName: reservation.customerName,
      date: reservation.date,
      time: reservation.time.substring(0, 5),
      serviceId: reservation.serviceId,
      serviceName: reservation.serviceName,
      status: reservation.status,
      tenantName: reservation.tenant.name,
      tenantId: reservation.tenantId, // Real tenant UUID is OK to return here since they already have the appointment UUID
      servicePrice: serviceDetails?.price || 0,
      bankInfo: settings?.companyBank,
      companyCedula: settings?.companyCedula,
      companyPhone: settings?.companyPhone,
    };
  }

  @Get('tenant/:tenantId/availability')
  async getAvailability(
    @Param('tenantId') tenantId: string, 
    @Query('date') date: string, 
    @Query('serviceId') serviceId: string,
    @Query('exclude') excludeReservationId?: string
  ) {
    return this.calculateAvailableSlots(tenantId, date, serviceId, excludeReservationId);
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
    const productImages = products
      .filter(p => p.images && p.images.length > 0)
      .flatMap(p => p.images.map((img, i) => ({
        id: `prod-${p.id}-${i}`,
        type: 'product',
        url: img,
        title: p.name,
        subtitle: `Precio: $${p.salePrice.toFixed(2)}`,
        date: p.updatedAt // Approximated
      })));

    const orderItems = await orderItemRepo.find({
      where: { tenantId: id },
      relations: { media: true, order: true }
    });
    
    const orderImages = orderItems
      .filter(oi => oi.media && oi.media.length > 0)
      .flatMap(oi => oi.media.map(m => ({
        id: `media-${m.id}`,
        type: 'work',
        url: m.imageUrl,
        title: oi.productName || 'Trabajo Realizado',
        subtitle: oi.order?.customerName ? `Para: ${oi.order.customerName}` : 'Trabajo completado',
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
    const isAvailable = await this.checkSlotAvailability(reservation.tenantId, dto.date, dto.time, reservation.serviceId, reservation.id);
    if (!isAvailable) {
      throw new BadRequestException('El nuevo horario no está disponible o choca con otra cita.');
    }

    reservation.date = dto.date;
    reservation.time = dto.time.length <= 5 ? dto.time + ':00' : dto.time;
    reservation.status = ReservationStatus.PENDING; // Rescheduling resets to pending usually
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

  private async calculateAvailableSlots(tenantId: string, date: string, serviceId?: string, excludeReservationId?: string) {
    const settingsRepo = this.tenantRepo.manager.getRepository(Settings);
    const settings = await settingsRepo.findOne({ where: { tenantId } });

    const bHours = settings?.businessHours || {};
    const d = new Date(date + 'T12:00:00Z');
    const dayOfWeek = d.getUTCDay().toString();
    const dayConfig = bHours[dayOfWeek];

    if (!dayConfig || !dayConfig.isOpen) return [];

    const interval = settings?.slotInterval || 30;

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
    const existing = await qb.getMany();

    // Query products for service durations
    const productRepo = this.tenantRepo.manager.getRepository(Product);
    const serviceIds = [serviceId, ...existing.map(r => r.serviceId)].filter((sid): sid is string => !!sid);
    const products = serviceIds.length > 0 
      ? await productRepo.find({ where: { id: In(serviceIds) } }) 
      : [];
    const productMap = new Map<string, Product>(products.map(p => [p.id, p]));

    let duration = interval;
    if (serviceId && productMap.has(serviceId)) {
      const sp = productMap.get(serviceId);
      if (sp && sp.durationMinutes) duration = sp.durationMinutes;
    }

    // Map existing into busy intervals [startMins, endMins]
    const busyIntervals = existing.map(r => {
      const [rh, rm] = r.time.split(':').map(Number);
      const startMins = rh * 60 + rm;
      let rDuration = interval;
      if (r.serviceId && productMap.has(r.serviceId)) {
        const s = productMap.get(r.serviceId);
        if (s && s.durationMinutes) rDuration = s.durationMinutes;
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

      // Check overlap
      const slotEnd = currentMins + duration;
      const overlaps = busyIntervals.some(busy => {
        // Overlap condition: start < busy.end AND end > busy.start
        return currentMins < busy.end && slotEnd > busy.start;
      });

      if (!overlaps) {
        slots.push(this.minutesToTime(currentMins).substring(0, 5));
      }

      currentMins += interval;
    }

    return slots;
  }

  private async checkSlotAvailability(tenantId: string, date: string, time: string, serviceId?: string, excludeReservationId?: string) {
    const slots = await this.calculateAvailableSlots(tenantId, date, serviceId, excludeReservationId);
    return slots.includes(time.substring(0, 5));
  }

  private minutesToTime(m: number): string {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`;
  }
}
