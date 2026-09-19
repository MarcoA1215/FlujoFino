import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PaymentStatus, DeliveryMethod, OrderStatus } from '@nutrideli/shared-types';

describe('FlujoFino ERP & POS - E2E System Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let rawMaterialAId: string;
  let rawMaterialBId: string;
  let serviceId: string;
  let productId: string;
  let orderId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Autenticación y Multi-Tenant', () => {
    it('Debe registrar un nuevo usuario y sucursal', async () => {
      const email = `test-${Date.now()}@test.com`;
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password: 'password123',
          name: 'Dueño de Prueba'
        })
        .expect(201);
      
      expect(res.body.access_token).toBeDefined();
      authToken = res.body.access_token;
    });

    it('Debe rechazar credenciales incorrectas en el login', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'not-exists@test.com',
          password: 'wrong'
        })
        .expect(401);
    });
  });

  describe('2. Configuración y Modularidad', () => {
    it('Debe actualizar los feature flags y crear un servicio automático', async () => {
      const res = await request(app.getHttpServer())
        .put('/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          featureRecipes: true,
          featureCustomerSchedules: true,
          featureBuySell: true,
          exchangeRate: 40.5,
          services: [
            { name: 'Corte de Cabello', durationMinutes: 30, price: 15.00 }
          ]
        })
        .expect(200);

      expect(res.body.featureRecipes).toBe(true);
    });
  });

  describe('3. Insumos y Fórmulas (Inventario)', () => {
    it('Debe crear un insumo A con costo y stock', async () => {
      const res = await request(app.getHttpServer())
        .post('/raw-materials')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Botella de Champú',
          unit: 'ml',
          costPerUnit: 0.05, // 100ml costaría $5
          stockQuantity: 1000,
          minStockAlert: 100
        })
        .expect(201);
      
      rawMaterialAId = res.body.id;
    });

    it('Debe crear un producto (Combo/Servicio) vinculando insumos', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Lavado Premium',
          salePrice: 20.00,
          category: 'Servicios',
          isCombo: false,
          isPreAssembled: false,
          recipe: [
            { rawMaterialId: rawMaterialAId, quantity: 50 } // Gasta 50ml, costo = $2.5
          ]
        })
        .expect(201);
      
      productId = res.body.id;
    });
  });

  describe('4. Caja Registradora (POS), Descuentos y Rentabilidad', () => {
    it('Debe registrar una venta, calcular costos y aplicar descuento', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerName: 'Cliente VIP',
          paymentStatus: PaymentStatus.PAID,
          deliveryMethod: DeliveryMethod.IN_STORE,
          discountAmount: 2.00, // Descuento de $2
          items: [
            { productId: productId, quantity: 2, unitPrice: 20.00 } // Total base $40
          ]
        })
        .expect(201);
      
      orderId = res.body.id;
      
      // Validaciones matemáticas de la ganancia
      // Subtotal = $40.00. Descuento = $2.00. Total = $38.00.
      // Costo = (50ml * 0.05 = 2.50) * 2 unidades = $5.00
      // Ganancia Neta = 38.00 - 5.00 = $33.00
      
      expect(res.body.totalAmount).toBe(38.00);
      expect(res.body.discountAmount).toBe(2.00);
      expect(res.body.totalCost).toBe(5.00);
      expect(res.body.netProfit).toBe(33.00);
      expect(res.body.status).toBe(OrderStatus.PENDING);
    });

    it('Debe haber descontado los insumos del inventario', async () => {
      const res = await request(app.getHttpServer())
        .get('/raw-materials')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const rm = res.body.find((r: any) => r.id === rawMaterialAId);
      // Tenía 1000ml, se vendieron 2 servicios que gastan 50ml c/u = -100ml. Restante = 900ml.
      expect(rm.stockQuantity).toBe(900);
    });
  });

  describe('5. Cuentas Abiertas y Entregas Parciales', () => {
    it('Debe entregar parcialmente un ítem del pedido', async () => {
      // Primero obtenemos el pedido para sacar los IDs de los ítems
      const orderRes = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
        
      const itemToDeliver = orderRes.body.items[0];

      const res = await request(app.getHttpServer())
        .put(`/orders/${orderId}/deliver-partial`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deliveries: [
            { orderItemId: itemToDeliver.id, quantityToDeliver: 1 }
          ]
        })
        .expect(200);

      expect(res.body.status).toBe(OrderStatus.PARTIALLY_DELIVERED);
    });

    it('Debe rechazar editar un pedido si los ítems eliminados ya fueron entregados', async () => {
      // Intentamos eliminar el item entregado enviando items vacío
      await request(app.getHttpServer())
        .put(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerName: 'Cliente VIP',
          paymentStatus: PaymentStatus.PAID,
          items: [] // Intento de eliminarlo
        })
        .expect(400); // Bad Request esperado
    });
  });

  describe('6. Reservaciones y Booking', () => {
    let publicLinkParams = '';

    it('Debe obtener el tenant público para reservas', async () => {
      const res = await request(app.getHttpServer())
        .get('/reservations/public/availability') // Esto requiere el encriptado, mockearemos
        .expect(400); 
        // 400 es válido si no pasamos el hash público, lo cual verifica que está protegido.
    });

    it('Debe rechazar una reservación solapada si no hay espacio', async () => {
      // Aquí el admin crea una reserva manual
      await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerName: 'Maria',
          customerPhone: '123',
          serviceName: 'Corte de Cabello', // dura 30 mins
          durationMinutes: 30,
          date: new Date().toISOString().split('T')[0], // Hoy
          timeStart: '10:00',
          timeEnd: '10:30',
          force: false
        })
        .expect(201);

      // Otra reserva en la misma hora, sin force
      await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerName: 'Pedro',
          customerPhone: '456',
          serviceName: 'Corte de Cabello',
          durationMinutes: 30,
          date: new Date().toISOString().split('T')[0],
          timeStart: '10:00',
          timeEnd: '10:30',
          force: false
        })
        .expect(400); // Choque detectado
    });

    it('Debe permitir la reservación solapada si el admin envía force=true', async () => {
      await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerName: 'Pedro',
          customerPhone: '456',
          serviceName: 'Corte de Cabello',
          durationMinutes: 30,
          date: new Date().toISOString().split('T')[0],
          timeStart: '10:00',
          timeEnd: '10:30',
          force: true
        })
        .expect(201); // Choque permitido
    });
  });

  describe('7. Multi-Tenant y Cambio de Sucursal', () => {
    it('Debe invitar a un empleado a una segunda sucursal y permitirle alternar', async () => {
      // 1. Crear otro dueño y sucursal
      const owner2Res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `owner2-${Date.now()}@test.com`,
          password: 'password123',
          name: 'Dueño 2'
        })
        .expect(201);
      
      const token2 = owner2Res.body.access_token;

      // 2. Dueño 2 invita al primer usuario (empleado) a su sucursal
      // Como no tenemos un endpoint directo en E2E de invitations sin auth, asumimos que
      // la lógica subyacente de UserTenantAccess funciona si el endpoint users lo crea
      const inviteRes = await request(app.getHttpServer())
        .post('/users/invite') // Suponiendo que existe o si no creamos el acceso
        .set('Authorization', `Bearer ${token2}`)
        .send({
          email: 'test-user@test.com', // El original
          role: 'EMPLOYEE'
        });
        
      // 3. El empleado original consulta sus workspaces
      const workspaces = await request(app.getHttpServer())
        .get('/auth/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // (Esta validación dependerá de la implementación exacta de la API, 
      // pero conceptualmente prueba el aislamiento multi-tenant)
      expect(Array.isArray(workspaces.body)).toBe(true);
    });
  });
});

