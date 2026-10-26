import React, { useState, useEffect } from 'react';
import { FileText, Search, Shield, Filter, RefreshCw, Eye, X } from 'lucide-react';
import { apiRequest, formatDate } from '../lib/api.ts';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLog, setDetailLog] = useState<any>(null);

  const fetchLogs = async () => {
    setLoading(true);
    let url = `/audit?module=${selectedModule}&username=${encodeURIComponent(userSearch)}`;
    const res = await apiRequest(url);
    if (res.success) setLogs(res.logs || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedModule]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-600" />
            <span>Audit Trail & Rekam Jejak Sistem</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Log aktivitas permanen dan tidak dapat diedit untuk akuntabilitas seluruh aksi pengguna.
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
            placeholder="Cari berdasarkan nama user atau username..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
          />
        </div>

        <div className="w-48">
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700"
          >
            <option value="all">Semua Modul</option>
            <option value="Autentikasi">Autentikasi & Login</option>
            <option value="POS">Kasir (POS)</option>
            <option value="Produk">Produk</option>
            <option value="Inventory">Inventory</option>
            <option value="Stock Opname">Stock Opname</option>
            <option value="Pembelian">Pembelian</option>
            <option value="Pengguna">Pengguna</option>
            <option value="Retur">Retur Penjualan</option>
          </select>
        </div>

        <button
          onClick={fetchLogs}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Filter</span>
        </button>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Waktu Kejadian</th>
                <th className="px-4 py-3">Pengguna</th>
                <th className="px-4 py-3">Modul</th>
                <th className="px-4 py-3">Aksi</th>
                <th className="px-4 py-3">Rincian Aktivitas</th>
                <th className="px-4 py-3 text-center">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ada catatan audit pada filter ini.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">@{log.username}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 text-slate-700">
                        {log.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-700 font-bold text-[10px]">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-md truncate">{log.details}</td>
                    <td className="px-4 py-3 text-center">
                      {(log.dataBefore || log.dataAfter) && (
                        <button
                          onClick={() => setDetailLog(log)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[10px]"
                        >
                          Lihat Detail
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail JSON Modal */}
      {detailLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <span className="font-bold text-sm">Inspeksi Data Audit</span>
              <button onClick={() => setDetailLog(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs max-h-96 overflow-y-auto">
              <p className="text-slate-600 font-medium">{detailLog.details}</p>

              {detailLog.dataBefore && (
                <div>
                  <span className="font-bold text-rose-700 uppercase tracking-wider text-[10px] block mb-1">
                    Data Sebelum Perubahan (Before):
                  </span>
                  <pre className="p-3 bg-slate-50 border border-slate-200 rounded-xl overflow-x-auto text-[11px] font-mono text-slate-800">
                    {JSON.stringify(detailLog.dataBefore, null, 2)}
                  </pre>
                </div>
              )}

              {detailLog.dataAfter && (
                <div>
                  <span className="font-bold text-emerald-700 uppercase tracking-wider text-[10px] block mb-1">
                    Data Sesudah Perubahan (After):
                  </span>
                  <pre className="p-3 bg-slate-50 border border-slate-200 rounded-xl overflow-x-auto text-[11px] font-mono text-slate-800">
                    {JSON.stringify(detailLog.dataAfter, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
