import { Router, Response } from 'express';
import { db } from '../db/store.ts';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.ts';
import { PayablePayment } from '../db/types.ts';

const router = Router();

// GET /api/payables
router.get('/', authenticate, requirePermission('purchase.view'), (req: AuthenticatedRequest, res: Response) => {
  const { status, supplierId } = req.query;
  const data = db.getData();

  let list = [...data.accountsPayable];

  if (status && status !== 'all') {
    list = list.filter((ap) => ap.status === status);
  }

  if (supplierId && supplierId !== 'all') {
    list = list.filter((ap) => ap.supplierId === supplierId);
  }

  const enriched = list.map((ap) => {
    const sup = data.suppliers.find((s) => s.id === ap.supplierId);
    const purchase = data.purchases.find((p) => p.id === ap.purchaseId);
    const payments = data.payablePayments.filter((pp) => pp.payableId === ap.id);

    return {
      ...ap,
      supplierName: sup?.name || '-',
      purchaseNo: purchase?.purchaseNo || '-',
      payments,
    };
  });

  return res.json({ success: true, payables: enriched });
});

// POST /api/payables/:id/payments (Installment / Full Payment)
router.post('/:id/payments', authenticate, requirePermission('purchase.create'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, paymentDate, notes } = req.body;

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Nominal pembayaran harus lebih besar dari 0.' });
    }

    const data = db.getData();
    const ap = data.accountsPayable.find((a) => a.id === id);
    if (!ap) return res.status(404).json({ success: false, message: 'Data hutang tidak ditemukan.' });

    if (ap.status === 'lunas' || ap.remainingAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Hutang ini sudah lunas.' });
    }

    if (payAmount > ap.remainingAmount) {
      return res.status(400).json({
        success: false,
        message: `Pembayaran (Rp ${payAmount.toLocaleString('id-ID')}) melebihi sisa hutang (Rp ${ap.remainingAmount.toLocaleString('id-ID')}).`,
      });
    }

    const now = new Date().toISOString();
    const paymentNo = `PAY-${now.slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    const payment: PayablePayment = {
      id: `pp-${Date.now()}`,
      paymentNo,
      payableId: ap.id,
      paymentDate: paymentDate || now.slice(0, 10),
      amount: payAmount,
      paymentMethod: paymentMethod || 'tunai',
      userId: req.user!.id,
      notes: notes || 'Pembayaran angsuran hutang supplier',
      createdAt: now,
    };

    data.payablePayments.push(payment);

    ap.paidAmount += payAmount;
    ap.remainingAmount -= payAmount;
    ap.status = ap.remainingAmount <= 0 ? 'lunas' : 'sebagian';
    ap.updatedAt = now;

    const sup = data.suppliers.find((s) => s.id === ap.supplierId);

    // Record Cash Out
    db.addCashTransaction({
      transactionNo: `CSH-${paymentNo}`,
      transactionDate: now,
      transactionType: 'pembayaran_hutang',
      category: 'Pembayaran Hutang Supplier',
      amountIn: 0,
      amountOut: payAmount,
      referenceNo: ap.invoiceNo,
      userId: req.user!.id,
      notes: `Pembayaran hutang invoice ${ap.invoiceNo} ke ${sup?.name || 'Supplier'}`,
    });

    db.save();

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'PAY_ACCOUNT_PAYABLE',
      module: 'Hutang Supplier',
      recordId: ap.id,
      details: `Membayar hutang ${ap.invoiceNo} sebesar Rp ${payAmount.toLocaleString('id-ID')}. Sisa hutang: Rp ${ap.remainingAmount.toLocaleString('id-ID')}.`,
      ipAddress: req.ip || null,
    });

    return res.status(201).json({
      success: true,
      message: `Pembayaran hutang sebesar Rp ${payAmount.toLocaleString('id-ID')} berhasil dicatat. Status: ${ap.status}.`,
      payment,
      payable: ap,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
