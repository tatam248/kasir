import { Router, Response } from 'express';
import { db } from '../db/store.ts';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.ts';

const router = Router();

// GET /api/suppliers
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  return res.json({ success: true, suppliers: data.suppliers });
});

// POST /api/suppliers
router.post('/', authenticate, requirePermission('purchase.create'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, name, address, phone, whatsapp, email, picName, bankAccount, notes, status } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nama supplier wajib diisi.' });

    const data = db.getData();
    const supCode = code ? code.trim().toUpperCase() : `SUP-${String(data.suppliers.length + 1).padStart(3, '0')}`;

    if (data.suppliers.some((s) => s.code.toLowerCase() === supCode.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Kode supplier sudah terdaftar.' });
    }

    const now = new Date().toISOString();
    const newSup = {
      id: `sup-${Date.now()}`,
      code: supCode,
      name: name.trim(),
      address: address || '',
      phone: phone || '',
      whatsapp: whatsapp || '',
      email: email || '',
      picName: picName || '',
      bankAccount: bankAccount || '',
      notes: notes || '',
      status: status || 'active',
      createdAt: now,
      updatedAt: now,
    };

    data.suppliers.push(newSup);
    db.save();

    return res.status(201).json({ success: true, message: 'Supplier berhasil ditambahkan.', supplier: newSup });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/suppliers/:id
router.put('/:id', authenticate, requirePermission('purchase.create'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const data = db.getData();
  const sup = data.suppliers.find((s) => s.id === id);
  if (!sup) return res.status(404).json({ success: false, message: 'Supplier tidak ditemukan.' });

  const { name, address, phone, whatsapp, email, picName, bankAccount, notes, status } = req.body;
  if (name) sup.name = name.trim();
  if (address !== undefined) sup.address = address;
  if (phone !== undefined) sup.phone = phone;
  if (whatsapp !== undefined) sup.whatsapp = whatsapp;
  if (email !== undefined) sup.email = email;
  if (picName !== undefined) sup.picName = picName;
  if (bankAccount !== undefined) sup.bankAccount = bankAccount;
  if (notes !== undefined) sup.notes = notes;
  if (status) sup.status = status;
  sup.updatedAt = new Date().toISOString();

  db.save();
  return res.json({ success: true, message: 'Supplier berhasil diperbarui.', supplier: sup });
});

// GET /api/suppliers/:id/history
router.get('/:id/history', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const data = db.getData();
  const purchases = data.purchases.filter((p) => p.supplierId === id);
  const payables = data.accountsPayable.filter((ap) => ap.supplierId === id);

  return res.json({
    success: true,
    purchases,
    payables,
  });
});

export default router;
