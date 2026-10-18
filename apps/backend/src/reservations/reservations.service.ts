import { Injectable, BadRequestException, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Reservation } from '../entities/reservation.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Product } from '../entities/product.entity';
import { ReservationStatus, PaymentStatus, UserRole, OrderStatus, DeliveryMethod } from '@finowork/shared-types';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { CustomersService } from '../customers/customers.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { Settings } from '../entities/settings.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class ReservationsService implements OnModuleInit {
  constructor(
    @InjectRepository(Reservation)
    private repo: Repository<Reservation>,
    private readonly customersService: CustomersService,
    private readonly notificationsService: NotificationsService,
    private readonly storageService: StorageService,
  ) {}

  async onModuleInit() {
    try {
      await this.repo.query(`ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "serviceSpecialists" jsonb;`);
      await this.repo.query(`ALTER TABLE "order_item" ADD COLUMN IF NOT EXISTS "employeeId" character varying;`);
    } catch (e: any) {
      console.warn('[ReservationsService onModuleInit] Notice:', e?.message || e);
    }
  }

  async syncLinkedOrder(tenantId: string, reservation: Reservation, em?: EntityManager) {
    try {
      const manager = em || this.repo.manager;
      if (!manager?.getRepository) return;
      const orderRepo = manager.getRepository(Order);
      
      let orders: Order[] = [];
      if (typeof orderRepo.find === 'function') {
        try {
          orders = await orderRepo.find({
            where: [
              ...(reservation.orderId ? [{ id: reservation.orderId, tenantId }] : []),
              { linkedReservationId: reservation.id, tenantId }
            ]
          });
        } catch (e) {}
      }
      if ((!orders || orders.length === 0) && typeof orderRepo.findOne === 'function') {
        try {
          const single = await orderRepo.findOne({
            where: [
              ...(reservation.orderId ? [{ id: reservation.orderId, tenantId }] : []),
              { linkedReservationId: reservation.id, tenantId }
            ]
          });
          if (single) orders = [single];
        } catch (e) {}
      }

      if (!orders || orders.length === 0) return;

      for (const order of orders) {
        // Sincronizar fecha/hora requerida y notas
        if (reservation.date) {
          const timePart = reservation.time ? (reservation.time.length <= 5 ? `${reservation.time}:00` : reservation.time) : '12:00:00';
          const parsedD = new Date(`${reservation.date}T${timePart}`);
          if (!isNaN(parsedD.getTime())) {
            order.requestedDeliveryDate = parsedD;
          }
          const timeShort = reservation.time ? reservation.time.substring(0, 5) : '';
          const prefix = `[Cita: ${reservation.date} ${timeShort}]`;
          if (order.notes && order.notes.includes('[Cita:')) {
            order.notes = order.notes.replace(/\[Cita:[^\]]*\]/, prefix);
          } else if (order.notes) {
            order.notes = `${prefix} ${order.notes}`;
          } else {
            order.notes = prefix;
          }
        }

        // Sincronizar estados de cita hacia orden
        if (reservation.status === ReservationStatus.CANCELED) {
          order.status = OrderStatus.CANCELED;
        } else if (reservation.status === ReservationStatus.COMPLETED) {
          order.status = OrderStatus.DELIVERED;
        }

        // Sincronizar finanzas
        if (reservation.paymentStatus) {
          order.paymentStatus = reservation.paymentStatus;
        }
        order.paymentReported = Boolean(reservation.paymentReported);
        order.paymentRejectedReason = reservation.paymentRejectedReason || null as any;
        if (reservation.paymentProofUrl) {
          order.paymentProofUrl = reservation.paymentProofUrl;
        }
        if (reservation.abonosTotal !== undefined && reservation.abonosTotal !== null) {
          order.abonosTotal = Number(reservation.abonosTotal);
        }
        if (Array.isArray(reservation.abonosHistory)) {
          order.abonosHistory = reservation.abonosHistory;
        }

        // Sincronizar y auto-curar totalAmount si es 0
        if (Number(order.totalAmount || 0) <= 0) {
          if (Number(reservation.totalAmount || 0) > 0) {
            order.totalAmount = Number(reservation.totalAmount);
          } else {
            const orderItemRepo = manager.getRepository(OrderItem);
            const items = await orderItemRepo.find({ where: { orderId: order.id } });
            let itemsSum = items.reduce((sum, it) => sum + (Number(it.subtotal) || (Number(it.unitPrice || 0) * Number(it.quantity || 1))), 0);
            if (itemsSum <= 0 && (reservation.serviceId || reservation.serviceName)) {
              const productRepo = manager.getRepository(Product);
              if (reservation.serviceId) {
                const sIds = reservation.serviceId.split(',').map((s: string) => s.trim()).filter(Boolean);
                for (const sId of sIds) {
                  const p = await productRepo.findOne({ where: { id: sId } });
                  if (p?.salePrice) itemsSum += Number(p.salePrice);
                }
              }
              if (itemsSum <= 0 && reservation.serviceName) {
                const names = reservation.serviceName.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
                const prods = await productRepo.find({ where: { tenantId } });
                itemsSum = prods.filter(p => names.includes(p.name?.trim().toLowerCase())).reduce((sum, p) => sum + Number(p.salePrice || 0), 0);
              }
            }
            if (itemsSum > 0) {
              order.totalAmount = itemsSum;
              if (Number(reservation.totalAmount || 0) <= 0) {
                reservation.totalAmount = itemsSum;
                await manager.save(Reservation, reservation);
              }
            }
          }
        } else if (Number(reservation.totalAmount || 0) <= 0 && Number(order.totalAmount || 0) > 0) {
          reservation.totalAmount = Number(order.totalAmount);
          await manager.save(Reservation, reservation);
        }

        if (reservation.employeeId && !order.employeeId) {
          order.employeeId = reservation.employeeId;
        } else if (!reservation.employeeId && order.employeeId) {
          reservation.employeeId = order.employeeId;
          await manager.save(Reservation, reservation);
        }
        if (reservation.tableNumber) {
          order.tableNumber = reservation.tableNumber;
        }

        // Sincronizar y curar totalCost si es 0
        if (Number(order.totalCost || 0) <= 0) {
          const orderItemRepo = manager.getRepository(OrderItem);
          const items = await orderItemRepo.find({ where: { orderId: order.id } });
          const productRepo = manager.getRepository(Product);
          let calculatedCost = 0;
          for (const item of items) {
            let uCost = Number(item.unitCost || 0);
            if (uCost <= 0 && item.productId) {
              const p = await productRepo.findOne({ where: { id: item.productId } });
              uCost = Number(p?.estimatedCost || p?.cost || 0);
              if (uCost > 0) {
                item.unitCost = uCost;
                await orderItemRepo.save(item);
              }
            }
            calculatedCost += uCost * (Number(item.quantity) || 1);
          }
          if (calculatedCost <= 0 && reservation.serviceId) {
            const sIds = reservation.serviceId.split(',').map((s: string) => s.trim()).filter(Boolean);
            for (const sId of sIds) {
              const p = await productRepo.findOne({ where: { id: sId } });
              calculatedCost += Number(p?.estimatedCost || p?.cost || 0);
            }
          }
          if (calculatedCost > 0) {
            order.totalCost = calculatedCost;
            order.netProfit = Number(order.totalAmount || 0) - calculatedCost;
          }
        }

        // Sincronizar employeeId en orderItems si hay serviceSpecialists
        if (Array.isArray(reservation.serviceSpecialists) && reservation.serviceSpecialists.length > 0) {
          const orderItemRepo = manager.getRepository(OrderItem);
          const items = await orderItemRepo.find({ where: { orderId: order.id } });
          for (const item of items) {
            const spec = reservation.serviceSpecialists.find(s => 
              (s.serviceId && item.productId && s.serviceId === item.productId) ||
              (s.serviceName && item.productName && s.serviceName.trim().toLowerCase() === item.productName.trim().toLowerCase())
            );
            if (spec?.employeeId && item.employeeId !== spec.employeeId) {
              item.employeeId = spec.employeeId;
              await orderItemRepo.save(item);
            }
          }
        } else if (reservation.employeeId) {
          const orderItemRepo = manager.getRepository(OrderItem);
          const items = await orderItemRepo.find({ where: { orderId: order.id } });
          for (const item of items) {
            if (item.employeeId !== reservation.employeeId) {
              item.employeeId = reservation.employeeId;
              await orderItemRepo.save(item);
            }
          }
        }

        await orderRepo.save(order);
      }
    } catch (err) {
      console.error('Error sincronizando Order vinculada a Reservation:', err);
    }
  }

  async createLinkedOrder(tenantId: string, reservation: Reservation, em?: EntityManager) {
    try {
      const manager = em || this.repo.manager;
      if (!manager?.getRepository) return null;
      const orderRepo = manager.getRepository(Order);
      const productRepo = manager.getRepository(Product);
      const orderItemRepo = manager.getRepository(OrderItem);
      const settingsRepo = manager.getRepository('Settings');

      const settings: any = await settingsRepo.findOne({ where: { tenantId } });
      const rate = Number(settings?.exchangeRateBs || 40.0);

      let reqDeliveryDate: Date | undefined;
      if (reservation.date) {
        const timePart = reservation.time ? (reservation.time.length <= 5 ? `${reservation.time}:00` : reservation.time) : '12:00:00';
        const parsedD = new Date(`${reservation.date}T${timePart}`);
        if (!isNaN(parsedD.getTime())) reqDeliveryDate = parsedD;
      }

      const timeShort = reservation.time ? reservation.time.substring(0, 5) : '';
      const notes = reservation.notes 
        ? `[Cita: ${reservation.date} ${timeShort}] ${reservation.notes}` 
        : `[Cita: ${reservation.date} ${timeShort}]`;

      const initialStatus = reservation.status === ReservationStatus.COMPLETED 
        ? OrderStatus.DELIVERED 
        : (reservation.status === ReservationStatus.CANCELED ? OrderStatus.CANCELED : OrderStatus.PENDING);

      const linkedOrder = orderRepo.create({
        tenantId,
        customerId: reservation.customerId,
        customerName: reservation.customerName,
        customerPhone: reservation.customerPhone || '',
        identification: reservation.identification || undefined,
        notes,
        tableNumber: reservation.tableNumber || '',
        requestedDeliveryDate: reqDeliveryDate,
        status: initialStatus,
        paymentStatus: reservation.paymentStatus || PaymentStatus.PENDING,
        paymentReported: Boolean(reservation.paymentReported),
        paymentProofUrl: reservation.paymentProofUrl || undefined,
        paymentRejectedReason: reservation.paymentRejectedReason || undefined,
        deliveryMethod: DeliveryMethod.IN_STORE,
        totalAmount: Number(reservation.totalAmount || 0),
        abonosTotal: Number(reservation.abonosTotal || 0),
        abonosHistory: reservation.abonosHistory || [],
        employeeId: reservation.employeeId || undefined,
        linkedReservationId: reservation.id,
        exchangeRate: rate,
        totalCost: 0,
        netProfit: 0,
      });

      const savedOrder = await orderRepo.save(linkedOrder);
      reservation.orderId = savedOrder.id;
      await manager.save(Reservation, reservation);

      let itemsTotal = 0;
      let itemsCost = 0;
      if (reservation.serviceId) {
        const sIds = reservation.serviceId.split(',').map((s: string) => s.trim()).filter(Boolean);
        for (const sId of sIds) {
          const prod: any = await productRepo.findOne({ where: { id: sId } });
          if (prod) {
            const price = Number(prod.salePrice || 0);
            const cost = Number(prod.estimatedCost || prod.cost || 0);
            itemsTotal += price;
            itemsCost += cost;

            const spec = Array.isArray(reservation.serviceSpecialists)
              ? reservation.serviceSpecialists.find(s => 
                  (s.serviceId && prod.id && s.serviceId === prod.id) ||
                  (s.serviceName && prod.name && s.serviceName.trim().toLowerCase() === prod.name.trim().toLowerCase())
                )
              : null;
            const itemEmployeeId = spec?.employeeId || reservation.employeeId || undefined;

            const item = orderItemRepo.create({
              orderId: savedOrder.id,
              productId: prod.id,
              productName: prod.name,
              employeeId: itemEmployeeId,
              quantity: 1,
              unitPrice: price,
              unitCost: cost,
              subtotal: price,
            });
            await orderItemRepo.save(item);
          }
        }
      }

      savedOrder.totalCost = itemsCost;
      savedOrder.netProfit = Number(savedOrder.totalAmount || itemsTotal) - itemsCost;

      // Si el totalAmount de la orden o reserva quedó en 0 y los items tienen precio, auto-corregir
      if (Number(savedOrder.totalAmount || 0) <= 0 && itemsTotal > 0) {
        savedOrder.totalAmount = itemsTotal;
        savedOrder.netProfit = itemsTotal - itemsCost;
        if (Number(reservation.totalAmount || 0) <= 0) {
          reservation.totalAmount = itemsTotal;
          await manager.save(Reservation, reservation);
        }
      }
      await orderRepo.save(savedOrder);

      return savedOrder;
    } catch (err) {
      console.error('Error auto-creando linked order en ReservationsService:', err);
      return null;
    }
  }

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
        if (reqMins < start1) {
          throw new BadRequestException(
            `La cita iniciaría a las ${formatTime(reqMins)}, pero el local abre a las ${dayConfig.startTime || '08:00'}.`
          );
        } else {
          throw new BadRequestException(
            `La cita terminaría a las ${formatTime(reqEndMins)}, pero el local cierra a las ${dayConfig.endTime || '18:00'}.`
          );
        }
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
    serviceSpecialists?: Array<{ serviceId: string; employeeId?: string; employeeName?: string; durationMinutes?: number; serviceName?: string; price?: number }>,
  ) {
    const em = manager || this.repo.manager;
    const settingsRepo = em.getRepository('Settings');
    const settings: any = await settingsRepo.findOne({ where: { tenantId } });
    const interval = Number(settings?.slotInterval) || 30;

    const productRepo = em.getRepository(Product);
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
      const isExclusivelyDelivery = userRoles.length > 0 && userRoles.every(r => r === UserRole.DELIVERY);
      if (isExclusivelyDelivery) return false;

      const titleAndName = `${a.jobTitle || ''} ${a.user?.name || ''} ${a.user?.username || ''}`.toLowerCase();
      const isJanitorial = /limpieza|mantenimiento|vigilancia|seguridad|aseo/i.test(titleAndName);
      if (isJanitorial) return false;

      return true;
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

    const busyBookings: BusyBooking[] = [];
    for (const res of existing) {
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

      if (Array.isArray(res.serviceSpecialists) && res.serviceSpecialists.length > 0) {
        let segStart = exStart;
        for (const s of res.serviceSpecialists) {
          const sp = s.serviceId ? productMap.get(s.serviceId) : null;
          const dur = Number(s.durationMinutes) || Number(sp?.durationMinutes) || interval;
          busyBookings.push({
            employeeId: s.employeeId || null,
            customerName: res.customerName || 'Cliente',
            start: segStart,
            end: segStart + dur,
          });
          segStart += dur;
        }
      } else {
        busyBookings.push({
          employeeId: res.employeeId || null,
          customerName: res.customerName || 'Cliente',
          start: exStart,
          end: exStart + exDuration,
        });
      }
    }

    // Si la cita tiene asignación específica de especialistas por servicio
    if (Array.isArray(serviceSpecialists) && serviceSpecialists.length > 0) {
      let currentSegStart = reqStart;
      for (const spec of serviceSpecialists) {
        const sProd = spec.serviceId ? productMap.get(spec.serviceId) : null;
        const dur = Number(spec.durationMinutes) || Number(sProd?.durationMinutes) || interval;
        const segStart = currentSegStart;
        const segEnd = segStart + dur;
        currentSegStart = segEnd;

        const rawAssigned = (sProd as any)?.assignedStaffIds;
        let sAssignedIds: string[] = [];
        if (Array.isArray(rawAssigned)) sAssignedIds = rawAssigned;
        else if (typeof rawAssigned === 'string' && rawAssigned.trim()) {
          sAssignedIds = rawAssigned.split(',').map((x: string) => x.trim()).filter(Boolean);
        }

        if (spec.employeeId) {
          // 1. Buscar empleado en staffList por userId, id o user.id
          let emp = staffList.find(s => s.userId === spec.employeeId || s.id === spec.employeeId || s.user?.id === spec.employeeId);
          if (!emp) {
            emp = await accessRepo.findOne({
              where: [
                { userId: spec.employeeId, tenantId, isActive: true, status: 'ACCEPTED' },
                { id: spec.employeeId, tenantId, isActive: true, status: 'ACCEPTED' },
              ],
              relations: { user: true },
            }) as any;
          }

          // 2. Validar cualificación para el servicio
          if (sAssignedIds.length > 0) {
            const isQualified = sAssignedIds.includes(spec.employeeId) ||
              (emp && (sAssignedIds.includes(emp.userId) || sAssignedIds.includes(emp.id) || (emp.user && sAssignedIds.includes(emp.user.id))));
            if (!isQualified) {
              throw new BadRequestException(
                `El especialista seleccionado para "${spec.serviceName || sProd?.name || 'el servicio'}" no está calificado para realizarlo.`
              );
            }
          }

          // 3. Validar jornada laboral y almuerzo del especialista
          if (emp) {
            if (emp.entryTime && segStart < toMins(emp.entryTime)) {
              throw new BadRequestException(
                `El especialista ${spec.employeeName || emp.user?.username || ''} ingresa a las ${emp.entryTime.substring(0, 5)}. La parte de "${spec.serviceName || sProd?.name}" (${formatTime(segStart)}) inicia antes de su jornada.`
              );
            }
            if (emp.exitTime && segEnd > toMins(emp.exitTime)) {
              throw new BadRequestException(
                `El especialista ${spec.employeeName || emp.user?.username || ''} culmina a las ${emp.exitTime.substring(0, 5)}. La parte de "${spec.serviceName || sProd?.name}" (${formatTime(segEnd)}) excede su jornada.`
              );
            }
            if (emp.lunchStart && emp.lunchEnd) {
              const lStart = toMins(emp.lunchStart);
              const lEnd = toMins(emp.lunchEnd);
              if (segStart < lEnd && segEnd > lStart) {
                throw new BadRequestException(
                  `El especialista ${spec.employeeName || emp.user?.username || ''} se encuentra en receso de almuerzo (${emp.lunchStart.substring(0, 5)} a ${emp.lunchEnd.substring(0, 5)}) durante "${spec.serviceName || sProd?.name}".`
                );
              }
            }
          }

          // 4. Validar choque directo para ese especialista en este bloque
          const directCollision = busyBookings.find(
            b => (b.employeeId === spec.employeeId || (emp && (b.employeeId === emp.userId || b.employeeId === emp.id))) &&
                 segStart < b.end && segEnd > b.start
          );
          if (directCollision) {
            throw new BadRequestException(
              `El especialista ${spec.employeeName || emp?.user?.username || ''} ya tiene una cita con "${directCollision.customerName}" (${formatTime(directCollision.start)} a ${formatTime(directCollision.end)}). Si deseas agendarla de todas formas, confirma para forzar.`
            );
          }
        } else {
          // Si no se asignó un especialista específico a este servicio, asegurar que haya al menos uno disponible en este segmento
          let segmentStaff = staffList;
          if (sAssignedIds.length > 0) {
            const qualifiedSegmentStaff = segmentStaff.filter(st =>
              sAssignedIds.includes(st.userId) || sAssignedIds.includes(st.id) || (st.user && sAssignedIds.includes(st.user.id))
            );
            if (qualifiedSegmentStaff.length > 0) {
              segmentStaff = qualifiedSegmentStaff;
            }
          }
          const freeForSegment = segmentStaff.filter(st => {
            if (st.entryTime && segStart < toMins(st.entryTime)) return false;
            if (st.exitTime && segEnd > toMins(st.exitTime)) return false;
            if (st.lunchStart && st.lunchEnd && segStart < toMins(st.lunchEnd) && segEnd > toMins(st.lunchStart)) return false;
            return !busyBookings.some(b => (b.employeeId === st.userId || b.employeeId === st.id || (st.user && b.employeeId === st.user.id)) && segStart < b.end && segEnd > b.start);
          });
          if (freeForSegment.length === 0) {
            throw new BadRequestException(
              `No hay especialistas disponibles para el servicio "${spec.serviceName || sProd?.name || 'solicitado'}" en el horario ${formatTime(segStart)} a ${formatTime(segEnd)}.`
            );
          }
        }
      }
      return;
    }

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
          .map(s => {
            const raw = (s as any)?.assignedStaffIds;
            if (Array.isArray(raw)) return raw;
            if (typeof raw === 'string' && raw.trim()) return raw.split(',').map((x: string) => x.trim()).filter(Boolean);
            return [];
          })
          .filter(arr => Array.isArray(arr) && arr.length > 0);

        if (requiredStaffIdSets.length > 0) {
          const isStaffQualified = (st: any, set: string[]) =>
            set.includes(st.userId) || set.includes(st.id) || (st.user && set.includes(st.user.id));

          // Considerar únicamente conjuntos de especialistas que tengan al menos 1 miembro de personal activo en el negocio
          const activeStaffIdSets = requiredStaffIdSets.filter(set =>
            staffList.some(st => isStaffQualified(st, set))
          );

          if (activeStaffIdSets.length > 0) {
            const staffDoingAll = candidateStaff.filter(st =>
              activeStaffIdSets.every(set => isStaffQualified(st, set))
            );
            if (staffDoingAll.length > 0) {
              candidateStaff = staffDoingAll;
            } else {
              const partialStaff = candidateStaff.filter(st =>
                activeStaffIdSets.some(set => isStaffQualified(st, set))
              );
              if (partialStaff.length > 0) {
                candidateStaff = partialStaff;
              }
            }
          }
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

    const productRepo = this.repo.manager.getRepository(Product);
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

      let effectiveSpecialists = dto.serviceSpecialists;
      if (!effectiveSpecialists && dto.serviceId && dto.serviceId.includes(',')) {
        const sIds = dto.serviceId.split(',').map((s: string) => s.trim()).filter(Boolean);
        const productRepo = manager.getRepository(Product);
        const autoSpecialists: any[] = [];
        for (const sId of sIds) {
          const prod: any = await productRepo.findOne({ where: { id: sId, tenantId } });
          if (prod) {
            let itemEmpId: string | undefined = dto.employeeId || undefined;
            let itemEmpName: string | undefined = dto.employeeName || undefined;
            const raw = prod.assignedStaffIds;
            let staffIds: string[] = [];
            if (Array.isArray(raw)) staffIds = raw;
            else if (typeof raw === 'string') staffIds = raw.split(',').map((x: string) => x.trim()).filter(Boolean);

            const accessRepo = manager.getRepository(UserTenantAccess);
            let activeStaffIds = staffIds;
            try {
              const activeStaffList = await accessRepo.find({
                where: { tenantId, isActive: true, status: 'ACCEPTED' },
                relations: { user: true },
              });
              if (activeStaffList && activeStaffList.length > 0) {
                const filtered = staffIds.filter(sid =>
                  activeStaffList.some(st => st.userId === sid || st.id === sid || (st.user && st.user.id === sid))
                );
                if (filtered.length > 0) {
                  activeStaffIds = filtered;
                }
              }
            } catch (e) {}

            if (activeStaffIds.length === 1) {
              itemEmpId = activeStaffIds[0];
            } else if (dto.employeeId && activeStaffIds.includes(dto.employeeId)) {
              itemEmpId = dto.employeeId;
            }

            if (itemEmpId && (!itemEmpName || itemEmpId !== dto.employeeId)) {
              try {
                const empAcc: any = await accessRepo.findOne({
                  where: { userId: itemEmpId, tenantId },
                  relations: { user: true },
                });
                if (empAcc?.user?.username) {
                  itemEmpName = empAcc.user.username;
                }
              } catch (e) {
                // Non-fatal, continue with undefined name
              }
            }

            autoSpecialists.push({
              serviceId: prod.id,
              serviceName: prod.name,
              employeeId: itemEmpId,
              employeeName: itemEmpName,
              price: Number(prod.salePrice || 0),
              durationMinutes: Number(prod.durationMinutes || 30),
            });
          }
        }
        if (autoSpecialists.length > 0) {
          effectiveSpecialists = autoSpecialists;
        }
      }

      if (dto.date && dto.time && !dto.force) {
        await this.validateBusinessHours(tenantId, dto.date, dto.time, duration);
        await this.validateSlotOverlap(tenantId, dto.date, dto.time, dto.serviceId, dto.serviceName, undefined, dto.employeeId, manager, duration, effectiveSpecialists);
      }
      if (dto.numberOfPeople !== undefined && dto.numberOfPeople <= 0) throw new BadRequestException('La cantidad de personas debe ser mayor a 0');
      if (dto.totalAmount !== undefined && dto.totalAmount < 0) throw new BadRequestException('El monto total no puede ser negativo');
      
      const reservation = new Reservation();
      Object.assign(reservation, dto);
      reservation.tenantId = tenantId;
      reservation.durationMinutes = duration;
      if (effectiveSpecialists) {
        reservation.serviceSpecialists = effectiveSpecialists;
      }

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

      // Auto-calcular totalAmount si no vino o es 0 y hay servicios seleccionados
      if ((!reservation.totalAmount || Number(reservation.totalAmount) <= 0) && (reservation.serviceId || reservation.serviceName)) {
        const productRepo = manager.getRepository(Product);
        let calculatedTotal = 0;
        if (reservation.serviceId) {
          const sIds = reservation.serviceId.split(',').map((s: string) => s.trim()).filter(Boolean);
          for (const sId of sIds) {
            const p = await productRepo.findOne({ where: { id: sId } });
            if (p && p.salePrice) {
              calculatedTotal += Number(p.salePrice || 0);
            }
          }
        }
        if (calculatedTotal === 0 && reservation.serviceName) {
          const names = reservation.serviceName.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
          const allProds = await productRepo.find({ where: { tenantId } });
          const matching = allProds.filter(p => names.includes(p.name?.trim().toLowerCase()));
          calculatedTotal = matching.reduce((sum, p) => sum + Number(p.salePrice || 0), 0);
        }
        if (calculatedTotal > 0) {
          reservation.totalAmount = calculatedTotal;
        }
      }

      delete (reservation as any).abonosTotal; // Security: do not allow setting abonos directly
      delete (reservation as any).abonosHistory;
      this.recalculatePaymentStatus(reservation);
      const saved = await manager.save(Reservation, reservation);
      await this.createLinkedOrder(tenantId, saved, manager);

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

      const shouldValidateSlot = (dto.date || dto.time || dto.employeeId !== undefined || dto.serviceSpecialists !== undefined) && !dto.force;
      if (shouldValidateSlot) {
        if (dto.date || dto.time) {
          await this.validateBusinessHours(tenantId, targetDate, targetTime, duration);
        }
        await this.validateSlotOverlap(tenantId, targetDate, targetTime, dto.serviceId || reservation.serviceId, dto.serviceName || reservation.serviceName, id, dto.employeeId !== undefined ? dto.employeeId : reservation.employeeId, manager, duration, dto.serviceSpecialists !== undefined ? dto.serviceSpecialists : reservation.serviceSpecialists);
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
      if (dto.serviceSpecialists !== undefined) {
        reservation.serviceSpecialists = dto.serviceSpecialists;
      }

      // Auto-calcular totalAmount si quedó en 0 o no vino y hay servicios
      if ((!reservation.totalAmount || Number(reservation.totalAmount) <= 0) && (reservation.serviceId || reservation.serviceName)) {
        const productRepo = manager.getRepository(Product);
        let calculatedTotal = 0;
        if (reservation.serviceId) {
          const sIds = reservation.serviceId.split(',').map((s: string) => s.trim()).filter(Boolean);
          for (const sId of sIds) {
            const p = await productRepo.findOne({ where: { id: sId } });
            if (p && p.salePrice) {
              calculatedTotal += Number(p.salePrice || 0);
            }
          }
        }
        if (calculatedTotal === 0 && reservation.serviceName) {
          const names = reservation.serviceName.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
          const allProds = await productRepo.find({ where: { tenantId } });
          const matching = allProds.filter(p => names.includes(p.name?.trim().toLowerCase()));
          calculatedTotal = matching.reduce((sum, p) => sum + Number(p.salePrice || 0), 0);
        }
        if (calculatedTotal > 0) {
          reservation.totalAmount = calculatedTotal;
        }
      }

      this.recalculatePaymentStatus(reservation);
      const saved = await manager.save(Reservation, reservation);
      await this.syncLinkedOrder(tenantId, saved, manager);

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

  async reschedule(tenantId: string, id: string, dto: { date: string; time: string; reason?: string; force?: boolean }) {
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

      if (!dto.force) {
        await this.validateBusinessHours(tenantId, dto.date, tfFormatted, duration);
        await this.validateSlotOverlap(tenantId, dto.date, tfFormatted, reservation.serviceId, reservation.serviceName, id, reservation.employeeId, manager, duration, reservation.serviceSpecialists);
      }

      const oldDate = reservation.date;
      const oldTime = reservation.time.substring(0, 5);

      if (!reservation.originalTime) reservation.originalTime = oldTime;
      if (!reservation.originalDate) reservation.originalDate = oldDate;

      reservation.date = dto.date;
      reservation.time = tfFormatted;
      reservation.rescheduleStatus = 'PENDING_ACCEPTANCE';
      if (dto.reason) reservation.rescheduleReason = dto.reason.trim();

      const saved = await manager.save(Reservation, reservation);
      await this.syncLinkedOrder(tenantId, saved, manager);

      const newTimeStr = saved.time.substring(0, 5);
      const reasonText = dto.reason ? ` Motivo: ${dto.reason.trim()}.` : '';

      let sent = 0;
      try {
        sent = await this.notificationsService.notifyCustomerAppointment(saved, {
          title: '🗓️ Tu Cita ha sido Reprogramada',
          body: `Tu cita fue reprogramada para el ${saved.date} a las ${newTimeStr}.${reasonText}`
        });
      } catch (err) {}

      const baseUrl = process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL || 'https://www.finowork.com';
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
    await this.syncLinkedOrder(tenantId, saved);

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

    // Sincronizar cancelación en TODAS las órdenes vinculadas para no dejar tickets huérfanos o duplicados
    try {
      const orderRepo = this.repo.manager.getRepository(Order);
      let linkedOrders: Order[] = [];
      if (typeof orderRepo.find === 'function') {
        try {
          linkedOrders = await orderRepo.find({
            where: [
              ...(reservation.orderId ? [{ id: reservation.orderId, tenantId }] : []),
              { linkedReservationId: reservation.id, tenantId }
            ]
          });
        } catch (e) {}
      }
      if ((!linkedOrders || linkedOrders.length === 0) && typeof orderRepo.findOne === 'function') {
        try {
          const single = await orderRepo.findOne({
            where: [
              ...(reservation.orderId ? [{ id: reservation.orderId, tenantId }] : []),
              { linkedReservationId: reservation.id, tenantId }
            ]
          });
          if (single) linkedOrders = [single];
        } catch (e) {}
      }
      for (const linkedOrder of linkedOrders) {
        if (linkedOrder.status !== OrderStatus.CANCELED) {
          linkedOrder.status = OrderStatus.CANCELED;
          await orderRepo.save(linkedOrder);
        }
      }

      // Además, si hubo órdenes huérfanas creadas por doble toque para el mismo cliente en el mismo lapso
      if (reservation.customerName && reservation.customerName.trim()) {
        const resTime = new Date(reservation.createdAt).getTime();
        const potentialDuplicates = await orderRepo.createQueryBuilder('o')
          .where('o.tenantId = :tenantId', { tenantId })
          .andWhere('o.status != :canceled', { canceled: OrderStatus.CANCELED })
          .andWhere('LOWER(TRIM(o.customerName)) = LOWER(TRIM(:customerName))', { customerName: reservation.customerName })
          .andWhere('o.createdAt >= :minCreated', { minCreated: new Date(resTime - 1000 * 60 * 60 * 4) })
          .andWhere('o.createdAt <= :maxCreated', { maxCreated: new Date(resTime + 1000 * 60 * 60 * 4) })
          .getMany();

        for (const dup of potentialDuplicates) {
          if (!dup.linkedReservationId || dup.linkedReservationId === reservation.id) {
            dup.status = OrderStatus.CANCELED;
            await orderRepo.save(dup);
          }
        }
      }
    } catch (err) {
      console.error('Error sincronizando Order al eliminar Cita:', err);
    }

    await this.repo.remove(reservation);

    try {
      await this.notificationsService.notifyCustomerAppointment(reservation, {
        title: '❌ Cita Cancelada',
        body: `Tu cita para "${reservation.serviceName || 'Servicio'}" del ${reservation.date} a las ${reservation.time.substring(0, 5)} ha sido cancelada por el establecimiento.`
      });
    } catch (err) {}

    return { success: true };
  }

  async addAbono(tenantId: string, id: string, amount: number, method?: string, ref?: string, bank?: string) {
    if (amount <= 0) throw new BadRequestException('El abono debe ser mayor a 0');
    const res = await this.repo.findOne({ where: { id, tenantId } });
    if (!res) throw new BadRequestException('No encontrado');
    
    res.abonosHistory = res.abonosHistory || [];
    const abonoId = randomUUID();
    const entry: any = { id: abonoId, amount: Number(amount), date: new Date().toISOString() };
    if (method) entry.method = method;
    if (ref) {
      entry.ref = ref;
      entry.reference = ref;
    }
    if (bank) entry.bank = bank;
    res.abonosHistory.push(entry);
    res.abonosTotal = Math.round(((res.abonosTotal || 0) + Number(amount)) * 100) / 100;
    
    this.recalculatePaymentStatus(res);
    const saved = await this.repo.save(res);
    await this.syncLinkedOrder(tenantId, saved);

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
    const saved = await this.repo.save(res);
    await this.syncLinkedOrder(tenantId, saved);
    return saved;
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
    await this.syncLinkedOrder(tenantId, saved);

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

    // Calcular abonos reales aprobados (incluyendo abonos manuales sin status)
    const historySum = Array.isArray(res.abonosHistory)
      ? res.abonosHistory.filter((e: any) => !e.status || e.status === 'APPROVED').reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0)
      : 0;

    if (historySum > 0) {
      res.abonosTotal = historySum;
    } else if (!res.abonosTotal || Number(res.abonosTotal) <= 0) {
      res.abonosTotal = Number(res.totalAmount || 0);
    }

    this.recalculatePaymentStatus(res);

    const savedRes = await this.repo.save(res);
    await this.syncLinkedOrder(tenantId, savedRes);

    // Notificación Push al cliente al aprobar pago
    try {
      const isFull = savedRes.paymentStatus === PaymentStatus.PAID;
      const abonosAmt = Number(savedRes.abonosTotal || 0);
      const remainingAmt = Math.max(0, Number(savedRes.totalAmount || 0) - abonosAmt);
      await this.notificationsService.notifyCustomerAppointment(savedRes, {
        title: isFull ? '✅ ¡Pago Aprobado y Cita Confirmada!' : '💵 ¡Abono Confirmado en Cuenta!',
        body: isFull 
          ? `Tu pago para la cita de "${savedRes.serviceName || 'Servicio'}" fue verificado exitosamente.`
          : `Tu abono de $${abonosAmt.toFixed(2)} fue confirmado en cuenta. Saldo restante: $${remainingAmt.toFixed(2)}.`
      });
    } catch (err) {}

    return savedRes;
  }

  async rejectPayment(tenantId: string, id: string, reason?: string) {
    const res = await this.repo.findOne({ where: { id, tenantId } });
    if (!res) throw new NotFoundException('Cita no encontrada');

    const cleanReason = (reason || 'No cayó / Comprobante inválido').trim();
    res.paymentReported = false;
    res.paymentRejectedReason = cleanReason;

    if (Array.isArray(res.abonosHistory)) {
      res.abonosHistory = res.abonosHistory.map(entry => {
        if (entry.status === 'REPORTED' || entry.status === 'REPORTED_PENDING_APPROVAL') {
          return { ...entry, status: 'REJECTED', rejectReason: cleanReason };
        }
        return entry;
      });
      const remainingApproved = res.abonosHistory
        .filter((e: any) => !e.status || e.status === 'APPROVED')
        .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
      res.abonosTotal = remainingApproved;
    } else {
      res.abonosTotal = 0;
    }

    this.recalculatePaymentStatus(res);

    const noteTag = `[Comprobante rechazado: ${cleanReason}]`;
    res.notes = res.notes ? `${res.notes} | ${noteTag}` : noteTag;

    const savedRes = await this.repo.save(res);
    await this.syncLinkedOrder(tenantId, savedRes);

    // Notificación Push al cliente al rechazar comprobante
    try {
      await this.notificationsService.notifyCustomerAppointment(savedRes, {
        title: '❌ Comprobante de Pago Rechazado',
        body: `Tu comprobante de pago fue rechazado (${cleanReason}). Por favor ingresa a tu cita y adjunta un comprobante válido.`
      });
    } catch (err) {}

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

      const productRepo = manager.getRepository(Product);
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
        await this.syncLinkedOrder(tenantId, res, manager);

        try {
          await this.notificationsService.notifyCustomerAppointment(res, {
            title: '⏱️ Desplazamiento de Cita',
            body: `Tu cita de las ${oldTimeStr} fue reprogramada para las ${res.time.substring(0, 5)} por imprevisto en la jornada.`
          });
        } catch (notifyErr) {}

        const baseUrl = process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL || 'https://www.finowork.com';
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
    await this.syncLinkedOrder(tenantId, saved);
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

    const baseUrl = process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL || 'https://www.finowork.com';
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

  async calculateAvailableSlots(tenantId: string, date: string, serviceId?: string, excludeReservationId?: string, employeeId?: string): Promise<string[]> {
    const settingsRepo = this.repo.manager.getRepository(Settings);
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

    // Query active staff in tenant
    const accessRepo = this.repo.manager.getRepository(UserTenantAccess);
    const allAccesses = await accessRepo.find({
      where: { tenantId, isActive: true, status: 'ACCEPTED' },
      relations: { user: true },
    });
    const staffList = allAccesses.filter(a => {
      if (!a.user) return false;
      const userRoles: string[] = Array.isArray(a.roles) && a.roles.length > 0
        ? a.roles
        : [a.role || a.user.role].filter(Boolean);
      const isExclusivelyDelivery = userRoles.length > 0 && userRoles.every(r => r === UserRole.DELIVERY);
      if (isExclusivelyDelivery) return false;

      const titleAndName = `${a.jobTitle || ''} ${a.user?.name || ''} ${a.user?.username || ''}`.toLowerCase();
      const isJanitorial = /limpieza|mantenimiento|vigilancia|seguridad|aseo/i.test(titleAndName);
      if (isJanitorial) return false;

      return true;
    });

    // Query products for service durations (match by ID and name)
    const productRepo = this.repo.manager.getRepository(Product);
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
    const reservationRepo = this.repo.manager.getRepository(Reservation);
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

      if (Array.isArray(r.serviceSpecialists) && r.serviceSpecialists.length > 0) {
        let segStart = startMins;
        for (const s of r.serviceSpecialists) {
          const sp = s.serviceId ? productMap.get(s.serviceId) : null;
          const dur = Number(s.durationMinutes) || Number(sp?.durationMinutes) || interval;
          busyBookings.push({
            employeeId: s.employeeId || null,
            start: segStart,
            end: segStart + dur,
          });
          segStart += dur;
        }
      } else {
        busyBookings.push({
          employeeId: r.employeeId || null,
          start: startMins,
          end: startMins + rDuration,
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

        if (isSoloBusiness) {
          const hasOverlap = busyBookings.some(b => currentMins < b.end && slotEnd > b.start);
          if (!hasOverlap) {
            const timeStr = this.minutesToTime(currentMins).substring(0, 5);
            if (!slots.includes(timeStr)) {
              slots.push(timeStr);
            }
          }
        } else if (employeeId) {
          const emp = candidateStaff[0];
          if (emp) {
            const { entry: empEntry, exit: empExit, lStart, lEnd } = getStaffBounds(emp);
            if (empEntry !== null && currentMins < empEntry) {
              currentMins += interval;
              continue;
            }
            if (empExit !== null && slotEnd > empExit) {
              currentMins += interval;
              continue;
            }
            if (lStart !== null && lEnd !== null && currentMins < lEnd && slotEnd > lStart) {
              currentMins += interval;
              continue;
            }
            const empDirectOverlap = busyBookings.some(
              b => (b.employeeId === emp.userId || b.employeeId === emp.id || b.employeeId === emp.user?.id) && currentMins < b.end && slotEnd > b.start
            );
            if (!empDirectOverlap) {
              const unassignedCount = busyBookings.filter(
                b => !b.employeeId && currentMins < b.end && slotEnd > b.start
              ).length;
              if (unassignedCount > 0) {
                const totalFreeWorkingStaff = staffList.filter(s => {
                  const { entry: sEntry, exit: sExit, lStart: sLStart, lEnd: sLEnd } = getStaffBounds(s);
                  if (sEntry !== null && currentMins < sEntry) return false;
                  if (sExit !== null && slotEnd > sExit) return false;
                  if (sLStart !== null && sLEnd !== null && currentMins < sLEnd && slotEnd > sLStart) return false;
                  return !busyBookings.some(b => (b.employeeId === s.userId || b.employeeId === s.id || b.employeeId === s.user?.id) && currentMins < b.end && slotEnd > b.start);
                }).length;

                if (totalFreeWorkingStaff <= unassignedCount) {
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
              b => !b.employeeId && segStart < b.end && segEnd > b.start
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
          const freeCandidateStaff = candidateStaff.filter(st => {
            const { entry: stEntry, exit: stExit, lStart: stLStart, lEnd: stLEnd } = getStaffBounds(st);
            if (stEntry !== null && currentMins < stEntry) return false;
            if (stExit !== null && slotEnd > stExit) return false;
            if (stLStart !== null && stLEnd !== null && currentMins < stLEnd && slotEnd > stLStart) return false;
            return !busyBookings.some(b => (b.employeeId === st.userId || b.employeeId === st.id || b.employeeId === st.user?.id) && currentMins < b.end && slotEnd > b.start);
          });

          const unassignedOverlapCount = busyBookings.filter(
            b => !b.employeeId && currentMins < b.end && slotEnd > b.start
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

  async checkSlotAvailability(tenantId: string, date: string, time: string, serviceId?: string, excludeReservationId?: string, employeeId?: string): Promise<boolean> {
    const slots = await this.calculateAvailableSlots(tenantId, date, serviceId, excludeReservationId, employeeId);
    return slots.includes(time.substring(0, 5));
  }
}

