import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PaymentStatus, DeliveryMethod, OrderStatus } from '@nutrideli/shared-types';
import * as assert from 'assert';
import { DataSource } from 'typeorm';

async function runTests() {
  console.log('Iniciando entorno de pruebas E2E (Sin Jest para evitar conflictos ESM)...');
  const app = await NestFactory.create(AppModule);
  await app.listen(3002);
  const baseUrl = 'http://localhost:3002';

  try {
    console.log('1. Autenticación y Multi-Tenant');
    let res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: `test-${Date.now()}@test.com`, 
        password: 'password123', 
        username: `admin${Date.now()}`,
        tenantName: 'Dueño Test' 
      })
    });
    if (res.status !== 201) {
      console.log('Error registro:', await res.text());
    }
    assert.strictEqual(res.status, 201, 'Fallo registro');
    const authData = await res.json();
    const token = authData.access_token;
    assert.ok(token, 'No hay token JWT');
    console.log('✔ Autenticación exitosa');

    console.log('2. Insumos y Fórmulas');
    res = await fetch(`${baseUrl}/raw-materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: 'Insumo Test', unit: 'ml', costPerUnit: 0.1, initialStock: 100, minStockAlert: 10 })
    });
    const rmData = await res.json();
    const rmId = rmData.id;
    assert.ok(rmId, 'Insumo no creado');

    res = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        name: 'Producto Test', salePrice: 10, category: 'Pruebas'
      })
    });
    const pData = await res.json();
    const pId = pData.id;
    assert.ok(pId, 'Producto no creado');

    res = await fetch(`${baseUrl}/products/${pId}/recipe`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ items: [{ rawMaterialId: rmId, quantity: 10 }] })
    });
    assert.strictEqual(res.status, 200, 'Fallo receta');
    console.log('✔ Insumos y Fórmulas exitosos');

    console.log('3. Caja POS, Descuento y Rentabilidad');
    res = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        customerName: 'Cliente VIP', paymentStatus: PaymentStatus.PAID, deliveryMethod: DeliveryMethod.IN_STORE,
        discountAmount: 2, items: [{ productId: pId, quantity: 2, unitPrice: 10 }]
      })
    });
    const orderData = await res.json();
    assert.strictEqual(orderData.totalAmount, 18, 'Total incorrecto'); // 20 - 2
    assert.strictEqual(orderData.totalCost, 2, 'Costo incorrecto'); // 2 * (10 * 0.1)
    assert.strictEqual(orderData.netProfit, 16, 'Ganancia incorrecto'); // 18 - 2

    console.log('4. Límite de Descuento (100%)');
    let res100 = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        customerName: 'Cortesía 100%', paymentStatus: PaymentStatus.PAID, deliveryMethod: DeliveryMethod.IN_STORE,
        discountAmount: 20, items: [{ productId: pId, quantity: 2, unitPrice: 10 }]
      })
    });
    const order100 = await res100.json();
    assert.strictEqual(order100.totalAmount, 0, 'Total debe ser 0');
    assert.strictEqual(order100.netProfit, -2, 'Ganancia debe ser -2 (pérdida)');

    console.log('5. Límite de Descuento (Excesivo)');
    let resExcess = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        customerName: 'Excesivo', paymentStatus: PaymentStatus.PAID, deliveryMethod: DeliveryMethod.IN_STORE,
        discountAmount: 50, items: [{ productId: pId, quantity: 2, unitPrice: 10 }]
      })
    });
    const orderExcess = await resExcess.json();
    assert.strictEqual(orderExcess.totalAmount, 0, 'Total debe ser 0 no negativo');
    assert.strictEqual(orderExcess.discountAmount, 20, 'Descuento debe topar en el subtotal');

    console.log('6. Rollback de Insumos al Cancelar Pedido');
    let resCancel = await fetch(`${baseUrl}/orders/${orderExcess.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status: OrderStatus.CANCELED })
    });
    assert.strictEqual(resCancel.status, 200, 'Fallo cancelar pedido');
    
    // Check raw material stock
    let resCheck = await fetch(`${baseUrl}/raw-materials`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const materials = await resCheck.json();
    const material = materials.find((m: any) => m.id === rmId);
    // initial = 100, we made 3 orders of 2 products each (6 products total). Each product uses 10 units = 60 units used.
    // 100 - 60 = 40. But we cancelled one order of 2 products (20 units). So it should be 60.
    assert.strictEqual(material.stockQuantity, 60, 'Stock no fue regresado correctamente');
    console.log('✔ POS Rentabilidad exitosa');

    console.log('=== TODAS LAS PRUEBAS BACKEND MARCAN TRUE ===');
  } catch (e) {
    console.error('❌ ERROR EN PRUEBA:', e.message);
  } finally {
    await app.close();
    process.exit(0);
  }
}

runTests();
