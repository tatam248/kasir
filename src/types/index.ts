export type RoleCode = 'super_admin' | 'owner' | 'manager' | 'admin_inventory' | 'kasir';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string | null;
  roleId: string;
  roleCode?: RoleCode;
  roleName?: string;
  phone: string | null;
  status: 'active' | 'inactive';
  hasSupervisorPin?: boolean;
  permissions: string[];
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
  purchasePrice?: number;
  avgCost?: number;
  sellingPrice: number;
  wholesalePrice: number;
  minWholesaleQty: number;
  stock: number;
  minStock: number;
  locationRack: string;
  supplierId: string | null;
  supplierName?: string;
  imageUrl: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  code: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
}

export interface Brand {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
}

export interface Unit {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
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
}

export interface CartItem {
  productId: string;
  sku: string;
  barcode: string;
  name: string;
  unitCode?: string;
  qty: number;
  unitPrice: number;
  originalPrice: number;
  isWholesaleApplied: boolean;
  discountAmount: number;
  subtotal: number;
  stock: number;
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
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName?: string;
  sku?: string;
  barcode?: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
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
  totalCostHpp?: number;
  paymentType: 'tunai' | 'transfer' | 'qris' | 'ewallet' | 'debit' | 'kredit';
  amountPaid: number;
  changeAmount: number;
  status: 'selesai' | 'batal' | 'retur_sebagian' | 'retur_total' | 'hold';
  cancelReason?: string | null;
  approvedByName?: string | null;
  notes: string;
  items?: SaleItem[];
  settings?: StoreSettings;
}

export interface StockMovement {
  id: string;
  movementDate: string;
  productId: string;
  productName?: string;
  productSku?: string;
  movementType: string;
  referenceNo: string;
  stockBefore: number;
  stockIn: number;
  stockOut: number;
  stockAfter: number;
  costPrice: number;
  userId: string;
  userName?: string;
  notes: string;
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
}
