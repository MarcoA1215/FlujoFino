import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

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
} from '@finowork/shared-types';

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
    synchronize: true,
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
    const passwordHash = await bcrypt.hash('123456', 10);
    const tasaActual = 855.66;

    // Helper para crear o actualizar usuario
    async function getOrCreateUser(email: string, username: string, role: UserRole) {
      let user = await userRepo.findOne({ where: [{ email }, { username }] });
      if (!user) {
        user = userRepo.create({
          email,
          username,
          passwordHash,
          role,
        });
        user = await userRepo.save(user);
        console.log(` ✅ Creado usuario: ${email}`);
      } else {
        user.passwordHash = passwordHash;
        user.role = role;
        user = await userRepo.save(user);
      }
      return user;
    }

    // Helper para vincular acceso
    async function linkAccess(userId: string, tenantId: string, role: UserRole, jobTitle: string) {
      let access = await accessRepo.findOne({ where: { userId, tenantId } });
      if (!access) {
        access = accessRepo.create({
          userId,
          tenantId,
          role,
          isActive: true,
          status: 'ACCEPTED',
          jobTitle,
        });
      } else {
        access.role = role;
        access.isActive = true;
        access.status = 'ACCEPTED';
      }
      return await accessRepo.save(access);
    }

    // Usuario Promotor Universal
    const promoter = await getOrCreateUser('promotor@flujofino.com', 'promotor', UserRole.ADMIN);
    // Usuario Repartidor Demo
    const deliveryUser = await getOrCreateUser('delivery@flujofino.com', 'delivery_carlos', UserRole.DELIVERY);

    // =========================================================================
    // 1. ESPACIO 1: BOUTIQUE MODA URBANA (100% Retail Puro / Ropa)
    // =========================================================================
    console.log('🛍️ Configurando Espacio 1: Boutique Moda Urbana (demo-retail)...');
    let tenantRetail = await tenantRepo.findOne({ where: [{ referral_code: 'demo-retail' }, { name: 'Boutique Moda Urbana' }] });
    if (!tenantRetail) {
      tenantRetail = await tenantRepo.save(tenantRepo.create({
        name: 'Boutique Moda Urbana',
        referral_code: 'demo-retail',
        status: TenantStatus.ACTIVE,
        plan_type: TenantPlanType.PIONEER,
        base_price: 25.00,
        isActive: true,
      }));
    }
    await linkAccess(promoter.id, tenantRetail.id, UserRole.ADMIN, 'Gerente de Boutique');

    let settingsRetail = await settingsRepo.findOne({ where: { tenantId: tenantRetail.id } });
    if (!settingsRetail) settingsRetail = settingsRepo.create({ id: randomUUID(), tenantId: tenantRetail.id });
    Object.assign(settingsRetail, {
      featureBuySell: true,
      featureCustomerSchedules: false,
      featureRecipes: false,
      featureProduction: false,
      featureShowCatalog: true,
      exchangeRateBs: tasaActual,
      themePrimaryColor: '#2563eb',
      themeHeaderColor: '#eff6ff',
      acceptCashUsd: true,
      acceptPagoMovil: true,
    });
    await settingsRepo.save(settingsRetail);

    const retailProducts = [
      { name: 'Pantalón Jean Clásico', salePrice: 22.0, cost: 10.0, estimatedCost: 10.0, stock: 15, stockQuantity: 15, physicalStock: 15, category: 'Ropa Dama', is_service: false, images: ['https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80'] },
      { name: 'Camisa Oversize Algodón', salePrice: 14.0, cost: 6.5, estimatedCost: 6.5, stock: 25, stockQuantity: 25, physicalStock: 25, category: 'Ropa Dama', is_service: false, images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&auto=format&fit=crop&q=80'] },
      { name: 'Vestido Casual Floral', salePrice: 28.0, cost: 12.0, estimatedCost: 12.0, stock: 10, stockQuantity: 10, physicalStock: 10, category: 'Vestidos', is_service: false, images: ['https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&auto=format&fit=crop&q=80'] },
    ];
    for (const rp of retailProducts) {
      let prod = await productRepo.findOne({ where: { tenantId: tenantRetail.id, name: rp.name } });
      if (!prod) prod = productRepo.create({ ...rp, tenantId: tenantRetail.id });
      else Object.assign(prod, rp);
      await productRepo.save(prod);
    }

    // =========================================================================
    // 2. ESPACIO 2: PANADERÍA LA ESPIGA (100% Producción / Lotes / Fórmulas)
    // =========================================================================
    console.log('🥖 Configurando Espacio 2: Panadería La Espiga (demo-panaderia)...');
    let tenantPan = await tenantRepo.findOne({ where: [{ referral_code: 'demo-panaderia' }, { name: 'Panadería La Espiga' }] });
    if (!tenantPan) {
      tenantPan = await tenantRepo.save(tenantRepo.create({
        name: 'Panadería La Espiga',
        referral_code: 'demo-panaderia',
        status: TenantStatus.ACTIVE,
        plan_type: TenantPlanType.PIONEER,
        base_price: 25.00,
        isActive: true,
      }));
    }
    await linkAccess(promoter.id, tenantPan.id, UserRole.ADMIN, 'Maestro Panadero');

    let settingsPan = await settingsRepo.findOne({ where: { tenantId: tenantPan.id } });
    if (!settingsPan) settingsPan = settingsRepo.create({ id: randomUUID(), tenantId: tenantPan.id });
    Object.assign(settingsPan, {
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

    // Insumos panadería
    const panInsumos = [
      { name: 'Harina de Trigo Panadera', unit: 'kg', costPerUnit: 1.2, stockQuantity: 60, minStockAlert: 10 },
      { name: 'Azúcar Refinada', unit: 'kg', costPerUnit: 1.1, stockQuantity: 30, minStockAlert: 5 },
      { name: 'Mantequilla Industrial', unit: 'kg', costPerUnit: 3.5, stockQuantity: 15, minStockAlert: 3 },
    ];
    const savedInsumosPan: Record<string, RawMaterial> = {};
    for (const raw of panInsumos) {
      let r = await rawMaterialRepo.findOne({ where: { tenantId: tenantPan.id, name: raw.name } });
      if (!r) r = rawMaterialRepo.create({ ...raw, tenantId: tenantPan.id });
      else Object.assign(r, raw);
      savedInsumosPan[raw.name] = await rawMaterialRepo.save(r);
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
        tenantId: tenantPan.id,
        images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80'],
      }));
      await recipeRepo.save([
        recipeRepo.create({ productId: panCampesino.id, rawMaterialId: savedInsumosPan['Harina de Trigo Panadera'].id, quantity: 0.35 }),
        recipeRepo.create({ productId: panCampesino.id, rawMaterialId: savedInsumosPan['Azúcar Refinada'].id, quantity: 0.05 }),
      ]);
    }

    // =========================================================================
    // 3. ESPACIO 3: BARBERÍA & SPA ÉLITE (100% Citas con Agenda y Especialistas)
    // =========================================================================
    console.log('💇 Configurando Espacio 3: Barbería & Spa Élite (demo-servicios)...');
    let tenantSpa = await tenantRepo.findOne({ where: [{ referral_code: 'demo-servicios' }, { name: 'Barbería & Spa Élite' }] });
    if (!tenantSpa) {
      tenantSpa = await tenantRepo.save(tenantRepo.create({
        name: 'Barbería & Spa Élite',
        referral_code: 'demo-servicios',
        status: TenantStatus.ACTIVE,
        plan_type: TenantPlanType.PIONEER,
        base_price: 25.00,
        isActive: true,
      }));
    }
    await linkAccess(promoter.id, tenantSpa.id, UserRole.ADMIN, 'Administrador Spa');

    let settingsSpa = await settingsRepo.findOne({ where: { tenantId: tenantSpa.id } });
    if (!settingsSpa) settingsSpa = settingsRepo.create({ id: randomUUID(), tenantId: tenantSpa.id });
    Object.assign(settingsSpa, {
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

    const spaServices = [
      { name: 'Corte Degradado & Barba', salePrice: 10.0, cost: 1.0, estimatedCost: 1.0, durationMinutes: 45, category: 'Barbería', is_service: true, images: ['https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&auto=format&fit=crop&q=80'] },
      { name: 'Limpieza Facial Profunda', salePrice: 18.0, cost: 3.0, estimatedCost: 3.0, durationMinutes: 60, category: 'Faciales', is_service: true, images: ['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&auto=format&fit=crop&q=80'] },
    ];
    for (const s of spaServices) {
      let prod = await productRepo.findOne({ where: { tenantId: tenantSpa.id, name: s.name } });
      if (!prod) prod = productRepo.create({ ...s, tenantId: tenantSpa.id, stock: 0, stockQuantity: 0, physicalStock: 0 });
      else Object.assign(prod, s);
      await productRepo.save(prod);
    }

    // =========================================================================
    // 4. ESPACIO 4: AUTO LAVADO EXPRESS (Servicios Rápidos sin Citas + Traslados)
    // =========================================================================
    console.log('🚗 Configurando Espacio 4: Auto Lavado Express (demo-autolavado)...');
    let tenantLavado = await tenantRepo.findOne({ where: [{ referral_code: 'demo-autolavado' }, { name: 'Auto Lavado Express' }] });
    if (!tenantLavado) {
      tenantLavado = await tenantRepo.save(tenantRepo.create({
        name: 'Auto Lavado Express',
        referral_code: 'demo-autolavado',
        status: TenantStatus.ACTIVE,
        plan_type: TenantPlanType.PIONEER,
        base_price: 25.00,
        isActive: true,
      }));
    }
    await linkAccess(promoter.id, tenantLavado.id, UserRole.ADMIN, 'Encargado de Patio');

    let settingsLavado = await settingsRepo.findOne({ where: { tenantId: tenantLavado.id } });
    if (!settingsLavado) settingsLavado = settingsRepo.create({ id: randomUUID(), tenantId: tenantLavado.id });
    Object.assign(settingsLavado, {
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

    const lavadoServices = [
      { name: 'Lavado Completo Camioneta', salePrice: 12.0, cost: 2.0, estimatedCost: 2.0, category: 'Lavado', is_service: true, images: ['https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=600&auto=format&fit=crop&q=80'] },
      { name: 'Lavado Sencillo Sedan', salePrice: 7.0, cost: 1.2, estimatedCost: 1.2, category: 'Lavado', is_service: true, images: ['https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=600&auto=format&fit=crop&q=80'] },
    ];
    for (const ls of lavadoServices) {
      let prod = await productRepo.findOne({ where: { tenantId: tenantLavado.id, name: ls.name } });
      if (!prod) prod = productRepo.create({ ...ls, tenantId: tenantLavado.id, stock: 0, stockQuantity: 0, physicalStock: 0 });
      else Object.assign(prod, ls);
      await productRepo.save(prod);
    }

    // =========================================================================
    // 5. ESPACIO 5: BURGER HOUSE GOURMET (Híbrido: Cocina/Lotes + Delivery)
    // =========================================================================
    console.log('🍔 Configurando Espacio 5: Burger House Gourmet (demo-gastronomia)...');
    let tenantBurger = await tenantRepo.findOne({ where: [{ referral_code: 'demo-gastronomia' }, { name: 'Burger House Gourmet' }] });
    if (!tenantBurger) {
      tenantBurger = await tenantRepo.save(tenantRepo.create({
        name: 'Burger House Gourmet',
        referral_code: 'demo-gastronomia',
        status: TenantStatus.ACTIVE,
        plan_type: TenantPlanType.PIONEER,
        base_price: 25.00,
        isActive: true,
      }));
    }
    await linkAccess(promoter.id, tenantBurger.id, UserRole.ADMIN, 'Gerente Gastronómico');
    await linkAccess(deliveryUser.id, tenantBurger.id, UserRole.DELIVERY, 'Repartidor Oficial');

    let settingsBurger = await settingsRepo.findOne({ where: { tenantId: tenantBurger.id } });
    if (!settingsBurger) settingsBurger = settingsRepo.create({ id: randomUUID(), tenantId: tenantBurger.id });
    Object.assign(settingsBurger, {
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

    // Zonas Delivery
    let zoneCentro = await deliveryZoneRepo.findOne({ where: { tenantId: tenantBurger.id, name: 'Zona Centro' } });
    if (!zoneCentro) {
      zoneCentro = await deliveryZoneRepo.save(deliveryZoneRepo.create({ name: 'Zona Centro', feePrice: 1.5, tenantId: tenantBurger.id }));
    }
    let zoneVaryna = await deliveryZoneRepo.findOne({ where: { tenantId: tenantBurger.id, name: 'Ciudad Varyná' } });
    if (!zoneVaryna) {
      zoneVaryna = await deliveryZoneRepo.save(deliveryZoneRepo.create({ name: 'Ciudad Varyná', feePrice: 2.0, tenantId: tenantBurger.id }));
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
      if (!r) r = rawMaterialRepo.create({ ...raw, tenantId: tenantBurger.id });
      else Object.assign(r, raw);
      savedInsumosBurger[raw.name] = await rawMaterialRepo.save(r);
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
        images: ['https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80'],
        tenantId: tenantBurger.id,
      }));
      await recipeRepo.save([
        recipeRepo.create({ productId: burger.id, rawMaterialId: savedInsumosBurger['Pan de Hamburguesa Brioche'].id, quantity: 1 }),
        recipeRepo.create({ productId: burger.id, rawMaterialId: savedInsumosBurger['Carne Molida Premium'].id, quantity: 0.25 }),
        recipeRepo.create({ productId: burger.id, rawMaterialId: savedInsumosBurger['Queso Cheddar Rebanado'].id, quantity: 0.05 }),
      ]);
    }

    // =========================================================================
    // 6. ESPACIO 6: CENTRO ESTÉTICO GLOW (Híbrido: Citas de Spa + Venta Retail)
    // =========================================================================
    console.log('✨ Configurando Espacio 6: Centro Estético Glow (demo-estetica)...');
    let tenantGlow = await tenantRepo.findOne({ where: [{ referral_code: 'demo-estetica' }, { name: 'Centro Estético Glow' }] });
    if (!tenantGlow) {
      tenantGlow = await tenantRepo.save(tenantRepo.create({
        name: 'Centro Estético Glow',
        referral_code: 'demo-estetica',
        status: TenantStatus.ACTIVE,
        plan_type: TenantPlanType.PIONEER,
        base_price: 25.00,
        isActive: true,
      }));
    }
    await linkAccess(promoter.id, tenantGlow.id, UserRole.ADMIN, 'Directora Estética');

    let settingsGlow = await settingsRepo.findOne({ where: { tenantId: tenantGlow.id } });
    if (!settingsGlow) settingsGlow = settingsRepo.create({ id: randomUUID(), tenantId: tenantGlow.id });
    Object.assign(settingsGlow, {
      featureBuySell: true,        // Venta de cremas en mostrador
      featureCustomerSchedules: true, // Citas con agenda
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

    const glowCatalog = [
      { name: 'Masaje Descontracturante 50min', salePrice: 25.0, cost: 4.0, estimatedCost: 4.0, durationMinutes: 50, category: 'Masajes', is_service: true, images: ['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&auto=format&fit=crop&q=80'] },
      { name: 'Sérum Facial Vitamina C (30ml)', salePrice: 18.0, cost: 8.0, estimatedCost: 8.0, stock: 12, stockQuantity: 12, physicalStock: 12, category: 'Cosméticos', is_service: false, images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80'] },
      { name: 'Protector Solar Toque Seco FPS 50', salePrice: 22.0, cost: 10.0, estimatedCost: 10.0, stock: 10, stockQuantity: 10, physicalStock: 10, category: 'Cosméticos', is_service: false, images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80'] },
    ];
    for (const g of glowCatalog) {
      let prod = await productRepo.findOne({ where: { tenantId: tenantGlow.id, name: g.name } });
      if (!prod) prod = productRepo.create({ ...g, tenantId: tenantGlow.id });
      else Object.assign(prod, g);
      await productRepo.save(prod);
    }

    console.log('\n==================================================');
    console.log('🎉 SEED COMPLETADO EXITOSAMENTE');
    console.log('👤 Usuario Promotor (Admin de todas las tiendas):');
    console.log('👉 Correo:   promotor@flujofino.com');
    console.log('👉 Clave:    123456');
    console.log('🛵 Usuario Delivery (Para probar repartos):');
    console.log('👉 Correo:   delivery@flujofino.com');
    console.log('👉 Clave:    123456');
    console.log('\n🏪 Tiendas configuradas:');
    console.log('1. Boutique Moda Urbana       (demo-retail)      -> Retail puro');
    console.log('2. Panadería La Espiga        (demo-panaderia)   -> Producción pura');
    console.log('3. Barbería & Spa Élite       (demo-servicios)   -> Citas pura');
    console.log('4. Auto Lavado Express        (demo-autolavado)  -> Servicios sin cita');
    console.log('5. Burger House Gourmet       (demo-gastronomia) -> Híbrido: Cocina + Delivery');
    console.log('6. Centro Estético Glow       (demo-estetica)    -> Híbrido: Citas + Retail');
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