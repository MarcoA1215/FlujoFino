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

export interface ProductVariantDTO {
  id?: string;
  productId?: string;
  tenantId?: string;
  name: string;
  sku?: string;
  attributes?: Record<string, any>;
  stockQuantity: number;
  cost?: number;
  salePrice?: number;
  images?: string[];
  isTaxExempt?: boolean;
  taxRate?: number;
}

export interface ProductDTO {
  id?: string;
  name: string;
  code?: string;
  description?: string;
  category?: string;
  images?: string[];
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
  hasVariants?: boolean;
  variants?: ProductVariantDTO[];
  isTaxExempt?: boolean;
  taxRate?: number;
}

export interface OrderItemDTO {
  id?: string;
  productId: string;
  productName?: string;
  variantId?: string;
  variantName?: string;
  employeeId?: string;
  quantity: number;
  deliveredQuantity?: number;
  unitPrice: number;
  unitCost?: number;
  subtotal: number;
  removedIngredients?: string[];
  addedExtras?: OrderItemExtra[];
  hasModifications?: boolean;
  isTaxExempt?: boolean;
  taxRate?: number;
  taxAmount?: number;
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
  subtotalExempt?: number;
  taxableBase?: number;
  taxAmount?: number;
  customerId?: string;
  identification?: string;
  requestedDeliveryDate?: string | Date;
  nextAbonoDueDate?: string | Date;
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
  bsReceived?: number;
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

export interface ReservationServiceSpecialistDTO {
  serviceId: string;
  serviceName?: string;
  employeeId?: string;
  employeeName?: string;
  durationMinutes?: number;
  price?: number;
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
  durationMinutes?: number;
  rescheduleReason?: string;
  originalTime?: string;
  originalDate?: string;
  rescheduleStatus?: string;
  employeeId?: string;
  employeeName?: string;
  serviceSpecialists?: ReservationServiceSpecialistDTO[];
  isSimultaneous?: boolean;
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
  enableCopCurrency?: boolean;
  exchangeRateCop?: number;
  exchangeRateCopMode?: 'AUTO' | 'MANUAL';
  manualExchangeRateCop?: number | null;
  companyCopBank?: string;
  companyCopAccountNumber?: string;
  companyCopAccountHolder?: string;
  companyCopAccountType?: string;
  companyCopCedula?: string;
  binancePayId?: string;
  binanceEmail?: string;
  binancePhone?: string;
  allowPartialPayments?: boolean;
  minDepositPercentage?: number;
  allowCashierBypassDeposit?: boolean;
  abonoDefaultDueDays?: number;
  acceptCashUsd?: boolean;
  acceptCashBs?: boolean;
  acceptPagoMovil?: boolean;
  acceptCardPos?: boolean;
  acceptBinance?: boolean;
  acceptTransfer?: boolean;
  acceptCashCop?: boolean;
  acceptTransferCop?: boolean;
  initialCashUSD?: number;
  initialBankBs?: number;
  initialCashBs?: number;
  initialDigitalUSD?: number;
  initialCashCop?: number;
  initialBankCop?: number;
  featureCustomerSchedules?: boolean;
  featureRecipes?: boolean;
  featureBuySell?: boolean;
  featureProduction?: boolean;
  featureDelivery?: boolean;
  featureShowCatalog?: boolean;
  bookingRequireService?: boolean;
  bookingAllowStaffSelection?: boolean;
  allowSimultaneousServices?: boolean;
  requireApprovalAlways?: boolean;
  businessHours?: any;
  services?: any[];
  slotInterval?: number;
  themePrimaryColor?: string;
  themeHeaderColor?: string;
  allowNegativeStock?: boolean;
  publicToken?: string;
  featureFiscalSupport?: boolean;
  fiscalDefaultTaxRate?: number;
  fiscalRif?: string;
  fiscalCompanyName?: string;
  fiscalAddress?: string;
  fiscalPhone?: string;
  fiscalMode?: 'INTERNAL' | 'UNIDIGITAL';
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
  months?: number;
  subtotal?: number;
  ivaAmount?: number;
  isTest?: boolean;
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
  subtotalFee?: number;
  ivaPercentage?: number;
  ivaAmount?: number;
  finalFee: number;
  isTest?: boolean;
}

export interface UpdateTenantPlanDTO {
  planType?: TenantPlanType;
  status?: TenantStatus;
  extendDays?: number;
  basePrice?: number;
  referredByTenantId?: string | null;
  isTest?: boolean;
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
  subtotalFee?: number;
  ivaPercentage?: number;
  ivaAmount?: number;
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
  BONUS = 'BONUS',
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

export interface PromoterMilestoneDTO {
  targetActivations: number;
  bonusUSD: number;
  activationsNeeded: number;
  progressPercentage: number;
  label: string;
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
  notes?: string | null;
  createdAt: string;
}

export type PromoterReferralSubStatus = 'ACTIVE' | 'PAST_DUE' | 'TRIAL' | 'INACTIVE';

export interface PromoterAffiliatedTenantDTO {
  tenantId: string;
  tenantName: string;
  status: TenantStatus;
  subStatus: PromoterReferralSubStatus;
  subStatusLabel: string;
  planType: TenantPlanType;
  createdAt: string;
  trialEndsAt?: string | null;
  currentPeriodEndsAt?: string | null;
  daysRemaining?: number | null;
  daysOverdue?: number | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  totalCommissionsUSD: number;
  monthlyCommissionsUSD?: number;
  paidCommissionsUSD?: number;
  pendingCommissionsUSD?: number;
  activationCommission?: PromoterCommissionDTO | null;
  recurringCommissionsCount: number;
  recurringCommissionsUSD: number;
}

export interface PromoterStatsDTO {
  promoterId: string;
  promoterName?: string;
  code: string;
  currentRank: PromoterRank;
  rankEmoji: string;
  monthlyActivations: number;
  activeClientsCount: number;
  pastDueClientsCount: number;
  trialClientsCount: number;
  inactiveClientsCount: number;
  commissionPercentage: number;
  termsAccepted: boolean;
  termsAcceptedAt?: string | null;
  rankBonusUSD: number;
  totalBonusCommissionsUSD?: number;
  nextMilestone?: PromoterMilestoneDTO | null;
  nextRank?: {
    rank: PromoterRank;
    rankEmoji: string;
    activationsNeeded: number;
    clientsNeeded?: number;
    targetPercentage?: number;
    bonusUSD: number;
  } | null;
  monthlyEarnedUSD?: number;
  monthlyPaidUSD?: number;
  monthlyPendingUSD?: number;
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
  termsAccepted: boolean;
  termsAcceptedAt?: string | null;
  activeClientsCount: number;
  commissionPercentage: number;
  pagoMovilPhone?: string | null;
  pagoMovilCedula?: string | null;
  pagoMovilBank?: string | null;
  binancePayId?: string | null;
  currentRank: PromoterRank;
  monthlyActivations: number;
  rankBonusUSD: number;
  totalBonusCommissionsUSD?: number;
  totalAffiliatedTenants: number;
  pendingBalanceUSD: number;
  paidBalanceUSD: number;
  totalCommissionsUSD: number;
  commissions: PromoterCommissionDTO[];
  affiliatedTenants?: PromoterAffiliatedTenantDTO[];
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

export enum FiscalDocumentType {
  INVOICE = 'INVOICE',
  CREDIT_NOTE = 'CREDIT_NOTE',
  DEBIT_NOTE = 'DEBIT_NOTE',
}

export enum FiscalInvoiceStatus {
  DRAFT = 'DRAFT',
  PENDING_FISCAL = 'PENDING_FISCAL',
  ISSUED = 'ISSUED',
  REJECTED = 'REJECTED',
  CANCELED = 'CANCELED',
}

export enum FiscalProviderType {
  INTERNAL = 'INTERNAL',
  UNIDIGITAL = 'UNIDIGITAL',
}

export interface FiscalInvoiceItemDTO {
  id?: string;
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  isTaxExempt: boolean;
  isExempt?: boolean;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
}

export interface FiscalInvoiceDTO {
  id: string;
  tenantId: string;
  orderId?: string | null;
  documentType: FiscalDocumentType;
  provider: FiscalProviderType;
  status: FiscalInvoiceStatus;
  invoiceNumber: string;
  fiscalControlNumber?: string | null;
  series?: string | null;
  customerName: string;
  customerRif: string;
  customerAddress?: string | null;
  customerPhone?: string | null;
  subtotalExempt: number;
  taxableBase: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  amountBs: number;
  exchangeRate: number;
  externalGuid?: string | null;
  qrCodeUrl?: string | null;
  pdfUrl?: string | null;
  rejectionReason?: string | null;
  items?: FiscalInvoiceItemDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface IssueFiscalInvoiceDTO {
  orderId?: string;
  customerName?: string;
  customerRif?: string;
  customerAddress?: string;
  customerPhone?: string;
}

export type AppUpdateChangeType = 'ADDED' | 'IMPLEMENTED' | 'FIXED' | 'REMOVED';

export interface AppUpdateItem {
  type: AppUpdateChangeType;
  text: string;
}

export interface AppUpdateDTO {
  id: string;
  title: string;
  version?: string | null;
  summary?: string | null;
  changes: AppUpdateItem[];
  isPublished: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppUpdateDTO {
  title: string;
  version?: string;
  summary?: string;
  changes: AppUpdateItem[];
  isPublished?: boolean;
}

export interface UpdateAppUpdateDTO {
  title?: string;
  version?: string;
  summary?: string;
  changes?: AppUpdateItem[];
  isPublished?: boolean;
}

export enum PlatformExpenseType {
  OPERATING = 'OPERATING',             // Servidores, hosting, herramientas operativas (OPEX)
  INVESTMENT = 'INVESTMENT',           // Publicidad, marketing, equipamiento, desarrollo (CAPEX)
  OWNER_PAYOUT = 'OWNER_PAYOUT',       // Pago o retiro de utilidades al dueño/fundador
  TAX_SENIAT = 'TAX_SENIAT',           // Pago de impuestos / IVA al SENIAT
  PROMOTER_PAYOUT = 'PROMOTER_PAYOUT', // Liquidación de comisiones a promotores
}

export enum PlatformExpenseCategory {
  SERVIDORES = 'SERVIDORES',
  DOMINIOS_APIS = 'DOMINIOS_APIS',
  PUBLICIDAD_MARKETING = 'PUBLICIDAD_MARKETING',
  DESARROLLO_TECNOLOGIA = 'DESARROLLO_TECNOLOGIA',
  EQUIPAMIENTO = 'EQUIPAMIENTO',
  RETIRO_DUEÑO = 'RETIRO_DUEÑO',
  SENIAT_IVA = 'SENIAT_IVA',
  COMISION_PROMOTOR = 'COMISION_PROMOTOR',
  OTRO = 'OTRO',
}

export interface PlatformExpenseDTO {
  id: string;
  type: PlatformExpenseType;
  category: string;
  description: string;
  amount: number;
  amountBs?: number | null;
  exchangeRate?: number | null;
  paymentMethod: string;
  reference?: string | null;
  expenseDate: string;
  taxPeriod?: string | null;
  promoterId?: string | null;
  promoterName?: string | null;
  createdAt: string;
}

export interface CreatePlatformExpenseDTO {
  type: PlatformExpenseType;
  category: string;
  description: string;
  amount: number;
  amountBs?: number;
  exchangeRate?: number;
  paymentMethod?: string;
  reference?: string;
  expenseDate?: string;
  taxPeriod?: string;
  promoterId?: string;
}

export interface RecordSeniatTaxPaymentDTO {
  amount: number;
  amountBs?: number;
  exchangeRate?: number;
  taxPeriod: string;
  reference: string;
  paymentMethod?: string;
  notes?: string;
  paymentDate?: string;
}

export interface SuperAdminFinanceMetricsDTO {
  // Ingresos
  grossRevenueUSD: number;
  totalIVACollectedUSD: number;
  netRevenueUSD: number;

  // Impuestos (SENIAT)
  totalIVAPaidSeniatUSD: number;
  pendingIVASeniatUSD: number;

  // Deuda y pagos con promotores
  totalPromotersDebtUSD: number;
  totalPromotersPaidUSD: number;

  // Salidas del SaaS
  totalOperatingExpensesUSD: number;
  totalInvestmentUSD: number;
  totalOwnerPayoutsUSD: number;
  totalPromoterPayoutsUSD: number;
  totalExpensesUSD: number;

  // Caja y Utilidad
  netOperatingProfitUSD: number;
  availableCashUSD: number;
}

export * from './banks';
