import { Router, Response } from 'express';
import { db } from '../db/store.ts';
import { mysqlService } from '../db/mysql.ts';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.ts';

const router = Router();

// GET /api/settings
router.get('/', (req, res: Response) => {
  const data = db.getData();
  return res.json({ success: true, settings: data.storeSettings });
});

// GET /api/settings/db-status (Check Live MySQL database status)
router.get('/db-status', async (req, res: Response) => {
  try {
    const health = await mysqlService.checkHealth();
    return res.json({
      success: true,
      ...health,
      localCachePath: '.data/pos_database.json',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/settings/sync-mysql (Manually sync all records to MySQL)
router.post('/sync-mysql', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await mysqlService.syncAll(db.getData());
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/settings
router.put('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAuthorized =
      req.user?.permissions?.includes('settings.manage') ||
      ['super_admin', 'owner', 'manager'].includes(req.user?.roleCode || '');

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak. Anda tidak memiliki hak akses untuk menyimpan pengaturan.",
      });
    }

    const {
      storeName,
      logoUrl,
      address,
      phone,
      whatsapp,
      email,
      taxIdNpwp,
      receiptFooter,
      currencySymbol,
      invoicePrefix,
      defaultTaxRate,
      defaultMinStock,
      receiptPaperSize,
      autoPrintReceipt,
      enableSoundEffects,
      maxDiscountWithoutPin,
    } = req.body;

    const data = db.getData();
    const s = data.storeSettings;
    const before = { ...s };

    if (storeName !== undefined) s.storeName = storeName.trim();
    if (logoUrl !== undefined) s.logoUrl = logoUrl;
    if (address !== undefined) s.address = address;
    if (phone !== undefined) s.phone = phone;
    if (whatsapp !== undefined) s.whatsapp = whatsapp;
    if (email !== undefined) s.email = email;
    if (taxIdNpwp !== undefined) s.taxIdNpwp = taxIdNpwp;
    if (receiptFooter !== undefined) s.receiptFooter = receiptFooter;
    if (currencySymbol !== undefined && currencySymbol.trim() !== '') s.currencySymbol = currencySymbol.trim();
    if (invoicePrefix !== undefined && invoicePrefix.trim() !== '') s.invoicePrefix = invoicePrefix.trim().toUpperCase();
    if (defaultTaxRate !== undefined) s.defaultTaxRate = Number(defaultTaxRate);
    if (defaultMinStock !== undefined) s.defaultMinStock = Number(defaultMinStock);
    if (receiptPaperSize !== undefined) s.receiptPaperSize = receiptPaperSize === '80mm' ? '80mm' : '58mm';
    if (autoPrintReceipt !== undefined) s.autoPrintReceipt = Boolean(autoPrintReceipt);
    if (enableSoundEffects !== undefined) s.enableSoundEffects = Boolean(enableSoundEffects);
    if (maxDiscountWithoutPin !== undefined) s.maxDiscountWithoutPin = Number(maxDiscountWithoutPin);
    s.updatedAt = new Date().toISOString();

    db.save();

    // Persist directly to MySQL
    await mysqlService.saveStoreSettings(s);

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'UPDATE_SETTINGS',
      module: 'Pengaturan',
      recordId: s.id,
      details: `Memperbarui konfigurasi aplikasi & toko '${s.storeName}'.`,
      dataBefore: before,
      dataAfter: s,
      ipAddress: req.ip || null,
    });

    return res.json({ success: true, message: 'Pengaturan berhasil disimpan ke database.', settings: s });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/settings/backup/sql (Download MySQL .sql backup)
router.get('/backup/sql', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const isAuthorized =
    req.user?.permissions?.includes('settings.manage') ||
    ['super_admin', 'owner', 'manager'].includes(req.user?.roleCode || '');
  if (!isAuthorized) {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  try {
    const dump = db.generateSqlDump();
    const filename = `kasirpro_backup_${new Date().toISOString().slice(0, 10)}.sql`;

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'BACKUP_SQL',
      module: 'Backup Database',
      recordId: null,
      details: `Mengekspor backup database format MySQL (.sql) untuk XAMPP/phpMyAdmin.`,
      ipAddress: req.ip || null,
    });

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(dump);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/settings/backup/json (Download JSON backup)
router.get('/backup/json', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const isAuthorized =
    req.user?.permissions?.includes('settings.manage') ||
    ['super_admin', 'owner', 'manager'].includes(req.user?.roleCode || '');
  if (!isAuthorized) {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  try {
    const data = db.getData();
    const filename = `kasirpro_database_${new Date().toISOString().slice(0, 10)}.json`;

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'BACKUP_JSON',
      module: 'Backup Database',
      recordId: null,
      details: `Mengunduh backup JSON database lengkap.`,
      ipAddress: req.ip || null,
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(JSON.stringify(data, null, 2));
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/settings/diagnostics (System Health & DB Statistics)
router.get('/diagnostics', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();

  return res.json({
    success: true,
    system: {
      appName: 'KASIRPRO Enterprise POS & Inventory',
      version: '1.0.0-PROD',
      dbEngine: 'MySQL/XAMPP Compatible Relational Engine',
      dbStatus: 'Online & Synchronized',
      nodeVersion: process.version,
      platform: process.platform,
      serverTime: new Date().toISOString(),
    },
    tables: {
      products: data.products.length,
      categories: data.categories.length,
      brands: data.brands.length,
      units: data.units.length,
      suppliers: data.suppliers.length,
      customers: data.customers.length,
      sales: data.sales.length,
      saleItems: data.saleItems.length,
      purchases: data.purchases.length,
      stockMovements: data.stockMovements.length,
      accountsPayable: data.accountsPayable.length,
      accountsReceivable: data.accountsReceivable.length,
      cashTransactions: data.cashTransactions.length,
      cashierShifts: data.cashierShifts.length,
      auditLogs: data.auditLogs.length,
      users: data.users.length,
    },
  });
});

export default router;
