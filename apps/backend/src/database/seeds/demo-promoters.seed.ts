import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

// Load environment variables
dotenv.config();

// Entities
import { User } from '../../entities/user.entity';
import { Tenant } from '../../entities/tenant.entity';
import { UserTenantAccess } from '../../entities/user-tenant-access.entity';
import { Settings } from '../../entities/settings.entity';
import { Product } from '../../entities/product.entity';
import { RawMaterial } from '../../entities/raw-material.entity';
import { RecipeItem } from '../../entities/recipe-item.entity';
import { ComboItem } from '../../entities/combo-item.entity';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Reservation } from '../../entities/reservation.entity';
import { DeliveryZone } from '../../entities/delivery-zone.entity';
import { ProductionBatch } from '../../entities/production-batch.entity';
import { StockMovement } from '../../entities/stock-movement.entity';
import { WorkSchedule } from '../../entities/work-schedule.entity';
import { OperatingExpense } from '../../entities/operating-expense.entity';
import { AccessRequest } from '../../entities/access-request.entity';
import { Feedback } from '../../entities/feedback.entity';
import { OrderItemMedia } from '../../entities/order-item-media.entity';
import { Customer } from '../../entities/customer.entity';
import { SaaSPaymentReport } from '../../entities/saas-payment-report.entity';
import { PlatformConfig } from '../../entities/platform-config.entity';

// Enums
import { 
  UserRole, 
  TenantStatus, 
  TenantPlanType, 
  OrderStatus, 
  PaymentStatus, 
  ReservationStatus, 
  DeliveryMethod 
} from '@nutrideli/shared-types';

async function runSeed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL no está definida en las variables de entorno.');
    process.exit(1);
  }

  const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    entities: [
      User, Tenant, UserTenantAccess, Settings, Product, RawMaterial, RecipeItem,
      ComboItem, Order, OrderItem, Reservation, DeliveryZone, ProductionBatch,
      StockMovement, WorkSchedule, OperatingExpense, AccessRequest, Feedback,
      OrderItemMedia, Customer, SaaSPaymentReport, PlatformConfig
    ],
    synchronize: true, // Sincroniza columnas nuevas si hicieran falta
  });

  console.log('🔄 Conectando a la base de datos...');
  await dataSource.initialize();
  console.log('✅ Conexión establecida.');

  const userRepo = dataSource.getRepository(User);
  const tenantRepo = dataSource.getRepository(Tenant);
  const accessRepo = dataSource.getRepository(UserTenantAccess);
  const settingsRepo = dataSource.getRepository(Settings);
  const productRepo = dataSource.getRepository(Product);
  const rawMaterialRepo = dataSource.getRepository(RawMaterial);
  const recipeRepo = dataSource.getRepository(RecipeItem);
  const orderRepo = dataSource.getRepository(Order);
  const orderItemRepo = dataSource.getRepository(OrderItem);
  const reservationRepo = dataSource.getRepository(Reservation);
  const deliveryZoneRepo = dataSource.getRepository(DeliveryZone);

  try {
    // ==========================================
    // 1. USUARIO PROMOTOR UNIVERSAL
    // ==========================================
    console.log('👤 Configurando Usuario Promotor...');
    const promoterEmail = 'promotor@flujofino.com';
    const promoterUsername = 'promotor';
    const promoterPasswordHash = await bcrypt.hash('demo123', 10);

    let promoter = await userRepo.findOne({
      where: [{ email: promoterEmail }, { username: promoterUsername }]
    });

    if (!promoter) {
      promoter = userRepo.create({
        email: promoterEmail,
        username: promoterUsername,
        passwordHash: promoterPasswordHash,
        role: UserRole.ADMIN,
      });
      promoter = await userRepo.save(promoter);
      console.log('   ✅ Creado usuario promotor:', promoter.email);
    } else {
      promoter.passwordHash = promoterPasswordHash;
      promoter.role = UserRole.ADMIN;
      promoter = await userRepo.save(promoter);
      console.log('   ℹ️ Usuario promotor actualizado:', promoter.email);
    }

    // Helper para vincular tenant access
    const linkPromoterAccess = async (tenantId: string) => {
      let access = await accessRepo.findOne({
        where: { userId: promoter.id, tenantId }
      });
      if (!access) {
        access = accessRepo.create({
          userId: promoter.id,
          tenantId,
          role: UserRole.ADMIN,
          isActive: true,
          status: 'ACCEPTED',
          jobTitle: 'Promotor Comercial Flujo Fino'
        });
      } else {
        access.role = UserRole.ADMIN;
        access.isActive = true;
        access.status = 'ACCEPTED';
      }
      await accessRepo.save(access);
    };

    // ==========================================
    // 2. ESPACIO 1: DEMO SALÓN & SPA
    // ==========================================
    console.log('💆 Configurando Espacio 1: Demo Salón & Spa (demo-servicios)...');
    let tenantSpa = await tenantRepo.findOne({
      where: [{ referral_code: 'demo-servicios' }, { name: 'Demo Salón & Spa' }]
    });

    if (!tenantSpa) {
      tenantSpa = tenantRepo.create({
        name: 'Demo Salón & Spa',
        referral_code: 'demo-servicios',
        status: TenantStatus.ACTIVE,
        plan_type: TenantPlanType.PIONEER,
        base_price: 25.00,
        isActive: true,
      });
      tenantSpa = await tenantRepo.save(tenantSpa);
    }
    await linkPromoterAccess(tenantSpa.id);

    // Settings para Spa
    let spaSettings = await settingsRepo.findOne({ where: { tenantId: tenantSpa.id } });
    if (!spaSettings) {
      spaSettings = settingsRepo.create({
        id: randomUUID(),
        tenantId: tenantSpa.id,
      });
    }
    Object.assign(spaSettings, {
      featureCustomerSchedules: true,
      featureRecipes: true,
      featureBuySell: false,
      featureProduction: false,
      featureShowCatalog: true,
      exchangeRateBs: 45.0,
      themePrimaryColor: '#db2777', // Rosa fucsia elegante
      themeHeaderColor: '#fdf2f8',
      bookingRequireService: true,
      bookingAllowStaffSelection: true,
      slotInterval: 30,
      businessHours: {
        '1': { isOpen: true, startTime: '09:00', endTime: '18:00' },
        '2': { isOpen: true, startTime: '09:00', endTime: '18:00' },
        '3': { isOpen: true, startTime: '09:00', endTime: '18:00' },
        '4': { isOpen: true, startTime: '09:00', endTime: '18:00' },
        '5': { isOpen: true, startTime: '09:00', endTime: '19:00' },
        '6': { isOpen: true, startTime: '09:00', endTime: '19:00' },
        '0': { isOpen: false, startTime: '09:00', endTime: '14:00' }
      }
    });
    await settingsRepo.save(spaSettings);

    // Servicios de Spa
    const spaServicesData = [
      {
        name: 'Limpieza Facial Profunda',
        salePrice: 25.00,
        cost: 5.00,
        estimatedCost: 5.00,
        durationMinutes: 45,
        category: 'Faciales',
        is_service: true,
        images: ['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&auto=format&fit=crop&q=80']
      },
      {
        name: 'Manicura Semipermanente',
        salePrice: 15.00,
        cost: 3.00,
        estimatedCost: 3.00,
        durationMinutes: 60,
        category: 'Uñas',
        is_service: true,
        images: ['https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&auto=format&fit=crop&q=80']
      },
      {
        name: 'Masaje Relajante Antiestrés',
        salePrice: 30.00,
        cost: 4.00,
        estimatedCost: 4.00,
        durationMinutes: 45,
        category: 'Masajes',
        is_service: true,
        images: ['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&auto=format&fit=crop&q=80']
      }
    ];

    const savedSpaServices: Product[] = [];
    for (const s of spaServicesData) {
      let prod = await productRepo.findOne({
        where: { tenantId: tenantSpa.id, name: s.name }
      });
      if (!prod) {
        prod = productRepo.create({ ...s, tenantId: tenantSpa.id, stock: 0, stockQuantity: 0, physicalStock: 0 });
      } else {
        Object.assign(prod, s);
      }
      savedSpaServices.push(await productRepo.save(prod));
    }

    // Citas para hoy
    const todayStr = new Date().toISOString().split('T')[0];
    const existingReservations = await reservationRepo.find({
      where: { tenantId: tenantSpa.id, date: todayStr }
    });

    if (existingReservations.length === 0) {
      const appointmentsData = [
        {
          customerName: 'Valentina Gómez',
          customerPhone: '0414-1234567',
          identification: 'V-26123456',
          date: todayStr,
          time: '10:00',
          serviceId: savedSpaServices[0]?.id,
          serviceName: savedSpaServices[0]?.name,
          status: ReservationStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          totalAmount: 25.00,
          abonosTotal: 25.00,
          notes: 'Cliente puntual. Tratamiento hidratante.',
          tenantId: tenantSpa.id
        },
        {
          customerName: 'Mariana Pérez',
          customerPhone: '0412-7654321',
          identification: 'V-24987654',
          date: todayStr,
          time: '14:00',
          serviceId: savedSpaServices[1]?.id,
          serviceName: savedSpaServices[1]?.name,
          status: ReservationStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PENDING,
          totalAmount: 15.00,
          abonosTotal: 0,
          notes: 'Tono nude con acabado brillo.',
          tenantId: tenantSpa.id
        },
        {
          customerName: 'Camila Rodríguez',
          customerPhone: '0424-9876543',
          identification: 'V-28345678',
          date: todayStr,
          time: '16:30',
          serviceId: savedSpaServices[2]?.id,
          serviceName: savedSpaServices[2]?.name,
          status: ReservationStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          totalAmount: 30.00,
          abonosTotal: 0,
          notes: 'Primera sesión de masaje descontracturante.',
          tenantId: tenantSpa.id
        }
      ];

      for (const apt of appointmentsData) {
        await reservationRepo.save(reservationRepo.create(apt));
      }
      console.log('   ✅ 3 citas agendadas para hoy en Salón & Spa');
    }

    // ==========================================
    // 3. ESPACIO 2: DEMO TIENDA & BODEGÓN
    // ==========================================
    console.log('🛍️ Configurando Espacio 2: Demo Tienda & Bodegón (demo-retail)...');
    let tenantRetail = await tenantRepo.findOne({
      where: [{ referral_code: 'demo-retail' }, { name: 'Demo Tienda & Bodegón' }]
    });

    if (!tenantRetail) {
      tenantRetail = tenantRepo.create({
        name: 'Demo Tienda & Bodegón',
        referral_code: 'demo-retail',
        status: TenantStatus.ACTIVE,
        plan_type: TenantPlanType.PIONEER,
        base_price: 25.00,
        isActive: true,
      });
      tenantRetail = await tenantRepo.save(tenantRetail);
    }
    await linkPromoterAccess(tenantRetail.id);

    // Settings para Retail
    let retailSettings = await settingsRepo.findOne({ where: { tenantId: tenantRetail.id } });
    if (!retailSettings) {
      retailSettings = settingsRepo.create({
        id: randomUUID(),
        tenantId: tenantRetail.id,
      });
    }
    Object.assign(retailSettings, {
      featureBuySell: true,
      featureCustomerSchedules: false,
      featureRecipes: false,
      featureProduction: false,
      featureShowCatalog: true,
      exchangeRateBs: 45.0,
      themePrimaryColor: '#2563eb', // Azul comercial moderno
      themeHeaderColor: '#eff6ff',
      acceptCashUsd: true,
      acceptPagoMovil: true,
      acceptCardPos: true
    });
    await settingsRepo.save(retailSettings);

    // Productos de Reventa directa con costo y stock
    const retailProductsData = [
      {
        name: 'Vestido Casual Estampado',
        salePrice: 18.00,
        cost: 8.00,
        estimatedCost: 8.00,
        stock: 12,
        stockQuantity: 12,
        physicalStock: 12,
        category: 'Ropa Dama',
        is_service: false,
        images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&auto=format&fit=crop&q=80']
      },
      {
        name: 'Pantalón Jean Clásico',
        salePrice: 22.00,
        cost: 10.00,
        estimatedCost: 10.00,
        stock: 15,
        stockQuantity: 15,
        physicalStock: 15,
        category: 'Ropa Dama',
        is_service: false,
        images: ['https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80']
      },
      {
        name: 'Nutella Avellanas 350g',
        salePrice: 6.00,
        cost: 3.50,
        estimatedCost: 3.50,
        stock: 20,
        stockQuantity: 20,
        physicalStock: 20,
        category: 'Bodegón Dulces',
        is_service: false,
        images: ['https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600&auto=format&fit=crop&q=80']
      },
      {
        name: 'Café Gourmet Tostado 500g',
        salePrice: 5.00,
        cost: 2.50,
        estimatedCost: 2.50,
        stock: 10,
        stockQuantity: 10,
        physicalStock: 10,
        category: 'Bodegón Café',
        is_service: false,
        images: ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80']
      }
    ];

    for (const rp of retailProductsData) {
      let prod = await productRepo.findOne({
        where: { tenantId: tenantRetail.id, name: rp.name }
      });
      if (!prod) {
        prod = productRepo.create({ ...rp, tenantId: tenantRetail.id });
      } else {
        Object.assign(prod, rp);
      }
      await productRepo.save(prod);
    }
    console.log('   ✅ 4 productos de reventa con stock y costo cargados');

    // ==========================================
    // 4. ESPACIO 3: DEMO CAFÉ & RESTAURANTE
    // ==========================================
    console.log('🍔 Configurando Espacio 3: Demo Café & Restaurante (demo-gastronomia)...');
    let tenantGastro = await tenantRepo.findOne({
      where: [{ referral_code: 'demo-gastronomia' }, { name: 'Demo Café & Restaurante' }]
    });

    if (!tenantGastro) {
      tenantGastro = tenantRepo.create({
        name: 'Demo Café & Restaurante',
        referral_code: 'demo-gastronomia',
        status: TenantStatus.ACTIVE,
        plan_type: TenantPlanType.PIONEER,
        base_price: 25.00,
        isActive: true,
      });
      tenantGastro = await tenantRepo.save(tenantGastro);
    }
    await linkPromoterAccess(tenantGastro.id);

    // Settings para Gastro
    let gastroSettings = await settingsRepo.findOne({ where: { tenantId: tenantGastro.id } });
    if (!gastroSettings) {
      gastroSettings = settingsRepo.create({
        id: randomUUID(),
        tenantId: tenantGastro.id,
      });
    }
    Object.assign(gastroSettings, {
      featureRecipes: true,
      featureProduction: true,
      featureBuySell: true,
      featureCustomerSchedules: false,
      featureShowCatalog: true,
      exchangeRateBs: 45.0,
      themePrimaryColor: '#ea580c', // Naranja apetitoso
      themeHeaderColor: '#fff7ed',
      acceptCashUsd: true,
      acceptPagoMovil: true
    });
    await settingsRepo.save(gastroSettings);

    // Delivery Zone
    let zoneCentro = await deliveryZoneRepo.findOne({
      where: { tenantId: tenantGastro.id, name: 'Zona Centro' }
    });
    if (!zoneCentro) {
      zoneCentro = deliveryZoneRepo.create({
        name: 'Zona Centro',
        feePrice: 2.00,
        tenantId: tenantGastro.id
      });
      zoneCentro = await deliveryZoneRepo.save(zoneCentro);
    }

    // Insumos (Materia Prima)
    const rawMaterialsData = [
      { name: 'Pan de Hamburguesa Brioche', unit: 'und', costPerUnit: 0.50, stockQuantity: 50, minStockAlert: 10 },
      { name: 'Carne Molida Premium', unit: 'kg', costPerUnit: 4.00, stockQuantity: 15, minStockAlert: 3 },
      { name: 'Queso Cheddar Rebanado', unit: 'kg', costPerUnit: 5.00, stockQuantity: 8, minStockAlert: 2 },
      { name: 'Papas para Freír', unit: 'kg', costPerUnit: 1.00, stockQuantity: 30, minStockAlert: 5 },
      { name: 'Refresco Familiar 1.5L', unit: 'und', costPerUnit: 1.50, stockQuantity: 40, minStockAlert: 8 },
    ];

    const savedMaterials: Record<string, RawMaterial> = {};
    for (const rm of rawMaterialsData) {
      let mat = await rawMaterialRepo.findOne({
        where: { tenantId: tenantGastro.id, name: rm.name }
      });
      if (!mat) {
        mat = rawMaterialRepo.create({ ...rm, tenantId: tenantGastro.id });
      } else {
        Object.assign(mat, rm);
      }
      savedMaterials[rm.name] = await rawMaterialRepo.save(mat);
    }

    // Producto 1: Hamburguesa Clásica con Receta
    let burger = await productRepo.findOne({
      where: { tenantId: tenantGastro.id, name: 'Hamburguesa Clásica' }
    });
    if (!burger) {
      burger = productRepo.create({
        name: 'Hamburguesa Clásica',
        salePrice: 8.00,
        cost: 2.30,
        estimatedCost: 2.30,
        stock: 0,
        stockQuantity: 0,
        physicalStock: 0,
        category: 'Hamburguesas',
        is_service: false,
        images: ['https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80'],
        tenantId: tenantGastro.id
      });
      burger = await productRepo.save(burger);

      // Receta
      const recipeItems = [
        recipeRepo.create({ productId: burger.id, rawMaterialId: savedMaterials['Pan de Hamburguesa Brioche'].id, quantity: 1 }),
        recipeRepo.create({ productId: burger.id, rawMaterialId: savedMaterials['Carne Molida Premium'].id, quantity: 0.20 }),
        recipeRepo.create({ productId: burger.id, rawMaterialId: savedMaterials['Queso Cheddar Rebanado'].id, quantity: 0.05 }),
      ];
      await recipeRepo.save(recipeItems);
    }

    // Producto 2: Combo Familiar
    let combo = await productRepo.findOne({
      where: { tenantId: tenantGastro.id, name: 'Combo Familiar Burgers' }
    });
    if (!combo) {
      combo = productRepo.create({
        name: 'Combo Familiar Burgers',
        salePrice: 22.00,
        cost: 7.50,
        estimatedCost: 7.50,
        stock: 10,
        stockQuantity: 10,
        physicalStock: 10,
        isCombo: true,
        category: 'Combos',
        is_service: false,
        images: ['https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&auto=format&fit=crop&q=80'],
        tenantId: tenantGastro.id
      });
      combo = await productRepo.save(combo);
    }

    // Comandas demo en Gastronomía
    const existingOrders = await orderRepo.find({ where: { tenantId: tenantGastro.id } });
    if (existingOrders.length === 0) {
      // 1. Pedido en Preparación - Mesa 4
      const orderMesa = orderRepo.create({
        tenantId: tenantGastro.id,
        customerName: 'Mesa 4 (Salón)',
        customerPhone: '0414-0000000',
        tableNumber: '4',
        status: OrderStatus.PREPARING,
        paymentStatus: PaymentStatus.PENDING,
        deliveryMethod: DeliveryMethod.IN_STORE,
        totalAmount: 16.00,
        totalCost: 4.60,
        netProfit: 11.40,
        exchangeRate: 45.0,
        notes: 'Una sin cebolla. Marchando a cocina.'
      });
      const savedOrderMesa = await orderRepo.save(orderMesa);
      await orderItemRepo.save(orderItemRepo.create({
        orderId: savedOrderMesa.id,
        productId: burger.id,
        productName: burger.name,
        quantity: 2,
        unitPrice: 8.00,
        unitCost: 2.30,
        subtotal: 16.00
      }));

      // 2. Pedido Delivery con Zona Asignada
      const orderDelivery = orderRepo.create({
        tenantId: tenantGastro.id,
        customerName: 'Andrés Silva',
        customerPhone: '0416-5551234',
        customerAddress: 'Av. Bolívar, Edf. Rosal, Apto 4B',
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: 'PAGO_MOVIL',
        deliveryMethod: DeliveryMethod.DELIVERY,
        deliveryZoneId: zoneCentro.id,
        deliveryFee: 2.00,
        totalAmount: 24.00,
        totalCost: 7.50,
        netProfit: 14.50,
        exchangeRate: 45.0,
        pagoMovilRef: 'REF-89472',
        notes: 'Llamar al llegar a la reja principal.'
      });
      const savedOrderDelivery = await orderRepo.save(orderDelivery);
      await orderItemRepo.save(orderItemRepo.create({
        orderId: savedOrderDelivery.id,
        productId: combo.id,
        productName: combo.name,
        quantity: 1,
        unitPrice: 22.00,
        unitCost: 7.50,
        subtotal: 22.00
      }));

      console.log('   ✅ 2 comandas demo (Mesa 4 y Delivery) creadas');
    }

    console.log('\n==================================================');
    console.log('🎉 SEED COMPLETADO EXITOSAMENTE');
    console.log('Credenciales del Promotor:');
    console.log('👉 Correo:   promotor@flujofino.com');
    console.log('👉 Usuario:  promotor');
    console.log('👉 Clave:    demo123');
    console.log('\nEspacios configurados:');
    console.log('1. Demo Salón & Spa       (demo-servicios)');
    console.log('2. Demo Tienda & Bodegón  (demo-retail)');
    console.log('3. Demo Café & Restaurante(demo-gastronomia)');
    console.log('==================================================\n');

  } catch (error) {
    console.error('❌ Error durante la ejecución del seed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

runSeed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
