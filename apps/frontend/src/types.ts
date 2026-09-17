export type Product = {
  id: string;
  name: string;
  category?: string;
  salePrice: number;
  stockQuantity: number;
  isCombo?: boolean;
  isPreAssembled?: boolean;
  comboItems?: { id: string; componentId: string; quantity: number; component?: any }[];
  recipe?: any[];
  physicalStock?: number;
  reservedQuantity?: number;
};

export type RawMaterial = {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  stockQuantity: number;
  minStockAlert: number;
  isActive?: boolean;
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
};



export type DeliveryZone = {
  id: string;
  name: string;
  feePrice: number;
};
