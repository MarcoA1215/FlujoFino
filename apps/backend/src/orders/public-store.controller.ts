import { Controller, Get, Post, Body, Param, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdersService, CreateOrderDto } from './orders.service';
import { Tenant } from '../entities/tenant.entity';
import { Settings } from '../entities/settings.entity';
import { Product } from '../entities/product.entity';
import { DeliveryZone } from '../entities/delivery-zone.entity';
import { decodeTenantId } from '../utils/tenant-crypto';
import { Public } from '../auth/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { PaymentStatus } from '@nutrideli/shared-types';

@Public()
@Controller('public/store')
export class PublicStoreController {
  constructor(
    private readonly ordersService: OrdersService,
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

    const settings = await this.settingsRepo.findOne({ where: { tenantId } });
    const deliveryZones = await this.deliveryZoneRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });

    const products = await this.productRepo.find({
      where: { tenantId },
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
      const availableStock = Math.max(0, Number(p.stock !== undefined && p.stock !== null ? p.stock : (p.stockQuantity || 0)));

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
        isService: false,
        isOutOfStock: availableStock <= 0,
      };
    });

    const categories = Array.from(
      new Set(storeProducts.map((p) => p.category).filter(Boolean))
    );

    return {
      tenant: {
        id: token,
        name: tenant.name,
      },
      settings: {
        exchangeRateBs: Number(settings?.exchangeRateBs || 40.0),
        companyBank: settings?.companyBank || '',
        companyCedula: settings?.companyCedula || '',
        companyPhone: settings?.companyPhone || '',
        themePrimaryColor: settings?.themePrimaryColor || '#1e293b',
        themeHeaderColor: settings?.themeHeaderColor || '#334155',
        featureBuySell: settings?.featureBuySell ?? true,
        featureCustomerSchedules: settings?.featureCustomerSchedules ?? false,
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

    if (!dto.customerName || !dto.customerName.trim()) {
      throw new BadRequestException('El nombre del cliente es obligatorio');
    }
    if (!dto.customerPhone || !dto.customerPhone.trim()) {
      throw new BadRequestException('El teléfono del cliente es obligatorio');
    }
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El carrito está vacío');
    }

    // 1. Control de stock estricto en backend
    for (const item of dto.items) {
      if (!item.productId || item.quantity <= 0) {
        throw new BadRequestException('Producto o cantidad no válidos en el carrito');
      }

      const product = await this.productRepo.findOne({
        where: { tenantId, id: item.productId },
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

      const availableStock = Math.max(0, Number(product.stock !== undefined && product.stock !== null ? product.stock : (product.stockQuantity || 0)));
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

    // 2. Crear orden mediante OrdersService
    const orderPayload: CreateOrderDto = {
      ...dto,
      paymentStatus: dto.paymentStatus || PaymentStatus.PENDING,
    };

    const createdOrder = await this.ordersService.createOrder(tenantId, orderPayload);

    return {
      success: true,
      message: 'Pedido realizado con éxito',
      orderId: createdOrder.id,
      orderNumber: createdOrder.id.slice(0, 8).toUpperCase(),
      totalAmount: createdOrder.totalAmount,
      totalAmountBs: createdOrder.amountBs,
      deliveryMethod: createdOrder.deliveryMethod,
      customerName: createdOrder.customerName,
      customerPhone: createdOrder.customerPhone,
      itemsCount: createdOrder.items?.length || dto.items.length,
    };
  }
}
