import { Injectable, BadRequestException } from '@nestjs/common';
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
import { CashExchange } from '../entities/cash-exchange.entity';
import { Settings } from '../entities/settings.entity';
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
    @InjectRepository(CashExchange) private cashExchangeRepo: Repository<CashExchange>,
    @InjectRepository(Settings) private settingsRepo: Repository<Settings>,
  ) {}

  async getSummary(tenantId: string, month?: string) {
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
        topProducts: [],
        monthlySummary: null,
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
    
    // Costo acumulado a nivel de items vendidos en órdenes activas
    const orderItemCostRes = await this.orderItemRepo.createQueryBuilder('item')
      .innerJoin('item.order', 'o')
      .leftJoin('item.product', 'prod')
      .select('COALESCE(SUM(item.quantity * CASE WHEN item.unitCost > 0 THEN item.unitCost WHEN prod.estimatedCost > 0 THEN prod.estimatedCost WHEN prod.cost > 0 THEN prod.cost ELSE 0 END), 0)', 'total')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.status IN (:...statuses)', { statuses: [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.DELIVERED] })
      .getRawOne();
    const orderItemCost = Number(orderItemCostRes?.total || 0);

    const ordersCostRes = await this.orderRepo.createQueryBuilder('o')
      .select('COALESCE(SUM(o.totalCost), 0)', 'total')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.status IN (:...statuses)', { statuses: [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.DELIVERED] })
      .getRawOne();
    const ordersCost = Number(ordersCostRes?.total || 0);

    const finalOrderCost = Math.max(ordersCost, orderItemCost);

    // Costo de citas completadas y pagadas sin orden POS
    const standaloneReservations = await this.reservationRepo.createQueryBuilder('r')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.status = :status', { status: ReservationStatus.COMPLETED })
      .andWhere('r.paymentStatus = :paymentStatus', { paymentStatus: PaymentStatus.PAID })
      .andWhere('(r.orderId IS NULL OR r.orderId = :empty)', { empty: '' })
      .select(['r.id', 'r.serviceId'])
      .getMany();

    let standaloneReservationCost = 0;
    if (standaloneReservations.length > 0 && products.length > 0) {
      const prodCostMap = new Map(products.map(p => [p.id, Number(p.estimatedCost || p.cost || 0)]));
      for (const r of standaloneReservations) {
        if (r.serviceId) {
          const ids = r.serviceId.split(',').map(s => s.trim());
          for (const id of ids) {
            standaloneReservationCost += prodCostMap.get(id) || 0;
          }
        }
      }
    }

    const totalCostOfSales = finalOrderCost + standaloneReservationCost;

    // Gastos operativos generales y de nómina
    const expRes = await this.expenseRepo.createQueryBuilder('e')
      .select('COALESCE(SUM(e.amount), 0)', 'total')
      .where('e.tenantId = :tenantId', { tenantId })
      .getRawOne();
    const totalOperatingExpenses = Number(expRes?.total || 0);

    const payRes = await this.expenseRepo.createQueryBuilder('e')
      .select('COALESCE(SUM(e.amount), 0)', 'total')
      .where('e.tenantId = :tenantId', { tenantId })
      .andWhere('e.category = :category', { category: 'PAYROLL' })
      .getRawOne();
    const payrollExpenses = Number(payRes?.total || 0);
    
    const reinvestmentExpense = Math.max(0, historicalInvestment - totalInventoryCapital);

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

    // Descontar costo efectivo de ventas/servicios para calcular margen neto real
    const effectiveProductionCost = Math.max(totalCostOfSales, reinvestmentExpense);
    const historicalProfit = Number((historicalRevenue - effectiveProductionCost - totalRegisteredReinvestment - totalOperatingExpenses).toFixed(2));

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
      topProducts,
      treasury: await this.getTreasurySummary(tenantId),
      monthlySummary: await this.getMonthlySummary(tenantId, month),
    };
  }

  async getMonthlySummary(tenantId: string, monthStr?: string) {
    const now = new Date();
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth(); // 0-indexed

    if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
      const [y, m] = monthStr.split('-').map(Number);
      targetYear = y;
      targetMonth = m - 1;
    }

    const startDate = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
    const formattedMonth = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthLabel = `${monthNames[targetMonth]} ${targetYear}`;

    const settings = await this.settingsRepo.findOne({ where: { tenantId } });
    let rate = Number(settings?.exchangeRateBs || 40.0);
    if (!rate || rate === 40.0) {
      const global = await this.settingsRepo.findOne({ where: { id: 'GLOBAL' } });
      rate = Number(global?.exchangeRateBs || 40.0);
    }
    const currencySymbol = settings?.currencySymbol || 'Bs.';

    const allOrders = (await this.orderRepo.find({ where: { tenantId } })) || [];
    const monthOrders = allOrders.filter(o => {
      if (o.status === OrderStatus.CANCELED || o.status === OrderStatus.CANCELADO_PROVEEDOR) return false;
      const d = new Date(o.createdAt);
      return d >= startDate && d <= endDate;
    });

    let invoicedRevenue = 0;
    let collectedRevenue = 0;
    let pendingReceivable = 0;
    let costOfGoodsSold = 0;
    let paidOrdersCount = 0;
    let pendingOrdersCount = 0;

    let cashUSD = 0;
    let digitalUSD = 0;
    let pagoMovilBs = 0;
    let puntoBs = 0;
    let transferBs = 0;

    for (const o of monthOrders) {
      const total = Number(o.totalAmount || 0);
      const cost = Number(o.totalCost || 0);
      const abonos = Number(o.abonosTotal || 0);
      const orderRate = Number(o.exchangeRate) > 0 ? Number(o.exchangeRate) : rate;

      invoicedRevenue += total;
      costOfGoodsSold += cost;

      if (o.paymentStatus === PaymentStatus.PAID) {
        paidOrdersCount++;
        collectedRevenue += total;
      } else {
        pendingOrdersCount++;
        const paidPart = Math.min(total, Math.max(0, abonos));
        collectedRevenue += paidPart;
        pendingReceivable += Math.max(0, total - paidPart);
      }

      if (Array.isArray(o.splitPayments) && o.splitPayments.length > 0) {
        for (const sp of o.splitPayments) {
          const method = (sp.method || '').toUpperCase();
          const amtUsd = Number(sp.amountUSD) || 0;
          const amtBs = Number(sp.amountBS) > 0 ? Number(sp.amountBS) : Number((amtUsd * orderRate).toFixed(2));
          const effUsd = amtUsd > 0 ? amtUsd : (orderRate > 0 ? amtBs / orderRate : 0);

          if (['PUNTO', 'CARD_POS', 'POS', 'TARJETA'].includes(method)) puntoBs += amtBs;
          else if (['PAGO_MOVIL', 'PAGOMOVIL'].includes(method)) pagoMovilBs += amtBs;
          else if (['TRANSFER', 'TRANSFERENCIA'].includes(method)) transferBs += amtBs;
          else if (['BINANCE', 'BINANCE_USDT', 'USDT', 'ZELLE'].includes(method)) digitalUSD += effUsd;
          else cashUSD += effUsd;
        }
      } else if (o.paymentStatus === PaymentStatus.PAID || (o.paymentStatus === PaymentStatus.PARTIAL && abonos > 0)) {
        const method = (o.paymentMethod || 'USD').toUpperCase();
        const effectivePaidUsd = o.paymentStatus === PaymentStatus.PAID ? total : abonos;
        const effectivePaidBs = Number(o.amountBs) > 0 && o.paymentStatus === PaymentStatus.PAID
          ? Number(o.amountBs)
          : Number((effectivePaidUsd * orderRate).toFixed(2));

        if (['PUNTO', 'CARD_POS', 'POS', 'TARJETA'].includes(method)) puntoBs += effectivePaidBs;
        else if (['PAGO_MOVIL', 'PAGOMOVIL'].includes(method)) pagoMovilBs += effectivePaidBs;
        else if (['TRANSFER', 'TRANSFERENCIA'].includes(method)) transferBs += effectivePaidBs;
        else if (['BINANCE', 'BINANCE_USDT', 'USDT', 'ZELLE'].includes(method)) digitalUSD += effectivePaidUsd;
        else cashUSD += effectivePaidUsd;
      }
    }

    const allExpenses = (await this.expenseRepo.find({ where: { tenantId } })) || [];
    let operatingExpenses = 0;
    for (const exp of allExpenses) {
      if ((exp as any).category === 'FONDO_CAJA') continue;
      const d = new Date((exp as any).date || (exp as any).createdAt || Date.now());
      if (d >= startDate && d <= endDate) {
        operatingExpenses += Number(exp.amount || 0);
      }
    }

    const netProfit = Number((invoicedRevenue - costOfGoodsSold - operatingExpenses).toFixed(2));

    return {
      month: formattedMonth,
      monthLabel,
      currencySymbol,
      exchangeRate: rate,
      invoicedRevenue: Number(invoicedRevenue.toFixed(2)),
      collectedRevenue: Number(collectedRevenue.toFixed(2)),
      pendingReceivable: Number(pendingReceivable.toFixed(2)),
      costOfGoodsSold: Number(costOfGoodsSold.toFixed(2)),
      operatingExpenses: Number(operatingExpenses.toFixed(2)),
      netProfit,
      ordersCount: monthOrders.length,
      paidOrdersCount,
      pendingOrdersCount,
      breakdown: {
        cashUSD: Number(cashUSD.toFixed(2)),
        digitalUSD: Number(digitalUSD.toFixed(2)),
        pagoMovilBs: Number(pagoMovilBs.toFixed(2)),
        pagoMovilUSD: rate > 0 ? Number((pagoMovilBs / rate).toFixed(2)) : 0,
        puntoBs: Number(puntoBs.toFixed(2)),
        puntoUSD: rate > 0 ? Number((puntoBs / rate).toFixed(2)) : 0,
        transferBs: Number(transferBs.toFixed(2)),
        transferUSD: rate > 0 ? Number((transferBs / rate).toFixed(2)) : 0,
      },
    };
  }

  async getLedgerReport(tenantId: string, fromDateStr?: string, toDateStr?: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const startDate = fromDateStr ? new Date(`${fromDateStr}T00:00:00`) : startOfMonth;
    const endDate = toDateStr ? new Date(`${toDateStr}T23:59:59.999`) : endOfToday;

    const orders = (await this.orderRepo.find({ where: { tenantId }, relations: { items: true } })) || [];
    const expenses = (await this.expenseRepo.find({ where: { tenantId } })) || [];
    const movements = (await this.movementRepo.find({ where: { tenantId }, relations: { rawMaterial: true } })) || [];
    const investments = (await this.investmentRepo.find({ where: { negocioId: tenantId } })) || [];

    interface RawLedgerRow {
      timestamp: number;
      date: string;
      time: string;
      reference: string;
      type: string;
      concept: string;
      party: string;
      method: string;
      debe: number;
      haber: number;
    }

    const rawRows: RawLedgerRow[] = [];

    const formatDateTime = (d: Date) => {
      const iso = d.toISOString();
      return {
        date: iso.split('T')[0],
        time: d.toTimeString().slice(0, 5),
      };
    };

    // 1. Orders & Abonos (DEBE)
    for (const o of orders) {
      if (o.status === OrderStatus.CANCELED || o.status === OrderStatus.CANCELADO_PROVEEDOR) continue;
      const shortId = `ORD-${(o.id || '').slice(0, 8).toUpperCase()}`;
      const itemsSummary = Array.isArray(o.items) && o.items.length > 0
        ? o.items.map(i => `${i.quantity}x ${i.productName || 'Producto'}`).join(', ')
        : 'Venta general';

      if (Array.isArray(o.abonosHistory) && o.abonosHistory.length > 0) {
        for (const ab of o.abonosHistory) {
          const abDate = new Date(ab.date || o.createdAt);
          if (abDate >= startDate && abDate <= endDate) {
            const amt = Number(ab.amount || 0);
            if (amt > 0) {
              const dt = formatDateTime(abDate);
              rawRows.push({
                timestamp: abDate.getTime(),
                date: dt.date,
                time: dt.time,
                reference: ab.ref ? `${shortId} (Ref: ${ab.ref})` : shortId,
                type: 'ABONO / COBRO',
                concept: `Abono orden #${shortId}: ${itemsSummary}`,
                party: o.customerName || 'Cliente',
                method: ab.method || o.paymentMethod || 'USD',
                debe: Number(amt.toFixed(2)),
                haber: 0,
              });
            }
          }
        }
      } else if (o.paymentStatus === PaymentStatus.PAID) {
        const oDate = new Date(o.createdAt);
        if (oDate >= startDate && oDate <= endDate) {
          const amt = Number(o.totalAmount || 0);
          if (amt > 0) {
            const dt = formatDateTime(oDate);
            const ref = o.pagoMovilRef || o.puntoRef || o.transferRef || o.binanceRef;
            rawRows.push({
              timestamp: oDate.getTime(),
              date: dt.date,
              time: dt.time,
              reference: ref ? `${shortId} (Ref: ${ref})` : shortId,
              type: 'VENTA PAGADA',
              concept: `Venta #${shortId}: ${itemsSummary}`,
              party: o.customerName || 'Cliente',
              method: o.paymentMethod || 'USD',
              debe: Number(amt.toFixed(2)),
              haber: 0,
            });
          }
        }
      }
    }

    // 2. Operating Expenses & Fondo de Caja
    for (const exp of expenses) {
      const eDate = new Date((exp as any).date || (exp as any).createdAt || Date.now());
      if (eDate >= startDate && eDate <= endDate) {
        const amt = Number(exp.amount || 0);
        if (amt <= 0) continue;
        const dt = formatDateTime(eDate);
        const isFondo = (exp as any).category === 'FONDO_CAJA';
        rawRows.push({
          timestamp: eDate.getTime(),
          date: dt.date,
          time: dt.time,
          reference: `EXP-${(exp.id || '').slice(0, 6).toUpperCase()}`,
          type: isFondo ? 'FONDO DE CAJA' : ((exp as any).category === 'PAYROLL' ? 'NÓMINA' : 'GASTO OPERATIVO'),
          concept: exp.description || 'Gasto operativo',
          party: 'Operaciones Internas',
          method: 'CAJA',
          debe: isFondo ? Number(amt.toFixed(2)) : 0,
          haber: isFondo ? 0 : Number(amt.toFixed(2)),
        });
      }
    }

    // 3. Stock Movements (Purchases -> HABER)
    for (const mov of movements) {
      if (mov.type !== MovementType.IN_PURCHASE) continue;
      const mDate = new Date((mov as any).date || (mov as any).createdAt || Date.now());
      if (mDate >= startDate && mDate <= endDate) {
        const cost = Number(mov.totalCost || 0);
        if (cost <= 0) continue;
        const dt = formatDateTime(mDate);
        rawRows.push({
          timestamp: mDate.getTime(),
          date: dt.date,
          time: dt.time,
          reference: `COMP-${(mov.id || '').slice(0, 6).toUpperCase()}`,
          type: 'COMPRA INSUMOS',
          concept: mov.description || `Compra de ${mov.rawMaterial?.name || 'Insumo'} (${mov.quantity})`,
          party: 'Proveedor',
          method: 'INVENTARIO',
          debe: 0,
          haber: Number(cost.toFixed(2)),
        });
      }
    }

    // 4. Investments
    for (const inv of investments) {
      const iDate = new Date(inv.date || (inv as any).createdAt || Date.now());
      if (iDate >= startDate && iDate <= endDate) {
        const usd = Number(inv.amountUSD || 0);
        if (usd <= 0) continue;
        const dt = formatDateTime(iDate);
        const isExternal = inv.type === InvestmentType.INVERSION_EXTERNA;
        rawRows.push({
          timestamp: iDate.getTime(),
          date: dt.date,
          time: dt.time,
          reference: `INV-${(inv.id || '').slice(0, 6).toUpperCase()}`,
          type: isExternal ? 'APORTE CAPITAL' : 'REINVERSIÓN',
          concept: inv.description || (isExternal ? 'Inversión externa' : 'Reinversión de ganancia'),
          party: 'Socio / Capital',
          method: 'CAPITAL',
          debe: isExternal ? Number(usd.toFixed(2)) : 0,
          haber: isExternal ? 0 : Number(usd.toFixed(2)),
        });
      }
    }

    rawRows.sort((a, b) => a.timestamp - b.timestamp);

    let runningSaldo = 0;
    let totalDebe = 0;
    let totalHaber = 0;

    const entries = rawRows.map((row, idx) => {
      totalDebe += row.debe;
      totalHaber += row.haber;
      runningSaldo += row.debe - row.haber;
      return {
        index: idx + 1,
        date: row.date,
        time: row.time,
        reference: row.reference,
        type: row.type,
        concept: row.concept,
        party: row.party,
        method: row.method,
        debe: Number(row.debe.toFixed(2)),
        haber: Number(row.haber.toFixed(2)),
        saldo: Number(runningSaldo.toFixed(2)),
      };
    });

    return {
      from: startDate.toISOString().split('T')[0],
      to: endDate.toISOString().split('T')[0],
      totalDebe: Number(totalDebe.toFixed(2)),
      totalHaber: Number(totalHaber.toFixed(2)),
      finalSaldo: Number(runningSaldo.toFixed(2)),
      count: entries.length,
      entries,
    };
  }

  async getTreasurySummary(tenantId: string) {
    const orders = (await this.orderRepo.find({ where: { tenantId } })) || [];
    const settings = await this.settingsRepo.findOne({ where: { tenantId } });
    let rate = Number(settings?.exchangeRateBs || 40.0);
    if (!rate || rate === 40.0) {
      const global = await this.settingsRepo.findOne({ where: { id: 'GLOBAL' } });
      rate = Number(global?.exchangeRateBs || 40.0);
    }

    let cashUSDIn = 0;
    let cashUSDOut = 0;
    let digitalUSDIn = 0;
    let puntoBs = 0;
    let pagoMovilBs = 0;
    let transferBs = 0;
    let bsOut = 0;

    for (const o of orders) {
      if (o.status === OrderStatus.CANCELED) continue;
      // Solo contar cobros que hayan sido pagados total o parcialmente
      if (o.paymentStatus !== PaymentStatus.PAID && o.paymentStatus !== PaymentStatus.PARTIAL) continue;

      const orderRate = Number(o.exchangeRate) > 0 ? Number(o.exchangeRate) : rate;

      // Vueltos entregados
      if (o.changeAmount && Number(o.changeAmount) > 0) {
        const changeAmt = Number(o.changeAmount);
        const bsChange = Number(o.changeAmountBs || (changeAmt * orderRate));
        if (o.changeMethod === 'PAGO_MOVIL' || o.changeMethod === 'CASH_BS') {
          bsOut += bsChange;
        } else {
          cashUSDOut += changeAmt;
        }
      }

      // Pagos
      if (Array.isArray(o.splitPayments) && o.splitPayments.length > 0) {
        for (const sp of o.splitPayments) {
          const method = (sp.method || '').toUpperCase();
          const amtUsd = Number(sp.amountUSD) || 0;
          const amtBs = (sp.amountBS !== undefined && sp.amountBS !== null && Number(sp.amountBS) > 0)
            ? Number(sp.amountBS)
            : Number((amtUsd * orderRate).toFixed(2));
          const effectiveUsd = amtUsd > 0 ? amtUsd : (orderRate > 0 ? amtBs / orderRate : 0);

          if (['PUNTO', 'CARD_POS', 'POS', 'TARJETA'].includes(method)) {
            puntoBs += amtBs;
          } else if (['PAGO_MOVIL', 'PAGOMOVIL'].includes(method)) {
            pagoMovilBs += amtBs;
          } else if (['TRANSFER', 'TRANSFERENCIA'].includes(method)) {
            transferBs += amtBs;
          } else if (['USD', 'CASH', 'CASH_USD', 'EFECTIVO'].includes(method)) {
            cashUSDIn += effectiveUsd;
          } else if (['BINANCE', 'BINANCE_USDT', 'USDT', 'ZELLE'].includes(method)) {
            digitalUSDIn += effectiveUsd;
          }
        }
      } else {
        const method = (o.paymentMethod || '').toUpperCase();
        const amtUsd = Number(o.totalAmount || 0);
        const amtBs = (o.amountBs !== undefined && o.amountBs !== null && Number(o.amountBs) > 0)
          ? Number(o.amountBs)
          : Number((amtUsd * orderRate).toFixed(2));

        if (o.paymentStatus === PaymentStatus.PAID) {
          if (['PUNTO', 'CARD_POS', 'POS'].includes(method)) {
            puntoBs += amtBs;
          } else if (['PAGO_MOVIL', 'PAGOMOVIL'].includes(method)) {
            pagoMovilBs += amtBs;
          } else if (['TRANSFER', 'TRANSFERENCIA'].includes(method)) {
            transferBs += amtBs;
          } else if (['USD', 'CASH', 'CASH_USD', 'EFECTIVO'].includes(method)) {
            const usdIn = Number(o.usdReceived) || amtUsd;
            cashUSDIn += usdIn;
          } else if (['BINANCE', 'BINANCE_USDT', 'USDT', 'ZELLE'].includes(method)) {
            digitalUSDIn += amtUsd;
          }
        } else if (o.paymentStatus === PaymentStatus.PARTIAL && Number(o.abonosTotal) > 0) {
          const abonos = Number(o.abonosTotal);
          const abonosBs = Number(o.amountBs) > 0 ? Number(o.amountBs) : Number((abonos * orderRate).toFixed(2));
          if (['USD', 'CASH', 'CASH_USD', 'EFECTIVO'].includes(method)) {
            cashUSDIn += abonos;
          } else if (['BINANCE', 'BINANCE_USDT', 'USDT', 'ZELLE'].includes(method)) {
            digitalUSDIn += abonos;
          } else if (['PAGO_MOVIL'].includes(method)) {
            pagoMovilBs += abonosBs;
          } else if (['PUNTO'].includes(method)) {
            puntoBs += abonosBs;
          } else if (['TRANSFER'].includes(method)) {
            transferBs += abonosBs;
          }
        }
      }
    }

    // Egresos / Gastos operativos
    const expenses = (await this.expenseRepo.find({ where: { tenantId } })) || [];
    let cashExpensesUSD = 0;
    let bankExpensesBs = 0;
    let baseFondoCajaUSD = 0;
    let baseFondoCajaBs = 0;

    for (const exp of expenses) {
      const amt = Number(exp.amount || 0);
      const cat = (exp.category || '').toUpperCase();
      const m = (exp.paymentMethod || '').toUpperCase();

      // Las bases de fondo de caja NO son gastos operativos: son liquidez base para dar vuelto
      if (cat === 'FONDO_CAJA') {
        if (['CASH_BS', 'BS', 'PAGO_MOVIL'].includes(m) || exp.description?.includes('Bs.')) {
          baseFondoCajaBs += (amt * rate);
        } else {
          baseFondoCajaUSD += amt;
        }
        continue;
      }

      if (['CASH', 'CASH_USD', 'USD', 'EFECTIVO'].includes(m)) {
        cashExpensesUSD += amt;
      } else if (['PAGO_MOVIL', 'TRANSFER', 'BANCO', 'BS'].includes(m)) {
        bankExpensesBs += (amt * rate);
      }
    }

    // Compras / Intercambios de divisas (CashExchange)
    const exchanges = (await this.cashExchangeRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    })) || [];

    let totalExchangedBsOut = 0;
    let totalExchangedCashUSDIn = 0;
    let totalExchangedDigitalUSDIn = 0;

    for (const ex of exchanges) {
      const bs = Number(ex.amountBs || 0);
      const usd = Number(ex.amountUSD || 0);
      if (ex.operationType === 'BUY_USD') {
        totalExchangedBsOut += bs;
        if (ex.destination === 'BINANCE_USDT') {
          totalExchangedDigitalUSDIn += usd;
        } else {
          totalExchangedCashUSDIn += usd;
        }
      } else if (ex.operationType === 'SELL_USD') {
        totalExchangedBsOut -= bs;
        if (ex.destination === 'BINANCE_USDT') {
          totalExchangedDigitalUSDIn -= usd;
        } else {
          totalExchangedCashUSDIn -= usd;
        }
      }
    }

    const initialCash = Number(settings?.initialCashUSD || 0);
    const initialBank = Number(settings?.initialBankBs || 0);
    const initialDigital = Number(settings?.initialDigitalUSD || 0);

    const netCashUSD = Number((initialCash + baseFondoCajaUSD + cashUSDIn - cashUSDOut - cashExpensesUSD + totalExchangedCashUSDIn).toFixed(2));
    const netDigitalUSD = Number((initialDigital + digitalUSDIn + totalExchangedDigitalUSDIn).toFixed(2));
    const totalBankBsIn = Number((puntoBs + pagoMovilBs + transferBs).toFixed(2));
    const netBankBs = Number((initialBank + baseFondoCajaBs + totalBankBsIn - bsOut - bankExpensesBs - totalExchangedBsOut).toFixed(2));
    const bankBsEquivalentUSD = rate > 0 ? Number((netBankBs / rate).toFixed(2)) : 0;
    const totalRealUSD = Number((netCashUSD + netDigitalUSD + bankBsEquivalentUSD).toFixed(2));

    return {
      cashUSD: netCashUSD,
      digitalUSD: netDigitalUSD,
      bankBs: netBankBs,
      initialCashUSD: initialCash,
      initialBankBs: initialBank,
      initialDigitalUSD: initialDigital,
      puntoBs: Number(puntoBs.toFixed(2)),
      pagoMovilBs: Number(pagoMovilBs.toFixed(2)),
      transferBs: Number(transferBs.toFixed(2)),
      exchangeRate: rate,
      currencySymbol: settings?.currencySymbol || 'Bs.',
      bankBsEquivalentUSD,
      totalRealUSD,
      totalExchangedUSD: Number((totalExchangedCashUSDIn + totalExchangedDigitalUSDIn).toFixed(2)),
      totalExchangedBs: Number(totalExchangedBsOut.toFixed(2)),
      exchangeHistory: exchanges.slice(0, 15).map(e => ({
        id: e.id,
        amountBs: Number(e.amountBs),
        amountUSD: Number(e.amountUSD),
        exchangeRate: Number(e.exchangeRate),
        operationType: e.operationType,
        destination: e.destination,
        notes: e.notes,
        createdAt: e.createdAt,
      })),
    };
  }

  async buyUsd(tenantId: string, dto: { amountBs: number; amountUSD: number; notes?: string; destination?: string }) {
    if (!dto.amountBs || Number(dto.amountBs) <= 0) {
      throw new BadRequestException('El monto en bolívares debe ser mayor a cero');
    }
    if (!dto.amountUSD || Number(dto.amountUSD) <= 0) {
      throw new BadRequestException('El monto en dólares debe ser mayor a cero');
    }

    const bs = Number(dto.amountBs);
    const usd = Number(dto.amountUSD);
    const effectiveRate = Number((bs / usd).toFixed(4));

    const exchange = this.cashExchangeRepo.create({
      tenantId,
      amountBs: bs,
      amountUSD: usd,
      exchangeRate: effectiveRate,
      operationType: 'BUY_USD',
      source: 'BANCO_BS',
      destination: dto.destination || 'CASH_USD',
      notes: dto.notes ? dto.notes.trim() : `Compra de $${usd.toFixed(2)} con Bs. ${bs.toFixed(2)} (Tasa: ${effectiveRate})`,
    });

    await this.cashExchangeRepo.save(exchange);

    return {
      success: true,
      message: `Compra de $${usd.toFixed(2)} registrada exitosamente a tasa ${effectiveRate}`,
      exchange,
      treasury: await this.getTreasurySummary(tenantId),
    };
  }

  async setInitialTreasury(
    tenantId: string,
    dto: { initialCashUSD: number; initialBankBs: number; initialDigitalUSD?: number }
  ) {
    let settings = await this.settingsRepo.findOne({ where: { tenantId } });
    if (!settings) {
      settings = this.settingsRepo.create({
        id: tenantId,
        tenantId,
        exchangeRateBs: 40.0,
      });
    }

    settings.initialCashUSD = Math.max(0, Number(dto.initialCashUSD || 0));
    settings.initialBankBs = Math.max(0, Number(dto.initialBankBs || 0));
    settings.initialDigitalUSD = Math.max(0, Number(dto.initialDigitalUSD || 0));

    await this.settingsRepo.save(settings);

    return {
      success: true,
      message: 'Saldos iniciales de tesorería guardados correctamente',
      treasury: await this.getTreasurySummary(tenantId),
    };
  }
}
