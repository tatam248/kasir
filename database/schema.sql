-- ==============================================================================
-- KASIRPRO - POS, INVENTORY & USER MANAGEMENT SYSTEM
-- Database Schema: MySQL 8.0 / MariaDB 10.4+ (XAMPP Compatible)
-- Engine: InnoDB, Charset: utf8mb4, Collation: utf8mb4_unicode_ci
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `kasirpro_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `kasirpro_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. ROLES
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. PERMISSIONS
DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(80) NOT NULL UNIQUE,
  `name` VARCHAR(120) NOT NULL,
  `module` VARCHAR(60) NOT NULL,
  `description` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ROLE_PERMISSIONS
DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions` (
  `role_id` VARCHAR(36) NOT NULL,
  `permission_id` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_perm` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. USERS
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` VARCHAR(36) NOT NULL,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role_id` VARCHAR(36) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `supervisor_pin` VARCHAR(10) NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `failed_login_attempts` INT NOT NULL DEFAULT 0,
  `last_login_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. CATEGORIES
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. BRANDS
DROP TABLE IF EXISTS `brands`;
CREATE TABLE `brands` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. UNITS
DROP TABLE IF EXISTS `units`;
CREATE TABLE `units` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(30) NOT NULL UNIQUE,
  `name` VARCHAR(60) NOT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. SUPPLIERS
DROP TABLE IF EXISTS `suppliers`;
CREATE TABLE `suppliers` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `address` TEXT NULL,
  `phone` VARCHAR(30) NULL,
  `whatsapp` VARCHAR(30) NULL,
  `email` VARCHAR(100) NULL,
  `pic_name` VARCHAR(100) NULL,
  `bank_account` VARCHAR(100) NULL,
  `notes` TEXT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. CUSTOMERS
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `whatsapp` VARCHAR(30) NULL,
  `address` TEXT NULL,
  `customer_type` ENUM('umum', 'member', 'grosir') NOT NULL DEFAULT 'umum',
  `credit_limit` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `receivable_balance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `loyalty_points` INT NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. PRODUCTS
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` VARCHAR(36) NOT NULL,
  `sku` VARCHAR(50) NOT NULL UNIQUE,
  `barcode` VARCHAR(60) NOT NULL UNIQUE,
  `name` VARCHAR(200) NOT NULL,
  `category_id` VARCHAR(36) NOT NULL,
  `brand_id` VARCHAR(36) NULL,
  `unit_id` VARCHAR(36) NOT NULL,
  `purchase_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00, -- Last purchase price
  `avg_cost` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,       -- Weighted Average Cost (HPP)
  `selling_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `wholesale_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `min_wholesale_qty` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `stock` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `min_stock` DECIMAL(12, 2) NOT NULL DEFAULT 5.00,
  `location_rack` VARCHAR(80) NULL,
  `supplier_id` VARCHAR(36) NULL,
  `image_url` VARCHAR(255) NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_prod_category` (`category_id`),
  INDEX `idx_prod_supplier` (`supplier_id`),
  CONSTRAINT `fk_prod_cat` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  CONSTRAINT `fk_prod_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`),
  CONSTRAINT `fk_prod_sup` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. STOCK_MOVEMENTS (Stock Ledger / Kartu Stok)
DROP TABLE IF EXISTS `stock_movements`;
CREATE TABLE `stock_movements` (
  `id` VARCHAR(36) NOT NULL,
  `movement_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `product_id` VARCHAR(36) NOT NULL,
  `movement_type` ENUM(
    'stok_awal', 
    'pembelian', 
    'penjualan', 
    'retur_pembelian', 
    'retur_penjualan', 
    'penyesuaian_stok', 
    'barang_rusak', 
    'barang_hilang', 
    'stock_opname'
  ) NOT NULL,
  `reference_no` VARCHAR(60) NOT NULL,
  `stock_before` DECIMAL(12, 2) NOT NULL,
  `stock_in` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `stock_out` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `stock_after` DECIMAL(12, 2) NOT NULL,
  `cost_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `user_id` VARCHAR(36) NOT NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_sm_product` (`product_id`),
  INDEX `idx_sm_date` (`movement_date`),
  INDEX `idx_sm_ref` (`reference_no`),
  CONSTRAINT `fk_sm_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `fk_sm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. CASHIER_SHIFTS
DROP TABLE IF EXISTS `cashier_shifts`;
CREATE TABLE `cashier_shifts` (
  `id` VARCHAR(36) NOT NULL,
  `shift_number` VARCHAR(50) NOT NULL UNIQUE,
  `user_id` VARCHAR(36) NOT NULL,
  `opened_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` DATETIME NULL,
  `opening_balance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `cash_sales_total` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `cash_in_total` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `cash_out_total` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `expected_closing_balance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `actual_closing_balance` DECIMAL(15, 2) NULL,
  `variance` DECIMAL(15, 2) NULL,
  `notes` TEXT NULL,
  `status` ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_shift_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. PURCHASES
DROP TABLE IF EXISTS `purchases`;
CREATE TABLE `purchases` (
  `id` VARCHAR(36) NOT NULL,
  `purchase_no` VARCHAR(50) NOT NULL UNIQUE,
  `invoice_no` VARCHAR(60) NULL,
  `purchase_date` DATE NOT NULL,
  `supplier_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `discount_total` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `tax_total` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `payment_type` ENUM('tunai', 'transfer', 'kredit') NOT NULL DEFAULT 'tunai',
  `payment_status` ENUM('lunas', 'belum_lunas', 'sebagian') NOT NULL DEFAULT 'lunas',
  `due_date` DATE NULL,
  `shipping_status` ENUM('draft', 'dipesan', 'diterima_sebagian', 'diterima', 'batal') NOT NULL DEFAULT 'diterima',
  `received_at` DATETIME NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_po_sup` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `fk_po_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. PURCHASE_ITEMS
DROP TABLE IF EXISTS `purchase_items`;
CREATE TABLE `purchase_items` (
  `id` VARCHAR(36) NOT NULL,
  `purchase_id` VARCHAR(36) NOT NULL,
  `product_id` VARCHAR(36) NOT NULL,
  `qty` DECIMAL(12, 2) NOT NULL,
  `purchase_price` DECIMAL(15, 2) NOT NULL,
  `discount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `subtotal` DECIMAL(15, 2) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_pi_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pi_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. ACCOUNTS_PAYABLE (Hutang Supplier)
DROP TABLE IF EXISTS `accounts_payable`;
CREATE TABLE `accounts_payable` (
  `id` VARCHAR(36) NOT NULL,
  `purchase_id` VARCHAR(36) NOT NULL UNIQUE,
  `supplier_id` VARCHAR(36) NOT NULL,
  `invoice_no` VARCHAR(60) NOT NULL,
  `total_amount` DECIMAL(15, 2) NOT NULL,
  `paid_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `remaining_amount` DECIMAL(15, 2) NOT NULL,
  `due_date` DATE NOT NULL,
  `status` ENUM('belum_lunas', 'sebagian', 'lunas') NOT NULL DEFAULT 'belum_lunas',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_ap_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`),
  CONSTRAINT `fk_ap_sup` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. PAYABLE_PAYMENTS
DROP TABLE IF EXISTS `payable_payments`;
CREATE TABLE `payable_payments` (
  `id` VARCHAR(36) NOT NULL,
  `payment_no` VARCHAR(50) NOT NULL UNIQUE,
  `payable_id` VARCHAR(36) NOT NULL,
  `payment_date` DATE NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `payment_method` ENUM('tunai', 'transfer', 'lainnya') NOT NULL DEFAULT 'tunai',
  `user_id` VARCHAR(36) NOT NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_paypay_ap` FOREIGN KEY (`payable_id`) REFERENCES `accounts_payable` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_paypay_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. SALES (Penjualan / POS)
DROP TABLE IF EXISTS `sales`;
CREATE TABLE `sales` (
  `id` VARCHAR(36) NOT NULL,
  `invoice_no` VARCHAR(50) NOT NULL UNIQUE,
  `sale_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `customer_id` VARCHAR(36) NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `shift_id` VARCHAR(36) NULL,
  `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `discount_total` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `tax_total` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `total_cost_hpp` DECIMAL(15, 2) NOT NULL DEFAULT 0.00, -- Weighted Average Cost of Goods Sold
  `payment_type` ENUM('tunai', 'transfer', 'qris', 'ewallet', 'debit', 'kredit') NOT NULL DEFAULT 'tunai',
  `amount_paid` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `change_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('selesai', 'batal', 'retur_sebagian', 'retur_total', 'hold') NOT NULL DEFAULT 'selesai',
  `cancel_reason` VARCHAR(255) NULL,
  `approved_by_id` VARCHAR(36) NULL,
  `idempotency_token` VARCHAR(64) NULL UNIQUE,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_sales_inv` (`invoice_no`),
  INDEX `idx_sales_date` (`sale_date`),
  CONSTRAINT `fk_sale_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sale_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_sale_shift` FOREIGN KEY (`shift_id`) REFERENCES `cashier_shifts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. SALE_ITEMS
DROP TABLE IF EXISTS `sale_items`;
CREATE TABLE `sale_items` (
  `id` VARCHAR(36) NOT NULL,
  `sale_id` VARCHAR(36) NOT NULL,
  `product_id` VARCHAR(36) NOT NULL,
  `qty` DECIMAL(12, 2) NOT NULL,
  `unit_price` DECIMAL(15, 2) NOT NULL,
  `unit_cost` DECIMAL(15, 2) NOT NULL, -- HPP per unit at time of sale
  `discount_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `subtotal` DECIMAL(15, 2) NOT NULL,
  `returned_qty` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_si_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_si_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. ACCOUNTS_RECEIVABLE (Piutang Pelanggan)
DROP TABLE IF EXISTS `accounts_receivable`;
CREATE TABLE `accounts_receivable` (
  `id` VARCHAR(36) NOT NULL,
  `sale_id` VARCHAR(36) NOT NULL UNIQUE,
  `customer_id` VARCHAR(36) NOT NULL,
  `invoice_no` VARCHAR(60) NOT NULL,
  `total_amount` DECIMAL(15, 2) NOT NULL,
  `paid_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `remaining_amount` DECIMAL(15, 2) NOT NULL,
  `due_date` DATE NOT NULL,
  `status` ENUM('belum_lunas', 'sebagian', 'lunas') NOT NULL DEFAULT 'belum_lunas',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_ar_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`),
  CONSTRAINT `fk_ar_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. RECEIVABLE_PAYMENTS
DROP TABLE IF EXISTS `receivable_payments`;
CREATE TABLE `receivable_payments` (
  `id` VARCHAR(36) NOT NULL,
  `payment_no` VARCHAR(50) NOT NULL UNIQUE,
  `receivable_id` VARCHAR(36) NOT NULL,
  `payment_date` DATE NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `payment_method` ENUM('tunai', 'transfer', 'qris', 'debit') NOT NULL DEFAULT 'tunai',
  `user_id` VARCHAR(36) NOT NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_recpay_ar` FOREIGN KEY (`receivable_id`) REFERENCES `accounts_receivable` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_recpay_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. SALES_RETURNS (Retur Penjualan)
DROP TABLE IF EXISTS `sales_returns`;
CREATE TABLE `sales_returns` (
  `id` VARCHAR(36) NOT NULL,
  `return_no` VARCHAR(50) NOT NULL UNIQUE,
  `sale_id` VARCHAR(36) NOT NULL,
  `return_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_id` VARCHAR(36) NOT NULL,
  `approved_by_id` VARCHAR(36) NOT NULL,
  `total_refund` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `reason` VARCHAR(255) NOT NULL,
  `refund_method` ENUM('tunai', 'transfer', 'potong_piutang') NOT NULL DEFAULT 'tunai',
  `status` ENUM('completed', 'cancelled') NOT NULL DEFAULT 'completed',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sr_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`),
  CONSTRAINT `fk_sr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. SALES_RETURN_ITEMS
DROP TABLE IF EXISTS `sales_return_items`;
CREATE TABLE `sales_return_items` (
  `id` VARCHAR(36) NOT NULL,
  `return_id` VARCHAR(36) NOT NULL,
  `sale_item_id` VARCHAR(36) NOT NULL,
  `product_id` VARCHAR(36) NOT NULL,
  `qty` DECIMAL(12, 2) NOT NULL,
  `refund_price` DECIMAL(15, 2) NOT NULL,
  `subtotal` DECIMAL(15, 2) NOT NULL,
  `condition_type` ENUM('bagus', 'rusak') NOT NULL DEFAULT 'bagus',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sri_ret` FOREIGN KEY (`return_id`) REFERENCES `sales_returns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sri_si` FOREIGN KEY (`sale_item_id`) REFERENCES `sale_items` (`id`),
  CONSTRAINT `fk_sri_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. STOCK_OPNAMES
DROP TABLE IF EXISTS `stock_opnames`;
CREATE TABLE `stock_opnames` (
  `id` VARCHAR(36) NOT NULL,
  `opname_no` VARCHAR(50) NOT NULL UNIQUE,
  `opname_date` DATE NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `approved_by_id` VARCHAR(36) NULL,
  `status` ENUM('draft', 'posted', 'cancelled') NOT NULL DEFAULT 'draft',
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `posted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_so_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_so_app` FOREIGN KEY (`approved_by_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. STOCK_OPNAME_ITEMS
DROP TABLE IF EXISTS `stock_opname_items`;
CREATE TABLE `stock_opname_items` (
  `id` VARCHAR(36) NOT NULL,
  `opname_id` VARCHAR(36) NOT NULL,
  `product_id` VARCHAR(36) NOT NULL,
  `system_stock` DECIMAL(12, 2) NOT NULL,
  `physical_stock` DECIMAL(12, 2) NOT NULL,
  `difference` DECIMAL(12, 2) NOT NULL,
  `cost_price` DECIMAL(15, 2) NOT NULL,
  `reason` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_soi_opname` FOREIGN KEY (`opname_id`) REFERENCES `stock_opnames` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_soi_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. CASH_TRANSACTIONS (Buku Kas)
DROP TABLE IF EXISTS `cash_transactions`;
CREATE TABLE `cash_transactions` (
  `id` VARCHAR(36) NOT NULL,
  `transaction_no` VARCHAR(50) NOT NULL UNIQUE,
  `transaction_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `transaction_type` ENUM(
    'penjualan', 
    'pembelian', 
    'pembayaran_piutang', 
    'pembayaran_hutang', 
    'pengeluaran_operasional', 
    'pendapatan_lainnya', 
    'penyesuaian_kas',
    'modal_awal_shift',
    'refund_retur'
  ) NOT NULL,
  `category` VARCHAR(60) NOT NULL,
  `amount_in` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `amount_out` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `balance_after` DECIMAL(15, 2) NOT NULL,
  `reference_no` VARCHAR(60) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_ct_date` (`transaction_date`),
  INDEX `idx_ct_ref` (`reference_no`),
  CONSTRAINT `fk_ct_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. AUDIT_LOGS
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NULL,
  `username` VARCHAR(100) NOT NULL,
  `action` VARCHAR(60) NOT NULL,
  `module` VARCHAR(60) NOT NULL,
  `record_id` VARCHAR(80) NULL,
  `details` TEXT NULL,
  `data_before` JSON NULL,
  `data_after` JSON NULL,
  `ip_address` VARCHAR(50) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_audit_module` (`module`),
  INDEX `idx_audit_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 27. STORE_SETTINGS
DROP TABLE IF EXISTS `store_settings`;
CREATE TABLE `store_settings` (
  `id` VARCHAR(36) NOT NULL,
  `store_name` VARCHAR(150) NOT NULL,
  `logo_url` VARCHAR(255) NULL,
  `address` TEXT NULL,
  `phone` VARCHAR(30) NULL,
  `whatsapp` VARCHAR(30) NULL,
  `email` VARCHAR(100) NULL,
  `tax_id_npwp` VARCHAR(60) NULL,
  `receipt_footer` TEXT NULL,
  `currency_symbol` VARCHAR(10) NOT NULL DEFAULT 'Rp',
  `invoice_prefix` VARCHAR(10) NOT NULL DEFAULT 'INV',
  `default_tax_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `default_min_stock` DECIMAL(12, 2) NOT NULL DEFAULT 5.00,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
