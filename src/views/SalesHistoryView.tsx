import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Printer,
  RotateCcw,
  Ban,
  Calendar,
  Filter,
  Eye,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Sale, StoreSettings } from '../types/index.ts';
import { apiRequest, formatRupiah, formatDate } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { ThermalReceipt } from '../components/receipt/ThermalReceipt.tsx';
import { SupervisorPinModal } from '../components/common/SupervisorPinModal.tsx';

export const SalesHistoryView: React.FC = () => {
  const { user, hasPermission, storeSettings } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected Sale for Receipt Preview
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<Sale | null>(null);

  // Return Modal
  const [returnSale, setReturnSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<
    Array<{ saleItemId: string; productName: string; purchasedQty: number; returnedQty: number; returnQty: number; refundPrice: number; conditionType: 'bagus' | 'rusak' }>
  >([]);
  const [returnReason, setReturnReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'tunai' | 'transfer' | 'potong_piutang'>('tunai');

  // Cancel / Void Modal
  const [voidSaleTarget, setVoidSaleTarget] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState('');

  // Supervisor PIN
  const [pinModal, setPinModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onSuccess: (pin: string) => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onSuccess: () => {},
  });

  const fetchSales = async () => {
    setLoading(true);
    let url = `/sales?search=${encodeURIComponent(search)}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    const res = await apiRequest(url);
    if (res.success) setSales(res.sales || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleOpenReturn = (s: Sale) => {
    setReturnSale(s);
    setReturnReason('Barang tidak sesuai / salah beli');
    setRefundMethod('tunai');
    setReturnItems(
      (s.items || []).map((it) => ({
        saleItemId: it.id,
        productName: it.productName || 'Produk',
        purchasedQty: it.qty,
        returnedQty: it.returnedQty || 0,
        returnQty: 0,
        refundPrice: it.unitPrice,
        conditionType: 'bagus',
      }))
    );
  };

  const handleReturnItemQty = (saleItemId: string, qty: number) => {
    setReturnItems((prev) =>
      prev.map((it) => (it.saleItemId === saleItemId ? { ...it, returnQty: Math.max(0, qty) } : it))
    );
  };

  const handleReturnItemCondition = (saleItemId: string, cond: 'bagus' | 'rusak') => {
    setReturnItems((prev) =>
      prev.map((it) => (it.saleItemId === saleItemId ? { ...it, conditionType: cond } : it))
    );
  };

  const handleProcessReturn = async (supervisorPinUsed?: string) => {
    const toReturn = returnItems.filter((it) => it.returnQty > 0);
    if (toReturn.length === 0) {
      alert('Masukkan jumlah barang yang akan diretur (> 0).');
      return;
    }

    const payload = {
      saleId: returnSale!.id,
      reason: returnReason,
      refundMethod,
      items: toReturn.map((it) => ({
        saleItemId: it.saleItemId,
        qty: it.returnQty,
        refundPrice: it.refundPrice,
        conditionType: it.conditionType,
      })),
      supervisorPin: supervisorPinUsed || undefined,
    };

    const res = await apiRequest('/returns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.success) {
      alert(res.message);
      setReturnSale(null);
      fetchSales();
    } else {
      if (res.requiresSupervisor) {
        setPinModal({
          isOpen: true,
          title: 'Otorisasi Supervisor Retur Penjualan',
          description: res.message || 'Memproses retur memerlukan otorisasi Supervisor PIN.',
          onSuccess: (pin) => {
            setPinModal((prev) => ({ ...prev, isOpen: false }));
            handleProcessReturn(pin);
          },
        });
      } else {
        alert(res.message || 'Gagal memproses retur.');
      }
    }
  };

  const handleProcessVoid = async (supervisorPinUsed?: string) => {
    if (!voidSaleTarget) return;

    const res = await apiRequest(`/sales/${voidSaleTarget.id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({
        reason: voidReason || 'Pembatalan transaksi kasir',
        supervisorPin: supervisorPinUsed || undefined,
      }),
    });

    if (res.success) {
      alert(res.message);
      setVoidSaleTarget(null);
      fetchSales();
    } else {
      if (res.requiresSupervisor) {
        setPinModal({
          isOpen: true,
          title: 'Otorisasi Supervisor Pembatalan (Void)',
          description: res.message || 'Membatalkan nota penjualan memerlukan otorisasi Supervisor PIN.',
          onSuccess: (pin) => {
            setPinModal((prev) => ({ ...prev, isOpen: false }));
            handleProcessVoid(pin);
          },
        });
      } else {
        alert(res.message || 'Gagal membatalkan transaksi.');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'selesai') {
      return <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-blue-50 text-mandiri-navy border border-blue-200">Selesai</span>;
    }
    if (status === 'batal') {
      return <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-rose-100 text-rose-800">Dibatalkan</span>;
    }
    if (status === 'retur_sebagian') {
      return <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800">Retur Sebagian</span>;
    }
    if (status === 'retur_total') {
      return <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-purple-100 text-purple-800">Retur Total</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700">{status}</span>;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-mandiri-orange rounded-full inline-block"></span>
            <Receipt className="w-6 h-6 text-mandiri-navy" />
            <span>Riwayat Nota Penjualan & Retur</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Daftar transaksi kasir, cetak ulang struk thermal, retur barang, dan pembatalan transaksi.
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchSales()}
            placeholder="Cari No. Invoice Nota..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-mandiri-navy"
          />
        </div>

        <div className="w-36">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-mandiri-navy"
          />
        </div>

        <div className="w-36">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-mandiri-navy"
          />
        </div>

        <button
          onClick={fetchSales}
          className="px-4 py-2 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl font-bold shadow-md shadow-mandiri-navy/30 border-b-2 border-mandiri-gold transition cursor-pointer"
        >
          Filter Nota
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">No. Invoice</th>
                <th className="px-4 py-3">Waktu Transaksi</th>
                <th className="px-4 py-3">Pelanggan</th>
                <th className="px-4 py-3">Kasir</th>
                <th className="px-4 py-3 text-right">Grand Total</th>
                <th className="px-4 py-3 text-center">Metode Bayar</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Aksi Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada transaksi penjualan pada filter ini.
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">{s.invoiceNo}</td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {formatDate(s.saleDate)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{s.customerName}</td>
                    <td className="px-4 py-3 text-slate-600">{s.userName}</td>
                    <td className="px-4 py-3 text-right font-black text-mandiri-navy">
                      {formatRupiah(s.grandTotal)}
                    </td>
                    <td className="px-4 py-3 text-center font-bold uppercase text-[10px] text-slate-700">
                      {s.paymentType}
                    </td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(s.status)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedReceiptSale(s)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[10px] flex items-center gap-1 transition"
                          title="Cetak Ulang Struk"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Struk</span>
                        </button>

                        {s.status === 'selesai' && (
                          <>
                            <button
                              onClick={() => handleOpenReturn(s)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-bold text-[10px] flex items-center gap-1 transition"
                              title="Retur Barang"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Retur</span>
                            </button>
                            <button
                              onClick={() => {
                                setVoidSaleTarget(s);
                                setVoidReason('Salah input oleh kasir');
                              }}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[10px] flex items-center gap-1 transition"
                              title="Batalkan Transaksi (Void)"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Void</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- RETURN ITEMS MODAL --- */}
      {returnSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-6 animate-in fade-in">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">Retur Penjualan Produk</h3>
                <p className="text-xs text-slate-400">Invoice: {returnSale.invoiceNo}</p>
              </div>
              <button onClick={() => setReturnSale(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Produk</th>
                      <th className="px-3 py-2 text-center">Beli / Sudah Retur</th>
                      <th className="px-3 py-2 text-center w-24">Qty Retur</th>
                      <th className="px-3 py-2">Kondisi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {returnItems.map((item) => {
                      const maxAllowed = item.purchasedQty - item.returnedQty;
                      return (
                        <tr key={item.saleItemId} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-semibold text-slate-800">
                            {item.productName}
                          </td>
                          <td className="px-3 py-2 text-center text-slate-600">
                            {item.purchasedQty} (Retur: {item.returnedQty})
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min="0"
                              max={maxAllowed}
                              value={item.returnQty}
                              onChange={(e) => handleReturnItemQty(item.saleItemId, Number(e.target.value))}
                              className="w-16 text-center font-bold px-2 py-1 bg-white border border-slate-300 rounded-lg outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={item.conditionType}
                              onChange={(e) => handleReturnItemCondition(item.saleItemId, e.target.value as any)}
                              className="px-2 py-1 bg-white border border-slate-200 rounded-lg font-medium"
                            >
                              <option value="bagus">Bagus (Masuk Stok Dijual)</option>
                              <option value="rusak">Rusak (Masuk Barang Rusak)</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Metode Pengembalian Dana (Refund)
                </label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-semibold"
                >
                  <option value="tunai">Tunai (Kas Keluar)</option>
                  <option value="transfer">Transfer Bank</option>
                  {returnSale.paymentType === 'kredit' && (
                    <option value="potong_piutang">Potong Saldo Piutang Pelanggan</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Alasan Retur *
                </label>
                <input
                  type="text"
                  required
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReturnSale(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleProcessReturn()}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md transition"
                >
                  Proses Retur & Kembalikan Dana
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- VOID / CANCEL MODAL --- */}
      {voidSaleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="bg-rose-700 text-white px-5 py-4 flex items-center justify-between">
              <span className="font-bold text-sm">Batalkan Transaksi (Void)</span>
              <button onClick={() => setVoidSaleTarget(null)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Anda akan membatalkan invoice <strong className="text-slate-900">{voidSaleTarget.invoiceNo}</strong> sebesar{' '}
                <strong className="text-rose-700">{formatRupiah(voidSaleTarget.grandTotal)}</strong>.
                Seluruh barang akan dikembalikan ke stok dan kas akan direversal.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Alasan Pembatalan *
                </label>
                <input
                  type="text"
                  required
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVoidSaleTarget(null)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => handleProcessVoid()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md transition"
                >
                  Konfirmasi Batalkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- RECEIPT MODAL --- */}
      {selectedReceiptSale && (
        <ThermalReceipt
          sale={selectedReceiptSale}
          settings={storeSettings}
          onClose={() => setSelectedReceiptSale(null)}
        />
      )}

      {/* --- PIN MODAL --- */}
      <SupervisorPinModal
        isOpen={pinModal.isOpen}
        title={pinModal.title}
        description={pinModal.description}
        onSuccess={pinModal.onSuccess}
        onCancel={() => setPinModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
