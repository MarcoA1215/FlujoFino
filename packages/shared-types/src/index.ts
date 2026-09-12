export enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  DELIVERED = 'DELIVERED',
  CANCELED = 'CANCELED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

export enum MovementType {
  IN_PURCHASE = 'IN_PURCHASE',
  IN_PRODUCTION = 'IN_PRODUCTION',
  OUT_PRODUCTION = 'OUT_PRODUCTION',
  OUT_SALE = 'OUT_SALE',
  LOSS = 'LOSS',
  IN = 'IN',
  OUT = 'OUT',
}

export enum DeliveryMethod {
  IN_STORE = 'IN_STORE',
  PICKUP = 'PICKUP',
  DELIVERY = 'DELIVERY',
}

export interface DeliveryZoneDTO {
  id?: string;
  name: string;
  feePrice: number;
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

export interface ComboItemDTO {
  id?: string;
  componentId: string;
  componentName?: string;
  quantity: number;
  unitCost?: number;
  totalItemCost?: number;
}

export interface ProductDTO {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  salePrice: number;
  stockQuantity: number;
  isCombo?: boolean;
  recipe?: RecipeItemDTO[];
  comboItems?: ComboItemDTO[];
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
  customerPhone?: string;
  customerAddress?: string;
  notes?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryMethod?: DeliveryMethod;
  deliveryZoneId?: string;
  deliveryFee?: number;
  totalAmount: number;
  items: OrderItemDTO[];
}
