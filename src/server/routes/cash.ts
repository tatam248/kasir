import { Router, Response } from 'express';
import { db } from '../db/store.ts';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.ts';
import { CashTransactionType } from '../db/types.ts';

const router = Router();

// GET /api/cash (Buku Kas)
router.get('/', authenticate, requirePermission('report.finance'), (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate, transactionType, category } = req.query;
  const data = db.getData();

  let list = [...data.cashTransactions];

  if (transactionType && transactionType !== 'all') {
    list = list.filter((ct) => ct.transactionType === transactionType);
  }

  if (category && category !== 'all') {
    list = list.filter((ct) => ct.category.toLowerCase().includes((category as string).toLowerCase()));
  }

  if (startDate) {
    list = list.filter((ct) => ct.transactionDate.slice(0, 10) >= (startDate as string));
  }
  if (endDate) {
    list = list.filter((ct) => ct.transactionDate.slice(0, 10) <= (endDate as string));
  }

  list.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

  const enriched = list.map((ct) => {
    const user = data.users.find((u) => u.id === ct.userId);
    return {
      ...ct,
      userName: user?.name || '-',
    };
  });

  const totalIn = list.reduce((acc, curr) => acc + curr.amountIn, 0);
  const totalOut = list.reduce((acc, curr) => acc + curr.amountOut, 0);
  const currentBalance = db.getCashBalance();

  return res.json({
    success: true,
    currentBalance,
    totalIn,
    totalOut,
    transactions: enriched,
  });
});

// POST /api/cash/manual (Manual Operational Income / Expense)
router.post('/manual', authenticate, requirePermission('report.finance'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, category, amount, notes } = req.body;
    // type: 'in' | 'out'

    const val = Number(amount);
    if (!val || val <= 0 || !category) {
      return res.status(400).json({ success: false, message: 'Kategori dan nominal (> 0) wajib diisi.' });
    }

    const isExpense = type === 'out';
    const currentBalance = db.getCashBalance();

    if (isExpense && val > currentBalance) {
      return res.status(400).json({
        success: false,
        message: `Saldo kas tidak mencukupi (Saldo: Rp ${currentBalance.toLocaleString('id-ID')}, Diminta: Rp ${val.toLocaleString('id-ID')}).`,
      });
    }

    const now = new Date().toISOString();
    const refNo = `MAN-${now.slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    const txType: CashTransactionType = isExpense ? 'pengeluaran_operasional' : 'pendapatan_lainnya';

    const tx = db.addCashTransaction({
      transactionNo: `CSH-${refNo}`,
      transactionDate: now,
      transactionType: txType,
      category: category.trim(),
      amountIn: isExpense ? 0 : val,
      amountOut: isExpense ? val : 0,
      referenceNo: refNo,
      userId: req.user!.id,
      notes: notes || (isExpense ? 'Pengeluaran kas manual' : 'Pemasukan kas manual'),
    });

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: isExpense ? 'MANUAL_CASH_EXPENSE' : 'MANUAL_CASH_INCOME',
      module: 'Buku Kas',
      recordId: tx.id,
      details: `${isExpense ? 'Pengeluaran' : 'Pemasukan'} kas ${category} senilai Rp ${val.toLocaleString('id-ID')}. Saldo setelahnya: Rp ${tx.balanceAfter.toLocaleString('id-ID')}.`,
      ipAddress: req.ip || null,
    });

    return res.status(201).json({
      success: true,
      message: `${isExpense ? 'Pengeluaran' : 'Pemasukan'} kas berhasil dicatat. Saldo kas saat ini: Rp ${tx.balanceAfter.toLocaleString('id-ID')}.`,
      transaction: tx,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
