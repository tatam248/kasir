import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Plus,
  CheckCircle2,
  Clock,
  Search,
  X,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import { Product } from '../types/index.ts';
import { apiRequest, formatDate } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { SupervisorPinModal } from '../components/common/SupervisorPinModal.tsx';

export const StockOpnameView: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [opnames, setOpnames] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // New Opname Modal
  const [isOpenNew, setIsOpenNew] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<
    Array<{ productId: string; name: string; sku: string; systemStock: number; physicalStock: number; reason: string }>
  >([]);

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

  const fetchData = async () => {
    setLoading(true);
    const [oRes, pRes] = await Promise.all([
      apiRequest('/inventory/opnames'),
      apiRequest('/products?status=active'),
    ]);
    if (oRes.success) setOpnames(oRes.opnames || []);
    if (pRes.success) setProducts(pRes.products || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    // By default load all active products with their current system stock
    setSelectedItems(
      products.map((p) => ({
        productId: p.id,
        name: p.name,
        sku: p.sku,
        systemStock: p.stock,
        physicalStock: p.stock, // default same
        reason: 'Perhitungan fisik berkala',
      }))
    );
    setNotes('Stock Opname Akhir Bulan');
    setIsOpenNew(true);
  };

  const handlePhysicalChange = (productId: string, val: number) => {
    setSelectedItems((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, physicalStock: val } : it))
    );
  };

  const handleReasonChange = (productId: string, val: string) => {
    setSelectedItems((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, reason: val } : it))
    );
  };

  const handleSubmitOpname = async (autoPost: boolean, supervisorPinUsed?: string) => {
    const payload = {
      notes,
      items: selectedItems.map((it) => ({
        productId: it.productId,
        physicalStock: Number(it.physicalStock),
        reason: it.reason,
      })),
      autoPost,
      supervisorPin: supervisorPinUsed || undefined,
    };

    const res = await apiRequest('/inventory/opnames', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.success) {
      alert(res.message);
      setIsOpenNew(false);
      fetchData();
    } else {
      if (res.requiresSupervisor) {
        setPinModal({
          isOpen: true,
          title: 'Otorisasi Supervisor Posting Opname',
          description: res.message || 'Posting stock opname memerlukan otorisasi Supervisor PIN.',
          onSuccess: (pin) => {
            setPinModal((prev) => ({ ...prev, isOpen: false }));
            handleSubmitOpname(autoPost, pin);
          },
        });
      } else {
        alert(res.message || 'Gagal menyimpan stock opname.');
      }
    }
  };

  const handleApproveDraft = async (opnameId: string, supervisorPinUsed?: string) => {
    const res = await apiRequest(`/inventory/opnames/${opnameId}/post`, {
      method: 'POST',
      body: JSON.stringify({ supervisorPin: supervisorPinUsed }),
    });

    if (res.success) {
      alert(res.message);
      fetchData();
    } else {
      if (res.requiresSupervisor) {
        setPinModal({
          isOpen: true,
          title: 'Otorisasi Supervisor Approval Opname',
          description: res.message || 'Approval stock opname memerlukan otorisasi Supervisor PIN.',
          onSuccess: (pin) => {
            setPinModal((prev) => ({ ...prev, isOpen: false }));
            handleApproveDraft(opnameId, pin);
          },
        });
      } else {
        alert(res.message || 'Gagal menyetujui stock opname.');
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-emerald-600" />
            <span>Modul Stock Opname & Rekonsiliasi Fisik</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pengecekan fisik stok vs sistem, penghitungan selisih, dan posting penyesuaian terotorisasi.
          </p>
        </div>

        {hasPermission('inventory.opname') && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Sesi Opname Baru</span>
          </button>
        )}
      </div>

      {/* Opname List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">No. Opname</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Petugas Pelaksana</th>
                <th className="px-4 py-3">Disetujui Oleh</th>
                <th className="px-4 py-3">Item Dihitung</th>
                <th className="px-4 py-3">Keterangan</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {opnames.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Belum ada riwayat stock opname.
                  </td>
                </tr>
              ) : (
                opnames.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">{o.opnameNo}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{o.opnameDate}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{o.userName}</td>
                    <td className="px-4 py-3 text-slate-600">{o.approvedByName || '-'}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{o.items?.length || 0} Barang</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{o.notes}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          o.status === 'posted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {o.status === 'posted' ? 'Sudah Diposting' : 'Draft (Menunggu Approval)'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {o.status === 'draft' && hasPermission('inventory.opname') && (
                        <button
                          onClick={() => handleApproveDraft(o.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] shadow-xs"
                        >
                          Setujui & Posting
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

      {/* --- CREATE STOCK OPNAME WIZARD MODAL --- */}
      {isOpenNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 my-6 animate-in fade-in">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">Formulir Perhitungan Stock Opname</h3>
                <p className="text-xs text-slate-400">
                  Input jumlah fisik aktual untuk membandingkan dengan stok sistem.
                </p>
              </div>
              <button onClick={() => setIsOpenNew(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Catatan Sesi Opname
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Opname Rutin Gudang Utama"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Items Grid */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Produk</th>
                      <th className="px-4 py-2.5 text-center">Stok Sistem</th>
                      <th className="px-4 py-2.5 text-center w-28">Stok Fisik</th>
                      <th className="px-4 py-2.5 text-center">Selisih</th>
                      <th className="px-4 py-2.5">Alasan / Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedItems.map((item) => {
                      const diff = item.physicalStock - item.systemStock;
                      return (
                        <tr key={item.productId} className="hover:bg-slate-50/80">
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-800">{item.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold text-slate-600">
                            {item.systemStock}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.physicalStock}
                              onChange={(e) => handlePhysicalChange(item.productId, Number(e.target.value))}
                              className="w-20 text-center font-bold px-2 py-1 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-center font-black">
                            {diff === 0 ? (
                              <span className="text-slate-400">0 (Sesuai)</span>
                            ) : diff > 0 ? (
                              <span className="text-emerald-600">+{diff} (Lebih)</span>
                            ) : (
                              <span className="text-rose-600">{diff} (Kurang)</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              type="text"
                              value={item.reason}
                              onChange={(e) => handleReasonChange(item.productId, e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px]"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsOpenNew(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Batal
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSubmitOpname(false)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition"
                >
                  Simpan Sebagai Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitOpname(true)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition"
                >
                  Posting Penyesuaian Sekarang
                </button>
              </div>
            </div>
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
