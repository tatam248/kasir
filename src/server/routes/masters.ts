import { Router, Response } from 'express';
import { db } from '../db/store.ts';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.ts';

const router = Router();

// --- CATEGORIES ---
router.get('/categories', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  return res.json({ success: true, categories: data.categories });
});

router.post('/categories', authenticate, requirePermission('product.create'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, name, description } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'Kode dan Nama kategori wajib diisi.' });
    }

    const data = db.getData();
    if (data.categories.some((c) => c.code.toLowerCase() === code.trim().toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Kode kategori sudah ada.' });
    }

    const newCat = {
      id: `cat-${Date.now()}`,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description || '',
      status: 'active' as const,
      createdAt: new Date().toISOString(),
    };

    data.categories.push(newCat);
    db.save();

    return res.status(201).json({ success: true, message: 'Kategori berhasil ditambahkan.', category: newCat });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/categories/:id', authenticate, requirePermission('product.edit'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, status } = req.body;
  const data = db.getData();
  const cat = data.categories.find((c) => c.id === id);

  if (!cat) return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan.' });

  if (name) cat.name = name.trim();
  if (description !== undefined) cat.description = description;
  if (status) cat.status = status;

  db.save();
  return res.json({ success: true, message: 'Kategori berhasil diperbarui.', category: cat });
});

// --- BRANDS ---
router.get('/brands', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  return res.json({ success: true, brands: data.brands });
});

router.post('/brands', authenticate, requirePermission('product.create'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nama merek wajib diisi.' });

    const data = db.getData();
    if (data.brands.some((b) => b.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Merek sudah ada.' });
    }

    const newBrand = {
      id: `brd-${Date.now()}`,
      name: name.trim(),
      description: description || '',
      status: 'active' as const,
      createdAt: new Date().toISOString(),
    };

    data.brands.push(newBrand);
    db.save();
    return res.status(201).json({ success: true, message: 'Merek berhasil ditambahkan.', brand: newBrand });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/brands/:id', authenticate, requirePermission('product.edit'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, status } = req.body;
  const data = db.getData();
  const brand = data.brands.find((b) => b.id === id);
  if (!brand) return res.status(404).json({ success: false, message: 'Merek tidak ditemukan.' });

  if (name) brand.name = name.trim();
  if (description !== undefined) brand.description = description;
  if (status) brand.status = status;

  db.save();
  return res.json({ success: true, message: 'Merek berhasil diperbarui.', brand });
});

// --- UNITS ---
router.get('/units', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  return res.json({ success: true, units: data.units });
});

router.post('/units', authenticate, requirePermission('product.create'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, name } = req.body;
    if (!code || !name) return res.status(400).json({ success: false, message: 'Kode dan nama satuan wajib diisi.' });

    const data = db.getData();
    if (data.units.some((u) => u.code.toLowerCase() === code.trim().toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Satuan sudah ada.' });
    }

    const newUnit = {
      id: `unit-${Date.now()}`,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      status: 'active' as const,
      createdAt: new Date().toISOString(),
    };

    data.units.push(newUnit);
    db.save();
    return res.status(201).json({ success: true, message: 'Satuan berhasil ditambahkan.', unit: newUnit });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/units/:id', authenticate, requirePermission('product.edit'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, status } = req.body;
  const data = db.getData();
  const unit = data.units.find((u) => u.id === id);
  if (!unit) return res.status(404).json({ success: false, message: 'Satuan tidak ditemukan.' });

  if (name) unit.name = name.trim();
  if (status) unit.status = status;

  db.save();
  return res.json({ success: true, message: 'Satuan berhasil diperbarui.', unit });
});

export default router;
