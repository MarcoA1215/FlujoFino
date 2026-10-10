import Dexie, { type Table } from 'dexie';

export interface OfflineOrder {
  offlineId: string; // UUID único generado en cliente
  tenantId: string;
  payload: any;      // Datos completos de la orden
  rateAtSale: number;
  createdAt: string; // Timestamp exacto de la venta local
  synced: boolean;
  status?: 'pending' | 'failed' | 'synced' | 'syncing';
  syncError?: string;
  retryCount?: number;
}

export class FlujoFinoOfflineDB extends Dexie {
  cachedProducts!: Table<any, string>;
  offlineOrders!: Table<OfflineOrder, string>;
  cachedReservations!: Table<any, string>;
  cachedCustomers!: Table<any, string>;

  constructor() {
    super('FlujoFinoOfflineDB');
    this.version(1).stores({
      cachedProducts: 'id, name, categoryId',
      offlineOrders: 'offlineId, createdAt, synced',
    });
    this.version(2).stores({
      cachedProducts: 'id, name, categoryId',
      offlineOrders: 'offlineId, createdAt, synced',
      cachedReservations: 'id, date, time, customerName, status',
      cachedCustomers: 'id, name, phone, identification',
    });
    this.version(3).stores({
      cachedProducts: 'id, name, categoryId',
      offlineOrders: 'offlineId, createdAt, synced, status',
      cachedReservations: 'id, date, time, customerName, status',
      cachedCustomers: 'id, name, phone, identification',
    });
    this.version(4).stores({
      cachedProducts: 'id, name, categoryId, tenantId',
      offlineOrders: 'offlineId, createdAt, synced, status, tenantId',
      cachedReservations: 'id, date, time, customerName, status, tenantId',
      cachedCustomers: 'id, name, phone, identification, tenantId',
    });
  }

  // --- MÉTODOS DE ACCESO AISLADOS POR TENANT ---

  async getProductsByTenant(tenantId: string): Promise<any[]> {
    if (!tenantId) return [];
    return this.cachedProducts.filter(p => p.tenantId === tenantId).toArray();
  }

  async saveProductsForTenant(tenantId: string, products: any[]): Promise<void> {
    if (!tenantId || !Array.isArray(products)) return;
    const existing = await this.cachedProducts.filter(p => p.tenantId === tenantId).toArray();
    const existingIds = existing.map(p => p.id);
    if (existingIds.length > 0) {
      await this.cachedProducts.bulkDelete(existingIds);
    }
    const enriched = products.map(p => ({ ...p, tenantId }));
    await this.cachedProducts.bulkPut(enriched);
  }

  async getCustomersByTenant(tenantId: string): Promise<any[]> {
    if (!tenantId) return [];
    return this.cachedCustomers.filter(c => c.tenantId === tenantId).toArray();
  }

  async saveCustomersForTenant(tenantId: string, customers: any[]): Promise<void> {
    if (!tenantId || !Array.isArray(customers)) return;
    const existing = await this.cachedCustomers.filter(c => c.tenantId === tenantId).toArray();
    const existingIds = existing.map(c => c.id);
    if (existingIds.length > 0) {
      await this.cachedCustomers.bulkDelete(existingIds);
    }
    const enriched = customers.map(c => ({ ...c, tenantId }));
    await this.cachedCustomers.bulkPut(enriched);
  }

  async getReservationsByTenant(tenantId: string): Promise<any[]> {
    if (!tenantId) return [];
    return this.cachedReservations.filter(r => r.tenantId === tenantId).toArray();
  }

  async saveReservationsForTenant(tenantId: string, reservations: any[]): Promise<void> {
    if (!tenantId || !Array.isArray(reservations)) return;
    const existing = await this.cachedReservations.filter(r => r.tenantId === tenantId).toArray();
    const existingIds = existing.map(r => r.id);
    if (existingIds.length > 0) {
      await this.cachedReservations.bulkDelete(existingIds);
    }
    const enriched = reservations.map(r => ({ ...r, tenantId }));
    await this.cachedReservations.bulkPut(enriched);
  }

  async getOfflineOrdersByTenant(tenantId: string): Promise<OfflineOrder[]> {
    if (!tenantId) return [];
    return this.offlineOrders.filter(o => o.tenantId === tenantId).toArray();
  }

  async clearTenantCache(tenantId: string): Promise<void> {
    if (!tenantId) return;
    try {
      const p = await this.cachedProducts.filter(x => x.tenantId === tenantId).toArray();
      if (p.length > 0) await this.cachedProducts.bulkDelete(p.map(x => x.id));

      const c = await this.cachedCustomers.filter(x => x.tenantId === tenantId).toArray();
      if (c.length > 0) await this.cachedCustomers.bulkDelete(c.map(x => x.id));

      const r = await this.cachedReservations.filter(x => x.tenantId === tenantId).toArray();
      if (r.length > 0) await this.cachedReservations.bulkDelete(r.map(x => x.id));
    } catch (e) {
      console.error('Error limpiando caché local del tenant:', e);
    }
  }

  async clearAllLocalData(): Promise<void> {
    try {
      await this.cachedProducts.clear();
      await this.cachedCustomers.clear();
      await this.cachedReservations.clear();
      await this.offlineOrders.clear();
    } catch (e) {
      console.error('Error limpiando toda la base de datos local:', e);
    }
  }
}

export const offlineDb = new FlujoFinoOfflineDB();
