import { Router, Response } from 'express';
import { db } from '../db/store.ts';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.ts';
import { Purchase, PurchaseItem, AccountsPayable } from '../db/types.ts';

const router = Router();

// GET /api/purchases
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const purchases = data.purchases.map((p) => {
    const sup = data.suppliers.find((s) => s.id === p.supplierId);
    const user = data.users.find((u) => u.id === p.userId);
    const items = data.purchaseItems.filter((pi) => pi.purchaseId === p.id).map((pi) => {
      const prod = data.products.find((pr) => pr.id === pi.productId);
      return {
        ...pi,
        productName: prod?.name || '-',
        sku: prod?.sku || '-',
      };
    });

    return {
      ...p,
      supplierName: sup?.name || '-',
      userName: user?.name || '-',
      items,
    };
  });

  return res.json({ success: true, purchases });
});

// POST /api/purchases (Create Purchase Order)
router.post('/', authenticate, requirePermission('purchase.create'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      supplierId,
      invoiceNo,
      purchaseDate,
      paymentType,
      dueDate,
      notes,
      items,
      autoReceive, // If true, immediately post receiving
    } = req.body;

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Supplier dan daftar barang wajib diisi.' });
    }

    const data = db.getData();
    const sup = data.suppliers.find((s) => s.id === supplierId);
    if (!sup) return res.status(400).json({ success: false, message: 'Supplier tidak valid.' });

    const now = new Date().toISOString();
    const count = data.purchases.length + 1;
    const purchaseNo = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(count).padStart(4, '0')}`;

    let subtotal = 0;
    const purchaseItems: PurchaseItem[] = [];

    for (const item of items) {
      const prod = data.products.find((p) => p.id === item.productId && !p.deletedAt);
      if (!prod) {
        return res.status(400).json({ success: false, message: `Produk ID '${item.productId}' tidak ditemukan.` });
      }

      const qty = Number(item.qty);
      const price = Number(item.purchasePrice);
      const discount = Number(item.discount) || 0;
      if (qty <= 0 || price < 0) {
        return res.status(400).json({ success: false, message: 'Qty dan harga beli harus valid.' });
      }

      const lineTotal = (qty * price) - discount;
      subtotal += lineTotal;

      purchaseItems.push({
        id: `pi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        purchaseId: '', // set below
        productId: prod.id,
        qty,
        purchasePrice: price,
        discount,
        subtotal: lineTotal,
      });
    }

    const taxTotal = 0;
    const grandTotal = subtotal + taxTotal;
    const purchaseId = `po-${Date.now()}`;

    const isCredit = paymentType === 'kredit';
    const paymentStatus = isCredit ? 'belum_lunas' : 'lunas';
    const shouldReceiveNow = !!autoReceive;

    const purchase: Purchase = {
      id: purchaseId,
      purchaseNo,
      invoiceNo: invoiceNo || purchaseNo,
      purchaseDate: purchaseDate || now.slice(0, 10),
      supplierId,
      userId: req.user!.id,
      subtotal,
      discountTotal: 0,
      taxTotal,
      grandTotal,
      paymentType: paymentType || 'tunai',
      paymentStatus,
      dueDate: isCredit ? dueDate || null : null,
      shippingStatus: shouldReceiveNow ? 'diterima' : 'dipesan',
      receivedAt: shouldReceiveNow ? now : null,
      notes: notes || '',
      createdAt: now,
      updatedAt: now,
    };

    // Attach items
    purchaseItems.forEach((pi) => (pi.purchaseId = purchaseId));
    data.purchases.push(purchase);
    data.purchaseItems.push(...purchaseItems);

    // If autoReceive is checked, post stock movements and update Weighted Average Cost immediately!
    if (shouldReceiveNow) {
      for (const pi of purchaseItems) {
        const prod = data.products.find((p) => p.id === pi.productId)!;
        const oldStock = prod.stock;
        const oldAvgCost = prod.avgCost || prod.purchasePrice || 0;
        const incomingQty = pi.qty;
        const incomingPrice = pi.purchasePrice;

        // Weighted Average Cost formula:
        // ((old_stock * old_avg_cost) + (incoming_qty * incoming_price)) / (old_stock + incoming_qty)
        const totalValue = (Math.max(0, oldStock) * oldAvgCost) + (incomingQty * incomingPrice);
        const newTotalStock = Math.max(0, oldStock) + incomingQty;
        const newAvgCost = newTotalStock > 0 ? totalValue / newTotalStock : incomingPrice;

        prod.stock = oldStock + incomingQty;
        prod.purchasePrice = incomingPrice;
        prod.avgCost = Number(newAvgCost.toFixed(2));
        prod.updatedAt = now;

        db.recordStockMovement({
          movementDate: now,
          productId: prod.id,
          movementType: 'pembelian',
          referenceNo: purchase.purchaseNo,
          stockBefore: oldStock,
          stockIn: incomingQty,
          stockOut: 0,
          stockAfter: prod.stock,
          costPrice: incomingPrice,
          userId: req.user!.id,
          notes: `Penerimaan PO ${purchase.purchaseNo} dari ${sup.name}`,
        });
      }

      // If credit, create accounts payable
      if (isCredit) {
        const payable: AccountsPayable = {
          id: `ap-${Date.now()}`,
          purchaseId: purchase.id,
          supplierId: sup.id,
          invoiceNo: purchase.invoiceNo || purchase.purchaseNo,
          totalAmount: grandTotal,
          paidAmount: 0,
          remainingAmount: grandTotal,
          dueDate: dueDate || now.slice(0, 10),
          status: 'belum_lunas',
          createdAt: now,
          updatedAt: now,
        };
        data.accountsPayable.push(payable);
      } else {
        // Record Cash Out
        db.addCashTransaction({
          transactionNo: `CSH-PO-${Date.now().toString().slice(-6)}`,
          transactionDate: now,
          transactionType: 'pembelian',
          category: 'Pembelian Barang Supplier',
          amountIn: 0,
          amountOut: grandTotal,
          referenceNo: purchase.purchaseNo,
          userId: req.user!.id,
          notes: `Pembayaran ${purchase.paymentType} pembelian PO ${purchase.purchaseNo} (${sup.name})`,
        });
      }
    }

    db.save();

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'CREATE_PURCHASE',
      module: 'Pembelian',
      recordId: purchase.id,
      details: `Membuat PO ${purchase.purchaseNo} ke ${sup.name} senilai Rp ${grandTotal.toLocaleString('id-ID')}. Status pengiriman: ${purchase.shippingStatus}.`,
      ipAddress: req.ip || null,
    });

    return res.status(201).json({
      success: true,
      message: shouldReceiveNow
        ? 'Pembelian berhasil disimpan dan stok otomatis bertambah dengan kalkulasi HPP Rata-rata Tertimbang.'
        : 'Purchase Order berhasil dibuat.',
      purchase,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/purchases/:id/receive (Post Goods Receiving)
router.post('/:id/receive', authenticate, requirePermission('purchase.approve'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = db.getData();
    const purchase = data.purchases.find((p) => p.id === id);

    if (!purchase) return res.status(404).json({ success: false, message: 'PO tidak ditemukan.' });
    if (purchase.shippingStatus === 'diterima') {
      return res.status(400).json({ success: false, message: 'Barang dari PO ini sudah diterima sebelumnya.' });
    }

    const now = new Date().toISOString();
    const items = data.purchaseItems.filter((pi) => pi.purchaseId === purchase.id);
    const sup = data.suppliers.find((s) => s.id === purchase.supplierId);

    for (const pi of items) {
      const prod = data.products.find((p) => p.id === pi.productId);
      if (!prod) continue;

      const oldStock = prod.stock;
      const oldAvgCost = prod.avgCost || prod.purchasePrice || 0;
      const incomingQty = pi.qty;
      const incomingPrice = pi.purchasePrice;

      const totalValue = (Math.max(0, oldStock) * oldAvgCost) + (incomingQty * incomingPrice);
      const newTotalStock = Math.max(0, oldStock) + incomingQty;
      const newAvgCost = newTotalStock > 0 ? totalValue / newTotalStock : incomingPrice;

      prod.stock = oldStock + incomingQty;
      prod.purchasePrice = incomingPrice;
      prod.avgCost = Number(newAvgCost.toFixed(2));
      prod.updatedAt = now;

      db.recordStockMovement({
        movementDate: now,
        productId: prod.id,
        movementType: 'pembelian',
        referenceNo: purchase.purchaseNo,
        stockBefore: oldStock,
        stockIn: incomingQty,
        stockOut: 0,
        stockAfter: prod.stock,
        costPrice: incomingPrice,
        userId: req.user!.id,
        notes: `Posting Penerimaan PO ${purchase.purchaseNo} dari ${sup?.name}`,
      });
    }

    purchase.shippingStatus = 'diterima';
    purchase.receivedAt = now;
    purchase.updatedAt = now;

    // If credit and no payable exists yet
    if (purchase.paymentType === 'kredit' && !data.accountsPayable.some((ap) => ap.purchaseId === purchase.id)) {
      const payable: AccountsPayable = {
        id: `ap-${Date.now()}`,
        purchaseId: purchase.id,
        supplierId: purchase.supplierId,
        invoiceNo: purchase.invoiceNo || purchase.purchaseNo,
        totalAmount: purchase.grandTotal,
        paidAmount: 0,
        remainingAmount: purchase.grandTotal,
        dueDate: purchase.dueDate || now.slice(0, 10),
        status: 'belum_lunas',
        createdAt: now,
        updatedAt: now,
      };
      data.accountsPayable.push(payable);
    }

    db.save();

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'RECEIVE_PURCHASE',
      module: 'Pembelian',
      recordId: purchase.id,
      details: `Posting penerimaan barang untuk PO ${purchase.purchaseNo}. Stok telah diperbarui.`,
      ipAddress: req.ip || null,
    });

    return res.json({
      success: true,
      message: 'Penerimaan barang berhasil diposting. Stok bertambah dan HPP Weighted Average diperbarui.',
      purchase,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
