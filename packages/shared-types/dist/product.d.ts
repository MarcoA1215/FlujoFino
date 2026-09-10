export declare enum ProductType {
    INGREDIENT = "INGREDIENT",
    FINISHED_PRODUCT = "FINISHED_PRODUCT"
}
export interface Product {
    id: string;
    name: string;
    description?: string;
    type: ProductType;
    stockQuantity: number;
    unit: string;
    costPrice: number;
    salePrice?: number;
}
