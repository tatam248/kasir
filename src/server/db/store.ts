import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { mysqlService } from './mysql.ts';
import {
  AccountsPayable,
  AccountsReceivable,
  AuditLog,
  Brand,
  CashierShift,
  CashTransaction,
  Category,
  Customer,
  PayablePayment,
  Permission,
  Product,
  Purchase,
  PurchaseItem,
  ReceivablePayment,
  Role,
  RolePermission,
  Sale,
  SaleItem,
  SalesReturn,
  SalesReturnItem,
  StockMovement,
  StockOpname,
  StockOpnameItem,
  StoreSettings,
  Supplier,
  Unit,
  User,
} from './types.ts';

interface DatabaseData {
  roles: Role[];
  permissions: Permission[];
  rolePermissions: RolePermission[];
  users: User[];
  categories: Category[];
  brands: Brand[];
  units: Unit[];
  suppliers: Supplier[];
  customers: Customer[];
  products: Product[];
  stockMovements: StockMovement[];
  cashierShifts: CashierShift[];
  purchases: Purchase[];
  purchaseItems: PurchaseItem[];
  accountsPayable: AccountsPayable[];
  payablePayments: PayablePayment[];
  sales: Sale[];
  saleItems: SaleItem[];
  accountsReceivable: AccountsReceivable[];
  receivablePayments: ReceivablePayment[];
  salesReturns: SalesReturn[];
  salesReturnItems: SalesReturnItem[];
  stockOpnames: StockOpname[];
  stockOpnameItems: StockOpnameItem[];
  cashTransactions: CashTransaction[];
  auditLogs: AuditLog[];
  storeSettings: StoreSettings;
  idempotencyTokens: { [token: string]: string }; // token -> saleId
}

class DatabaseStore {
  private dataDir: string;
  private dbFilePath: string;
  private data: DatabaseData;
  private isInitialized = false;

  constructor() {
    this.dataDir = path.resolve(process.cwd(), '.data');
    this.dbFilePath = path.join(this.dataDir, 'pos_database.json');
    this.data = this.getDefaultData();
  }

  private getDefaultData(): DatabaseData {
    return {
      roles: [],
      permissions: [],
      rolePermissions: [],
      users: [],
      categories: [],
      brands: [],
      units: [],
      suppliers: [],
      customers: [],
      products: [],
      stockMovements: [],
      cashierShifts: [],
      purchases: [],
      purchaseItems: [],
      accountsPayable: [],
      payablePayments: [],
      sales: [],
      saleItems: [],
      accountsReceivable: [],
      receivablePayments: [],
      salesReturns: [],
      salesReturnItems: [],
      stockOpnames: [],
      stockOpnameItems: [],
      cashTransactions: [],
      auditLogs: [],
      storeSettings: {
        id: 'setting-primary',
        storeName: '',
        logoUrl: '',
        address: '',
        phone: '',
        whatsapp: '',
        email: '',
        taxIdNpwp: '',
        receiptFooter: 'Terima kasih atas kunjungan Anda.',
        currencySymbol: 'Rp',
        invoicePrefix: 'INV',
        defaultTaxRate: 0,
        defaultMinStock: 5,
        receiptPaperSize: '58mm',
        autoPrintReceipt: true,
        enableSoundEffects: true,
        maxDiscountWithoutPin: 10,
        updatedAt: new Date().toISOString(),
      },
      idempotencyTokens: {},
    };
  }

  public async init() {
    if (this.isInitialized) return;

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    if (fs.existsSync(this.dbFilePath)) {
      try {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = { ...this.getDefaultData(), ...parsed };
      } catch (err) {
        console.error('Failed reading database file, re-initializing...', err);
        this.seedInitialData();
        this.saveLocal();
      }
    } else {
      this.seedInitialData();
      this.saveLocal();
    }

    // Connect to MySQL and load / sync data if available
    try {
      const connected = await mysqlService.connect();
      if (connected) {
        const sqlData = await mysqlService.loadAll();
        if (sqlData) {
          if (sqlData.storeSettings) {
            this.data.storeSettings = sqlData.storeSettings;
          } else {
            await mysqlService.saveStoreSettings(this.data.storeSettings);
          }

          if (sqlData.users && sqlData.users.length > 0) {
            this.data.users = sqlData.users;
          } else {
            for (const u of this.data.users) {
              await mysqlService.saveUser(u);
            }
          }

          // Auto-repair admin initial password if using legacy broken seed hash
          const BROKEN_SEED_HASH = '$2a$10$w3U/d8qU4f4d2fH9e5o/r.mE2t9/vLd.ZsqTqJ6sJj1u1r5H1Wq72';
          const adminUser = this.data.users.find((u) => u.username.toLowerCase() === 'admin');
          if (adminUser && adminUser.passwordHash === BROKEN_SEED_HASH) {
            console.log('[KASIRPRO DB] Auto-repairing admin initial password hash to admin123 in MySQL...');
            adminUser.passwordHash = bcrypt.hashSync('admin123', 10);
            adminUser.status = 'active';
            adminUser.failedLoginAttempts = 0;
            await mysqlService.saveUser(adminUser);
          }

          if (sqlData.products && sqlData.products.length > 0) {
            this.data.products = sqlData.products;
          }
          if (sqlData.categories && sqlData.categories.length > 0) {
            this.data.categories = sqlData.categories;
          }
          if (sqlData.brands && sqlData.brands.length > 0) {
            this.data.brands = sqlData.brands;
          }
          if (sqlData.units && sqlData.units.length > 0) {
            this.data.units = sqlData.units;
          }
          if (sqlData.suppliers && sqlData.suppliers.length > 0) {
            this.data.suppliers = sqlData.suppliers;
          }
          if (sqlData.customers && sqlData.customers.length > 0) {
            this.data.customers = sqlData.customers;
          }
        }
        this.saveLocal();
      }
    } catch (err: any) {
      console.warn('[KASIRPRO DB] Error initializing MySQL sync:', err.message);
    }

    // Ensure local admin has valid hash for admin123 if broken seed was present
    const BROKEN_SEED_HASH = '$2a$10$w3U/d8qU4f4d2fH9e5o/r.mE2t9/vLd.ZsqTqJ6sJj1u1r5H1Wq72';
    const localAdmin = this.data.users.find((u) => u.username.toLowerCase() === 'admin');
    if (localAdmin && localAdmin.passwordHash === BROKEN_SEED_HASH) {
      localAdmin.passwordHash = bcrypt.hashSync('admin123', 10);
      localAdmin.status = 'active';
      localAdmin.failedLoginAttempts = 0;
      this.saveLocal();
    }

    this.isInitialized = true;
  }

  public saveLocal() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(this.dbFilePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving local database:', err);
    }
  }

  public save() {
    this.saveLocal();

    // Asynchronously sync to MySQL if connected
    if (mysqlService.isConnected) {
      mysqlService.saveStoreSettings(this.data.storeSettings).catch(() => {});
      for (const u of this.data.users) {
        mysqlService.saveUser(u).catch(() => {});
      }
    }
  }

  private seedInitialData() {
    const now = new Date().toISOString();
    const hash = bcrypt.hashSync('admin123', 10);

    // 1. Roles
    this.data.roles = [
      {
        id: 'role-super-admin',
        code: 'super_admin',
        name: 'Super Admin',
        description: 'Akses penuh ke seluruh modul sistem dan konfigurasi teknis.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'role-owner',
        code: 'owner',
        name: 'Owner / Pemilik',
        description: 'Akses dashboard, laporan keuangan, laba, inventory, pembelian, dan monitoring.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'role-manager',
        code: 'manager',
        name: 'Manager Operasional',
        description: 'Mengelola operasional toko harian, approval transaksi sensitif, dan staf.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'role-inventory',
        code: 'admin_inventory',
        name: 'Admin Inventory',
        description: 'Mengelola produk, supplier, pembelian, kartu stok, dan stock opname.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'role-kasir',
        code: 'kasir',
        name: 'Kasir (POS)',
        description: 'Melakukan transaksi penjualan kasir, cetak struk, dan shift kerja.',
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 2. Permissions
    this.data.permissions = [
      { id: 'perm-prod-view', code: 'product.view', name: 'Melihat Produk', module: 'Produk', description: 'Melihat daftar produk' },
      { id: 'perm-prod-create', code: 'product.create', name: 'Menambah Produk', module: 'Produk', description: 'Menambah produk baru' },
      { id: 'perm-prod-edit', code: 'product.edit', name: 'Mengedit Produk', module: 'Produk', description: 'Mengubah produk dan harga' },
      { id: 'perm-prod-delete', code: 'product.delete', name: 'Menghapus Produk', module: 'Produk', description: 'Soft-delete produk' },

      { id: 'perm-inv-view', code: 'inventory.view', name: 'Melihat Kartu Stok', module: 'Inventory', description: 'Melihat histori stok' },
      { id: 'perm-inv-adjust', code: 'inventory.adjust', name: 'Penyesuaian Stok', module: 'Inventory', description: 'Membuat adjustment' },
      { id: 'perm-inv-opname', code: 'inventory.opname', name: 'Stock Opname', module: 'Inventory', description: 'Input & approve opname' },

      { id: 'perm-pur-view', code: 'purchase.view', name: 'Melihat Pembelian', module: 'Pembelian', description: 'Melihat PO & invoice' },
      { id: 'perm-pur-create', code: 'purchase.create', name: 'Membuat Pembelian', module: 'Pembelian', description: 'Input PO pembelian' },
      { id: 'perm-pur-approve', code: 'purchase.approve', name: 'Approval Pembelian', module: 'Pembelian', description: 'Approval penerimaan' },

      { id: 'perm-pos-trans', code: 'pos.transaction', name: 'Transaksi Kasir', module: 'POS', description: 'Melayani penjualan kasir' },
      { id: 'perm-pos-disc', code: 'pos.discount', name: 'Diskon Kasir', module: 'POS', description: 'Memberikan diskon kasir' },
      { id: 'perm-pos-cancel', code: 'pos.cancel', name: 'Membatalkan Transaksi', module: 'POS', description: 'Batalkan invoice' },
      { id: 'perm-pos-refund', code: 'pos.refund', name: 'Retur & Refund', module: 'POS', description: 'Retur barang penjualan' },

      { id: 'perm-rep-sales', code: 'report.sales', name: 'Laporan Penjualan', module: 'Laporan', description: 'Laporan omzet penjualan' },
      { id: 'perm-rep-profit', code: 'report.profit', name: 'Laporan Laba HPP', module: 'Laporan', description: 'Laba kotor berbasis HPP' },
      { id: 'perm-rep-inv', code: 'report.inventory', name: 'Laporan Inventory', module: 'Laporan', description: 'Valuasi & status stok' },
      { id: 'perm-rep-cash', code: 'report.finance', name: 'Laporan Keuangan', module: 'Laporan', description: 'Buku kas, piutang, hutang' },

      { id: 'perm-user-mgmt', code: 'user.manage', name: 'Manajemen Pengguna', module: 'Pengguna', description: 'Kelola akun & hak akses' },
      { id: 'perm-set-mgmt', code: 'settings.manage', name: 'Pengaturan Toko', module: 'Pengaturan', description: 'Profil toko & backup DB' },
    ];

    // 3. Role Permissions
    // Super admin gets all
    this.data.rolePermissions = this.data.permissions.map((p) => ({
      roleId: 'role-super-admin',
      permissionId: p.id,
    }));

    // Owner gets reports, inventory, purchase, users
    const ownerPerms = [
      'product.view',
      'inventory.view',
      'purchase.view',
      'pos.transaction',
      'report.sales',
      'report.profit',
      'report.inventory',
      'report.finance',
      'user.manage',
      'settings.manage',
    ];
    for (const code of ownerPerms) {
      const p = this.data.permissions.find((x) => x.code === code);
      if (p) this.data.rolePermissions.push({ roleId: 'role-owner', permissionId: p.id });
    }

    // Manager
    const managerPerms = [
      'product.view',
      'product.create',
      'product.edit',
      'inventory.view',
      'inventory.adjust',
      'inventory.opname',
      'purchase.view',
      'purchase.create',
      'purchase.approve',
      'pos.transaction',
      'pos.discount',
      'pos.cancel',
      'pos.refund',
      'report.sales',
      'report.inventory',
      'report.finance',
      'settings.manage',
    ];
    for (const code of managerPerms) {
      const p = this.data.permissions.find((x) => x.code === code);
      if (p) this.data.rolePermissions.push({ roleId: 'role-manager', permissionId: p.id });
    }

    // Admin Inventory
    const invPerms = [
      'product.view',
      'product.create',
      'product.edit',
      'product.delete',
      'inventory.view',
      'inventory.adjust',
      'inventory.opname',
      'purchase.view',
      'purchase.create',
      'report.inventory',
    ];
    for (const code of invPerms) {
      const p = this.data.permissions.find((x) => x.code === code);
      if (p) this.data.rolePermissions.push({ roleId: 'role-inventory', permissionId: p.id });
    }

    // Kasir
    const kasirPerm = this.data.permissions.find((x) => x.code === 'pos.transaction');
    if (kasirPerm) {
      this.data.rolePermissions.push({ roleId: 'role-kasir', permissionId: kasirPerm.id });
    }

    // 4. Users (Clean Single Administrator Account)
    this.data.users = [
      {
        id: 'usr-admin',
        username: 'admin',
        name: 'Administrator',
        email: 'admin@kasirpro.local',
        passwordHash: hash,
        roleId: 'role-super-admin',
        phone: null,
        supervisorPin: '123456',
        status: 'active',
        failedLoginAttempts: 0,
        lastLoginAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 5. Categories
    this.data.categories = [
      { id: 'cat-sembako', code: 'SEMBAKO', name: 'Sembako & Pangan Pokok', description: 'Beras, minyak, gula, tepung', status: 'active', createdAt: now },
      { id: 'cat-minuman', code: 'MINUMAN', name: 'Minuman & Kopi', description: 'Air mineral, teh, kopi kemasan', status: 'active', createdAt: now },
      { id: 'cat-makanan', code: 'MAKANAN', name: 'Makanan Ringan & Biskuit', description: 'Mie instan, biskuit, camilan', status: 'active', createdAt: now },
      { id: 'cat-pembersih', code: 'KEBUTUHAN_RUMAH', name: 'Kebutuhan Rumah Tangga', description: 'Sabun, deterjen, pasta gigi', status: 'active', createdAt: now },
      { id: 'cat-bumbu', code: 'BUMBU_DAPUR', name: 'Bumbu & Bahan Dapur', description: 'Kecap, saus, penyedap rasa', status: 'active', createdAt: now },
    ];

    // 6. Brands
    this.data.brands = [
      { id: 'brd-indofood', name: 'Indofood', description: 'Indomie, bumbu racik', status: 'active', createdAt: now },
      { id: 'brd-unilever', name: 'Unilever', description: 'Lifebuoy, Sunlight, Rinso', status: 'active', createdAt: now },
      { id: 'brd-mayora', name: 'Mayora', description: 'Roma, Beng-Beng, Torabika', status: 'active', createdAt: now },
      { id: 'brd-wings', name: 'Wings', description: 'Daia, SoKlin, Mie Sedaap', status: 'active', createdAt: now },
      { id: 'brd-danone', name: 'Danone Aqua', description: 'Aqua air mineral', status: 'active', createdAt: now },
    ];

    // 7. Units
    this.data.units = [
      { id: 'unit-pcs', code: 'PCS', name: 'Pieces', status: 'active', createdAt: now },
      { id: 'unit-box', code: 'BOX', name: 'Box', status: 'active', createdAt: now },
      { id: 'unit-pack', code: 'PACK', name: 'Pack', status: 'active', createdAt: now },
      { id: 'unit-kg', code: 'KG', name: 'Kilogram', status: 'active', createdAt: now },
      { id: 'unit-gram', code: 'GRAM', name: 'Gram', status: 'active', createdAt: now },
      { id: 'unit-liter', code: 'LITER', name: 'Liter', status: 'active', createdAt: now },
      { id: 'unit-dus', code: 'DUS', name: 'Dus', status: 'active', createdAt: now },
      { id: 'unit-renteng', code: 'RENTENG', name: 'Renteng', status: 'active', createdAt: now },
    ];

    // 8. Suppliers
    this.data.suppliers = [
      {
        id: 'sup-001',
        code: 'SUP-001',
        name: 'PT Sumber Pangan Nusantara',
        address: 'Kawasan Industri Pulogadung Blok B No. 12, Jakarta Timur',
        phone: '021-4601234',
        whatsapp: '08111223344',
        email: 'sales@sumberpangan.co.id',
        picName: 'Hendra Setiawan',
        bankAccount: 'BCA 1234567890 a/n PT Sumber Pangan',
        notes: 'Supplier utama beras dan sembako berkualitas.',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'sup-002',
        code: 'SUP-002',
        name: 'Distributor Maju Jaya Grosir',
        address: 'Jl. Daan Mogot KM 14 No. 88, Kalideres, Jakarta Barat',
        phone: '021-5409876',
        whatsapp: '081233445566',
        email: 'order@majujayagrosir.com',
        picName: 'Dewi Lestari',
        bankAccount: 'Mandiri 0987654321 a/n CV Maju Jaya',
        notes: 'Distributor resmi mie instan, biskuit, dan minuman kemasan.',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 9. Customers
    this.data.customers = [
      {
        id: 'cust-umum',
        code: 'CUST-000',
        name: 'Pelanggan Umum',
        phone: '-',
        whatsapp: '-',
        address: 'Toko',
        customerType: 'umum',
        creditLimit: 0,
        receivableBalance: 0,
        loyaltyPoints: 0,
        notes: 'Pelanggan walk-in biasa',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cust-001',
        code: 'CUST-001',
        name: 'Warung Bu Siti',
        phone: '081312345678',
        whatsapp: '081312345678',
        address: 'Jl. Melati RT 03/RW 04 No. 15',
        customerType: 'grosir',
        creditLimit: 5000000,
        receivableBalance: 0,
        loyaltyPoints: 120,
        notes: 'Langganan grosir mingguan',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cust-002',
        code: 'CUST-002',
        name: 'Ibu Ratna (Member VIP)',
        phone: '081298761234',
        whatsapp: '081298761234',
        address: 'Komplek Permata Hijau Blok C No. 9',
        customerType: 'member',
        creditLimit: 1500000,
        receivableBalance: 0,
        loyaltyPoints: 340,
        notes: 'Member setia bulanan',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 10. Sample Master Products with initial Stock
    const initialProducts: Array<Omit<Product, 'createdAt' | 'updatedAt'>> = [
      {
        id: 'prod-001',
        sku: 'BRS-PANDAN-5KG',
        barcode: '8991234001015',
        name: 'Beras Pandan Wangi Super 5 Kg',
        categoryId: 'cat-sembako',
        brandId: null,
        unitId: 'unit-pack',
        purchasePrice: 68000,
        avgCost: 68000,
        sellingPrice: 76000,
        wholesalePrice: 72000,
        minWholesaleQty: 5,
        stock: 45,
        minStock: 10,
        locationRack: 'Rak A-01 Sembako',
        supplierId: 'sup-001',
        imageUrl: '',
        status: 'active',
      },
      {
        id: 'prod-002',
        sku: 'MYK-BIMOLI-2L',
        barcode: '8991234001022',
        name: 'Minyak Goreng Bimoli Spesial 2 Liter Pouch',
        categoryId: 'cat-sembako',
        brandId: 'brd-indofood',
        unitId: 'unit-pcs',
        purchasePrice: 32000,
        avgCost: 32000,
        sellingPrice: 37500,
        wholesalePrice: 35000,
        minWholesaleQty: 6,
        stock: 60,
        minStock: 12,
        locationRack: 'Rak A-02 Minyak',
        supplierId: 'sup-001',
        imageUrl: '',
        status: 'active',
      },
      {
        id: 'prod-003',
        sku: 'GUL-GMP-1KG',
        barcode: '8991234001039',
        name: 'Gula Pasir Kristal Putih 1 Kg',
        categoryId: 'cat-sembako',
        brandId: null,
        unitId: 'unit-kg',
        purchasePrice: 15200,
        avgCost: 15200,
        sellingPrice: 17500,
        wholesalePrice: 16500,
        minWholesaleQty: 10,
        stock: 80,
        minStock: 15,
        locationRack: 'Rak A-03 Gula',
        supplierId: 'sup-001',
        imageUrl: '',
        status: 'active',
      },
      {
        id: 'prod-004',
        sku: 'MIE-INDOMIE-GORENG',
        barcode: '089686010118',
        name: 'Indomie Mie Goreng Original 85g',
        categoryId: 'cat-makanan',
        brandId: 'brd-indofood',
        unitId: 'unit-pcs',
        purchasePrice: 2800,
        avgCost: 2800,
        sellingPrice: 3500,
        wholesalePrice: 3100,
        minWholesaleQty: 40,
        stock: 240,
        minStock: 40,
        locationRack: 'Rak B-01 Mie',
        supplierId: 'sup-002',
        imageUrl: '',
        status: 'active',
      },
      {
        id: 'prod-005',
        sku: 'MIE-INDOMIE-AYAMBAWANG',
        barcode: '089686010323',
        name: 'Indomie Kuah Rasa Ayam Bawang 69g',
        categoryId: 'cat-makanan',
        brandId: 'brd-indofood',
        unitId: 'unit-pcs',
        purchasePrice: 2750,
        avgCost: 2750,
        sellingPrice: 3500,
        wholesalePrice: 3050,
        minWholesaleQty: 40,
        stock: 180,
        minStock: 30,
        locationRack: 'Rak B-01 Mie',
        supplierId: 'sup-002',
        imageUrl: '',
        status: 'active',
      },
      {
        id: 'prod-006',
        sku: 'MIN-AQUA-600ML',
        barcode: '8992753123451',
        name: 'Aqua Air Mineral Botol 600ml',
        categoryId: 'cat-minuman',
        brandId: 'brd-danone',
        unitId: 'unit-pcs',
        purchasePrice: 2600,
        avgCost: 2600,
        sellingPrice: 4000,
        wholesalePrice: 3300,
        minWholesaleQty: 24,
        stock: 96,
        minStock: 24,
        locationRack: 'Rak C-01 Chiller',
        supplierId: 'sup-002',
        imageUrl: '',
        status: 'active',
      },
      {
        id: 'prod-007',
        sku: 'MIN-KOP-KAPALAPI-165G',
        barcode: '8991002101018',
        name: 'Kopi Kapal Api Spesial Mix 10 x 24g',
        categoryId: 'cat-minuman',
        brandId: null,
        unitId: 'unit-renteng',
        purchasePrice: 12500,
        avgCost: 12500,
        sellingPrice: 15000,
        wholesalePrice: 13500,
        minWholesaleQty: 5,
        stock: 35,
        minStock: 8,
        locationRack: 'Rak C-02 Kopi',
        supplierId: 'sup-002',
        imageUrl: '',
        status: 'active',
      },
      {
        id: 'prod-008',
        sku: 'PBR-RINSO-ANTI-NODA-770G',
        barcode: '8999999042318',
        name: 'Rinso Anti Noda Deterjen Bubuk 770g',
        categoryId: 'cat-pembersih',
        brandId: 'brd-unilever',
        unitId: 'unit-pack',
        purchasePrice: 21500,
        avgCost: 21500,
        sellingPrice: 26000,
        wholesalePrice: 24000,
        minWholesaleQty: 6,
        stock: 4, // Intentionally low to test alert
        minStock: 8,
        locationRack: 'Rak D-01 Deterjen',
        supplierId: 'sup-002',
        imageUrl: '',
        status: 'active',
      },
      {
        id: 'prod-009',
        sku: 'PBR-SUNLIGHT-LIME-650ML',
        barcode: '8999999021238',
        name: 'Sunlight Pencuci Piring Jeruk Nipis 650ml',
        categoryId: 'cat-pembersih',
        brandId: 'brd-unilever',
        unitId: 'unit-pack',
        purchasePrice: 13200,
        avgCost: 13200,
        sellingPrice: 16500,
        wholesalePrice: 15000,
        minWholesaleQty: 6,
        stock: 0, // Intentionally out of stock to test alert
        minStock: 10,
        locationRack: 'Rak D-02 Sabun',
        supplierId: 'sup-002',
        imageUrl: '',
        status: 'active',
      },
      {
        id: 'prod-010',
        sku: 'BMB-KECAP-BANGO-520ML',
        barcode: '8999999031206',
        name: 'Kecap Manis Bango Refill 520ml',
        categoryId: 'cat-bumbu',
        brandId: 'brd-unilever',
        unitId: 'unit-pack',
        purchasePrice: 22000,
        avgCost: 22000,
        sellingPrice: 26500,
        wholesalePrice: 24500,
        minWholesaleQty: 4,
        stock: 22,
        minStock: 6,
        locationRack: 'Rak B-03 Bumbu',
        supplierId: 'sup-002',
        imageUrl: '',
        status: 'active',
      },
    ];

    this.data.products = initialProducts.map((p) => ({
      ...p,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }));

    // Initial Stock Ledger records for all initialized products
    for (const prod of this.data.products) {
      if (prod.stock > 0) {
        this.data.stockMovements.push({
          id: `sm-init-${prod.id}`,
          movementDate: now,
          productId: prod.id,
          movementType: 'stok_awal',
          referenceNo: 'INIT-STOCK-2026',
          stockBefore: 0,
          stockIn: prod.stock,
          stockOut: 0,
          stockAfter: prod.stock,
          costPrice: prod.avgCost,
          userId: 'usr-admin',
          notes: 'Saldo stok awal sistem KASIRPRO',
          createdAt: now,
        });
      }
    }

    // Initial Cash balance
    this.data.cashTransactions.push({
      id: 'ct-init-modal',
      transactionNo: 'CASH-INIT-001',
      transactionDate: now,
      transactionType: 'modal_awal_shift',
      category: 'Modal Usaha Toko',
      amountIn: 2500000,
      amountOut: 0,
      balanceAfter: 2500000,
      referenceNo: 'SETUP-STORE',
      userId: 'usr-admin',
      notes: 'Modal awal kas operasional toko',
      createdAt: now,
    });
  }

  // --- ACCESSORS ---
  public getData(): DatabaseData {
    return this.data;
  }

  // --- USERS & AUTH ---
  public getUserByUsername(username: string): User | undefined {
    const term = username.toLowerCase().trim();
    return this.data.users.find(
      (u) =>
        !u.deletedAt &&
        (u.username.toLowerCase() === term ||
          (term === 'superadmin' && u.username.toLowerCase() === 'admin'))
    );
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id && !u.deletedAt);
  }

  public getRoleById(id: string): Role | undefined {
    return this.data.roles.find((r) => r.id === id);
  }

  public getPermissionsForRole(roleId: string): Permission[] {
    const permIds = this.data.rolePermissions
      .filter((rp) => rp.roleId === roleId)
      .map((rp) => rp.permissionId);
    return this.data.permissions.filter((p) => permIds.includes(p.id));
  }

  // --- AUDIT LOG ---
  public logAudit(log: Omit<AuditLog, 'id' | 'createdAt'>) {
    const record: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      ...log,
    };
    this.data.auditLogs.unshift(record);
    if (this.data.auditLogs.length > 5000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 5000);
    }
    this.save();
  }

  // --- CASH BOOK ---
  public getCashBalance(): number {
    if (this.data.cashTransactions.length === 0) return 0;
    // Get latest transaction balance
    return this.data.cashTransactions[this.data.cashTransactions.length - 1].balanceAfter;
  }

  public addCashTransaction(
    entry: Omit<CashTransaction, 'id' | 'balanceAfter' | 'createdAt'>
  ): CashTransaction {
    const currentBalance = this.getCashBalance();
    const balanceAfter = currentBalance + entry.amountIn - entry.amountOut;
    const tx: CashTransaction = {
      id: `ctx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      balanceAfter,
      ...entry,
    };
    this.data.cashTransactions.push(tx);
    this.save();
    return tx;
  }

  // --- STOCK LEDGER ---
  public recordStockMovement(
    movement: Omit<StockMovement, 'id' | 'createdAt'>
  ): StockMovement {
    const entry: StockMovement = {
      id: `sm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      ...movement,
    };
    this.data.stockMovements.push(entry);
    this.save();
    return entry;
  }

  // --- SQL EXPORTER (For XAMPP / phpMyAdmin / MySQL migration) ---
  public generateSqlDump(): string {
    const lines: string[] = [];
    lines.push('-- ==============================================================');
    lines.push('-- KASIRPRO - MYSQL / XAMPP SQL DUMP');
    lines.push(`-- Exported At: ${new Date().toISOString()}`);
    lines.push('-- ==============================================================\n');
    lines.push('SET FOREIGN_KEY_CHECKS = 0;\n');

    const escapeSql = (val: any): string => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return val.toString();
      if (typeof val === 'boolean') return val ? '1' : '0';
      if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
      return `'${val.toString().replace(/'/g, "''")}'`;
    };

    // Export Roles
    if (this.data.roles.length > 0) {
      lines.push('-- Roles');
      for (const r of this.data.roles) {
        lines.push(`INSERT INTO roles (id, code, name, description) VALUES (${escapeSql(r.id)}, ${escapeSql(r.code)}, ${escapeSql(r.name)}, ${escapeSql(r.description)}) ON DUPLICATE KEY UPDATE name=VALUES(name);`);
      }
      lines.push('');
    }

    // Export Users
    if (this.data.users.length > 0) {
      lines.push('-- Users');
      for (const u of this.data.users.filter((x) => !x.deletedAt)) {
        lines.push(`INSERT INTO users (id, username, name, email, password_hash, role_id, phone, supervisor_pin, status) VALUES (${escapeSql(u.id)}, ${escapeSql(u.username)}, ${escapeSql(u.name)}, ${escapeSql(u.email)}, ${escapeSql(u.passwordHash)}, ${escapeSql(u.roleId)}, ${escapeSql(u.phone)}, ${escapeSql(u.supervisorPin)}, ${escapeSql(u.status)}) ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash), role_id=VALUES(role_id);`);
      }
      lines.push('');
    }

    // Export Store Settings
    const s = this.data.storeSettings;
    lines.push(`INSERT INTO store_settings (id, store_name, logo_url, address, phone, whatsapp, email, tax_id_npwp, receipt_footer, currency_symbol, invoice_prefix, default_tax_rate, default_min_stock) VALUES (${escapeSql(s.id)}, ${escapeSql(s.storeName)}, ${escapeSql(s.logoUrl)}, ${escapeSql(s.address)}, ${escapeSql(s.phone)}, ${escapeSql(s.whatsapp)}, ${escapeSql(s.email)}, ${escapeSql(s.taxIdNpwp)}, ${escapeSql(s.receiptFooter)}, ${escapeSql(s.currencySymbol)}, ${escapeSql(s.invoicePrefix)}, ${escapeSql(s.defaultTaxRate)}, ${escapeSql(s.defaultMinStock)}) ON DUPLICATE KEY UPDATE store_name=VALUES(store_name);\n`);

    // Export Categories
    if (this.data.categories.length > 0) {
      lines.push('-- Categories');
      for (const cat of this.data.categories) {
        lines.push(`INSERT INTO categories (id, code, name, description, status) VALUES (${escapeSql(cat.id)}, ${escapeSql(cat.code)}, ${escapeSql(cat.name)}, ${escapeSql(cat.description)}, ${escapeSql(cat.status)}) ON DUPLICATE KEY UPDATE name=VALUES(name);`);
      }
      lines.push('');
    }

    // Export Units
    if (this.data.units.length > 0) {
      lines.push('-- Units');
      for (const u of this.data.units) {
        lines.push(`INSERT INTO units (id, code, name, status) VALUES (${escapeSql(u.id)}, ${escapeSql(u.code)}, ${escapeSql(u.name)}, ${escapeSql(u.status)}) ON DUPLICATE KEY UPDATE name=VALUES(name);`);
      }
      lines.push('');
    }

    // Export Products
    if (this.data.products.length > 0) {
      lines.push('-- Products');
      for (const p of this.data.products) {
        lines.push(`INSERT INTO products (id, sku, barcode, name, category_id, brand_id, unit_id, purchase_price, avg_cost, selling_price, wholesale_price, min_wholesale_qty, stock, min_stock, location_rack, supplier_id, status) VALUES (${escapeSql(p.id)}, ${escapeSql(p.sku)}, ${escapeSql(p.barcode)}, ${escapeSql(p.name)}, ${escapeSql(p.categoryId)}, ${escapeSql(p.brandId)}, ${escapeSql(p.unitId)}, ${escapeSql(p.purchasePrice)}, ${escapeSql(p.avgCost)}, ${escapeSql(p.sellingPrice)}, ${escapeSql(p.wholesalePrice)}, ${escapeSql(p.minWholesaleQty)}, ${escapeSql(p.stock)}, ${escapeSql(p.minStock)}, ${escapeSql(p.locationRack)}, ${escapeSql(p.supplierId)}, ${escapeSql(p.status)}) ON DUPLICATE KEY UPDATE stock=VALUES(stock), avg_cost=VALUES(avg_cost);`);
      }
      lines.push('');
    }

    // Export Customers
    if (this.data.customers.length > 0) {
      lines.push('-- Customers');
      for (const c of this.data.customers) {
        lines.push(`INSERT INTO customers (id, code, name, phone, whatsapp, address, customer_type, credit_limit, receivable_balance, loyalty_points, status) VALUES (${escapeSql(c.id)}, ${escapeSql(c.code)}, ${escapeSql(c.name)}, ${escapeSql(c.phone)}, ${escapeSql(c.whatsapp)}, ${escapeSql(c.address)}, ${escapeSql(c.customerType)}, ${escapeSql(c.creditLimit)}, ${escapeSql(c.receivableBalance)}, ${escapeSql(c.loyaltyPoints)}, ${escapeSql(c.status)}) ON DUPLICATE KEY UPDATE receivable_balance=VALUES(receivable_balance);`);
      }
      lines.push('');
    }

    // Export Suppliers
    if (this.data.suppliers.length > 0) {
      lines.push('-- Suppliers');
      for (const sup of this.data.suppliers) {
        lines.push(`INSERT INTO suppliers (id, code, name, address, phone, whatsapp, email, pic_name, bank_account, status) VALUES (${escapeSql(sup.id)}, ${escapeSql(sup.code)}, ${escapeSql(sup.name)}, ${escapeSql(sup.address)}, ${escapeSql(sup.phone)}, ${escapeSql(sup.whatsapp)}, ${escapeSql(sup.email)}, ${escapeSql(sup.picName)}, ${escapeSql(sup.bankAccount)}, ${escapeSql(sup.status)}) ON DUPLICATE KEY UPDATE name=VALUES(name);`);
      }
      lines.push('');
    }

    lines.push('SET FOREIGN_KEY_CHECKS = 1;\n');
    return lines.join('\n');
  }
}

export const db = new DatabaseStore();
