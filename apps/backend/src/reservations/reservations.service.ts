import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation } from '../entities/reservation.entity';
import { ReservationStatus, PaymentStatus } from '@nutrideli/shared-types';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private repo: Repository<Reservation>
  ) {}

  findAll(tenantId: string) {
    return this.repo.find({ where: { tenantId }, order: { date: 'ASC', time: 'ASC' } });
  }

  async validateBusinessHours(tenantId: string, date: string, time: string) {
    const settingsRepo = this.repo.manager.getRepository('Settings');
    const settings: any = await settingsRepo.findOne({ where: { tenantId } });
    if (!settings || !settings.businessHours) return;

    const bHours = settings.businessHours;
    const d = new Date(date + 'T12:00:00Z');
    const dayOfWeek = d.getUTCDay().toString();
    const dayConfig = bHours[dayOfWeek];

    if (!dayConfig || !dayConfig.isOpen) {
      throw new BadRequestException('El local está cerrado ese día.');
    }

    const [sh, sm] = dayConfig.startTime.split(':').map(Number);
    const [eh, em] = dayConfig.endTime.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    
    const [th, tm] = time.split(':').map(Number);
    const reqMins = th * 60 + tm;

    if (reqMins < startMins || reqMins >= endMins) {
      // Formatear a 12 horas para que se vea más amigable en el error
      const formatTime = (h: number, m: number) => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
      };
      throw new BadRequestException(`El horario laboral es de ${formatTime(sh, sm)} a ${formatTime(eh, em)}. No puedes agendar a las ${formatTime(th, tm)}.`);
    }
  }

  async create(tenantId: string, dto: any) {
    if (dto.date && dto.time && !dto.force) {
      await this.validateBusinessHours(tenantId, dto.date, dto.time);
    }
    if (dto.numberOfPeople !== undefined && dto.numberOfPeople <= 0) throw new BadRequestException('La cantidad de personas debe ser mayor a 0');
    if (dto.totalAmount !== undefined && dto.totalAmount < 0) throw new BadRequestException('El monto total no puede ser negativo');
    
    const reservation = new Reservation();
    Object.assign(reservation, dto);
    reservation.tenantId = tenantId;
    delete (reservation as any).abonosTotal; // Security: do not allow setting abonos directly
    delete (reservation as any).abonosHistory;
    this.recalculatePaymentStatus(reservation);
    return this.repo.save(reservation);
  }

  async update(tenantId: string, id: string, dto: any) {
    if (dto.date && dto.time && !dto.force) {
      await this.validateBusinessHours(tenantId, dto.date, dto.time);
    }
    if (dto.numberOfPeople !== undefined && dto.numberOfPeople <= 0) throw new BadRequestException('La cantidad de personas debe ser mayor a 0');
    if (dto.totalAmount !== undefined && dto.totalAmount < 0) throw new BadRequestException('El monto total no puede ser negativo');

    const reservation = await this.repo.findOne({ where: { id, tenantId } });
    if (!reservation) throw new BadRequestException('Reservación no encontrada');

    delete dto.id; // Security: cannot change ID
    delete dto.tenantId; // Security: cannot change tenant
    delete dto.abonosTotal;
    delete dto.abonosHistory;
    
    Object.assign(reservation, dto);
    this.recalculatePaymentStatus(reservation);
    return this.repo.save(reservation);
  }

  async updateStatus(tenantId: string, id: string, status: ReservationStatus) {
    const reservation = await this.repo.findOne({ where: { id, tenantId } });
    if (!reservation) throw new BadRequestException('Reservación no encontrada');
    reservation.status = status;
    return this.repo.save(reservation);
  }

  async delete(tenantId: string, id: string) {
    const reservation = await this.repo.findOne({ where: { id, tenantId } });
    if (!reservation) throw new BadRequestException('Reservación no encontrada');
    await this.repo.remove(reservation);
    return { success: true };
  }

  async addAbono(tenantId: string, id: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('El abono debe ser mayor a 0');
    const res = await this.repo.findOne({ where: { id, tenantId } });
    if (!res) throw new BadRequestException('No encontrado');
    
    res.abonosHistory = res.abonosHistory || [];
    res.abonosHistory.push({ amount, date: new Date().toISOString() });
    res.abonosTotal = (res.abonosTotal || 0) + amount;
    
    this.recalculatePaymentStatus(res);
    return this.repo.save(res);
  }

  async revertAbono(tenantId: string, id: string, index: number) {
    const res = await this.repo.findOne({ where: { id, tenantId } });
    if (!res) throw new BadRequestException('No encontrado');
    
    if (!res.abonosHistory || !res.abonosHistory[index]) {
      throw new BadRequestException('Abono inválido');
    }

    const removed = res.abonosHistory.splice(index, 1)[0];
    res.abonosTotal -= removed.amount;
    if (res.abonosTotal < 0) res.abonosTotal = 0;
    
    this.recalculatePaymentStatus(res);
    return this.repo.save(res);
  }

  private recalculatePaymentStatus(res: Reservation) {
    const remaining = (res.totalAmount || 0) - (res.abonosTotal || 0);
    if (res.totalAmount > 0) {
      if (res.abonosTotal === 0) res.paymentStatus = PaymentStatus.PENDING;
      else if (remaining <= 0) res.paymentStatus = PaymentStatus.PAID;
      else res.paymentStatus = PaymentStatus.PARTIAL;
    } else {
      res.paymentStatus = PaymentStatus.PENDING;
    }
  }

  async shiftPendingReservations(tenantId: string, date: string, timeFrom: string, minutes: number) {
    // Format timeFrom to strictly HH:mm:ss
    const tfFormatted = timeFrom.length <= 5 ? timeFrom + ':00' : timeFrom;
    
    return await this.repo.manager.transaction(async (manager) => {
      // 1. Fetch settings inside transaction (optional but clean)
      const settingsRepo = manager.getRepository('Settings');
      const settings: any = await settingsRepo.findOne({ where: { tenantId } });
      
      const bHours = settings?.businessHours || {};
      const d = new Date(date + 'T12:00:00Z');
      const dayOfWeek = d.getUTCDay().toString();
      const dayConfig = bHours[dayOfWeek];

      let closeMinutes = 24 * 60; // fallback to midnight
      if (dayConfig && dayConfig.isOpen && dayConfig.endTime) {
        closeMinutes = this.timeToMinutes(dayConfig.endTime);
      }

      const interval = settings?.slotInterval || 30;

      const reservations = await manager.createQueryBuilder(Reservation, 'res')
        .where('res.tenantId = :tenantId', { tenantId })
        .andWhere('res.date = :date', { date })
        .andWhere('res.time >= :timeFrom', { timeFrom: tfFormatted })
        .andWhere('res.status IN (:...statuses)', { statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] })
        .orderBy('res.time', 'ASC')
        .getMany();

      const affected: any[] = [];

      for (const res of reservations) {
        const startMins = this.timeToMinutes(res.time);
        const newStartMins = startMins + minutes;
        
        let duration = interval;
        if (res.serviceId && settings?.services) {
           const svc = settings.services.find((s: any) => s.id === res.serviceId);
           if (svc && svc.durationMinutes) duration = svc.durationMinutes;
        }

        const newEndMins = newStartMins + duration;

        if (newEndMins > closeMinutes) {
          throw new BadRequestException(`No se puede desplazar la cita de ${res.customerName} a las ${this.minutesToTime(newStartMins).substring(0,5)} porque sobrepasa la hora de cierre.`);
        }

        const oldTimeStr = this.minutesToTime(startMins).substring(0, 5);
        if (!res.originalTime) res.originalTime = oldTimeStr;
        if (!res.originalDate) res.originalDate = res.date;
        res.time = this.minutesToTime(newStartMins);
        res.rescheduleStatus = 'PENDING_ACCEPTANCE';
        await manager.save(res);

        const baseUrl = process.env.VITE_FRONTEND_URL || 'http://localhost:5173';
        const msg = `Hola ${res.customerName}, debido a un imprevisto en el servicio, tu cita de las ${oldTimeStr} ha sido reprogramada para las ${res.time.substring(0,5)}. Por favor confírmanos si estás de acuerdo en tu enlace: ${baseUrl}/appointment/${res.id}`;
        let phone = res.customerPhone || '';
        phone = phone.replace(/\D/g, '');
        if (phone && !phone.startsWith('58') && phone.length === 10) phone = '58' + phone;

        affected.push({
          id: res.id,
          customerName: res.customerName,
          oldTime: this.minutesToTime(startMins).substring(0,5),
          newTime: res.time.substring(0,5),
          whatsappLink: phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : null
        });
      }

      return affected;
    });
  }

  private timeToMinutes(t: string): number {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  private minutesToTime(m: number): string {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`;
  }
}

