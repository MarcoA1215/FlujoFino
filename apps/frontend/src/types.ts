export type ProductVariant = {
  id?: string;
  productId?: string;
  name: string;
  sku?: string;
  attributes?: Record<string, any>;
  stockQuantity: number;
  cost?: number | null;
  salePrice?: number | null;
  images?: string[];
  isTaxExempt?: boolean;
  taxRate?: number;
};

export type Product = {
  id: string;
  name: string;
  code?: string;
  description?: string;
  category?: string;
  salePrice: number;
  stockQuantity: number;
  durationMinutes?: number;
  isCombo?: boolean;
  isPreAssembled?: boolean;
  comboItems?: { id: string; componentId: string; quantity: number; component?: any }[];
  recipe?: any[];
  physicalStock?: number;
  reservedQuantity?: number;
  images?: string[];
  estimatedCost?: number;
  baseCost?: number;
  assignedStaffIds?: string[];
  cost?: number;
  stock?: number;
  is_service?: boolean;
  product_type?: 'REVENTA' | 'FORMULA' | 'SERVICIO';
  availabilityType?: 'INMEDIATO' | 'BAJO_ENCARGO';
  isSupplierPreorder?: boolean;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  isTaxExempt?: boolean;
  taxRate?: number;
};

export type RawMaterial = {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  stockQuantity: number;
  minStockAlert: number;
  isActive?: boolean;
  allowAsExtra?: boolean;
  extraPriceType?: 'COST' | 'MARGIN_PERCENT' | 'FIXED_PRICE';
  extraPriceValue?: number;
};

export type OrderItemExtra = {
  rawMaterialId: string;
  name: string;
  priceUSD: number;
  quantity: number;
};

export type OrderItem = {
  id?: string;
  productId: string;
  productName?: string;
  variantId?: string;
  variantName?: string;
  product?: Product;
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
};

export type RecipeItem = {
  id?: string;
  rawMaterialId: string;
  rawMaterialName: string;
  unit: string;
  quantity: number;
  costPerUnit: number;
  totalItemCost: number;
};

export type Movement = {
  id: string;
  type: string;
  quantity: number;
  totalCost: number;
  createdAt: string;
  description: string;
};

export type MonthlySummary = {
  month: string;
  monthLabel: string;
  currencySymbol?: string;
  exchangeRate?: number;
  exchangeRateCop?: number;
  invoicedRevenue: number;
  collectedRevenue: number;
  pendingReceivable: number;
  costOfGoodsSold?: number;
  operatingExpenses?: number;
  cogs: number;
  expenses: number;
  payroll: number;
  losses: number;
  netProfit: number;
  ordersCount: number;
  paidOrdersCount: number;
  pendingOrdersCount?: number;
  unpaidBookingsCount?: number;
  unpaidBookingsAmount?: number;
  byMethod?: Record<string, number>;
  breakdown?: {
    cashUSD: number;
    digitalUSD: number;
    cashBs?: number;
    cashBsUSD?: number;
    pagoMovilBs: number;
    pagoMovilUSD: number;
    puntoBs: number;
    puntoUSD: number;
    transferBs: number;
    transferUSD: number;
    cashCop?: number;
    cashCopUSD?: number;
    bankCop?: number;
    bankCopUSD?: number;
  };
};

export type DashboardSummary = {
  totalRawMaterialCapital: number;
  expectedRevenue: number;
  lowStockMaterials: {
    id: string;
    name: string;
    realStock: number;
    effectiveStock: number;
    debt: number;
    unit: string;
  }[];
  lowStockProducts: {
    id: string;
    name: string;
    stock: number;
    toProduce: number;
  }[];
  totalLosses: number;
  historicalInvestment: number;
  reinvestmentExpense: number;
  totalInventoryCapital: number;
  historicalProfit: number;
  historicalRevenue: number;
  salesChart: {
    date: string;
    total: number;
  }[];
  topProducts: {
    name: string;
    quantity: number;
    revenue: number;
  }[];
  totalConsolidatedInvestment?: number;
  totalExternalInvestment?: number;
  totalConsolidatedReinvestment?: number;
  payrollExpenses?: number;
  treasury?: TreasurySummary;
  monthlySummary?: MonthlySummary | null;
};

export type TreasurySummary = {
  cashUSD: number;
  digitalUSD?: number;
  bankBs: number;
  cashBs?: number;
  cashCop?: number;
  bankCop?: number;
  initialCashUSD?: number;
  initialBankBs?: number;
  initialCashBs?: number;
  initialDigitalUSD?: number;
  initialCashCop?: number;
  initialBankCop?: number;
  puntoBs: number;
  pagoMovilBs: number;
  transferBs: number;
  exchangeRate: number;
  exchangeRateCop?: number;
  enableCopCurrency?: boolean;
  currencySymbol: string;
  bankBsEquivalentUSD: number;
  cashBsEquivalentUSD?: number;
  copEquivalentUSD?: number;
  bankCopEquivalentUSD?: number;
  totalRealUSD: number;
  totalExchangedUSD: number;
  totalExchangedBs: number;
  exchangeHistory?: Array<{
    id: string;
    amountBs: number;
    amountUSD: number;
    exchangeRate: number;
    operationType: string;
    destination?: string;
    notes?: string;
    createdAt: string;
  }>;
};



export type DeliveryZone = {
  id: string;
  name: string;
  feePrice: number;
  priceUSD?: number;
};
