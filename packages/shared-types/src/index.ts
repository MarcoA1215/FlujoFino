export const APP_NAME = 'FinoWork';
export const DEFAULT_TENANT_NAME = 'FinoWork';
export const DEFAULT_SUPERADMIN_EMAIL = 'superadmin@finowork.com';
export const DEFAULT_NOREPLY_EMAIL = 'no-reply@finowork.com';
export const DEFAULT_SUPPORT_PHONE = '584145652381';
export const DEFAULT_EXCHANGE_RATE = 40.0;

export enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  IN_TRANSIT = 'IN_TRANSIT',
  PARTIALLY_DELIVERED = 'PARTIALLY_DELIVERED',
  DELIVERED = 'DELIVERED',
  CANCELED = 'CANCELED',
  CERRADO_CON_PERDIDA = 'CERRADO_CON_PERDIDA',
  SOLICITUD_ENCARGO = 'SOLICITUD_ENCARGO',
  PENDIENTE_PAGO = 'PENDIENTE_PAGO',
  CANCELADO_PROVEEDOR = 'CANCELADO_PROVEEDOR',
}

export enum ProductAvailabilityType {
  INMEDIATO = 'INMEDIATO',
  BAJO_ENCARGO = 'BAJO_ENCARGO',
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

export type ExtraPriceType = 'COST' | 'MARGIN_PERCENT' | 'FIXED_PRICE';

export interface OrderItemExtra {
  rawMaterialId: string;
  name: string;
  priceUSD: number;
  quantity: number;
}

export interface RawMaterialDTO {
  id?: string;
  name: string;
  unit: string;
  costPerUnit: number;
  stockQuantity: number;
  minStockAlert: number;
  allowAsExtra?: boolean;
  extraPriceType?: ExtraPriceType;
  extraPriceValue?: number;
}

export interface RecipeItemDTO {
  id?: string;
  rawMaterialId: string;
  quantity: number;
  rawMaterial?: RawMaterialDTO;
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
  cost?: number;
  stock?: number;
  is_service?: boolean;
  product_type?: 'REVENTA' | 'FORMULA' | 'SERVICIO' | string;
  availabilityType?: ProductAvailabilityType;
  isSupplierPreorder?: boolean;
}

export interface OrderItemDTO {
  id?: string;
  productId: string;
  productName?: string;
  quantity: number;
  deliveredQuantity?: number;
  unitPrice: number;
  unitCost?: number;
  subtotal: number;
  removedIngredients?: string[];
  addedExtras?: OrderItemExtra[];
  hasModifications?: boolean;
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
  requestedDeliveryDate?: string | Date;
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
  paymentMethod?: string;
  usdReceived?: number;
  changeAmount?: number;
  changeAmountBs?: number;
  changeMethod?: string;
  changeRef?: string;
  pagoMovilRef?: string;
  pagoMovilPhone?: string;
  pagoMovilCedula?: string;
  pagoMovilBank?: string;
  puntoRef?: string;
  puntoBank?: string;
  binanceRef?: string;
  transferRef?: string;
  transferBank?: string;
  amountBs?: number;
  exchangeRate?: number;
  abonosTotal?: number;
  abonosHistory?: any[];
}

export interface EmployeeDTO {
  id: string;
  username: string;
  name?: string;
  role: UserRole;
  roles?: UserRole[];
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
  INVENTORY = 'INVENTORY',
  PROMOTOR = 'PROMOTOR',
  OPERATIVO = 'OPERATIVO',
}

export interface SwitchModeDTO {
  targetRole: UserRole;
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
  imageUrl?: string;
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

export type ExchangeRateMode = 'BCV' | 'PARALELO' | 'USDT' | 'EUR' | 'MANUAL' | 'COP';

export interface RatesCache {
  bcv?: number;
  parallel?: number;
  usdt?: number;
  eur?: number;
  updatedAt?: string;
}

export interface SettingsDTO {
  id?: string;
  tenantId?: string;
  exchangeRateBs?: number;
  exchangeRateMode?: ExchangeRateMode;
  manualExchangeRate?: number | null;
  currencySymbol?: string;
  ratesCache?: RatesCache | null;
  availableRates?: RatesCache | null;
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
  featureDelivery?: boolean;
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
  daysLeft?: number;
  isExpired?: boolean;
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

export enum InvestmentType {
  INVERSION_EXTERNA = 'INVERSION_EXTERNA',
  REINVERSION_GANANCIA = 'REINVERSION_GANANCIA',
}

export interface InvestmentDTO {
  id?: string;
  negocioId?: string;
  type: InvestmentType;
  amountUSD: number;
  amountBS: number;
  exchangeRate: number;
  description: string;
  date: string;
  createdAt?: string;
}

export enum PromoterCommissionType {
  ACTIVATION = 'ACTIVATION',
  RECURRING = 'RECURRING',
}

export enum PromoterCommissionStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum PromoterRank {
  MADERA = 'MADERA',
  BRONCE = 'BRONCE',
  PLATA = 'PLATA',
  ORO = 'ORO',
}

export interface PromoterCommissionDTO {
  id: string;
  promoterId: string;
  tenantId: string;
  tenantName?: string;
  type: PromoterCommissionType;
  amountUSD: number;
  saasPaymentReportId?: string | null;
  status: PromoterCommissionStatus;
  paidAt?: string | null;
  paymentReference?: string | null;
  createdAt: string;
}

export interface PromoterAffiliatedTenantDTO {
  tenantId: string;
  tenantName: string;
  status: TenantStatus;
  planType: TenantPlanType;
  createdAt: string;
  currentPeriodEndsAt?: string | null;
  totalCommissionsUSD: number;
  activationCommission?: PromoterCommissionDTO | null;
  recurringCommissionsCount: number;
  recurringCommissionsUSD: number;
}

export interface PromoterStatsDTO {
  promoterId: string;
  code: string;
  currentRank: PromoterRank;
  rankEmoji: string;
  monthlyActivations: number;
  rankBonusUSD: number;
  nextRank?: {
    rank: PromoterRank;
    rankEmoji: string;
    activationsNeeded: number;
    bonusUSD: number;
  } | null;
  totalActivationCommissionsUSD: number;
  totalRecurringCommissionsUSD: number;
  totalCommissionsEarnedUSD: number;
  totalPendingBalanceUSD: number;
  totalPaidBalanceUSD: number;
  affiliatedTenants: PromoterAffiliatedTenantDTO[];
  recentCommissions: PromoterCommissionDTO[];
}

export interface SuperAdminPromoterDTO {
  id: string;
  userId: string;
  username: string;
  email: string;
  phone?: string | null;
  code: string;
  isActive: boolean;
  pagoMovilPhone?: string | null;
  pagoMovilCedula?: string | null;
  pagoMovilBank?: string | null;
  binancePayId?: string | null;
  currentRank: PromoterRank;
  monthlyActivations: number;
  rankBonusUSD: number;
  totalAffiliatedTenants: number;
  pendingBalanceUSD: number;
  paidBalanceUSD: number;
  totalCommissionsUSD: number;
  commissions: PromoterCommissionDTO[];
  createdAt: string;
}

export interface CreatePromoterDTO {
  username: string;
  email: string;
  password?: string;
  code?: string;
  phone?: string;
  pagoMovilPhone?: string;
  pagoMovilCedula?: string;
  pagoMovilBank?: string;
  binancePayId?: string;
}




export * from './banks';
