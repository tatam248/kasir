import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  CheckCircle,
  Truck,
  Trash2,
  DollarSign,
  Calendar,
  X,
  FileCheck,
  ChevronDown,
} from 'lucide-react';
import { Purchase, Supplier, Product } from '../types/index.ts';
import { apiRequest, formatRupiah, formatDate } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const PurchasesView: React.FC = () => {
  const { hasPermission } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // New PO Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [paymentType, setPaymentType] = useState<'tunai' | 'transfer' | 'kredit'>('tunai');
  const [dueDate, setDueDate] = useState('');
  const [autoReceive, setAutoReceive] = useState(true);
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState<
    Array<{ productId: string; qty: number; purchasePrice: number; discount: number }>
  >([]);

  const fetchData = async () => {
    setLoading(true);
    const [pRes, sRes, prodRes] = await Promise.all([
      apiRequest('/purchases'),
      apiRequest('/suppliers'),
      apiRequest('/products'),
    ]);
    if (pRes.success) setPurchases(pRes.purchases || []);
    if (sRes.success) setSuppliers(sRes.suppliers || []);
    if (prodRes.success) setProducts(prodRes.products || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setSupplierId(suppliers[0]?.id || '');
    setInvoiceNo(`INV-SUP-${Date.now().toString().slice(-4)}`);
    setPaymentType('tunai');
    setAutoReceive(true);
    setNotes('');

    // Default with first product
    if (products.length > 0) {
      setOrderItems([
        {
          productId: products[0].id,
          qty: 10,
          purchasePrice: products[0].purchasePrice || 10000,
          discount: 0,
        },
      ]);
    } else {
      setOrderItems([]);
    }
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    if (products.length === 0) return;
    setOrderItems((prev) => [
      ...prev,
      {
        productId: products[0].id,
        qty: 1,
        purchasePrice: products[0].purchasePrice || 10000,
        discount: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    setOrderItems((prev) => {
      const updated = [...prev];
      (updated[index] as any)[field] = val;
      if (field === 'productId') {
        const p = products.find((x) => x.id === val);
        if (p) updated[index].purchasePrice = p.purchasePrice || 0;
      }
      return updated;
    });
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((acc, curr) => acc + (curr.qty * curr.purchasePrice - curr.discount), 0);
  };

  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || orderItems.length === 0) {
      alert('Pilih supplier dan tambahkan setidaknya satu item.');
      return;
    }

    const res = await apiRequest('/purchases', {
      method: 'POST',
      body: JSON.stringify({
        supplierId,
        invoiceNo,
        paymentType,
        dueDate: paymentType === 'kredit' ? dueDate : null,
        autoReceive,
        notes,
        items: orderItems,
      }),
    });

    if (res.success) {
      alert(res.message);
      setIsModalOpen(false);
      fetchData();
    } else {
      alert(res.message || 'Gagal menyimpan pembelian.');
    }
  };

  const handleReceiveGoods = async (pId: string) => {
    if (!confirm('Posting penerimaan barang sekarang? Stok akan bertambah dan HPP Weighted Average akan dihitung ulang.')) return;

    const res = await apiRequest(`/purchases/${pId}/receive`, { method: 'POST' });
    if (res.success) {
      alert(res.message);
      fetchData();
    } else {
      alert(res.message || 'Gagal posting penerimaan.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-mandiri-orange rounded-full inline-block"></span>
            <ShoppingBag className="w-6 h-6 text-mandiri-navy" />
            <span>Pembelian Barang & PO Supplier</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Penerimaan barang otomatis menambah stok dan mengkalkulasi HPP Rata-rata Tertimbang.
          </p>
        </div>

        {hasPermission('purchase.create') && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl text-xs font-bold shadow-md shadow-mandiri-navy/30 border-b-2 border-mandiri-gold transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-mandiri-gold" />
            <span>Buat Pembelian Baru</span>
          </button>
        )}
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">No. PO & Invoice</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3 text-right">Total Tagihan</th>
                <th className="px-4 py-3 text-center">Metode Bayar</th>
                <th className="px-4 py-3 text-center">Status Barang</th>
                <th className="px-4 py-3">Item Pembelian</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Belum ada riwayat transaksi pembelian.
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-slate-800">{p.purchaseNo}</div>
                      <div className="text-[10px] text-slate-400">Inv: {p.invoiceNo}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{p.purchaseDate}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{p.supplierName}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-800">
                      {formatRupiah(p.grandTotal)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-md font-bold uppercase text-[10px] bg-slate-100 text-slate-700">
                        {p.paymentType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          p.shippingStatus === 'diterima'
                            ? 'bg-blue-50 text-mandiri-navy border border-blue-200'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.shippingStatus === 'diterima' ? 'Sudah Diterima' : 'Dipesan / Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      {p.items?.map((it: any) => `${it.productName} (${it.qty})`).join(', ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.shippingStatus !== 'diterima' && hasPermission('purchase.approve') && (
                        <button
                          onClick={() => handleReceiveGoods(p.id)}
                          className="px-3 py-1 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-lg font-bold text-[10px] shadow-xs cursor-pointer border-b border-mandiri-gold"
                        >
                          Posting Terima
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

      {/* --- CREATE PURCHASE MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 my-6 animate-in fade-in">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <span className="font-extrabold text-base">Input Pembelian Barang Baru</span>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePO} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Supplier *</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">No. Invoice Supplier</label>
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Metode Bayar</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="tunai">Tunai (Kas)</option>
                    <option value="transfer">Transfer Bank</option>
                    <option value="kredit">Kredit (Hutang Supplier)</option>
                  </select>
                </div>
              </div>

              {paymentType === 'kredit' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Tanggal Jatuh Tempo</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full sm:w-60 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                  />
                </div>
              )}

              {/* Order Items Table */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-slate-700">Daftar Barang Masuk</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Produk</th>
                        <th className="px-3 py-2 w-24 text-center">Qty</th>
                        <th className="px-3 py-2 w-36 text-right">Harga Beli (Rp)</th>
                        <th className="px-3 py-2 w-32 text-right">Subtotal</th>
                        <th className="px-3 py-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orderItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <select
                              value={item.productId}
                              onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => handleItemChange(idx, 'qty', Number(e.target.value))}
                              className="w-20 text-center px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.purchasePrice}
                              onChange={(e) => handleItemChange(idx, 'purchasePrice', Number(e.target.value))}
                              className="w-32 text-right px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-900">
                            {formatRupiah(item.qty * item.purchasePrice)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total & Options */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                <div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-mandiri-navy">
                    <input
                      type="checkbox"
                      checked={autoReceive}
                      onChange={(e) => setAutoReceive(e.target.checked)}
                      className="rounded-md text-mandiri-navy focus:ring-mandiri-navy w-4 h-4 cursor-pointer"
                    />
                    <span>Langsung Posting Penerimaan Barang & Perbarui HPP Sekarang</span>
                  </label>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Stok otomatis bertambah ke gudang dan average cost dihitung ulang secara real-time.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-500 uppercase font-bold">Total Pembelian:</div>
                  <div className="text-lg font-black text-mandiri-navy">
                    {formatRupiah(calculateSubtotal())}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl text-xs font-black shadow-md shadow-mandiri-navy/30 border-b-2 border-mandiri-gold transition cursor-pointer"
                >
                  Simpan Pembelian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
