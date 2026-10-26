import { Router, Response } from 'express';
import { db } from '../db/store.ts';
import { authenticate, AuthenticatedRequest, requirePermission, verifySupervisorPin } from '../middleware/auth.ts';
import { SalesReturn, SalesReturnItem } from '../db/types.ts';

const router = Router();

// GET /api/returns
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const returns = data.salesReturns.map((sr) => {
    const sale = data.sales.find((s) => s.id === sr.saleId);
    const user = data.users.find((u) => u.id === sr.userId);
    const approver = data.users.find((u) => u.id === sr.approvedById);
    const items = data.salesReturnItems.filter((sri) => sri.returnId === sr.id).map((sri) => {
      const prod = data.products.find((p) => p.id === sri.productId);
      return {
        ...sri,
        productName: prod?.name || '-',
      };
    });

    return {
      ...sr,
      invoiceNo: sale?.invoiceNo || '-',
      userName: user?.name || '-',
      approvedByName: approver?.name || '-',
      items,
    };
  });

  return res.json({ success: true, returns });
});

// POST /api/returns
router.post('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { saleId, items, reason, refundMethod, supervisorPin } = req.body;
    if (!saleId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'ID Transaksi dan daftar barang retur wajib diisi.' });
    }

    const data = db.getData();
    const sale = data.sales.find((s) => s.id === saleId || s.invoiceNo === saleId);
    if (!sale) return res.status(404).json({ success: false, message: 'Transaksi asli tidak ditemukan.' });

    if (sale.status === 'batal') {
      return res.status(400).json({ success: false, message: 'Transaksi ini telah dibatalkan, tidak bisa diretur.' });
    }

    // Permission or Supervisor Approval check
    let approverId = req.user!.id;
    if (!req.user!.permissions.includes('pos.refund')) {
      if (!supervisorPin) {
        return res.status(403).json({
          success: false,
          message: 'Memproses retur penjualan memerlukan PIN Supervisor.',
          requiresSupervisor: true,
        });
      }
      const supervisor = verifySupervisorPin(supervisorPin);
      if (!supervisor) {
        return res.status(403).json({ success: false, message: 'PIN Supervisor tidak valid.' });
      }
      approverId = supervisor.id;
    }

    const now = new Date().toISOString();
    const returnId = `ret-${Date.now()}`;
    const returnNo = `RET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(data.salesReturns.length + 1).padStart(4, '0')}`;

    let totalRefund = 0;
    const returnItemsToCreate: SalesReturnItem[] = [];

    for (const item of items) {
      const saleItem = data.saleItems.find((si) => si.id === item.saleItemId && si.saleId === sale.id);
      if (!saleItem) {
        return res.status(400).json({ success: false, message: `Item penjualan ID '${item.saleItemId}' tidak ditemukan.` });
      }

      const prod = data.products.find((p) => p.id === saleItem.productId);
      if (!prod) continue;

      const returnQty = Number(item.qty);
      const remainingAllowed = saleItem.qty - (saleItem.returnedQty || 0);

      if (returnQty <= 0) continue;
      if (returnQty > remainingAllowed) {
        return res.status(400).json({
          success: false,
          message: `Jumlah retur untuk '${prod.name}' (${returnQty}) melebihi sisa yang dapat diretur (${remainingAllowed}).`,
        });
      }

      const refundPrice = Number(item.refundPrice !== undefined ? item.refundPrice : saleItem.unitPrice);
      const lineRefund = returnQty * refundPrice;
      totalRefund += lineRefund;

      saleItem.returnedQty = (saleItem.returnedQty || 0) + returnQty;

      const condition = item.conditionType === 'rusak' ? 'rusak' : 'bagus';

      // If condition is 'bagus', restore sellable stock
      if (condition === 'bagus') {
        const oldStock = prod.stock;
        prod.stock = oldStock + returnQty;
        prod.updatedAt = now;

        db.recordStockMovement({
          movementDate: now,
          productId: prod.id,
          movementType: 'retur_penjualan',
          referenceNo: returnNo,
          stockBefore: oldStock,
          stockIn: returnQty,
          stockOut: 0,
          stockAfter: prod.stock,
          costPrice: saleItem.unitCost,
          userId: req.user!.id,
          notes: `Retur penjualan dari invoice ${sale.invoiceNo} (Kondisi Bagus)`,
        });
      } else {
        // Damaged: track in stock movement as damaged
        db.recordStockMovement({
          movementDate: now,
          productId: prod.id,
          movementType: 'barang_rusak',
          referenceNo: returnNo,
          stockBefore: prod.stock,
          stockIn: 0,
          stockOut: 0,
          stockAfter: prod.stock,
          costPrice: saleItem.unitCost,
          userId: req.user!.id,
          notes: `Retur barang rusak dari invoice ${sale.invoiceNo}`,
        });
      }

      returnItemsToCreate.push({
        id: `sri-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        returnId,
        saleItemId: saleItem.id,
        productId: prod.id,
        qty: returnQty,
        refundPrice,
        subtotal: lineRefund,
        conditionType: condition,
      });
    }

    if (returnItemsToCreate.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada item yang diretur.' });
    }

    // Refund execution
    const rMethod = refundMethod || 'tunai';
    if (rMethod === 'potong_piutang') {
      const ar = data.accountsReceivable.find((a) => a.saleId === sale.id);
      if (ar) {
        ar.remainingAmount = Math.max(0, ar.remainingAmount - totalRefund);
        if (ar.remainingAmount === 0) ar.status = 'lunas';
      }
      if (sale.customerId) {
        const cust = data.customers.find((c) => c.id === sale.customerId);
        if (cust) cust.receivableBalance = Math.max(0, cust.receivableBalance - totalRefund);
      }
    } else {
      // Cash/transfer refund
      db.addCashTransaction({
        transactionNo: `CSH-${returnNo}`,
        transactionDate: now,
        transactionType: 'refund_retur',
        category: 'Pengembalian Dana Retur Penjualan',
        amountIn: 0,
        amountOut: totalRefund,
        referenceNo: returnNo,
        userId: req.user!.id,
        notes: `Refund retur ${returnNo} (Invoice: ${sale.invoiceNo})`,
      });
    }

    // Check if fully returned
    const allSaleItems = data.saleItems.filter((si) => si.saleId === sale.id);
    const fullyReturned = allSaleItems.every((si) => si.returnedQty >= si.qty);
    sale.status = fullyReturned ? 'retur_total' : 'retur_sebagian';
    sale.updatedAt = now;

    const salesReturn: SalesReturn = {
      id: returnId,
      returnNo,
      saleId: sale.id,
      returnDate: now,
      userId: req.user!.id,
      approvedById: approverId,
      totalRefund,
      reason: reason || 'Retur produk konsumen',
      refundMethod: rMethod,
      status: 'completed',
      createdAt: now,
    };

    data.salesReturns.push(salesReturn);
    data.salesReturnItems.push(...returnItemsToCreate);
    db.save();

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'SALES_RETURN',
      module: 'Retur',
      recordId: salesReturn.id,
      details: `Retur ${returnNo} untuk Invoice ${sale.invoiceNo}. Total Refund: Rp ${totalRefund.toLocaleString('id-ID')}. Disetujui oleh: ${approverId}.`,
      ipAddress: req.ip || null,
    });

    return res.status(201).json({
      success: true,
      message: `Retur penjualan berhasil diproses (#${returnNo}). Refund sebesar Rp ${totalRefund.toLocaleString('id-ID')}.`,
      salesReturn,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
