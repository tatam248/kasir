import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Printer,
  Calendar,
  Layers,
  User,
  Package,
  DollarSign,
  FileSpreadsheet,
} from 'lucide-react';
import { apiRequest, formatRupiah } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const ReportsView: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [reportTab, setReportTab] = useState<'sales' | 'profit' | 'by_product' | 'by_category' | 'by_cashier'>('profit');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    let url = '';
    if (reportTab === 'profit') {
      url = `/reports/profit?startDate=${startDate}&endDate=${endDate}`;
    } else if (reportTab === 'by_product') {
      url = `/reports/sales?groupBy=product&startDate=${startDate}&endDate=${endDate}`;
    } else if (reportTab === 'by_category') {
      url = `/reports/sales?groupBy=category&startDate=${startDate}&endDate=${endDate}`;
    } else if (reportTab === 'by_cashier') {
      url = `/reports/sales?groupBy=cashier&startDate=${startDate}&endDate=${endDate}`;
    } else {
      url = `/reports/sales?startDate=${startDate}&endDate=${endDate}`;
    }

    const res = await apiRequest(url);
    if (res.success) setData(res);
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, [reportTab]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[][] = [];

    if (reportTab === 'profit') {
      headers = ['Produk', 'SKU', 'Qty Terjual', 'Omzet Bersih', 'Total HPP', 'Laba Kotor', 'Margin (%)'];
      rows = (data?.breakdown || []).map((b: any) => [
        `"${b.name}"`,
        b.sku,
        b.qty,
        b.revenue,
        b.costHpp,
        b.grossProfit,
        b.marginPct,
      ]);
    } else if (reportTab === 'by_product') {
      headers = ['Produk', 'SKU', 'Kategori', 'Qty Terjual', 'Total Penjualan', 'Laba'];
      rows = (data?.rows || []).map((r: any) => [
        `"${r.name}"`,
        r.sku,
        `"${r.category}"`,
        r.qty,
        r.total,
        r.profit || 0,
      ]);
    } else if (reportTab === 'by_category') {
      headers = ['Kategori', 'Qty Terjual', 'Total Penjualan', 'Laba'];
      rows = (data?.rows || []).map((r: any) => [`"${r.categoryName}"`, r.qty, r.total, r.profit || 0]);
    } else {
      headers = ['Tanggal', 'Jumlah Transaksi', 'Total Penjualan', 'Laba Kotor'];
      rows = (data?.rows || []).map((r: any) => [r.date, r.transactions, r.total, r.profit || 0]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laporan_${reportTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-mandiri-navy" />
            <span>Laporan Keuangan & Analisis Laba HPP</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Perhitungan laba kotor menggunakan formula: Penjualan Bersih − HPP Rata-rata Tertimbang.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Laporan</span>
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200">
        {[
          { id: 'profit', label: 'Laba Kotor (HPP Weighted Average)', icon: DollarSign, perm: 'report.profit' },
          { id: 'by_product', label: 'Penjualan Per Produk', icon: Package, perm: 'report.sales' },
          { id: 'by_category', label: 'Per Kategori', icon: Layers, perm: 'report.sales' },
          { id: 'by_cashier', label: 'Per Kasir', icon: User, perm: 'report.sales' },
          { id: 'sales', label: 'Harian (Buku Nota)', icon: Calendar, perm: 'report.sales' },
        ]
          .filter((t) => !t.perm || hasPermission(t.perm))
          .map((tab) => {
            const Icon = tab.icon;
            const isActive = reportTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setReportTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs border-b-2 transition -mb-[2px] ${
                  isActive
                    ? 'border-mandiri-navy text-mandiri-navy bg-blue-50/60 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
      </div>

      {/* Date Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="w-40">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Dari Tanggal</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
          />
        </div>

        <div className="w-40">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Sampai</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
          />
        </div>

        <button
          onClick={fetchReport}
          className="self-end px-5 py-2 bg-mandiri-orange hover:bg-mandiri-orange-dark text-white rounded-xl font-bold shadow-md shadow-orange-500/20 transition cursor-pointer"
        >
          Hitung Laporan
        </button>
      </div>

      {/* Profit Tab Top Highlights */}
      {reportTab === 'profit' && data?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Penjualan Bersih (Net)
            </span>
            <div className="text-xl font-black text-slate-900 mt-1">
              {formatRupiah(data.summary.totalPenjualanBersih)}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total HPP (COGS)
            </span>
            <div className="text-xl font-black text-rose-700 mt-1">
              {formatRupiah(data.summary.totalHpp)}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Laba Kotor Toko
            </span>
            <div className="text-xl font-black text-mandiri-navy mt-1">
              {formatRupiah(data.summary.totalLabaKotor)}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Margin Rata-rata (%)
            </span>
            <div className="text-xl font-black text-mandiri-navy-light mt-1">
              {data.summary.marginPersen}%
            </div>
          </div>
        </div>
      )}

      {/* Main Report Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {reportTab === 'profit' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Produk & SKU</th>
                  <th className="px-4 py-3 text-center">Qty Terjual</th>
                  <th className="px-4 py-3 text-right">Omzet Penjualan</th>
                  <th className="px-4 py-3 text-right text-rose-700">Total HPP</th>
                  <th className="px-4 py-3 text-right font-black text-mandiri-navy">Laba Kotor</th>
                  <th className="px-4 py-3 text-right">Margin (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.breakdown || []).map((b: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      <div>{b.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{b.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700">{b.qty}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{formatRupiah(b.revenue)}</td>
                    <td className="px-4 py-3 text-right font-medium text-rose-700">{formatRupiah(b.costHpp)}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-mandiri-navy">
                      {formatRupiah(b.grossProfit)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-mandiri-navy-light">{b.marginPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportTab === 'by_product' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Produk & SKU</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3 text-center">Unit Terjual</th>
                  <th className="px-4 py-3 text-right">Total Nilai Penjualan</th>
                  <th className="px-4 py-3 text-right">Laba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.rows || []).map((r: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      <div>{r.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{r.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.category}</td>
                    <td className="px-4 py-3 text-center font-bold">{r.qty}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">{formatRupiah(r.total)}</td>
                    <td className="px-4 py-3 text-right font-bold text-mandiri-navy">
                      {r.profit !== undefined ? formatRupiah(r.profit) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportTab === 'by_category' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Kategori Produk</th>
                  <th className="px-4 py-3 text-center">Qty Barang Terjual</th>
                  <th className="px-4 py-3 text-right">Total Omzet Penjualan</th>
                  <th className="px-4 py-3 text-right">Laba Kotor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.rows || []).map((r: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-bold text-slate-800">{r.categoryName}</td>
                    <td className="px-4 py-3 text-center font-semibold">{r.qty}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">{formatRupiah(r.total)}</td>
                    <td className="px-4 py-3 text-right font-bold text-mandiri-navy">{formatRupiah(r.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportTab === 'by_cashier' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Kasir</th>
                  <th className="px-4 py-3 text-center">Jumlah Transaksi Nota</th>
                  <th className="px-4 py-3 text-right">Total Nilai Penjualan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.rows || []).map((r: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-bold text-slate-800">{r.userName}</td>
                    <td className="px-4 py-3 text-center font-semibold">{r.transactions} Transaksi</td>
                    <td className="px-4 py-3 text-right font-black text-mandiri-navy">{formatRupiah(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportTab === 'sales' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3 text-center">Jumlah Transaksi</th>
                  <th className="px-4 py-3 text-right">Total Omzet</th>
                  <th className="px-4 py-3 text-right">Estimasi Laba Kotor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.rows || []).map((r: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">{r.date}</td>
                    <td className="px-4 py-3 text-center font-semibold">{r.transactions} Transaksi</td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">{formatRupiah(r.total)}</td>
                    <td className="px-4 py-3 text-right font-bold text-mandiri-navy">
                      {r.profit !== undefined ? formatRupiah(r.profit) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
