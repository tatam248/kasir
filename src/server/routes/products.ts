import { Router, Response } from 'express';
import { db } from '../db/store.ts';
import { mysqlService } from '../db/mysql.ts';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.ts';
import { Product } from '../db/types.ts';

const router = Router();

// GET /api/products
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { categoryId, stockStatus, search, status, brandId } = req.query;
  const data = db.getData();

  let products = data.products.filter((p) => !p.deletedAt);

  if (status && status !== 'all') {
    products = products.filter((p) => p.status === status);
  }

  if (categoryId && categoryId !== 'all') {
    products = products.filter((p) => p.categoryId === categoryId);
  }

  if (brandId && brandId !== 'all') {
    products = products.filter((p) => p.brandId === brandId);
  }

  if (search) {
    const q = (search as string).toLowerCase().trim();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q)
    );
  }

  if (stockStatus) {
    if (stockStatus === 'out') {
      products = products.filter((p) => p.stock <= 0);
    } else if (stockStatus === 'low') {
      products = products.filter((p) => p.stock > 0 && p.stock <= p.minStock);
    } else if (stockStatus === 'safe') {
      products = products.filter((p) => p.stock > p.minStock);
    }
  }

  const enriched = products.map((p) => {
    const cat = data.categories.find((c) => c.id === p.categoryId);
    const unit = data.units.find((u) => u.id === p.unitId);
    const brand = data.brands.find((b) => b.id === p.brandId);
    const sup = data.suppliers.find((s) => s.id === p.supplierId);

    // Kasir role should not see purchasePrice or avgCost
    const isKasir = req.user?.roleCode === 'kasir';

    return {
      ...p,
      categoryName: cat?.name || 'Tanpa Kategori',
      unitCode: unit?.code || 'PCS',
      brandName: brand?.name || '-',
      supplierName: sup?.name || '-',
      purchasePrice: isKasir ? undefined : p.purchasePrice,
      avgCost: isKasir ? undefined : p.avgCost,
    };
  });

  return res.json({ success: true, products: enriched });
});

// GET /api/products/:id
router.get('/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const data = db.getData();
  const p = data.products.find((item) => (item.id === id || item.barcode === id || item.sku === id) && !item.deletedAt);

  if (!p) {
    return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
  }

  const cat = data.categories.find((c) => c.id === p.categoryId);
  const unit = data.units.find((u) => u.id === p.unitId);
  const brand = data.brands.find((b) => b.id === p.brandId);
  const sup = data.suppliers.find((s) => s.id === p.supplierId);

  const isKasir = req.user?.roleCode === 'kasir';

  return res.json({
    success: true,
    product: {
      ...p,
      categoryName: cat?.name || 'Tanpa Kategori',
      unitCode: unit?.code || 'PCS',
      brandName: brand?.name || '-',
      supplierName: sup?.name || '-',
      purchasePrice: isKasir ? undefined : p.purchasePrice,
      avgCost: isKasir ? undefined : p.avgCost,
    },
  });
});

// POST /api/products
router.post('/', authenticate, requirePermission('product.create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      sku,
      barcode,
      name,
      categoryId,
      brandId,
      unitId,
      purchasePrice,
      sellingPrice,
      wholesalePrice,
      minWholesaleQty,
      stock,
      minStock,
      locationRack,
      supplierId,
      imageUrl,
      status,
    } = req.body;

    if (!sku || !barcode || !name || !categoryId || !unitId || sellingPrice === undefined) {
      return res.status(400).json({ success: false, message: 'SKU, Barcode, Nama, Kategori, Satuan, dan Harga Jual wajib diisi.' });
    }

    const data = db.getData();
    // Unique check for SKU and Barcode
    const existingSku = data.products.find((p) => p.sku.toLowerCase() === sku.toLowerCase().trim() && !p.deletedAt);
    if (existingSku) {
      return res.status(400).json({ success: false, message: `SKU '${sku}' sudah digunakan produk '${existingSku.name}'.` });
    }

    const existingBarcode = data.products.find((p) => p.barcode === barcode.trim() && !p.deletedAt);
    if (existingBarcode) {
      return res.status(400).json({ success: false, message: `Barcode '${barcode}' sudah digunakan produk '${existingBarcode.name}'.` });
    }

    const now = new Date().toISOString();
    const initialQty = Number(stock) || 0;
    const buyPrice = Number(purchasePrice) || 0;
    const sellPrice = Number(sellingPrice) || 0;
    const wsPrice = Number(wholesalePrice) || sellPrice;

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      sku: sku.trim().toUpperCase(),
      barcode: barcode.trim(),
      name: name.trim(),
      categoryId,
      brandId: brandId || null,
      unitId,
      purchasePrice: buyPrice,
      avgCost: buyPrice,
      sellingPrice: sellPrice,
      wholesalePrice: wsPrice,
      minWholesaleQty: Number(minWholesaleQty) || 0,
      stock: initialQty,
      minStock: Number(minStock) || 5,
      locationRack: locationRack || '',
      supplierId: supplierId || null,
      imageUrl: imageUrl || '',
      status: status || 'active',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    data.products.push(newProduct);

    // If initial stock > 0, generate Stock Ledger record
    if (initialQty > 0) {
      db.recordStockMovement({
        movementDate: now,
        productId: newProduct.id,
        movementType: 'stok_awal',
        referenceNo: `INIT-${newProduct.sku}`,
        stockBefore: 0,
        stockIn: initialQty,
        stockOut: 0,
        stockAfter: initialQty,
        costPrice: buyPrice,
        userId: req.user!.id,
        notes: 'Stok awal pendaftaran produk baru',
      });
    }

    db.save();

    // Persist directly to MySQL
    await mysqlService.saveProduct(newProduct);

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'CREATE_PRODUCT',
      module: 'Produk',
      recordId: newProduct.id,
      details: `Menambah produk baru ${newProduct.name} (SKU: ${newProduct.sku}, Barcode: ${newProduct.barcode}, Stok: ${initialQty}).`,
      ipAddress: req.ip || null,
    });

    return res.status(201).json({ success: true, message: 'Produk berhasil disimpan ke database.', product: newProduct });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', authenticate, requirePermission('product.edit'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = db.getData();
    const product = data.products.find((p) => p.id === id && !p.deletedAt);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
    }

    const {
      sku,
      barcode,
      name,
      categoryId,
      brandId,
      unitId,
      purchasePrice,
      sellingPrice,
      wholesalePrice,
      minWholesaleQty,
      minStock,
      locationRack,
      supplierId,
      imageUrl,
      status,
    } = req.body;

    // Check SKU uniqueness if changed
    if (sku && sku.toLowerCase().trim() !== product.sku.toLowerCase()) {
      const dupSku = data.products.find((p) => p.id !== id && p.sku.toLowerCase() === sku.toLowerCase().trim() && !p.deletedAt);
      if (dupSku) return res.status(400).json({ success: false, message: `SKU '${sku}' sudah digunakan.` });
      product.sku = sku.trim().toUpperCase();
    }

    // Check Barcode uniqueness if changed
    if (barcode && barcode.trim() !== product.barcode) {
      const dupBar = data.products.find((p) => p.id !== id && p.barcode === barcode.trim() && !p.deletedAt);
      if (dupBar) return res.status(400).json({ success: false, message: `Barcode '${barcode}' sudah digunakan.` });
      product.barcode = barcode.trim();
    }

    const before = { ...product };

    if (name) product.name = name.trim();
    if (categoryId) product.categoryId = categoryId;
    if (brandId !== undefined) product.brandId = brandId || null;
    if (unitId) product.unitId = unitId;
    if (purchasePrice !== undefined) product.purchasePrice = Number(purchasePrice);
    if (sellingPrice !== undefined) product.sellingPrice = Number(sellingPrice);
    if (wholesalePrice !== undefined) product.wholesalePrice = Number(wholesalePrice);
    if (minWholesaleQty !== undefined) product.minWholesaleQty = Number(minWholesaleQty);
    if (minStock !== undefined) product.minStock = Number(minStock);
    if (locationRack !== undefined) product.locationRack = locationRack;
    if (supplierId !== undefined) product.supplierId = supplierId || null;
    if (imageUrl !== undefined) product.imageUrl = imageUrl;
    if (status) product.status = status;
    product.updatedAt = new Date().toISOString();

    db.save();

    // Persist directly to MySQL
    await mysqlService.saveProduct(product);

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'UPDATE_PRODUCT',
      module: 'Produk',
      recordId: product.id,
      details: `Memperbarui produk ${product.name} (SKU: ${product.sku}).`,
      dataBefore: before,
      dataAfter: product,
      ipAddress: req.ip || null,
    });

    return res.json({ success: true, message: 'Produk berhasil diperbarui di database.', product });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', authenticate, requirePermission('product.delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = db.getData();
    const product = data.products.find((p) => p.id === id && !p.deletedAt);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
    }

    // Check if product has sales or purchase history
    const hasSales = data.saleItems.some((si) => si.productId === id);
    const hasPurchases = data.purchaseItems.some((pi) => pi.productId === id);

    if (hasSales || hasPurchases) {
      // Soft-delete / deactivate to preserve historical integrity
      product.status = 'inactive';
      product.deletedAt = new Date().toISOString();
      db.save();
      await mysqlService.saveProduct(product);

      db.logAudit({
        userId: req.user!.id,
        username: req.user!.username,
        action: 'SOFT_DELETE_PRODUCT',
        module: 'Produk',
        recordId: product.id,
        details: `Produk ${product.name} memiliki histori transaksi, dilakukan soft-delete / nonaktif untuk menjaga integritas data.`,
        ipAddress: req.ip || null,
      });

      return res.json({
        success: true,
        message: 'Produk dinonaktifkan (soft delete) karena memiliki histori transaksi, data masa lalu tetap aman.',
      });
    }

    // If no history, remove cleanly
    product.deletedAt = new Date().toISOString();
    db.save();
    await mysqlService.saveProduct(product);

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'DELETE_PRODUCT',
      module: 'Produk',
      recordId: product.id,
      details: `Menghapus produk ${product.name} (SKU: ${product.sku}).`,
      ipAddress: req.ip || null,
    });

    return res.json({ success: true, message: 'Produk berhasil dihapus.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/products/import
router.post('/import', authenticate, requirePermission('product.create'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { products: items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Data import harus berupa array produk.' });
    }

    const data = db.getData();
    let imported = 0;
    const errors: string[] = [];

    const now = new Date().toISOString();
    const defaultCat = data.categories[0]?.id || 'cat-sembako';
    const defaultUnit = data.units[0]?.id || 'unit-pcs';

    for (const item of items) {
      if (!item.name || !item.sku || !item.barcode) {
        errors.push(`Baris diabaikan: Nama, SKU, atau Barcode kosong.`);
        continue;
      }

      if (data.products.some((p) => p.sku.toLowerCase() === item.sku.toLowerCase().trim() && !p.deletedAt)) {
        errors.push(`SKU '${item.sku}' sudah ada, lewati.`);
        continue;
      }

      if (data.products.some((p) => p.barcode === item.barcode.trim() && !p.deletedAt)) {
        errors.push(`Barcode '${item.barcode}' sudah ada, lewati.`);
        continue;
      }

      const initialQty = Number(item.stock) || 0;
      const buyPrice = Number(item.purchasePrice) || 0;
      const sellPrice = Number(item.sellingPrice) || 0;

      const newProd: Product = {
        id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sku: item.sku.trim().toUpperCase(),
        barcode: item.barcode.trim(),
        name: item.name.trim(),
        categoryId: item.categoryId || defaultCat,
        brandId: item.brandId || null,
        unitId: item.unitId || defaultUnit,
        purchasePrice: buyPrice,
        avgCost: buyPrice,
        sellingPrice: sellPrice,
        wholesalePrice: Number(item.wholesalePrice) || sellPrice,
        minWholesaleQty: Number(item.minWholesaleQty) || 0,
        stock: initialQty,
        minStock: Number(item.minStock) || 5,
        locationRack: item.locationRack || '',
        supplierId: item.supplierId || null,
        imageUrl: item.imageUrl || '',
        status: 'active',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };

      data.products.push(newProd);

      if (initialQty > 0) {
        db.recordStockMovement({
          movementDate: now,
          productId: newProd.id,
          movementType: 'stok_awal',
          referenceNo: `IMPORT-${newProd.sku}`,
          stockBefore: 0,
          stockIn: initialQty,
          stockOut: 0,
          stockAfter: initialQty,
          costPrice: buyPrice,
          userId: req.user!.id,
          notes: 'Stok awal via Import Masal',
        });
      }

      imported++;
    }

    db.save();

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'IMPORT_PRODUCTS',
      module: 'Produk',
      recordId: null,
      details: `Import massal produk. Berhasil: ${imported}, Terlewati/Gagal: ${errors.length}.`,
      ipAddress: req.ip || null,
    });

    return res.json({
      success: true,
      message: `Berhasil mengimpor ${imported} produk.`,
      imported,
      errors,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
