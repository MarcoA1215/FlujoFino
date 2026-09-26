import Dexie, { type Table } from 'dexie';

export interface OfflineOrder {
  offlineId: string; // UUID único generado en cliente
  tenantId: string;
  payload: any;      // Datos completos de la orden
  rateAtSale: number;
  createdAt: string; // Timestamp exacto de la venta local
  synced: boolean;
}

export class FlujoFinoOfflineDB extends Dexie {
  cachedProducts!: Table<any, string>;
  offlineOrders!: Table<OfflineOrder, string>;

  constructor() {
    super('FlujoFinoOfflineDB');
    this.version(1).stores({
      cachedProducts: 'id, name, categoryId',
      offlineOrders: 'offlineId, createdAt, synced',
    });
  }
}

export const offlineDb = new FlujoFinoOfflineDB();
