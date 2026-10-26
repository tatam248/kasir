import React, { useState, useEffect } from 'react';
import {
  FileText,
  Filter,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  Calendar,
  AlertCircle,
  X,
  ShieldCheck,
} from 'lucide-react';
import { StockMovement, Product } from '../types/index.ts';
import { apiRequest, formatRupiah, formatDate } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { SupervisorPinModal } from '../components/common/SupervisorPinModal.tsx';

export const InventoryView: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  // Manual Adjustment Modal
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustProdId, setAdjustProdId] = useState('');
  const [adjustType, setAdjustType] = useState<'masuk' | 'keluar' | 'rusak' | 'hilang'>('keluar');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Supervisor PIN Modal
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

  const fetchData = async () => {
    setLoading(true);
    let url = `/inventory/ledger?productId=${selectedProduct}&movementType=${selectedType}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    const [mRes, pRes] = await Promise.all([apiRequest(url), apiRequest('/products')]);
    if (mRes.success) setMovements(mRes.movements || []);
    if (pRes.success) setProducts(pRes.products || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedProduct, selectedType]);

  const handleOpenAdjust = () => {
    setAdjustProdId(products[0]?.id || '');
    setAdjustType('keluar');
    setAdjustQty('');
    setAdjustReason('');
    setIsAdjustOpen(true);
  };

  const handleProcessAdjust = async (supervisorPinUsed?: string) => {
    if (!adjustProdId || !adjustQty || Number(adjustQty) <= 0 || !adjustReason) {
      alert('Produk, jumlah (qty > 0), dan alasan penyesuaian wajib diisi.');
      return;
    }

    const res = await apiRequest('/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify({
        productId: adjustProdId,
        adjustmentType: adjustType,
        qty: Number(adjustQty),
        reason: adjustReason,
        supervisorPin: supervisorPinUsed || undefined,
      }),
    });

    if (res.success) {
      alert(res.message);
      setIsAdjustOpen(false);
      fetchData();
    } else {
      if (res.requiresSupervisor) {
        setPinModal({
          isOpen: true,
          title: 'Otorisasi Supervisor Penyesuaian Stok',
          description: res.message || 'Penyesuaian stok manual memerlukan otorisasi Supervisor PIN.',
          onSuccess: (pin) => {
            setPinModal((prev) => ({ ...prev, isOpen: false }));
            handleProcessAdjust(pin);
          },
        });
      } else {
        alert(res.message || 'Gagal menyesuaikan stok.');
      }
    }
  };

  const getMovementTypeBadge = (type: string) => {
    const map: Record<string, { label: string; color: string }> = {
      stok_awal: { label: 'Stok Awal', color: 'bg-blue-100 text-blue-700' },
      pembelian: { label: 'Pembelian Masuk', color: 'bg-blue-50 text-mandiri-navy border border-blue-200' },
      penjualan: { label: 'Penjualan Kasir', color: 'bg-slate-100 text-slate-800' },
      retur_penjualan: { label: 'Retur Penjualan', color: 'bg-teal-100 text-teal-800' },
      retur_pembelian: { label: 'Retur Pembelian', color: 'bg-amber-100 text-amber-800' },
      penyesuaian_stok: { label: 'Penyesuaian', color: 'bg-purple-100 text-purple-700' },
      barang_rusak: { label: 'Barang Rusak', color: 'bg-rose-100 text-rose-700' },
      barang_hilang: { label: 'Barang Hilang', color: 'bg-rose-100 text-rose-800' },
      stock_opname: { label: 'Stock Opname', color: 'bg-indigo-100 text-indigo-700' },
    };
    const b = map[type] || { label: type, color: 'bg-slate-100 text-slate-600' };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${b.color}`}>{b.label}</span>;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-mandiri-orange rounded-full inline-block"></span>
            <FileText className="w-6 h-6 text-mandiri-navy" />
            <span>Kartu Stok & Mutasi Persediaan (Stock Ledger)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Setiap perubahan stok tercatat secara transparan dengan saldo awal, mutasi, dan saldo akhir.
          </p>
        </div>

        {hasPermission('inventory.adjust') && (
          <button
            onClick={handleOpenAdjust}
            className="flex items-center gap-1.5 px-4 py-2 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl text-xs font-bold shadow-md shadow-mandiri-navy/30 border-b-2 border-mandiri-gold transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-mandiri-gold" />
            <span>Penyesuaian Stok Manual</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Pilih Produk</label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700"
          >
            <option value="all">Semua Produk</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        <div className="w-48">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Jenis Mutasi</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700"
          >
            <option value="all">Semua Jenis Mutasi</option>
            <option value="stok_awal">Stok Awal</option>
            <option value="pembelian">Pembelian</option>
            <option value="penjualan">Penjualan</option>
            <option value="retur_penjualan">Retur Penjualan</option>
            <option value="penyesuaian_stok">Penyesuaian Stok</option>
            <option value="barang_rusak">Barang Rusak</option>
            <option value="barang_hilang">Barang Hilang</option>
            <option value="stock_opname">Stock Opname</option>
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
          onClick={fetchData}
          className="self-end px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Terapkan</span>
        </button>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Tanggal & Waktu</th>
                <th className="px-4 py-3">Produk & SKU</th>
                <th className="px-4 py-3">Jenis Mutasi</th>
                <th className="px-4 py-3">No. Referensi</th>
                <th className="px-4 py-3 text-right">Stok Awal</th>
                <th className="px-4 py-3 text-right text-mandiri-navy">Masuk (+)</th>
                <th className="px-4 py-3 text-right text-rose-700">Keluar (-)</th>
                <th className="px-4 py-3 text-right font-black">Stok Akhir</th>
                <th className="px-4 py-3">Operator</th>
                <th className="px-4 py-3">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Belum ada histori mutasi stok yang sesuai filter.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {formatDate(m.movementDate)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      <div>{m.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{m.productSku}</div>
                    </td>
                    <td className="px-4 py-3">{getMovementTypeBadge(m.movementType)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">{m.referenceNo}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-500">{m.stockBefore}</td>
                    <td className="px-4 py-3 text-right font-bold text-mandiri-navy">
                      {m.stockIn > 0 ? `+${m.stockIn}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600">
                      {m.stockOut > 0 ? `-${m.stockOut}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">{m.stockAfter}</td>
                    <td className="px-4 py-3 text-slate-600">{m.userName || 'System'}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{m.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MANUAL STOCK ADJUSTMENT MODAL --- */}
      {isAdjustOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <span className="font-bold text-sm">Penyesuaian Stok Manual</span>
              <button onClick={() => setIsAdjustOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProcessAdjust();
              }}
              className="p-5 space-y-3"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Pilih Produk</label>
                <select
                  value={adjustProdId}
                  onChange={(e) => setAdjustProdId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-mandiri-navy"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stok Saat Ini: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Jenis Penyesuaian</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-mandiri-navy"
                >
                  <option value="masuk">Stok Masuk (Koreksi Tambah / Temuan)</option>
                  <option value="keluar">Stok Keluar (Koreksi Kurang)</option>
                  <option value="rusak">Barang Rusak / Kadaluarsa</option>
                  <option value="hilang">Barang Hilang / Selisih</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Jumlah (Qty)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="Contoh: 5"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-mandiri-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Alasan Penyesuaian *</label>
                <textarea
                  rows={3}
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Wajib menuliskan alasan penyesuaian stok untuk keperluan audit..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-mandiri-navy"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustOpen(false)}
                  className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl text-xs font-bold shadow-md shadow-mandiri-navy/30 border-b-2 border-mandiri-gold transition cursor-pointer"
                >
                  Simpan Penyesuaian
                </button>
              </div>
            </form>
          </div>
        </div>
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
