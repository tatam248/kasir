import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertTriangle, Play, Square, X, Wallet, FileText } from 'lucide-react';
import { CashierShift } from '../types/index.ts';
import { apiRequest, formatRupiah, formatDate } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const ShiftsView: React.FC = () => {
  const { user, activeShift, refreshActiveShift } = useAuth();
  const [shifts, setShifts] = useState<CashierShift[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isOpenStart, setIsOpenStart] = useState(false);
  const [startOpeningBalance, setStartOpeningBalance] = useState('100000');
  const [startNotes, setStartNotes] = useState('Modal awal shift kasir');

  const [isOpenClose, setIsOpenClose] = useState(false);
  const [actualCash, setActualCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  const fetchShifts = async () => {
    setLoading(true);
    const res = await apiRequest('/shifts');
    if (res.success) setShifts(res.shifts || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchShifts();
    refreshActiveShift();
  }, []);

  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiRequest('/shifts/start', {
      method: 'POST',
      body: JSON.stringify({
        openingBalance: Number(startOpeningBalance),
        notes: startNotes,
      }),
    });

    if (res.success) {
      alert(res.message);
      setIsOpenStart(false);
      await refreshActiveShift();
      fetchShifts();
    } else {
      alert(res.message || 'Gagal membuka shift.');
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualCash) {
      alert('Masukkan jumlah uang fisik aktual di laci kasir.');
      return;
    }

    const res = await apiRequest('/shifts/close', {
      method: 'POST',
      body: JSON.stringify({
        actualCash: Number(actualCash),
        notes: closeNotes,
      }),
    });

    if (res.success) {
      alert(res.message);
      setIsOpenClose(false);
      setActualCash('');
      await refreshActiveShift();
      fetchShifts();
    } else {
      alert(res.message || 'Gagal menutup shift.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-600" />
            <span>Manajemen Shift Kasir & Rekonsiliasi Laci</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Mencatat saldo modal awal, penerimaan penjualan tunai, dan selisih fisik saat tutup shift.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!activeShift ? (
            <button
              onClick={() => setIsOpenStart(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 transition cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>Buka Shift Baru</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setActualCash(String(activeShift.expectedClosingBalance || 0));
                setIsOpenClose(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-700/20 transition cursor-pointer"
            >
              <Square className="w-4 h-4" />
              <span>Tutup Shift ({activeShift.shiftNumber})</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Shift Card Banner (If active) */}
      {activeShift && (
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 rounded-2xl shadow-md border border-emerald-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-extrabold text-sm uppercase tracking-wider text-emerald-300">
                  Shift Kasir Sedang Berjalan
                </span>
              </div>
              <h2 className="text-xl font-black mt-1">No: {activeShift.shiftNumber}</h2>
              <p className="text-xs text-emerald-200 mt-0.5">
                Dibuka oleh: <strong>{activeShift.userName || user?.name}</strong> • Mulai:{' '}
                {formatDate(activeShift.openedAt)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 bg-emerald-950/50 p-4 rounded-xl border border-emerald-600/40 text-xs">
              <div>
                <span className="text-emerald-300 block text-[10px] uppercase font-bold">Modal Awal</span>
                <span className="text-base font-extrabold">{formatRupiah(activeShift.openingBalance)}</span>
              </div>
              <div className="border-l border-emerald-700/50 pl-4">
                <span className="text-emerald-300 block text-[10px] uppercase font-bold">Penjualan Tunai</span>
                <span className="text-base font-extrabold text-emerald-300">
                  +{formatRupiah(activeShift.cashSalesTotal)}
                </span>
              </div>
              <div className="border-l border-emerald-700/50 pl-4">
                <span className="text-emerald-300 block text-[10px] uppercase font-bold">
                  Kas Seharusnya di Laci
                </span>
                <span className="text-base font-black text-amber-300">
                  {formatRupiah(activeShift.expectedClosingBalance)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shifts History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">No. Shift</th>
                <th className="px-4 py-3">Kasir</th>
                <th className="px-4 py-3">Waktu Buka / Tutup</th>
                <th className="px-4 py-3 text-right">Modal Awal</th>
                <th className="px-4 py-3 text-right text-emerald-700">Penjualan Tunai</th>
                <th className="px-4 py-3 text-right font-bold">Kas Seharusnya</th>
                <th className="px-4 py-3 text-right font-bold">Kas Aktual</th>
                <th className="px-4 py-3 text-right font-black">Selisih</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Belum ada histori shift kasir.
                  </td>
                </tr>
              ) : (
                shifts.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">{s.shiftNumber}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{s.userName}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">
                      <div>Buka: {formatDate(s.openedAt)}</div>
                      {s.closedAt && <div>Tutup: {formatDate(s.closedAt)}</div>}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(s.openingBalance)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                      {formatRupiah(s.cashSalesTotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      {formatRupiah(s.expectedClosingBalance)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      {s.actualClosingBalance !== null ? formatRupiah(s.actualClosingBalance) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-black">
                      {s.variance === null ? (
                        '-'
                      ) : s.variance === 0 ? (
                        <span className="text-emerald-600">Pas (0)</span>
                      ) : s.variance > 0 ? (
                        <span className="text-emerald-700">+{formatRupiah(s.variance)}</span>
                      ) : (
                        <span className="text-rose-700">{formatRupiah(s.variance)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          s.status === 'open'
                            ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {s.status === 'open' ? 'Sedang Aktif' : 'Sudah Ditutup'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- START SHIFT MODAL --- */}
      {isOpenStart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="bg-emerald-700 text-white px-5 py-4 flex items-center justify-between">
              <span className="font-bold text-sm">Buka Shift Kasir Baru</span>
              <button onClick={() => setIsOpenStart(false)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStartShift} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Modal Awal Kas Laci (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={startOpeningBalance}
                  onChange={(e) => setStartOpeningBalance(e.target.value)}
                  className="w-full text-base font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Catatan</label>
                <input
                  type="text"
                  value={startNotes}
                  onChange={(e) => setStartNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenStart(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition"
                >
                  Mulai Shift Kasir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CLOSE SHIFT MODAL --- */}
      {isOpenClose && activeShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-rose-700 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Tutup Shift Kasir ({activeShift.shiftNumber})</h3>
                <p className="text-[11px] text-rose-200">Rekonsiliasi Kas Laci</p>
              </div>
              <button onClick={() => setIsOpenClose(false)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCloseShift} className="p-5 space-y-4 text-xs">
              {/* Computation Breakdown */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Modal Awal:</span>
                  <span className="font-semibold text-slate-800">{formatRupiah(activeShift.openingBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Penjualan Tunai:</span>
                  <span className="font-semibold text-emerald-600">+{formatRupiah(activeShift.cashSalesTotal)}</span>
                </div>
                <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-sm">
                  <span className="text-slate-700">Kas Seharusnya:</span>
                  <span className="text-slate-900">{formatRupiah(activeShift.expectedClosingBalance)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Hitung Uang Fisik Aktual di Laci (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  autoFocus
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  placeholder="Masukkan total hitungan fisik uang"
                  className="w-full text-xl font-black px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                />
              </div>

              {/* Dynamic Variance Preview */}
              {actualCash !== '' && (
                <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs font-bold">
                  <span>Selisih Kas:</span>
                  {Number(actualCash) - activeShift.expectedClosingBalance === 0 ? (
                    <span className="text-emerald-600">Cocok / Pas (Rp 0)</span>
                  ) : Number(actualCash) - activeShift.expectedClosingBalance > 0 ? (
                    <span className="text-emerald-700">
                      Surplus +{formatRupiah(Number(actualCash) - activeShift.expectedClosingBalance)}
                    </span>
                  ) : (
                    <span className="text-rose-700">
                      Kurang {formatRupiah(Number(actualCash) - activeShift.expectedClosingBalance)}
                    </span>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Catatan Tutup Shift
                </label>
                <input
                  type="text"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Keterangan kondisi kasir akhir shift..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenClose(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md transition"
                >
                  Konfirmasi Tutup Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
