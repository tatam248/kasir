import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Layers,
  ClipboardCheck,
  Truck,
  Users,
  CreditCard,
  Wallet,
  Clock,
  BarChart3,
  UserCog,
  FileText,
  Settings,
  ShoppingBag,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export type NavItem =
  | 'dashboard'
  | 'pos'
  | 'sales'
  | 'purchases'
  | 'products'
  | 'masters'
  | 'inventory'
  | 'stock-opname'
  | 'suppliers'
  | 'customers'
  | 'payables'
  | 'receivables'
  | 'cash'
  | 'shifts'
  | 'reports'
  | 'users'
  | 'audit'
  | 'settings';

interface SidebarProps {
  activeTab: NavItem;
  setActiveTab: (tab: NavItem) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

interface NavSectionItem {
  id: string;
  label: string;
  icon: any;
  perm: string | null;
  badge?: string;
}

interface NavSection {
  label: string;
  items: NavSectionItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen,
  isCollapsed,
  setIsCollapsed,
}) => {
  const { user, hasPermission } = useAuth();

  const navSections: NavSection[] = [
    {
      label: 'Utama',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: null },
        { id: 'pos', label: 'Kasir (POS)', icon: ShoppingCart, perm: 'pos.transaction', badge: 'Touch' },
        { id: 'sales', label: 'Penjualan & Retur', icon: Receipt, perm: null },
      ],
    },
    {
      label: 'Inventori & Barang',
      items: [
        { id: 'products', label: 'Master Produk', icon: Package, perm: 'product.view' },
        { id: 'masters', label: 'Kategori & Satuan', icon: Layers, perm: 'product.view' },
        { id: 'inventory', label: 'Kartu Stok', icon: FileText, perm: 'inventory.view' },
        { id: 'stock-opname', label: 'Stock Opname', icon: ClipboardCheck, perm: 'inventory.opname' },
      ],
    },
    {
      label: 'Relasi & Pembelian',
      items: [
        { id: 'purchases', label: 'Pembelian (PO)', icon: ShoppingBag, perm: 'purchase.view' },
        { id: 'suppliers', label: 'Supplier', icon: Truck, perm: 'purchase.view' },
        { id: 'customers', label: 'Pelanggan', icon: Users, perm: null },
        { id: 'payables', label: 'Hutang Supplier', icon: DollarSign, perm: 'purchase.view' },
        { id: 'receivables', label: 'Piutang Pelanggan', icon: CreditCard, perm: null },
      ],
    },
    {
      label: 'Keuangan & Laporan',
      items: [
        { id: 'cash', label: 'Kas Besar (Buku Kas)', icon: Wallet, perm: 'report.finance' },
        { id: 'shifts', label: 'Shift Kasir', icon: Clock, perm: null },
        { id: 'reports', label: 'Laporan & Laba', icon: BarChart3, perm: 'report.sales' },
      ],
    },
    {
      label: 'Sistem',
      items: [
        { id: 'users', label: 'Pengguna & RBAC', icon: UserCog, perm: 'user.manage' },
        { id: 'audit', label: 'Audit Log', icon: FileText, perm: 'user.manage' },
        { id: 'settings', label: 'Pengaturan & DB', icon: Settings, perm: 'settings.manage' },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 h-full flex flex-col bg-slate-900 text-slate-200 border-r border-slate-800 transition-all duration-300 ease-in-out lg:relative lg:z-30 lg:top-auto lg:bottom-auto shrink-0 overflow-hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-mandiri-navy to-mandiri-navy-light border border-mandiri-gold/40 flex items-center justify-center font-black text-mandiri-gold text-xl shadow-lg shrink-0">
              K
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-wide text-white leading-tight">
                  KASIR<span className="text-mandiri-gold">PRO</span>
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                  Retail & Inventory
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title={isCollapsed ? 'Perluas Menu' : 'Perkecil Menu'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile close toggle */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 sidebar-scrollbar">
          {navSections.map((section, sIdx) => {
            const visibleItems = section.items.filter((item) => !item.perm || hasPermission(item.perm));
            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx} className="space-y-1">
                {!isCollapsed && (
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {section.label}
                  </div>
                )}
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as NavItem);
                        if (window.innerWidth < 1024) setIsOpen(false);
                      }}
                      title={isCollapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-mandiri-navy to-mandiri-navy-light text-white shadow-md shadow-mandiri-navy/60 border-l-4 border-mandiri-gold'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-mandiri-gold' : 'text-slate-400'}`} />
                      {!isCollapsed && (
                        <div className="flex-1 flex items-center justify-between overflow-hidden">
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span className="text-[10px] bg-mandiri-orange/20 text-mandiri-orange border border-mandiri-orange/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* User Mini Profile */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-mandiri-navy-light border border-mandiri-gold/40 flex items-center justify-center text-sm font-bold text-mandiri-gold shrink-0 uppercase">
              {user?.name?.[0] || 'U'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <span className="inline-block text-[10px] font-medium text-mandiri-gold capitalize truncate">
                  {user?.roleName || user?.roleCode}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
