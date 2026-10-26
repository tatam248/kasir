-- ==============================================================================
-- KASIRPRO - INITIAL SEED DATA
-- Database Seeds: System Roles, Granular Permissions, Users, Master Data, Settings
-- ==============================================================================

USE `kasirpro_db`;

-- 1. ROLES
INSERT INTO `roles` (`id`, `code`, `name`, `description`) VALUES
('role-super-admin', 'super_admin', 'Super Admin', 'Akses penuh ke seluruh modul sistem dan konfigurasi teknis.'),
('role-owner', 'owner', 'Owner / Pemilik', 'Akses dashboard, laporan keuangan, laba, inventory, pembelian, dan monitoring.'),
('role-manager', 'manager', 'Manager Operasional', 'Mengelola operasional toko harian, approval transaksi sensitif, dan staf.'),
('role-inventory', 'admin_inventory', 'Admin Inventory', 'Mengelola produk, supplier, pembelian, kartu stok, dan stock opname.'),
('role-kasir', 'kasir', 'Kasir (POS)', 'Melakukan transaksi penjualan kasir, cetak struk, dan shift kerja.');

-- 2. PERMISSIONS
INSERT INTO `permissions` (`id`, `code`, `name`, `module`, `description`) VALUES
('perm-prod-view', 'product.view', 'Melihat Produk', 'Produk', 'Izin melihat daftar katalog produk dan harga jual'),
('perm-prod-create', 'product.create', 'Menambah Produk', 'Produk', 'Izin mendaftarkan produk baru'),
('perm-prod-edit', 'product.edit', 'Mengedit Produk', 'Produk', 'Izin memperbarui informasi produk dan harga'),
('perm-prod-delete', 'product.delete', 'Menghapus Produk', 'Produk', 'Izin menonaktifkan atau soft-delete produk'),

('perm-inv-view', 'inventory.view', 'Melihat Kartu Stok', 'Inventory', 'Izin melihat mutasi dan kartu stok barang'),
('perm-inv-adjust', 'inventory.adjust', 'Penyesuaian Stok', 'Inventory', 'Izin membuat penyesuaian stok manual / barang rusak'),
('perm-inv-opname', 'inventory.opname', 'Stock Opname', 'Inventory', 'Izin menjalankan dan menyetujui stock opname fisik'),

('perm-pur-view', 'purchase.view', 'Melihat Pembelian', 'Pembelian', 'Izin melihat purchase order dan invoice supplier'),
('perm-pur-create', 'purchase.create', 'Membuat Pembelian', 'Pembelian', 'Izin input PO dan penerimaan barang supplier'),
('perm-pur-approve', 'purchase.approve', 'Approval Pembelian', 'Pembelian', 'Izin approval pembelian dan posting hutang'),

('perm-pos-trans', 'pos.transaction', 'Transaksi Kasir', 'POS', 'Izin melayani checkout penjualan di kasir'),
('perm-pos-disc', 'pos.discount', 'Diskon Kasir', 'POS', 'Izin memberikan diskon manual transaksi kasir'),
('perm-pos-cancel', 'pos.cancel', 'Membatalkan Transaksi', 'POS', 'Izin membatalkan transaksi yang sudah diposting'),
('perm-pos-refund', 'pos.refund', 'Retur & Refund', 'POS', 'Izin memproses retur barang dan pengembalian uang'),

('perm-rep-sales', 'report.sales', 'Laporan Penjualan', 'Laporan', 'Izin melihat ringkasan penjualan harian/bulanan'),
('perm-rep-profit', 'report.profit', 'Laporan Laba HPP', 'Laporan', 'Izin melihat margin keuntungan dan HPP barang'),
('perm-rep-inv', 'report.inventory', 'Laporan Inventory', 'Laporan', 'Izin melihat valuasi stok dan peringatan barang'),
('perm-rep-cash', 'report.finance', 'Laporan Keuangan & Kas', 'Laporan', 'Izin melihat arus kas, hutang, dan piutang'),

('perm-user-mgmt', 'user.manage', 'Manajemen Pengguna', 'Pengguna', 'Izin mengelola akun staf, role, dan hak akses'),
('perm-set-mgmt', 'settings.manage', 'Pengaturan Toko', 'Pengaturan', 'Izin mengubah identitas toko, backup database, dan konfigurasi');

-- 3. ROLE_PERMISSIONS MAPPING
-- Super Admin: All permissions
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 'role-super-admin', `id` FROM `permissions`;

-- Owner: Dashboard, reports, inventory, purchase, users view, settings
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 'role-owner', `id` FROM `permissions`
WHERE `code` IN (
  'product.view', 'inventory.view', 'purchase.view', 'pos.transaction',
  'report.sales', 'report.profit', 'report.inventory', 'report.finance',
  'user.manage', 'settings.manage'
);

-- Manager: Operational master, stock adjustment, approvals, sales report
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 'role-manager', `id` FROM `permissions`
WHERE `code` IN (
  'product.view', 'product.create', 'product.edit',
  'inventory.view', 'inventory.adjust', 'inventory.opname',
  'purchase.view', 'purchase.create', 'purchase.approve',
  'pos.transaction', 'pos.discount', 'pos.cancel', 'pos.refund',
  'report.sales', 'report.inventory', 'report.finance'
);

-- Admin Inventory: Master product, stock ledger, stock opname, purchase
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 'role-inventory', `id` FROM `permissions`
WHERE `code` IN (
  'product.view', 'product.create', 'product.edit', 'product.delete',
  'inventory.view', 'inventory.adjust', 'inventory.opname',
  'purchase.view', 'purchase.create',
  'report.inventory'
);

-- Kasir: POS transaction only
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 'role-kasir', `id` FROM `permissions`
WHERE `code` IN ('pos.transaction');

-- 4. INITIAL USERS (Single Clean Administrator Account)
-- Username: admin | Password: admin123 | Role: Super Admin (Akses Penuh)
-- Catatan: Pengguna kasir, gudang, manager, dll. dibuat langsung melalui menu Manajemen Pengguna.
INSERT INTO `users` (`id`, `username`, `name`, `email`, `password_hash`, `role_id`, `phone`, `supervisor_pin`, `status`) VALUES
('usr-admin', 'admin', 'Administrator', 'admin@kasirpro.local', '$2a$10$123456789012345678901u./zCLeARnBuyfsw17qkjYMfd7L4o2om', 'role-super-admin', NULL, '123456', 'active');

-- 5. MASTER CATEGORIES
INSERT INTO `categories` (`id`, `code`, `name`, `description`, `status`) VALUES
('cat-sembako', 'SEMBAKO', 'Sembako & Pangan Pokok', 'Beras, minyak goreng, gula, tepung terigu', 'active'),
('cat-minuman', 'MINUMAN', 'Minuman & Kopi', 'Air mineral, susu kemasan, kopi sachet, teh', 'active'),
('cat-makanan', 'MAKANAN', 'Makanan Ringan & Biskuit', 'Camilan, keripik, wafer, mie instan', 'active'),
('cat-pembersih', 'KEBUTUHAN_RUMAH', 'Kebutuhan Rumah Tangga', 'Sabun mandi, deterjen, pasta gigi, pembersih lantai', 'active'),
('cat-bumbu', 'BUMBU_DAPUR', 'Bumbu & Bahan Dapur', 'Penyedap rasa, kecap, saus, garam', 'active');

-- 6. MASTER BRANDS
INSERT INTO `brands` (`id`, `name`, `description`, `status`) VALUES
('brd-indofood', 'Indofood', 'Produsen mie instan, bumbu, dan makanan', 'active'),
('brd-unilever', 'Unilever', 'Produk kebutuhan rumah tangga & kebersihan', 'active'),
('brd-wings', 'Wings', 'Deterjen, sabun, dan mie', 'active'),
('brd-mayora', 'Mayora', 'Biskuit, wafer, permen, dan kopi', 'active'),
('brd-danone', 'Danone Aqua', 'Air mineral dan nutrisi', 'active');

-- 7. MASTER UNITS
INSERT INTO `units` (`id`, `code`, `name`, `status`) VALUES
('unit-pcs', 'PCS', 'Pieces / Satuan Tunggal', 'active'),
('unit-box', 'BOX', 'Box / Kotak', 'active'),
('unit-pack', 'PACK', 'Pack / Bungkus', 'active'),
('unit-kg', 'KG', 'Kilogram', 'active'),
('unit-gram', 'GRAM', 'Gram', 'active'),
('unit-liter', 'LITER', 'Liter', 'active'),
('unit-dus', 'DUS', 'Dus Karton', 'active'),
('unit-renteng', 'RENTENG', 'Renteng (10-12 sachet)', 'active');

-- 8. INITIAL STORE SETTINGS (Clean Default - dapat dikonfigurasi melalui menu Pengaturan Toko)
INSERT INTO `store_settings` (`id`, `store_name`, `logo_url`, `address`, `phone`, `whatsapp`, `email`, `tax_id_npwp`, `receipt_footer`, `currency_symbol`, `invoice_prefix`, `default_tax_rate`, `default_min_stock`) VALUES
('setting-primary', '', '', '', '', '', '', '', 'Terima kasih atas kunjungan Anda.', 'Rp', 'INV', 0.00, 5.00);
