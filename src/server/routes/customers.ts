import { Router, Response } from 'express';
import { db } from '../db/store.ts';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.ts';

const router = Router();

// GET /api/customers
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  return res.json({ success: true, customers: data.customers });
});

// POST /api/customers
router.post('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone, whatsapp, address, customerType, creditLimit, notes, status } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nama pelanggan wajib diisi.' });

    const data = db.getData();
    const count = data.customers.length;
    const code = `CUST-${String(count).padStart(3, '0')}`;

    const now = new Date().toISOString();
    const newCust = {
      id: `cust-${Date.now()}`,
      code,
      name: name.trim(),
      phone: phone || '',
      whatsapp: whatsapp || '',
      address: address || '',
      customerType: customerType || 'umum',
      creditLimit: Number(creditLimit) || 0,
      receivableBalance: 0,
      loyaltyPoints: 0,
      notes: notes || '',
      status: status || 'active',
      createdAt: now,
      updatedAt: now,
    };

    data.customers.push(newCust);
    db.save();

    return res.status(201).json({ success: true, message: 'Pelanggan berhasil ditambahkan.', customer: newCust });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/customers/:id
router.put('/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const data = db.getData();
  const cust = data.customers.find((c) => c.id === id);
  if (!cust) return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan.' });

  const { name, phone, whatsapp, address, customerType, creditLimit, notes, status } = req.body;
  if (name) cust.name = name.trim();
  if (phone !== undefined) cust.phone = phone;
  if (whatsapp !== undefined) cust.whatsapp = whatsapp;
  if (address !== undefined) cust.address = address;
  if (customerType) cust.customerType = customerType;
  if (creditLimit !== undefined) cust.creditLimit = Number(creditLimit);
  if (notes !== undefined) cust.notes = notes;
  if (status) cust.status = status;
  cust.updatedAt = new Date().toISOString();

  db.save();
  return res.json({ success: true, message: 'Pelanggan berhasil diperbarui.', customer: cust });
});

// GET /api/customers/:id/history
router.get('/:id/history', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const data = db.getData();
  const sales = data.sales.filter((s) => s.customerId === id);
  const receivables = data.accountsReceivable.filter((ar) => ar.customerId === id);

  return res.json({
    success: true,
    sales,
    receivables,
  });
});

export default router;
