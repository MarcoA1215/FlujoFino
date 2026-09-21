export enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  PARTIALLY_DELIVERED = 'PARTIALLY_DELIVERED',
  DELIVERED = 'DELIVERED',
  CANCELED = 'CANCELED',
}

export enum PaymentStatus {
  PARTIAL = 'PARTIAL',
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
  isPreAssembled?: boolean;
  physicalStock?: number;
  reservedQuantity?: number;
  recipe?: RecipeItemDTO[];
  comboItems?: ComboItemDTO[];
}

export interface OrderItemDTO {
  id?: string;
  productId: string;
  quantity: number;
  deliveredQuantity?: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderDTO {
  id?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  notes?: string;
  tableNumber?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryMethod?: DeliveryMethod;
  deliveryZoneId?: string;
  deliveryFee?: number;
  totalAmount: number;
  employeeId?: string;
  employee?: {
    id: string;
    username: string;
    email?: string;
    role?: UserRole;
  };
  items: OrderItemDTO[];
}

export enum UserRole {
  ADMIN = 'ADMIN',
  KITCHEN = 'KITCHEN',
  POS = 'POS',
  DELIVERY = 'DELIVERY',
  INVENTORY = 'INVENTORY'
}

export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

export interface ReservationDTO {
  id?: string;
  customerName: string;
  customerPhone?: string;
  date: string;
  time: string;
  numberOfPeople?: number; // Optional now, since we have services
  serviceId?: string; // New field for service-based booking
  serviceName?: string;
  tableNumber?: string;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  totalAmount?: number;
  abonosTotal?: number;
  notes?: string;
}

export interface BusinessHourDay {
  isOpen: boolean;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "18:00"
}

export interface BusinessHours {
  [day: string]: BusinessHourDay; // '0' = Sunday, '1' = Monday, etc.
}

export interface BookingServiceDTO {
  id: string;
  name: string;
  durationMinutes: number;
  price?: number;
}
