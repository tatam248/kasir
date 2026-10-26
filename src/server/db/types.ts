export type RoleCode = 'super_admin' | 'owner' | 'manager' | 'admin_inventory' | 'kasir';

export interface Role {
  id: string;
  code: RoleCode;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string | null;
  passwordHash: string;
  roleId: string;
  roleCode?: RoleCode;
  roleName?: string;
  phone: string | null;
  supervisorPin: string | null;
  status: 'active' | 'inactive';
  failedLoginAttempts: number;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Category {
  id: string;
  code: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Brand {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Unit {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  picName: string;
  bankAccount: string;
  notes: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  whatsapp: string;
  address: string;
  customerType: 'umum' | 'member' | 'grosir';
  creditLimit: number;
  receivableBalance: number;
  loyaltyPoints: number;
  notes: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  brandId: string | null;
  brandName?: string;
  unitId: string;
  unitCode?: string;
  purchasePrice: number;   // Last purchase price
  avgCost: number;         // Weighted Average Cost (HPP)
  sellingPrice: number;    // Retail price
  wholesalePrice: number;  // Wholesale price
  minWholesaleQty: number; // Min qty for wholesale
  stock: number;
  minStock: number;
  locationRack: string;
  supplierId: string | null;
  supplierName?: string;
  imageUrl: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type MovementType =
  | 'stok_awal'
  | 'pembelian'
  | 'penjualan'
  | 'retur_pembelian'
  | 'retur_penjualan'
  | 'penyesuaian_stok'
  | 'barang_rusak'
  | 'barang_hilang'
  | 'stock_opname';

export interface StockMovement {
  id: string;
  movementDate: string;
  productId: string;
  productName?: string;
  productSku?: string;
  movementType: MovementType;
  referenceNo: string;
  stockBefore: number;
  stockIn: number;
  stockOut: number;
  stockAfter: number;
  costPrice: number;
  userId: string;
  userName?: string;
  notes: string;
  createdAt: string;
}

export interface CashierShift {
  id: string;
  shiftNumber: string;
  userId: string;
  userName?: string;
  openedAt: string;
  closedAt: string | null;
  openingBalance: number;
  cashSalesTotal: number;
  cashInTotal: number;
  cashOutTotal: number;
  expectedClosingBalance: number;
  actualClosingBalance: number | null;
  variance: number | null;
  notes: string;
  status: 'open' | 'closed';
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  productName?: string;
  sku?: string;
  qty: number;
  purchasePrice: number;
  discount: number;
  subtotal: number;
}

export interface Purchase {
  id: string;
  purchaseNo: string;
  invoiceNo: string;
  purchaseDate: string;
  supplierId: string;
  supplierName?: string;
  userId: string;
  userName?: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paymentType: 'tunai' | 'transfer' | 'kredit';
  paymentStatus: 'lunas' | 'belum_lunas' | 'sebagian';
  dueDate: string | null;
  shippingStatus: 'draft' | 'dipesan' | 'diterima_sebagian' | 'diterima' | 'batal';
  receivedAt: string | null;
  notes: string;
  items?: PurchaseItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AccountsPayable {
  id: string;
  purchaseId: string;
  purchaseNo?: string;
  supplierId: string;
  supplierName?: string;
  invoiceNo: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: 'belum_lunas' | 'sebagian' | 'lunas';
  createdAt: string;
  updatedAt: string;
}

export interface PayablePayment {
  id: string;
  paymentNo: string;
  payableId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: 'tunai' | 'transfer' | 'lainnya';
  userId: string;
  userName?: string;
  notes: string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName?: string;
  sku?: string;
  barcode?: string;
  unitCode?: string;
  qty: number;
  unitPrice: number;
  unitCost: number; // HPP per unit at time of sale
  discountAmount: number;
  subtotal: number;
  returnedQty: number;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  saleDate: string;
  customerId: string | null;
  customerName?: string;
  userId: string;
  userName?: string;
  shiftId: string | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  totalCostHpp: number; // Total COGS for gross profit calculation
  paymentType: 'tunai' | 'transfer' | 'qris' | 'ewallet' | 'debit' | 'kredit';
  amountPaid: number;
  changeAmount: number;
  status: 'selesai' | 'batal' | 'retur_sebagian' | 'retur_total' | 'hold';
  cancelReason?: string | null;
  approvedById?: string | null;
  approvedByName?: string | null;
  idempotencyToken?: string | null;
  notes: string;
  items?: SaleItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AccountsReceivable {
  id: string;
  saleId: string;
  invoiceNo: string;
  customerId: string;
  customerName?: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: 'belum_lunas' | 'sebagian' | 'lunas';
  createdAt: string;
  updatedAt: string;
}

export interface ReceivablePayment {
  id: string;
  paymentNo: string;
  receivableId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: 'tunai' | 'transfer' | 'qris' | 'debit';
  userId: string;
  userName?: string;
  notes: string;
  createdAt: string;
}

export interface SalesReturnItem {
  id: string;
  returnId: string;
  saleItemId: string;
  productId: string;
  productName?: string;
  qty: number;
  refundPrice: number;
  subtotal: number;
  conditionType: 'bagus' | 'rusak';
}

export interface SalesReturn {
  id: string;
  returnNo: string;
  saleId: string;
  invoiceNo?: string;
  returnDate: string;
  userId: string;
  userName?: string;
  approvedById: string;
  approvedByName?: string;
  totalRefund: number;
  reason: string;
  refundMethod: 'tunai' | 'transfer' | 'potong_piutang';
  status: 'completed' | 'cancelled';
  items?: SalesReturnItem[];
  createdAt: string;
}

export interface StockOpnameItem {
  id: string;
  opnameId: string;
  productId: string;
  productName?: string;
  sku?: string;
  systemStock: number;
  physicalStock: number;
  difference: number;
  costPrice: number;
  reason: string;
}

export interface StockOpname {
  id: string;
  opnameNo: string;
  opnameDate: string;
  userId: string;
  userName?: string;
  approvedById: string | null;
  approvedByName?: string | null;
  status: 'draft' | 'posted' | 'cancelled';
  notes: string;
  items?: StockOpnameItem[];
  createdAt: string;
  postedAt: string | null;
}

export type CashTransactionType =
  | 'penjualan'
  | 'pembelian'
  | 'pembayaran_piutang'
  | 'pembayaran_hutang'
  | 'pengeluaran_operasional'
  | 'pendapatan_lainnya'
  | 'penyesuaian_kas'
  | 'modal_awal_shift'
  | 'refund_retur';

export interface CashTransaction {
  id: string;
  transactionNo: string;
  transactionDate: string;
  transactionType: CashTransactionType;
  category: string;
  amountIn: number;
  amountOut: number;
  balanceAfter: number;
  referenceNo: string;
  userId: string;
  userName?: string;
  notes: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  username: string;
  action: string;
  module: string;
  recordId: string | null;
  details: string;
  dataBefore?: any;
  dataAfter?: any;
  ipAddress?: string | null;
  createdAt: string;
}

export interface StoreSettings {
  id: string;
  storeName: string;
  logoUrl: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  taxIdNpwp: string;
  receiptFooter: string;
  currencySymbol: string;
  invoicePrefix: string;
  defaultTaxRate: number;
  defaultMinStock: number;
  receiptPaperSize?: '58mm' | '80mm';
  autoPrintReceipt?: boolean;
  enableSoundEffects?: boolean;
  maxDiscountWithoutPin?: number;
  updatedAt: string;
}
