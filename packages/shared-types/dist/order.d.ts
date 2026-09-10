export declare enum OrderStatus {
    PENDING = "PENDING",
    PREPARING = "PREPARING",
    READY = "READY",
    IN_TRANSIT = "IN_TRANSIT",
    DELIVERED = "DELIVERED",
    CANCELED = "CANCELED"
}
export interface Order {
    id: string;
    customerName: string;
    status: OrderStatus;
    totalAmount: number;
    createdAt: Date;
}
