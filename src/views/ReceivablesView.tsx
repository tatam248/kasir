import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Clock, X, DollarSign } from 'lucide-react';
import { apiRequest, formatRupiah, formatDate } from '../lib/api.ts';

export const ReceivablesView: React.FC = () => {
  const [receivables, setReceivables] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  // Collection Modal
  const [activeReceivable, setActiveReceivable] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'tunai' | 'transfer' | 'qris'>('tunai');
  const [payNotes, setPayNotes] = useState('');

  const fetchReceivables = async () => {
    setLoading(true);
    const res = await apiRequest(`/receivables?status=${selectedStatus}`);
    if (res.success) setReceivables(res.receivables || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchReceivables();
  }, [selectedStatus]);

  const handleOpenCollect = (ar: any) => {
    setActiveReceivable(ar);
    setPayAmount(String(ar.remainingAmount));
    setPayMethod('tunai');
    setPayNotes('Penerimaan angsuran piutang nota kasir');
  };

  const handleProcessCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) {
      alert('Nominal penerimaan harus valid.');
      return;
    }

    const res = await apiRequest(`/receivables/${activeReceivable.id}/payments`, {
      method: 'POST',
      body: JSON.stringify({
        amount: Number(payAmount),
        paymentMethod: payMethod,
        notes: payNotes,
      }),
    });

    if (res.success) {
      alert(res.message);
      setActiveReceivable(null);
      fetchReceivables();
    } else {
      alert(res.message || 'Gagal memproses penerimaan piutang.');
    }
  };

  const totalRemaining = receivables
    .filter((r) => r.status !== 'lunas')
    .reduce((acc, curr) => acc + curr.remainingAmount, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-purple-600" />
            <span>Piutang Pelanggan (Accounts Receivable)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitoring transaksi penjualan tempo, jatuh tempo penagihan, dan penerimaan cicilan kas masuk.
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 px-4 py-2 rounded-xl text-right">
          <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
            Total Sisa Piutang Berjalan:
          </span>
          <span className="text-lg font-black text-purple-700">{formatRupiah(totalRemaining)}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { id: 'all', label: 'Semua Status' },
          { id: 'belum_lunas', label: 'Belum Lunas' },
          { id: 'sebagian', label: 'Sebagian (Dicicil)' },
          { id: 'lunas', label: 'Lunas' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedStatus(tab.id)}
            className={`px-4 py-2 font-bold text-xs border-b-2 transition -mb-[2px] ${
              selectedStatus === tab.id
                ? 'border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">No. Invoice Nota</th>
              <th className="px-4 py-3">Pelanggan</th>
              <th className="px-4 py-3">No. Telepon / WA</th>
              <th className="px-4 py-3">Jatuh Tempo</th>
              <th className="px-4 py-3 text-right">Total Piutang</th>
              <th className="px-4 py-3 text-right text-mandiri-navy">Sudah Diterima</th>
              <th className="px-4 py-3 text-right text-purple-700">Sisa Piutang</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {receivables.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  Tidak ada data piutang pada filter ini.
                </td>
              </tr>
            ) : (
              receivables.map((ar) => (
                <tr key={ar.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">{ar.invoiceNo}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{ar.customerName}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">{ar.customerPhone}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{ar.dueDate}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-600">
                    {formatRupiah(ar.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-mandiri-navy">
                    {formatRupiah(ar.paidAmount)}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-purple-700">
                    {formatRupiah(ar.remainingAmount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        ar.status === 'lunas'
                          ? 'bg-blue-100 text-mandiri-navy border border-blue-200'
                          : ar.status === 'sebagian'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {ar.status === 'lunas' ? 'Lunas' : ar.status === 'sebagian' ? 'Sebagian' : 'Belum Bayar'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {ar.status !== 'lunas' && (
                      <button
                        onClick={() => handleOpenCollect(ar)}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[10px] shadow-xs"
                      >
                        Terima Cicilan
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- COLLECTION MODAL --- */}
      {activeReceivable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <span className="font-bold text-sm">Penerimaan Pembayaran Piutang</span>
              <button onClick={() => setActiveReceivable(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProcessCollection} className="p-5 space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500">
                  Pelanggan: <strong className="text-slate-800">{activeReceivable.customerName}</strong>
                </div>
                <div className="text-slate-500">
                  Invoice: <strong className="text-slate-800 font-mono">{activeReceivable.invoiceNo}</strong>
                </div>
                <div className="text-purple-700 font-bold">
                  Sisa Piutang: {formatRupiah(activeReceivable.remainingAmount)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Nominal Diterima (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={activeReceivable.remainingAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full text-base font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-mandiri-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Metode Penerimaan
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-semibold"
                >
                  <option value="tunai">Tunai (Masuk Kas Toko)</option>
                  <option value="transfer">Transfer Bank</option>
                  <option value="qris">QRIS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Catatan</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveReceivable(null)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md transition"
                >
                  Simpan Penerimaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
