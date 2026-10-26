import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, CheckCircle, Clock, Calendar, X, Plus } from 'lucide-react';
import { apiRequest, formatRupiah, formatDate } from '../lib/api.ts';

export const PayablesView: React.FC = () => {
  const [payables, setPayables] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  // Payment Modal
  const [activePayable, setActivePayable] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'tunai' | 'transfer'>('tunai');
  const [payNotes, setPayNotes] = useState('');

  const fetchPayables = async () => {
    setLoading(true);
    const res = await apiRequest(`/payables?status=${selectedStatus}`);
    if (res.success) setPayables(res.payables || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPayables();
  }, [selectedStatus]);

  const handleOpenPay = (ap: any) => {
    setActivePayable(ap);
    setPayAmount(String(ap.remainingAmount));
    setPayMethod('tunai');
    setPayNotes('Pembayaran angsuran hutang invoice');
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) {
      alert('Nominal pembayaran harus valid.');
      return;
    }

    const res = await apiRequest(`/payables/${activePayable.id}/payments`, {
      method: 'POST',
      body: JSON.stringify({
        amount: Number(payAmount),
        paymentMethod: payMethod,
        notes: payNotes,
      }),
    });

    if (res.success) {
      alert(res.message);
      setActivePayable(null);
      fetchPayables();
    } else {
      alert(res.message || 'Gagal memproses pembayaran hutang.');
    }
  };

  const totalRemaining = payables
    .filter((p) => p.status !== 'lunas')
    .reduce((acc, curr) => acc + curr.remainingAmount, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-rose-600" />
            <span>Hutang Supplier (Accounts Payable)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Daftar kewajiban pembayaran tempo kepada supplier beserta riwayat cicilan kas keluar.
          </p>
        </div>

        <div className="bg-rose-50 border border-rose-200 px-4 py-2 rounded-xl text-right">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
            Total Sisa Hutang Berjalan:
          </span>
          <span className="text-lg font-black text-rose-700">{formatRupiah(totalRemaining)}</span>
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
                ? 'border-rose-600 text-rose-700 bg-rose-50/50 rounded-t-xl'
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
              <th className="px-4 py-3">No. Invoice & PO</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Jatuh Tempo</th>
              <th className="px-4 py-3 text-right">Total Hutang</th>
              <th className="px-4 py-3 text-right text-emerald-700">Sudah Dibayar</th>
              <th className="px-4 py-3 text-right text-rose-700">Sisa Hutang</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payables.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  Tidak ada data hutang pada filter ini.
                </td>
              </tr>
            ) : (
              payables.map((ap) => (
                <tr key={ap.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">
                    <div>{ap.invoiceNo}</div>
                    <div className="text-[10px] text-slate-400">{ap.purchaseNo}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{ap.supplierName}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{ap.dueDate}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-600">
                    {formatRupiah(ap.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">
                    {formatRupiah(ap.paidAmount)}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-rose-700">
                    {formatRupiah(ap.remainingAmount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        ap.status === 'lunas'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ap.status === 'sebagian'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {ap.status === 'lunas' ? 'Lunas' : ap.status === 'sebagian' ? 'Sebagian' : 'Belum Bayar'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {ap.status !== 'lunas' && (
                      <button
                        onClick={() => handleOpenPay(ap)}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[10px] shadow-xs"
                      >
                        Bayar Cicilan
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- PAYMENT MODAL --- */}
      {activePayable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <span className="font-bold text-sm">Pembayaran Hutang Supplier</span>
              <button onClick={() => setActivePayable(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProcessPayment} className="p-5 space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500">
                  Supplier: <strong className="text-slate-800">{activePayable.supplierName}</strong>
                </div>
                <div className="text-slate-500">
                  Invoice: <strong className="text-slate-800 font-mono">{activePayable.invoiceNo}</strong>
                </div>
                <div className="text-rose-700 font-bold">
                  Sisa Hutang: {formatRupiah(activePayable.remainingAmount)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Nominal Dibayar (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={activePayable.remainingAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full text-base font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Metode Kas
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-semibold"
                >
                  <option value="tunai">Tunai (Kas Toko)</option>
                  <option value="transfer">Transfer Bank</option>
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
                  onClick={() => setActivePayable(null)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md transition"
                >
                  Konfirmasi Bayar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
