import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Reservation } from '../entities/reservation.entity';
import { Order } from '../entities/order.entity';
import { ReservationStatus, PaymentStatus, UserRole } from '@finowork/shared-types';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
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
      const [h, m] = (t || '00:00').trim().split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
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

  async validateSlotOverlap(
    tenantId: string,
    date: string,
    time: string,
    serviceId?: string,
    serviceName?: string,
    excludeId?: string,
    employeeId?: string,
    manager?: EntityManager,
    explicitDuration?: number,
  ) {
    const em = manager || this.repo.manager;
    const settingsRepo = em.getRepository('Settings');
    const settings: any = await settingsRepo.findOne({ where: { tenantId } });
    const interval = Number(settings?.slotInterval) || 30;

    const productRepo = em.getRepository('Product');
    const products: any[] = await productRepo.find({ where: { tenantId } });
    const productMap = new Map(products.map(p => [p.id, p]));
    const productNameMap = new Map(products.map(p => [p.name.trim().toLowerCase(), p]));

    // Determine requested reservation duration
    let reqDuration = explicitDuration && explicitDuration > 0 ? explicitDuration : 0;
    if (reqDuration === 0 && serviceId) {
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

    const toMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const formatTime = (m: number) => {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${min.toString().padStart(2, '0')} ${ampm}`;
    };

    // Query active staff in tenant
    const accessRepo = em.getRepository(UserTenantAccess);
    const allStaff = await accessRepo.find({
      where: { tenantId, isActive: true, status: 'ACCEPTED' },
      relations: { user: true },
    });
    const staffList = allStaff.filter(a => {
      if (!a.user) return false;
      const userRoles: string[] = Array.isArray(a.roles) && a.roles.length > 0
        ? a.roles
        : [a.role || a.user.role].filter(Boolean);
      return !userRoles.every(r => r === UserRole.DELIVERY || r === UserRole.OPERATIVO);
    });

    // Query existing pending/confirmed reservations
    const resRepo = em.getRepository(Reservation);
    const qb = resRepo.createQueryBuilder('res')
      .where('res.tenantId = :tenantId', { tenantId })
      .andWhere('res.date = :date', { date })
      .andWhere('res.status IN (:...statuses)', { statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] });

    if (excludeId) {
      qb.andWhere('res.id != :exclude', { exclude: excludeId });
    }
    const existing = await qb.getMany();

    interface BusyBooking {
      employeeId: string | null;
      customerName: string;
      start: number;
      end: number;
    }

    const busyBookings: BusyBooking[] = existing.map(res => {
      const [rh, rm] = (res.time || '00:00').trim().split(':').map(Number);
      const exStart = (rh || 0) * 60 + (rm || 0);
      let exDuration = Number(res.durationMinutes) || 0;
      if (exDuration === 0 && res.serviceId) {
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
      return {
        employeeId: res.employeeId || null,
        customerName: res.customerName || 'Cliente',
        start: exStart,
        end: exStart + exDuration
      };
    });

    const isSoloBusiness = staffList.length === 0;

    if (isSoloBusiness) {
      for (const b of busyBookings) {
        if (reqStart < b.end && reqEnd > b.start) {
          throw new BadRequestException(
            `El horario choca con la cita de "${b.customerName}" (${formatTime(b.start)} a ${formatTime(b.end)}). Si deseas agendarla de todas formas, confirma para forzar.`
          );
        }
      }
      return;
    }

    if (employeeId) {
      if (serviceId) {
        const requestedServices = serviceId.split(',').map(s => productMap.get(s.trim())).filter(Boolean);
        const requiredStaffIdSets = requestedServices
          .map(s => (s as any)?.assignedStaffIds || [])
          .filter(arr => Array.isArray(arr) && arr.length > 0);

        if (requiredStaffIdSets.length > 0 && !requiredStaffIdSets.every(set => set.includes(employeeId))) {
          throw new BadRequestException('El especialista seleccionado no está asignado al servicio solicitado.');
        }
      }

      let emp = staffList.find(s => s.userId === employeeId);
      if (!emp) {
        emp = await accessRepo.findOne({ where: { userId: employeeId, tenantId, isActive: true, status: 'ACCEPTED' } }) as any;
      }

      if (emp) {
        if (emp.entryTime && reqStart < toMins(emp.entryTime)) {
          throw new BadRequestException(
            `El especialista seleccionado ingresa a las ${emp.entryTime.substring(0, 5)}. La cita inicia antes de su jornada laboral.`
          );
        }
        if (emp.exitTime && reqEnd > toMins(emp.exitTime)) {
          throw new BadRequestException(
            `El especialista seleccionado culmina a las ${emp.exitTime.substring(0, 5)}. La cita excede su jornada laboral.`
          );
        }
        if (emp.lunchStart && emp.lunchEnd) {
          const lStart = toMins(emp.lunchStart);
          const lEnd = toMins(emp.lunchEnd);
          if (reqStart < lEnd && reqEnd > lStart) {
            throw new BadRequestException(
              `El especialista seleccionado se encuentra en su horario de almuerzo/receso (${emp.lunchStart.substring(0, 5)} a ${emp.lunchEnd.substring(0, 5)}).`
            );
          }
        }
      }

      // Check direct collision with this employee
      const directCollision = busyBookings.find(
        b => b.employeeId === employeeId && reqStart < b.end && reqEnd > b.start
      );
      if (directCollision) {
        throw new BadRequestException(
          `El especialista ya tiene una cita asignada con "${directCollision.customerName}" (${formatTime(directCollision.start)} a ${formatTime(directCollision.end)}). Si deseas agendarla de todas formas, confirma para forzar.`
        );
      }

      // Check unassigned bookings consuming total staff capacity
      const unassignedCount = busyBookings.filter(
        b => !b.employeeId && reqStart < b.end && reqEnd > b.start
      ).length;
      if (unassignedCount > 0) {
        const totalFreeWorkingStaff = staffList.filter(s => {
          if (s.entryTime && reqStart < toMins(s.entryTime)) return false;
          if (s.exitTime && reqEnd > toMins(s.exitTime)) return false;
          if (s.lunchStart && s.lunchEnd && reqStart < toMins(s.lunchEnd) && reqEnd > toMins(s.lunchStart)) return false;
          return !busyBookings.some(b => b.employeeId === s.userId && reqStart < b.end && reqEnd > b.start);
        }).length;

        if (totalFreeWorkingStaff <= unassignedCount) {
          throw new BadRequestException(
            `No hay capacidad disponible a las ${formatTime(reqStart)}. Los cupos para esa hora se encuentran copados.`
          );
        }
      }
    } else {
      // General capacity check (no specific employee selected)
      let candidateStaff = staffList;
      if (serviceId) {
        const requestedServices = serviceId.split(',').map(s => productMap.get(s.trim())).filter(Boolean);
        const requiredStaffIdSets = requestedServices
          .map(s => (s as any)?.assignedStaffIds || [])
          .filter(arr => Array.isArray(arr) && arr.length > 0);

        if (requiredStaffIdSets.length > 0) {
          candidateStaff = candidateStaff.filter(st =>
            requiredStaffIdSets.every(set => set.includes(st.userId))
          );
        }
      }

      const freeCandidateStaff = candidateStaff.filter(st => {
        if (st.entryTime && reqStart < toMins(st.entryTime)) return false;
        if (st.exitTime && reqEnd > toMins(st.exitTime)) return false;
        if (st.lunchStart && st.lunchEnd && reqStart < toMins(st.lunchEnd) && reqEnd > toMins(st.lunchStart)) return false;
        return !busyBookings.some(b => b.employeeId === st.userId && reqStart < b.end && reqEnd > b.start);
      });

      const unassignedOverlapCount = busyBookings.filter(
        b => !b.employeeId && reqStart < b.end && reqEnd > b.start
      ).length;

      const availableCapacity = freeCandidateStaff.length - unassignedOverlapCount;

      if (availableCapacity <= 0) {
        throw new BadRequestException(
          `No hay especialistas disponibles en este horario (${formatTime(reqStart)} a ${formatTime(reqEnd)}). Todos los especialistas se encuentran ocupados o en receso.`
        );
      }
    }
  }

  private async calculateServiceDuration(tenantId: string, serviceId?: string, serviceName?: string, explicitMinutes?: number): Promise<number> {
    if (explicitMinutes && explicitMinutes > 0) return explicitMinutes;

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
      if (dto.date) {
        await manager.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`${tenantId}_${dto.date}`]);
      }

      const duration = dto.durationMinutes || await this.calculateServiceDuration(tenantId, dto.serviceId, dto.serviceName);

      if (dto.date && dto.time && !dto.force) {
        await this.validateBusinessHours(tenantId, dto.date, dto.time, duration);
        await this.validateSlotOverlap(tenantId, dto.date, dto.time, dto.serviceId, dto.serviceName, undefined, dto.employeeId, manager, duration);
      }
      if (dto.numberOfPeople !== undefined && dto.numberOfPeople <= 0) throw new BadRequestException('La cantidad de personas debe ser mayor a 0');
      if (dto.totalAmount !== undefined && dto.totalAmount < 0) throw new BadRequestException('El monto total no puede ser negativo');
      
      const reservation = new Reservation();
      Object.assign(reservation, dto);
      reservation.tenantId = tenantId;
      reservation.durationMinutes = duration;

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
      const saved = await manager.save(Reservation, reservation);

      try {
        await this.notificationsService.notifyCustomerAppointment(saved, {
          title: '📅 Cita Agendada con Éxito',
          body: `Tu cita para "${saved.serviceName || 'Servicio'}" el ${saved.date} a las ${saved.time.substring(0, 5)} ha sido registrada exitosamente.`
        });
      } catch (err) {}

      return saved;
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    return this.repo.manager.transaction(async (manager) => {
      const reservationRepo = manager.getRepository(Reservation);
      const reservation = await reservationRepo.findOne({ where: { id, tenantId } });
      if (!reservation) throw new BadRequestException('Reservación no encontrada');

      const targetDate = dto.date || reservation.date;
      const targetTime = dto.time || reservation.time;

      if (targetDate) {
        await manager.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`${tenantId}_${targetDate}`]);
      }

      const duration = dto.durationMinutes || reservation.durationMinutes || await this.calculateServiceDuration(tenantId, dto.serviceId || reservation.serviceId, dto.serviceName || reservation.serviceName);

      if ((dto.date || dto.time) && !dto.force) {
        await this.validateBusinessHours(tenantId, targetDate, targetTime, duration);
        await this.validateSlotOverlap(tenantId, targetDate, targetTime, dto.serviceId || reservation.serviceId, dto.serviceName || reservation.serviceName, id, dto.employeeId !== undefined ? dto.employeeId : reservation.employeeId, manager, duration);
      }
      if (dto.numberOfPeople !== undefined && dto.numberOfPeople <= 0) throw new BadRequestException('La cantidad de personas debe ser mayor a 0');
      if (dto.totalAmount !== undefined && dto.totalAmount < 0) throw new BadRequestException('El monto total no puede ser negativo');

      const dateChanged = dto.date && dto.date !== reservation.date;
      const timeChanged = dto.time && dto.time.substring(0, 5) !== reservation.time.substring(0, 5);

      if (dateChanged || timeChanged) {
        if (!reservation.originalTime) reservation.originalTime = reservation.time.substring(0, 5);
        if (!reservation.originalDate) reservation.originalDate = reservation.date;
        reservation.rescheduleStatus = 'PENDING_ACCEPTANCE';
      }

      delete dto.id; // Security: cannot change ID
      delete dto.tenantId; // Security: cannot change tenant
      delete dto.abonosTotal;
      delete dto.abonosHistory;
      
      Object.assign(reservation, dto);
      reservation.durationMinutes = duration;
      this.recalculatePaymentStatus(reservation);
      const saved = await manager.save(Reservation, reservation);

      if (dateChanged || timeChanged) {
        try {
          await this.notificationsService.notifyCustomerAppointment(saved, {
            title: '🗓️ Tu Cita fue Actualizada',
            body: `Tu cita para "${saved.serviceName || 'Servicio'}" ahora es el ${saved.date} a las ${saved.time.substring(0, 5)}. Por favor verifica los detalles en tu enlace.`
          });
        } catch (err) {}
      }

      return saved;
    });
  }

  async reschedule(tenantId: string, id: string, dto: { date: string; time: string; reason?: string }) {
    if (!dto.date || !dto.time) throw new BadRequestException('Fecha y hora requeridas para reprogramar');
    return this.repo.manager.transaction(async (manager) => {
      const reservationRepo = manager.getRepository(Reservation);
      const reservation = await reservationRepo.findOne({ where: { id, tenantId } });
      if (!reservation) throw new NotFoundException('Cita no encontrada');
      if (reservation.status === ReservationStatus.COMPLETED || reservation.status === ReservationStatus.CANCELED) {
        throw new BadRequestException('No se puede reprogramar una cita completada o cancelada');
      }

      await manager.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`${tenantId}_${dto.date}`]);

      const duration = reservation.durationMinutes || await this.calculateServiceDuration(tenantId, reservation.serviceId, reservation.serviceName);
      const tfFormatted = dto.time.length <= 5 ? dto.time + ':00' : dto.time;

      await this.validateBusinessHours(tenantId, dto.date, tfFormatted, duration);
      await this.validateSlotOverlap(tenantId, dto.date, tfFormatted, reservation.serviceId, reservation.serviceName, id, reservation.employeeId, manager, duration);

      const oldDate = reservation.date;
      const oldTime = reservation.time.substring(0, 5);

      if (!reservation.originalTime) reservation.originalTime = oldTime;
      if (!reservation.originalDate) reservation.originalDate = oldDate;

      reservation.date = dto.date;
      reservation.time = tfFormatted;
      reservation.rescheduleStatus = 'PENDING_ACCEPTANCE';
      if (dto.reason) reservation.rescheduleReason = dto.reason.trim();

      const saved = await manager.save(Reservation, reservation);

      const newTimeStr = saved.time.substring(0, 5);
      const reasonText = dto.reason ? ` Motivo: ${dto.reason.trim()}.` : '';

      let sent = 0;
      try {
        sent = await this.notificationsService.notifyCustomerAppointment(saved, {
          title: '🗓️ Tu Cita ha sido Reprogramada',
          body: `Tu cita fue reprogramada para el ${saved.date} a las ${newTimeStr}.${reasonText}`
        });
      } catch (err) {}

      const baseUrl = process.env.VITE_FRONTEND_URL || 'http://localhost:5173';
      const waText = `Hola ${saved.customerName}, tu cita ha sido reprogramada para el ${saved.date} a las ${newTimeStr}.${reasonText} Puedes verificar los detalles aquí: ${baseUrl}/appointment/${saved.id}`;
      let phone = (saved.customerPhone || '').replace(/\D/g, '');
      if (phone && !phone.startsWith('58') && phone.length === 10) phone = '58' + phone;

      return {
        success: true,
        sent,
        reservation: saved,
        whatsappLink: phone ? `https://wa.me/${phone}?text=${encodeURIComponent(waText)}` : null,
        message: `Cita reprogramada con éxito para el ${saved.date} a las ${newTimeStr}.`
      };
    });
  }

  async updateStatus(tenantId: string, id: string, status: ReservationStatus) {
    const reservation = await this.repo.findOne({ where: { id, tenantId } });
    if (!reservation) throw new BadRequestException('Reservación no encontrada');
    reservation.status = status;
    const saved = await this.repo.save(reservation);

    try {
      if (status === ReservationStatus.CONFIRMED) {
        await this.notificationsService.notifyCustomerAppointment(saved, {
          title: '✅ Cita Confirmada',
          body: `Tu cita para "${saved.serviceName || 'Servicio'}" el ${saved.date} a las ${saved.time.substring(0, 5)} está confirmada.`
        });
      } else if (status === ReservationStatus.CANCELED) {
        await this.notificationsService.notifyCustomerAppointment(saved, {
          title: '❌ Cita Cancelada',
          body: `Tu cita para "${saved.serviceName || 'Servicio'}" del ${saved.date} ha sido cancelada.`
        });
      } else if (status === ReservationStatus.COMPLETED) {
        await this.notificationsService.notifyCustomerAppointment(saved, {
          title: '✨ ¡Gracias por tu Visita!',
          body: `Esperamos que hayas disfrutado tu servicio. ¡Vuelve pronto!`
        });
      }
    } catch (err) {}

    return saved;
  }

  async delete(tenantId: string, id: string) {
    const reservation = await this.repo.findOne({ where: { id, tenantId } });
    if (!reservation) throw new BadRequestException('Reservación no encontrada');
    await this.repo.remove(reservation);

    try {
      await this.notificationsService.notifyCustomerAppointment(reservation, {
        title: '❌ Cita Cancelada',
        body: `Tu cita para "${reservation.serviceName || 'Servicio'}" del ${reservation.date} a las ${reservation.time.substring(0, 5)} ha sido cancelada por el establecimiento.`
      });
    } catch (err) {}

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
    const saved = await this.repo.save(res);

    try {
      const remaining = Math.max(0, Number(saved.totalAmount || 0) - Number(saved.abonosTotal || 0));
      await this.notificationsService.notifyCustomerAppointment(saved, {
        title: '💵 Abono Registrado',
        body: `Se ha registrado un abono de $${Number(amount).toFixed(2)} para tu cita. Saldo pendiente: $${remaining.toFixed(2)}.`
      });
    } catch (err) {}

    return saved;
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
    const saved = await this.repo.save(res);

    try {
      await this.notificationsService.notifyCustomerAppointment(saved, {
        title: '✅ Pago Completo Registrado',
        body: `Tu cita para "${saved.serviceName || 'Servicio'}" está completamente saldada ($${total.toFixed(2)}).`
      });
    } catch (err) {}

    return saved;
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

    // Notificación Push al cliente al aprobar pago
    try {
      await this.notificationsService.notifyCustomerAppointment(savedRes, {
        title: '✅ ¡Pago Aprobado y Cita Confirmada!',
        body: `Tu pago para la cita de "${savedRes.serviceName || 'Servicio'}" fue verificado exitosamente.`
      });
    } catch (err) {}

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

    // Notificación Push al cliente al rechazar comprobante
    try {
      await this.notificationsService.notifyCustomerAppointment(savedRes, {
        title: '❌ Comprobante de Pago Rechazado',
        body: `Tu comprobante de pago fue rechazado (${cleanReason}). Por favor ingresa a tu cita y adjunta un comprobante válido.`
      });
    } catch (err) {}

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

      const accessRepo = manager.getRepository(UserTenantAccess);
      const accesses = await accessRepo.find({
        where: { tenantId, isActive: true, status: 'ACCEPTED' },
      });
      const staffMap = new Map(accesses.map(a => [a.userId, a]));

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
        
        let duration = Number(res.durationMinutes) || 0;
        if (duration === 0 && res.serviceId) {
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

        if (res.employeeId) {
          const emp = staffMap.get(res.employeeId);
          if (emp?.exitTime && newEndMins > this.timeToMinutes(emp.exitTime)) {
            throw new BadRequestException(
              `No se puede desplazar la cita de ${res.customerName} a las ${this.minutesToTime(newStartMins).substring(0,5)} porque el especialista finaliza su jornada laboral a las ${emp.exitTime.substring(0,5)}.`
            );
          }
        }

        const oldTimeStr = this.minutesToTime(startMins).substring(0, 5);
        if (!res.originalTime) res.originalTime = oldTimeStr;
        if (!res.originalDate) res.originalDate = res.date;
        res.time = this.minutesToTime(newStartMins);
        res.rescheduleStatus = 'PENDING_ACCEPTANCE';
        await manager.save(res);

        try {
          await this.notificationsService.notifyCustomerAppointment(res, {
            title: '⏱️ Desplazamiento de Cita',
            body: `Tu cita de las ${oldTimeStr} fue reprogramada para las ${res.time.substring(0, 5)} por imprevisto en la jornada.`
          });
        } catch (notifyErr) {}

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

    const startMins = this.timeToMinutes(reservation.time);
    const newStartMins = startMins + minutes;
    const oldTimeStr = (reservation.time || '00:00').substring(0, 5);

    const duration = Number(reservation.durationMinutes) || 30;
    const newEndMins = newStartMins + duration;

    // Check business close time
    const settingsRepo = this.repo.manager?.getRepository ? this.repo.manager.getRepository('Settings') : null;
    const settings: any = settingsRepo ? await settingsRepo.findOne({ where: { tenantId } }) : null;
    const bHours = settings?.businessHours || {};
    const d = new Date((reservation.date || new Date().toISOString().substring(0, 10)) + 'T12:00:00Z');
    const dayOfWeek = d.getUTCDay().toString();
    const dayConfig = bHours[dayOfWeek];

    if (dayConfig && dayConfig.isOpen && dayConfig.endTime) {
      const closeMinutes = this.timeToMinutes(dayConfig.endTime);
      if (newEndMins > closeMinutes) {
        throw new BadRequestException(
          `El retraso de ${minutes} min desplazaría la cita a las ${this.minutesToTime(newStartMins).substring(0,5)}, sobrepasando la hora de cierre (${dayConfig.endTime.substring(0,5)}).`
        );
      }
    }

    if (reservation.employeeId && this.repo.manager?.getRepository) {
      const accessRepo = this.repo.manager.getRepository(UserTenantAccess);
      const emp: any = accessRepo ? await accessRepo.findOne({
        where: { userId: reservation.employeeId, tenantId, isActive: true, status: 'ACCEPTED' },
      }) : null;
      if (emp?.exitTime && newEndMins > this.timeToMinutes(emp.exitTime)) {
        throw new BadRequestException(
          `El retraso de ${minutes} min desplazaría la cita a las ${this.minutesToTime(newStartMins).substring(0,5)}, sobrepasando el horario laboral del especialista (salida: ${emp.exitTime.substring(0,5)}).`
        );
      }
    }

    if (!reservation.originalTime) reservation.originalTime = oldTimeStr;
    if (!reservation.originalDate) reservation.originalDate = reservation.date;

    reservation.time = this.minutesToTime(newStartMins);
    reservation.rescheduleStatus = 'DELAYED';
    const saved = await this.repo.save(reservation);
    const newTimeStr = saved.time.substring(0, 5);

    const message = `Tu cita tiene un retraso de aprox. ${minutes} minutos. Nueva hora estimada: ${newTimeStr}.`;
    const payload = {
      title: '⏱️ Aviso de Retraso de Cita',
      body: message,
      data: {
        url: `/appointment/${id}`,
        reservationId: id,
      },
    };

    let sent = 0;
    try {
      sent = await this.notificationsService.notifyCustomerAppointment(saved, payload);
    } catch (err) {}

    const baseUrl = process.env.VITE_FRONTEND_URL || 'http://localhost:5173';
    const msg = `Hola ${saved.customerName}, debido a un retraso imprevisto de ${minutes} min, tu cita de las ${oldTimeStr} comenzará aprox. a las ${newTimeStr}. Gracias por tu comprensión. Puedes ver tu cita en: ${baseUrl}/appointment/${saved.id}`;
    let phone = (saved.customerPhone || '').replace(/\D/g, '');
    if (phone && !phone.startsWith('58') && phone.length === 10) phone = '58' + phone;

    return {
      success: true,
      sent,
      reservation: saved,
      newTime: newTimeStr,
      whatsappLink: phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : null,
      message: `Hora actualizada a las ${newTimeStr} (+${minutes}m). ${sent > 0 ? `Se envió notificación Push al cliente.` : `No se detectó Push activa (puedes avisar por WhatsApp).`}`,
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

