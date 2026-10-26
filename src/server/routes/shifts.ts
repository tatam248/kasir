import { Router, Response } from 'express';
import { db } from '../db/store.ts';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.ts';
import { CashierShift } from '../db/types.ts';

const router = Router();

// GET /api/shifts/active
router.get('/active', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const shift = data.cashierShifts.find((cs) => cs.userId === req.user!.id && cs.status === 'open');

  if (!shift) {
    return res.json({ success: true, activeShift: null });
  }

  // Calculate real-time expected cash
  const expectedClosing = shift.openingBalance + shift.cashSalesTotal + shift.cashInTotal - shift.cashOutTotal;

  return res.json({
    success: true,
    activeShift: {
      ...shift,
      expectedClosingBalance: expectedClosing,
      userName: req.user!.name,
    },
  });
});

// POST /api/shifts/start
router.post('/start', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { openingBalance, notes } = req.body;
    const initialAmount = Number(openingBalance) || 0;

    const data = db.getData();
    // Check if user already has an active open shift
    const existing = data.cashierShifts.find((cs) => cs.userId === req.user!.id && cs.status === 'open');
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Anda sudah memiliki shift yang masih terbuka (#${existing.shiftNumber}). Tutup shift lama terlebih dahulu.`,
        activeShift: existing,
      });
    }

    const now = new Date().toISOString();
    const count = data.cashierShifts.length + 1;
    const shiftNumber = `SHF-${now.slice(0, 10).replace(/-/g, '')}-${String(count).padStart(3, '0')}`;

    const newShift: CashierShift = {
      id: `shf-${Date.now()}`,
      shiftNumber,
      userId: req.user!.id,
      openedAt: now,
      closedAt: null,
      openingBalance: initialAmount,
      cashSalesTotal: 0,
      cashInTotal: 0,
      cashOutTotal: 0,
      expectedClosingBalance: initialAmount,
      actualClosingBalance: null,
      variance: null,
      notes: notes || 'Buka shift kasir',
      status: 'open',
    };

    data.cashierShifts.push(newShift);

    // Record cash in if opening balance > 0
    if (initialAmount > 0) {
      db.addCashTransaction({
        transactionNo: `CSH-${shiftNumber}-IN`,
        transactionDate: now,
        transactionType: 'modal_awal_shift',
        category: 'Modal Awal Kasir Shift',
        amountIn: initialAmount,
        amountOut: 0,
        referenceNo: shiftNumber,
        userId: req.user!.id,
        notes: `Modal awal laci kasir ${shiftNumber} oleh ${req.user!.name}`,
      });
    }

    db.save();

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'START_SHIFT',
      module: 'Shift Kasir',
      recordId: newShift.id,
      details: `Kasir ${req.user!.name} membuka shift ${shiftNumber} dengan modal awal Rp ${initialAmount.toLocaleString('id-ID')}.`,
      ipAddress: req.ip || null,
    });

    return res.status(201).json({ success: true, message: 'Shift kasir berhasil dibuka.', shift: newShift });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/shifts/close
router.post('/close', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { actualCash, notes } = req.body;
    if (actualCash === undefined || actualCash === null) {
      return res.status(400).json({ success: false, message: 'Jumlah kas fisik aktual wajib diinput.' });
    }

    const data = db.getData();
    const shift = data.cashierShifts.find((cs) => cs.userId === req.user!.id && cs.status === 'open');
    if (!shift) {
      return res.status(400).json({ success: false, message: 'Tidak ada shift aktif yang perlu ditutup.' });
    }

    const actual = Number(actualCash) || 0;
    const now = new Date().toISOString();

    const expected = shift.openingBalance + shift.cashSalesTotal + shift.cashInTotal - shift.cashOutTotal;
    const variance = actual - expected; // positive = surplus, negative = shortage

    shift.closedAt = now;
    shift.expectedClosingBalance = expected;
    shift.actualClosingBalance = actual;
    shift.variance = variance;
    shift.notes = notes ? `${shift.notes} | Tutup: ${notes}` : shift.notes;
    shift.status = 'closed';

    db.save();

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'CLOSE_SHIFT',
      module: 'Shift Kasir',
      recordId: shift.id,
      details: `Shift ${shift.shiftNumber} ditutup. Kas Seharusnya: Rp ${expected.toLocaleString('id-ID')}, Kas Aktual: Rp ${actual.toLocaleString('id-ID')}, Selisih: Rp ${variance.toLocaleString('id-ID')}.`,
      ipAddress: req.ip || null,
    });

    return res.json({
      success: true,
      message: `Shift kasir ${shift.shiftNumber} berhasil ditutup.`,
      shift: {
        ...shift,
        userName: req.user!.name,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/shifts (History)
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  let shifts = [...data.cashierShifts];

  if (req.user?.roleCode === 'kasir') {
    shifts = shifts.filter((s) => s.userId === req.user!.id);
  }

  shifts.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());

  const enriched = shifts.map((s) => {
    const user = data.users.find((u) => u.id === s.userId);
    return {
      ...s,
      userName: user?.name || '-',
    };
  });

  return res.json({ success: true, shifts: enriched });
});

export default router;
