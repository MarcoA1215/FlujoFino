import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource, Between, In, Not, MoreThanOrEqual, EntityManager } from 'typeorm';
import { IsOptional, IsArray, IsString, IsNumber, IsBoolean } from 'class-validator';
import { Order, SplitPaymentItem } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Product } from '../entities/product.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { PaymentStatus, OrderStatus, MovementType, DeliveryMethod, UserRole, ReservationStatus } from '@finowork/shared-types';
import { RawMaterial } from '../entities/raw-material.entity';
import { DeliveryZone } from '../entities/delivery-zone.entity';
import { User } from '../entities/user.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { Settings } from '../entities/settings.entity';
import { OperatingExpense } from '../entities/operating-expense.entity';
import { Reservation } from '../entities/reservation.entity';
import { CashExchange } from '../entities/cash-exchange.entity';

export const roundCurrency = (val: number | string | undefined | null): number => {
  return Math.round((Number(val) || 0) * 100) / 100;
};

export class CreateOrderDto {
  @IsString()
  customerName: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  tableNumber?: string;

  @IsOptional()
  paymentStatus?: PaymentStatus;

  @IsOptional()
  deliveryMethod?: DeliveryMethod;

  @IsOptional()
  @IsString()
  deliveryZoneId?: string;

  @IsOptional()
  @IsString()
  deliveryUserId?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  offlineCreatedAt?: string;

  @IsOptional()
  @IsString()
  offlineId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  employee_id?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsArray()
  splitPayments?: SplitPaymentItem[];

  @IsOptional()
  @IsString()
  pagoMovilRef?: string;

  @IsOptional()
  @IsString()
  pagoMovilPhone?: string;

  @IsOptional()
  @IsString()
  pagoMovilCedula?: string;

  @IsOptional()
  @IsString()
  pagoMovilBank?: string;

  @IsOptional()
  @IsString()
  puntoRef?: string;

  @IsOptional()
  @IsString()
  puntoBank?: string;

  @IsOptional()
  @IsString()
  binanceRef?: string;

  @IsOptional()
  @IsString()
  transferRef?: string;

  @IsOptional()
  @IsString()
  transferBank?: string;

  @IsOptional()
  @IsNumber()
  usdReceived?: number;

  @IsOptional()
  @IsNumber()
  changeAmount?: number;

  @IsOptional()
  @IsNumber()
  changeAmountBs?: number;

  @IsOptional()
  @IsString()
  changeMethod?: string;

  @IsOptional()
  @IsString()
  changeRef?: string;

  @IsOptional()
  @IsNumber()
  amountBs?: number;

  @IsOptional()
  @IsNumber()
  exchangeRate?: number;

  @IsOptional()
  @IsArray()
  items: {
    id?: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    removedIngredients?: string[];
    addedExtras?: Array<{ rawMaterialId: string; name: string; priceUSD: number; quantity: number }>;
    hasModifications?: boolean;
  }[];

  @IsOptional()
  @IsNumber()
  initialAbono?: number;

  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @IsString()
  discountType?: string;

  @IsOptional()
  @IsNumber()
  discountValue?: number;

  @IsOptional()
  @IsBoolean()
  bypassMinDeposit?: boolean;

  @IsOptional()
  @IsString()
  linkedReservationId?: string;

  @IsOptional()
  @IsBoolean()
  paymentReported?: boolean;

  @IsOptional()
  @IsString()
  paymentProofUrl?: string;

  @IsOptional()
  @IsString()
  paymentRejectedReason?: string;

  @IsOptional()
  status?: OrderStatus;

  @IsOptional()
  requestedDeliveryDate?: string | Date;
}

export class UpdatePaymentDto {
  status: PaymentStatus;
  paymentMethod?: string;
  notes?: string;
  pagoMovilRef?: string;
  pagoMovilPhone?: string;
  pagoMovilCedula?: string;
  pagoMovilBank?: string;
  puntoRef?: string;
  puntoBank?: string;
  binanceRef?: string;
  transferRef?: string;
  transferBank?: string;
  usdReceived?: number;
  changeAmount?: number;
  changeAmountBs?: number;
  changeMethod?: string;
  changeRef?: string;
  amountBs?: number;
  exchangeRate?: number;
  splitPayments?: SplitPaymentItem[];
}

import { CustomersService } from '../customers/customers.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class OrdersService {
  constructor(
    private dataSource: DataSource,
    private readonly customersService: CustomersService,
    private readonly settingsService: SettingsService,
  ) {}

  async addAbono(tenantId: string, orderId: string, amount: number, method?: string, ref?: string) {
    if (amount <= 0) throw new BadRequestException('El monto debe ser mayor a 0');
    const order = await this.dataSource.getRepository(Order).findOne({ where: { tenantId, id: orderId } });
    if (!order) throw new NotFoundException('Orden no encontrada');

    const restante = Math.max(0, Number((order.totalAmount - (order.abonosTotal || 0)).toFixed(2)));
    // Si no es una cuenta abierta de mesa en curso, no permitir superar el total pendiente
    if (!order.tableNumber && amount > restante + 0.05) {
      throw new BadRequestException(`El abono ($${amount.toFixed(2)}) supera el saldo restante ($${restante.toFixed(2)})`);
    }

    const history = order.abonosHistory || [];
    history.push({ 
      id: randomUUID(), 
      amount: Number(amount), 
      method: method || 'USD',
      ref: ref || undefined,
      date: new Date().toISOString() 
    });
    order.abonosHistory = history;
    order.abonosTotal = roundCurrency((order.abonosTotal || 0) + Number(amount));
    const wasPaid = order.paymentStatus === PaymentStatus.PAID;
    const roundedAbonos = roundCurrency(order.abonosTotal);
    const roundedTotal = roundCurrency(order.totalAmount);
    if (roundedAbonos >= roundedTotal && roundedTotal > 0) {
      order.paymentStatus = PaymentStatus.PAID;
    } else if (roundedAbonos > 0) {
      order.paymentStatus = PaymentStatus.PARTIAL;
    } else {
      order.paymentStatus = PaymentStatus.PENDING;
    }
    
    const saved = await this.dataSource.getRepository(Order).save(order);
    if (!wasPaid && saved.paymentStatus === PaymentStatus.PAID && saved.customerId) {
      await this.customersService.incrementVisits(tenantId, saved.customerId);
    }
    return saved;
  }

  async registerFondoCaja(tenantId: string, amount: number, description?: string, currency: 'USD' | 'BS' = 'USD') {
    if (!amount || Number(amount) <= 0) {
      throw new BadRequestException('El monto del fondo de caja debe ser mayor a 0');
    }
    const currentExchangeRateObj = typeof this.settingsService?.getExchangeRate === 'function' ? await this.settingsService.getExchangeRate(tenantId) : null;
    const rate = Number(currentExchangeRateObj?.exchangeRateBs || (typeof this.settingsService?.getEffectiveRate === 'function' ? await this.settingsService.getEffectiveRate(tenantId) : 40.0));

    const amtUSD = currency === 'BS' ? (rate > 0 ? Number(amount) / rate : Number(amount)) : Number(amount);
    const desc = description?.trim() || (currency === 'BS'
      ? `Fondo de Caja: Bs. ${Number(amount).toFixed(2)} (equiv. $${amtUSD.toFixed(2)})`
      : `Fondo de Caja: $${Number(amount).toFixed(2)}`);

    const repo = this.dataSource.getRepository(OperatingExpense);
    const expense = repo.create({
      tenantId,
      amount: Number(amtUSD.toFixed(2)),
      description: desc,
      category: 'FONDO_CAJA',
      paymentMethod: 'CASH',
    });
    return repo.save(expense);
  }

  async revertAbono(tenantId: string, orderId: string, abonoIdentifier: string | number) {
    const order = await this.dataSource.getRepository(Order).findOne({ where: { tenantId, id: orderId } });
    if (!order) throw new NotFoundException('Orden no encontrada');
    const history = order.abonosHistory || [];
    if (!history || history.length === 0) {
      throw new BadRequestException('No hay historial de abonos para revertir');
    }

    const abonoIdStr = String(abonoIdentifier);
    let targetIndex = history.findIndex((a: any) => a.id === abonoIdStr);

    // Fallback retrocompatible para registros históricos sin UUID
    if (targetIndex === -1 && !isNaN(Number(abonoIdentifier))) {
      const numericIndex = Number(abonoIdentifier);
      if (history[numericIndex]) {
        targetIndex = numericIndex;
      }
    }

    if (targetIndex === -1) {
      throw new NotFoundException('Abono no encontrado');
    }

    const removed = history[targetIndex];
    const removedAmount = Number(removed.amount || 0);

    // Eliminación inmutable buscando y filtrando estrictamente por el id (UUID)
    if (removed.id) {
      order.abonosHistory = history.filter((a: any) => a.id !== removed.id);
    } else {
      order.abonosHistory = history.filter((_, idx) => idx !== targetIndex);
    }

    order.abonosTotal = roundCurrency(Math.max(0, (order.abonosTotal || 0) - removedAmount));
    const roundedAbonos = roundCurrency(order.abonosTotal);
    const roundedTotal = roundCurrency(order.totalAmount);
    if (roundedAbonos >= roundedTotal && roundedTotal > 0) {
      order.paymentStatus = PaymentStatus.PAID;
    } else if (roundedAbonos > 0) {
      order.paymentStatus = PaymentStatus.PARTIAL;
    } else {
      order.paymentStatus = PaymentStatus.PENDING;
    }
    
    return this.dataSource.getRepository(Order).save(order);
  }

  async createOrder(tenantId: string, dto: CreateOrderDto, authUserId?: string, authUserRole?: UserRole | string) {
    if (dto.linkedReservationId) {
      const existingLinkedOrder = await this.dataSource.getRepository(Order).findOne({
        where: { tenantId, linkedReservationId: dto.linkedReservationId, status: Not(OrderStatus.CANCELED) },
      });
      if (existingLinkedOrder && existingLinkedOrder.paymentStatus !== PaymentStatus.PAID) {
        return this.editOrder(tenantId, existingLinkedOrder.id, dto, authUserId, authUserRole);
      }
    }

    if (!dto.items || (dto.items.length === 0 && dto.paymentStatus !== PaymentStatus.PENDING)) {
      throw new BadRequestException('El carrito no puede estar vacío');
    }
    for (const item of dto.items || []) {
      if (item.quantity <= 0) throw new BadRequestException('La cantidad de un producto debe ser mayor a cero');
      if (item.unitPrice < 0) throw new BadRequestException('El precio no puede ser negativo');
    }
    if ((dto.discountAmount || 0) < 0) throw new BadRequestException('El descuento no puede ser negativo');

    const tenantSettings = typeof this.settingsService?.getSettings === 'function' ? await this.settingsService.getSettings(tenantId) : null;
    const allowNegativeStock = Boolean(tenantSettings?.allowNegativeStock);

    const orderExchangeRate = (dto.exchangeRate && Number(dto.exchangeRate) > 0)
      ? Number(dto.exchangeRate)
      : (tenantSettings?.exchangeRateBs ? Number(tenantSettings.exchangeRateBs) : await this.settingsService.getEffectiveRate(tenantId));

    return this.dataSource.transaction(async (manager) => {
      if (dto.paymentMethod === 'PAGO_MOVIL' && dto.pagoMovilRef && dto.pagoMovilRef.trim().length > 0) {
        const cleanRef = dto.pagoMovilRef.trim();
        if (cleanRef.length < 4) {
          throw new BadRequestException('La referencia de Pago Móvil debe contener al menos 4 dígitos');
        }

        // Prevenir comprobantes reciclados en las últimas 48 horas
        const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const duplicate = await manager.findOne(Order, {
          where: {
            tenantId,
            pagoMovilRef: cleanRef,
            createdAt: MoreThanOrEqual(since48h),
            status: Not(OrderStatus.CANCELED),
          }
        });

        if (duplicate) {
          throw new BadRequestException(
            `Esta referencia de Pago Móvil (${cleanRef}) ya fue registrada en la orden #${duplicate.id.slice(0, 8).toUpperCase()} en las últimas 48 horas.`
          );
        }
      }

      let totalAmount = 0;
      let totalCost = 0;
      let deliveryFee = 0;
      const discountAmount = dto.discountAmount || 0;

      const targetEmployeeId = dto.employeeId || dto.employee_id || authUserId || null;
      let employeeIdToSave: string | undefined = undefined;
      if (targetEmployeeId) {
        const user = await manager.findOne(User, { where: { id: targetEmployeeId } });
        if (!user) {
          throw new BadRequestException('El empleado asignado no existe');
        }
        const access = await manager.findOne(UserTenantAccess, {
          where: { userId: targetEmployeeId, tenantId, isActive: true }
        });
        if (!access && user.role !== UserRole.ADMIN) {
          throw new BadRequestException('El empleado seleccionado no pertenece o no está activo en esta sucursal');
        }
        employeeIdToSave = user.id;
      }

      if (dto.deliveryMethod === DeliveryMethod.DELIVERY && dto.deliveryZoneId) {
        const zone = await manager.findOne(DeliveryZone, { where: { tenantId, id: dto.deliveryZoneId } });
        if (zone) {
          deliveryFee = zone.feePrice;
        }
      }

      // Bloqueo pesimista de escritura sobre los productos involucrados
      const productIds = Array.from(new Set((dto.items || []).map(i => i.productId).filter(Boolean)));
      let products: Product[] = [];
      if (productIds.length > 0) {
        if (manager.createQueryBuilder) {
          try {
            await manager
              .createQueryBuilder(Product, 'p')
              .setLock('pessimistic_write')
              .where('p.tenantId = :tenantId AND p.id IN (:...ids)', { tenantId, ids: productIds })
              .getMany();
          } catch {
            // fallback si el driver mock no soporta bloqueo pesimista
          }
        }
        products = await manager.find(Product, {
          where: { tenantId, id: In(productIds) },
          relations: { comboItems: { component: { recipe: { rawMaterial: true } } }, recipe: { rawMaterial: true } }
        });
      }
      const productMap = new Map(products.map(p => [p.id, p]));

      // Bloqueo pesimista de componentes de combos
      const comboComponentIds = products
        .filter(p => p.isCombo && !p.isPreAssembled && p.comboItems)
        .flatMap(p => p.comboItems?.map(ci => ci.componentId || ci.component?.id).filter(Boolean) || []);
      if (comboComponentIds.length > 0 && manager.createQueryBuilder) {
        try {
          await manager
            .createQueryBuilder(Product, 'comp')
            .setLock('pessimistic_write')
            .where('comp.tenantId = :tenantId AND comp.id IN (:...ids)', { tenantId, ids: comboComponentIds })
            .getMany();
        } catch {
          // fallback
        }
      }

      // Bloqueo pesimista de materias primas de recetas y extras
      const recipeRawMaterialIds = products
        .filter(p => p.recipe && p.recipe.length > 0 && !p.isPreAssembled)
        .flatMap(p => p.recipe?.map(ri => ri.rawMaterialId || ri.rawMaterial?.id).filter(Boolean) || []);
      const extraRawMaterialIds = (dto.items || [])
        .flatMap(it => it.addedExtras?.map(ex => ex.rawMaterialId).filter(Boolean) || []);
      const allRawMaterialIds = Array.from(new Set([...recipeRawMaterialIds, ...extraRawMaterialIds]));
      if (allRawMaterialIds.length > 0 && manager.createQueryBuilder) {
        try {
          await manager
            .createQueryBuilder(RawMaterial, 'rm')
            .setLock('pessimistic_write')
            .where('rm.tenantId = :tenantId AND rm.id IN (:...ids)', { tenantId, ids: allRawMaterialIds })
            .getMany();
        } catch {
          // fallback
        }
      }

      let requiresPreparation = false;
      for (const itemDto of dto.items) {
        const product = productMap.get(itemDto.productId);
        if (product) {
          if (product.isCombo && !product.isPreAssembled && product.comboItems && product.comboItems.length > 0) {
            for (const ci of product.comboItems) {
              if (ci.component && ci.component.stockQuantity < (itemDto.quantity * ci.quantity)) {
                requiresPreparation = true;
              }
            }
          } else if (!product.isCombo || product.isPreAssembled) {
            const isService = product.is_service || product.category === 'Servicios' || Boolean(product.durationMinutes);
            const isFoodCategory = Boolean(product.category && /comida|alimento|hamburguesa|snack|bebida|preparad|postre|restaurante/i.test(product.category));
            const hasRecipe = Boolean(product.recipe && product.recipe.length > 0);
            const isFormula = product.product_type === 'FORMULA';
            const isFoodOrPrepared = (hasRecipe && !product.isPreAssembled) || isFormula || (isFoodCategory && !product.isPreAssembled);
            const isMadeToOrder = isFoodOrPrepared;

            const currentStock = Number(product.stock !== undefined && product.stock !== null ? product.stock : product.stockQuantity) || 0;
            if (isMadeToOrder || (!isService && currentStock < itemDto.quantity)) {
              requiresPreparation = true;
            }
          }
        }
      }

      const initialStatus = dto.status || (requiresPreparation ? OrderStatus.PREPARING : OrderStatus.PENDING);

      let customerId: string | undefined = undefined;
      let identification: string | undefined = dto.pagoMovilCedula;
      if (dto.customerName && dto.customerPhone) {
        try {
          const customer = await this.customersService.findOrCreateOrUpdate(tenantId, {
            name: dto.customerName,
            phone: dto.customerPhone,
            identification: dto.pagoMovilCedula
          });
          customerId = customer.id;
          if (!identification && customer.identification) {
            identification = customer.identification;
          }
        } catch (err) {
          console.error('Customer sync error in OrdersService.create:', err);
        }
      }

      let finalNotes = dto.notes || '';
      if (dto.changeAmount && Number(dto.changeAmount) > 0) {
        let vueltoNote = '';
        if (dto.changeMethod === 'PAGO_MOVIL') {
          vueltoNote = `[Vuelto: $${Number(dto.changeAmount).toFixed(2)} (Bs. ${Number(dto.changeAmountBs || 0).toFixed(2)}) vía Pago Móvil Ref: ${dto.changeRef || 'S/R'}]`;
        } else if (dto.changeMethod === 'CASH_BS') {
          vueltoNote = `[Vuelto: $${Number(dto.changeAmount).toFixed(2)} en Efectivo Bs. ${Number(dto.changeAmountBs || 0).toFixed(2)}]`;
        } else {
          vueltoNote = `[Vuelto: $${Number(dto.changeAmount).toFixed(2)} USD en Efectivo]`;
        }
        if (!finalNotes.includes('Vuelto:')) {
          finalNotes = finalNotes ? `${finalNotes} | ${vueltoNote}` : vueltoNote;
        }
      }
      if (dto.paymentMethod === 'USD' && dto.usdReceived) {
        const recNote = `[Efectivo Recibido: $${Number(dto.usdReceived).toFixed(2)}]`;
        if (!finalNotes.includes('Efectivo Recibido:')) {
          finalNotes = finalNotes ? `${recNote} | ${finalNotes}` : recNote;
        }
      }

      let deliveryUserIdToSave: string | undefined = undefined;
      const targetDriverId = dto.driverId || dto.deliveryUserId;
      if (targetDriverId && targetDriverId.trim() !== '') {
        const dAccess = await manager.findOne(UserTenantAccess, {
          where: { userId: targetDriverId, tenantId, isActive: true }
        });
        const userRoles: string[] = [];
        if (dAccess?.role) userRoles.push(dAccess.role);
        if (Array.isArray(dAccess?.roles)) userRoles.push(...dAccess.roles);
        else if (typeof (dAccess?.roles as any) === 'string' && ((dAccess?.roles as any) || '').trim() !== '') {
          userRoles.push(...((dAccess?.roles as any) || '').split(',').map((r: string) => r.trim()));
        }
        const allowedRoles = [UserRole.DELIVERY, UserRole.POS, UserRole.ADMIN, UserRole.OPERATIVO];
        if (!dAccess || !userRoles.some(r => allowedRoles.includes(r as UserRole))) {
          throw new BadRequestException('El repartidor asignado debe ser un miembro activo del equipo de trabajo');
        }
        deliveryUserIdToSave = targetDriverId;
      }

      const orderCreatedAt = (dto.offlineCreatedAt && !isNaN(new Date(dto.offlineCreatedAt).getTime()))
        ? new Date(dto.offlineCreatedAt)
        : new Date();

      const order = manager.create(Order, { tenantId,
        customerId,
        identification,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone || '',
        customerAddress: dto.customerAddress || '',
        notes: finalNotes,
        tableNumber: dto.tableNumber || '',
        paymentStatus: dto.paymentStatus || PaymentStatus.PENDING,
        paymentReported: Boolean(dto.paymentReported || (dto.pagoMovilRef || dto.transferRef || dto.binanceRef)) && dto.paymentStatus !== PaymentStatus.PAID,
        paymentProofUrl: dto.paymentProofUrl || undefined,
        paymentRejectedReason: dto.paymentRejectedReason || undefined,
        status: initialStatus,
        requestedDeliveryDate: dto.requestedDeliveryDate ? new Date(dto.requestedDeliveryDate) : undefined,
        deliveryMethod: dto.deliveryMethod || DeliveryMethod.IN_STORE,
        deliveryZoneId: (dto.deliveryMethod === DeliveryMethod.DELIVERY && dto.deliveryZoneId && dto.deliveryZoneId.trim() !== '') ? dto.deliveryZoneId : undefined,
        deliveryFee: deliveryFee,
        deliveryUserId: deliveryUserIdToSave,
        driverId: deliveryUserIdToSave,
        discountAmount: discountAmount,
        totalCost: 0,
        netProfit: 0,
        totalAmount: 0,
        employeeId: employeeIdToSave,
        paymentMethod: dto.paymentMethod,
        splitPayments: dto.splitPayments || undefined,
        pagoMovilRef: dto.pagoMovilRef,
        pagoMovilPhone: dto.pagoMovilPhone,
        pagoMovilCedula: dto.pagoMovilCedula,
        pagoMovilBank: dto.pagoMovilBank,
        puntoRef: dto.puntoRef,
        puntoBank: dto.puntoBank,
        binanceRef: dto.binanceRef,
        transferRef: dto.transferRef,
        transferBank: dto.transferBank,
        usdReceived: dto.usdReceived,
        changeAmount: dto.changeAmount,
        changeAmountBs: dto.changeAmountBs,
        changeMethod: dto.changeMethod,
        changeRef: dto.changeRef,
        amountBs: dto.amountBs,
        exchangeRate: orderExchangeRate,
        offlineId: dto.offlineId || undefined,
        createdAt: orderCreatedAt,
        abonosTotal: dto.initialAbono || 0,
        abonosHistory: (dto.initialAbono && dto.initialAbono > 0) ? [{ id: Date.now().toString(), amount: dto.initialAbono, date: new Date().toISOString() }] : []
      });
      order.createdAt = orderCreatedAt;
        
      const savedOrder = await manager.save(Order, order);

      for (const itemDto of dto.items) {
        let product = productMap.get(itemDto.productId);
        let extraMaterial: RawMaterial | null = null;

        if (!product) {
          extraMaterial = await manager.findOne(RawMaterial, {
            where: { tenantId, id: itemDto.productId, allowAsExtra: true },
          });
          if (!extraMaterial) {
            throw new BadRequestException(`Producto o insumo extra no encontrado (${itemDto.productId})`);
          }
        }

        const subtotal = itemDto.quantity * itemDto.unitPrice;
        totalAmount += subtotal;

        let unitCost = 0;

        if (extraMaterial) {
          if (!allowNegativeStock && extraMaterial.stockQuantity < itemDto.quantity) {
            throw new BadRequestException(`Stock insuficiente para el insumo "${extraMaterial.name}". Disponible: ${extraMaterial.stockQuantity}, solicitado: ${itemDto.quantity}`);
          }
          extraMaterial.stockQuantity -= itemDto.quantity;
          await manager.save(RawMaterial, extraMaterial);

          const mov = manager.create(StockMovement, {
            tenantId,
            rawMaterialId: extraMaterial.id,
            type: MovementType.OUT_SALE,
            quantity: itemDto.quantity,
            totalCost: itemDto.quantity * extraMaterial.costPerUnit,
            description: `Venta de Extra Suelto: ${extraMaterial.name}`,
          });
          await manager.save(StockMovement, mov);

          unitCost = Number(extraMaterial.costPerUnit || 0);
        } else if (product) {
          const isSupplierPreorderOrder = initialStatus === OrderStatus.SOLICITUD_ENCARGO;

          if (!isSupplierPreorderOrder) {
            if (product.isCombo && !product.isPreAssembled && product.comboItems && product.comboItems.length > 0) {
              for (const ci of product.comboItems) {
                if (ci.component) {
                  const reqQty = itemDto.quantity * ci.quantity;
                  if (!allowNegativeStock && (ci.component.stockQuantity < reqQty)) {
                    throw new BadRequestException(`Stock insuficiente para el componente "${ci.component.name}". Disponible: ${ci.component.stockQuantity}, requerido: ${reqQty}`);
                  }
                  ci.component.stockQuantity -= reqQty;
                  ci.component.stock = ci.component.stockQuantity;
                  await manager.save(Product, ci.component);
                }
              }
            } else if (product.recipe && product.recipe.length > 0 && !product.isPreAssembled) {
              for (const ri of product.recipe) {
                if (ri.rawMaterial) {
                  const isRemoved = itemDto.removedIngredients?.some(rem => 
                    rem === ri.rawMaterial.id || rem.toLowerCase() === ri.rawMaterial.name.toLowerCase()
                  );
                  if (isRemoved) continue;

                  const reqQty = itemDto.quantity * ri.quantity;
                  if (!allowNegativeStock && (ri.rawMaterial.stockQuantity < reqQty)) {
                    throw new BadRequestException(`Stock insuficiente para el insumo "${ri.rawMaterial.name}". Disponible: ${ri.rawMaterial.stockQuantity}, requerido: ${reqQty}`);
                  }
                  ri.rawMaterial.stockQuantity -= reqQty;
                  await manager.save(RawMaterial, ri.rawMaterial);
                  const mov = manager.create(StockMovement, { tenantId,
                    rawMaterialId: ri.rawMaterial.id,
                    type: MovementType.OUT_SALE,
                    quantity: reqQty,
                    totalCost: reqQty * ri.rawMaterial.costPerUnit,
                    description: 'Venta de Producto: ' + product.name
                  });
                  await manager.save(StockMovement, mov);
                }
              }
            } else if (!product.isCombo || product.isPreAssembled) {
              const isService = product.is_service === true || (product.is_service !== false && product.category === 'Servicios');
              const isFoodCategory = Boolean(product.category && /comida|alimento|hamburguesa|snack|bebida|preparad|postre|restaurante/i.test(product.category));
              const hasRecipe = Boolean(product.recipe && product.recipe.length > 0);
              const isFormula = product.product_type === 'FORMULA';
              const isFoodOrPrepared = (hasRecipe && !product.isPreAssembled) || isFormula || (isFoodCategory && !product.isPreAssembled);
              const isMadeToOrder = isFoodOrPrepared;

              if (!isService && !isMadeToOrder) {
                const currentStock = Number(product.stock !== undefined && product.stock !== null ? product.stock : product.stockQuantity) || 0;
                const isBajoEncargo = product.availabilityType === 'BAJO_ENCARGO';
                if (!allowNegativeStock && currentStock < itemDto.quantity && !isBajoEncargo) {
                  throw new BadRequestException(`Stock insuficiente para "${product.name}". Disponible: ${currentStock}, solicitado: ${itemDto.quantity}`);
                }
                const newStock = allowNegativeStock
                  ? currentStock - itemDto.quantity
                  : (isBajoEncargo ? Math.max(0, currentStock - itemDto.quantity) : currentStock - itemDto.quantity);
                product.stock = newStock;
                product.stockQuantity = product.stock;
                await manager.save(Product, product);
              }
            }

            // Descontar adicionales extra
            if (itemDto.addedExtras && itemDto.addedExtras.length > 0) {
              for (const extra of itemDto.addedExtras) {
                if (!extra.rawMaterialId) continue;
                const extraRm = await manager.findOne(RawMaterial, { where: { tenantId, id: extra.rawMaterialId } });
                if (extraRm) {
                  const extraQty = (Number(extra.quantity) || 1) * itemDto.quantity;
                  if (!allowNegativeStock && extraRm.stockQuantity < extraQty) {
                    throw new BadRequestException(`Stock insuficiente para el insumo extra "${extraRm.name}". Disponible: ${extraRm.stockQuantity}, requerido: ${extraQty}`);
                  }
                  extraRm.stockQuantity -= extraQty;
                  await manager.save(RawMaterial, extraRm);
                  const mov = manager.create(StockMovement, { tenantId,
                    rawMaterialId: extraRm.id,
                    type: MovementType.OUT_SALE,
                    quantity: extraQty,
                    totalCost: extraQty * extraRm.costPerUnit,
                    description: `Extra (${extra.name}) para: ${product.name}`
                  });
                  await manager.save(StockMovement, mov);
                }
              }
            }
          }

          if (product.isCombo && !product.isPreAssembled && product.comboItems) {
              for (const ci of product.comboItems) {
                  if (ci.component && ci.component.recipe) {
                      for (const ri of ci.component.recipe) {
                          if (ri.rawMaterial) unitCost += ri.quantity * ri.rawMaterial.costPerUnit * ci.quantity;
                      }
                  }
              }
          }
          if (product.recipe && product.recipe.length > 0) {
              for (const ri of product.recipe) {
                  const isRemoved = itemDto.removedIngredients?.some(rem => 
                    rem === ri.rawMaterial?.id || rem.toLowerCase() === ri.rawMaterial?.name?.toLowerCase()
                  );
                  if (!isRemoved && ri.rawMaterial) unitCost += ri.quantity * ri.rawMaterial.costPerUnit;
              }
          } else if (product.cost !== undefined && product.cost !== null && Number(product.cost) > 0) {
              unitCost = Number(product.cost);
          } else if (product.estimatedCost) {
              unitCost = Number(product.estimatedCost);
          }

          // Sumar costo de insumos extra
          if (itemDto.addedExtras && itemDto.addedExtras.length > 0) {
            for (const extra of itemDto.addedExtras) {
              if (!extra.rawMaterialId) continue;
              const extraRm = await manager.findOne(RawMaterial, { where: { tenantId, id: extra.rawMaterialId } });
              if (extraRm) {
                unitCost += (Number(extra.quantity) || 1) * extraRm.costPerUnit;
              }
            }
          }
        }
        
        totalCost += unitCost * itemDto.quantity;

        const hasModifications = Boolean(
          (itemDto.removedIngredients && itemDto.removedIngredients.length > 0) ||
          (itemDto.addedExtras && itemDto.addedExtras.length > 0) ||
          itemDto.hasModifications
        );

        const orderItem = manager.create(OrderItem, { tenantId,
          orderId: savedOrder.id,
          productId: extraMaterial ? extraMaterial.id : product!.id,
          productName: extraMaterial ? `Extra: ${extraMaterial.name}` : product!.name,
          quantity: itemDto.quantity,
          unitPrice: itemDto.unitPrice,
          unitCost: unitCost,
          subtotal: subtotal,
          deliveredQuantity: 0,
          removedIngredients: itemDto.removedIngredients || [],
          addedExtras: itemDto.addedExtras || [],
          hasModifications
        });
        await manager.save(OrderItem, orderItem);
      }

        let effectiveDiscount = 0;
        if (dto.discountAmount !== undefined && Number(dto.discountAmount) >= 0) {
          effectiveDiscount = Number(dto.discountAmount);
        } else if (dto.discountValue && Number(dto.discountValue) > 0) {
          if (dto.discountType === 'PERCENTAGE') {
            effectiveDiscount = (totalAmount * Number(dto.discountValue)) / 100;
          } else {
            effectiveDiscount = Number(dto.discountValue);
          }
        }

        const effectiveTotal = totalAmount + deliveryFee;
        const cappedDiscount = Math.min(effectiveDiscount, effectiveTotal);

        savedOrder.discountAmount = cappedDiscount;
        savedOrder.discountType = (dto.discountType || (cappedDiscount > 0 ? 'FIXED' : undefined)) as any;
        savedOrder.discountValue = (dto.discountValue !== undefined ? Number(dto.discountValue) : (cappedDiscount > 0 ? cappedDiscount : undefined)) as any;
        savedOrder.totalAmount = effectiveTotal - cappedDiscount;
        savedOrder.totalCost = totalCost;
        savedOrder.netProfit = savedOrder.totalAmount - deliveryFee - totalCost;
        savedOrder.exchangeRate = orderExchangeRate;
        savedOrder.amountBs = (dto.amountBs !== undefined && Number(dto.amountBs) > 0)
          ? Number(dto.amountBs)
          : Number((savedOrder.totalAmount * orderExchangeRate).toFixed(2));
        if (savedOrder.changeAmount && (!savedOrder.changeAmountBs || Number(savedOrder.changeAmountBs) === 0)) {
          savedOrder.changeAmountBs = Number((Number(savedOrder.changeAmount) * orderExchangeRate).toFixed(2));
        }
        if (savedOrder.totalAmount === 0) {
          savedOrder.paymentStatus = PaymentStatus.PAID;
        } else {
          // Calcular el total efectivamente recibido al crear la orden (abonos, splitPayments o efectivo directo)
          let totalReceivedUSD = Number(savedOrder.abonosTotal || 0);
          if (Array.isArray(dto.splitPayments) && dto.splitPayments.length > 0) {
            const splitSum = dto.splitPayments.reduce((acc, p) => acc + (Number(p.amountUSD) || 0), 0);
            totalReceivedUSD = Math.max(totalReceivedUSD, splitSum);
          } else if (dto.usdReceived && Number(dto.usdReceived) > 0) {
            totalReceivedUSD = Math.max(totalReceivedUSD, Number(dto.usdReceived) - Number(savedOrder.changeAmount || 0));
          }

          const roundedReceived = roundCurrency(totalReceivedUSD);
          const roundedTotal = roundCurrency(savedOrder.totalAmount);
          if (roundedReceived >= roundedTotal && roundedTotal > 0) {
            savedOrder.paymentStatus = PaymentStatus.PAID;
          } else if (roundedReceived > 0 && roundedReceived < roundedTotal) {
            savedOrder.paymentStatus = PaymentStatus.PARTIAL;
          }
        }

        if (dto.linkedReservationId) {
          try {
            savedOrder.linkedReservationId = dto.linkedReservationId;
            const reservationRepo = manager.getRepository(Reservation);
            const reservation = await reservationRepo.findOne({
              where: { id: dto.linkedReservationId, tenantId },
            });
            if (reservation) {
              reservation.status = ReservationStatus.COMPLETED;
              reservation.orderId = savedOrder.id;
              await reservationRepo.save(reservation);
            }
          } catch (resErr) {
            console.error('Error actualizando estado de reservación vinculada:', resErr);
          }
        }

        if (orderCreatedAt) {
          savedOrder.createdAt = orderCreatedAt;
        }

        const result = await manager.save(Order, savedOrder);
        if (result.paymentStatus === PaymentStatus.PAID && result.customerId) {
          await this.customersService.incrementVisits(tenantId, result.customerId);
        }
        return result;
    });
  }

  private mapOrderEmployee(order: Order, tenantId: string): Order {
    if (order && order.employee) {
      const access = order.employee.tenantAccess?.find(a => a.tenantId === tenantId);
      if (access) {
        if (access.jobTitle) {
          (order.employee as any).jobTitle = access.jobTitle;
        }
        if (access.role) {
          order.employee.role = access.role as any;
        }
      }
      delete (order.employee as any).passwordHash;
      delete (order.employee as any).tenantAccess;
    }
    return order;
  }

  async getAllOrders(tenantId: string, limit = 150, offset = 0) {
    const orders = await this.dataSource.getRepository(Order).find({
      where: { tenantId },
      relations: { items: { product: true, media: true }, deliveryZone: true, employee: { tenantAccess: true }, deliveryUser: true, driver: true },
      order: { createdAt: 'DESC' },
      take: Math.min(Number(limit) || 150, 300),
      skip: Number(offset) || 0,
    });
    return orders.map(order => this.mapOrderEmployee(order, tenantId));
  }

  async getOrderById(tenantId: string, id: string) {
    const order = await this.dataSource.getRepository(Order).findOne({
      where: { tenantId, id },
      relations: { items: { product: true, media: true }, deliveryZone: true, employee: { tenantAccess: true }, deliveryUser: true, driver: true }
    });
    return order ? this.mapOrderEmployee(order, tenantId) : null;
  }

  async updatePaymentStatus(tenantId: string, id: string, dto: UpdatePaymentDto) {
    const orderRepo = this.dataSource.getRepository(Order);
    const order = await orderRepo.findOne({ where: { tenantId, id } });
    if (!order) throw new BadRequestException('Pedido no encontrado');
    if (order.status === OrderStatus.CANCELED) throw new BadRequestException('El pedido está cancelado');
    const wasPaid = order.paymentStatus === PaymentStatus.PAID;
    
    order.paymentStatus = dto.status;
    if (dto.paymentMethod) order.paymentMethod = dto.paymentMethod;
    if (dto.notes) order.notes = dto.notes;
    if (dto.pagoMovilRef !== undefined) order.pagoMovilRef = dto.pagoMovilRef;
    if (dto.pagoMovilPhone !== undefined) order.pagoMovilPhone = dto.pagoMovilPhone;
    if (dto.pagoMovilCedula !== undefined) order.pagoMovilCedula = dto.pagoMovilCedula;
    if (dto.pagoMovilBank !== undefined) order.pagoMovilBank = dto.pagoMovilBank;
    if (dto.puntoRef !== undefined) order.puntoRef = dto.puntoRef;
    if (dto.puntoBank !== undefined) order.puntoBank = dto.puntoBank;
    if (dto.binanceRef !== undefined) order.binanceRef = dto.binanceRef;
    if (dto.transferRef !== undefined) order.transferRef = dto.transferRef;
    if (dto.transferBank !== undefined) order.transferBank = dto.transferBank;
    if (dto.usdReceived !== undefined) order.usdReceived = dto.usdReceived;
    if (dto.changeAmount !== undefined) order.changeAmount = dto.changeAmount;
    if (dto.changeAmountBs !== undefined) order.changeAmountBs = dto.changeAmountBs;
    if (dto.changeMethod !== undefined) order.changeMethod = dto.changeMethod;
    if (dto.changeRef !== undefined) order.changeRef = dto.changeRef;
    if (dto.amountBs !== undefined) order.amountBs = dto.amountBs;
    if (dto.exchangeRate !== undefined) order.exchangeRate = dto.exchangeRate;
    if (dto.splitPayments !== undefined) order.splitPayments = dto.splitPayments;

    // Si se enviaron pagos o efectivo, validar si es pago parcial o completo
    let totalPaidInDto: number | null = null;
    if (Array.isArray(order.splitPayments) && order.splitPayments.length > 0) {
      totalPaidInDto = order.splitPayments.reduce((acc, p) => acc + (Number(p.amountUSD) || 0), 0);
    } else if (order.usdReceived && Number(order.usdReceived) > 0) {
      totalPaidInDto = Math.max(0, Number(order.usdReceived) - Number(order.changeAmount || 0));
    }

    if (totalPaidInDto !== null) {
      const roundedPaid = roundCurrency(totalPaidInDto);
      const roundedTotal = roundCurrency(order.totalAmount);
      if (roundedPaid >= roundedTotal && roundedTotal > 0) {
        order.paymentStatus = PaymentStatus.PAID;
      } else if (roundedPaid > 0 && roundedPaid < roundedTotal) {
        order.paymentStatus = PaymentStatus.PARTIAL;
      }
    }

    const saved = await orderRepo.save(order);
    if (!wasPaid && saved.paymentStatus === PaymentStatus.PAID && saved.customerId) {
      await this.customersService.incrementVisits(tenantId, saved.customerId);
    }
    return saved;
  }

  async approvePayment(tenantId: string, id: string) {
    const orderRepo = this.dataSource.getRepository(Order);
    const order = await orderRepo.findOne({ where: { tenantId, id } });
    if (!order) throw new BadRequestException('Pedido no encontrado');
    if (order.status === OrderStatus.CANCELED) throw new BadRequestException('El pedido está cancelado');
    const wasPaid = order.paymentStatus === PaymentStatus.PAID;

    order.paymentStatus = PaymentStatus.PAID;
    order.paymentReported = false;
    order.paymentRejectedReason = null as any;

    const savedOrder = await orderRepo.save(order);
    if (!wasPaid && savedOrder.customerId) {
      await this.customersService.incrementVisits(tenantId, savedOrder.customerId);
    }

    if (order.linkedReservationId) {
      try {
        const resRepo = this.dataSource.getRepository(Reservation);
        const res = await resRepo.findOne({ where: { id: order.linkedReservationId, tenantId } });
        if (res) {
          res.paymentStatus = PaymentStatus.PAID;
          res.paymentReported = false;
          res.paymentRejectedReason = null as any;
          res.abonosTotal = order.totalAmount;
          if (Array.isArray(res.abonosHistory)) {
            res.abonosHistory = res.abonosHistory.map(e => ({ ...e, status: 'APPROVED' }));
          }
          await resRepo.save(res);
        }
      } catch (err) {
        console.error('Error sincronizando Reservation al aprobar pago de orden:', err);
      }
    }

    return savedOrder;
  }

  async rejectPayment(tenantId: string, id: string, reason?: string) {
    const orderRepo = this.dataSource.getRepository(Order);
    const order = await orderRepo.findOne({ where: { tenantId, id } });
    if (!order) throw new BadRequestException('Pedido no encontrado');

    const cleanReason = (reason || 'No cayó / Comprobante inválido').trim();
    order.paymentStatus = PaymentStatus.PENDING;
    order.paymentReported = false;
    order.paymentRejectedReason = cleanReason;
    const noteTag = `[Comprobante rechazado: ${cleanReason}]`;
    order.notes = order.notes ? `${order.notes} | ${noteTag}` : noteTag;

    const savedOrder = await orderRepo.save(order);

    if (order.linkedReservationId) {
      try {
        const resRepo = this.dataSource.getRepository(Reservation);
        const res = await resRepo.findOne({ where: { id: order.linkedReservationId, tenantId } });
        if (res) {
          res.paymentStatus = PaymentStatus.PENDING;
          res.paymentReported = false;
          res.paymentRejectedReason = cleanReason;
          const resTag = `[Comprobante rechazado: ${cleanReason}]`;
          res.notes = res.notes ? `${res.notes} | ${resTag}` : resTag;
          if (Array.isArray(res.abonosHistory)) {
            res.abonosHistory = res.abonosHistory.map(e => ({ ...e, status: 'REJECTED', rejectReason: cleanReason }));
          }
          await resRepo.save(res);
        }
      } catch (err) {
        console.error('Error sincronizando Reservation al rechazar comprobante de orden:', err);
      }
    }

    return savedOrder;
  }

  async updateOrderStatus(tenantId: string, id: string, status: OrderStatus, authUserId?: string, authUserRole?: UserRole | string, driverId?: string) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { 
        where: { tenantId, id },
        relations: { items: true } 
      });
      
      if (!order) throw new BadRequestException('Pedido no encontrado');
      if (order.status === OrderStatus.CANCELED) throw new BadRequestException('El pedido ya está cancelado');

      if (driverId !== undefined) {
        order.driverId = driverId && driverId.trim() !== '' ? driverId : (null as any);
        order.deliveryUserId = order.driverId;
      }

      if (status === OrderStatus.CANCELED) {
        const isPaidOrPartial = order.paymentStatus === PaymentStatus.PAID || order.paymentStatus === PaymentStatus.PARTIAL || (order.abonosTotal && order.abonosTotal > 0);
        if (isPaidOrPartial) {
          const userAccess = authUserRole ? null : (authUserId ? await manager.findOne(UserTenantAccess, { where: { tenantId, userId: authUserId, isActive: true } }) : null);
          const effectiveRole = authUserRole || userAccess?.role;
          const isAdminOrSuper = effectiveRole === UserRole.ADMIN || effectiveRole === UserRole.SUPERADMIN;
          if (!isAdminOrSuper) {
            throw new ForbiddenException('No puedes editar o anular una orden que ya tiene pagos registrados. Solicita autorización del administrador.');
          }
        }
      }

      const wasDelivered = order.status === OrderStatus.DELIVERED;
      const isBecomingDelivered = status === OrderStatus.DELIVERED && !wasDelivered;
      const isRevertingFromDelivered = wasDelivered && status !== OrderStatus.DELIVERED && status !== OrderStatus.CANCELED;

      if (isBecomingDelivered) {
        const itemProductIds = Array.from(new Set((order.items || []).map(i => i.productId).filter(Boolean)));
        const products = itemProductIds.length > 0 ? await manager.find(Product, {
          where: { tenantId, id: In(itemProductIds) },
          relations: { comboItems: { component: true } }
        }) : [];
        const productMap = new Map(products.map(p => [p.id, p]));

        for (const item of order.items) {
          const product = productMap.get(item.productId);
          if (product) {
            if (product.isCombo && !product.isPreAssembled && product.comboItems && product.comboItems.length > 0) {
              for (const ci of product.comboItems) {
                if (ci.component) {
                  if (ci.component.physicalStock < (item.quantity * ci.quantity)) {
                    throw new BadRequestException('Falta stock físico para entregar');
                  }
                  ci.component.physicalStock -= (item.quantity * ci.quantity);
                  await manager.save(Product, ci.component);
                }
              }
            } else if (!product.isCombo || product.isPreAssembled) {
                const isService = product.is_service === true || (product.is_service !== false && product.category === 'Servicios');
                if (!isService) {
                  if (product.physicalStock < item.quantity) {
                    throw new BadRequestException('Falta stock físico para entregar');
                  }
                  product.physicalStock -= item.quantity;
                  await manager.save(Product, product);
                }
              }
          }
        }
      }

      if (isRevertingFromDelivered) {
        const itemProductIds = Array.from(new Set((order.items || []).map(i => i.productId).filter(Boolean)));
        const products = itemProductIds.length > 0 ? await manager.find(Product, {
          where: { tenantId, id: In(itemProductIds) },
          relations: { comboItems: { component: true } }
        }) : [];
        const productMap = new Map(products.map(p => [p.id, p]));

        for (const item of order.items) {
          const product = productMap.get(item.productId);
          if (product) {
            if (product.isCombo && !product.isPreAssembled && product.comboItems && product.comboItems.length > 0) {
              for (const ci of product.comboItems) {
                if (ci.component) {
                  ci.component.physicalStock += (item.quantity * ci.quantity);
                  await manager.save(Product, ci.component);
                }
              }
            } else if (!product.isCombo || product.isPreAssembled) {
                const isService = product.is_service === true || (product.is_service !== false && product.category === 'Servicios');
                if (!isService) {
                  product.physicalStock += item.quantity;
                  await manager.save(Product, product);
                }
              }
          }
        }
      }

      if (status === OrderStatus.CANCELED) {
        const wasPreorder = order.status === OrderStatus.SOLICITUD_ENCARGO || order.status === OrderStatus.CANCELADO_PROVEEDOR;
        if (!wasPreorder) {
          // Reverse inventory
          const itemProductIds = Array.from(new Set((order.items || []).map(i => i.productId).filter(Boolean)));
          const products = itemProductIds.length > 0 ? await manager.find(Product, {
            where: { tenantId, id: In(itemProductIds) },
            relations: { comboItems: { component: true }, recipe: { rawMaterial: true } }
          }) : [];
          const productMap = new Map(products.map(p => [p.id, p]));

          for (const item of order.items) {
            const product = productMap.get(item.productId);
            
            if (product) {
              if (product.isCombo && !product.isPreAssembled && product.comboItems && product.comboItems.length > 0) {
                // Restore combo components
                for (const ci of product.comboItems) {
                  if (ci.component) {
                    ci.component.stockQuantity += (item.quantity * ci.quantity);
                    if (order.status === OrderStatus.DELIVERED) {
                       ci.component.physicalStock += (item.quantity * ci.quantity);
                    }
                    await manager.save(Product, ci.component);
                  }
                }
              } else if (product.recipe && product.recipe.length > 0 && !product.isPreAssembled) {
                // Restore raw materials (except removed)
                for (const ri of product.recipe) {
                  if (ri.rawMaterial) {
                    const isRemoved = item.removedIngredients?.some(rem => 
                      rem === ri.rawMaterial.id || rem.toLowerCase() === ri.rawMaterial.name.toLowerCase()
                    );
                    if (isRemoved) continue;

                    ri.rawMaterial.stockQuantity += (item.quantity * ri.quantity);
                    await manager.save(RawMaterial, ri.rawMaterial);
                    const mov = manager.create(StockMovement, { tenantId,
                      rawMaterialId: ri.rawMaterial.id,
                      type: MovementType.IN,
                      quantity: item.quantity * ri.quantity,
                      totalCost: (item.quantity * ri.quantity) * ri.rawMaterial.costPerUnit,
                      description: 'Reverso por Cancelación de Pedido: ' + order.id
                    });
                    await manager.save(StockMovement, mov);
                  }
                }
              } else if (!product.isCombo || product.isPreAssembled) {
                  const isService = product.is_service === true || (product.is_service !== false && product.category === 'Servicios');
                  if (!isService) {
                    const restored = (Number(product.stock !== undefined && product.stock !== null ? product.stock : product.stockQuantity) || 0) + item.quantity;
                    product.stock = restored;
                    product.stockQuantity = restored;
                    if (order.status === OrderStatus.DELIVERED) {
                      product.physicalStock = (Number(product.physicalStock) || 0) + item.quantity;
                    }
                    await manager.save(Product, product);
                  }
              }

              // Restore added extras
              if (item.addedExtras && item.addedExtras.length > 0) {
                for (const extra of item.addedExtras) {
                  if (!extra.rawMaterialId) continue;
                  const extraRm = await manager.findOne(RawMaterial, { where: { tenantId, id: extra.rawMaterialId } });
                  if (extraRm) {
                    const extraQty = (Number(extra.quantity) || 1) * item.quantity;
                    extraRm.stockQuantity += extraQty;
                    await manager.save(RawMaterial, extraRm);
                    const mov = manager.create(StockMovement, { tenantId,
                      rawMaterialId: extraRm.id,
                      type: MovementType.IN,
                      quantity: extraQty,
                      totalCost: extraQty * extraRm.costPerUnit,
                      description: `Reverso Extra (${extra.name}) por Cancelación: ${order.id}`
                    });
                    await manager.save(StockMovement, mov);
                  }
                }
              }
            } else {
              const extraMaterial = await manager.findOne(RawMaterial, {
                where: { tenantId, id: item.productId, allowAsExtra: true },
              });
              if (extraMaterial) {
                extraMaterial.stockQuantity += item.quantity;
                await manager.save(RawMaterial, extraMaterial);
                const mov = manager.create(StockMovement, {
                  tenantId,
                  rawMaterialId: extraMaterial.id,
                  type: MovementType.IN,
                  quantity: item.quantity,
                  totalCost: item.quantity * extraMaterial.costPerUnit,
                  description: `Reverso Venta Extra Suelto por Cancelación: ${order.id}`,
                });
                await manager.save(StockMovement, mov);
              }
            }
          }
        }
        // Reverse Payment
        if (order.paymentStatus === PaymentStatus.PAID) {
          order.paymentStatus = PaymentStatus.REFUNDED;
        }
      }

      order.status = status;
      const savedResult = await manager.save(Order, order);
      if (!wasDelivered && status === OrderStatus.DELIVERED && savedResult.customerId && savedResult.paymentStatus !== PaymentStatus.PAID) {
        await this.customersService.incrementVisits(tenantId, savedResult.customerId);
      }
      return savedResult;
    });
  }

  async cloneOrder(tenantId: string, id: string) {
    const orderRepo = this.dataSource.getRepository(Order);
    const order = await orderRepo.findOne({ 
      where: { tenantId, id },
      relations: { items: true } 
    });
    if (!order) throw new BadRequestException('Pedido original no encontrado');

    const dto = new CreateOrderDto();
    dto.customerName = order.customerName + ' (Clon)';
    dto.customerPhone = order.customerPhone;
    dto.customerAddress = order.customerAddress;
    dto.notes = order.notes;
    dto.tableNumber = order.tableNumber;
    dto.paymentStatus = order.paymentStatus === PaymentStatus.REFUNDED ? PaymentStatus.PAID : order.paymentStatus;
    dto.deliveryMethod = order.deliveryMethod;
    dto.deliveryZoneId = order.deliveryZoneId;
    dto.pagoMovilRef = order.pagoMovilRef;
    dto.pagoMovilPhone = order.pagoMovilPhone;
    dto.pagoMovilCedula = order.pagoMovilCedula;
    dto.pagoMovilBank = order.pagoMovilBank;
    dto.amountBs = order.amountBs;
    dto.exchangeRate = order.exchangeRate;
    dto.items = order.items.map(i => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice
    }));

    return this.createOrder(tenantId, dto);
  }

  async autoAllocatePhysicalStock(tenantId: string, externalManager?: EntityManager) {
    // This is the intelligent FIFO routing system
    const run = async (manager: EntityManager) => {
      // 1. Get all active orders (PENDING and PREPARING) ordered by creation date (FIFO)
      const activeOrders = await manager.find(Order, {
        where: [
          { status: OrderStatus.PENDING, tenantId },
          { status: OrderStatus.PREPARING, tenantId }
        ],
        order: { createdAt: 'ASC' },
        relations: { items: true }
      });

      // 2. We need a fast lookup for physical stock
      const products = await manager.find(Product, {
        where: { tenantId },
        relations: { comboItems: { component: true } }
      });
      const physicalStockMap = new Map<string, number>();
      for (const p of products) {
        physicalStockMap.set(p.id, p.physicalStock);
      }

      let changes = 0;

      // 3. Evaluate each order in FIFO order
      for (const order of activeOrders) {
        let canFulfill = true;

        // Simulate deducting from our virtual physicalStockMap
        const deductions = new Map<string, number>();

        for (const item of order.items) {
          const product = products.find(p => p.id === item.productId);
          if (!product) continue;

          if (product.isCombo && !product.isPreAssembled && product.comboItems && product.comboItems.length > 0) {
            for (const ci of product.comboItems) {
              if (ci.component) {
                const currentPhysical = physicalStockMap.get(ci.component.id) || 0;
                const required = item.quantity * ci.quantity;
                if (currentPhysical < required) {
                  canFulfill = false;
                  break;
                }
                deductions.set(ci.component.id, (deductions.get(ci.component.id) || 0) + required);
              }
            }
          } else if (!product.isCombo || product.isPreAssembled) {
            const isService = product.is_service === true || product.category === 'Servicios' || Boolean(product.durationMinutes);
            if (!isService) {
              const currentPhysical = physicalStockMap.get(product.id) || 0;
              if (currentPhysical < item.quantity) {
                canFulfill = false;
                break;
              }
              deductions.set(product.id, (deductions.get(product.id) || 0) + item.quantity);
            }
          }
          if (!canFulfill) break;
        }

        if (canFulfill) {
          // Commit deductions to our tracking map so subsequent orders see less stock
          for (const [pId, amount] of deductions.entries()) {
            physicalStockMap.set(pId, (physicalStockMap.get(pId) || 0) - amount);
          }
          
          if (order.status !== OrderStatus.PENDING) {
            order.status = OrderStatus.PENDING;
            await manager.save(Order, order);
            changes++;
          }
        } else {
          // If it CANNOT be fulfilled, and it's currently PENDING, it must be downgraded to PREPARING
          if (order.status !== OrderStatus.PREPARING) {
            order.status = OrderStatus.PREPARING;
            await manager.save(Order, order);
            changes++;
          }
        }
      }

      return { success: true, processedOrders: activeOrders.length, statusChanges: changes };
    };

    return externalManager ? run(externalManager) : this.dataSource.transaction(run);
  }

  async editOrder(tenantId: string, id: string, dto: CreateOrderDto, authUserId?: string, authUserRole?: UserRole | string) {
    if (!dto.items || (dto.items.length === 0 && dto.paymentStatus !== PaymentStatus.PENDING)) {
      throw new BadRequestException('El carrito no puede estar vacío');
    }
    for (const item of dto.items || []) {
      if (item.quantity <= 0) throw new BadRequestException('La cantidad de un producto debe ser mayor a cero');
      if (item.unitPrice < 0) throw new BadRequestException('El precio no puede ser negativo');
    }
    if ((dto.discountAmount || 0) < 0) throw new BadRequestException('El descuento no puede ser negativo');

    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { 
        where: { tenantId, id },
        relations: { items: true }
      });
      if (!order) throw new BadRequestException('Pedido no encontrado');
      const wasPaid = order.paymentStatus === PaymentStatus.PAID;
      if (order.status === OrderStatus.CANCELED) {
        throw new BadRequestException('No se puede editar un pedido cancelado');
      }
      if (order.status === OrderStatus.DELIVERED && order.paymentStatus === PaymentStatus.PAID) {
        throw new BadRequestException('No se puede editar un pedido que ya está finalizado, entregado y pagado');
      }

      // Bloqueo de Robo Hormiga: No editar órdenes ya pagadas o con abonos si no es admin/superadmin
      // Excepción para cuentas abiertas (mesas) y reservas con abonos previos que se están liquidando/completando en caja
      const isComandaOrReservation = !!(order.linkedReservationId || dto.linkedReservationId || order.tableNumber || dto.tableNumber);
      const isPaidOrPartial = order.paymentStatus === PaymentStatus.PAID || (
        !isComandaOrReservation && (order.paymentStatus === PaymentStatus.PARTIAL || (order.abonosTotal && order.abonosTotal > 0))
      );
      if (isPaidOrPartial) {
        const userAccess = authUserRole ? null : (authUserId ? await manager.findOne(UserTenantAccess, { where: { tenantId, userId: authUserId, isActive: true } }) : null);
        const effectiveRole = authUserRole || userAccess?.role;
        const isAdminOrSuper = effectiveRole === UserRole.ADMIN || effectiveRole === UserRole.SUPERADMIN;
        if (!isAdminOrSuper) {
          throw new ForbiddenException('No puedes editar o anular una orden que ya tiene pagos registrados. Solicita autorización del administrador.');
        }
      }
  
      const oldItemsMap = new Map<string, OrderItem>();
      order.items.forEach((item, idx) => {
        const key = item.id ? item.id : `${item.productId}_${idx}`;
        oldItemsMap.set(key, item);
      });

      const newItemsMap = new Map<string, any>();
      (dto.items || []).forEach((item: any, idx: number) => {
        let key = item.id && oldItemsMap.has(item.id) ? item.id : undefined;
        if (!key) {
          const oldAtIdx = order.items[idx];
          if (oldAtIdx && oldAtIdx.productId === item.productId && !Array.from(newItemsMap.keys()).includes(oldAtIdx.id)) {
            key = oldAtIdx.id;
          } else {
            key = item.id || `${item.productId}_${idx}`;
          }
        }
        newItemsMap.set(key, item);
      });

      let totalAmount = 0;
      let totalCost = 0;
      const discountAmount = dto.discountAmount || order.discountAmount || 0;
      
      const adjustProductStock = async (productId: string, quantity: number, isDeduction: boolean) => {
        const product = await manager.findOne(Product, { 
          where: { tenantId, id: productId },
          relations: { recipe: { rawMaterial: true }, comboItems: { component: true } }
        });

        const multiplier = isDeduction ? -1 : 1;

        if (product) {
          if (product.isCombo && !product.isPreAssembled && product.comboItems) {
            for (const cItem of product.comboItems) {
              if(cItem.component) {
                cItem.component.stockQuantity += (quantity * cItem.quantity * multiplier);
                cItem.component.stock = cItem.component.stockQuantity;
                if (order.status === OrderStatus.DELIVERED) {
                  cItem.component.physicalStock += (quantity * cItem.quantity * multiplier);
                }
                await manager.save(Product, cItem.component);
              }
            }
          } else if (product.recipe && product.recipe.length > 0) {
            for (const rItem of product.recipe) {
              if(rItem.rawMaterial) {
                rItem.rawMaterial.stockQuantity += (quantity * rItem.quantity * multiplier);
                await manager.save(RawMaterial, rItem.rawMaterial);
              }
            }
          } else if (!product.isCombo || product.isPreAssembled) {
            const isService = product.is_service === true || product.category === 'Servicios' || Boolean(product.durationMinutes);
            if (!isService) {
              product.stockQuantity += (quantity * multiplier);
              product.stock = product.stockQuantity;
              if (order.status === OrderStatus.DELIVERED) {
                product.physicalStock += (quantity * multiplier);
              }
              await manager.save(Product, product);
            }
          }
          return;
        }

        const extraMaterial = await manager.findOne(RawMaterial, {
          where: { tenantId, id: productId, allowAsExtra: true },
        });
        if (extraMaterial) {
          extraMaterial.stockQuantity += (quantity * multiplier);
          await manager.save(RawMaterial, extraMaterial);
          const mov = manager.create(StockMovement, {
            tenantId,
            rawMaterialId: extraMaterial.id,
            type: isDeduction ? MovementType.OUT_SALE : MovementType.IN,
            quantity: quantity,
            totalCost: quantity * extraMaterial.costPerUnit,
            description: isDeduction ? `Venta de Extra Suelto: ${extraMaterial.name}` : `Reverso de Extra Suelto: ${extraMaterial.name}`,
          });
          await manager.save(StockMovement, mov);
        }
      };

      for (const [key, oldItem] of oldItemsMap.entries()) {
        const newItem = newItemsMap.get(key);
        if (!newItem) {
          if (oldItem.deliveredQuantity > 0) {
            throw new BadRequestException('No se puede eliminar un item porque ya tiene entregas parciales');
          }
          await adjustProductStock(oldItem.productId, oldItem.quantity, false);
          await manager.remove(OrderItem, oldItem);
        } else {
          if (newItem.quantity < oldItem.deliveredQuantity) {
            throw new BadRequestException('La nueva cantidad no puede ser menor a lo que ya se entregó');
          }
          const diff = newItem.quantity - oldItem.quantity;
          if (diff > 0) {
            await adjustProductStock(oldItem.productId, diff, true);
          } else if (diff < 0) {
            await adjustProductStock(oldItem.productId, Math.abs(diff), false);
          }
  
          oldItem.quantity = newItem.quantity;
          oldItem.unitPrice = newItem.unitPrice;
          oldItem.subtotal = newItem.quantity * newItem.unitPrice;
          oldItem.removedIngredients = newItem.removedIngredients || [];
          oldItem.addedExtras = newItem.addedExtras || [];
          oldItem.hasModifications = Boolean(newItem.hasModifications || (newItem.removedIngredients && newItem.removedIngredients.length > 0) || (newItem.addedExtras && newItem.addedExtras.length > 0));
          await manager.save(OrderItem, oldItem);
          
          totalAmount += oldItem.subtotal;
          totalCost += oldItem.unitCost * oldItem.quantity;
        }
      }

      for (const [key, newItem] of newItemsMap.entries()) {
        if (!oldItemsMap.has(key)) {
          const productId = newItem.productId;
          await adjustProductStock(productId, newItem.quantity, true);
          
          const product = await manager.findOne(Product, { 
             where: { tenantId, id: productId },
             relations: { comboItems: { component: { recipe: { rawMaterial: true } } }, recipe: { rawMaterial: true } }
          });
          
          let unitCost = 0;
          let itemName = '';
          if (product) {
              itemName = product.name;
              if (product.isCombo && !product.isPreAssembled && product.comboItems) {
                  for (const ci of product.comboItems) {
                      if (ci.component && ci.component.recipe) {
                          for (const ri of ci.component.recipe) {
                              if (ri.rawMaterial) unitCost += ri.quantity * ri.rawMaterial.costPerUnit * ci.quantity;
                          }
                      }
                  }
              }
              if (product.recipe && product.recipe.length > 0) {
                  for (const ri of product.recipe) {
                      if (ri.rawMaterial) unitCost += ri.quantity * ri.rawMaterial.costPerUnit;
                  }
              } else if (product.estimatedCost) {
                  unitCost = Number(product.estimatedCost);
              }
          } else {
              const extraMaterial = await manager.findOne(RawMaterial, {
                where: { tenantId, id: productId, allowAsExtra: true },
              });
              if (extraMaterial) {
                itemName = `Extra: ${extraMaterial.name}`;
                unitCost = Number(extraMaterial.costPerUnit || 0);
              }
          }
          
          const subtotal = newItem.quantity * newItem.unitPrice;
          const orderItem = manager.create(OrderItem, {
            tenantId,
            orderId: order.id,
            productId: productId,
            productName: itemName,
            quantity: newItem.quantity,
            unitPrice: newItem.unitPrice,
            unitCost: unitCost,
            subtotal: subtotal,
            deliveredQuantity: 0,
            removedIngredients: newItem.removedIngredients || [],
            addedExtras: newItem.addedExtras || [],
            hasModifications: Boolean(newItem.hasModifications || (newItem.removedIngredients && newItem.removedIngredients.length > 0) || (newItem.addedExtras && newItem.addedExtras.length > 0))
          });
          await manager.save(OrderItem, orderItem);
          totalAmount += subtotal;
          totalCost += unitCost * newItem.quantity;
        }
      }

      let effectiveDiscountEdit = 0;
      if (dto.discountAmount !== undefined && Number(dto.discountAmount) >= 0) {
        effectiveDiscountEdit = Number(dto.discountAmount);
      } else if (dto.discountValue && Number(dto.discountValue) > 0) {
        if (dto.discountType === 'PERCENTAGE') {
          effectiveDiscountEdit = (totalAmount * Number(dto.discountValue)) / 100;
        } else {
          effectiveDiscountEdit = Number(dto.discountValue);
        }
      } else if (dto.discountAmount === undefined && order.discountAmount) {
        effectiveDiscountEdit = Number(order.discountAmount);
      }

      const effectiveTotalEdit = totalAmount + order.deliveryFee;
      const cappedDiscountEdit = Math.min(effectiveDiscountEdit, effectiveTotalEdit);

      const targetEmployeeId = dto.employeeId !== undefined ? dto.employeeId : (dto.employee_id !== undefined ? dto.employee_id : undefined);
      if (targetEmployeeId !== undefined) {
        if (targetEmployeeId) {
          const user = await manager.findOne(User, { where: { id: targetEmployeeId } });
          if (!user) {
            throw new BadRequestException('El empleado asignado no existe');
          }
          const access = await manager.findOne(UserTenantAccess, {
            where: { userId: targetEmployeeId, tenantId, isActive: true }
          });
          if (!access && user.role !== UserRole.ADMIN) {
            throw new BadRequestException('El empleado seleccionado no pertenece o no está activo en esta sucursal');
          }
          order.employeeId = user.id;
        } else {
          order.employeeId = null as any;
        }
      }

      const targetDriverId = dto.driverId !== undefined ? dto.driverId : dto.deliveryUserId;
      if (targetDriverId !== undefined) {
        if (targetDriverId && targetDriverId.trim() !== '') {
          const dAccess = await manager.findOne(UserTenantAccess, {
            where: { userId: targetDriverId, tenantId, isActive: true }
          });
          const userRoles: string[] = [];
          if (dAccess?.role) userRoles.push(dAccess.role);
          if (Array.isArray(dAccess?.roles)) userRoles.push(...dAccess.roles);
          else if (typeof (dAccess?.roles as any) === 'string' && ((dAccess?.roles as any) || '').trim() !== '') {
            userRoles.push(...((dAccess?.roles as any) || '').split(',').map((r: string) => r.trim()));
          }
          const allowedRoles = [UserRole.DELIVERY, UserRole.POS, UserRole.ADMIN, UserRole.OPERATIVO];
          if (!dAccess || !userRoles.some(r => allowedRoles.includes(r as UserRole))) {
            throw new BadRequestException('El repartidor asignado debe ser un miembro activo del equipo de trabajo');
          }
          order.deliveryUserId = targetDriverId;
          order.driverId = targetDriverId;
        } else {
          order.deliveryUserId = null as any;
          order.driverId = null as any;
        }
      }

      order.customerName = dto.customerName;
      order.customerPhone = dto.customerPhone || '';
      order.customerAddress = dto.customerAddress || '';
      order.notes = dto.notes || '';
      order.tableNumber = dto.tableNumber || '';
      order.discountAmount = cappedDiscountEdit;
      order.discountType = dto.discountType || (cappedDiscountEdit > 0 ? (order.discountType || 'FIXED') : null as any);
      order.discountValue = dto.discountValue !== undefined ? Number(dto.discountValue) : (cappedDiscountEdit > 0 ? (order.discountValue || cappedDiscountEdit) : null as any);
      order.totalCost = totalCost;
      order.totalAmount = effectiveTotalEdit - cappedDiscountEdit;
      order.netProfit = order.totalAmount - order.deliveryFee - totalCost;
      if (dto.splitPayments !== undefined) {
        order.splitPayments = dto.splitPayments;
      }
      if (dto.paymentMethod !== undefined) {
        order.paymentMethod = dto.paymentMethod;
      }
      if (dto.paymentStatus !== undefined) {
        order.paymentStatus = dto.paymentStatus;
      }
      if (dto.usdReceived !== undefined) {
        order.usdReceived = dto.usdReceived;
      }
      if (dto.changeAmount !== undefined) {
        order.changeAmount = dto.changeAmount;
      }
      if (dto.changeAmountBs !== undefined) {
        order.changeAmountBs = dto.changeAmountBs;
      }
      if (dto.changeMethod !== undefined) {
        order.changeMethod = dto.changeMethod;
      }
      if (dto.changeRef !== undefined) {
        order.changeRef = dto.changeRef;
      }
      if (dto.pagoMovilRef !== undefined) {
        order.pagoMovilRef = dto.pagoMovilRef;
      }
      if (dto.pagoMovilPhone !== undefined) {
        order.pagoMovilPhone = dto.pagoMovilPhone;
      }
      if (dto.pagoMovilCedula !== undefined) {
        order.pagoMovilCedula = dto.pagoMovilCedula;
      }
      if (dto.pagoMovilBank !== undefined) {
        order.pagoMovilBank = dto.pagoMovilBank;
      }
      if (dto.puntoRef !== undefined) {
        order.puntoRef = dto.puntoRef;
      }
      if (dto.puntoBank !== undefined) {
        order.puntoBank = dto.puntoBank;
      }
      if (dto.binanceRef !== undefined) {
        order.binanceRef = dto.binanceRef;
      }
      if (dto.transferRef !== undefined) {
        order.transferRef = dto.transferRef;
      }
      if (dto.transferBank !== undefined) {
        order.transferBank = dto.transferBank;
      }
      if (dto.amountBs !== undefined) {
        order.amountBs = dto.amountBs;
      }
      if (dto.exchangeRate !== undefined) {
        order.exchangeRate = dto.exchangeRate;
      }
      if (dto.linkedReservationId !== undefined) {
        order.linkedReservationId = dto.linkedReservationId;
      }

      // Sincronizar reservación vinculada si existe
      const resId = dto.linkedReservationId || order.linkedReservationId;
      if (resId) {
        try {
          const resRepo = manager.getRepository(Reservation);
          const reservation = await resRepo.findOne({ where: { id: resId, tenantId } });
          if (reservation) {
            reservation.orderId = order.id;
            if (order.paymentStatus === PaymentStatus.PAID) {
              reservation.paymentStatus = PaymentStatus.PAID;
              reservation.status = ReservationStatus.COMPLETED;
            }
            await resRepo.save(reservation);
          }
        } catch (resErr) {
          console.error('Error sincronizando reserva en editOrder:', resErr);
        }
      }

      // Update payment status for partial / open tab orders
      if (order.paymentMethod === 'PENDING' || order.paymentStatus === PaymentStatus.PARTIAL || order.paymentStatus === PaymentStatus.PENDING) {
        const roundedAbonos = roundCurrency(order.abonosTotal || 0);
        const roundedTotal = roundCurrency(order.totalAmount || 0);
        if (roundedAbonos >= roundedTotal && roundedTotal > 0) {
          order.paymentStatus = PaymentStatus.PAID;
        } else if (roundedAbonos > 0 && roundedAbonos < roundedTotal) {
          order.paymentStatus = PaymentStatus.PARTIAL;
        } else if (roundedAbonos === 0 && order.paymentStatus !== PaymentStatus.PAID) {
          order.paymentStatus = PaymentStatus.PENDING;
        }
      }
      
      const currentItems = await manager.find(OrderItem, { where: { orderId: order.id } });
      const hasUndelivered = currentItems.some(it => (it.deliveredQuantity || 0) < it.quantity);
      if (hasUndelivered && order.status === OrderStatus.DELIVERED) {
        order.status = OrderStatus.PARTIALLY_DELIVERED;
      }

      if (dto.offlineCreatedAt && !isNaN(new Date(dto.offlineCreatedAt).getTime())) {
        order.createdAt = new Date(dto.offlineCreatedAt);
      }

      const savedOrder = await manager.save(Order, order);
      if (!wasPaid && savedOrder.paymentStatus === PaymentStatus.PAID && savedOrder.customerId) {
        await this.customersService.incrementVisits(tenantId, savedOrder.customerId);
      }
      return savedOrder;
    });
  }
  
  async deliverPartial(tenantId: string, id: string, deliveries: { orderItemId: string, quantityToDeliver: number }[]) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { 
        where: { tenantId, id },
        relations: { items: true } 
      });
      if (!order) throw new BadRequestException('Pedido no encontrado');
      if (order.status === OrderStatus.CANCELED || order.status === OrderStatus.DELIVERED) {
        throw new BadRequestException('No se puede entregar parcialmente');
      }
  
      let allDelivered = true;
      let anyDelivered = false;
  
      for (const item of order.items) {
        const deliveryRequest = deliveries.find(d => d.orderItemId === item.id);
        if (deliveryRequest && deliveryRequest.quantityToDeliver > 0) {
          const newDelivered = item.deliveredQuantity + deliveryRequest.quantityToDeliver;
          if (newDelivered > item.quantity) {
            throw new BadRequestException('No puedes entregar más de la cantidad pedida');
          }
  
          const product = await manager.findOne(Product, { 
            where: { tenantId, id: item.productId },
            relations: { comboItems: { component: true } }
          });
          
          if (product) {
            if (product.isCombo && !product.isPreAssembled && product.comboItems) {
              for (const cItem of product.comboItems) {
                if(cItem.component) {
                  cItem.component.physicalStock -= (deliveryRequest.quantityToDeliver * cItem.quantity);
                  await manager.save(Product, cItem.component);
                }
              }
            } else {
              product.physicalStock -= deliveryRequest.quantityToDeliver;
              await manager.save(Product, product);
            }
          }
  
          item.deliveredQuantity = newDelivered;
          await manager.save(OrderItem, item);
        }
  
        if (item.deliveredQuantity < item.quantity) {
          allDelivered = false;
        }
        if (item.deliveredQuantity > 0) {
          anyDelivered = true;
        }
      }
  
      if (allDelivered) {
        order.status = OrderStatus.DELIVERED;
      } else if (anyDelivered) {
        order.status = OrderStatus.PARTIALLY_DELIVERED;
      }
      
      return manager.save(Order, order);
    });
  }

  async addMediaToOrderItem(tenantId: string, orderItemId: string, imageUrl: string) {
    const OrderItemMedia = require('../entities/order-item-media.entity').OrderItemMedia; // Avoid circular/direct import issues if any
    return this.dataSource.transaction(async (manager) => {
      const orderItem = await manager.findOne(OrderItem, { 
        where: { id: orderItemId, order: { tenantId } },
        relations: { order: true }
      });
      if (!orderItem) throw new BadRequestException('Order Item no encontrado');

      const media = manager.create(OrderItemMedia, {
        tenantId,
        orderItemId: orderItem.id,
        imageUrl: imageUrl
      });
      
      await manager.save(OrderItemMedia, media);
      return media;
    });
  }

  async getDailyCashSummary(tenantId: string, dateStr?: string) {
    const tenantSettings = typeof this.settingsService?.getSettings === 'function' ? await this.settingsService.getSettings(tenantId) : null;
    const offsetHours = Math.max(0, Math.min(6, Number(tenantSettings?.endOfDayOffsetHours || 0)));

    let targetDateStr = dateStr;
    if (!targetDateStr) {
      // Obtener la fecha comercial actual considerando la zona horaria (America/Caracas, UTC-4) y el offset nocturno
      const now = new Date();
      const adjustedDate = new Date(now.getTime() - offsetHours * 60 * 60 * 1000);
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Caracas',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      targetDateStr = formatter.format(adjustedDate); // Formato YYYY-MM-DD
    }

    // Consulta PostgreSQL transformando createdAt a la zona horaria de Caracas y aplicando el offset nocturno
    // Conceptual: (createdAt AT TIME ZONE 'America/Caracas' - INTERVAL 'X hours')::date = fecha_solicitada
    const orderRepo = this.dataSource.getRepository(Order);
    let orders: Order[] = [];
    if (typeof orderRepo.createQueryBuilder === 'function') {
      orders = await orderRepo
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('items.product', 'product')
        .leftJoinAndSelect('order.deliveryZone', 'deliveryZone')
        .leftJoinAndSelect('order.employee', 'employee')
        .leftJoinAndSelect('order.driver', 'driver')
        .leftJoinAndSelect('order.deliveryUser', 'deliveryUser')
        .where('order.tenantId = :tenantId', { tenantId })
        .andWhere(
          `(order.createdAt AT TIME ZONE 'America/Caracas' - (:offsetHours * INTERVAL '1 hour'))::date = :targetDate::date`,
          { offsetHours, targetDate: targetDateStr }
        )
        .orderBy('order.createdAt', 'DESC')
        .getMany();
    } else {
      orders = (await orderRepo.find({ where: { tenantId } } as any)) || [];
    }

    const currentExchangeRateObj = await this.settingsService.getExchangeRate(tenantId);
    const currentExchangeRate = Number(currentExchangeRateObj?.exchangeRateBs || await this.settingsService.getEffectiveRate(tenantId));

    let totalSalesUSD = 0;
    let totalPaidUSD = 0;
    let totalPendingUSD = 0;
    let totalPagoMovilBs = 0;
    let totalPagoMovilUSD = 0;
    let totalPuntoBs = 0;
    let totalPuntoUSD = 0;
    let totalCashUSD = 0;
    let totalCashReceivedUSD = 0;
    let totalCashChangeUSD = 0;
    let totalPagoMovilChangeBs = 0;

    let deliveryOrdersCount = 0;
    let inStoreOrdersCount = 0;
    let webOrdersCount = 0;

    const pagoMovilList: any[] = [];
    const puntoList: any[] = [];
    const recentOrders: any[] = [];
    const vueltosList: any[] = [];

    for (const o of orders) {
      if (o.status === OrderStatus.CANCELED) continue;

      const orderTotal = Number(o.totalAmount || 0);
      const abonos = Number(o.abonosTotal || 0);
      const orderRate = Number(o.exchangeRate) > 0 ? Number(o.exchangeRate) : currentExchangeRate;
      const orderAmountBs = (o.amountBs !== undefined && o.amountBs !== null && Number(o.amountBs) > 0)
        ? Number(o.amountBs)
        : Number((orderTotal * orderRate).toFixed(2));

      totalSalesUSD += orderTotal;

      if (o.paymentStatus === PaymentStatus.PAID) {
        totalPaidUSD += orderTotal;
      } else if (o.paymentStatus === PaymentStatus.PARTIAL) {
        totalPaidUSD += abonos;
        totalPendingUSD += Math.max(0, orderTotal - abonos);
      } else {
        totalPendingUSD += orderTotal;
      }

      // Check delivery method
      if (o.deliveryMethod === DeliveryMethod.DELIVERY) deliveryOrdersCount++;
      else inStoreOrdersCount++;

      if (!o.employeeId) webOrdersCount++;

      // Track Vueltos
      const changeAmt = Number(o.changeAmount || 0);
      if (changeAmt > 0) {
        const bsChange = Number(o.changeAmountBs || (changeAmt * orderRate));
        if (o.changeMethod === 'PAGO_MOVIL') {
          totalPagoMovilChangeBs += bsChange;
          vueltosList.push({
            orderId: o.id,
            orderNumber: o.id.slice(0, 8).toUpperCase(),
            customerName: o.customerName,
            method: 'PAGO_MOVIL',
            amountUsd: changeAmt,
            amountBs: bsChange,
            ref: o.changeRef || 'N/A',
            createdAt: o.createdAt
          });
        } else if (o.changeMethod === 'CASH_BS') {
          vueltosList.push({
            orderId: o.id,
            orderNumber: o.id.slice(0, 8).toUpperCase(),
            customerName: o.customerName,
            method: 'CASH_BS',
            amountUsd: changeAmt,
            amountBs: bsChange,
            ref: 'Efectivo Bs',
            createdAt: o.createdAt
          });
        } else {
          totalCashChangeUSD += changeAmt;
          vueltosList.push({
            orderId: o.id,
            orderNumber: o.id.slice(0, 8).toUpperCase(),
            customerName: o.customerName,
            method: 'CASH_USD',
            amountUsd: changeAmt,
            amountBs: bsChange,
            ref: 'Efectivo USD',
            createdAt: o.createdAt
          });
        }
      }

      // Punto de Venta vs Pago Movil vs Cash Divisas (Soporte Split Tender y Retrocompatibilidad)
      const hasSplitPayments = Array.isArray(o.splitPayments) && o.splitPayments.length > 0;

      if (hasSplitPayments) {
        // --- OBJETIVO 1: Procesar pagos mixtos (Split Tender) ---
        for (const item of o.splitPayments!) {
          const method = (item.method || '').toUpperCase();
          const amtUsd = Number(item.amountUSD) || 0;
          const amtBs = (item.amountBS !== undefined && item.amountBS !== null && Number(item.amountBS) > 0)
            ? Number(item.amountBS)
            : Number((amtUsd * orderRate).toFixed(2));
          const effectiveUsd = amtUsd > 0 ? amtUsd : (orderRate > 0 ? amtBs / orderRate : 0);

          const isCash = ['USD', 'CASH', 'CASH_USD', 'EFECTIVO'].includes(method);
          const isPuntoSplit = ['PUNTO', 'CARD_POS', 'POS', 'TARJETA'].includes(method);
          const isPagoMovilSplit = ['PAGO_MOVIL', 'PAGOMOVIL'].includes(method);
          const isTransferSplit = ['TRANSFER', 'TRANSFERENCIA'].includes(method);

          if (isPuntoSplit) {
            totalPuntoBs += amtBs;
            totalPuntoUSD += effectiveUsd;
            puntoList.push({
              orderId: o.id,
              orderNumber: o.id.slice(0, 8).toUpperCase(),
              customerName: o.customerName,
              ref: item.reference || o.puntoRef || 'N/A',
              bank: o.puntoBank || 'Punto de Venta',
              amountBs: amtBs,
              createdAt: o.createdAt,
            });
          } else if (isPagoMovilSplit || isTransferSplit) {
            totalPagoMovilBs += amtBs;
            totalPagoMovilUSD += effectiveUsd;
            pagoMovilList.push({
              orderId: o.id,
              orderNumber: o.id.slice(0, 8).toUpperCase(),
              customerName: o.customerName,
              ref: item.reference || (isTransferSplit ? o.transferRef : o.pagoMovilRef) || 'N/A',
              bank: isTransferSplit ? (o.transferBank || 'Transferencia') : (o.pagoMovilBank || 'Pago Móvil'),
              phone: o.pagoMovilPhone || o.customerPhone,
              amountBs: amtBs,
              createdAt: o.createdAt,
            });
          } else if (isCash) {
            totalCashReceivedUSD += effectiveUsd;
            totalCashUSD += effectiveUsd;
          }
        }
      } else {
        // --- RETROCOMPATIBILIDAD: Modo original para órdenes sin splitPayments ---
        const isPunto = o.paymentMethod === 'PUNTO' || 
                        o.pagoMovilBank?.toLowerCase().includes('punto') || 
                        o.notes?.toLowerCase().includes('punto');

        const isPagoMovil = o.paymentMethod === 'PAGO_MOVIL' || (o.paymentMethod !== 'USD' && o.pagoMovilRef && o.pagoMovilRef.trim().length > 0);

        const isTransfer = o.paymentMethod === 'TRANSFER' || Boolean(o.transferRef && o.transferRef.trim().length > 0);

        if (isPunto) {
          const bs = orderAmountBs;
          totalPuntoBs += bs;
          totalPuntoUSD += bs / orderRate;
          puntoList.push({
            orderId: o.id,
            orderNumber: o.id.slice(0, 8).toUpperCase(),
            customerName: o.customerName,
            ref: o.puntoRef || o.pagoMovilRef,
            bank: o.puntoBank || o.pagoMovilBank || 'Punto de Venta',
            amountBs: bs,
            createdAt: o.createdAt,
          });
        } else if (isPagoMovil || isTransfer) {
          const bs = orderAmountBs;
          totalPagoMovilBs += bs;
          totalPagoMovilUSD += bs / orderRate;
          pagoMovilList.push({
            orderId: o.id,
            orderNumber: o.id.slice(0, 8).toUpperCase(),
            customerName: o.customerName,
            ref: (isTransfer ? o.transferRef : o.pagoMovilRef) || 'N/A',
            bank: isTransfer ? (o.transferBank || 'Transferencia') : (o.pagoMovilBank || 'Pago Móvil'),
            phone: o.pagoMovilPhone || o.customerPhone,
            amountBs: bs,
            createdAt: o.createdAt,
          });
        } else if (o.paymentStatus === PaymentStatus.PAID && ['USD', 'CASH', 'CASH_USD', 'EFECTIVO'].includes((o.paymentMethod || '').toUpperCase())) {
          const usdIn = Number(o.usdReceived) || orderTotal;
          totalCashReceivedUSD += usdIn;
          totalCashUSD += usdIn;
        }

        if (o.paymentStatus === PaymentStatus.PARTIAL) {
          let cashAbonoUSD = 0;
          if (Array.isArray(o.abonosHistory) && o.abonosHistory.length > 0) {
            for (const abono of o.abonosHistory) {
              const m = (abono.method || '').toUpperCase();
              if (m === 'USD' || m === 'CASH' || m === 'EFECTIVO') {
                cashAbonoUSD += Number(abono.amount || 0);
              }
            }
          } else if (o.paymentMethod === 'USD' || o.paymentMethod === 'CASH') {
            cashAbonoUSD = abonos;
          }

          if (cashAbonoUSD > 0) {
            totalCashReceivedUSD += cashAbonoUSD;
            totalCashUSD += cashAbonoUSD;
          }
        }
      }

      recentOrders.push({
        id: o.id,
        orderNumber: o.id.slice(0, 8).toUpperCase(),
        customerName: o.customerName,
        totalAmount: orderTotal,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        splitPayments: o.splitPayments,
        status: o.status,
        deliveryMethod: o.deliveryMethod,
        pagoMovilRef: o.pagoMovilRef,
        puntoRef: o.puntoRef,
        binanceRef: o.binanceRef,
        transferRef: o.transferRef,
        usdReceived: o.usdReceived,
        changeAmount: o.changeAmount,
        changeAmountBs: o.changeAmountBs,
        changeMethod: o.changeMethod,
        changeRef: o.changeRef,
        createdAt: o.createdAt,
      });
    }

    const expenseRepo = this.dataSource.getRepository(OperatingExpense);
    let expenses: OperatingExpense[] = [];
    if (typeof expenseRepo.createQueryBuilder === 'function') {
      expenses = await expenseRepo
        .createQueryBuilder('expense')
        .where('expense.tenantId = :tenantId', { tenantId })
        .andWhere('expense.paymentMethod IN (:...methods)', { methods: ['CASH', 'CASH_USD', 'USD'] })
        .andWhere(
          `(expense.createdAt AT TIME ZONE 'America/Caracas' - (:offsetHours * INTERVAL '1 hour'))::date = :targetDate::date`,
          { offsetHours, targetDate: targetDateStr }
        )
        .orderBy('expense.createdAt', 'DESC')
        .getMany();
    } else {
      expenses = (await expenseRepo.find({ where: { tenantId } } as any)) || [];
    }

    let totalCashExpensesUSD = 0;
    let baseCash = 0;
    const cashExpensesList: any[] = [];

    for (const e of expenses) {
      const amt = Number(e.amount || 0);
      if (e.category === 'FONDO_CAJA') {
        baseCash += amt;
      } else {
        totalCashExpensesUSD += amt;
      }
      cashExpensesList.push({
        id: e.id,
        description: e.description,
        amount: Number(amt.toFixed(2)),
        category: e.category,
        createdAt: e.createdAt,
      });
    }

    const exchangeRepo = this.dataSource.getRepository(CashExchange);
    let exchanges: CashExchange[] = [];
    if (typeof exchangeRepo.createQueryBuilder === 'function') {
      exchanges = await exchangeRepo
        .createQueryBuilder('ex')
        .where('ex.tenantId = :tenantId', { tenantId })
        .andWhere(
          `(ex.createdAt AT TIME ZONE 'America/Caracas' - (:offsetHours * INTERVAL '1 hour'))::date = :targetDate::date`,
          { offsetHours, targetDate: targetDateStr }
        )
        .orderBy('ex.createdAt', 'DESC')
        .getMany();
    } else {
      exchanges = (await exchangeRepo.find({ where: { tenantId } } as any)) || [];
    }

    let totalExchangedBs = 0;
    let totalExchangedUSD = 0;
    let totalExchangedCashUSD = 0;
    const exchangesList: any[] = [];

    for (const ex of exchanges) {
      const bs = Number(ex.amountBs || 0);
      const usd = Number(ex.amountUSD || 0);
      if (ex.operationType === 'BUY_USD') {
        totalExchangedBs += bs;
        totalExchangedUSD += usd;
        if (ex.destination === 'CASH_USD' || !ex.destination) {
          totalExchangedCashUSD += usd;
        }
      }
      exchangesList.push({
        id: ex.id,
        amountBs: bs,
        amountUSD: usd,
        exchangeRate: Number(ex.exchangeRate),
        operationType: ex.operationType,
        destination: ex.destination,
        notes: ex.notes,
        createdAt: ex.createdAt,
      });
    }

    baseCash = Number(baseCash.toFixed(2));
    totalCashReceivedUSD = Number((totalCashReceivedUSD + baseCash).toFixed(2));
    totalCashUSD = Number((totalCashUSD + baseCash).toFixed(2));
    const netCashUSD = Number((totalCashUSD - totalCashChangeUSD - totalCashExpensesUSD + totalExchangedCashUSD).toFixed(2));

    // Agrupación de estadísticas por repartidor (Delivery Tracking)
    const driverStatsMap: Record<string, {
      driverId: string;
      driverName: string;
      tripsCount: number;
      totalDeliveredAmountUSD: number;
    }> = {};

    for (const o of orders) {
      if (o.status === OrderStatus.CANCELED) continue;

      const isDelivery = o.deliveryMethod === DeliveryMethod.DELIVERY;
      const isPaidOrCompleted = o.paymentStatus === PaymentStatus.PAID || o.status === OrderStatus.DELIVERED;
      const driverId = o.driverId || o.deliveryUserId;

      if (isDelivery && isPaidOrCompleted && driverId) {
        if (!driverStatsMap[driverId]) {
          const driverUser = o.driver || o.deliveryUser;
          driverStatsMap[driverId] = {
            driverId,
            driverName: driverUser?.username || driverUser?.name || 'Repartidor',
            tripsCount: 0,
            totalDeliveredAmountUSD: 0,
          };
        }
        driverStatsMap[driverId].tripsCount += 1;
        driverStatsMap[driverId].totalDeliveredAmountUSD = Number(
          (driverStatsMap[driverId].totalDeliveredAmountUSD + Number(o.totalAmount || 0)).toFixed(2)
        );
      }
    }

    const deliveryStats = Object.values(driverStatsMap);

    return {
      date: targetDateStr,
      exchangeRate: currentExchangeRate,
      currencySymbol: currentExchangeRateObj?.currencySymbol || 'Bs.',
      baseCash,
      fondoDeCaja: baseCash,
      totalSalesUSD: Number(totalSalesUSD.toFixed(2)),
      totalPaidUSD: Number(totalPaidUSD.toFixed(2)),
      totalPendingUSD: Number(totalPendingUSD.toFixed(2)),
      totalPagoMovilBs: Number(totalPagoMovilBs.toFixed(2)),
      totalPagoMovilUSD: Number(totalPagoMovilUSD.toFixed(2)),
      totalPuntoBs: Number(totalPuntoBs.toFixed(2)),
      totalPuntoUSD: Number(totalPuntoUSD.toFixed(2)),
      totalCashUSD,
      totalCashReceivedUSD,
      totalCashChangeUSD: Number(totalCashChangeUSD.toFixed(2)),
      totalCashExpensesUSD: Number(totalCashExpensesUSD.toFixed(2)),
      netCashUSD,
      cashExpensesList,
      totalPagoMovilChangeBs: Number(totalPagoMovilChangeBs.toFixed(2)),
      ordersCount: orders.filter(o => o.status !== OrderStatus.CANCELED).length,
      cashOrdersCount: orders.filter(o => {
        if (o.paymentStatus !== PaymentStatus.PAID || o.status === OrderStatus.CANCELED) return false;
        if (Array.isArray(o.splitPayments) && o.splitPayments.length > 0) {
          return o.splitPayments.some(p => ['USD', 'CASH', 'CASH_USD', 'EFECTIVO'].includes((p.method || '').toUpperCase()) && Number(p.amountUSD) > 0);
        }
        return o.paymentMethod !== 'PAGO_MOVIL' && o.paymentMethod !== 'PUNTO' && !o.pagoMovilBank?.toLowerCase().includes('punto') && !(o.paymentMethod !== 'USD' && o.pagoMovilRef);
      }).length,
      paidOrdersCount: orders.filter(o => o.paymentStatus === PaymentStatus.PAID && o.status !== OrderStatus.CANCELED).length,
      pendingOrdersCount: orders.filter(o => o.paymentStatus !== PaymentStatus.PAID && o.status !== OrderStatus.CANCELED).length,
      cancelledOrdersCount: orders.filter(o => o.status === OrderStatus.CANCELED).length,
      deliveryOrdersCount,
      inStoreOrdersCount,
      webOrdersCount,
      deliveryStats,
      pagoMovilList,
      puntoList,
      vueltosList,
      totalExchangedBs: Number(totalExchangedBs.toFixed(2)),
      totalExchangedUSD: Number(totalExchangedUSD.toFixed(2)),
      totalExchangedCashUSD: Number(totalExchangedCashUSD.toFixed(2)),
      exchangesList,
      recentOrders: recentOrders.slice(0, 15),
    };
  }

  async syncOfflineOrders(tenantId: string, orders: any[], userId?: string, authUserRole?: UserRole | string) {
    const syncedOfflineIds: string[] = [];
    const failedOrders: Array<{ offlineId: string; error: string }> = [];

    for (const item of orders || []) {
      const offlineId = item.offlineId || item.id || 'desconocido';
      try {
        const payload = item.payload || item;
        if (!payload.offlineCreatedAt && (item.createdAt || item.offlineCreatedAt)) {
          payload.offlineCreatedAt = item.offlineCreatedAt || item.createdAt;
        }
        if (item.offlineId) {
          payload.offlineId = item.offlineId;
          const existing = await this.dataSource.getRepository(Order).findOne({
            where: { tenantId, offlineId: item.offlineId },
          });
          if (existing) {
            syncedOfflineIds.push(item.offlineId);
            continue;
          }
        }
        if (payload.editingOrderId) {
          await this.editOrder(tenantId, payload.editingOrderId, payload, userId, authUserRole);
        } else {
          await this.createOrder(tenantId, payload, userId, authUserRole);
        }
        if (item.offlineId) {
          syncedOfflineIds.push(item.offlineId);
        }
      } catch (err: any) {
        const errMsg = err?.message || 'Error al procesar la venta en servidor';
        console.error(`Error syncing single offline order ${offlineId}:`, errMsg);
        failedOrders.push({
          offlineId,
          error: errMsg,
        });
      }
    }
    return { success: true, syncedOfflineIds, failedOrders };
  }

  async confirmSupplier(tenantId: string, orderId: string): Promise<Order> {
    const repo = this.dataSource.getRepository(Order);
    const order = await repo.findOne({
      where: { tenantId, id: orderId },
      relations: { items: { product: true } },
    });
    if (!order) {
      throw new BadRequestException('Orden no encontrada');
    }

    order.status = OrderStatus.PENDIENTE_PAGO;
    order.paymentStatus = PaymentStatus.PENDING;

    return repo.save(order);
  }

  async rejectSupplier(tenantId: string, orderId: string): Promise<Order> {
    const repo = this.dataSource.getRepository(Order);
    const order = await repo.findOne({
      where: { tenantId, id: orderId },
    });
    if (!order) {
      throw new BadRequestException('Orden no encontrada');
    }

    order.status = OrderStatus.CANCELADO_PROVEEDOR;

    return repo.save(order);
  }

  async assignDelivery(tenantId: string, id: string, driverId?: string): Promise<Order> {
    const repo = this.dataSource.getRepository(Order);
    const order = await repo.findOne({
      where: { tenantId, id },
      relations: { deliveryUser: true, driver: true },
    });
    if (!order) {
      throw new BadRequestException('Pedido no encontrado');
    }

    if (driverId && driverId.trim() !== '') {
      const dAccess = await this.dataSource.manager.findOne(UserTenantAccess, {
        where: { userId: driverId, tenantId, isActive: true },
      });
      const userRoles: string[] = [];
      if (dAccess?.role) userRoles.push(dAccess.role);
      if (Array.isArray(dAccess?.roles)) userRoles.push(...dAccess.roles);
      else if (typeof (dAccess?.roles as any) === 'string' && ((dAccess?.roles as any) || '').trim() !== '') {
        userRoles.push(...((dAccess?.roles as any) || '').split(',').map((r: string) => r.trim()));
      }
      const allowedRoles = [UserRole.DELIVERY, UserRole.POS, UserRole.ADMIN, UserRole.OPERATIVO];
      if (!dAccess || !userRoles.some(r => allowedRoles.includes(r as UserRole))) {
        throw new BadRequestException('El repartidor asignado debe ser un miembro activo del equipo de trabajo');
      }
      order.deliveryUserId = driverId;
      order.driverId = driverId;
    } else {
      order.deliveryUserId = null as any;
      order.driverId = null as any;
    }

    await repo.save(order);
    const updated = await repo.findOne({
      where: { tenantId, id },
      relations: { items: { product: true, media: true }, deliveryZone: true, employee: { tenantAccess: true }, deliveryUser: true, driver: true },
    });
    return updated!;
  }
}

