import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RawMaterial } from '../entities/raw-material.entity';
import { Product } from '../entities/product.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { MovementType, OrderStatus } from '@nutrideli/shared-types';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(RawMaterial) private rawMaterialRepo: Repository<RawMaterial>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(StockMovement) private movementRepo: Repository<StockMovement>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private orderItemRepo: Repository<OrderItem>
  ) {}

  async getSummary() {
    const rawMaterials = await this.rawMaterialRepo.find();
    const products = await this.productRepo.find({
      relations: { recipe: { rawMaterial: true } }
    });
    const movements = await this.movementRepo.find();
    
    // Solo tomamos en cuenta pedidos que no están cancelados
    const orders = await this.orderRepo.find({
      where: [
        { status: OrderStatus.PENDING },
        { status: OrderStatus.PREPARING },
        { status: OrderStatus.DELIVERED }
      ],
      relations: { items: { product: true } },
      withDeleted: true
    });

    const rawMaterialDebt: Record<string, number> = {};
    const lowStockProducts: { id: string; name: string; stock: number; toProduce: number }[] = [];

    for (const p of products) {
      if (p.stockQuantity < 0) {
        const deficit = Math.abs(p.stockQuantity);
        lowStockProducts.push({
          id: p.id,
          name: p.name,
          stock: p.stockQuantity,
          toProduce: deficit
        });

        if (p.recipe && p.recipe.length > 0) {
          for (const item of p.recipe) {
            if (item.rawMaterial) {
              const rmId = item.rawMaterial.id;
              rawMaterialDebt[rmId] = (rawMaterialDebt[rmId] || 0) + (item.quantity * deficit);
            }
          }
        }
      }
    }

    const totalRawMaterialCapital = rawMaterials.reduce((acc, rm) => acc + (rm.stockQuantity * rm.costPerUnit), 0);
    
    const lowStockMaterials = rawMaterials.map(rm => {
      const debt = rawMaterialDebt[rm.id] || 0;
      const effectiveStock = rm.stockQuantity - debt;
      return {
        ...rm,
        effectiveStock,
        debt
      };
    }).filter(rm => rm.effectiveStock <= rm.minStockAlert);
    
    const expectedRevenue = products.reduce((acc, p) => {
      const stock = p.stockQuantity > 0 ? p.stockQuantity : 0;
      return acc + (stock * p.salePrice);
    }, 0);

    const totalLosses = movements
      .filter(m => m.type === MovementType.LOSS)
      .reduce((acc, m) => acc + m.totalCost, 0);

    const historicalInvestment = movements
      .filter(m => m.type === MovementType.IN_PURCHASE)
      .reduce((acc, m) => acc + m.totalCost, 0);

    const historicalRevenue = orders.reduce((acc, o) => acc + o.totalAmount, 0);
    const historicalProfit = historicalRevenue - historicalInvestment;

    // Calcular ventas de los ultimos 7 dias
    const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const salesByDay: Record<string, number> = {};
    last7Days.forEach(d => salesByDay[d] = 0);

    orders.forEach(o => {
      const dateStr = new Date(o.createdAt).toISOString().split('T')[0];
      if (salesByDay[dateStr] !== undefined) {
        salesByDay[dateStr] += o.totalAmount;
      }
    });

    const salesChart = last7Days.map(date => ({
      date,
      total: salesByDay[date]
    }));

    // Productos mas vendidos
    const productSalesCount: Record<string, {name: string, quantity: number, revenue: number}> = {};
    orders.forEach(o => {
      o.items.forEach(item => {
        if (!productSalesCount[item.productId]) {
          productSalesCount[item.productId] = { name: item.productName || (item.product ? item.product.name : 'Producto Eliminado'), quantity: 0, revenue: 0 };
        }
        productSalesCount[item.productId].quantity += item.quantity;
        productSalesCount[item.productId].revenue += item.subtotal;
      });
    });

    const topProducts = Object.values(productSalesCount)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      totalRawMaterialCapital,
      expectedRevenue,
      lowStockMaterials: lowStockMaterials.map(m => ({
        id: m.id,
        name: m.name,
        realStock: m.stockQuantity,
        effectiveStock: m.effectiveStock,
        debt: m.debt,
        unit: m.unit
      })),
      lowStockProducts,
      totalLosses,
      historicalInvestment,
      historicalRevenue,
      historicalProfit,
      salesChart,
      topProducts
    };
  }
}
