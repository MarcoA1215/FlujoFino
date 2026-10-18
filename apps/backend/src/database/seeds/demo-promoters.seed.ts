import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { randomUUID } from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
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
import { Promoter } from '../../entities/promoter.entity';
import { PromoterCommission } from '../../entities/promoter-commission.entity';
import { SalaryAdvance } from '../../entities/salary-advance.entity';
import { CashExchange } from '../../entities/cash-exchange.entity';
import { Investment } from '../../entities/investment.entity';
import { PushSubscription } from '../../entities/push-subscription.entity';
import { ProductVariant } from '../../entities/product-variant.entity';

// Enums
import { 
  UserRole, 
  TenantStatus, 
  TenantPlanType, 
  OrderStatus, 
  PaymentStatus, 
  ReservationStatus, 
  DeliveryMethod 
} from '@finowork/shared-types';

async function runSeed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL no está definida en las variables de entorno.');
    process.exit(1);
  }

  const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');

  // SEGURIDAD PRD: synchronize SIEMPRE en false para garantizar que JAMÁS altere,
  // reinicie ni borre esquemas o datos existentes en la base de datos.
  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    entities: [
      User, Tenant, UserTenantAccess, Settings, Product, ProductVariant, RawMaterial, RecipeItem,
      ComboItem, Order, OrderItem, Reservation, DeliveryZone, ProductionBatch,
      StockMovement, WorkSchedule, OperatingExpense, AccessRequest, Feedback,
      OrderItemMedia, Customer, SaaSPaymentReport, PlatformConfig,
      Promoter, PromoterCommission, SalaryAdvance, CashExchange, Investment, PushSubscription
    ],
    synchronize: false,
  });

  console.log('🔄 Conectando a la base de datos (synchronize: false)...');
  try {
    await dataSource.initialize();
    console.log('✅ Conexión establecida de forma segura (modo no destructivo).');
  } catch (initErr) {
    console.error('❌ Error fatal al inicializar TypeORM DataSource:', initErr);
    process.exit(1);
  }

  // Asegurar que columnas opcionales requeridas por las entidades existan sin tocar esquemas ni borrar datos
  const safeColumns = [
    `ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "companyLogoUrl" character varying;`,
    `ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "logoShape" character varying DEFAULT 'ROUNDED';`,
    `ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "logoFit" character varying DEFAULT 'contain';`,
    `ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "bookingAllowStaffSelection" boolean DEFAULT true;`,
    `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "duration_minutes" integer;`,
    `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "durationMinutes" integer;`,
    `ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "roles" text DEFAULT '';`,
    `ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "job_title" character varying;`,
  ];
  for (const sql of safeColumns) {
    try {
      await dataSource.query(sql);
    } catch {
      // Ignorar si la tabla aún no existe o ya posee la columna
    }
  }

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
  const promoterRepo = dataSource.getRepository(Promoter);
  const customerRepo = dataSource.getRepository(Customer);
  const expenseRepo = dataSource.getRepository(OperatingExpense);
  const variantRepo = dataSource.getRepository(ProductVariant);

  try {
    const passwordHash = await bcrypt.hash('123456', 10);
    const superPasswordHash = await bcrypt.hash('SuperAdmin2026!', 10);
    const tasaActual = 855.66;

    // Helper no destructivo: Si el usuario existe, se respeta intacto sin alterar claves ni datos previos
    async function getOrCreateUser(email: string, username: string, role: UserRole, name?: string, customHash?: string) {
      const normalizedEmail = email.toLowerCase().trim();
      let user = await userRepo.findOne({ 
        where: [
          { email: normalizedEmail }, 
          { username: username.trim() }
        ] 
      });

      if (!user) {
        user = userRepo.create({
          email: normalizedEmail,
          username: username.trim(),
          name: name || username,
          passwordHash: customHash || passwordHash,
          role,
          isEmailVerified: true,
        });
        user = await userRepo.save(user);
        console.log(` ✅ [NUEVO] Usuario creado: ${normalizedEmail} (rol: ${role})`);
      } else {
        console.log(` ℹ️ [EXISTENTE] Usuario conservado sin modificaciones: ${user.email}`);
      }
      return user;
    }

    // Helper no destructivo para vincular acceso
    async function linkAccess(userId: string, tenantId: string, role: UserRole, jobTitle: string) {
      let access = await accessRepo.findOne({ where: { userId, tenantId } });
      if (!access) {
        access = accessRepo.create({
          userId,
          tenantId,
          role,
          roles: [role],
          isActive: true,
          status: 'ACCEPTED',
          jobTitle,
        });
        access = await accessRepo.save(access);
        console.log(`   ✅ [NUEVO] Acceso vinculado: usuario ${userId} -> negocio ${tenantId} (${jobTitle})`);
      }
      return access;
    }

    // 0. Cuentas de Acceso Globales
    console.log('\n👥 Verificando cuentas maestras del sistema...');
    const superAdmin = await getOrCreateUser('superadmin@finowork.com', 'superadmin', UserRole.SUPERADMIN, 'Super Administrador', superPasswordHash);
    const promoter = await getOrCreateUser('promotor@finowork.com', 'promotor', UserRole.ADMIN, 'Promotor Oficial FinoWork');
    const demoAdmin = await getOrCreateUser('admin@finowork.com', 'admin', UserRole.ADMIN, 'Administrador Demo');
    const deliveryUser = await getOrCreateUser('delivery@finowork.com', 'delivery_carlos', UserRole.DELIVERY, 'Carlos Delivery');
    const kitchenUser = await getOrCreateUser('cocina@finowork.com', 'cocina_chef', UserRole.KITCHEN, 'Chef Ramón Cocina');
    const cashierUser = await getOrCreateUser('cajero@finowork.com', 'cajero_maria', UserRole.POS, 'María Cajera');
    const specialistUser = await getOrCreateUser('especialista@finowork.com', 'especialista_ana', UserRole.OPERATIVO, 'Dra. Ana Especialista');

    // Registrar perfil de promotor si no existe
    let promoterProfile = await promoterRepo.findOne({ where: { userId: promoter.id } });
    if (!promoterProfile) {
      promoterProfile = promoterRepo.create({
        userId: promoter.id,
        code: 'PROMO-FINO',
        pagoMovilPhone: '04141234567',
        pagoMovilCedula: 'V-12345678',
        pagoMovilBank: '0102 - Banco de Venezuela',
        binancePayId: '123456789',
        isActive: true,
      });
      promoterProfile = await promoterRepo.save(promoterProfile);
      console.log(' ✅ [NUEVO] Perfil de Promotor registrado con código: PROMO-FINO');
    }

    // =========================================================================
    // 1. ESPACIO 1: BOUTIQUE MODA URBANA (Retail Puro / Ropa)
    // =========================================================================
    console.log('\n🛍️ Verificando Espacio 1: Boutique Moda Urbana (demo-retail)...');
    let tenantRetail = await tenantRepo.findOne({ where: [{ referral_code: 'demo-retail' }, { name: 'Boutique Moda Urbana' }] });
    if (!tenantRetail) {
      tenantRetail = await tenantRepo.save(tenantRepo.create({
        name: 'Boutique Moda Urbana',
        referral_code: 'demo-retail',
        status: TenantStatus.ACTIVE,
        plan_type: TenantPlanType.PIONEER,
        base_price: 25.00,
        isActive: true,
        promoterId: promoterProfile.id,
      }));
      console.log(' ✅ [NUEVO] Espacio creado: Boutique Moda Urbana');
    }
    await linkAccess(promoter.id, tenantRetail.id, UserRole.ADMIN, 'Gerente de Boutique');
    await linkAccess(demoAdmin.id, tenantRetail.id, UserRole.ADMIN, 'Administrador');
    await linkAccess(cashierUser.id, tenantRetail.id, UserRole.POS, 'Cajera Principal');

    let settingsRetail = await settingsRepo.findOne({ where: { tenantId: tenantRetail.id } });
    if (!settingsRetail) {
      settingsRetail = settingsRepo.create({
        id: randomUUID(),
        tenantId: tenantRetail.id,
        featureBuySell: true,
        featureCustomerSchedules: false,
        featureRecipes: false,
        featureProduction: false,
        featureShowCatalog: true,
        exchangeRateBs: tasaActual,
        enableCopCurrency: true,
        exchangeRateCop: 4000.0,
        exchangeRateCopMode: 'MANUAL',
        manualExchangeRateCop: 4000.0,
        companyCopBank: 'Bancolombia / Nequi',
        companyCopAccountNumber: '3129876543',
        companyCopAccountHolder: 'Boutique Moda Urbana SAS',
        acceptCashCop: true,
        acceptTransferCop: true,
        allowPartialPayments: true,
        abonoDefaultDueDays: 7,
        themePrimaryColor: '#2563eb',
        themeHeaderColor: '#eff6ff',
        acceptCashUsd: true,
        acceptPagoMovil: true,
      });
      await settingsRepo.save(settingsRetail);
      console.log('   ✅ Configuración de Boutique creada con Tri-Moneda COP');
    } else {
      settingsRetail.enableCopCurrency = true;
      settingsRetail.exchangeRateCop = 4000.0;
      settingsRetail.companyCopBank = 'Bancolombia / Nequi';
      settingsRetail.companyCopAccountNumber = '3129876543';
      settingsRetail.companyCopAccountHolder = 'Boutique Moda Urbana SAS';
      settingsRetail.acceptCashCop = true;
      settingsRetail.acceptTransferCop = true;
      await settingsRepo.save(settingsRetail);
    }

    // Fondo Inicial de Apertura en Caja (Gaveta Física)
    const existingRetailFund = await expenseRepo.findOne({ where: { tenantId: tenantRetail.id, category: 'FONDO_CAJA' } });
    if (!existingRetailFund) {
      await expenseRepo.save(expenseRepo.create({
        tenantId: tenantRetail.id,
        description: 'Base de Apertura en Gaveta (Efectivo)',
        amount: 80.00,
        category: 'FONDO_CAJA',
        paymentMethod: 'CASH_USD',
      }));
      console.log('   ✅ [NUEVO] Fondo base de gaveta registrado: $80.00 USD');
    }

    const retailProducts = [
      { name: 'Pantalón Jean Clásico', salePrice: 22.0, cost: 10.0, estimatedCost: 10.0, stock: 15, stockQuantity: 15, physicalStock: 15, category: 'Ropa Dama', is_service: false, product_type: 'REVENTA', images: ['https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80'] },
      { name: 'Vestido Casual Floral', salePrice: 28.0, cost: 12.0, estimatedCost: 12.0, stock: 10, stockQuantity: 10, physicalStock: 10, category: 'Vestidos', is_service: false, product_type: 'REVENTA', images: ['https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&auto=format&fit=crop&q=80'] },
    ];
    for (const rp of retailProducts) {
      let prod = await productRepo.findOne({ where: { tenantId: tenantRetail.id, name: rp.name } });
      if (!prod) {
        prod = productRepo.create({ ...rp, tenantId: tenantRetail.id });
        await productRepo.save(prod);
        console.log(`   ✅ [NUEVO] Producto creado: ${rp.name}`);
      }
    }

    // Producto Estrella con Sub-divisiones / Variantes (Tallas y Colores con stock propio)
    let camisaVariants = await productRepo.findOne({ where: { tenantId: tenantRetail.id, name: 'Camisa Oversize Algodón' } });
    if (!camisaVariants) {
      camisaVariants = await productRepo.save(productRepo.create({
        name: 'Camisa Oversize Algodón',
        salePrice: 15.0,
        cost: 7.0,
        estimatedCost: 7.0,
        stock: 35,
        stockQuantity: 35,
        physicalStock: 35,
        category: 'Ropa Dama',
        is_service: false,
        product_type: 'REVENTA',
        hasVariants: true,
        tenantId: tenantRetail.id,
        images: [
          'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80'
        ],
      }));

      await variantRepo.save([
        variantRepo.create({
          productId: camisaVariants.id,
          tenantId: tenantRetail.id,
          name: 'Blanco / Talla S',
          sku: 'CAM-OVR-WHT-S',
          stockQuantity: 8,
          salePrice: 15.0,
          cost: 7.0,
          images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80'],
          attributes: { color: 'Blanco', talla: 'S' },
        }),
        variantRepo.create({
          productId: camisaVariants.id,
          tenantId: tenantRetail.id,
          name: 'Blanco / Talla M',
          sku: 'CAM-OVR-WHT-M',
          stockQuantity: 12,
          salePrice: 15.0,
          cost: 7.0,
          images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80'],
          attributes: { color: 'Blanco', talla: 'M' },
        }),
        variantRepo.create({
          productId: camisaVariants.id,
          tenantId: tenantRetail.id,
          name: 'Negro / Talla M',
          sku: 'CAM-OVR-BLK-M',
          stockQuantity: 10,
          salePrice: 16.0,
          cost: 7.5,
          images: ['https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&auto=format&fit=crop&q=80'],
          attributes: { color: 'Negro', talla: 'M' },
        }),
        variantRepo.create({
          productId: camisaVariants.id,
          tenantId: tenantRetail.id,
          name: 'Negro / Talla L',
          sku: 'CAM-OVR-BLK-L',
          stockQuantity: 5,
          salePrice: 16.0,
          cost: 7.5,
          images: ['https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&auto=format&fit=crop&q=80'],
          attributes: { color: 'Negro', talla: 'L' },
        }),
      ]);
      console.log('   ✅ [NUEVO] Camisa Oversize creada con 4 variantes de Talla/Color y stock independiente');
    }

    // Cliente demo para Boutique
    let clientBoutique = await customerRepo.findOne({ where: { tenantId: tenantRetail.id, phone: '0414-1112233' } });
    if (!clientBoutique) {
      clientBoutique = await customerRepo.save(customerRepo.create({
        tenantId: tenantRetail.id,
        name: 'Elena Fuentes',
        phone: '0414-1112233',
        identification: 'V-18456123',
        totalVisits: 3,
        notes: 'Clienta frecuente con línea de crédito abierta.',
      }));
      console.log('   ✅ [NUEVO] Cliente demo creado: Elena Fuentes');
    }

    // Comandas demo en Boutique
    const existingRetailOrders = await orderRepo.count({ where: { tenantId: tenantRetail.id } });
    if (existingRetailOrders === 0) {
      const sampleVestido = await productRepo.findOne({ where: { tenantId: tenantRetail.id, name: 'Vestido Casual Floral' } });
      const samplePantalon = await productRepo.findOne({ where: { tenantId: tenantRetail.id, name: 'Pantalón Jean Clásico' } });

      // 1. Venta pagada en Efectivo USD ($28 USD) atendida por María Cajera
      if (sampleVestido) {
        const order1 = orderRepo.create({
          tenantId: tenantRetail.id,
          customerName: clientBoutique.name,
          customerPhone: clientBoutique.phone,
          customerId: clientBoutique.id,
          employeeId: cashierUser.id,
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.PAID,
          paymentMethod: 'USD',
          usdReceived: 30.00,
          changeAmount: 2.00,
          changeMethod: 'CASH_USD',
          deliveryMethod: DeliveryMethod.IN_STORE,
          totalAmount: 28.00,
          totalCost: 12.00,
          netProfit: 16.00,
          exchangeRate: tasaActual,
          notes: 'Venta de mostrador. Pagó con billete de $30, vuelto $2 en gaveta.',
        });
        const savedOrder1 = await orderRepo.save(order1);
        await orderItemRepo.save(orderItemRepo.create({
          orderId: savedOrder1.id,
          productId: sampleVestido.id,
          productName: sampleVestido.name,
          quantity: 1,
          unitPrice: 28.00,
          unitCost: 12.00,
          subtotal: 28.00,
        }));
      }

      // 2. Venta pagada en Pesos Colombianos (COP) ($15 USD = $60.000 COP)
      if (camisaVariants) {
        const orderCop = orderRepo.create({
          tenantId: tenantRetail.id,
          customerName: 'Santiago Gómez',
          customerPhone: '0414-9988776',
          employeeId: cashierUser.id,
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.PAID,
          paymentMethod: 'CASH_COP',
          amountCop: 60000,
          exchangeRateCop: 4000,
          copReceived: 100000,
          changeAmountCop: 40000,
          changeMethod: 'CASH_COP',
          deliveryMethod: DeliveryMethod.IN_STORE,
          totalAmount: 15.00,
          totalCost: 7.00,
          netProfit: 8.00,
          exchangeRate: tasaActual,
          notes: 'Pago en Efectivo Pesos COP: $60.000. Billete de $100k, vuelto $40k COP.',
        });
        const savedOrderCop = await orderRepo.save(orderCop);
        await orderItemRepo.save(orderItemRepo.create({
          orderId: savedOrderCop.id,
          productId: camisaVariants.id,
          productName: 'Camisa Oversize Algodón (Blanco / Talla M)',
          quantity: 1,
          unitPrice: 15.00,
          unitCost: 7.00,
          subtotal: 15.00,
        }));
      }

      // 3. Cuenta abierta con Abono Parcial y Fecha de Vencimiento ($44 USD total, abonó $20 USD, restan $24)
      if (samplePantalon) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 5); // Vence en 5 días (activa alerta)

        const creditOrder = orderRepo.create({
          tenantId: tenantRetail.id,
          customerName: clientBoutique.name,
          customerPhone: clientBoutique.phone,
          customerId: clientBoutique.id,
          employeeId: cashierUser.id,
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.PARTIAL,
          paymentMethod: 'PAGO_MOVIL',
          deliveryMethod: DeliveryMethod.IN_STORE,
          totalAmount: 44.00,
          totalCost: 20.00,
          netProfit: 24.00,
          exchangeRate: tasaActual,
          abonosTotal: 20.00,
          nextAbonoDueDate: dueDate,
          abonosHistory: [
            {
              amount: 20.00,
              date: new Date().toISOString(),
              method: 'PAGO_MOVIL',
              ref: 'PM-99238',
              notes: 'Abono inicial 45% al retirar',
            }
          ],
          notes: 'Prendas entregadas bajo compromiso de abono. Próximo abono acordado a 5 días.',
        });
        const savedCreditOrder = await orderRepo.save(creditOrder);
        await orderItemRepo.save(orderItemRepo.create({
          orderId: savedCreditOrder.id,
          productId: samplePantalon.id,
          productName: samplePantalon.name,
          quantity: 2,
          unitPrice: 22.00,
          unitCost: 10.00,
          subtotal: 44.00,
        }));
      }

      console.log('   ✅ [NUEVO] 3 ventas demo registradas: Efectivo USD, Efectivo COP y Cuenta abierta con Abono');
    }

    // =========================================================================
    // 2. ESPACIO 2: PANADERÍA LA ESPIGA (Producción / Lotes / Fórmulas)
    // =========================================================================
    console.log('\n🥖 Verificando Espacio 2: Panadería La Espiga (demo-panaderia)...');
    let tenantPan = await tenantRepo.findOne({ where: [{ referral_code: 'demo-panaderia' }, { name: 'Panadería La Espiga' }] });
    if (!tenantPan) {
      tenantPan = await tenantRepo.save(tenantRepo.create({
        name: 'Panadería La Espiga',
        referral_code: 'demo-panaderia',
        status: TenantStatus.ACTIVE,
        plan_type: TenantPlanType.PIONEER,
        base_price: 25.00,
        isActive: true,
        promoterId: promoterProfile.id,
      }));
      console.log(' ✅ [NUEVO] Espacio creado: Panadería La Espiga');
    }
    await linkAccess(promoter.id, tenantPan.id, UserRole.ADMIN, 'Maestro Panadero');
    await linkAccess(demoAdmin.id, tenantPan.id, UserRole.ADMIN, 'Administrador');

    let settingsPan = await settingsRepo.findOne({ where: { tenantId: tenantPan.id } });
    if (!settingsPan) {
      settingsPan = settingsRepo.create({
        id: randomUUID(),
        tenantId: tenantPan.id,
        featureBuySell: false,
        featureCustomerSchedules: false,
        featureRecipes: true,
        featureProduction: true,
        featureShowCatalog: true,
        exchangeRateBs: tasaActual,
        themePrimaryColor: '#d97706',
        themeHeaderColor: '#fffbeb',
        acceptCashUsd: true,
        acceptPagoMovil: true,
      });
      await settingsRepo.save(settingsPan);
      console.log('   ✅ Configuración de Panadería creada');
    }

    // Insumos panadería
    const panInsumos = [
      { name: 'Harina de Trigo Panadera', unit: 'kg', costPerUnit: 1.2, stockQuantity: 60, minStockAlert: 10 },
      { name: 'Azúcar Refinada', unit: 'kg', costPerUnit: 1.1, stockQuantity: 30, minStockAlert: 5 },
      { name: 'Mantequilla Industrial', unit: 'kg', costPerUnit: 3.5, stockQuantity: 15, minStockAlert: 3 },
    ];
    const savedInsumosPan: Record<string, RawMaterial> = {};
    for (const raw of panInsumos) {
      let r = await rawMaterialRepo.findOne({ where: { tenantId: tenantPan.id, name: raw.name } });
      if (!r) {
        r = rawMaterialRepo.create({ ...raw, tenantId: tenantPan.id });
        r = await rawMaterialRepo.save(r);
        console.log(`   ✅ [NUEVO] Insumo creado: ${raw.name}`);
      }
      savedInsumosPan[raw.name] = r;
    }

    // Pan Campesino con Receta
    let panCampesino = await productRepo.findOne({ where: { tenantId: tenantPan.id, name: 'Pan Campesino Tradicional' } });
    if (!panCampesino) {
      panCampesino = await productRepo.save(productRepo.create({
        name: 'Pan Campesino Tradicional',
        salePrice: 1.5,
        cost: 0.6,
        estimatedCost: 0.6,
        stock: 15,
        stockQuantity: 15,
        physicalStock: 15,
        category: 'Panadería',
        is_service: false,
        product_type: 'FORMULA',
        tenantId: tenantPan.id,
        images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80'],
      }));
      await recipeRepo.save([
        recipeRepo.create({ productId: panCampesino.id, rawMaterialId: savedInsumosPan['Harina de Trigo Panadera'].id, quantity: 0.35 }),
        recipeRepo.create({ productId: panCampesino.id, rawMaterialId: savedInsumosPan['Azúcar Refinada'].id, quantity: 0.05 }),
      ]);
      console.log('   ✅ [NUEVO] Receta creada: Pan Campesino Tradicional');
    }

    // =========================================================================
    // 3. ESPACIO 3: BARBERÍA & SPA ÉLITE (Citas con Agenda y Especialistas)
    // =========================================================================
    console.log('\n💇 Verificando Espacio 3: Barbería & Spa Élite (demo-servicios)...');
    let tenantSpa = await tenantRepo.findOne({ where: [{ referral_code: 'demo-servicios' }, { name: 'Barbería & Spa Élite' }] });
    if (!tenantSpa) {
      tenantSpa = await tenantRepo.save(tenantRepo.create({
        name: 'Barbería & Spa Élite',
        referral_code: 'demo-servicios',
        status: TenantStatus.ACTIVE,
        plan_type: TenantPlanType.PIONEER,
        base_price: 25.00,
        isActive: true,
        promoterId: promoterProfile.id,
      }));
      console.log(' ✅ [NUEVO] Espacio creado: Barbería & Spa Élite');
    }
    await linkAccess(promoter.id, tenantSpa.id, UserRole.ADMIN, 'Administrador Spa');
    await linkAccess(demoAdmin.id, tenantSpa.id, UserRole.ADMIN, 'Administrador');

    let settingsSpa = await settingsRepo.findOne({ where: { tenantId: tenantSpa.id } });
    if (!settingsSpa) {
      settingsSpa = settingsRepo.create({
        id: randomUUID(),
        tenantId: tenantSpa.id,
        featureCustomerSchedules: true,
        featureRecipes: false,
        featureBuySell: false,
        featureProduction: false,
        featureShowCatalog: true,
        exchangeRateBs: tasaActual,
        themePrimaryColor: '#db2777',
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
          '0': { isOpen: false, startTime: '09:00', endTime: '14:00' },
        },
      });
      await settingsRepo.save(settingsSpa);
      console.log('   ✅ Configuración de Barbería y Agenda creada');
    }

    const spaServices = [
      { name: 'Corte Degradado & Barba', salePrice: 10.0, cost: 1.0, estimatedCost: 1.0, durationMinutes: 45, category: 'Barbería', is_service: true, product_type: 'SERVICIO', images: ['https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&auto=format&fit=crop&q=80'] },
      { name: 'Limpieza Facial Profunda', salePrice: 18.0, cost: 3.0, estimatedCost: 3.0, durationMinutes: 60, category: 'Faciales', is_service: true, product_type: 'SERVICIO', images: ['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&auto=format&fit=crop&q=80'] },
    ];
    for (const s of spaServices) {
      let prod = await productRepo.findOne({ where: { tenantId: tenantSpa.id, name: s.name } });
      if (!prod) {
        prod = productRepo.create({ ...s, tenantId: tenantSpa.id, stock: 0, stockQuantity: 0, physicalStock: 0 });
        await productRepo.save(prod);
        console.log(`   ✅ [NUEVO] Servicio creado: ${s.name}`);
      }
    }

    // Cliente y Cita Demo para Barbería
    let clientSpa = await customerRepo.findOne({ where: { tenantId: tenantSpa.id, phone: '0412-3334455' } });
    if (!clientSpa) {
      clientSpa = await customerRepo.save(customerRepo.create({
        tenantId: tenantSpa.id,
        name: 'Alejandro Morales',
        phone: '0412-3334455',
        identification: 'V-20123987',
        totalVisits: 1,
        notes: 'Prefiere corte con tijera arriba y fade bajo.',
      }));
      console.log('   ✅ [NUEVO] Cliente demo creado: Alejandro Morales');
    }

    const existingSpaReservations = await reservationRepo.count({ where: { tenantId: tenantSpa.id } });
    if (existingSpaReservations === 0) {
      const corteService = await productRepo.findOne({ where: { tenantId: tenantSpa.id, name: 'Corte Degradado & Barba' } });
      const todayIso = new Date().toISOString().split('T')[0];
      await reservationRepo.save(reservationRepo.create({
        tenantId: tenantSpa.id,
        customerName: clientSpa.name,
        customerPhone: clientSpa.phone,
        customerId: clientSpa.id,
        date: todayIso,
        time: '14:30',
        durationMinutes: 45,
        serviceId: corteService?.id,
        serviceName: corteService?.name || 'Corte Degradado & Barba',
        employeeId: promoter.id,
        employeeName: 'Promotor FinoWork',
        status: ReservationStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        totalAmount: 10.00,
        notes: 'Cita reservada desde catálogo online.',
      }));
      console.log('   ✅ [NUEVO] Cita demo agendada en Barbería');
    }

    // =========================================================================
    // 4. ESPACIO 4: AUTO LAVADO EXPRESS (Servicios Rápidos sin Citas)
    // =========================================================================
    console.log('\n🚗 Verificando Espacio 4: Auto Lavado Express (demo-autolavado)...');
    let tenantLavado = await tenantRepo.findOne({ where: [{ referral_code: 'demo-autolavado' }, { name: 'Auto Lavado Express' }] });
    if (!tenantLavado) {
      tenantLavado = await tenantRepo.save(tenantRepo.create({
        name: 'Auto Lavado Express',
        referral_code: 'demo-autolavado',
        status: TenantStatus.ACTIVE,
        plan_type: TenantPlanType.PIONEER,
        base_price: 25.00,
        isActive: true,
        promoterId: promoterProfile.id,
      }));
      console.log(' ✅ [NUEVO] Espacio creado: Auto Lavado Express');
    }
    await linkAccess(promoter.id, tenantLavado.id, UserRole.ADMIN, 'Encargado de Patio');
    await linkAccess(demoAdmin.id, tenantLavado.id, UserRole.ADMIN, 'Administrador');

    let settingsLavado = await settingsRepo.findOne({ where: { tenantId: tenantLavado.id } });
    if (!settingsLavado) {
      settingsLavado = settingsRepo.create({
        id: randomUUID(),
        tenantId: tenantLavado.id,
        featureCustomerSchedules: false,
        featureRecipes: false,
        featureBuySell: false,
        featureProduction: false,
        featureShowCatalog: true,
        exchangeRateBs: tasaActual,
        themePrimaryColor: '#0284c7',
        themeHeaderColor: '#f0f9ff',
        acceptCashUsd: true,
        acceptPagoMovil: true,
      });
      await settingsRepo.save(settingsLavado);
      console.log('   ✅ Configuración de Auto Lavado creada');
    }

    const lavadoServices = [
      { name: 'Lavado Completo Camioneta', salePrice: 12.0, cost: 2.0, estimatedCost: 2.0, category: 'Lavado', is_service: true, product_type: 'SERVICIO', images: ['https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=600&auto=format&fit=crop&q=80'] },
      { name: 'Lavado Sencillo Sedan', salePrice: 7.0, cost: 1.2, estimatedCost: 1.2, category: 'Lavado', is_service: true, product_type: 'SERVICIO', images: ['https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=600&auto=format&fit=crop&q=80'] },
    ];
    for (const ls of lavadoServices) {
      let prod = await productRepo.findOne({ where: { tenantId: tenantLavado.id, name: ls.name } });
      if (!prod) {
        prod = productRepo.create({ ...ls, tenantId: tenantLavado.id, stock: 0, stockQuantity: 0, physicalStock: 0 });
        await productRepo.save(prod);
        console.log(`   ✅ [NUEVO] Servicio creado: ${ls.name}`);
      }
    }

    // =========================================================================
    // 5. ESPACIO 5: BURGER HOUSE GOURMET (Híbrido: Cocina/Lotes + Delivery)
    // =========================================================================
    console.log('\n🍔 Verificando Espacio 5: Burger House Gourmet (demo-gastronomia)...');
    let tenantBurger = await tenantRepo.findOne({ where: [{ referral_code: 'demo-gastronomia' }, { name: 'Burger House Gourmet' }] });
    if (!tenantBurger) {
      tenantBurger = await tenantRepo.save(tenantRepo.create({
        name: 'Burger House Gourmet',
        referral_code: 'demo-gastronomia',
        status: TenantStatus.ACTIVE,
        plan_type: TenantPlanType.PIONEER,
        base_price: 25.00,
        isActive: true,
        promoterId: promoterProfile.id,
      }));
      console.log(' ✅ [NUEVO] Espacio creado: Burger House Gourmet');
    }
    await linkAccess(promoter.id, tenantBurger.id, UserRole.ADMIN, 'Gerente Gastronómico');
    await linkAccess(deliveryUser.id, tenantBurger.id, UserRole.DELIVERY, 'Repartidor Oficial');
    await linkAccess(kitchenUser.id, tenantBurger.id, UserRole.KITCHEN, 'Jefe de Cocina');
    await linkAccess(demoAdmin.id, tenantBurger.id, UserRole.ADMIN, 'Administrador');

    let settingsBurger = await settingsRepo.findOne({ where: { tenantId: tenantBurger.id } });
    if (!settingsBurger) {
      settingsBurger = settingsRepo.create({
        id: randomUUID(),
        tenantId: tenantBurger.id,
        featureRecipes: true,
        featureProduction: true,
        featureBuySell: true,
        featureCustomerSchedules: false,
        featureShowCatalog: true,
        exchangeRateBs: tasaActual,
        themePrimaryColor: '#ea580c',
        themeHeaderColor: '#fff7ed',
        acceptCashUsd: true,
        acceptPagoMovil: true,
      });
      await settingsRepo.save(settingsBurger);
      console.log('   ✅ Configuración de Burger House creada');
    }

    // Fondo Base de Gaveta en Burger House
    const existingBurgerFund = await expenseRepo.findOne({ where: { tenantId: tenantBurger.id, category: 'FONDO_CAJA' } });
    if (!existingBurgerFund) {
      await expenseRepo.save(expenseRepo.create({
        tenantId: tenantBurger.id,
        description: 'Fondo Inicial de Caja / Gaveta',
        amount: 50.00,
        category: 'FONDO_CAJA',
        paymentMethod: 'CASH_USD',
      }));
    }

    // Zonas Delivery
    let zoneCentro = await deliveryZoneRepo.findOne({ where: { tenantId: tenantBurger.id, name: 'Zona Centro' } });
    if (!zoneCentro) {
      zoneCentro = await deliveryZoneRepo.save(deliveryZoneRepo.create({ name: 'Zona Centro', feePrice: 1.5, tenantId: tenantBurger.id }));
      console.log('   ✅ [NUEVO] Zona Delivery: Zona Centro');
    }
    let zoneVaryna = await deliveryZoneRepo.findOne({ where: { tenantId: tenantBurger.id, name: 'Ciudad Varyná' } });
    if (!zoneVaryna) {
      zoneVaryna = await deliveryZoneRepo.save(deliveryZoneRepo.create({ name: 'Ciudad Varyná', feePrice: 2.0, tenantId: tenantBurger.id }));
      console.log('   ✅ [NUEVO] Zona Delivery: Ciudad Varyná');
    }

    // Insumos Burger
    const burgerInsumos = [
      { name: 'Pan de Hamburguesa Brioche', unit: 'und', costPerUnit: 0.5, stockQuantity: 50, minStockAlert: 10 },
      { name: 'Carne Molida Premium', unit: 'kg', costPerUnit: 4.0, stockQuantity: 20, minStockAlert: 3 },
      { name: 'Queso Cheddar Rebanado', unit: 'kg', costPerUnit: 5.0, stockQuantity: 10, minStockAlert: 2 },
    ];
    const savedInsumosBurger: Record<string, RawMaterial> = {};
    for (const raw of burgerInsumos) {
      let r = await rawMaterialRepo.findOne({ where: { tenantId: tenantBurger.id, name: raw.name } });
      if (!r) {
        r = rawMaterialRepo.create({ ...raw, tenantId: tenantBurger.id });
        r = await rawMaterialRepo.save(r);
        console.log(`   ✅ [NUEVO] Insumo creado: ${raw.name}`);
      }
      savedInsumosBurger[raw.name] = r;
    }

    // Hamburguesa con Receta
    let burger = await productRepo.findOne({ where: { tenantId: tenantBurger.id, name: 'Hamburguesa Doble Queso' } });
    if (!burger) {
      burger = await productRepo.save(productRepo.create({
        name: 'Hamburguesa Doble Queso',
        salePrice: 7.5,
        cost: 2.5,
        estimatedCost: 2.5,
        stock: 10,
        stockQuantity: 10,
        physicalStock: 10,
        category: 'Hamburguesas',
        is_service: false,
        product_type: 'FORMULA',
        images: ['https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80'],
        tenantId: tenantBurger.id,
      }));
      await recipeRepo.save([
        recipeRepo.create({ productId: burger.id, rawMaterialId: savedInsumosBurger['Pan de Hamburguesa Brioche'].id, quantity: 1 }),
        recipeRepo.create({ productId: burger.id, rawMaterialId: savedInsumosBurger['Carne Molida Premium'].id, quantity: 0.25 }),
        recipeRepo.create({ productId: burger.id, rawMaterialId: savedInsumosBurger['Queso Cheddar Rebanado'].id, quantity: 0.05 }),
      ]);
      console.log('   ✅ [NUEVO] Receta creada: Hamburguesa Doble Queso');
    }

    // Comandas demo en Gastronomía (1 Salón para Cocina, 1 Delivery en Tránsito para Carlos, 1 Entregada pagada)
    const existingOrders = await orderRepo.count({ where: { tenantId: tenantBurger.id } });
    if (existingOrders === 0) {
      // 1. Pedido en Preparación - Mesa 4 (Para vista de Chef/Cocina)
      const orderMesa = orderRepo.create({
        tenantId: tenantBurger.id,
        customerName: 'Mesa 4 (Salón)',
        customerPhone: '0414-0000000',
        tableNumber: '4',
        status: OrderStatus.PREPARING,
        paymentStatus: PaymentStatus.PENDING,
        deliveryMethod: DeliveryMethod.IN_STORE,
        totalAmount: 15.00,
        totalCost: 5.00,
        netProfit: 10.00,
        exchangeRate: tasaActual,
        notes: 'Una sin cebolla. Marchando a cocina.',
      });
      const savedOrderMesa = await orderRepo.save(orderMesa);
      await orderItemRepo.save(orderItemRepo.create({
        orderId: savedOrderMesa.id,
        productId: burger.id,
        productName: burger.name,
        quantity: 2,
        unitPrice: 7.50,
        unitCost: 2.50,
        subtotal: 15.00,
      }));

      // 2. Pedido Delivery con Repartidor Asignado (Para vista de Panel Repartidor Carlos)
      const orderDelivery = orderRepo.create({
        tenantId: tenantBurger.id,
        customerName: 'Andrés Silva',
        customerPhone: '0416-5551234',
        customerAddress: 'Av. Bolívar, Edf. Rosal, Apto 4B',
        status: OrderStatus.IN_TRANSIT,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: 'PAGO_MOVIL',
        deliveryMethod: DeliveryMethod.DELIVERY,
        deliveryZoneId: zoneCentro?.id,
        deliveryFee: 1.50,
        deliveryUserId: deliveryUser.id,
        driverId: deliveryUser.id,
        totalAmount: 9.00,
        totalCost: 2.50,
        netProfit: 6.50,
        exchangeRate: tasaActual,
        pagoMovilRef: 'REF-89472',
        notes: 'Llamar al llegar a la reja principal.',
      });
      const savedOrderDelivery = await orderRepo.save(orderDelivery);
      await orderItemRepo.save(orderItemRepo.create({
        orderId: savedOrderDelivery.id,
        productId: burger.id,
        productName: burger.name,
        quantity: 1,
        unitPrice: 7.50,
        unitCost: 2.50,
        subtotal: 7.50,
      }));

      // 3. Venta anterior ya entregada y cobrada (Aporta ingresos a tesorería)
      const orderPaid = orderRepo.create({
        tenantId: tenantBurger.id,
        customerName: 'Karla Rivas',
        customerPhone: '0412-8877665',
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: 'USD',
        deliveryMethod: DeliveryMethod.IN_STORE,
        totalAmount: 22.50,
        totalCost: 7.50,
        netProfit: 15.00,
        usdReceived: 25.00,
        changeAmount: 2.50,
        changeMethod: 'CASH_USD',
        exchangeRate: tasaActual,
        notes: '3 combos entregados.',
      });
      const savedOrderPaid = await orderRepo.save(orderPaid);
      await orderItemRepo.save(orderItemRepo.create({
        orderId: savedOrderPaid.id,
        productId: burger.id,
        productName: burger.name,
        quantity: 3,
        unitPrice: 7.50,
        unitCost: 2.50,
        subtotal: 22.50,
      }));

      console.log('   ✅ [NUEVO] 3 comandas demo creadas (Salón para cocina, Reparto en tránsito y Venta cobrada)');
    }

    // =========================================================================
    // 6. ESPACIO 6: CENTRO ESTÉTICO GLOW (Híbrido: Citas de Spa + Venta Retail)
    // =========================================================================
    console.log('\n✨ Verificando Espacio 6: Centro Estético Glow (demo-estetica)...');
    let tenantGlow = await tenantRepo.findOne({ where: [{ referral_code: 'demo-estetica' }, { name: 'Centro Estético Glow' }] });
    if (!tenantGlow) {
      tenantGlow = await tenantRepo.save(tenantRepo.create({
        name: 'Centro Estético Glow',
        referral_code: 'demo-estetica',
        status: TenantStatus.ACTIVE,
        plan_type: TenantPlanType.PIONEER,
        base_price: 25.00,
        isActive: true,
        promoterId: promoterProfile.id,
      }));
      console.log(' ✅ [NUEVO] Espacio creado: Centro Estético Glow');
    }
    await linkAccess(promoter.id, tenantGlow.id, UserRole.ADMIN, 'Directora Estética');
    await linkAccess(demoAdmin.id, tenantGlow.id, UserRole.ADMIN, 'Administrador');
    await linkAccess(specialistUser.id, tenantGlow.id, UserRole.OPERATIVO, 'Dra. Estética & Cosmiatra');

    let settingsGlow = await settingsRepo.findOne({ where: { tenantId: tenantGlow.id } });
    if (!settingsGlow) {
      settingsGlow = settingsRepo.create({
        id: randomUUID(),
        tenantId: tenantGlow.id,
        featureBuySell: true,
        featureCustomerSchedules: true,
        featureRecipes: false,
        featureProduction: false,
        featureShowCatalog: true,
        exchangeRateBs: tasaActual,
        themePrimaryColor: '#059669',
        themeHeaderColor: '#ecfdf5',
        acceptCashUsd: true,
        acceptPagoMovil: true,
      });
      await settingsRepo.save(settingsGlow);
      console.log('   ✅ Configuración de Centro Glow creada');
    }

    // Base de Apertura en Gaveta para Centro Glow
    const existingGlowFund = await expenseRepo.findOne({ where: { tenantId: tenantGlow.id, category: 'FONDO_CAJA' } });
    if (!existingGlowFund) {
      await expenseRepo.save(expenseRepo.create({
        tenantId: tenantGlow.id,
        description: 'Base de Apertura en Gaveta',
        amount: 60.00,
        category: 'FONDO_CAJA',
        paymentMethod: 'CASH_USD',
      }));
      console.log('   ✅ [NUEVO] Fondo base de gaveta en Centro Glow: $60.00 USD');
    }

    const glowCatalog = [
      { name: 'Masaje Descontracturante 50min', salePrice: 25.0, cost: 4.0, estimatedCost: 4.0, durationMinutes: 50, category: 'Masajes', is_service: true, product_type: 'SERVICIO', images: ['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&auto=format&fit=crop&q=80'] },
      { name: 'Sérum Facial Vitamina C (30ml)', salePrice: 18.0, cost: 8.0, estimatedCost: 8.0, stock: 12, stockQuantity: 12, physicalStock: 12, category: 'Cosméticos', is_service: false, product_type: 'REVENTA', images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80'] },
      { name: 'Protector Solar Toque Seco FPS 50', salePrice: 22.0, cost: 10.0, estimatedCost: 10.0, stock: 10, stockQuantity: 10, physicalStock: 10, category: 'Cosméticos', is_service: false, product_type: 'REVENTA', images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80'] },
    ];
    for (const g of glowCatalog) {
      let prod = await productRepo.findOne({ where: { tenantId: tenantGlow.id, name: g.name } });
      if (!prod) {
        prod = productRepo.create({ ...g, tenantId: tenantGlow.id });
        await productRepo.save(prod);
        console.log(`   ✅ [NUEVO] Producto creado: ${g.name}`);
      }
    }

    // Ventas e Ingresos reales en Centro Glow (para equilibrar y tener flujo positivo en bancos)
    const existingGlowOrders = await orderRepo.count({ where: { tenantId: tenantGlow.id } });
    if (existingGlowOrders === 0) {
      const serumProd = await productRepo.findOne({ where: { tenantId: tenantGlow.id, name: 'Sérum Facial Vitamina C (30ml)' } });
      const solarProd = await productRepo.findOne({ where: { tenantId: tenantGlow.id, name: 'Protector Solar Toque Seco FPS 50' } });

      // 1. Venta cobrada por Pago Móvil ($40 USD = Bs. a la tasa actual)
      const orderPagoMovil = orderRepo.create({
        tenantId: tenantGlow.id,
        customerName: 'Valeria Mendoza',
        customerPhone: '0424-5544332',
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: 'PAGO_MOVIL',
        amountBs: 40.00 * tasaActual,
        pagoMovilRef: 'PM-482019',
        pagoMovilBank: '0102 - Banco de Venezuela',
        deliveryMethod: DeliveryMethod.IN_STORE,
        totalAmount: 40.00,
        totalCost: 18.00,
        netProfit: 22.00,
        exchangeRate: tasaActual,
        notes: 'Venta de cosméticos con Pago Móvil confirmado en cuenta bancaria.',
      });
      const savedGlowOrder1 = await orderRepo.save(orderPagoMovil);
      if (serumProd && solarProd) {
        await orderItemRepo.save([
          orderItemRepo.create({
            orderId: savedGlowOrder1.id,
            productId: serumProd.id,
            productName: serumProd.name,
            quantity: 1,
            unitPrice: 18.00,
            unitCost: 8.00,
            subtotal: 18.00,
          }),
          orderItemRepo.create({
            orderId: savedGlowOrder1.id,
            productId: solarProd.id,
            productName: solarProd.name,
            quantity: 1,
            unitPrice: 22.00,
            unitCost: 10.00,
            subtotal: 22.00,
          })
        ]);
      }

      // 2. Venta cobrada en Efectivo USD ($25 USD)
      const orderCashUSD = orderRepo.create({
        tenantId: tenantGlow.id,
        customerName: 'Mariana Salas',
        customerPhone: '0414-7766554',
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: 'USD',
        usdReceived: 30.00,
        changeAmount: 5.00,
        changeMethod: 'CASH_USD',
        deliveryMethod: DeliveryMethod.IN_STORE,
        totalAmount: 25.00,
        totalCost: 4.00,
        netProfit: 21.00,
        exchangeRate: tasaActual,
        notes: 'Pago en efectivo de sesión de masaje.',
      });
      await orderRepo.save(orderCashUSD);

      console.log('   ✅ [NUEVO] 2 ventas cobradas registradas en Centro Glow (Pago Móvil y Efectivo)');
    }

    // Cita Agendada con la Dra. Ana Especialista
    const existingGlowCitas = await reservationRepo.count({ where: { tenantId: tenantGlow.id } });
    if (existingGlowCitas === 0) {
      const masajeServ = await productRepo.findOne({ where: { tenantId: tenantGlow.id, name: 'Masaje Descontracturante 50min' } });
      const todayIso = new Date().toISOString().split('T')[0];
      await reservationRepo.save(reservationRepo.create({
        tenantId: tenantGlow.id,
        customerName: 'Patricia Colmenares',
        customerPhone: '0412-9900112',
        date: todayIso,
        time: '16:00',
        durationMinutes: 50,
        serviceId: masajeServ?.id,
        serviceName: masajeServ?.name || 'Masaje Descontracturante 50min',
        employeeId: specialistUser.id,
        employeeName: specialistUser.name || 'Dra. Ana Especialista',
        status: ReservationStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        totalAmount: 25.00,
        notes: 'Paciente reservada con Dra. Ana.',
      }));
      console.log('   ✅ [NUEVO] Cita asignada a Dra. Ana Especialista en Centro Glow');
    }

    // Gasto operativo demo
    const existingExpenses = await expenseRepo.count({ where: { tenantId: tenantGlow.id, category: 'UTILITIES' } });
    if (existingExpenses === 0) {
      await expenseRepo.save(expenseRepo.create({
        tenantId: tenantGlow.id,
        description: 'Servicio de Internet Fibra Óptica',
        amount: 35.00,
        category: 'UTILITIES',
        paymentMethod: 'PAGO_MOVIL',
      }));
      console.log('   ✅ [NUEVO] Gasto operativo demo registrado en Centro Glow');
    }

    console.log('\n==================================================');
    console.log('🎉 SEED COMPLETADO EXITOSAMENTE (SIN TOCAR NI BORRAR DATOS PREVIOS)');
    console.log('==================================================');
    console.log('🛡️ SuperAdmin de Plataforma:');
    console.log('👉 Correo:   superadmin@finowork.com');
    console.log('👉 Clave:    SuperAdmin2026!');
    console.log('\n👤 Administrador General Demo:');
    console.log('👉 Correo:   admin@finowork.com');
    console.log('👉 Clave:    123456');
    console.log('\n💼 Usuario Promotor (Vinculado a todos los demos):');
    console.log('👉 Correo:   promotor@finowork.com');
    console.log('👉 Clave:    123456');
    console.log('👉 Código:   PROMO-FINO');
    console.log('\n🛵 Usuario Delivery (Para pruebas de reparto):');
    console.log('👉 Correo:   delivery@finowork.com');
    console.log('👉 Clave:    123456');
    console.log('\n👨‍🍳 Usuario Cocina / Comandas (Para vista de chef):');
    console.log('👉 Correo:   cocina@finowork.com');
    console.log('👉 Clave:    123456');
    console.log('\n💳 Usuario Cajero / POS (Para cobros y arqueos):');
    console.log('👉 Correo:   cajero@finowork.com');
    console.log('👉 Clave:    123456');
    console.log('\n✂️ Usuario Especialista (Para citas y agenda de spa/barbería):');
    console.log('👉 Correo:   especialista@finowork.com');
    console.log('👉 Clave:    123456');
    console.log('\n🏪 Tiendas / Negocios de prueba disponibles:');
    console.log('1. Boutique Moda Urbana       (demo-retail)      -> Tri-Moneda COP + Variantes + Crédito');
    console.log('2. Panadería La Espiga        (demo-panaderia)   -> Producción pura + Fórmulas');
    console.log('3. Barbería & Spa Élite       (demo-servicios)   -> Citas con agenda');
    console.log('4. Auto Lavado Express        (demo-autolavado)  -> Servicios sin cita');
    console.log('5. Burger House Gourmet       (demo-gastronomia) -> Híbrido: Cocina (comandas) + Delivery');
    console.log('6. Centro Estético Glow       (demo-estetica)    -> Híbrido: Citas con Dra. Ana + Retail');
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