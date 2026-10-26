import { Router, Response } from 'express';
import { db } from '../db/store.ts';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.ts';

const router = Router();

// GET /api/reports/dashboard (Dashboard Real-Time Stats with Filter)
router.get('/dashboard', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { period, startDate: customStart, endDate: customEnd } = req.query;
  const data = db.getData();

  const now = new Date();
  let startStr = now.toISOString().slice(0, 10);
  let endStr = now.toISOString().slice(0, 10);

  if (period === 'kemarin') {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    startStr = y.toISOString().slice(0, 10);
    endStr = startStr;
  } else if (period === 'minggu_ini') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const mon = new Date(now.setDate(diff));
    startStr = mon.toISOString().slice(0, 10);
    endStr = new Date().toISOString().slice(0, 10);
  } else if (period === 'bulan_ini') {
    startStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    endStr = new Date().toISOString().slice(0, 10);
  } else if (period === 'custom' && customStart && customEnd) {
    startStr = customStart as string;
    endStr = customEnd as string;
  }

  // 1. Filter completed sales in period
  const periodSales = data.sales.filter(
    (s) =>
      s.status !== 'batal' &&
      s.saleDate.slice(0, 10) >= startStr &&
      s.saleDate.slice(0, 10) <= endStr
  );

  const salesCount = periodSales.length;
  const omzetTotal = periodSales.reduce((acc, curr) => acc + curr.grandTotal, 0);
  const hppTotal = periodSales.reduce((acc, curr) => acc + curr.totalCostHpp, 0);
  const labaKotor = omzetTotal - hppTotal;

  // 2. Filter Purchases in period
  const periodPurchases = data.purchases.filter(
    (p) =>
      p.shippingStatus === 'diterima' &&
      p.purchaseDate >= startStr &&
      p.purchaseDate <= endStr
  );
  const totalPurchaseValue = periodPurchases.reduce((acc, curr) => acc + curr.grandTotal, 0);

  // 3. Stock Indicators
  const activeProducts = data.products.filter((p) => !p.deletedAt && p.status === 'active');
  const totalStockUnits = activeProducts.reduce((acc, curr) => acc + curr.stock, 0);
  const outOfStockCount = activeProducts.filter((p) => p.stock <= 0).length;
  const lowStockCount = activeProducts.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
  const safeStockCount = activeProducts.filter((p) => p.stock > p.minStock).length;

  // 4. Receivables & Payables
  const totalReceivables = data.accountsReceivable
    .filter((ar) => ar.status !== 'lunas')
    .reduce((acc, curr) => acc + curr.remainingAmount, 0);

  const totalPayables = data.accountsPayable
    .filter((ap) => ap.status !== 'lunas')
    .reduce((acc, curr) => acc + curr.remainingAmount, 0);

  // 5. Cash Flows in period
  const periodCash = data.cashTransactions.filter(
    (ct) =>
      ct.transactionDate.slice(0, 10) >= startStr &&
      ct.transactionDate.slice(0, 10) <= endStr
  );
  const cashIn = periodCash.reduce((acc, curr) => acc + curr.amountIn, 0);
  const cashOut = periodCash.reduce((acc, curr) => acc + curr.amountOut, 0);
  const cashBalance = db.getCashBalance();

  // 6. Top Selling Products
  const productSaleStats: { [prodId: string]: { name: string; sku: string; qty: number; revenue: number } } = {};
  for (const s of periodSales) {
    const items = data.saleItems.filter((si) => si.saleId === s.id);
    for (const item of items) {
      if (!productSaleStats[item.productId]) {
        const prod = data.products.find((p) => p.id === item.productId);
        productSaleStats[item.productId] = {
          name: prod?.name || 'Produk',
          sku: prod?.sku || '-',
          qty: 0,
          revenue: 0,
        };
      }
      productSaleStats[item.productId].qty += item.qty;
      productSaleStats[item.productId].revenue += item.subtotal;
    }
  }

  const topSelling = Object.values(productSaleStats)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // 7. Last 7 Days Daily Sales Chart Data
  const last7Days: Array<{ date: string; label: string; omzet: number; profit: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'numeric' });

    const daySales = data.sales.filter((s) => s.status !== 'batal' && s.saleDate.startsWith(dateKey));
    const dayOmzet = daySales.reduce((acc, curr) => acc + curr.grandTotal, 0);
    const dayHpp = daySales.reduce((acc, curr) => acc + curr.totalCostHpp, 0);

    last7Days.push({
      date: dateKey,
      label: dayLabel,
      omzet: dayOmzet,
      profit: dayOmzet - dayHpp,
    });
  }

  // Hide HPP/Profit if cashier
  const isKasir = req.user?.roleCode === 'kasir';

  return res.json({
    success: true,
    filter: { period: period || 'hari_ini', startDate: startStr, endDate: endStr },
    summary: {
      omzetTotal,
      salesCount,
      labaKotor: isKasir ? undefined : labaKotor,
      totalPurchaseValue: isKasir ? undefined : totalPurchaseValue,
      totalStockUnits,
      outOfStockCount,
      lowStockCount,
      safeStockCount,
      totalReceivables,
      totalPayables: isKasir ? undefined : totalPayables,
      cashIn,
      cashOut,
      cashBalance,
    },
    topSelling,
    last7Days: last7Days.map((d) => ({
      ...d,
      profit: isKasir ? undefined : d.profit,
    })),
  });
});

// GET /api/reports/sales (Detailed Sales Report)
router.get('/sales', authenticate, requirePermission('report.sales'), (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate, groupBy } = req.query;
  const data = db.getData();

  let sales = data.sales.filter((s) => s.status !== 'batal');
  if (startDate) sales = sales.filter((s) => s.saleDate.slice(0, 10) >= (startDate as string));
  if (endDate) sales = sales.filter((s) => s.saleDate.slice(0, 10) <= (endDate as string));

  const isKasir = req.user?.roleCode === 'kasir';

  // Groupings: 'product' | 'category' | 'cashier' | 'customer' | 'daily'
  if (groupBy === 'product') {
    const map: { [id: string]: { name: string; sku: string; category: string; qty: number; total: number; hpp: number; profit: number } } = {};
    for (const s of sales) {
      const items = data.saleItems.filter((si) => si.saleId === s.id);
      for (const item of items) {
        if (!map[item.productId]) {
          const prod = data.products.find((p) => p.id === item.productId);
          const cat = data.categories.find((c) => c.id === prod?.categoryId);
          map[item.productId] = {
            name: prod?.name || '-',
            sku: prod?.sku || '-',
            category: cat?.name || '-',
            qty: 0,
            total: 0,
            hpp: 0,
            profit: 0,
          };
        }
        map[item.productId].qty += item.qty;
        map[item.productId].total += item.subtotal;
        map[item.productId].hpp += item.unitCost * item.qty;
        map[item.productId].profit = map[item.productId].total - map[item.productId].hpp;
      }
    }

    const rows = Object.values(map)
      .sort((a, b) => b.total - a.total)
      .map((r) => ({
        ...r,
        hpp: isKasir ? undefined : r.hpp,
        profit: isKasir ? undefined : r.profit,
      }));

    return res.json({ success: true, rows });
  }

  if (groupBy === 'category') {
    const catMap: { [catId: string]: { categoryName: string; qty: number; total: number; profit: number } } = {};
    for (const s of sales) {
      const items = data.saleItems.filter((si) => si.saleId === s.id);
      for (const item of items) {
        const prod = data.products.find((p) => p.id === item.productId);
        const catId = prod?.categoryId || 'unknown';
        const cat = data.categories.find((c) => c.id === catId);
        if (!catMap[catId]) {
          catMap[catId] = { categoryName: cat?.name || 'Lain-lain', qty: 0, total: 0, profit: 0 };
        }
        catMap[catId].qty += item.qty;
        catMap[catId].total += item.subtotal;
        const lineHpp = item.unitCost * item.qty;
        catMap[catId].profit += item.subtotal - lineHpp;
      }
    }
    return res.json({ success: true, rows: Object.values(catMap).sort((a, b) => b.total - a.total) });
  }

  if (groupBy === 'cashier') {
    const userMap: { [userId: string]: { userName: string; transactions: number; total: number } } = {};
    for (const s of sales) {
      const user = data.users.find((u) => u.id === s.userId);
      const uid = s.userId;
      if (!userMap[uid]) {
        userMap[uid] = { userName: user?.name || '-', transactions: 0, total: 0 };
      }
      userMap[uid].transactions++;
      userMap[uid].total += s.grandTotal;
    }
    return res.json({ success: true, rows: Object.values(userMap).sort((a, b) => b.total - a.total) });
  }

  // Default: daily summary
  const dayMap: { [day: string]: { date: string; transactions: number; total: number; hpp: number; profit: number } } = {};
  for (const s of sales) {
    const d = s.saleDate.slice(0, 10);
    if (!dayMap[d]) {
      dayMap[d] = { date: d, transactions: 0, total: 0, hpp: 0, profit: 0 };
    }
    dayMap[d].transactions++;
    dayMap[d].total += s.grandTotal;
    dayMap[d].hpp += s.totalCostHpp;
    dayMap[d].profit = dayMap[d].total - dayMap[d].hpp;
  }

  const rows = Object.values(dayMap)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((r) => ({
      ...r,
      hpp: isKasir ? undefined : r.hpp,
      profit: isKasir ? undefined : r.profit,
    }));

  return res.json({ success: true, rows });
});

// GET /api/reports/profit (Laporan Laba Kotor HPP)
router.get('/profit', authenticate, requirePermission('report.profit'), (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate } = req.query;
  const data = db.getData();

  let sales = data.sales.filter((s) => s.status !== 'batal');
  if (startDate) sales = sales.filter((s) => s.saleDate.slice(0, 10) >= (startDate as string));
  if (endDate) sales = sales.filter((s) => s.saleDate.slice(0, 10) <= (endDate as string));

  const totalPenjualanBersih = sales.reduce((acc, curr) => acc + curr.grandTotal, 0);
  const totalHpp = sales.reduce((acc, curr) => acc + curr.totalCostHpp, 0);
  const totalLabaKotor = totalPenjualanBersih - totalHpp;
  const marginPersen = totalPenjualanBersih > 0 ? (totalLabaKotor / totalPenjualanBersih) * 100 : 0;

  // Breakdown by product
  const productMargins: { [id: string]: { name: string; sku: string; qty: number; revenue: number; costHpp: number; grossProfit: number; marginPct: number } } = {};
  for (const s of sales) {
    const items = data.saleItems.filter((si) => si.saleId === s.id);
    for (const item of items) {
      if (!productMargins[item.productId]) {
        const prod = data.products.find((p) => p.id === item.productId);
        productMargins[item.productId] = {
          name: prod?.name || '-',
          sku: prod?.sku || '-',
          qty: 0,
          revenue: 0,
          costHpp: 0,
          grossProfit: 0,
          marginPct: 0,
        };
      }
      productMargins[item.productId].qty += item.qty;
      productMargins[item.productId].revenue += item.subtotal;
      productMargins[item.productId].costHpp += item.unitCost * item.qty;
    }
  }

  const breakdown = Object.values(productMargins)
    .map((pm) => {
      const grossProfit = pm.revenue - pm.costHpp;
      const marginPct = pm.revenue > 0 ? (grossProfit / pm.revenue) * 100 : 0;
      return {
        ...pm,
        grossProfit,
        marginPct: Number(marginPct.toFixed(1)),
      };
    })
    .sort((a, b) => b.grossProfit - a.grossProfit);

  return res.json({
    success: true,
    summary: {
      totalPenjualanBersih,
      totalHpp,
      totalLabaKotor,
      marginPersen: Number(marginPersen.toFixed(2)),
    },
    breakdown,
  });
});

export default router;
