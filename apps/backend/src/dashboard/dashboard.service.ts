import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, IsNull } from 'typeorm';
import { RawMaterial } from '../entities/raw-material.entity';
import { Product } from '../entities/product.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OperatingExpense } from '../entities/operating-expense.entity';
import { Investment } from '../entities/investment.entity';
import { Reservation } from '../entities/reservation.entity';
import { MovementType, OrderStatus, InvestmentType, ReservationStatus, PaymentStatus } from '@finowork/shared-types';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(RawMaterial) private rawMaterialRepo: Repository<RawMaterial>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(StockMovement) private movementRepo: Repository<StockMovement>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private orderItemRepo: Repository<OrderItem>,
    @InjectRepository(OperatingExpense) private expenseRepo: Repository<OperatingExpense>,
    @InjectRepository(Investment) private investmentRepo: Repository<Investment>,
    @InjectRepository(Reservation) private reservationRepo: Repository<Reservation>,
  ) {}

  async getSummary(tenantId: string) {
    const { isValidUUID } = require('../utils/tenant-crypto');
    if (!isValidUUID(tenantId)) {
      return {
        totalRawMaterialCapital: 0,
        totalFinishedProductCapital: 0,
        totalInventoryCapital: 0,
        reinvestmentExpense: 0,
        totalExternalInvestment: 0,
        totalRegisteredReinvestment: 0,
        totalConsolidatedReinvestment: 0,
        totalConsolidatedInvestment: 0,
        expectedRevenue: 0,
        lowStockMaterials: [],
        lowStockProducts: [],
        totalLosses: 0,
        historicalInvestment: 0,
        historicalRevenue: 0,
        historicalProfit: 0,
        payrollExpenses: 0,
        salesChart: [],
        topProducts: []
      };
    }

    const rawMaterials = await this.rawMaterialRepo.find({
      where: [
        { tenantId, isActive: true },
        { tenantId, isActive: IsNull() }
      ]
    });
    const activeMaterialIds = new Set(rawMaterials.map(rm => rm.id));

    const products = await this.productRepo.find({
      where: { tenantId },
      relations: { recipe: { rawMaterial: true } }
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
            if (item.rawMaterial && activeMaterialIds.has(item.rawMaterial.id)) {
              const rmId = item.rawMaterial.id;
              rawMaterialDebt[rmId] = (rawMaterialDebt[rmId] || 0) + (item.quantity * deficit);
            }
          }
        }
      }
    }

    let totalFinishedProductCapital = 0;
    
    for (const p of products) {
      if (p.stockQuantity > 0) {
        if (p.recipe && p.recipe.length > 0) {
          let costToProduce = 0;
          for (const item of p.recipe) {
            if (item.rawMaterial) {
              costToProduce += item.quantity * item.rawMaterial.costPerUnit;
            }
          }
          totalFinishedProductCapital += costToProduce * p.stockQuantity;
        } else {
          // Negocios de reventa directa (Retail sin receta)
          const unitCost = Number(p.cost || p.estimatedCost || 0);
          totalFinishedProductCapital += p.stockQuantity * unitCost;
        }
      }
    }

    const totalRawMaterialCapital = rawMaterials.reduce((acc, rm) => acc + (rm.stockQuantity * rm.costPerUnit), 0);
    const totalInventoryCapital = totalRawMaterialCapital + totalFinishedProductCapital;
    
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

    // Agregaciones eficientes en base de datos para pérdidas
    const lossRes = await this.orderRepo.createQueryBuilder('o')
      .select('COALESCE(SUM(CASE WHEN o.totalCost > 0 THEN o.totalCost ELSE o.totalAmount END), 0)', 'total')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.status = :status', { status: OrderStatus.CERRADO_CON_PERDIDA })
      .getRawOne();
    const orderLosses = Number(lossRes?.total || 0);

    const moveLossRes = await this.movementRepo.createQueryBuilder('m')
      .select('COALESCE(SUM(m.totalCost), 0)', 'total')
      .where('m.tenantId = :tenantId', { tenantId })
      .andWhere('m.type = :type', { type: MovementType.LOSS })
      .getRawOne();
    const totalLosses = Number(moveLossRes?.total || 0) + orderLosses;

    // Inversión histórica en compras
    const invRes = await this.movementRepo.createQueryBuilder('m')
      .select('COALESCE(SUM(m.totalCost), 0)', 'total')
      .where('m.tenantId = :tenantId', { tenantId })
      .andWhere('m.type = :type', { type: MovementType.IN_PURCHASE })
      .getRawOne();
    const historicalInvestment = Number(invRes?.total || 0);

    // Ingreso histórico de pedidos no cancelados
    const revRes = await this.orderRepo.createQueryBuilder('o')
      .select('COALESCE(SUM(o.totalAmount), 0)', 'total')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.status IN (:...statuses)', { statuses: [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.DELIVERED] })
      .getRawOne();
    const orderRevenue = Number(revRes?.total || 0);

    // Ingreso histórico de citas completadas y pagadas no facturadas previamente por POS
    const resRevRes = await this.reservationRepo.createQueryBuilder('r')
      .select('COALESCE(SUM(r.totalAmount), 0)', 'total')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.status = :status', { status: ReservationStatus.COMPLETED })
      .andWhere('r.paymentStatus = :paymentStatus', { paymentStatus: PaymentStatus.PAID })
      .andWhere('(r.orderId IS NULL OR r.orderId = :empty)', { empty: '' })
      .getRawOne();
    const reservationRevenue = Number(resRevRes?.total || 0);

    const historicalRevenue = orderRevenue + reservationRevenue;
    
    // Gastos de nómina
    const payRes = await this.expenseRepo.createQueryBuilder('e')
      .select('COALESCE(SUM(e.amount), 0)', 'total')
      .where('e.tenantId = :tenantId', { tenantId })
      .andWhere('e.category = :category', { category: 'PAYROLL' })
      .getRawOne();
    const payrollExpenses = Number(payRes?.total || 0);
    
    const reinvestmentExpense = historicalInvestment - totalInventoryCapital;

    // Inversión y Reinversión manual consolidada
    const investments = await this.investmentRepo.find({ where: { negocioId: tenantId } });
    let totalExternalInvestment = 0;
    let totalRegisteredReinvestment = 0;

    for (const inv of investments) {
      const usd = Number(inv.amountUSD || 0);
      if (inv.type === InvestmentType.INVERSION_EXTERNA) {
        totalExternalInvestment += usd;
      } else if (inv.type === InvestmentType.REINVERSION_GANANCIA) {
        totalRegisteredReinvestment += usd;
      }
    }

    const totalConsolidatedReinvestment = reinvestmentExpense + totalRegisteredReinvestment;
    const totalConsolidatedInvestment = totalExternalInvestment + totalConsolidatedReinvestment;
    const historicalProfit = historicalRevenue - totalConsolidatedReinvestment - payrollExpenses;

    // Calcular ventas de los últimos 7 días únicamente
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const recentOrders = await this.orderRepo.find({
      where: [
        { status: OrderStatus.PENDING, tenantId, createdAt: MoreThanOrEqual(sevenDaysAgo) },
        { status: OrderStatus.PREPARING, tenantId, createdAt: MoreThanOrEqual(sevenDaysAgo) },
        { status: OrderStatus.DELIVERED, tenantId, createdAt: MoreThanOrEqual(sevenDaysAgo) }
      ],
      select: { createdAt: true, totalAmount: true }
    });

    const salesByDay: Record<string, number> = {};
    last7Days.forEach(d => salesByDay[d] = 0);

    recentOrders.forEach(o => {
      const dateStr = new Date(o.createdAt).toISOString().split('T')[0];
      if (salesByDay[dateStr] !== undefined) {
        salesByDay[dateStr] += Number(o.totalAmount || 0);
      }
    });

    const recentReservations = await this.reservationRepo.createQueryBuilder('r')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.status = :status', { status: ReservationStatus.COMPLETED })
      .andWhere('r.paymentStatus = :paymentStatus', { paymentStatus: PaymentStatus.PAID })
      .andWhere('(r.orderId IS NULL OR r.orderId = :empty)', { empty: '' })
      .andWhere('(r.date >= :minDateStr OR r.createdAt >= :sevenDaysAgo)', {
        minDateStr: last7Days[0],
        sevenDaysAgo
      })
      .select(['r.date', 'r.createdAt', 'r.totalAmount'])
      .getMany();

    recentReservations.forEach(r => {
      const dateStr = r.date
        ? (typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0])
        : new Date(r.createdAt).toISOString().split('T')[0];
      if (salesByDay[dateStr] !== undefined) {
        salesByDay[dateStr] += Number(r.totalAmount || 0);
      }
    });

    const salesChart = last7Days.map(date => ({
      date,
      total: Number(salesByDay[date].toFixed(2))
    }));

    // Productos más vendidos mediante consulta agregada
    const topItemsRaw = await this.orderItemRepo.createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .select('item.productId', 'productId')
      .addSelect('item.productName', 'productName')
      .addSelect('SUM(item.quantity)', 'totalQuantity')
      .addSelect('SUM(item.subtotal)', 'totalRevenue')
      .where('order.tenantId = :tenantId', { tenantId })
      .andWhere('order.status IN (:...statuses)', { statuses: [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.DELIVERED] })
      .groupBy('item.productId')
      .addGroupBy('item.productName')
      .orderBy('"totalQuantity"', 'DESC')
      .limit(5)
      .getRawMany();

    const topProducts = topItemsRaw.map(r => ({
      name: r.productName || 'Producto',
      quantity: Number(r.totalQuantity || 0),
      revenue: Number(Number(r.totalRevenue || 0).toFixed(2))
    }));

    return {
      totalRawMaterialCapital,
      totalFinishedProductCapital,
      totalInventoryCapital,
      reinvestmentExpense,
      totalExternalInvestment: Number(totalExternalInvestment.toFixed(2)),
      totalRegisteredReinvestment: Number(totalRegisteredReinvestment.toFixed(2)),
      totalConsolidatedReinvestment: Number(totalConsolidatedReinvestment.toFixed(2)),
      totalConsolidatedInvestment: Number(totalConsolidatedInvestment.toFixed(2)),
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
      payrollExpenses,
      salesChart,
      topProducts
    };
  }
}
