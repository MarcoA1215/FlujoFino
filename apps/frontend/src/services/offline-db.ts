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
  }
}

export const offlineDb = new FlujoFinoOfflineDB();
