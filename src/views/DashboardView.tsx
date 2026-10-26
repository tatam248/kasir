import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Receipt,
  DollarSign,
  Package,
  AlertTriangle,
  XCircle,
  CreditCard,
  ShoppingBag,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Calendar,
  Filter,
  BarChart2,
  RefreshCw,
  Award,
} from 'lucide-react';
import { apiRequest, formatRupiah } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const DashboardView: React.FC = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<string>('hari_ini');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    let url = `/reports/dashboard?period=${period}`;
    if (period === 'custom' && customStart && customEnd) {
      url += `&startDate=${customStart}&endDate=${customEnd}`;
    }

    const res = await apiRequest(url);
    if (res.success) {
      setData(res);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, [period]);

  const summary = data?.summary || {};
  const topSelling = data?.topSelling || [];
  const last7Days = data?.last7Days || [];
  const isKasir = user?.roleCode === 'kasir';

  // Calculate highest omzet for bar scaling
  const maxOmzet = Math.max(...last7Days.map((d: any) => d.omzet), 1000);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-mandiri-orange rounded-full inline-block"></span>
            <span>Ringkasan Operasional Toko</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Data real-time bersumber langsung dari database transaksi kasir & inventori.
          </p>
        </div>

        {/* Period Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          {[
            { id: 'hari_ini', label: 'Hari Ini' },
            { id: 'kemarin', label: 'Kemarin' },
            { id: 'minggu_ini', label: 'Minggu Ini' },
            { id: 'bulan_ini', label: 'Bulan Ini' },
            { id: 'custom', label: 'Kustom' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setPeriod(btn.id)}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                period === btn.id
                  ? 'bg-mandiri-navy text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {btn.label}
            </button>
          ))}

          <button
            onClick={fetchDashboard}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {period === 'custom' && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex flex-wrap items-center gap-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold text-mandiri-navy">
            <Calendar className="w-4 h-4 text-mandiri-navy" />
            <span>Pilih Rentang Tanggal:</span>
          </div>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-mandiri-navy"
          />
          <span className="text-slate-400 text-xs">s/d</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-mandiri-navy"
          />
          <button
            onClick={fetchDashboard}
            disabled={!customStart || !customEnd}
            className="px-4 py-1.5 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 transition cursor-pointer"
          >
            Terapkan
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Omzet Penjualan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-mandiri-navy/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Omzet Penjualan
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-mandiri-navy border border-blue-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-800">
              {formatRupiah(summary.omzetTotal)}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <Receipt className="w-3.5 h-3.5 text-slate-400" />
              <span>{summary.salesCount || 0} transaksi berhasil</span>
            </div>
          </div>
        </div>

        {/* Laba Kotor (HPP Weighted Average) */}
        {!isKasir && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-mandiri-orange/50 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Laba Kotor (HPP)
              </span>
              <div className="w-9 h-9 rounded-xl bg-orange-50 text-mandiri-orange border border-orange-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-black text-mandiri-orange">
                {formatRupiah(summary.labaKotor)}
              </div>
              <div className="text-[11px] text-amber-700 font-semibold mt-1">
                Margin: {summary.omzetTotal > 0 ? ((summary.labaKotor / summary.omzetTotal) * 100).toFixed(1) : 0}% dari Omzet
              </div>
            </div>
          </div>
        )}

        {/* Saldo Kas Aktif */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-mandiri-navy/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Saldo Kas Toko
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-mandiri-navy border border-blue-100 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-800">
              {formatRupiah(summary.cashBalance)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span className="text-mandiri-navy font-semibold">Masuk: {formatRupiah(summary.cashIn)}</span>
              <span className="text-rose-600 font-semibold">Keluar: {formatRupiah(summary.cashOut)}</span>
            </div>
          </div>
        </div>

        {/* Total Stok & Peringatan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-amber-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Unit Stok
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-mandiri-gold border border-amber-200 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-800">
              {(summary.totalStockUnits || 0).toLocaleString('id-ID')}{' '}
              <span className="text-xs font-semibold text-slate-500">Unit</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
              <span className="text-mandiri-orange font-bold flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" /> {summary.lowStockCount || 0} Menipis
              </span>
              <span>•</span>
              <span className="text-rose-600 font-bold flex items-center gap-0.5">
                <XCircle className="w-3 h-3" /> {summary.outOfStockCount || 0} Habis
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics: Hutang & Piutang */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Piutang Pelanggan
            </span>
            <div className="text-lg font-bold text-slate-800 mt-0.5">
              {formatRupiah(summary.totalReceivables)}
            </div>
          </div>
          <div className="p-2.5 bg-blue-50 text-mandiri-navy rounded-xl border border-blue-100">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {!isKasir && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Hutang ke Supplier
              </span>
              <div className="text-lg font-bold text-slate-800 mt-0.5">
                {formatRupiah(summary.totalPayables)}
              </div>
            </div>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
        )}

        {!isKasir && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pembelian Barang Masuk
              </span>
              <div className="text-lg font-bold text-slate-800 mt-0.5">
                {formatRupiah(summary.totalPurchaseValue)}
              </div>
            </div>
            <div className="p-2.5 bg-amber-50 text-mandiri-gold rounded-xl border border-amber-200">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
        )}
      </div>

      {/* Charts & Top Selling Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Sales Bar Chart (7 Hari Terakhir) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-800">Grafik Penjualan 7 Hari Terakhir</h2>
              <p className="text-xs text-slate-500">Tren omzet dan estimasi laba kotor harian</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-xs bg-mandiri-navy inline-block" /> Omzet
              </span>
              {!isKasir && (
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-3 h-3 rounded-xs bg-mandiri-orange inline-block" /> Laba
                </span>
              )}
            </div>
          </div>

          <div className="h-64 flex items-end gap-3 sm:gap-6 pt-6 pb-2 border-b border-slate-100">
            {last7Days.map((day: any, idx: number) => {
              const omzetHeight = Math.max(12, Math.round((day.omzet / maxOmzet) * 200));
              const profitHeight = Math.max(8, Math.round((day.profit / maxOmzet) * 200));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    {/* Omzet Bar */}
                    <div
                      style={{ height: `${omzetHeight}px` }}
                      className="w-1/2 max-w-[28px] bg-mandiri-navy hover:bg-mandiri-navy-light rounded-t-lg transition-all duration-300 relative group-hover:scale-y-105"
                      title={`${day.label}: Omzet ${formatRupiah(day.omzet)}`}
                    />
                    {/* Profit Bar */}
                    {!isKasir && (
                      <div
                        style={{ height: `${profitHeight}px` }}
                        className="w-1/2 max-w-[28px] bg-mandiri-orange hover:bg-mandiri-orange-dark rounded-t-lg transition-all duration-300 relative group-hover:scale-y-105"
                        title={`${day.label}: Laba ${formatRupiah(day.profit)}`}
                      />
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 truncate max-w-full">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Omzet Tertinggi Periode: <strong className="text-mandiri-navy">{formatRupiah(maxOmzet)}</strong></span>
            <span className="text-mandiri-orange font-bold">Update Real-Time</span>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-mandiri-gold" />
              <h2 className="text-base font-bold text-slate-800">5 Produk Paling Laku</h2>
            </div>

            <div className="space-y-3">
              {topSelling.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Belum ada transaksi penjualan pada periode ini.
                </div>
              ) : (
                topSelling.map((prod: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-mandiri-navy font-bold flex items-center justify-center text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="font-bold text-slate-800 truncate">{prod.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">SKU: {prod.sku}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-mandiri-navy">{prod.qty} Terjual</div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {formatRupiah(prod.revenue)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400 font-medium">
              Data dihitung otomatis dari riwayat nota kasir
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
