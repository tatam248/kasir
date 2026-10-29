import { Router, Response } from 'express';
import { db } from '../db/store.ts';
import { authenticate, AuthenticatedRequest, requirePermission, requireRole } from '../middleware/auth.ts';
import { CashTransactionType } from '../db/types.ts';

const router = Router();

// GET /api/cash (Buku Kas / Kas Besar)
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
      module: 'Kas Besar',
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

// PUT /api/cash/:id (Edit Transaksi Kas Besar - Hanya Super Admin & Pemilik)
router.put('/:id', authenticate, requireRole(['super_admin', 'owner']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { category, amount, type, notes, transactionDate } = req.body;

    const val = Number(amount);
    if (!val || val <= 0 || !category) {
      return res.status(400).json({ success: false, message: 'Kategori dan nominal (> 0) wajib diisi.' });
    }

    const data = db.getData();
    const existing = data.cashTransactions.find((t) => t.id === id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Transaksi kas tidak ditemukan.' });
    }

    const isExpense = type === 'out';
    const txType: CashTransactionType = isExpense ? 'pengeluaran_operasional' : 'pendapatan_lainnya';

    const updated = db.updateCashTransaction(id, {
      category: category.trim(),
      amountIn: isExpense ? 0 : val,
      amountOut: isExpense ? val : 0,
      transactionType: txType,
      notes: notes || '',
      transactionDate: transactionDate ? new Date(transactionDate).toISOString() : existing.transactionDate,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Gagal memperbarui transaksi kas.' });
    }

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'EDIT_CASH_TRANSACTION',
      module: 'Kas Besar',
      recordId: id,
      details: `Mengubah transaksi kas ${existing.transactionNo} (${category}) menjadi Rp ${val.toLocaleString('id-ID')} (${isExpense ? 'Keluar' : 'Masuk'}). Saldo akhir dihitung ulang.`,
      ipAddress: req.ip || null,
    });

    return res.json({
      success: true,
      message: 'Transaksi kas berhasil diperbarui dan saldo kas telah dihitung ulang.',
      transaction: updated,
      currentBalance: db.getCashBalance(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/cash/:id (Hapus Transaksi Kas Besar - Hanya Super Admin & Pemilik)
router.delete('/:id', authenticate, requireRole(['super_admin', 'owner']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const data = db.getData();
    const existing = data.cashTransactions.find((t) => t.id === id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Transaksi kas tidak ditemukan.' });
    }

    const removed = db.deleteCashTransaction(id);
    if (!removed) {
      return res.status(404).json({ success: false, message: 'Gagal menghapus transaksi kas.' });
    }

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'DELETE_CASH_TRANSACTION',
      module: 'Kas Besar',
      recordId: id,
      details: `Menghapus transaksi kas ${removed.transactionNo} (${removed.category}) senilai Rp ${(removed.amountIn || removed.amountOut).toLocaleString('id-ID')}. Saldo akhir dihitung ulang.`,
      ipAddress: req.ip || null,
    });

    return res.json({
      success: true,
      message: `Transaksi kas ${removed.transactionNo} berhasil dihapus. Saldo kas telah dihitung ulang.`,
      currentBalance: db.getCashBalance(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
