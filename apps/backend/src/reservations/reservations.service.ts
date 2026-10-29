import { Injectable, BadRequestException, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Reservation } from '../entities/reservation.entity';
import { Order, SplitPaymentItem } from '../entities/order.entity';
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
      await this.repo.query(`ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "isBlock" boolean DEFAULT false;`);
      await this.repo.query(`ALTER TABLE "order_item" ADD COLUMN IF NOT EXISTS "employeeId" character varying;`);
    } catch (e: any) {
      console.warn('[ReservationsService onModuleInit] Notice:', e?.message || e);
    }
  }

  private getFrontendBaseUrl(): string {
    const rawUrl = (process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL || '').trim();
    const isProd = process.env.NODE_ENV === 'production';
    const isLocal = !rawUrl || rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1');

    if (rawUrl && (!isProd || !isLocal)) {
      return rawUrl.replace(/\/$/, '');
    }
    return 'https://www.finowork.com';
  }

  async syncLinkedOrder(tenantId: string, reservation: Reservation, em?: EntityManager) {
    if (reservation.isBlock) return;
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
          const parsedD = new Date(`${reservation.date}T${timePart}-04:00`);
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
          try {
            const orderItemRepo = manager.getRepository(OrderItem);
            if (typeof orderItemRepo?.find === 'function') {
              const ordItems = await orderItemRepo.find({ where: { orderId: order.id } });
              for (const it of ordItems) {
                if (it.deliveredQuantity !== it.quantity) {
                  it.deliveredQuantity = it.quantity;
                  await orderItemRepo.save(it);
                }
              }
            }
          } catch {}
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

        // Sincronizar abonos confirmados a splitPayments, paymentMethod y amountBs
        const validAbonos = Array.isArray(reservation.abonosHistory)
          ? reservation.abonosHistory.filter((a: any) => !a.status || a.status === 'APPROVED')
          : [];

        if (validAbonos.length > 0) {
          const rateToUse = Number(order.exchangeRate) > 0 ? Number(order.exchangeRate) : 1;
          const mappedSplits: SplitPaymentItem[] = validAbonos.map((a: any) => {
            const usd = Number(a.amount || 0);
            const bs = (a.amountBs !== undefined && a.amountBs !== null && Number(a.amountBs) > 0)
              ? Number(a.amountBs)
              : Number((usd * rateToUse).toFixed(2));
            return {
              method: (a.method || order.paymentMethod || 'PAGO_MOVIL').toUpperCase(),
              amountUSD: usd,
              amountBS: bs,
              reference: a.reference || a.ref || undefined,
            };
          });

          order.splitPayments = mappedSplits;

          // Si el paymentMethod de la orden era ON_ARRIVAL, PENDING o estaba vacío, actualizarlo
          const distinctMethods = Array.from(new Set(mappedSplits.map(s => s.method)));
          if (!order.paymentMethod || ['ON_ARRIVAL', 'PENDING'].includes(order.paymentMethod.toUpperCase())) {
            if (distinctMethods.length === 1) {
              order.paymentMethod = distinctMethods[0];
            } else if (distinctMethods.length > 1) {
              order.paymentMethod = 'SPLIT';
            }
          }

          // Sincronizar referencias según los métodos aprobados
          for (const s of mappedSplits) {
            if (s.reference) {
              if (['PAGO_MOVIL', 'PAGOMOVIL'].includes(s.method) && !order.pagoMovilRef) {
                order.pagoMovilRef = s.reference;
              } else if (['TRANSFER', 'TRANSFERENCIA'].includes(s.method) && !order.transferRef) {
                order.transferRef = s.reference;
              } else if (['BINANCE', 'BINANCE_USDT', 'USDT'].includes(s.method) && !order.binanceRef) {
                order.binanceRef = s.reference;
              } else if (['PUNTO', 'POS', 'CARD_POS'].includes(s.method) && !order.puntoRef) {
                order.puntoRef = s.reference;
              }
            }
          }

          // Sincronizar amountBs de la orden si está vacío o es 0
          const totalBsFromAbonos = mappedSplits.reduce((acc, s) => acc + (Number(s.amountBS) || 0), 0);
          if (totalBsFromAbonos > 0 && (!order.amountBs || Number(order.amountBs) <= 0)) {
            order.amountBs = totalBsFromAbonos;
          }
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
    if (reservation.isBlock) return null;
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
        const parsedD = new Date(`${reservation.date}T${timePart}-04:00`);
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
              deliveredQuantity: initialStatus === OrderStatus.DELIVERED ? 1 : 0,
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
    return this.repo.find({
      where: { tenantId },
      relations: { employee: true, customer: true },
      order: { date: 'ASC', time: 'ASC' }
    });
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

  async findAvailableSpecialist(
    tenantId: string,
    date: string,
    time: string,
    durationMinutes: number,
    serviceId?: string,
    serviceName?: string,
    excludeReservationId?: string,
    manager?: EntityManager,
    excludeStaffIds?: string[],
  ): Promise<{ employeeId: string; employeeName: string; staff: any } | null> {
    const em = manager || this.repo.manager;
    const accessRepo = em.getRepository(UserTenantAccess);
    let allAccesses: any[] = [];
    try {
      allAccesses = await accessRepo.find({
        where: { tenantId, isActive: true, status: 'ACCEPTED' },
        relations: { user: true },
      });
    } catch {
      allAccesses = [];
    }

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

    if (staffList.length === 0) return null;

    const toMins = (t?: string | null) => {
      if (!t || typeof t !== 'string' || !t.includes(':')) return null;
      const [h, m] = t.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return null;
      return h * 60 + m;
    };

    const getStaffBounds = (st: any) => {
      const entry = toMins(st?.entryTime);
      let exit = toMins(st?.exitTime);
      if (entry !== null && exit !== null && exit < entry && exit + 720 <= 1440 && exit + 720 > entry) {
        exit += 720;
      }
      const lStart = toMins(st?.lunchStart);
      const lEnd = toMins(st?.lunchEnd);
      return { entry, exit, lStart, lEnd };
    };

    const [th, tm] = (time || '00:00').trim().split(':').map(Number);
    const reqStart = (th || 0) * 60 + (tm || 0);
    const reqEnd = reqStart + durationMinutes;

    const productRepo = em.getRepository(Product);
    const allProducts = await productRepo.find({ where: { tenantId } });
    const productMap = new Map<string, Product>(allProducts.map(p => [p.id, p]));
    const productNameMap = new Map<string, Product>(allProducts.map(p => [p.name.trim().toLowerCase(), p]));

    const isStaffInSet = (st: any, set: string[]) =>
      set.includes(st.userId) || set.includes(st.id) || (st.user && set.includes(st.user.id));

    let candidateStaff = staffList;
    if (excludeStaffIds && excludeStaffIds.length > 0) {
      candidateStaff = candidateStaff.filter(st =>
        !excludeStaffIds.includes(st.userId) &&
        !excludeStaffIds.includes(st.id) &&
        (!st.user || !excludeStaffIds.includes(st.user.id))
      );
    }
    const requestedServices = serviceId
      ? serviceId.split(',').map(s => productMap.get(s.trim())).filter(Boolean) as Product[]
      : (serviceName ? serviceName.split(',').map(s => productNameMap.get(s.trim().toLowerCase())).filter(Boolean) as Product[] : []);

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

    const resRepo = em.getRepository(Reservation);
    const qb = resRepo.createQueryBuilder('res')
      .where('res.tenantId = :tenantId', { tenantId })
      .andWhere('res.date = :date', { date })
      .andWhere('res.status IN (:...statuses)', { statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] });

    if (excludeReservationId) {
      qb.andWhere('res.id != :exclude', { exclude: excludeReservationId });
    }
    const existing = await qb.getMany();

    const busyBookings: Array<{ employeeId: string | null; start: number; end: number; isBlock?: boolean; serviceId?: string }> = [];
    const settingsRepo = em.getRepository('Settings');
    const settings: any = await settingsRepo.findOne({ where: { tenantId } });
    const interval = Number(settings?.slotInterval) || 30;

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
      if (exDuration <= 0) exDuration = interval;

      if (Array.isArray(res.serviceSpecialists) && res.serviceSpecialists.length > 0 && !res.isBlock) {
        const resSimultaneous = Boolean((res as any).isSimultaneous);
        let segStart = exStart;
        for (const s of res.serviceSpecialists) {
          const sp = s.serviceId ? productMap.get(s.serviceId) : null;
          const dur = Number(s.durationMinutes) || Number(sp?.durationMinutes) || interval;
          const currentStart = resSimultaneous ? exStart : segStart;
          busyBookings.push({
            employeeId: s.employeeId || null,
            start: currentStart,
            end: currentStart + dur,
            isBlock: false,
            serviceId: s.serviceId,
          });
          if (!resSimultaneous) {
            segStart += dur;
          }
        }
      } else {
        busyBookings.push({
          employeeId: res.employeeId || null,
          start: exStart,
          end: exStart + exDuration,
          isBlock: Boolean(res.isBlock),
          serviceId: res.serviceId,
        });
      }
    }

    const availableStaff = candidateStaff.filter(st => {
      const { entry, exit, lStart, lEnd } = getStaffBounds(st);
      if (entry !== null && reqStart < entry) return false;
      if (exit !== null && reqEnd > exit) return false;
      if (lStart !== null && lEnd !== null && reqStart < lEnd && reqEnd > lStart) return false;

      const hasCollision = busyBookings.some(b => {
        const isThisStaff = b.employeeId === st.userId || b.employeeId === st.id || (st.user && b.employeeId === st.user.id);
        return isThisStaff && reqStart < b.end && reqEnd > b.start;
      });
      if (hasCollision) return false;

      // Ensure this staff member isn't the sole qualified provider for an unassigned booking overlapping this window
      const overlappingUnassigned = busyBookings.filter(
        b => !b.employeeId && !b.isBlock && reqStart < b.end && reqEnd > b.start
      );
      for (const ub of overlappingUnassigned) {
        let ubQualifiedStaff = staffList;
        if (ub.serviceId) {
          const ubProd = productMap.get(ub.serviceId);
          const raw: any = ubProd?.assignedStaffIds;
          let ubAssignedIds: string[] = [];
          if (Array.isArray(raw)) ubAssignedIds = raw;
          else if (typeof raw === 'string' && raw.trim()) ubAssignedIds = raw.split(',').map((x: string) => x.trim()).filter(Boolean);
          if (ubAssignedIds.length > 0) {
            const match = staffList.filter(s => isStaffInSet(s, ubAssignedIds));
            if (match.length > 0) ubQualifiedStaff = match;
          }
        }
        const isThisStaffQualifiedForUb = ubQualifiedStaff.some(s => isStaffInSet(s, [st.userId, st.id, st.user?.id].filter(Boolean)));
        if (isThisStaffQualifiedForUb) {
          const otherFree = ubQualifiedStaff.filter(s => {
            if (s.userId === st.userId || s.id === st.id || s.user?.id === st.user?.id) return false;
            const { entry: se, exit: sx, lStart: sls, lEnd: sle } = getStaffBounds(s);
            if (se !== null && reqStart < se) return false;
            if (sx !== null && reqEnd > sx) return false;
            if (sls !== null && sle !== null && reqStart < sle && reqEnd > sls) return false;
            return !busyBookings.some(b => (b.employeeId === s.userId || b.employeeId === s.id || (s.user && b.employeeId === s.user.id)) && reqStart < b.end && reqEnd > b.start);
          });
          if (otherFree.length === 0) {
            return false;
          }
        }
      }

      return true;
    });

    if (availableStaff.length === 0) return null;

    if (availableStaff.length === 1) {
      const emp = availableStaff[0];
      const empId = emp.userId || emp.user?.id || emp.id;
      const empName = emp.user?.name || emp.user?.username || emp.jobTitle || 'Especialista';
      return { employeeId: empId, employeeName: empName, staff: emp };
    }

    // Load balancing: pick specialist with fewest appointments on this date
    const staffApptCounts = new Map<string, number>();
    for (const st of availableStaff) {
      const sId = st.userId || st.user?.id || st.id;
      const count = existing.filter(r =>
        r.employeeId === sId || r.employeeId === st.id || r.employeeId === st.userId ||
        (Array.isArray(r.serviceSpecialists) && r.serviceSpecialists.some((ss: any) => ss.employeeId === sId || ss.employeeId === st.id || ss.employeeId === st.userId))
      ).length;
      staffApptCounts.set(sId, count);
    }

    availableStaff.sort((a, b) => {
      const aId = a.userId || a.user?.id || a.id;
      const bId = b.userId || b.user?.id || b.id;
      return (staffApptCounts.get(aId) || 0) - (staffApptCounts.get(bId) || 0);
    });

    const chosen = availableStaff[0];
    const chosenId = chosen.userId || chosen.user?.id || chosen.id;
    const chosenName = chosen.user?.name || chosen.user?.username || chosen.jobTitle || 'Especialista';
    return { employeeId: chosenId, employeeName: chosenName, staff: chosen };
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
    isSimultaneous?: boolean,
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
        const dur = (sp && sp.durationMinutes) ? Number(sp.durationMinutes) : interval;
        if (isSimultaneous) {
          reqDuration = Math.max(reqDuration, dur);
        } else {
          reqDuration += dur;
        }
      }
    }
    if (reqDuration === 0 && serviceName) {
      const names = serviceName.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      for (const nm of names) {
        const sp = productNameMap.get(nm);
        const dur = (sp && sp.durationMinutes) ? Number(sp.durationMinutes) : interval;
        if (isSimultaneous) {
          reqDuration = Math.max(reqDuration, dur);
        } else {
          reqDuration += dur;
        }
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

    const allAssignedStaffIds = new Set<string>();
    for (const p of products) {
      const raw = (p as any)?.assignedStaffIds;
      if (Array.isArray(raw)) {
        raw.forEach((sid: any) => allAssignedStaffIds.add(String(sid).trim()));
      } else if (typeof raw === 'string' && raw.trim()) {
        raw.split(',').forEach((sid: any) => allAssignedStaffIds.add(sid.trim()));
      }
    }

    const staffList = allStaff.filter(a => {
      if (!a.user) return false;
      if (allAssignedStaffIds.has(a.user.id) || employeeId === a.user.id || serviceSpecialists?.some(s => s.employeeId === a.user.id)) {
        return true;
      }

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
      isBlock?: boolean;
      serviceId?: string;
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

      if (Array.isArray(res.serviceSpecialists) && res.serviceSpecialists.length > 0 && !res.isBlock) {
        const resSimultaneous = Boolean((res as any).isSimultaneous);
        let segStart = exStart;
        for (const s of res.serviceSpecialists) {
          const sp = s.serviceId ? productMap.get(s.serviceId) : null;
          const dur = Number(s.durationMinutes) || Number(sp?.durationMinutes) || interval;
          const currentStart = resSimultaneous ? exStart : segStart;
          busyBookings.push({
            employeeId: s.employeeId || null,
            customerName: res.customerName || 'Cliente',
            start: currentStart,
            end: currentStart + dur,
            isBlock: false,
            serviceId: s.serviceId || res.serviceId,
          });
          if (!resSimultaneous) {
            segStart += dur;
          }
        }
      } else {
        busyBookings.push({
          employeeId: res.employeeId || null,
          customerName: res.customerName || (res.isBlock ? 'Bloqueo de Horario' : 'Cliente'),
          start: exStart,
          end: exStart + exDuration,
          isBlock: Boolean(res.isBlock),
          serviceId: res.serviceId,
        });
      }
    }

    // Check store-wide schedule blocks first (isBlock = true and no employeeId)
    const storeBlockCollision = busyBookings.find(
      b => b.isBlock && !b.employeeId && reqStart < b.end && reqEnd > b.start
    );
    if (storeBlockCollision) {
      throw new BadRequestException(
        `El comercio tiene un bloqueo de horario registrado ("${storeBlockCollision.customerName}" de ${formatTime(storeBlockCollision.start)} a ${formatTime(storeBlockCollision.end)}). Si deseas agendarla de todas formas, confirma para forzar.`
      );
    }

    // Si la cita tiene asignación específica de especialistas por servicio
    if (Array.isArray(serviceSpecialists) && serviceSpecialists.length > 0) {
      if (isSimultaneous && serviceSpecialists.length > 1) {
        const assignedIds = serviceSpecialists.map(s => s.employeeId).filter(Boolean);
        const uniqueIds = new Set(assignedIds);
        if (assignedIds.length > 0 && uniqueIds.size < assignedIds.length) {
          throw new BadRequestException(
            'En una cita con servicios simultáneos, cada servicio debe ser atendido por un especialista diferente.'
          );
        }
      }

      let currentSegStart = reqStart;
      for (const spec of serviceSpecialists) {
        const sProd = spec.serviceId ? productMap.get(spec.serviceId) : null;
        const dur = Number(spec.durationMinutes) || Number(sProd?.durationMinutes) || interval;
        const segStart = isSimultaneous ? reqStart : currentSegStart;
        const segEnd = segStart + dur;
        if (!isSimultaneous) currentSegStart = segEnd;

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
            if (directCollision.isBlock) {
              throw new BadRequestException(
                `El especialista ${spec.employeeName || emp?.user?.username || ''} tiene el horario bloqueado ("${directCollision.customerName}" de ${formatTime(directCollision.start)} a ${formatTime(directCollision.end)}). Si deseas agendarla de todas formas, confirma para forzar.`
              );
            }
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
        b => (b.employeeId === employeeId || (emp && (b.employeeId === emp.userId || b.employeeId === emp.id || (emp.user && b.employeeId === emp.user.id)))) &&
             reqStart < b.end && reqEnd > b.start
      );
      if (directCollision) {
        if (directCollision.isBlock) {
          throw new BadRequestException(
            `El especialista tiene un bloqueo de horario registrado ("${directCollision.customerName}" de ${formatTime(directCollision.start)} a ${formatTime(directCollision.end)}). Si deseas agendarla de todas formas, confirma para forzar.`
          );
        }
        throw new BadRequestException(
          `El especialista ya tiene una cita asignada con "${directCollision.customerName}" (${formatTime(directCollision.start)} a ${formatTime(directCollision.end)}). Si deseas agendarla de todas formas, confirma para forzar.`
        );
      }

      // Check unassigned bookings consuming total staff capacity
      const overlappingUnassigned = busyBookings.filter(
        b => !b.employeeId && !b.isBlock && reqStart < b.end && reqEnd > b.start
      );
      if (overlappingUnassigned.length > 0) {
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
          const isEmpQualifiedForUb = ubQualifiedStaff.some(st => st.userId === employeeId || st.id === employeeId || st.user?.id === employeeId);
          if (isEmpQualifiedForUb) {
            const otherFree = ubQualifiedStaff.filter(st => {
              if (st.userId === employeeId || st.id === employeeId || st.user?.id === employeeId) return false;
              if (st.entryTime && reqStart < toMins(st.entryTime)) return false;
              if (st.exitTime && reqEnd > toMins(st.exitTime)) return false;
              if (st.lunchStart && st.lunchEnd && reqStart < toMins(st.lunchEnd) && reqEnd > toMins(st.lunchStart)) return false;
              return !busyBookings.some(b => (b.employeeId === st.userId || b.employeeId === st.id || (st.user && b.employeeId === st.user.id)) && reqStart < b.end && reqEnd > b.start);
            });
            if (otherFree.length === 0) {
              throw new BadRequestException(
                `El horario choca con otra cita pendiente de especialista ("${ub.customerName}" ${formatTime(ub.start)} a ${formatTime(ub.end)}) que requiere la atención de este especialista. Si deseas agendarla de todas formas, confirma para forzar.`
              );
            }
          }
        }

        const totalFreeWorkingStaff = staffList.filter(s => {
          if (s.entryTime && reqStart < toMins(s.entryTime)) return false;
          if (s.exitTime && reqEnd > toMins(s.exitTime)) return false;
          if (s.lunchStart && s.lunchEnd && reqStart < toMins(s.lunchEnd) && reqEnd > toMins(s.lunchStart)) return false;
          return !busyBookings.some(b => (b.employeeId === s.userId || b.employeeId === s.id || (s.user && b.employeeId === s.user.id)) && reqStart < b.end && reqEnd > b.start);
        }).length;

        if (totalFreeWorkingStaff <= overlappingUnassigned.length) {
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
        return !busyBookings.some(b => (b.employeeId === st.userId || b.employeeId === st.id || (st.user && b.employeeId === st.user.id)) && reqStart < b.end && reqEnd > b.start);
      });

      const unassignedOverlapCount = busyBookings.filter(
        b => !b.employeeId && !b.isBlock && reqStart < b.end && reqEnd > b.start
      ).length;

      const availableCapacity = freeCandidateStaff.length - unassignedOverlapCount;

      if (availableCapacity <= 0) {
        throw new BadRequestException(
          `No hay especialistas disponibles en este horario (${formatTime(reqStart)} a ${formatTime(reqEnd)}). Todos los especialistas se encuentran ocupados o en receso.`
        );
      }
    }
  }

  private async calculateServiceDuration(tenantId: string, serviceId?: string, serviceName?: string, explicitMinutes?: number, isSimultaneous?: boolean): Promise<number> {
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
        const dur = (sp && sp.durationMinutes) ? Number(sp.durationMinutes) : interval;
        if (isSimultaneous) {
          reqDuration = Math.max(reqDuration, dur);
        } else {
          reqDuration += dur;
        }
      }
    }
    if (reqDuration === 0 && serviceName) {
      const names = serviceName.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      for (const nm of names) {
        const sp = productNameMap.get(nm);
        const dur = (sp && sp.durationMinutes) ? Number(sp.durationMinutes) : interval;
        if (isSimultaneous) {
          reqDuration = Math.max(reqDuration, dur);
        } else {
          reqDuration += dur;
        }
      }
    }
    return reqDuration > 0 ? reqDuration : interval;
  }

  async create(tenantId: string, dto: any) {
    return this.repo.manager.transaction(async (manager) => {
      if (dto.date) {
        await manager.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`${tenantId}_${dto.date}`]);
      }

      const settingsRepo = manager.getRepository('Settings');
      const settings: any = await settingsRepo.findOne({ where: { tenantId } });
      const allowSimultaneous = Boolean(settings?.allowSimultaneousServices);

      let isSimultaneous = dto.isSimultaneous !== undefined ? Boolean(dto.isSimultaneous) : false;
      let duration = dto.durationMinutes || await this.calculateServiceDuration(tenantId, dto.serviceId, dto.serviceName, undefined, isSimultaneous);

      // Auto-asignar especialista si no se especificó uno ("Cualquiera disponible")
      if (!dto.employeeId && dto.date && dto.time) {
        const autoStaff = await this.findAvailableSpecialist(
          tenantId,
          dto.date,
          dto.time,
          duration,
          dto.serviceId,
          dto.serviceName,
          undefined,
          manager,
        );
        if (autoStaff) {
          dto.employeeId = autoStaff.employeeId;
          dto.employeeName = autoStaff.employeeName;
        }
      } else if (dto.employeeId && !dto.employeeName) {
        try {
          const accessRepo = manager.getRepository(UserTenantAccess);
          const empAcc = await accessRepo.findOne({
            where: [
              { userId: dto.employeeId, tenantId },
              { id: dto.employeeId, tenantId },
            ],
            relations: { user: true },
          });
          if (empAcc) {
            dto.employeeName = empAcc.user?.name || empAcc.user?.username || empAcc.jobTitle;
          }
        } catch (e) {}
      }

      let effectiveSpecialists = dto.serviceSpecialists;
      if (!effectiveSpecialists && dto.serviceId && dto.serviceId.includes(',')) {
        const sIds = dto.serviceId.split(',').map((s: string) => s.trim()).filter(Boolean);
        const productRepo = manager.getRepository(Product);
        const autoSpecialists: any[] = [];
        let segCurMins = (dto.time || '00:00').split(':').map(Number);
        let curMins = (segCurMins[0] || 0) * 60 + (segCurMins[1] || 0);

        const shouldAttemptSimultaneous = allowSimultaneous && !dto.employeeId;
        for (const sId of sIds) {
          const prod: any = await productRepo.findOne({ where: { id: sId, tenantId } });
          if (prod) {
            const segDuration = Number(prod.durationMinutes || 30);
            const segTimeStr = shouldAttemptSimultaneous ? (dto.time || '00:00').substring(0, 5) : this.minutesToTime(curMins).substring(0, 5);
            const excludeStaffIds = shouldAttemptSimultaneous ? autoSpecialists.map(a => a.employeeId).filter(Boolean) : [];

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
            } else if (!itemEmpId || (activeStaffIds.length > 0 && !activeStaffIds.includes(itemEmpId))) {
              // Auto-assign qualified specialist for this segment
              const segStaff = await this.findAvailableSpecialist(
                tenantId,
                dto.date,
                segTimeStr,
                segDuration,
                prod.id,
                prod.name,
                undefined,
                manager,
                excludeStaffIds,
              );
              if (segStaff) {
                itemEmpId = segStaff.employeeId;
                itemEmpName = segStaff.employeeName;
              }
            }

            if (itemEmpId && (!itemEmpName || itemEmpId !== dto.employeeId)) {
              try {
                const empAcc: any = await accessRepo.findOne({
                  where: { userId: itemEmpId, tenantId },
                  relations: { user: true },
                });
                if (empAcc?.user?.name || empAcc?.user?.username) {
                  itemEmpName = empAcc.user.name || empAcc.user.username;
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
              durationMinutes: segDuration,
            });

            curMins += segDuration;
          }
        }
        if (autoSpecialists.length > 0) {
          effectiveSpecialists = autoSpecialists;
          if (!dto.employeeId && autoSpecialists[0]?.employeeId) {
            dto.employeeId = autoSpecialists[0].employeeId;
            dto.employeeName = autoSpecialists[0].employeeName;
          }
          if (allowSimultaneous && autoSpecialists.length > 1 && dto.isSimultaneous === undefined) {
            const assignedIds = autoSpecialists.map(a => a.employeeId).filter(Boolean);
            const uniqueIds = new Set(assignedIds);
            if (assignedIds.length === autoSpecialists.length && uniqueIds.size === assignedIds.length) {
              isSimultaneous = true;
              duration = await this.calculateServiceDuration(tenantId, dto.serviceId, dto.serviceName, undefined, true);
            }
          }
        }
      }

      if (dto.date && dto.time && !dto.force) {
        await this.validateBusinessHours(tenantId, dto.date, dto.time, duration);
        await this.validateSlotOverlap(tenantId, dto.date, dto.time, dto.serviceId, dto.serviceName, undefined, dto.employeeId, manager, duration, effectiveSpecialists, isSimultaneous);
      }
      if (dto.numberOfPeople !== undefined && dto.numberOfPeople <= 0) throw new BadRequestException('La cantidad de personas debe ser mayor a 0');
      if (dto.totalAmount !== undefined && dto.totalAmount < 0) throw new BadRequestException('El monto total no puede ser negativo');
      
      const reservation = new Reservation();
      Object.assign(reservation, dto);
      reservation.tenantId = tenantId;
      reservation.durationMinutes = duration;
      reservation.isSimultaneous = isSimultaneous;
      reservation.employeeId = dto.employeeId || null;
      reservation.employeeName = dto.employeeName || null;
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

      const isSimultaneous = dto.isSimultaneous !== undefined ? Boolean(dto.isSimultaneous) : Boolean(reservation.isSimultaneous);
      const duration = dto.durationMinutes || reservation.durationMinutes || await this.calculateServiceDuration(tenantId, dto.serviceId || reservation.serviceId, dto.serviceName || reservation.serviceName, undefined, isSimultaneous);

      const shouldValidateSlot = (dto.date || dto.time || dto.employeeId !== undefined || dto.serviceSpecialists !== undefined || dto.isSimultaneous !== undefined) && !dto.force;
      if (shouldValidateSlot) {
        if (dto.date || dto.time) {
          await this.validateBusinessHours(tenantId, targetDate, targetTime, duration);
        }
        await this.validateSlotOverlap(tenantId, targetDate, targetTime, dto.serviceId || reservation.serviceId, dto.serviceName || reservation.serviceName, id, dto.employeeId !== undefined ? dto.employeeId : reservation.employeeId, manager, duration, dto.serviceSpecialists !== undefined ? dto.serviceSpecialists : reservation.serviceSpecialists, isSimultaneous);
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
      reservation.isSimultaneous = isSimultaneous;
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
        await this.validateSlotOverlap(tenantId, dto.date, tfFormatted, reservation.serviceId, reservation.serviceName, id, reservation.employeeId, manager, duration, reservation.serviceSpecialists, reservation.isSimultaneous);
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

      const baseUrl = this.getFrontendBaseUrl();
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
    const methodToUse = (res as any).paymentMethod && (res as any).paymentMethod !== 'ON_ARRIVAL' ? (res as any).paymentMethod : 'PAGO_MOVIL';
    res.abonosHistory.push({ id: randomUUID(), amount: total, date: new Date().toISOString(), status: 'APPROVED', method: methodToUse });
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
        if (res.isBlock) continue;
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

        const baseUrl = this.getFrontendBaseUrl();
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

  private hasDistinctAssignment(pools: any[][], index = 0, usedIds = new Set<string>()): boolean {
    if (index >= pools.length) return true;
    for (const st of pools[index]) {
      const id = st?.userId || st?.id || st?.user?.id;
      if (!id || usedIds.has(id)) continue;
      usedIds.add(id);
      if (this.hasDistinctAssignment(pools, index + 1, usedIds)) {
        return true;
      }
      usedIds.delete(id);
    }
    return false;
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

    const baseUrl = this.getFrontendBaseUrl();
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

    // Query products for service durations (match by ID and name)
    const productRepo = this.repo.manager.getRepository(Product);
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
    const accessRepo = this.repo.manager.getRepository(UserTenantAccess);
    const allAccesses = await accessRepo.find({
      where: { tenantId, isActive: true, status: 'ACCEPTED' },
      relations: { user: true },
    });
    const staffList = allAccesses.filter(a => {
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

    let duration = 0;
    if (serviceId) {
      const sIds = serviceId.split(',').map(s => s.trim()).filter(Boolean);
      for (const sId of sIds) {
        const sp = productMap.get(sId);
        const sDur = (sp && sp.durationMinutes) ? Number(sp.durationMinutes) : interval;
        if (settings?.allowSimultaneousServices && !employeeId) {
          duration = Math.max(duration, sDur);
        } else {
          duration += sDur;
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
        const rSimultaneous = Boolean((r as any).isSimultaneous);
        let segStart = startMins;
        for (const s of r.serviceSpecialists) {
          const sp = s.serviceId ? productMap.get(s.serviceId) : null;
          const dur = Number(s.durationMinutes) || Number(sp?.durationMinutes) || interval;
          const currentStart = rSimultaneous ? startMins : segStart;
          busyBookings.push({
            employeeId: s.employeeId || null,
            start: currentStart,
            end: currentStart + dur,
            isBlock: false,
            serviceId: s.serviceId || r.serviceId,
          });
          if (!rSimultaneous) {
            segStart += dur;
          }
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
          const allowSimultaneous = Boolean(settings?.allowSimultaneousServices);
          let isSimultaneousFeasible = false;

          if (allowSimultaneous && !employeeId) {
            const pools: any[][] = [];
            for (const sProd of requestedServices) {
              const sDur = Number((sProd as any).durationMinutes) || interval;
              const sEnd = currentMins + sDur;
              let segQualified = staffList;
              const raw = (sProd as any)?.assignedStaffIds;
              let assignedIds: string[] = [];
              if (Array.isArray(raw)) assignedIds = raw;
              else if (typeof raw === 'string' && raw.trim()) assignedIds = raw.split(',').map((x: string) => x.trim()).filter(Boolean);
              if (assignedIds.length > 0) {
                const matched = segQualified.filter(st =>
                  assignedIds.includes(st.userId) || assignedIds.includes(st.id) || (st.user && assignedIds.includes(st.user.id))
                );
                segQualified = matched.length > 0 ? matched : staffList;
              }
              const freeForSvc = segQualified.filter(st => {
                const { entry: stEntry, exit: stExit, lStart: stLStart, lEnd: stLEnd } = getStaffBounds(st);
                if (stEntry !== null && currentMins < stEntry) return false;
                if (stExit !== null && sEnd > stExit) return false;
                if (stLStart !== null && stLEnd !== null && currentMins < stLEnd && sEnd > stLStart) return false;
                return !busyBookings.some(b =>
                  (b.employeeId === st.userId || b.employeeId === st.id || (st.user && b.employeeId === st.user.id)) &&
                  currentMins < b.end && sEnd > b.start
                );
              });
              pools.push(freeForSvc);
            }

            const unassignedSimulCount = busyBookings.filter(
              b => !b.employeeId && !b.isBlock && currentMins < b.end && (currentMins + duration) > b.start
            ).length;

            if (this.hasDistinctAssignment(pools) && (pools.reduce((sum, p) => sum + p.length, 0) > unassignedSimulCount)) {
              isSimultaneousFeasible = true;
            }
          }

          if (isSimultaneousFeasible) {
            const timeStr = this.minutesToTime(currentMins).substring(0, 5);
            if (!slots.includes(timeStr)) {
              slots.push(timeStr);
            }
            currentMins += interval;
            continue;
          }

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

  async checkSlotAvailability(tenantId: string, date: string, time: string, serviceId?: string, excludeReservationId?: string, employeeId?: string): Promise<boolean> {
    const slots = await this.calculateAvailableSlots(tenantId, date, serviceId, excludeReservationId, employeeId);
    return slots.includes(time.substring(0, 5));
  }

  async createScheduleBlock(
    tenantId: string,
    dto: {
      startDate: string;
      endDate?: string;
      startTime?: string;
      endTime?: string;
      allDay?: boolean;
      employeeId?: string;
      employeeName?: string;
      reason?: string;
    }
  ) {
    if (!dto.startDate) {
      throw new BadRequestException('La fecha de inicio es obligatoria');
    }
    const endDateStr = dto.endDate && dto.endDate.trim() ? dto.endDate.trim() : dto.startDate.trim();
    if (endDateStr < dto.startDate) {
      throw new BadRequestException('La fecha "Hasta" no puede ser anterior a la fecha "Desde"');
    }

    const startTimeStr = dto.allDay ? '00:00' : (dto.startTime || '08:00').substring(0, 5);
    const endTimeStr = dto.allDay ? '23:59' : (dto.endTime || '18:00').substring(0, 5);

    const startMins = this.timeToMinutes(startTimeStr);
    const endMins = this.timeToMinutes(endTimeStr);
    const durationMinutes = endMins - startMins;

    if (durationMinutes <= 0) {
      throw new BadRequestException('La hora "Hasta" debe ser posterior a la hora "Desde"');
    }

    // Generate list of dates from startDate to endDate (max 60 days safety cap)
    const dates: string[] = [];
    const [sy, sm, sd] = dto.startDate.split('-').map(Number);
    const [ey, em, ed] = endDateStr.split('-').map(Number);
    const current = new Date(Date.UTC(sy, sm - 1, sd, 12, 0, 0));
    const end = new Date(Date.UTC(ey, em - 1, ed, 12, 0, 0));

    let count = 0;
    while (current <= end) {
      if (count >= 60) {
        throw new BadRequestException('El bloqueo no puede superar los 60 días continuos en una sola acción.');
      }
      const yyyy = current.getUTCFullYear();
      const mm = String(current.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(current.getUTCDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
      current.setUTCDate(current.getUTCDate() + 1);
      count++;
    }

    const cleanReason = (dto.reason || '').trim() || (dto.allDay ? 'Día Libre / No Disponible' : 'Horario Bloqueado');
    const targetLabel = dto.employeeId
      ? `🔒 Bloqueo (${dto.employeeName || 'Especialista'})`
      : '🔒 Cierre / Bloqueo de Comercio';

    return this.repo.manager.transaction(async (manager) => {
      let resolvedEmpName = dto.employeeName?.trim() || undefined;
      if (dto.employeeId && !resolvedEmpName) {
        try {
          const accessRepo = manager.getRepository(UserTenantAccess);
          const empAcc: any = await accessRepo.findOne({
            where: [
              { userId: dto.employeeId, tenantId },
              { id: dto.employeeId, tenantId },
            ],
            relations: { user: true },
          });
          if (empAcc?.user) {
            resolvedEmpName = empAcc.user.name || empAcc.user.username;
          }
        } catch (e) {}
      }

      const createdBlocks: Reservation[] = [];
      for (const dateStr of dates) {
        const block = new Reservation();
        block.tenantId = tenantId;
        block.isBlock = true;
        block.customerName = cleanReason;
        block.serviceName = resolvedEmpName ? `🔒 Bloqueo (${resolvedEmpName})` : targetLabel;
        block.date = dateStr;
        block.time = `${startTimeStr}:00`;
        block.durationMinutes = durationMinutes;
        block.employeeId = dto.employeeId || (null as any);
        block.employeeName = resolvedEmpName || (null as any);
        block.status = ReservationStatus.CONFIRMED;
        block.paymentStatus = PaymentStatus.PAID;
        block.totalAmount = 0;
        block.abonosTotal = 0;
        block.abonosHistory = [];
        block.numberOfPeople = 1;
        block.notes = `[Bloqueo de Horario: ${startTimeStr} a ${endTimeStr}] ${cleanReason}`;

        const saved = await manager.save(Reservation, block);
        createdBlocks.push(saved);
      }

      return {
        success: true,
        count: createdBlocks.length,
        blocks: createdBlocks,
        message: createdBlocks.length === 1
          ? `Horario bloqueado con éxito para el ${dates[0]}`
          : `Se bloquearon ${createdBlocks.length} días (${dates[0]} al ${dates[dates.length - 1]}) con éxito`,
      };
    });
  }
}

