export enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  COMPLETED = 'COMPLETED',
  DELIVERED = 'DELIVERED',
  PAID = 'PAID',
  CANCELED = 'CANCELED',
}

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
}

export interface RawMaterialDTO {
  id?: string;
  name: string;
  unit: string;
  costPerUnit: number;
  stockQuantity: number;
  minStockAlert: number;
}

export interface RecipeItemDTO {
  id?: string;
  rawMaterialId: string;
  quantity: number;
}

export interface ProductDTO {
  id?: string;
  name: string;
  description?: string;
  salePrice: number;
  stockQuantity: number;
  recipe?: RecipeItemDTO[];
}

export interface OrderItemDTO {
  id?: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderDTO {
  id?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  notes?: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItemDTO[];
}
