import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Reservation } from '../entities/reservation.entity';
import { Order } from '../entities/order.entity';
import { ReservationStatus, PaymentStatus } from '@finowork/shared-types';
import { CustomersService } from '../customers/customers.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private repo: Repository<Reservation>,
    private readonly customersService: CustomersService,
    private readonly notificationsService: NotificationsService,
    private readonly storageService: StorageService,
  ) {}

  findAll(tenantId: string) {
    return this.repo.find({ where: { tenantId }, order: { date: 'ASC', time: 'ASC' } });
  }

  async validateBusinessHours(tenantId: string, date: string, time: string, durationMinutes = 30) {
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

    const toMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const reqMins = toMins(time);
    const reqEndMins = reqMins + durationMinutes;
    const start1 = toMins(dayConfig.startTime || '08:00');
    const end1 = toMins(dayConfig.endTime || '18:00');
    const inShift1 = reqMins >= start1 && reqEndMins <= end1;

    let inShift2 = false;
    if (dayConfig.hasSecondShift && dayConfig.secondStartTime && dayConfig.secondEndTime) {
      const start2 = toMins(dayConfig.secondStartTime);
      const end2 = toMins(dayConfig.secondEndTime);
      inShift2 = reqMins >= start2 && reqEndMins <= end2;
    }

    if (!inShift1 && !inShift2) {
      const formatTime = (m: number) => {
        const h = Math.floor(m / 60);
        const min = m % 60;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${min.toString().padStart(2, '0')} ${ampm}`;
      };

      if (dayConfig.hasSecondShift) {
        throw new BadRequestException(
          `El horario de atención es de ${dayConfig.startTime} a ${dayConfig.endTime} y de ${dayConfig.secondStartTime} a ${dayConfig.secondEndTime}. La cita terminaría a las ${formatTime(reqEndMins)}, pero el local está fuera de los turnos de apertura.`
        );
      } else {
        throw new BadRequestException(
          `La cita terminaría a las ${formatTime(reqEndMins)}, pero el local cierra a las ${dayConfig.endTime}.`
        );
      }
    }
  }

  async validateSlotOverlap(tenantId: string, date: string, time: string, serviceId?: string, serviceName?: string, excludeId?: string, employeeId?: string, manager?: EntityManager) {
    const resRepo = manager ? manager.getRepository(Reservation) : this.repo;
    const qb = resRepo.createQueryBuilder('res')
      .where('res.tenantId = :tenantId', { tenantId })
      .andWhere('res.date = :date', { date })
      .andWhere('res.status IN (:...statuses)', { statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] });

    if (excludeId) {
      qb.andWhere('res.id != :exclude', { exclude: excludeId });
    }
    if (employeeId) {
      qb.andWhere('(res.employeeId = :employeeId OR res.employeeId IS NULL)', { employeeId });
    }
    const existing = await qb.getMany();

    const em = manager || this.repo.manager;
    const settingsRepo = em.getRepository('Settings');
    const settings: any = await settingsRepo.findOne({ where: { tenantId } });
    const interval = Number(settings?.slotInterval) || 30;

    const productRepo = em.getRepository('Product');
    const products: any[] = await productRepo.find({ where: { tenantId } });
    const productMap = new Map(products.map(p => [p.id, p]));
    const productNameMap = new Map(products.map(p => [p.name.trim().toLowerCase(), p]));

    // Determine requested reservation duration
    let reqDuration = 0;
    if (serviceId) {
      const sIds = serviceId.split(',').map(s => s.trim()).filter(Boolean);
      for (const sId of sIds) {
        const sp = productMap.get(sId);
        if (sp && sp.durationMinutes) reqDuration += Number(sp.durationMinutes);
        else reqDuration += interval;
      }
    }
    if (reqDuration === 0 && serviceName) {
      const names = serviceName.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      for (const nm of names) {
        const sp = productNameMap.get(nm);
        if (sp && sp.durationMinutes) reqDuration += Number(sp.durationMinutes);
        else reqDuration += interval;
      }
    }
    if (reqDuration <= 0) reqDuration = interval;

    const [th, tm] = time.split(':').map(Number);
    const reqStart = th * 60 + tm;
    const reqEnd = reqStart + reqDuration;

    if (employeeId) {
      const accessRepo = this.repo.manager.getRepository('UserTenantAccess');
      const access: any = await accessRepo.findOne({ where: { userId: employeeId, tenantId } });
      if (access) {
        const toMins = (t: string) => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        };
        if (access.lunchStart && access.lunchEnd) {
          const lStart = toMins(access.lunchStart);
          const lEnd = toMins(access.lunchEnd);
          if (reqStart < lEnd && reqEnd > lStart) {
            throw new BadRequestException(
              `El especialista seleccionado se encuentra en su horario de almuerzo/receso (${access.lunchStart} a ${access.lunchEnd}).`
            );
          }
        }
        if (access.entryTime && reqStart < toMins(access.entryTime)) {
          throw new BadRequestException(
            `El especialista seleccionado ingresa a las ${access.entryTime}. La cita inicia antes de su jornada laboral.`
          );
        }
        if (access.exitTime && reqEnd > toMins(access.exitTime)) {
          throw new BadRequestException(
            `El especialista seleccionado culmina a las ${access.exitTime}. La cita excede su jornada laboral.`
          );
        }
      }
    }

    if (existing.length === 0) return;

    for (const res of existing) {
      const [rh, rm] = res.time.split(':').map(Number);
      const exStart = rh * 60 + rm;
      let exDuration = 0;
      if (res.serviceId) {
        const sIds = res.serviceId.split(',').map(s => s.trim()).filter(Boolean);
        for (const sId of sIds) {
          const sp = productMap.get(sId);
          if (sp && sp.durationMinutes) exDuration += Number(sp.durationMinutes);
          else exDuration += interval;
        }
      }
      if (exDuration === 0 && res.serviceName) {
        const names = res.serviceName.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        for (const nm of names) {
          const sp = productNameMap.get(nm);
          if (sp && sp.durationMinutes) exDuration += Number(sp.durationMinutes);
          else exDuration += interval;
        }
      }
      if (exDuration <= 0) exDuration = interval;
      const exEnd = exStart + exDuration;

      // Overlap: reqStart < exEnd && reqEnd > exStart
      if (reqStart < exEnd && reqEnd > exStart) {
        const formatTime = (m: number) => {
          const h = Math.floor(m / 60);
          const min = m % 60;
          const ampm = h >= 12 ? 'PM' : 'AM';
          const h12 = h % 12 || 12;
          return `${h12}:${min.toString().padStart(2, '0')} ${ampm}`;
        };
        throw new BadRequestException(
          `El horario choca con la cita de "${res.customerName}" (${formatTime(exStart)} a ${formatTime(exEnd)}). Si deseas agendarla de todas formas, confirma para forzar.`
        );
      }
    }
  }

  private async calculateServiceDuration(tenantId: string, serviceId?: string, serviceName?: string): Promise<number> {
    const settingsRepo = this.repo.manager.getRepository('Settings');
    const settings: any = await settingsRepo.findOne({ where: { tenantId } });
    const interval = Number(settings?.slotInterval) || 30;

    const productRepo = this.repo.manager.getRepository('Product');
    const products: any[] = await productRepo.find({ where: { tenantId } });
    const productMap = new Map(products.map(p => [p.id, p]));
    const productNameMap = new Map(products.map(p => [p.name.trim().toLowerCase(), p]));

    let reqDuration = 0;
    if (serviceId) {
      const sIds = serviceId.split(',').map(s => s.trim()).filter(Boolean);
      for (const sId of sIds) {
        const sp = productMap.get(sId);
        if (sp && sp.durationMinutes) reqDuration += Number(sp.durationMinutes);
        else reqDuration += interval;
      }
    }
    if (reqDuration === 0 && serviceName) {
      const names = serviceName.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      for (const nm of names) {
        const sp = productNameMap.get(nm);
        if (sp && sp.durationMinutes) reqDuration += Number(sp.durationMinutes);
        else reqDuration += interval;
      }
    }
    return reqDuration > 0 ? reqDuration : interval;
  }

  async create(tenantId: string, dto: any) {
    return this.repo.manager.transaction(async (manager) => {
      if (dto.date && dto.time && !dto.force) {
        const duration = await this.calculateServiceDuration(tenantId, dto.serviceId, dto.serviceName);
        await this.validateBusinessHours(tenantId, dto.date, dto.time, duration);
        await this.validateSlotOverlap(tenantId, dto.date, dto.time, dto.serviceId, dto.serviceName, undefined, dto.employeeId, manager);
      }
      if (dto.numberOfPeople !== undefined && dto.numberOfPeople <= 0) throw new BadRequestException('La cantidad de personas debe ser mayor a 0');
      if (dto.totalAmount !== undefined && dto.totalAmount < 0) throw new BadRequestException('El monto total no puede ser negativo');
      
      const reservation = new Reservation();
      Object.assign(reservation, dto);
      reservation.tenantId = tenantId;

      if (dto.customerName && dto.customerPhone && !dto.customerId) {
        try {
          const customer = await this.customersService.findOrCreateOrUpdate(tenantId, {
            name: dto.customerName,
            phone: dto.customerPhone,
            identification: dto.identification
          });
          reservation.customerId = customer.id;
          if (!reservation.identification && customer.identification) {
            reservation.identification = customer.identification;
          }
        } catch (err) {
          console.error('Customer sync error in ReservationsService.create:', err);
        }
      }

      delete (reservation as any).abonosTotal; // Security: do not allow setting abonos directly
      delete (reservation as any).abonosHistory;
      this.recalculatePaymentStatus(reservation);
      return manager.save(Reservation, reservation);
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    if (dto.date && dto.time && !dto.force) {
      const duration = await this.calculateServiceDuration(tenantId, dto.serviceId, dto.serviceName);
      await this.validateBusinessHours(tenantId, dto.date, dto.time, duration);
      await this.validateSlotOverlap(tenantId, dto.date, dto.time, dto.serviceId, dto.serviceName, id, dto.employeeId);
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
    const abonoId = randomUUID();
    res.abonosHistory.push({ id: abonoId, amount, date: new Date().toISOString() });
    res.abonosTotal = Math.round(((res.abonosTotal || 0) + Number(amount)) * 100) / 100;
    
    this.recalculatePaymentStatus(res);
    return this.repo.save(res);
  }

  async revertAbono(tenantId: string, id: string, abonoIdentifier: string | number) {
    const res = await this.repo.findOne({ where: { id, tenantId } });
    if (!res) throw new BadRequestException('No encontrado');
    
    if (!res.abonosHistory || res.abonosHistory.length === 0) {
      throw new BadRequestException('No hay historial de abonos para revertir');
    }

    const abonoIdStr = String(abonoIdentifier);
    let targetIndex = res.abonosHistory.findIndex((a: any) => a.id === abonoIdStr);

    // Fallback retrocompatible para registros históricos sin UUID
    if (targetIndex === -1 && !isNaN(Number(abonoIdentifier))) {
      const numericIndex = Number(abonoIdentifier);
      if (res.abonosHistory[numericIndex]) {
        targetIndex = numericIndex;
      }
    }

    if (targetIndex === -1) {
      throw new BadRequestException('Abono no encontrado');
    }

    const removed = res.abonosHistory[targetIndex];
    const removedAmount = Number(removed.amount || 0);

    // Eliminación inmutable buscando y filtrando estrictamente por el id (UUID)
    if (removed.id) {
      res.abonosHistory = res.abonosHistory.filter((a: any) => a.id !== removed.id);
    } else {
      res.abonosHistory = res.abonosHistory.filter((_, idx) => idx !== targetIndex);
    }

    res.abonosTotal = Math.round(Math.max(0, (res.abonosTotal || 0) - removedAmount) * 100) / 100;
    this.recalculatePaymentStatus(res);
    return this.repo.save(res);
  }

  async payFull(tenantId: string, id: string) {
    const res = await this.repo.findOne({ where: { id, tenantId } });
    if (!res) throw new NotFoundException('Reserva no encontrada');
    const total = Number(res.totalAmount || 0);
    res.abonosTotal = total;
    res.abonosHistory = res.abonosHistory || [];
    res.abonosHistory.push({ id: randomUUID(), amount: total, date: new Date().toISOString(), status: 'APPROVED' });
    res.paymentStatus = PaymentStatus.PAID;
    res.paymentReported = false;
    res.paymentRejectedReason = null as any;
    return this.repo.save(res);
  }

  async approvePayment(tenantId: string, id: string) {
    const res = await this.repo.findOne({ where: { id, tenantId } });
    if (!res) throw new NotFoundException('Cita no encontrada');

    res.paymentStatus = PaymentStatus.PAID;
    res.paymentReported = false;
    res.paymentRejectedReason = null as any;

    if (Array.isArray(res.abonosHistory)) {
      res.abonosHistory = res.abonosHistory.map(entry => {
        if (entry.status === 'REPORTED' || entry.status === 'REPORTED_PENDING_APPROVAL') {
          return { ...entry, status: 'APPROVED' };
        }
        return entry;
      });
    }

    const total = Number(res.totalAmount || 0);
    if (Number(res.abonosTotal || 0) < total) {
      res.abonosTotal = total;
    }

    const savedRes = await this.repo.save(res);

    // Sincronización bidireccional con Order
    try {
      const orderRepo = this.repo.manager.getRepository(Order);
      const order = await orderRepo.findOne({
        where: [
          { id: res.orderId, tenantId },
          { linkedReservationId: res.id, tenantId }
        ]
      });
      if (order) {
        order.paymentStatus = PaymentStatus.PAID;
        order.paymentReported = false;
        order.paymentRejectedReason = null as any;
        order.abonosTotal = savedRes.abonosTotal;
        order.abonosHistory = savedRes.abonosHistory;
        await orderRepo.save(order);
      }
    } catch (err) {
      console.error('Error sincronizando Order al aprobar pago de cita:', err);
    }

    return savedRes;
  }

  async rejectPayment(tenantId: string, id: string, reason?: string) {
    const res = await this.repo.findOne({ where: { id, tenantId } });
    if (!res) throw new NotFoundException('Cita no encontrada');

    const cleanReason = (reason || 'No cayó / Comprobante inválido').trim();
    res.paymentStatus = PaymentStatus.PENDING;
    res.paymentReported = false;
    res.paymentRejectedReason = cleanReason;

    if (Array.isArray(res.abonosHistory)) {
      res.abonosHistory = res.abonosHistory.map(entry => {
        if (entry.status === 'REPORTED' || entry.status === 'REPORTED_PENDING_APPROVAL') {
          return { ...entry, status: 'REJECTED', rejectReason: cleanReason };
        }
        return entry;
      });
    }

    const noteTag = `[Comprobante rechazado: ${cleanReason}]`;
    res.notes = res.notes ? `${res.notes} | ${noteTag}` : noteTag;

    const savedRes = await this.repo.save(res);

    // Sincronización bidireccional con Order
    try {
      const orderRepo = this.repo.manager.getRepository(Order);
      const order = await orderRepo.findOne({
        where: [
          { id: res.orderId, tenantId },
          { linkedReservationId: res.id, tenantId }
        ]
      });
      if (order) {
        order.paymentStatus = PaymentStatus.PENDING;
        order.paymentReported = false;
        order.paymentRejectedReason = cleanReason;
        order.notes = order.notes ? `${order.notes} | ${noteTag}` : noteTag;
        await orderRepo.save(order);
      }
    } catch (err) {
      console.error('Error sincronizando Order al rechazar comprobante de cita:', err);
    }

    return savedRes;
  }

  private recalculatePaymentStatus(res: Reservation) {
    const total = Math.round(Number(res.totalAmount || 0) * 100) / 100;
    const abonos = Math.round(Number(res.abonosTotal || 0) * 100) / 100;
    const remaining = Math.round((total - abonos) * 100) / 100;

    if (total > 0) {
      if (abonos <= 0) res.paymentStatus = PaymentStatus.PENDING;
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

      const productRepo = manager.getRepository('Product');
      const products: any[] = await productRepo.find({ where: { tenantId } });
      const productMap = new Map(products.map(p => [p.id, p]));
      const productNameMap = new Map(products.map(p => [p.name.trim().toLowerCase(), p]));

      const affected: any[] = [];

      for (const res of reservations) {
        const startMins = this.timeToMinutes(res.time);
        const newStartMins = startMins + minutes;
        
        let duration = 0;
        if (res.serviceId) {
          const sIds = res.serviceId.split(',').map(s => s.trim()).filter(Boolean);
          for (const sId of sIds) {
            const sp = productMap.get(sId);
            if (sp && sp.durationMinutes) duration += Number(sp.durationMinutes);
            else duration += interval;
          }
        }
        if (duration === 0 && res.serviceName) {
          const names = res.serviceName.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
          for (const nm of names) {
            const sp = productNameMap.get(nm);
            if (sp && sp.durationMinutes) duration += Number(sp.durationMinutes);
            else duration += interval;
          }
        }
        if (duration <= 0) duration = interval;

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

  async notifyDelay(tenantId: string, id: string, minutes: number = 15) {
    const reservation = await this.repo.findOne({ where: { id, tenantId } });
    if (!reservation) {
      throw new NotFoundException('Reserva no encontrada');
    }

    const message = `Tu reserva tiene un retraso aproximado de ${minutes} minutos.`;
    const payload = {
      title: 'Aviso de Retraso de Reserva',
      body: message,
      data: {
        url: `/appointment/${id}`,
        reservationId: id,
      },
    };

    let sent = 0;
    if (reservation.customerPhone) {
      sent += await this.notificationsService.sendNotificationToIdentifier(
        reservation.customerPhone,
        payload,
      );
    }
    if (reservation.identification && reservation.identification !== reservation.customerPhone) {
      sent += await this.notificationsService.sendNotificationToIdentifier(
        reservation.identification,
        payload,
      );
    }

    return {
      success: true,
      sent,
      message: sent > 0 
        ? `Notificación enviada con éxito (${sent} dispositivo/s notificado/s).` 
        : `No se encontraron suscripciones push activas para el cliente.`,
    };
  }

  async uploadMedia(tenantId: string, id: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Archivo requerido');
    const reservation = await this.repo.findOne({ where: { id, tenantId } });
    if (!reservation) throw new NotFoundException('Reservación no encontrada');

    const url = await this.storageService.uploadFile(file, `tenant-${tenantId}/reservations`);
    reservation.imageUrl = url;
    await this.repo.save(reservation);
    return { url, reservation };
  }

  async removeMedia(tenantId: string, id: string) {
    const reservation = await this.repo.findOne({ where: { id, tenantId } });
    if (!reservation) throw new NotFoundException('Reservación no encontrada');
    reservation.imageUrl = null;
    await this.repo.save(reservation);
    return { success: true, reservation };
  }
}

