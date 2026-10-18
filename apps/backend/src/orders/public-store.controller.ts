import { Controller, Get, Post, Body, Param, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdersService, CreateOrderDto } from './orders.service';
import { Tenant } from '../entities/tenant.entity';
import { Settings } from '../entities/settings.entity';
import { Product } from '../entities/product.entity';
import { DeliveryZone } from '../entities/delivery-zone.entity';
import { Order } from '../entities/order.entity';
import { decodeTenantId } from '../utils/tenant-crypto';
import { isTenantSuspendedOrExpired } from '../utils/tenant-status';
import { Public } from '../auth/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { PaymentStatus, OrderStatus } from '@finowork/shared-types';

import { NotificationsService } from '../notifications/notifications.service';

@Public()
@Controller('public/store')
export class PublicStoreController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Settings) private readonly settingsRepo: Repository<Settings>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(DeliveryZone) private readonly deliveryZoneRepo: Repository<DeliveryZone>,
  ) {}

  @Get('tenant/:id')
  async getStoreInfo(@Param('id') token: string) {
    let tenantId: string;
    try {
      tenantId = decodeTenantId(token);
    } catch {
      throw new NotFoundException('Enlace de tienda no válido o no encontrado');
    }

    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tienda no encontrada');
    }

    const isSuspended = isTenantSuspendedOrExpired(tenant);
    const settings = await this.settingsRepo.findOne({ where: { tenantId } });

    if (isSuspended) {
      return {
        tenant: {
          id: token,
          name: tenant.name,
        },
        settings: {
          companyPhone: settings?.companyPhone || '',
          themePrimaryColor: settings?.themePrimaryColor || '#10b981',
          themeHeaderColor: settings?.themeHeaderColor || settings?.themePrimaryColor || '#10b981',
          companyLogoUrl: settings?.companyLogoUrl || null,
          logoShape: settings?.logoShape || 'ROUNDED',
          logoFit: settings?.logoFit || 'contain',
        },
        isSuspended: true,
        products: [],
        deliveryZones: [],
        categories: [],
      };
    }

    if (settings && settings.featureShowCatalog === false) {
      throw new BadRequestException('El catálogo online se encuentra desactivado');
    }
    const deliveryZones = await this.deliveryZoneRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });

    const products = await this.productRepo.find({
      where: { tenantId },
      relations: { comboItems: { component: true } },
      order: { category: 'ASC', name: 'ASC' },
    });

    // Excluimos estrictamente los servicios: la tienda online es exclusivamente para productos físicos de compra-venta y preparados (delivery / retiro)
    const nonServiceProducts = products.filter((p) => {
      if (p.product_type === 'SERVICIO') return false;
      if (p.is_service === true) return false;
      if (p.category === 'Servicios') return false;
      return true;
    });

    const storeProducts = nonServiceProducts.map((p) => {
      const isFoodCategory = Boolean(p.category && /comida|alimento|hamburguesa|snack|bebida|preparad|postre|restaurante/i.test(p.category));
      const hasRecipe = Boolean(p.recipe && p.recipe.length > 0);
      const isFormula = p.product_type === 'FORMULA';
      const isFoodOrPrepared = (hasRecipe && !p.isPreAssembled) || isFormula || (isFoodCategory && !p.isPreAssembled);
      const isMadeToOrder = isFoodOrPrepared;

      let availableStock = Math.max(0, Number(p.stock !== undefined && p.stock !== null ? p.stock : (p.stockQuantity || 0)));
      if (p.isCombo && !p.isPreAssembled && p.comboItems && p.comboItems.length > 0) {
        let minAvail = Infinity;
        for (const ci of p.comboItems) {
          const compStock = ci.component?.physicalStock ?? ci.component?.stockQuantity ?? 0;
          const possible = Math.floor(compStock / (ci.quantity || 1));
          if (possible < minAvail) minAvail = possible;
        }
        availableStock = minAvail === Infinity ? 0 : Math.max(0, minAvail);
      } else if (p.physicalStock !== undefined && p.physicalStock !== null && availableStock > p.physicalStock) {
        availableStock = Math.max(0, Number(p.physicalStock));
      }

      // Si es un producto preparado al momento / comida y no maneja stock rígido prefabricado, no limitar a 0 o 1
      if (isMadeToOrder && availableStock <= 1) {
        availableStock = 99;
      }

      const isUnderDemand = p.availabilityType === 'BAJO_ENCARGO' || Boolean(p.isSupplierPreorder) || isMadeToOrder;

      return {
        id: p.id,
        name: p.name,
        description: p.description || '',
        category: p.category || 'General',
        salePrice: Number(p.salePrice || 0),
        images: Array.isArray(p.images)
          ? p.images
          : typeof p.images === 'string' && (p.images as string).trim().length > 0
          ? (p.images as string).split(',').map((s) => s.trim())
          : [],
        stockQuantity: availableStock,
        stock: availableStock,
        availabilityType: p.availabilityType || 'INMEDIATO',
        isSupplierPreorder: Boolean(p.isSupplierPreorder),
        isService: false,
        isOutOfStock: isUnderDemand ? false : availableStock <= 0,
        product_type: p.product_type,
        isCombo: Boolean(p.isCombo),
        isPreAssembled: Boolean(p.isPreAssembled),
        isMadeToOrder,
      };
    });

    const categories = Array.from(
      new Set(storeProducts.map((p) => p.category).filter(Boolean))
    );

    let rate = Number(settings?.exchangeRateBs || 0);
    if (!rate || rate === 40.0) {
      const globalSettings = await this.settingsRepo.findOne({ where: { id: 'GLOBAL' } });
      rate = Number(globalSettings?.exchangeRateBs || 40.0);
    }

    return {
      tenant: {
        id: token,
        name: tenant.name,
      },
      settings: {
        exchangeRateBs: rate,
        companyBank: settings?.companyBank || '',
        companyCedula: settings?.companyCedula || '',
        companyPhone: settings?.companyPhone || '',
        companyAccountNumber: settings?.companyAccountNumber || '',
        companyAccountHolder: settings?.companyAccountHolder || '',
        binancePayId: settings?.binancePayId || '',
        binanceEmail: settings?.binanceEmail || '',
        acceptCashUsd: settings?.acceptCashUsd !== false,
        acceptPagoMovil: settings?.acceptPagoMovil !== false,
        acceptCardPos: settings?.acceptCardPos === true,
        acceptBinance: settings?.acceptBinance === true,
        acceptTransfer: settings?.acceptTransfer === true,
        themePrimaryColor: settings?.themePrimaryColor || '#10b981',
        themeHeaderColor: settings?.themeHeaderColor || settings?.themePrimaryColor || '#10b981',
        companyLogoUrl: settings?.companyLogoUrl || null,
        logoShape: settings?.logoShape || 'ROUNDED',
        logoFit: settings?.logoFit || 'contain',
        featureBuySell: settings?.featureBuySell ?? false,
        featureRecipes: settings?.featureRecipes ?? false,
        featureCustomerSchedules: settings?.featureCustomerSchedules ?? false,
        featureShowCatalog: settings?.featureShowCatalog !== false,
        hasBooking: settings?.featureCustomerSchedules ?? false,
      },
      products: storeProducts,
      deliveryZones: deliveryZones.map((z) => ({
        id: z.id,
        name: z.name,
        feePrice: Number(z.feePrice || 0),
      })),
      categories,
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('tenant/:id/order')
  async createPublicStoreOrder(
    @Param('id') token: string,
    @Body() dto: CreateOrderDto
  ) {
    let tenantId: string;
    try {
      tenantId = decodeTenantId(token);
    } catch {
      throw new NotFoundException('Tienda no encontrada');
    }

    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tienda no encontrada');
    }
    if (isTenantSuspendedOrExpired(tenant)) {
      throw new BadRequestException('Esta tienda se encuentra temporalmente en pausa y no está recibiendo pedidos.');
    }

    const settings = await this.settingsRepo.findOne({ where: { tenantId } });
    if (settings && settings.featureShowCatalog === false) {
      throw new BadRequestException('El catálogo online se encuentra desactivado');
    }

    if (!dto.customerName || !dto.customerName.trim()) {
      throw new BadRequestException('El nombre del cliente es obligatorio');
    }
    if (!dto.customerPhone || !dto.customerPhone.trim()) {
      throw new BadRequestException('El teléfono del cliente es obligatorio');
    }
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El carrito está vacío');
    }

    let hasPreorder = false;
    let hasUnderDemand = false;

    // 1. Control de stock estricto en backend
    for (const item of dto.items) {
      if (!item.productId || item.quantity <= 0) {
        throw new BadRequestException('Producto o cantidad no válidos en el carrito');
      }

      const product = await this.productRepo.findOne({
        where: { tenantId, id: item.productId },
        relations: { comboItems: { component: true } },
      });

      if (!product) {
        throw new BadRequestException(`Producto con ID ${item.productId} no encontrado`);
      }

      const isService = product.is_service === true || (product.is_service !== false && product.category === 'Servicios');
      if (isService) {
        throw new BadRequestException(
          `El producto "${product.name}" ya no está disponible para compra directa en tienda (ha sido configurado como servicio). Por favor retíralo de tu carrito para continuar.`
        );
      }

      if (product.isSupplierPreorder) {
        hasPreorder = true;
      }
      if (product.availabilityType === 'BAJO_ENCARGO') {
        hasUnderDemand = true;
      }

      const isFoodCategory = Boolean(product.category && /comida|alimento|hamburguesa|snack|bebida|preparad|postre|restaurante/i.test(product.category));
      const hasRecipe = Boolean(product.recipe && product.recipe.length > 0);
      const isFormula = product.product_type === 'FORMULA';
      const isFoodOrPrepared = (hasRecipe && !product.isPreAssembled) || isFormula || (isFoodCategory && !product.isPreAssembled);
      const isMadeToOrder = isFoodOrPrepared;

      const isExemptFromStock = product.isSupplierPreorder || product.availabilityType === 'BAJO_ENCARGO' || isMadeToOrder;
      if (!isExemptFromStock) {
        let availableStock = Math.max(0, Number(product.stock !== undefined && product.stock !== null ? product.stock : (product.stockQuantity || 0)));
        if (product.isCombo && !product.isPreAssembled && product.comboItems && product.comboItems.length > 0) {
          let minAvail = Infinity;
          for (const ci of product.comboItems) {
            const compStock = ci.component?.physicalStock ?? ci.component?.stockQuantity ?? 0;
            const possible = Math.floor(compStock / (ci.quantity || 1));
            if (possible < minAvail) minAvail = possible;
          }
          availableStock = minAvail === Infinity ? 0 : Math.max(0, minAvail);
        } else if (product.physicalStock !== undefined && product.physicalStock !== null && availableStock > product.physicalStock) {
          availableStock = Math.max(0, Number(product.physicalStock));
        }
        if (availableStock <= 0) {
          throw new BadRequestException(
            `El producto "${product.name}" se encuentra agotado.`
          );
        }
        if (item.quantity > availableStock) {
          throw new BadRequestException(
            `No hay suficiente stock para "${product.name}". Disponible: ${availableStock}, solicitado: ${item.quantity}.`
          );
        }
      }
    }

    // 2. Crear orden mediante OrdersService con sanitización estricta de seguridad
    const hasElectronicPayment = Boolean(dto.pagoMovilRef || dto.transferRef || dto.binanceRef || dto.paymentReported);
    const normalizedCedula = this.normalizeDocumentId((dto as any).customerCedula || (dto as any).identification || dto.pagoMovilCedula);
    const orderPayload: CreateOrderDto = {
      items: dto.items,
      customerName: dto.customerName?.trim(),
      customerPhone: dto.customerPhone?.trim(),
      customerCedula: normalizedCedula || undefined,
      identification: normalizedCedula || undefined,
      customerAddress: dto.customerAddress?.trim(),
      deliveryMethod: dto.deliveryMethod,
      deliveryZoneId: dto.deliveryZoneId,
      notes: dto.notes?.trim(),
      tableNumber: dto.tableNumber?.trim(),
      paymentMethod: dto.paymentMethod,
      pagoMovilRef: dto.pagoMovilRef?.trim(),
      pagoMovilPhone: dto.pagoMovilPhone?.trim(),
      pagoMovilCedula: normalizedCedula || dto.pagoMovilCedula?.trim(),
      pagoMovilBank: dto.pagoMovilBank?.trim(),
      puntoRef: dto.puntoRef?.trim(),
      puntoBank: dto.puntoBank?.trim(),
      binanceRef: dto.binanceRef?.trim(),
      transferRef: dto.transferRef?.trim(),
      transferBank: dto.transferBank?.trim(),
      amountBs: dto.amountBs ? Number(dto.amountBs) : undefined,
      exchangeRate: dto.exchangeRate ? Number(dto.exchangeRate) : undefined,
      splitPayments: undefined,
      usdReceived: undefined,
      changeAmount: undefined,
      changeAmountBs: undefined,
      changeMethod: undefined,
      changeRef: undefined,
      // Blindaje de seguridad: el cliente público no puede auto-aprobarse pedidos,
      // ni aplicar descuentos, ni inyectar abonos o reasignar personal
      status: hasPreorder ? OrderStatus.SOLICITUD_ENCARGO : OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paymentReported: hasElectronicPayment,
      paymentProofUrl: dto.paymentProofUrl || undefined,
      requestedDeliveryDate: dto.requestedDeliveryDate,
      discountAmount: 0,
      initialAbono: undefined,
      employeeId: undefined,
      driverId: undefined,
      deliveryUserId: undefined,
    };

    const createdOrder = await this.ordersService.createOrder(tenantId, orderPayload);

    // Notify admins in real-time and via Web Push
    try {
      await this.notificationsService.notifyNewOrder(tenantId, createdOrder);
    } catch (err) {
      console.error('Failed to notify admins of new order:', err);
    }

    return {
      success: true,
      message: 'Pedido realizado con éxito',
      orderId: createdOrder.id,
      orderNumber: createdOrder.id.slice(0, 8).toUpperCase(),
      status: createdOrder.status,
      paymentStatus: createdOrder.paymentStatus,
      paymentReported: createdOrder.paymentReported,
      paymentMethod: createdOrder.paymentMethod,
      abonosTotal: Number(createdOrder.abonosTotal || 0),
      remainingAmount: Math.max(0, Number(createdOrder.totalAmount || 0) - Number(createdOrder.abonosTotal || 0)),
      abonosHistory: createdOrder.abonosHistory || [],
      totalAmount: createdOrder.totalAmount,
      totalAmountBs: createdOrder.amountBs,
      deliveryMethod: createdOrder.deliveryMethod,
      customerName: createdOrder.customerName,
      customerPhone: createdOrder.customerPhone,
      itemsCount: createdOrder.items?.length || dto.items.length,
    };
  }

  private isUuid(val: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
  }

  private normalizeDocumentId(input?: string | null): string {
    if (!input) return '';
    const trimmed = input.trim().toUpperCase();
    if (!trimmed) return '';
    const prefixMatch = trimmed.match(/^([VEJGP])/);
    const digits = trimmed.replace(/\D/g, '');
    if (!digits) return '';
    const prefix = prefixMatch ? prefixMatch[1] : 'V';
    return `${prefix}-${digits}`;
  }

  private async findOrderByIdOrPrefix(orderIdOrPrefix: string, tenantId?: string): Promise<Order | null> {
    const clean = (orderIdOrPrefix || '').trim().replace(/^#/, '');
    if (!clean) return null;

    if (this.isUuid(clean)) {
      const whereClause: any = { id: clean };
      if (tenantId) whereClause.tenantId = tenantId;
      const exact = await this.orderRepo.findOne({
        where: whereClause,
        relations: { items: { product: true } },
      });
      if (exact) return exact;
    }

    const cleanLower = clean.toLowerCase();
    if (cleanLower.length >= 6) {
      const qb = this.orderRepo
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('items.product', 'product')
        .where('LOWER(CAST(order.id AS TEXT)) LIKE :prefix', { prefix: `${cleanLower}%` });

      if (tenantId) {
        qb.andWhere('order.tenantId = :tenantId', { tenantId });
      }

      return await qb.orderBy('order.createdAt', 'DESC').getOne();
    }

    return null;
  }

  @Get('order/:orderId')
  async getPublicOrderStatus(@Param('orderId') orderId: string) {
    const order = await this.findOrderByIdOrPrefix(orderId);

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return this.formatOrderResponse(order);
  }

  @Throttle({ default: { limit: 6, ttl: 60000 } })
  @Post('order/:orderId/payment')
  async reportOrderPayment(
    @Param('orderId') orderId: string,
    @Body() dto: {
      amount: number;
      amountBs?: number;
      method: string;
      reference: string;
      bank?: string;
      notes?: string;
      paymentProofUrl?: string;
    }
  ) {
    if (!dto.amount || Number(dto.amount) <= 0) {
      throw new BadRequestException('El monto reportado debe ser mayor a 0');
    }
    if (!dto.reference || !dto.reference.trim()) {
      throw new BadRequestException('Por favor, ingresa el número de referencia del comprobante');
    }

    const order = await this.findOrderByIdOrPrefix(orderId);

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }
    if (order.status === OrderStatus.CANCELED || order.status === OrderStatus.CANCELADO_PROVEEDOR) {
      throw new BadRequestException('No se pueden reportar pagos para un pedido cancelado');
    }

    const cleanRef = dto.reference.trim();
    const cleanMethod = (dto.method || 'PAGO_MOVIL').toUpperCase();
    const cleanBank = dto.bank ? dto.bank.trim() : undefined;

    const paymentEntry = {
      id: Date.now().toString(),
      amount: Number(dto.amount),
      amountBs: dto.amountBs ? Number(dto.amountBs) : undefined,
      method: cleanMethod,
      ref: cleanRef,
      reference: cleanRef,
      bank: cleanBank,
      date: new Date().toISOString(),
      notes: dto.notes ? dto.notes.trim() : undefined,
      status: 'REPORTED_PENDING_APPROVAL',
    };

    order.abonosHistory = Array.isArray(order.abonosHistory) ? order.abonosHistory : [];
    order.abonosHistory.push(paymentEntry);
    order.abonosTotal = Math.round(((Number(order.abonosTotal || 0) + Number(dto.amount)) * 100)) / 100;

    // Si aún no está completamente pagado, mantener en estado actual (PENDING o PARTIAL) pero marcar paymentReported = true
    if (order.paymentStatus !== PaymentStatus.PAID) {
      order.paymentReported = true;
    }
    order.paymentRejectedReason = null as any;

    if (cleanMethod === 'PAGO_MOVIL') {
      order.pagoMovilRef = cleanRef;
      if (cleanBank) order.pagoMovilBank = cleanBank;
    } else if (cleanMethod === 'TRANSFER') {
      order.transferRef = cleanRef;
      if (cleanBank) order.transferBank = cleanBank;
    } else if (cleanMethod === 'BINANCE') {
      order.binanceRef = cleanRef;
    } else {
      order.pagoMovilRef = cleanRef;
      if (cleanBank) order.pagoMovilBank = cleanBank;
    }

    if (dto.paymentProofUrl) {
      order.paymentProofUrl = dto.paymentProofUrl;
    }

    const methodLabel = cleanMethod === 'PAGO_MOVIL' ? 'Pago Móvil' : cleanMethod === 'BINANCE' ? 'Binance' : cleanMethod === 'TRANSFER' ? 'Transferencia' : 'Pago';
    const noteTag = `[Abono/Pago Reportado: $${Number(dto.amount).toFixed(2)} vía ${methodLabel} Ref: ${cleanRef}${cleanBank ? ` (${cleanBank})` : ''}]`;
    order.notes = order.notes ? `${order.notes} | ${noteTag}` : noteTag;

    const savedOrder = await this.orderRepo.save(order);

    try {
      const anyNotif = this.notificationsService as any;
      if (typeof anyNotif.sendNotificationToNegocio === 'function') {
        await anyNotif.sendNotificationToNegocio(order.tenantId, {
          title: '📱 Comprobante de Pago / Abono en Pedido',
          body: `${order.customerName || 'Cliente'} reportó un abono de $${Number(dto.amount).toFixed(2)} (${methodLabel}) en el pedido #${order.id.slice(0, 8).toUpperCase()}.`,
          data: {
            url: '/orders',
            orderId: order.id,
            type: 'ORDER_PAYMENT_REPORTED',
          },
        }, ['ADMIN', 'CAJERO', 'POS']);
      } else if (typeof this.notificationsService.notifyNewOrder === 'function') {
        await this.notificationsService.notifyNewOrder(order.tenantId, savedOrder);
      }
    } catch (err) {}

    return {
      success: true,
      message: 'Abono reportado con éxito. El negocio verificará tu comprobante.',
      ...this.formatOrderResponse(savedOrder),
    };
  }

  @Throttle({ default: { limit: 6, ttl: 60000 } })
  @Post('tenant/:id/track')
  async trackOrder(
    @Param('id') token: string,
    @Body() body: { orderCode?: string; phone?: string; cedula?: string }
  ) {
    let tenantId: string;
    try {
      tenantId = decodeTenantId(token);
    } catch {
      throw new NotFoundException('Tienda no encontrada');
    }

    const cleanCode = (body.orderCode || '').trim().replace(/^#/, '').toLowerCase();
    const rawIdentifier = (body.phone || body.cedula || '').trim();
    const cleanDigits = rawIdentifier.replace(/\D/g, '');

    if (!cleanCode || cleanCode.length < 6) {
      throw new BadRequestException('Ingresa un código de pedido válido de al menos 6 u 8 caracteres (ej: #A1B2C3D4)');
    }

    if (!cleanDigits || cleanDigits.length < 4) {
      throw new BadRequestException('Ingresa el número de teléfono o cédula (o al menos los últimos 4 dígitos) registrado en el pedido para verificar tu identidad');
    }

    const order = await this.findOrderByIdOrPrefix(cleanCode, tenantId);

    if (!order) {
      throw new NotFoundException('No encontramos ningún pedido con ese código en esta tienda.');
    }

    const orderPhoneDigits = (order.customerPhone || '').replace(/\D/g, '');
    const orderCedulaDigits = (order.identification || order.pagoMovilCedula || '').replace(/\D/g, '');

    const matchesPhone =
      Boolean(orderPhoneDigits) &&
      (orderPhoneDigits.endsWith(cleanDigits) ||
        orderPhoneDigits.includes(cleanDigits) ||
        cleanDigits.endsWith(orderPhoneDigits));

    const matchesCedula =
      Boolean(orderCedulaDigits) &&
      (orderCedulaDigits.endsWith(cleanDigits) ||
        orderCedulaDigits.includes(cleanDigits) ||
        cleanDigits.endsWith(orderCedulaDigits));

    if (!matchesPhone && !matchesCedula) {
      throw new NotFoundException('El número de teléfono o cédula no coincide con el registrado en este pedido.');
    }

    return this.formatOrderResponse(order);
  }

  private formatOrderResponse(order: Order) {
    const totalAmt = Number(order.totalAmount || 0);
    const abonosAmt = Number(order.abonosTotal || 0);
    const remainingAmt = Math.max(0, Math.round((totalAmt - abonosAmt) * 100) / 100);

    return {
      id: order.id,
      orderId: order.id,
      orderNumber: order.id.slice(0, 8).toUpperCase(),
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentReported: order.paymentReported,
      paymentMethod: order.paymentMethod,
      paymentProofUrl: order.paymentProofUrl,
      paymentRejectedReason: order.paymentRejectedReason,
      abonosTotal: abonosAmt,
      remainingAmount: remainingAmt,
      abonosHistory: order.abonosHistory || [],
      pagoMovilRef: order.pagoMovilRef,
      pagoMovilBank: order.pagoMovilBank,
      transferRef: order.transferRef,
      transferBank: order.transferBank,
      binanceRef: order.binanceRef,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      identification: order.identification || order.pagoMovilCedula || '',
      customerCedula: order.identification || order.pagoMovilCedula || '',
      totalAmount: order.totalAmount,
      grandTotalUSD: totalAmt,
      amountBs: order.amountBs,
      grandTotalBs: Number(order.amountBs),
      exchangeRate: Number(order.exchangeRate || 40),
      deliveryMethod: order.deliveryMethod,
      customerAddress: order.customerAddress,
      createdAt: order.createdAt,
      notes: order.notes,
      items: (order.items || []).map((i) => ({
        quantity: i.quantity,
        product: {
          id: i.productId,
          name: i.product?.name || 'Producto',
          salePrice: Number(i.unitPrice),
        },
      })),
    };
  }
}
