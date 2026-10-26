import React, { useState, useEffect } from 'react';
import {
  Menu,
  Bell,
  Clock,
  LogOut,
  Store,
  AlertTriangle,
  ChevronDown,
  User as UserIcon,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { apiRequest, formatRupiah } from '../../lib/api.ts';
import { NavItem } from './Sidebar.tsx';

interface NavbarProps {
  onToggleSidebar: () => void;
  setActiveTab: (tab: NavItem) => void;
  isSidebarCollapsed?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, setActiveTab, isSidebarCollapsed }) => {
  const { user, logout, activeShift, storeSettings } = useAuth();
  const [alertSummary, setAlertSummary] = useState<{ lowStockCount: number; outOfStockCount: number } | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertItems, setAlertItems] = useState<any[]>([]);

  const fetchAlerts = async () => {
    const res = await apiRequest('/inventory/alerts');
    if (res.success) {
      setAlertSummary(res.summary);
      setAlertItems([...(res.outOfStock || []), ...(res.lowStock || [])].slice(0, 8));
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 45000);
    return () => clearInterval(interval);
  }, []);

  const totalAlerts = (alertSummary?.lowStockCount || 0) + (alertSummary?.outOfStockCount || 0);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-30 sticky top-0 shadow-xs">
      {/* Left: Mobile Toggle & Store Identity */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-600 hover:text-mandiri-navy hover:bg-slate-100 active:scale-95 transition cursor-pointer flex items-center justify-center"
          title={isSidebarCollapsed ? 'Perluas Menu Sidebar' : 'Ciutkan / Buka Menu Sidebar'}
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-mandiri-navy border border-blue-100 rounded-lg hidden sm:flex">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base text-slate-800 leading-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md">
              {storeSettings?.storeName || 'KasirPro Store'}
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block truncate max-w-[250px]">
              {storeSettings?.address || 'Sistem Kasir & Inventory'}
            </p>
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Cashier Shift Status */}
        {activeShift ? (
          <button
            onClick={() => setActiveTab('shifts')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-mandiri-navy hover:bg-blue-100 transition text-xs font-semibold cursor-pointer"
            title="Shift kasir sedang aktif. Klik untuk melihat rincian kas."
          >
            <span className="w-2 h-2 rounded-full bg-mandiri-gold animate-pulse" />
            <Clock className="w-3.5 h-3.5 text-mandiri-navy hidden sm:inline" />
            <span className="truncate max-w-[120px]">{activeShift.shiftNumber}</span>
          </button>
        ) : (
          <button
            onClick={() => setActiveTab('shifts')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition text-xs font-semibold cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Buka Shift</span>
          </button>
        )}

        {/* Stock Alert Bell */}
        <div className="relative">
          <button
            onClick={() => setIsAlertOpen(!isAlertOpen)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 relative transition"
            title="Peringatan Stok"
          >
            <Bell className="w-5 h-5" />
            {totalAlerts > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center animate-bounce">
                {totalAlerts > 9 ? '9+' : totalAlerts}
              </span>
            )}
          </button>

          {/* Alert Dropdown */}
          {isAlertOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-bold text-sm text-slate-800">Peringatan Stok Barang</span>
                <span className="text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-bold">
                  {totalAlerts} Perlu Perhatian
                </span>
              </div>

              <div className="py-2 max-h-64 overflow-y-auto space-y-2">
                {alertItems.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs flex flex-col items-center gap-1">
                    <CheckCircle2 className="w-6 h-6 text-mandiri-navy" />
                    <span>Semua stok barang berada dalam batas aman!</span>
                  </div>
                ) : (
                  alertItems.map((prod) => (
                    <div
                      key={prod.id}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs flex items-center justify-between border border-slate-200/60 transition"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-semibold text-slate-800 truncate">{prod.name}</div>
                        <div className="text-slate-500 text-[10px]">
                          SKU: {prod.sku} | Rak: {prod.locationRack || '-'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {prod.stock <= 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">
                            Habis (0)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold text-[10px]">
                            Sisa {prod.stock} / Min {prod.minStock}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setIsAlertOpen(false);
                    setActiveTab('products');
                  }}
                  className="w-full text-center text-xs font-bold text-mandiri-orange hover:text-mandiri-orange-dark py-1 transition cursor-pointer"
                >
                  Lihat Semua Produk di Master Data →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Badge & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-800 leading-none">{user?.name}</span>
            <span className="text-[10px] text-slate-500 font-medium capitalize mt-0.5">
              {user?.roleName || user?.roleCode}
            </span>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
            title="Keluar dari akun"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
