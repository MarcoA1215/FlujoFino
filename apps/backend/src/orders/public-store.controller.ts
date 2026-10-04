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
          themePrimaryColor: settings?.themePrimaryColor || '#1e293b',
          themeHeaderColor: settings?.themeHeaderColor || '#334155',
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
      let availableStock = Math.max(0, Number(p.stock !== undefined && p.stock !== null ? p.stock : (p.stockQuantity || 0)));
      if (p.isCombo && !p.isPreAssembled && p.comboItems && p.comboItems.length > 0) {
        let minAvail = Infinity;
        for (const ci of p.comboItems) {
          const compStock = ci.component?.physicalStock ?? ci.component?.stockQuantity ?? 0;
          const possible = Math.floor(compStock / (ci.quantity || 1));
          if (possible < minAvail) minAvail = possible;
        }
        availableStock = minAvail === Infinity ? 0 : Math.max(0, minAvail);
      }
      const isUnderDemand = p.availabilityType === 'BAJO_ENCARGO' || Boolean(p.isSupplierPreorder);

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
        themePrimaryColor: settings?.themePrimaryColor || '#1e293b',
        themeHeaderColor: settings?.themeHeaderColor || '#334155',
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

      const isExemptFromStock = product.isSupplierPreorder || product.availabilityType === 'BAJO_ENCARGO';
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

    // 2. Crear orden mediante OrdersService
    const orderPayload: CreateOrderDto = {
      ...dto,
      status: hasPreorder ? OrderStatus.SOLICITUD_ENCARGO : dto.status,
      paymentStatus: hasPreorder ? PaymentStatus.PENDING : (dto.paymentStatus || PaymentStatus.PENDING),
      requestedDeliveryDate: dto.requestedDeliveryDate,
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
      totalAmount: createdOrder.totalAmount,
      totalAmountBs: createdOrder.amountBs,
      deliveryMethod: createdOrder.deliveryMethod,
      customerName: createdOrder.customerName,
      customerPhone: createdOrder.customerPhone,
      itemsCount: createdOrder.items?.length || dto.items.length,
    };
  }

  @Get('order/:orderId')
  async getPublicOrderStatus(@Param('orderId') orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        customerName: true,
        customerPhone: true,
        totalAmount: true,
        amountBs: true,
        deliveryMethod: true,
        createdAt: true,
        notes: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }
    return {
      id: order.id,
      orderNumber: order.id.slice(0, 8).toUpperCase(),
      status: order.status,
      paymentStatus: order.paymentStatus,
      customerName: order.customerName,
      totalAmount: order.totalAmount,
      amountBs: order.amountBs,
      deliveryMethod: order.deliveryMethod,
      createdAt: order.createdAt,
      notes: order.notes,
    };
  }
}
