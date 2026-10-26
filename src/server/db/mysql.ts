import mysql from 'mysql2/promise';
import {
  AuditLog,
  Brand,
  CashierShift,
  CashTransaction,
  Category,
  Customer,
  Permission,
  Product,
  Purchase,
  PurchaseItem,
  Role,
  RolePermission,
  Sale,
  SaleItem,
  StoreSettings,
  Supplier,
  Unit,
  User,
} from './types.ts';

export interface MySqlConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

export class MySqlService {
  private pool: mysql.Pool | null = null;
  public isConnected = false;
  public connectionError: string | null = null;
  public config: MySqlConfig;

  constructor() {
    this.config = {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'kasirpro_db',
    };
  }

  public async connect(): Promise<boolean> {
    try {
      this.pool = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        connectTimeout: 4000,
      });

      // Test connection
      const conn = await this.pool.getConnection();
      await conn.ping();
      conn.release();

      this.isConnected = true;
      this.connectionError = null;
      console.log(`[KASIRPRO DB] Berhasil terhubung ke database MySQL '${this.config.database}' di ${this.config.host}:${this.config.port}`);
      return true;
    } catch (err: any) {
      this.isConnected = false;
      this.connectionError = err.message || 'Koneksi ke MySQL gagal.';
      console.warn(`[KASIRPRO DB] Koneksi MySQL tidak aktif (${this.connectionError}). Menggunakan penyimpanan data lokal.`);
      return false;
    }
  }

  public async checkHealth(): Promise<{
    connected: boolean;
    config: { host: string; port: number; user: string; database: string };
    error: string | null;
    counts?: { users: number; products: number; storeName: string };
  }> {
    if (!this.pool || !this.isConnected) {
      // Try to reconnect once
      const success = await this.connect();
      if (!success) {
        return {
          connected: false,
          config: {
            host: this.config.host,
            port: this.config.port,
            user: this.config.user,
            database: this.config.database,
          },
          error: this.connectionError,
        };
      }
    }

    try {
      const [uRows]: any = await this.pool!.query('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL');
      const [pRows]: any = await this.pool!.query('SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL');
      const [sRows]: any = await this.pool!.query('SELECT store_name FROM store_settings LIMIT 1');

      return {
        connected: true,
        config: {
          host: this.config.host,
          port: this.config.port,
          user: this.config.user,
          database: this.config.database,
        },
        error: null,
        counts: {
          users: Number(uRows[0]?.count || 0),
          products: Number(pRows[0]?.count || 0),
          storeName: sRows[0]?.store_name || '-',
        },
      };
    } catch (err: any) {
      return {
        connected: false,
        config: {
          host: this.config.host,
          port: this.config.port,
          user: this.config.user,
          database: this.config.database,
        },
        error: err.message,
      };
    }
  }

  // --- READ ALL FROM MYSQL ---
  public async loadAll(): Promise<{
    users?: User[];
    storeSettings?: StoreSettings;
    categories?: Category[];
    brands?: Brand[];
    units?: Unit[];
    suppliers?: Supplier[];
    customers?: Customer[];
    products?: Product[];
    roles?: Role[];
    permissions?: Permission[];
    rolePermissions?: RolePermission[];
  } | null> {
    if (!this.pool || !this.isConnected) return null;

    try {
      const result: any = {};

      // 1. Store Settings
      try {
        const [sRows]: any = await this.pool.query('SELECT * FROM store_settings LIMIT 1');
        if (sRows && sRows.length > 0) {
          const row = sRows[0];
          result.storeSettings = {
            id: row.id,
            storeName: row.store_name || '',
            logoUrl: row.logo_url || '',
            address: row.address || '',
            phone: row.phone || '',
            whatsapp: row.whatsapp || '',
            email: row.email || '',
            taxIdNpwp: row.tax_id_npwp || '',
            receiptFooter: row.receipt_footer || 'Terima kasih atas kunjungan Anda.',
            currencySymbol: row.currency_symbol || 'Rp',
            invoicePrefix: row.invoice_prefix || 'INV',
            defaultTaxRate: Number(row.default_tax_rate || 0),
            defaultMinStock: Number(row.default_min_stock || 5),
            receiptPaperSize: (row.receipt_paper_size || '58mm') as any,
            autoPrintReceipt: row.auto_print_receipt !== undefined ? !!row.auto_print_receipt : true,
            enableSoundEffects: row.enable_sound_effects !== undefined ? !!row.enable_sound_effects : true,
            maxDiscountWithoutPin: Number(row.max_discount_without_pin !== undefined ? row.max_discount_without_pin : 10),
            updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
          };
        }
      } catch (e: any) {
        console.warn('[MySqlService] load store_settings warning:', e.message);
      }

      // 2. Users
      try {
        const [uRows]: any = await this.pool.query('SELECT * FROM users');
        if (uRows && uRows.length > 0) {
          result.users = uRows.map((r: any) => ({
            id: r.id,
            username: r.username,
            name: r.name,
            email: r.email,
            passwordHash: r.password_hash,
            roleId: r.role_id,
            phone: r.phone,
            supervisorPin: r.supervisor_pin,
            status: r.status,
            failedLoginAttempts: Number(r.failed_login_attempts || 0),
            lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : null,
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
            updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
            deletedAt: r.deleted_at ? new Date(r.deleted_at).toISOString() : null,
          }));
        }
      } catch (e: any) {
        console.warn('[MySqlService] load users warning:', e.message);
      }

      // 3. Products
      try {
        const [pRows]: any = await this.pool.query('SELECT * FROM products');
        if (pRows && pRows.length > 0) {
          result.products = pRows.map((r: any) => ({
            id: r.id,
            sku: r.sku,
            barcode: r.barcode,
            name: r.name,
            categoryId: r.category_id,
            brandId: r.brand_id,
            unitId: r.unit_id,
            purchasePrice: Number(r.purchase_price || 0),
            avgCost: Number(r.avg_cost || 0),
            sellingPrice: Number(r.selling_price || 0),
            wholesalePrice: Number(r.wholesale_price || 0),
            minWholesaleQty: Number(r.min_wholesale_qty || 0),
            stock: Number(r.stock || 0),
            minStock: Number(r.min_stock || 0),
            locationRack: r.location_rack || '',
            supplierId: r.supplier_id || null,
            imageUrl: r.image_url || '',
            status: r.status || 'active',
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
            updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
            deletedAt: r.deleted_at ? new Date(r.deleted_at).toISOString() : null,
          }));
        }
      } catch (e: any) {
        console.warn('[MySqlService] load products warning:', e.message);
      }

      // 4. Categories, Brands, Units, Suppliers, Customers
      try {
        const [catRows]: any = await this.pool.query('SELECT * FROM categories');
        if (catRows) result.categories = catRows.map((r: any) => ({ id: r.id, code: r.code, name: r.name, description: r.description, status: r.status, createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString() }));
      } catch {}

      try {
        const [bRows]: any = await this.pool.query('SELECT * FROM brands');
        if (bRows) result.brands = bRows.map((r: any) => ({ id: r.id, name: r.name, description: r.description, status: r.status, createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString() }));
      } catch {}

      try {
        const [uRows]: any = await this.pool.query('SELECT * FROM units');
        if (uRows) result.units = uRows.map((r: any) => ({ id: r.id, code: r.code, name: r.name, status: r.status, createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString() }));
      } catch {}

      try {
        const [sRows]: any = await this.pool.query('SELECT * FROM suppliers');
        if (sRows) result.suppliers = sRows.map((r: any) => ({ id: r.id, code: r.code, name: r.name, address: r.address, phone: r.phone, whatsapp: r.whatsapp, email: r.email, picName: r.pic_name, bankAccount: r.bank_account, notes: r.notes, status: r.status, createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(), updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString() }));
      } catch {}

      try {
        const [cRows]: any = await this.pool.query('SELECT * FROM customers');
        if (cRows) result.customers = cRows.map((r: any) => ({ id: r.id, code: r.code, name: r.name, phone: r.phone, whatsapp: r.whatsapp, address: r.address, customerType: r.customer_type, creditLimit: Number(r.credit_limit || 0), receivableBalance: Number(r.receivable_balance || 0), loyaltyPoints: Number(r.loyalty_points || 0), notes: r.notes, status: r.status, createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(), updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString() }));
      } catch {}

      return result;
    } catch (err: any) {
      console.error('[MySqlService] loadAll error:', err);
      return null;
    }
  }

  // --- WRITE STORE SETTINGS TO MYSQL ---
  public async saveStoreSettings(settings: StoreSettings): Promise<boolean> {
    if (!this.pool || !this.isConnected) return false;

    try {
      const sql = `
        INSERT INTO store_settings (
          id, store_name, logo_url, address, phone, whatsapp, email, tax_id_npwp,
          receipt_footer, currency_symbol, invoice_prefix, default_tax_rate, default_min_stock, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          store_name = VALUES(store_name),
          logo_url = VALUES(logo_url),
          address = VALUES(address),
          phone = VALUES(phone),
          whatsapp = VALUES(whatsapp),
          email = VALUES(email),
          tax_id_npwp = VALUES(tax_id_npwp),
          receipt_footer = VALUES(receipt_footer),
          currency_symbol = VALUES(currency_symbol),
          invoice_prefix = VALUES(invoice_prefix),
          default_tax_rate = VALUES(default_tax_rate),
          default_min_stock = VALUES(default_min_stock),
          updated_at = NOW()
      `;

      await this.pool.query(sql, [
        settings.id || 'setting-primary',
        settings.storeName || '',
        settings.logoUrl || null,
        settings.address || null,
        settings.phone || null,
        settings.whatsapp || null,
        settings.email || null,
        settings.taxIdNpwp || null,
        settings.receiptFooter || 'Terima kasih atas kunjungan Anda.',
        settings.currencySymbol || 'Rp',
        settings.invoicePrefix || 'INV',
        settings.defaultTaxRate || 0,
        settings.defaultMinStock || 5,
      ]);

      console.log(`[KASIRPRO DB] Pengaturan toko berhasil disimpan ke MySQL (store_name: "${settings.storeName}")`);
      return true;
    } catch (err: any) {
      console.error('[KASIRPRO DB] Gagal menyimpan store_settings ke MySQL:', err.message);
      return false;
    }
  }

  // --- WRITE USER TO MYSQL ---
  public async saveUser(user: User): Promise<boolean> {
    if (!this.pool || !this.isConnected) return false;

    try {
      const sql = `
        INSERT INTO users (
          id, username, name, email, password_hash, role_id, phone, supervisor_pin,
          status, failed_login_attempts, last_login_at, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          username = VALUES(username),
          name = VALUES(name),
          email = VALUES(email),
          password_hash = VALUES(password_hash),
          role_id = VALUES(role_id),
          phone = VALUES(phone),
          supervisor_pin = VALUES(supervisor_pin),
          status = VALUES(status),
          failed_login_attempts = VALUES(failed_login_attempts),
          last_login_at = VALUES(last_login_at),
          updated_at = VALUES(updated_at),
          deleted_at = VALUES(deleted_at)
      `;

      const formatDate = (d: string | null | undefined) => (d ? new Date(d) : null);

      await this.pool.query(sql, [
        user.id,
        user.username,
        user.name,
        user.email || null,
        user.passwordHash,
        user.roleId,
        user.phone || null,
        user.supervisorPin || null,
        user.status || 'active',
        user.failedLoginAttempts || 0,
        formatDate(user.lastLoginAt),
        formatDate(user.createdAt) || new Date(),
        formatDate(user.updatedAt) || new Date(),
        formatDate(user.deletedAt),
      ]);

      console.log(`[KASIRPRO DB] Pengguna @${user.username} (${user.name}) berhasil disimpan ke MySQL`);
      return true;
    } catch (err: any) {
      console.error(`[KASIRPRO DB] Gagal menyimpan user @${user.username} ke MySQL:`, err.message);
      return false;
    }
  }

  // --- WRITE PRODUCT TO MYSQL ---
  public async saveProduct(prod: Product): Promise<boolean> {
    if (!this.pool || !this.isConnected) return false;

    try {
      const sql = `
        INSERT INTO products (
          id, sku, barcode, name, category_id, brand_id, unit_id, purchase_price, avg_cost,
          selling_price, wholesale_price, min_wholesale_qty, stock, min_stock, location_rack,
          supplier_id, image_url, status, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          sku = VALUES(sku),
          barcode = VALUES(barcode),
          name = VALUES(name),
          category_id = VALUES(category_id),
          brand_id = VALUES(brand_id),
          unit_id = VALUES(unit_id),
          purchase_price = VALUES(purchase_price),
          avg_cost = VALUES(avg_cost),
          selling_price = VALUES(selling_price),
          wholesale_price = VALUES(wholesale_price),
          min_wholesale_qty = VALUES(min_wholesale_qty),
          stock = VALUES(stock),
          min_stock = VALUES(min_stock),
          location_rack = VALUES(location_rack),
          supplier_id = VALUES(supplier_id),
          image_url = VALUES(image_url),
          status = VALUES(status),
          updated_at = VALUES(updated_at),
          deleted_at = VALUES(deleted_at)
      `;

      const formatDate = (d: string | null | undefined) => (d ? new Date(d) : null);

      await this.pool.query(sql, [
        prod.id,
        prod.sku,
        prod.barcode,
        prod.name,
        prod.categoryId,
        prod.brandId || null,
        prod.unitId,
        prod.purchasePrice || 0,
        prod.avgCost || 0,
        prod.sellingPrice || 0,
        prod.wholesalePrice || 0,
        prod.minWholesaleQty || 0,
        prod.stock || 0,
        prod.minStock || 0,
        prod.locationRack || null,
        prod.supplierId || null,
        prod.imageUrl || null,
        prod.status || 'active',
        formatDate(prod.createdAt) || new Date(),
        formatDate(prod.updatedAt) || new Date(),
        formatDate(prod.deletedAt),
      ]);

      return true;
    } catch (err: any) {
      console.error(`[KASIRPRO DB] Gagal menyimpan product ${prod.name} ke MySQL:`, err.message);
      return false;
    }
  }

  // --- SYNC ALL TABLES TO MYSQL ---
  public async syncAll(data: any): Promise<{ success: boolean; message: string }> {
    if (!this.pool || !this.isConnected) {
      const ok = await this.connect();
      if (!ok) {
        return { success: false, message: this.connectionError || 'Koneksi ke MySQL tidak aktif.' };
      }
    }

    try {
      // 1. Roles & Permissions
      for (const r of data.roles || []) {
        await this.pool!.query(
          `INSERT INTO roles (id, code, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), updated_at=VALUES(updated_at)`,
          [r.id, r.code, r.name, r.description, new Date(r.createdAt), new Date(r.updatedAt)]
        );
      }

      for (const p of data.permissions || []) {
        await this.pool!.query(
          `INSERT INTO permissions (id, code, name, module, description, created_at) VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), module=VALUES(module), description=VALUES(description)`,
          [p.id, p.code, p.name, p.module, p.description, new Date()]
        );
      }

      for (const rp of data.rolePermissions || []) {
        await this.pool!.query(
          `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
          [rp.roleId, rp.permissionId]
        );
      }

      // 2. Store Settings
      if (data.storeSettings) {
        await this.saveStoreSettings(data.storeSettings);
      }

      // 3. Users
      for (const u of data.users || []) {
        await this.saveUser(u);
      }

      // 4. Categories, Brands, Units
      for (const c of data.categories || []) {
        await this.pool!.query(
          `INSERT INTO categories (id, code, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), status=VALUES(status)`,
          [c.id, c.code, c.name, c.description || null, c.status || 'active', new Date(c.createdAt), new Date()]
        );
      }

      for (const b of data.brands || []) {
        await this.pool!.query(
          `INSERT INTO brands (id, name, description, status, created_at) VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE description=VALUES(description), status=VALUES(status)`,
          [b.id, b.name, b.description || null, b.status || 'active', new Date(b.createdAt)]
        );
      }

      for (const u of data.units || []) {
        await this.pool!.query(
          `INSERT INTO units (id, code, name, status, created_at) VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status)`,
          [u.id, u.code, u.name, u.status || 'active', new Date(u.createdAt)]
        );
      }

      // 5. Suppliers & Customers
      for (const s of data.suppliers || []) {
        await this.pool!.query(
          `INSERT INTO suppliers (id, code, name, address, phone, whatsapp, email, pic_name, bank_account, notes, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), address=VALUES(address), phone=VALUES(phone), status=VALUES(status)`,
          [s.id, s.code, s.name, s.address || null, s.phone || null, s.whatsapp || null, s.email || null, s.picName || null, s.bankAccount || null, s.notes || null, s.status || 'active', new Date(s.createdAt), new Date()]
        );
      }

      for (const c of data.customers || []) {
        await this.pool!.query(
          `INSERT INTO customers (id, code, name, phone, whatsapp, address, customer_type, credit_limit, receivable_balance, loyalty_points, notes, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), address=VALUES(address), customer_type=VALUES(customer_type)`,
          [c.id, c.code, c.name, c.phone || null, c.whatsapp || null, c.address || null, c.customerType || 'umum', c.creditLimit || 0, c.receivableBalance || 0, c.loyaltyPoints || 0, c.notes || null, c.status || 'active', new Date(c.createdAt), new Date()]
        );
      }

      // 6. Products
      for (const prod of data.products || []) {
        await this.saveProduct(prod);
      }

      return { success: true, message: 'Seluruh data berhasil disinkronkan ke MySQL.' };
    } catch (err: any) {
      console.error('[KASIRPRO DB] syncAll error:', err);
      return { success: false, message: err.message };
    }
  }
}

export const mysqlService = new MySqlService();
