export type Product = {
  id: string;
  name: string;
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
  product?: Product;
  quantity: number;
  deliveredQuantity?: number;
  unitPrice: number;
  unitCost?: number;
  subtotal: number;
  removedIngredients?: string[];
  addedExtras?: OrderItemExtra[];
  hasModifications?: boolean;
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
};

export type TreasurySummary = {
  cashUSD: number;
  bankBs: number;
  puntoBs: number;
  pagoMovilBs: number;
  transferBs: number;
  exchangeRate: number;
  currencySymbol: string;
  bankBsEquivalentUSD: number;
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
