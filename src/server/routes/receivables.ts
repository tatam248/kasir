import { Router, Response } from 'express';
import { db } from '../db/store.ts';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.ts';
import { ReceivablePayment } from '../db/types.ts';

const router = Router();

// GET /api/receivables
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { status, customerId } = req.query;
  const data = db.getData();

  let list = [...data.accountsReceivable];

  if (status && status !== 'all') {
    list = list.filter((ar) => ar.status === status);
  }

  if (customerId && customerId !== 'all') {
    list = list.filter((ar) => ar.customerId === customerId);
  }

  const enriched = list.map((ar) => {
    const cust = data.customers.find((c) => c.id === ar.customerId);
    const payments = data.receivablePayments.filter((rp) => rp.receivableId === ar.id);

    return {
      ...ar,
      customerName: cust?.name || '-',
      customerPhone: cust?.phone || '-',
      payments,
    };
  });

  return res.json({ success: true, receivables: enriched });
});

// POST /api/receivables/:id/payments (Installment / Full Payment)
router.post('/:id/payments', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, paymentDate, notes } = req.body;

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Nominal pembayaran harus lebih besar dari 0.' });
    }

    const data = db.getData();
    const ar = data.accountsReceivable.find((a) => a.id === id);
    if (!ar) return res.status(404).json({ success: false, message: 'Data piutang tidak ditemukan.' });

    if (ar.status === 'lunas' || ar.remainingAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Piutang ini sudah lunas.' });
    }

    if (payAmount > ar.remainingAmount) {
      return res.status(400).json({
        success: false,
        message: `Pembayaran (Rp ${payAmount.toLocaleString('id-ID')}) melebihi sisa piutang (Rp ${ar.remainingAmount.toLocaleString('id-ID')}).`,
      });
    }

    const now = new Date().toISOString();
    const paymentNo = `REC-${now.slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    const payment: ReceivablePayment = {
      id: `rp-${Date.now()}`,
      paymentNo,
      receivableId: ar.id,
      paymentDate: paymentDate || now.slice(0, 10),
      amount: payAmount,
      paymentMethod: paymentMethod || 'tunai',
      userId: req.user!.id,
      notes: notes || 'Pembayaran angsuran piutang pelanggan',
      createdAt: now,
    };

    data.receivablePayments.push(payment);

    ar.paidAmount += payAmount;
    ar.remainingAmount -= payAmount;
    ar.status = ar.remainingAmount <= 0 ? 'lunas' : 'sebagian';
    ar.updatedAt = now;

    // Update customer's receivable balance
    const cust = data.customers.find((c) => c.id === ar.customerId);
    if (cust) {
      cust.receivableBalance = Math.max(0, cust.receivableBalance - payAmount);
      cust.updatedAt = now;
    }

    // Record Cash In
    db.addCashTransaction({
      transactionNo: `CSH-${paymentNo}`,
      transactionDate: now,
      transactionType: 'pembayaran_piutang',
      category: 'Penerimaan Pembayaran Piutang',
      amountIn: payAmount,
      amountOut: 0,
      referenceNo: ar.invoiceNo,
      userId: req.user!.id,
      notes: `Penerimaan angsuran piutang invoice ${ar.invoiceNo} dari ${cust?.name || 'Pelanggan'}`,
    });

    db.save();

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'COLLECT_ACCOUNT_RECEIVABLE',
      module: 'Piutang Pelanggan',
      recordId: ar.id,
      details: `Menerima pembayaran piutang ${ar.invoiceNo} sebesar Rp ${payAmount.toLocaleString('id-ID')}. Sisa: Rp ${ar.remainingAmount.toLocaleString('id-ID')}.`,
      ipAddress: req.ip || null,
    });

    return res.status(201).json({
      success: true,
      message: `Penerimaan piutang sebesar Rp ${payAmount.toLocaleString('id-ID')} berhasil dicatat. Status: ${ar.status}.`,
      payment,
      receivable: ar,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
