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
  durationMinutes?: number;
  isCombo?: boolean;
  isPreAssembled?: boolean;
  physicalStock?: number;
  reservedQuantity?: number;
  recipe?: RecipeItemDTO[];
  comboItems?: ComboItemDTO[];
  assignedStaffIds?: string[];
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
  customerId?: string;
  identification?: string;
  employeeId?: string;
  employee?: {
    id: string;
    username: string;
    email?: string;
    role?: UserRole;
    jobTitle?: string;
    entryTime?: string;
    exitTime?: string;
  };
  items: OrderItemDTO[];
}

export interface EmployeeDTO {
  id: string;
  username: string;
  name?: string;
  role: UserRole;
  jobTitle?: string;
  entryTime?: string;
  exitTime?: string;
}

export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
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
  customerId?: string;
  identification?: string;
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

export enum AccessRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface AccessRequestDTO {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  jobTitle?: string;
  role: UserRole;
  status: AccessRequestStatus;
  reason: 'OUT_OF_SCHEDULE' | 'POLICY_ALWAYS_REQUIRE';
  entryTime?: string;
  exitTime?: string;
  attemptTime: string;
  createdAt: string;
}

export interface CustomerDTO {
  id?: string;
  tenantId: string;
  name: string;
  phone: string;
  identification?: string;
  notes?: string;
  totalVisits: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerLookupResponse {
  exists: boolean;
  name?: string;
  phone?: string;
  identification?: string;
}

export interface SettingsDTO {
  id?: string;
  tenantId?: string;
  exchangeRateBs?: number;
  companyBank?: string;
  companyCedula?: string;
  companyPhone?: string;
  companyAccountNumber?: string;
  companyAccountHolder?: string;
  binancePayId?: string;
  binanceEmail?: string;
  binancePhone?: string;
  allowPartialPayments?: boolean;
  minDepositPercentage?: number;
  allowCashierBypassDeposit?: boolean;
  acceptCashUsd?: boolean;
  acceptPagoMovil?: boolean;
  acceptCardPos?: boolean;
  acceptBinance?: boolean;
  acceptTransfer?: boolean;
  featureCustomerSchedules?: boolean;
  featureRecipes?: boolean;
  featureBuySell?: boolean;
  featureProduction?: boolean;
  featureShowCatalog?: boolean;
  bookingRequireService?: boolean;
  bookingAllowStaffSelection?: boolean;
  requireApprovalAlways?: boolean;
  businessHours?: any;
  services?: any[];
  slotInterval?: number;
  themePrimaryColor?: string;
  themeHeaderColor?: string;
  publicToken?: string;
}

export enum TenantStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  SUSPENDED = 'SUSPENDED',
}

export enum TenantPlanType {
  PIONEER = 'PIONEER',
  REGULAR = 'REGULAR',
}

export enum SaaSPaymentMethod {
  PAGO_MOVIL = 'PAGO_MOVIL',
  BINANCE = 'BINANCE',
  CASH = 'CASH',
}

export enum SaaSPaymentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface SaaSPaymentReportDTO {
  id: string;
  tenantId: string;
  tenantName?: string;
  amount: number;
  amountBs?: number;
  exchangeRate?: number;
  paymentMethod: SaaSPaymentMethod;
  reference: string;
  status: SaaSPaymentStatus;
  rejectReason?: string;
  createdAt: string;
}

export interface SuperAdminTenantDTO {
  id: string;
  name: string;
  slug?: string;
  status: TenantStatus;
  planType: TenantPlanType;
  basePrice: number;
  trialEndsAt?: string;
  currentPeriodEndsAt?: string;
  referredByTenantId?: string;
  referrerName?: string;
  referralCode?: string;
  createdAt: string;
  owner?: {
    id: string;
    name?: string;
    email: string;
  };
  trialDaysLeft: number;
  activeReferrals: number;
  discountPercentage: number;
  finalFee: number;
}

export interface UpdateTenantPlanDTO {
  planType?: TenantPlanType;
  status?: TenantStatus;
  extendDays?: number;
  basePrice?: number;
}

export interface MySubscriptionDTO {
  tenantId: string;
  tenantName: string;
  status: TenantStatus;
  planType: TenantPlanType;
  referralCode: string;
  basePrice: number;
  activeReferrals: number;
  totalReferrals: number;
  discountPercentage: number;
  finalFee: number;
  trialDaysLeft: number;
  trialEndsAt?: string;
  currentPeriodEndsAt?: string;
}

export interface PlatformConfigDTO {
  companyBank?: string;
  companyCedula?: string;
  companyPhone?: string;
  companyAccountNumber?: string;
  companyAccountHolder?: string;
  binancePayId?: string;
  binanceEmail?: string;
  defaultMonthlyPrice?: number;
  defaultTrialDays?: number;
}


