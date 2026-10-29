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
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Clock,
  FileText,
} from 'lucide-react';
import { apiRequest, formatRupiah, formatDate } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';

export const CashBookView: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { showToast } = useToast();

  // Role check: Only Super Admin and Owner can Edit and Delete cash transactions
  const isAuthorized = user?.roleCode === 'super_admin' || user?.roleCode === 'owner';

  const [transactions, setTransactions] = useState<any[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [totalIn, setTotalIn] = useState<number>(0);
  const [totalOut, setTotalOut] = useState<number>(0);
  const [selectedType, setSelectedType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  // Manual Entry Modal (Create)
  const [isOpenManual, setIsOpenManual] = useState(false);
  const [entryType, setEntryType] = useState<'in' | 'out'>('out');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit Modal
  const [isOpenEdit, setIsOpenEdit] = useState(false);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [editType, setEditType] = useState<'in' | 'out'>('out');
  const [editCategory, setEditCategory] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Confirmation Modal
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [deletingTx, setDeletingTx] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCash = async () => {
    setLoading(true);
    let url = `/cash?transactionType=${selectedType}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    try {
      const res = await apiRequest(url);
      if (res.success) {
        setTransactions(res.transactions || []);
        setCurrentBalance(res.currentBalance || 0);
        setTotalIn(res.totalIn || 0);
        setTotalOut(res.totalOut || 0);
      } else {
        showToast(res.message || 'Gagal memuat data kas.', 'error');
      }
    } catch (err: any) {
      showToast('Gagal menghubungi server: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
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
    if (!amount || Number(amount) <= 0 || !category.trim()) {
      showToast('Kategori dan nominal wajib diisi.', 'error');
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const res = await apiRequest('/cash/manual', {
        method: 'POST',
        body: JSON.stringify({
          type: entryType,
          category: category.trim(),
          amount: Number(amount),
          notes,
        }),
      });

      if (res.success) {
        showToast(res.message || 'Transaksi kas manual berhasil dicatat.', 'success');
        setIsOpenManual(false);
        fetchCash();
      } else {
        showToast(res.message || 'Gagal menyimpan transaksi kas.', 'error');
      }
    } catch (err: any) {
      showToast('Terjadi kesalahan: ' + err.message, 'error');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // --- EDIT HANDLERS (Super Admin & Pemilik) ---
  const handleOpenEdit = (tx: any) => {
    if (!isAuthorized) {
      showToast('Hanya Super Admin dan Pemilik yang memiliki hak akses edit kas.', 'error');
      return;
    }
    setEditingTx(tx);
    const isExpense = (tx.amountOut || 0) > 0;
    setEditType(isExpense ? 'out' : 'in');
    setEditCategory(tx.category || '');
    setEditAmount(String(isExpense ? tx.amountOut : tx.amountIn));
    setEditNotes(tx.notes || '');

    // Convert ISO date to datetime-local format (YYYY-MM-DDTHH:mm)
    try {
      const d = new Date(tx.transactionDate);
      const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setEditDate(isoLocal);
    } catch {
      setEditDate('');
    }

    setIsOpenEdit(true);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    if (!editAmount || Number(editAmount) <= 0 || !editCategory.trim()) {
      showToast('Kategori dan nominal harus diisi dengan benar.', 'error');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const res = await apiRequest(`/cash/${editingTx.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          category: editCategory.trim(),
          amount: Number(editAmount),
          type: editType,
          notes: editNotes,
          transactionDate: editDate ? new Date(editDate).toISOString() : editingTx.transactionDate,
        }),
      });

      if (res.success) {
        showToast(res.message || 'Transaksi kas berhasil diperbarui.', 'success');
        setIsOpenEdit(false);
        setEditingTx(null);
        fetchCash();
      } else {
        showToast(res.message || 'Gagal memperbarui transaksi kas.', 'error');
      }
    } catch (err: any) {
      showToast('Terjadi kesalahan: ' + err.message, 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // --- DELETE HANDLERS (Super Admin & Pemilik) ---
  const handleOpenDelete = (tx: any) => {
    if (!isAuthorized) {
      showToast('Hanya Super Admin dan Pemilik yang memiliki hak akses hapus kas.', 'error');
      return;
    }
    setDeletingTx(tx);
    setIsOpenDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTx) return;

    setIsDeleting(true);
    try {
      const res = await apiRequest(`/cash/${deletingTx.id}`, {
        method: 'DELETE',
      });

      if (res.success) {
        showToast(res.message || 'Transaksi kas berhasil dihapus.', 'success');
        setIsOpenDelete(false);
        setDeletingTx(null);
        fetchCash();
      } else {
        showToast(res.message || 'Gagal menghapus transaksi kas.', 'error');
      }
    } catch (err: any) {
      showToast('Terjadi kesalahan: ' + err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Wallet className="w-6 h-6 text-emerald-600" />
              <span>Kas Besar & Buku Arus Keuangan</span>
            </h1>
            {isAuthorized ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold rounded-full">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                Akses Penuh: Super Admin & Pemilik (Edit & Hapus Aktif)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                Mode Tinjau Saja
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pencatatan seluruh aliran kas masuk dan kas keluar operasional toko, penjualan, pembelian, dan penyesuaian kas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAdd('in')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Kas Masuk</span>
          </button>
          <button
            onClick={() => handleOpenAdd('out')}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
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
          className="self-end px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer"
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
                {isAuthorized && <th className="px-4 py-3 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={isAuthorized ? 10 : 9} className="py-12 text-center text-slate-400">
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
                    <td className="px-4 py-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                      {ct.amountIn > 0 ? formatRupiah(ct.amountIn) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600 whitespace-nowrap">
                      {ct.amountOut > 0 ? formatRupiah(ct.amountOut) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900 whitespace-nowrap">
                      {formatRupiah(ct.balanceAfter)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{ct.userName || 'System'}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{ct.notes || '-'}</td>
                    {isAuthorized && (
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(ct)}
                            title="Edit Transaksi Kas"
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200/80 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(ct)}
                            title="Hapus Transaksi Kas"
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200/80 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MANUAL CASH MODAL (Tambah Kas) --- */}
      {isOpenManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div
              className={`px-5 py-4 text-white flex items-center justify-between ${
                entryType === 'in' ? 'bg-emerald-700' : 'bg-rose-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-white" />
                <span className="font-bold text-sm">
                  Catat {entryType === 'in' ? 'Pemasukan Kas' : 'Pengeluaran Kas'}
                </span>
              </div>
              <button
                onClick={() => setIsOpenManual(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitManual} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Kategori *
                </label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Contoh: Beban listrik toko, Pembelian ATK, dll."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-slate-800"
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
                  className="w-full text-base font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Catatan</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Keterangan pengeluaran / pemasukan..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpenManual(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className={`px-4 py-2 text-white rounded-xl font-bold shadow-md transition cursor-pointer disabled:opacity-50 ${
                    entryType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmittingCreate ? 'Menyimpan...' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT CASH MODAL (Hanya Super Admin & Pemilik) --- */}
      {isOpenEdit && editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 bg-mandiri-navy text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-mandiri-gold" />
                <span className="font-bold text-sm">Edit Transaksi Kas: {editingTx.transactionNo}</span>
              </div>
              <button
                onClick={() => {
                  setIsOpenEdit(false);
                  setEditingTx(null);
                }}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-5 space-y-3.5 text-xs">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Arus Kas
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditType('in')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                      editType === 'in'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Kas Masuk</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType('out')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                      editType === 'out'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Kas Keluar</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Kategori *
                </label>
                <input
                  type="text"
                  required
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  placeholder="Contoh: Beban Listrik, Pembelian Operasional, dll."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-mandiri-navy"
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
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full text-base font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-mandiri-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Tanggal & Waktu Transaksi
                </label>
                <input
                  type="datetime-local"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-mandiri-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Catatan / Keterangan
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Keterangan koreksi..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-mandiri-navy"
                />
              </div>

              {/* Recalculation Note */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 text-blue-900">
                <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Perubahan nominal atau jenis kas akan secara otomatis <strong>menghitung ulang seluruh saldo berjalan</strong> (running balance) pada transaksi berikutnya.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpenEdit(false);
                    setEditingTx(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL (Hanya Super Admin & Pemilik) --- */}
      {isOpenDelete && deletingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 bg-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-white" />
                <span className="font-bold text-sm">Konfirmasi Hapus Transaksi Kas</span>
              </div>
              <button
                onClick={() => {
                  setIsOpenDelete(false);
                  setDeletingTx(null);
                }}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-rose-800">Peringatan Penghapusan Kas</h4>
                  <p className="mt-1 text-xs text-rose-700 leading-relaxed">
                    Apakah Anda yakin ingin menghapus transaksi kas ini? Seluruh saldo kas berjalan pada transaksi setelahnya akan dihitung ulang secara otomatis.
                  </p>
                </div>
              </div>

              {/* Transaction Summary Details */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-slate-700 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">No. Transaksi:</span>
                  <span className="font-bold text-slate-900">{deletingTx.transactionNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Kategori:</span>
                  <span className="font-semibold text-slate-900">{deletingTx.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Nominal:</span>
                  <span
                    className={`font-black ${
                      (deletingTx.amountIn || 0) > 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {(deletingTx.amountIn || 0) > 0
                      ? `+ ${formatRupiah(deletingTx.amountIn)} (Masuk)`
                      : `- ${formatRupiah(deletingTx.amountOut)} (Keluar)`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Tanggal:</span>
                  <span className="text-slate-600">{formatDate(deletingTx.transactionDate)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpenDelete(false);
                    setDeletingTx(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer font-medium"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus Transaksi'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
