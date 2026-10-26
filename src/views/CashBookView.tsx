import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Calendar,
  X,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { apiRequest, formatRupiah, formatDate } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const CashBookView: React.FC = () => {
  const { hasPermission } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [totalIn, setTotalIn] = useState<number>(0);
  const [totalOut, setTotalOut] = useState<number>(0);
  const [selectedType, setSelectedType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  // Manual Entry Modal
  const [isOpenManual, setIsOpenManual] = useState(false);
  const [entryType, setEntryType] = useState<'in' | 'out'>('out');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const fetchCash = async () => {
    setLoading(true);
    let url = `/cash?transactionType=${selectedType}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    const res = await apiRequest(url);
    if (res.success) {
      setTransactions(res.transactions || []);
      setCurrentBalance(res.currentBalance || 0);
      setTotalIn(res.totalIn || 0);
      setTotalOut(res.totalOut || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCash();
  }, [selectedType]);

  const handleOpenAdd = (type: 'in' | 'out') => {
    setEntryType(type);
    setCategory(type === 'out' ? 'Beban Operasional & Listrik' : 'Pendapatan Tambahan');
    setAmount('');
    setNotes('');
    setIsOpenManual(true);
  };

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !category) {
      alert('Kategori dan nominal harus diisi.');
      return;
    }

    const res = await apiRequest('/cash/manual', {
      method: 'POST',
      body: JSON.stringify({
        type: entryType,
        category,
        amount: Number(amount),
        notes,
      }),
    });

    if (res.success) {
      alert(res.message);
      setIsOpenManual(false);
      fetchCash();
    } else {
      alert(res.message || 'Gagal menyimpan transaksi kas.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-600" />
            <span>Buku Kas & Arus Keuangan (Cash Book)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pencatatan seluruh aliran kas masuk dan keluar dari operasional, penjualan, dan pembelian.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAdd('in')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Kas Masuk</span>
          </button>
          <button
            onClick={() => handleOpenAdd('out')}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition"
          >
            <Plus className="w-4 h-4 text-rose-600" />
            <span>Kas Keluar</span>
          </button>
        </div>
      </div>

      {/* Cash Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Saldo Kas Saat Ini</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{formatRupiah(currentBalance)}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Kas Masuk (Filter)</span>
            <div className="text-xl font-black text-emerald-700 mt-1">{formatRupiah(totalIn)}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Kas Keluar (Filter)</span>
            <div className="text-xl font-black text-rose-700 mt-1">{formatRupiah(totalOut)}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="w-56">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Jenis Transaksi</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700"
          >
            <option value="all">Semua Jenis Transaksi</option>
            <option value="penjualan">Penjualan Kasir</option>
            <option value="pembelian">Pembelian Supplier</option>
            <option value="pembayaran_piutang">Penerimaan Piutang</option>
            <option value="pembayaran_hutang">Pembayaran Hutang</option>
            <option value="pengeluaran_operasional">Pengeluaran Operasional</option>
            <option value="pendapatan_lainnya">Pendapatan Lainnya</option>
            <option value="modal_awal_shift">Modal Awal Kasir Shift</option>
          </select>
        </div>

        <div className="w-36">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Dari Tanggal</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
          />
        </div>

        <div className="w-36">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Sampai</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
          />
        </div>

        <button
          onClick={fetchCash}
          className="self-end px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Terapkan</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Tanggal & Waktu</th>
                <th className="px-4 py-3">No. Transaksi</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">No. Referensi</th>
                <th className="px-4 py-3 text-right text-emerald-700">Masuk (Rp)</th>
                <th className="px-4 py-3 text-right text-rose-700">Keluar (Rp)</th>
                <th className="px-4 py-3 text-right font-black">Saldo Akhir</th>
                <th className="px-4 py-3">Petugas</th>
                <th className="px-4 py-3">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Belum ada riwayat transaksi kas pada filter ini.
                  </td>
                </tr>
              ) : (
                transactions.map((ct) => (
                  <tr key={ct.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDate(ct.transactionDate)}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">{ct.transactionNo}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{ct.category}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{ct.referenceNo}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                      {ct.amountIn > 0 ? formatRupiah(ct.amountIn) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600">
                      {ct.amountOut > 0 ? formatRupiah(ct.amountOut) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">
                      {formatRupiah(ct.balanceAfter)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{ct.userName || 'System'}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{ct.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MANUAL CASH MODAL --- */}
      {isOpenManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div
              className={`px-5 py-4 text-white flex items-center justify-between ${
                entryType === 'in' ? 'bg-emerald-700' : 'bg-rose-700'
              }`}
            >
              <span className="font-bold text-sm">
                Catat {entryType === 'in' ? 'Pemasukan Kas' : 'Pengeluaran Kas'}
              </span>
              <button onClick={() => setIsOpenManual(false)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitManual} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Kategori *
                </label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Contoh: Pembelian token listrik toko"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Nominal (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full text-base font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Catatan</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Keterangan pengeluaran / pemasukan..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenManual(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded-xl font-bold shadow-md transition ${
                    entryType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
