import { Router, Response } from 'express';
import { db } from '../db/store.ts';
import { authenticate, AuthenticatedRequest, requirePermission, verifySupervisorPin } from '../middleware/auth.ts';
import { StockMovement, StockOpname, StockOpnameItem } from '../db/types.ts';

const router = Router();

// GET /api/inventory/ledger (Kartu Stok)
router.get('/ledger', authenticate, requirePermission('inventory.view'), (req: AuthenticatedRequest, res: Response) => {
  const { productId, movementType, startDate, endDate } = req.query;
  const data = db.getData();

  let movements = [...data.stockMovements];

  if (productId && productId !== 'all') {
    movements = movements.filter((m) => m.productId === productId);
  }

  if (movementType && movementType !== 'all') {
    movements = movements.filter((m) => m.movementType === movementType);
  }

  if (startDate) {
    movements = movements.filter((m) => m.movementDate.slice(0, 10) >= (startDate as string));
  }
  if (endDate) {
    movements = movements.filter((m) => m.movementDate.slice(0, 10) <= (endDate as string));
  }

  // Sort descending by date
  movements.sort((a, b) => new Date(b.movementDate).getTime() - new Date(a.movementDate).getTime());

  const enriched = movements.map((m) => {
    const prod = data.products.find((p) => p.id === m.productId);
    const user = data.users.find((u) => u.id === m.userId);
    return {
      ...m,
      productName: prod?.name || '-',
      productSku: prod?.sku || '-',
      userName: user?.name || '-',
    };
  });

  return res.json({ success: true, movements: enriched });
});

// GET /api/inventory/alerts (Peringatan Stok Otomatis)
router.get('/alerts', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const products = data.products.filter((p) => !p.deletedAt && p.status === 'active');

  const outOfStock = products.filter((p) => p.stock <= 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStock);
  const safeStock = products.filter((p) => p.stock > p.minStock);

  return res.json({
    success: true,
    summary: {
      outOfStockCount: outOfStock.length,
      lowStockCount: lowStock.length,
      safeStockCount: safeStock.length,
      totalProductCount: products.length,
    },
    outOfStock,
    lowStock,
  });
});

// POST /api/inventory/adjust (Manual Stock Adjustment)
router.post('/adjust', authenticate, requirePermission('inventory.adjust'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId, adjustmentType, qty, reason, supervisorPin } = req.body;
    // adjustmentType: 'masuk' | 'keluar' | 'rusak' | 'hilang'

    if (!productId || !qty || Number(qty) <= 0 || !reason) {
      return res.status(400).json({ success: false, message: 'Produk, jumlah (qty > 0), dan alasan penyesuaian wajib diisi.' });
    }

    const data = db.getData();
    const prod = data.products.find((p) => p.id === productId && !p.deletedAt);
    if (!prod) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });

    // Sensitive adjustment requires supervisor PIN if not manager/owner/super_admin
    const userRole = req.user?.roleCode;
    if (['kasir', 'admin_inventory'].includes(userRole || '')) {
      if (!supervisorPin) {
        return res.status(403).json({
          success: false,
          message: 'Penyesuaian stok manual oleh staff memerlukan otorisasi PIN Supervisor.',
          requiresSupervisor: true,
        });
      }
      const supervisor = verifySupervisorPin(supervisorPin);
      if (!supervisor) return res.status(403).json({ success: false, message: 'PIN Supervisor tidak valid.' });
    }

    const amount = Number(qty);
    const oldStock = prod.stock;
    const now = new Date().toISOString();

    let stockIn = 0;
    let stockOut = 0;
    let movType: any = 'penyesuaian_stok';

    if (adjustmentType === 'masuk') {
      stockIn = amount;
      movType = 'penyesuaian_stok';
    } else if (adjustmentType === 'rusak') {
      stockOut = amount;
      movType = 'barang_rusak';
    } else if (adjustmentType === 'hilang') {
      stockOut = amount;
      movType = 'barang_hilang';
    } else {
      // default keluar
      stockOut = amount;
      movType = 'penyesuaian_stok';
    }

    if (stockOut > oldStock) {
      return res.status(400).json({
        success: false,
        message: `Stok keluar (${stockOut}) tidak boleh melebihi sisa stok saat ini (${oldStock}).`,
      });
    }

    const newStock = oldStock + stockIn - stockOut;
    prod.stock = newStock;
    prod.updatedAt = now;

    const refNo = `ADJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    const movement = db.recordStockMovement({
      movementDate: now,
      productId: prod.id,
      movementType: movType,
      referenceNo: refNo,
      stockBefore: oldStock,
      stockIn,
      stockOut,
      stockAfter: newStock,
      costPrice: prod.avgCost || prod.purchasePrice || 0,
      userId: req.user!.id,
      notes: reason,
    });

    db.save();

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'STOCK_ADJUSTMENT',
      module: 'Inventory',
      recordId: prod.id,
      details: `Penyesuaian stok '${prod.name}' (${movType}). Stok sebelum: ${oldStock}, sesudah: ${newStock}. Alasan: ${reason}. Ref: ${refNo}.`,
      ipAddress: req.ip || null,
    });

    return res.json({
      success: true,
      message: `Stok produk '${prod.name}' berhasil disesuaikan. Stok sekarang: ${newStock}.`,
      movement,
      product: prod,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// --- STOCK OPNAME MODULE ---

// GET /api/inventory/opnames
router.get('/opnames', authenticate, requirePermission('inventory.view'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const opnames = data.stockOpnames.map((so) => {
    const user = data.users.find((u) => u.id === so.userId);
    const approver = so.approvedById ? data.users.find((u) => u.id === so.approvedById) : null;
    const items = data.stockOpnameItems.filter((soi) => soi.opnameId === so.id).map((soi) => {
      const prod = data.products.find((p) => p.id === soi.productId);
      return {
        ...soi,
        productName: prod?.name || '-',
        sku: prod?.sku || '-',
      };
    });

    return {
      ...so,
      userName: user?.name || '-',
      approvedByName: approver?.name || null,
      items,
    };
  });

  return res.json({ success: true, opnames });
});

// POST /api/inventory/opnames (Create Stock Opname Session)
router.post('/opnames', authenticate, requirePermission('inventory.opname'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { opnameDate, notes, items, autoPost, supervisorPin } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Daftar produk stock opname wajib disertakan.' });
    }

    const data = db.getData();
    const count = data.stockOpnames.length + 1;
    const opnameNo = `SO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(count).padStart(4, '0')}`;
    const opnameId = `so-${Date.now()}`;
    const now = new Date().toISOString();

    const opnameItems: StockOpnameItem[] = [];

    for (const item of items) {
      const prod = data.products.find((p) => p.id === item.productId && !p.deletedAt);
      if (!prod) continue;

      const physical = Number(item.physicalStock) || 0;
      const system = prod.stock;
      const diff = physical - system;

      opnameItems.push({
        id: `soi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        opnameId,
        productId: prod.id,
        systemStock: system,
        physicalStock: physical,
        difference: diff,
        costPrice: prod.avgCost || prod.purchasePrice || 0,
        reason: item.reason || 'Hasil perhitungan fisik opname',
      });
    }

    const isAutoPost = !!autoPost;
    let approverId: string | null = null;

    if (isAutoPost) {
      if (['kasir', 'admin_inventory'].includes(req.user?.roleCode || '')) {
        if (!supervisorPin) {
          return res.status(403).json({
            success: false,
            message: 'Posting penyesuaian stock opname memerlukan otorisasi Supervisor PIN.',
            requiresSupervisor: true,
          });
        }
        const sup = verifySupervisorPin(supervisorPin);
        if (!sup) return res.status(403).json({ success: false, message: 'PIN Supervisor tidak valid.' });
        approverId = sup.id;
      } else {
        approverId = req.user!.id;
      }
    }

    const opname: StockOpname = {
      id: opnameId,
      opnameNo,
      opnameDate: opnameDate || now.slice(0, 10),
      userId: req.user!.id,
      approvedById: approverId,
      status: isAutoPost ? 'posted' : 'draft',
      notes: notes || 'Stock opname berkala',
      createdAt: now,
      postedAt: isAutoPost ? now : null,
    };

    data.stockOpnames.push(opname);
    data.stockOpnameItems.push(...opnameItems);

    // If posting immediately, update product stocks and write to stock ledger
    if (isAutoPost) {
      for (const soi of opnameItems) {
        if (soi.difference !== 0) {
          const prod = data.products.find((p) => p.id === soi.productId);
          if (prod) {
            const oldStock = prod.stock;
            prod.stock = soi.physicalStock;
            prod.updatedAt = now;

            const stockIn = soi.difference > 0 ? soi.difference : 0;
            const stockOut = soi.difference < 0 ? Math.abs(soi.difference) : 0;

            db.recordStockMovement({
              movementDate: now,
              productId: prod.id,
              movementType: 'stock_opname',
              referenceNo: opname.opnameNo,
              stockBefore: oldStock,
              stockIn,
              stockOut,
              stockAfter: prod.stock,
              costPrice: soi.costPrice,
              userId: req.user!.id,
              notes: `Stock Opname ${opname.opnameNo}: ${soi.reason}`,
            });
          }
        }
      }
    }

    db.save();

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: isAutoPost ? 'POST_STOCK_OPNAME' : 'CREATE_STOCK_OPNAME',
      module: 'Stock Opname',
      recordId: opname.id,
      details: `${isAutoPost ? 'Posting' : 'Membuat'} Stock Opname ${opname.opnameNo} (${opnameItems.length} barang). Status: ${opname.status}.`,
      ipAddress: req.ip || null,
    });

    return res.status(201).json({
      success: true,
      message: isAutoPost
        ? `Stock Opname ${opname.opnameNo} berhasil diposting dan stok sistem disesuaikan.`
        : `Draft Stock Opname ${opname.opnameNo} berhasil dibuat.`,
      opname,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/inventory/opnames/:id/post (Approve & Post Draft Stock Opname)
router.post('/opnames/:id/post', authenticate, requirePermission('inventory.opname'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { supervisorPin } = req.body;
    const data = db.getData();
    const opname = data.stockOpnames.find((so) => so.id === id);

    if (!opname) return res.status(404).json({ success: false, message: 'Stock opname tidak ditemukan.' });
    if (opname.status === 'posted') return res.status(400).json({ success: false, message: 'Stock opname ini sudah diposting sebelumnya.' });

    let approverId = req.user!.id;
    if (['kasir', 'admin_inventory'].includes(req.user?.roleCode || '')) {
      if (!supervisorPin) {
        return res.status(403).json({
          success: false,
          message: 'Posting penyesuaian stock opname memerlukan otorisasi Supervisor PIN.',
          requiresSupervisor: true,
        });
      }
      const sup = verifySupervisorPin(supervisorPin);
      if (!sup) return res.status(403).json({ success: false, message: 'PIN Supervisor tidak valid.' });
      approverId = sup.id;
    }

    const now = new Date().toISOString();
    const items = data.stockOpnameItems.filter((soi) => soi.opnameId === opname.id);

    for (const soi of items) {
      if (soi.difference !== 0) {
        const prod = data.products.find((p) => p.id === soi.productId);
        if (prod) {
          const oldStock = prod.stock;
          prod.stock = soi.physicalStock;
          prod.updatedAt = now;

          const stockIn = soi.difference > 0 ? soi.difference : 0;
          const stockOut = soi.difference < 0 ? Math.abs(soi.difference) : 0;

          db.recordStockMovement({
            movementDate: now,
            productId: prod.id,
            movementType: 'stock_opname',
            referenceNo: opname.opnameNo,
            stockBefore: oldStock,
            stockIn,
            stockOut,
            stockAfter: prod.stock,
            costPrice: soi.costPrice,
            userId: req.user!.id,
            notes: `Posting Stock Opname ${opname.opnameNo}: ${soi.reason}`,
          });
        }
      }
    }

    opname.status = 'posted';
    opname.approvedById = approverId;
    opname.postedAt = now;

    db.save();

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'APPROVE_STOCK_OPNAME',
      module: 'Stock Opname',
      recordId: opname.id,
      details: `Stock Opname ${opname.opnameNo} disetujui & diposting oleh ${req.user!.username} (Approver: ${approverId}).`,
      ipAddress: req.ip || null,
    });

    return res.json({ success: true, message: `Stock Opname ${opname.opnameNo} berhasil diposting dan kartu stok diperbarui.`, opname });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
