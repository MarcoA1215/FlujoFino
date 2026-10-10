import { describe, it, expect, beforeEach } from 'vitest';
import { offlineDb, type OfflineOrder } from './offline-db';

describe('Offline Database Engine (Dexie with fake-indexeddb)', () => {
  beforeEach(async () => {
    // Limpieza rigurosa de todas las tablas para evitar contaminación de estado
    await offlineDb.offlineOrders.clear();
    await offlineDb.cachedProducts.clear();
    await offlineDb.cachedReservations.clear();
    await offlineDb.cachedCustomers.clear();
  });

  describe('offlineOrders Table', () => {
    it('debe almacenar una orden desconectada con synced: false', async () => {
      const order: OfflineOrder = {
        offlineId: 'ord-local-1',
        tenantId: 'tenant-restaurante',
        payload: {
          items: [{ productId: 'p-1', quantity: 2, price: 10 }],
          paymentMethod: 'CASH',
        },
        rateAtSale: 52.5,
        createdAt: new Date().toISOString(),
        synced: false,
      };

      await offlineDb.offlineOrders.add(order);

      const saved = await offlineDb.offlineOrders.get('ord-local-1');
      expect(saved).toBeDefined();
      expect(saved?.tenantId).toBe('tenant-restaurante');
      expect(saved?.synced).toBe(false);
      expect(saved?.rateAtSale).toBe(52.5);
    });

    it('debe filtrar correctamente las órdenes pendientes de sincronización', async () => {
      const orders: OfflineOrder[] = [
        {
          offlineId: 'ord-pend-1',
          tenantId: 'tenant-1',
          payload: {},
          rateAtSale: 50,
          createdAt: new Date().toISOString(),
          synced: false,
        },
        {
          offlineId: 'ord-synced-1',
          tenantId: 'tenant-1',
          payload: {},
          rateAtSale: 50,
          createdAt: new Date().toISOString(),
          synced: true,
        },
        {
          offlineId: 'ord-pend-2',
          tenantId: 'tenant-1',
          payload: {},
          rateAtSale: 50,
          createdAt: new Date().toISOString(),
          synced: false,
        },
      ];

      await offlineDb.offlineOrders.bulkAdd(orders);

      const pendingOrders = await offlineDb.offlineOrders.filter(o => !o.synced).toArray();
      expect(pendingOrders).toHaveLength(2);
      expect(pendingOrders.map(o => o.offlineId)).toEqual(['ord-pend-1', 'ord-pend-2']);
    });

    it('debe actualizar el estado a synced: true tras sincronización exitosa', async () => {
      const order: OfflineOrder = {
        offlineId: 'ord-update-1',
        tenantId: 'tenant-1',
        payload: {},
        rateAtSale: 50,
        createdAt: new Date().toISOString(),
        synced: false,
      };
      await offlineDb.offlineOrders.add(order);

      await offlineDb.offlineOrders.update('ord-update-1', { synced: true });

      const updated = await offlineDb.offlineOrders.get('ord-update-1');
      expect(updated?.synced).toBe(true);

      const remainingPending = await offlineDb.offlineOrders.filter(o => !o.synced).toArray();
      expect(remainingPending).toHaveLength(0);
    });

    it('debe permitir marcar una orden como failed con syncError sin eliminarla', async () => {
      await offlineDb.offlineOrders.add({
        offlineId: 'ord-failed-1',
        tenantId: 'tenant-1',
        payload: { items: [] },
        rateAtSale: 50,
        createdAt: new Date().toISOString(),
        synced: false,
        status: 'pending',
      });

      await offlineDb.offlineOrders.update('ord-failed-1', {
        status: 'failed',
        syncError: 'El carrito no puede estar vacío',
        retryCount: 1,
      });

      const updated = await offlineDb.offlineOrders.get('ord-failed-1');
      expect(updated?.status).toBe('failed');
      expect(updated?.syncError).toBe('El carrito no puede estar vacío');
      expect(updated?.retryCount).toBe(1);

      const all = await offlineDb.offlineOrders.toArray();
      const activePending = all.filter(o => o.status !== 'failed');
      expect(activePending).toHaveLength(0);
    });
  });

  describe('cachedProducts Table', () => {
    it('debe cachear productos con bulkPut y permitir consultas rápidas por ID', async () => {
      const products = [
        { id: 'prod-1', name: 'Hamburguesa Sencilla', salePrice: 5.0, stockQuantity: 20 },
        { id: 'prod-2', name: 'Papas Fritas', salePrice: 2.5, stockQuantity: 50 },
      ];

      await offlineDb.cachedProducts.bulkPut(products);

      const p1 = await offlineDb.cachedProducts.get('prod-1');
      expect(p1).toBeDefined();
      expect(p1.name).toBe('Hamburguesa Sencilla');
      expect(p1.salePrice).toBe(5.0);

      const totalCached = await offlineDb.cachedProducts.count();
      expect(totalCached).toBe(2);
    });

    it('debe actualizar el stock local de productos cacheados tras una venta desconectada', async () => {
      await offlineDb.cachedProducts.put({
        id: 'prod-stock-1',
        name: 'Refresco',
        stockQuantity: 10,
        physicalStock: 10,
      });

      await offlineDb.cachedProducts.update('prod-stock-1', {
        stockQuantity: 8,
        physicalStock: 8,
      });

      const updated = await offlineDb.cachedProducts.get('prod-stock-1');
      expect(updated.stockQuantity).toBe(8);
      expect(updated.physicalStock).toBe(8);
    });
  });

  describe('Multi-Tenant Isolation in Offline Cache', () => {
    it('debe aislar los productos por tenantId y no mezclar inventarios entre cuentas', async () => {
      const productosNegocioA = [
        { id: 'p-a-1', name: 'Pizza Familiar', salePrice: 12 },
        { id: 'p-a-2', name: 'Refresco 2L', salePrice: 3 },
      ];
      const productosNegocioB = [
        { id: 'p-b-1', name: 'Corte de Cabello', salePrice: 10 },
      ];

      await offlineDb.saveProductsForTenant('tenant-pizzeria', productosNegocioA);
      await offlineDb.saveProductsForTenant('tenant-barberia', productosNegocioB);

      const itemsPizzeria = await offlineDb.getProductsByTenant('tenant-pizzeria');
      const itemsBarberia = await offlineDb.getProductsByTenant('tenant-barberia');
      const itemsInexistente = await offlineDb.getProductsByTenant('tenant-otro');

      expect(itemsPizzeria).toHaveLength(2);
      expect(itemsPizzeria.map(p => p.name)).toEqual(['Pizza Familiar', 'Refresco 2L']);

      expect(itemsBarberia).toHaveLength(1);
      expect(itemsBarberia[0].name).toBe('Corte de Cabello');

      expect(itemsInexistente).toHaveLength(0);
    });

    it('debe limpiar únicamente la caché del tenant que cierra sesión dejando intacto el otro', async () => {
      await offlineDb.saveProductsForTenant('tenant-a', [{ id: 'pa1', name: 'Item A' }]);
      await offlineDb.saveProductsForTenant('tenant-b', [{ id: 'pb1', name: 'Item B' }]);

      await offlineDb.clearTenantCache('tenant-a');

      const itemsA = await offlineDb.getProductsByTenant('tenant-a');
      const itemsB = await offlineDb.getProductsByTenant('tenant-b');

      expect(itemsA).toHaveLength(0);
      expect(itemsB).toHaveLength(1);
      expect(itemsB[0].name).toBe('Item B');
    });

    it('debe aislar órdenes offline y clientes entre tenants', async () => {
      await offlineDb.offlineOrders.add({
        offlineId: 'ord-negocio-a',
        tenantId: 'tenant-a',
        payload: {},
        rateAtSale: 50,
        createdAt: new Date().toISOString(),
        synced: false,
      });

      await offlineDb.offlineOrders.add({
        offlineId: 'ord-negocio-b',
        tenantId: 'tenant-b',
        payload: {},
        rateAtSale: 50,
        createdAt: new Date().toISOString(),
        synced: false,
      });

      const ordenesA = await offlineDb.getOfflineOrdersByTenant('tenant-a');
      const ordenesB = await offlineDb.getOfflineOrdersByTenant('tenant-b');

      expect(ordenesA).toHaveLength(1);
      expect(ordenesA[0].offlineId).toBe('ord-negocio-a');

      expect(ordenesB).toHaveLength(1);
      expect(ordenesB[0].offlineId).toBe('ord-negocio-b');
    });
  });
});

