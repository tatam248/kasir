import { Router, Response } from 'express';
import { db } from '../db/store.ts';
import { authenticate, AuthenticatedRequest, requirePermission, verifySupervisorPin } from '../middleware/auth.ts';
import { Sale, SaleItem, AccountsReceivable } from '../db/types.ts';

const router = Router();

// In-memory held carts for active cashier sessions
const heldCarts: Array<{
  id: string;
  holdNumber: string;
  heldAt: string;
  userId: string;
  userName: string;
  customerId: string | null;
  items: any[];
  notes: string;
}> = [];

// GET /api/sales
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate, customerId, status, search } = req.query;
  const data = db.getData();

  let sales = [...data.sales];

  if (status && status !== 'all') {
    sales = sales.filter((s) => s.status === status);
  }

  if (customerId && customerId !== 'all') {
    sales = sales.filter((s) => s.customerId === customerId);
  }

  if (startDate) {
    sales = sales.filter((s) => s.saleDate.slice(0, 10) >= (startDate as string));
  }
  if (endDate) {
    sales = sales.filter((s) => s.saleDate.slice(0, 10) <= (endDate as string));
  }

  if (search) {
    const q = (search as string).toLowerCase().trim();
    sales = sales.filter((s) => s.invoiceNo.toLowerCase().includes(q));
  }

  // Kasir only sees own sales if restricted
  if (req.user?.roleCode === 'kasir') {
    sales = sales.filter((s) => s.userId === req.user!.id);
  }

  // Enriched with items and customer name
  const enriched = sales.map((s) => {
    const cust = data.customers.find((c) => c.id === s.customerId);
    const user = data.users.find((u) => u.id === s.userId);
    const approver = s.approvedById ? data.users.find((u) => u.id === s.approvedById) : null;
    const items = data.saleItems.filter((si) => si.saleId === s.id).map((si) => {
      const prod = data.products.find((p) => p.id === si.productId);
      return {
        ...si,
        productName: prod?.name || '-',
        sku: prod?.sku || '-',
        barcode: prod?.barcode || '-',
      };
    });

    return {
      ...s,
      customerName: cust?.name || 'Pelanggan Umum',
      userName: user?.name || '-',
      approvedByName: approver?.name || null,
      items,
    };
  });

  return res.json({ success: true, sales: enriched });
});

// GET /api/sales/:id
router.get('/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const data = db.getData();
  const sale = data.sales.find((s) => s.id === id || s.invoiceNo === id);

  if (!sale) return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });

  const cust = data.customers.find((c) => c.id === sale.customerId);
  const user = data.users.find((u) => u.id === sale.userId);
  const items = data.saleItems.filter((si) => si.saleId === sale.id).map((si) => {
    const prod = data.products.find((p) => p.id === si.productId);
    return {
      ...si,
      productName: prod?.name || '-',
      sku: prod?.sku || '-',
      barcode: prod?.barcode || '-',
    };
  });

  return res.json({
    success: true,
    sale: {
      ...sale,
      customerName: cust?.name || 'Pelanggan Umum',
      userName: user?.name || '-',
      items,
      settings: data.storeSettings,
    },
  });
});

// POST /api/sales (POS Checkout)
router.post('/', authenticate, requirePermission('pos.transaction'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      customerId,
      items,
      paymentType,
      amountPaid,
      discountTotal: reqDiscountTotal,
      notes,
      idempotencyToken,
      supervisorPin,
    } = req.body;

    const data = db.getData();

    // 1. Idempotency Check (prevent double charge / double submission)
    if (idempotencyToken && data.idempotencyTokens[idempotencyToken]) {
      const existingSaleId = data.idempotencyTokens[idempotencyToken];
      const existingSale = data.sales.find((s) => s.id === existingSaleId);
      if (existingSale) {
        return res.json({
          success: true,
          message: 'Transaksi sudah berhasil diproses sebelumnya (Idempotent response).',
          sale: existingSale,
          isDuplicate: true,
        });
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Keranjang belanja tidak boleh kosong.' });
    }

    // 2. Validate Items & Stock
    let calculatedSubtotal = 0;
    let totalCostHpp = 0;
    const saleItemsToCreate: SaleItem[] = [];

    for (const cartItem of items) {
      const prod = data.products.find((p) => p.id === cartItem.productId && !p.deletedAt);
      if (!prod) {
        return res.status(400).json({ success: false, message: `Produk '${cartItem.name || cartItem.productId}' tidak ditemukan.` });
      }

      if (prod.status !== 'active') {
        return res.status(400).json({ success: false, message: `Produk '${prod.name}' sedang dinonaktifkan.` });
      }

      const qty = Number(cartItem.qty);
      if (qty <= 0) {
        return res.status(400).json({ success: false, message: `Qty produk '${prod.name}' harus lebih dari 0.` });
      }

      // Check stock
      if (prod.stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Stok tidak mencukupi untuk '${prod.name}'. Sisa stok: ${prod.stock}, diminta: ${qty}.`,
        });
      }

      // Determine price: check if wholesale threshold is met
      let unitPrice = prod.sellingPrice;
      if (prod.minWholesaleQty > 0 && qty >= prod.minWholesaleQty && prod.wholesalePrice > 0) {
        unitPrice = prod.wholesalePrice;
      }

      // Custom price override requested by cashier (requires supervisor PIN if lower than unitPrice)
      if (cartItem.unitPrice !== undefined && Number(cartItem.unitPrice) !== unitPrice) {
        const customPrice = Number(cartItem.unitPrice);
        if (customPrice < unitPrice && !supervisorPin) {
          return res.status(403).json({
            success: false,
            message: `Mengubah harga produk '${prod.name}' di bawah harga normal memerlukan PIN Supervisor.`,
            requiresSupervisor: true,
          });
        }
        if (customPrice < unitPrice && supervisorPin) {
          const supervisor = verifySupervisorPin(supervisorPin);
          if (!supervisor) {
            return res.status(403).json({ success: false, message: 'PIN Supervisor tidak valid.' });
          }
        }
        unitPrice = customPrice;
      }

      const itemDiscount = Number(cartItem.discountAmount) || 0;
      const lineSubtotal = Math.max(0, (qty * unitPrice) - itemDiscount);

      calculatedSubtotal += lineSubtotal;
      const unitCost = prod.avgCost || prod.purchasePrice || 0;
      totalCostHpp += unitCost * qty;

      saleItemsToCreate.push({
        id: `si-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        saleId: '', // set below
        productId: prod.id,
        qty,
        unitPrice,
        unitCost,
        discountAmount: itemDiscount,
        subtotal: lineSubtotal,
        returnedQty: 0,
      });
    }

    // 3. Discount & Tax calculation
    const overallDiscount = Number(reqDiscountTotal) || 0;
    if (overallDiscount > 0 && !supervisorPin && !req.user?.permissions.includes('pos.discount')) {
      return res.status(403).json({
        success: false,
        message: 'Memberikan diskon transaksi memerlukan PIN Supervisor.',
        requiresSupervisor: true,
      });
    }

    const grandTotal = Math.max(0, calculatedSubtotal - overallDiscount);

    // 4. Payment validation
    const validPayments = ['tunai', 'transfer', 'qris', 'ewallet', 'debit', 'kredit'];
    const pType = validPayments.includes(paymentType) ? paymentType : 'tunai';

    let tenderPaid = Number(amountPaid) || 0;
    let changeAmount = 0;

    if (pType === 'tunai') {
      if (tenderPaid < grandTotal) {
        return res.status(400).json({
          success: false,
          message: `Uang diterima (Rp ${tenderPaid.toLocaleString('id-ID')}) kurang dari Total Belanja (Rp ${grandTotal.toLocaleString('id-ID')}).`,
        });
      }
      changeAmount = tenderPaid - grandTotal;
    } else if (pType === 'kredit') {
      if (!customerId || customerId === 'cust-umum') {
        return res.status(400).json({ success: false, message: 'Transaksi kredit wajib memilih pelanggan terdaftar.' });
      }
      const customer = data.customers.find((c) => c.id === customerId);
      if (!customer) return res.status(400).json({ success: false, message: 'Data pelanggan tidak ditemukan.' });

      const currentBalance = customer.receivableBalance || 0;
      const limit = customer.creditLimit || 0;
      if (limit > 0 && (currentBalance + grandTotal) > limit) {
        return res.status(400).json({
          success: false,
          message: `Limit kredit terlampaui. Limit: Rp ${limit.toLocaleString('id-ID')}, Piutang berjalan: Rp ${currentBalance.toLocaleString('id-ID')}, Tambahan: Rp ${grandTotal.toLocaleString('id-ID')}.`,
        });
      }
      tenderPaid = 0;
      changeAmount = 0;
    } else {
      // Transfer / QRIS / E-wallet / Debit: exact payment
      tenderPaid = grandTotal;
      changeAmount = 0;
    }

    // 5. Generate Invoice Number (e.g., INV20260928-0001)
    const now = new Date();
    const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = data.storeSettings.invoicePrefix || 'INV';
    const todaySalesCount = data.sales.filter((s) => s.saleDate.startsWith(now.toISOString().slice(0, 10))).length + 1;
    const invoiceNo = `${prefix}-${datePrefix}-${String(todaySalesCount).padStart(4, '0')}`;

    const saleId = `sale-${Date.now()}`;
    const activeShift = data.cashierShifts.find((cs) => cs.userId === req.user!.id && cs.status === 'open');

    // 6. Atomic Sale Object
    const sale: Sale = {
      id: saleId,
      invoiceNo,
      saleDate: now.toISOString(),
      customerId: customerId || null,
      userId: req.user!.id,
      shiftId: activeShift ? activeShift.id : null,
      subtotal: calculatedSubtotal,
      discountTotal: overallDiscount,
      taxTotal: 0,
      grandTotal,
      totalCostHpp,
      paymentType: pType,
      amountPaid: tenderPaid,
      changeAmount,
      status: 'selesai',
      cancelReason: null,
      approvedById: null,
      idempotencyToken: idempotencyToken || null,
      notes: notes || '',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    saleItemsToCreate.forEach((si) => (si.saleId = saleId));

    // 7. Atomic Execution: Update Product Stocks & Stock Movements
    for (const si of saleItemsToCreate) {
      const prod = data.products.find((p) => p.id === si.productId)!;
      const oldStock = prod.stock;
      prod.stock = oldStock - si.qty;
      prod.updatedAt = now.toISOString();

      db.recordStockMovement({
        movementDate: now.toISOString(),
        productId: prod.id,
        movementType: 'penjualan',
        referenceNo: invoiceNo,
        stockBefore: oldStock,
        stockIn: 0,
        stockOut: si.qty,
        stockAfter: prod.stock,
        costPrice: si.unitCost,
        userId: req.user!.id,
        notes: `Penjualan Kasir ${invoiceNo}`,
      });
    }

    // 8. Financial Posting
    if (pType === 'kredit') {
      // Create Accounts Receivable
      const cust = data.customers.find((c) => c.id === customerId)!;
      cust.receivableBalance = (cust.receivableBalance || 0) + grandTotal;
      cust.updatedAt = now.toISOString();

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // Default 30 days credit

      const ar: AccountsReceivable = {
        id: `ar-${Date.now()}`,
        saleId,
        invoiceNo,
        customerId: cust.id,
        totalAmount: grandTotal,
        paidAmount: 0,
        remainingAmount: grandTotal,
        dueDate: dueDate.toISOString().slice(0, 10),
        status: 'belum_lunas',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      data.accountsReceivable.push(ar);
    } else {
      // Cash Flow Entry
      db.addCashTransaction({
        transactionNo: `CSH-${invoiceNo}`,
        transactionDate: now.toISOString(),
        transactionType: 'penjualan',
        category: 'Penjualan Kasir',
        amountIn: grandTotal,
        amountOut: 0,
        referenceNo: invoiceNo,
        userId: req.user!.id,
        notes: `Penerimaan kas penjualan ${pType.toUpperCase()} ${invoiceNo}`,
      });

      // Update active shift totals if cash
      if (activeShift && pType === 'tunai') {
        activeShift.cashSalesTotal += grandTotal;
      }
    }

    // Save sale & items
    data.sales.push(sale);
    data.saleItems.push(...saleItemsToCreate);

    if (idempotencyToken) {
      data.idempotencyTokens[idempotencyToken] = saleId;
    }

    db.save();

    // Log Audit
    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'SALE_CHECKOUT',
      module: 'POS',
      recordId: sale.id,
      details: `Transaksi Kasir ${invoiceNo} berhasil diproses. Metode: ${pType}, Grand Total: Rp ${grandTotal.toLocaleString('id-ID')}.`,
      ipAddress: req.ip || null,
    });

    const cust = data.customers.find((c) => c.id === customerId);
    return res.status(201).json({
      success: true,
      message: 'Transaksi penjualan berhasil disimpan.',
      sale: {
        ...sale,
        customerName: cust?.name || 'Pelanggan Umum',
        userName: req.user!.name,
        items: saleItemsToCreate.map((si) => {
          const prod = data.products.find((p) => p.id === si.productId);
          return {
            ...si,
            productName: prod?.name,
            sku: prod?.sku,
            barcode: prod?.barcode,
          };
        }),
        settings: data.storeSettings,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/sales/:id/cancel (Cancel / Void Transaction)
router.post('/:id/cancel', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, supervisorPin } = req.body;

    const data = db.getData();
    const sale = data.sales.find((s) => s.id === id);
    if (!sale) return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });

    if (sale.status === 'batal') {
      return res.status(400).json({ success: false, message: 'Transaksi ini sudah dibatalkan sebelumnya.' });
    }

    // Check permission or supervisor PIN
    let approverId = req.user!.id;
    if (!req.user!.permissions.includes('pos.cancel')) {
      if (!supervisorPin) {
        return res.status(403).json({
          success: false,
          message: 'Membatalkan transaksi memerlukan PIN Supervisor.',
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
    const saleItems = data.saleItems.filter((si) => si.saleId === sale.id);

    // 1. Revert product stocks & record stock movement reversal
    for (const si of saleItems) {
      const prod = data.products.find((p) => p.id === si.productId);
      if (prod) {
        const oldStock = prod.stock;
        prod.stock = oldStock + si.qty;
        prod.updatedAt = now;

        db.recordStockMovement({
          movementDate: now,
          productId: prod.id,
          movementType: 'penyesuaian_stok',
          referenceNo: `VOID-${sale.invoiceNo}`,
          stockBefore: oldStock,
          stockIn: si.qty,
          stockOut: 0,
          stockAfter: prod.stock,
          costPrice: si.unitCost,
          userId: req.user!.id,
          notes: `Pembatalan Transaksi ${sale.invoiceNo}. Alasan: ${reason || 'Pembatalan kasir'}`,
        });
      }
    }

    // 2. Revert cash or accounts receivable
    if (sale.paymentType === 'kredit') {
      const ar = data.accountsReceivable.find((a) => a.saleId === sale.id);
      if (ar) {
        const cust = data.customers.find((c) => c.id === ar.customerId);
        if (cust) {
          cust.receivableBalance = Math.max(0, cust.receivableBalance - ar.remainingAmount);
        }
        ar.status = 'lunas'; // mark settled/voided
      }
    } else {
      // Deduct from cash
      db.addCashTransaction({
        transactionNo: `CSH-VOID-${sale.invoiceNo}`,
        transactionDate: now,
        transactionType: 'penyesuaian_kas',
        category: 'Pembatalan Transaksi Penjualan',
        amountIn: 0,
        amountOut: sale.grandTotal,
        referenceNo: `VOID-${sale.invoiceNo}`,
        userId: req.user!.id,
        notes: `Reversal pembatalan ${sale.invoiceNo}. Alasan: ${reason || 'Void kasir'}`,
      });
    }

    sale.status = 'batal';
    sale.cancelReason = reason || 'Dibatalkan oleh kasir / supervisor';
    sale.approvedById = approverId;
    sale.updatedAt = now;

    db.save();

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'CANCEL_SALE',
      module: 'POS',
      recordId: sale.id,
      details: `Transaksi ${sale.invoiceNo} dibatalkan oleh ${req.user!.username} (Approval: ${approverId}). Alasan: ${sale.cancelReason}.`,
      ipAddress: req.ip || null,
    });

    return res.json({ success: true, message: `Transaksi ${sale.invoiceNo} berhasil dibatalkan dan stok dikembalikan.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// --- HOLD AND RECALL ORDERS ---
router.get('/hold/list', authenticate, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ success: true, heldCarts });
});

router.post('/hold', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { items, customerId, notes } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Keranjang kosong tidak bisa di-hold.' });
  }

  const holdId = `hold-${Date.now()}`;
  const holdNumber = `HOLD-${String(heldCarts.length + 1).padStart(2, '0')}`;
  const entry = {
    id: holdId,
    holdNumber,
    heldAt: new Date().toISOString(),
    userId: req.user!.id,
    userName: req.user!.name,
    customerId: customerId || null,
    items,
    notes: notes || 'Transaksi ditahan',
  };

  heldCarts.push(entry);
  return res.status(201).json({ success: true, message: `Transaksi berhasil ditahan (#${holdNumber}).`, heldCart: entry });
});

router.delete('/hold/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const idx = heldCarts.findIndex((h) => h.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Hold transaksi tidak ditemukan.' });

  const removed = heldCarts.splice(idx, 1)[0];
  return res.json({ success: true, message: 'Hold transaksi dipanggil / dibersihkan.', heldCart: removed });
});

export default router;
