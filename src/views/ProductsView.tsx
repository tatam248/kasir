import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Printer,
  Download,
  Upload,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  X,
  Barcode,
  Layers,
  Tag,
} from 'lucide-react';
import { Product, Category, Brand, Unit, Supplier } from '../types/index.ts';
import { apiRequest, formatRupiah } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';

export const ProductsView: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStockStatus, setSelectedStockStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<any>({
    sku: '',
    barcode: '',
    name: '',
    categoryId: '',
    brandId: '',
    unitId: '',
    purchasePrice: 0,
    sellingPrice: 0,
    wholesalePrice: 0,
    minWholesaleQty: 0,
    stock: 0,
    minStock: 5,
    locationRack: '',
    supplierId: '',
    status: 'active',
  });

  // Barcode / Price Label Print Modal
  const [labelProduct, setLabelProduct] = useState<Product | null>(null);
  const [labelCopies, setLabelCopies] = useState<number>(12);

  // Import Modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    let url = `/products?search=${encodeURIComponent(search)}`;
    if (selectedCategory !== 'all') url += `&categoryId=${selectedCategory}`;
    if (selectedStockStatus !== 'all') url += `&stockStatus=${selectedStockStatus}`;

    const res = await apiRequest(url);
    if (res.success) setProducts(res.products || []);
    setLoading(false);
  };

  const fetchMasters = async () => {
    const [cRes, bRes, uRes, sRes] = await Promise.all([
      apiRequest('/masters/categories'),
      apiRequest('/masters/brands'),
      apiRequest('/masters/units'),
      apiRequest('/suppliers'),
    ]);
    if (cRes.success) setCategories(cRes.categories || []);
    if (bRes.success) setBrands(bRes.brands || []);
    if (uRes.success) setUnits(uRes.units || []);
    if (sRes.success) setSuppliers(sRes.suppliers || []);
  };

  useEffect(() => {
    fetchMasters();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, selectedStockStatus]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      sku: `PRD-${Date.now().toString().slice(-6)}`,
      barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      name: '',
      categoryId: categories[0]?.id || '',
      brandId: brands[0]?.id || '',
      unitId: units[0]?.id || '',
      purchasePrice: 0,
      sellingPrice: 0,
      wholesalePrice: 0,
      minWholesaleQty: 0,
      stock: 0,
      minStock: 5,
      locationRack: 'Rak A-01',
      supplierId: suppliers[0]?.id || '',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      categoryId: p.categoryId,
      brandId: p.brandId || '',
      unitId: p.unitId,
      purchasePrice: p.purchasePrice || 0,
      sellingPrice: p.sellingPrice,
      wholesalePrice: p.wholesalePrice || 0,
      minWholesaleQty: p.minWholesaleQty || 0,
      stock: p.stock,
      minStock: p.minStock,
      locationRack: p.locationRack || '',
      supplierId: p.supplierId || '',
      status: p.status,
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!editingProduct;
    const url = isEdit ? `/products/${editingProduct.id}` : '/products';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await apiRequest(url, {
      method,
      body: JSON.stringify(formData),
    });

    if (res.success) {
      showToast(res.message || 'Produk berhasil disimpan.', 'success');
      setIsModalOpen(false);
      fetchProducts();
    } else {
      showToast(res.message || 'Gagal menyimpan produk.', 'error');
    }
  };

  const handleDeleteProduct = async (p: Product) => {
    const res = await apiRequest(`/products/${p.id}`, { method: 'DELETE' });
    if (res.success) {
      showToast(res.message || 'Produk berhasil dihapus.', 'success');
      fetchProducts();
    } else {
      showToast(res.message || 'Gagal menghapus produk.', 'error');
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'SKU', 'Barcode', 'Nama Produk', 'Kategori', 'Satuan', 'Harga Beli', 'Harga Jual', 'Harga Grosir', 'Stok', 'Min Stok', 'Lokasi Rak', 'Status'];
    const rows = products.map((p) => [
      p.id,
      p.sku,
      p.barcode,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.categoryName || ''}"`,
      p.unitCode || '',
      p.purchasePrice || 0,
      p.sellingPrice,
      p.wholesalePrice,
      p.stock,
      p.minStock,
      `"${p.locationRack || ''}"`,
      p.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `produk_kasirpro_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleProcessImport = async () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      const res = await apiRequest('/products/import', {
        method: 'POST',
        body: JSON.stringify({ products: items }),
      });

      if (res.success) {
        alert(res.message);
        setIsImportOpen(false);
        setImportJsonText('');
        fetchProducts();
      } else {
        alert(res.message || 'Gagal mengimpor data.');
      }
    } catch {
      alert('Format JSON tidak valid. Pastikan format array object JSON yang benar.');
    }
  };

  const printLabelSheet = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow || !labelProduct) return;

    const stickers = Array.from({ length: labelCopies }).map(
      () => `
      <div style="border: 1px dashed #666; padding: 6px; text-align: center; font-family: sans-serif; width: 140px; margin: 4px; display: inline-block; page-break-inside: avoid;">
        <div style="font-size: 9px; font-weight: bold; text-transform: uppercase;">TOKO BERKAH JAYA</div>
        <div style="font-size: 11px; font-weight: bold; margin: 2px 0; overflow: hidden; height: 26px;">${labelProduct.name}</div>
        <div style="font-family: monospace; font-size: 18px; font-weight: 900; letter-spacing: 2px;">||| | || ||||</div>
        <div style="font-size: 9px; font-family: monospace;">${labelProduct.barcode}</div>
        <div style="font-size: 13px; font-weight: 900; color: #000; margin-top: 2px;">${formatRupiah(labelProduct.sellingPrice)}</div>
      </div>
    `
    );

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Label Barcode - ${labelProduct.sku}</title>
          <style>
            @page { margin: 10mm; }
            body { font-family: sans-serif; margin: 0; }
          </style>
        </head>
        <body>
          <div style="display: flex; flex-wrap: wrap;">
            ${stickers.join('')}
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const isKasir = user?.roleCode === 'kasir';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-mandiri-orange rounded-full inline-block"></span>
            <Package className="w-6 h-6 text-mandiri-navy" />
            <span>Master Data Produk</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola katalog barang, barcode, harga jual & grosir, serta status persediaan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('product.create') && (
            <>
              <button
                onClick={() => setIsImportOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                <Upload className="w-4 h-4" />
                <span>Import JSON</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-4 py-2 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl text-xs font-bold shadow-md shadow-mandiri-navy/30 border-b-2 border-mandiri-gold transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-mandiri-gold" />
                <span>Tambah Produk</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
            placeholder="Cari berdasarkan Nama, Barcode, atau SKU..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-mandiri-navy focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-mandiri-navy"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStockStatus}
            onChange={(e) => setSelectedStockStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-mandiri-navy"
          >
            <option value="all">Semua Status Stok</option>
            <option value="safe">Stok Aman</option>
            <option value="low">Stok Menipis</option>
            <option value="out">Stok Habis</option>
          </select>

          <button
            onClick={fetchProducts}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3">SKU & Barcode</th>
                <th className="px-4 py-3">Kategori</th>
                {!isKasir && <th className="px-4 py-3 text-right">Harga Pokok (HPP)</th>}
                <th className="px-4 py-3 text-right">Harga Jual</th>
                <th className="px-4 py-3 text-center">Stok</th>
                <th className="px-4 py-3">Lokasi / Rak</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada produk yang sesuai dengan kriteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.stock > 0 && p.stock <= p.minStock;
                  const isOut = p.stock <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        <div>{p.name}</div>
                        {p.minWholesaleQty > 0 && (
                          <div className="text-[10px] text-purple-600 font-normal">
                            Grosir {formatRupiah(p.wholesalePrice)} (min {p.minWholesaleQty} {p.unitCode})
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                        <div>{p.sku}</div>
                        <div className="text-[10px] text-slate-400">{p.barcode}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.categoryName}</td>
                      {!isKasir && (
                        <td className="px-4 py-3 text-right font-medium text-slate-600">
                          {formatRupiah(p.avgCost || p.purchasePrice)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right font-bold text-mandiri-navy">
                        {formatRupiah(p.sellingPrice)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            isOut
                              ? 'bg-rose-100 text-rose-700'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-50 text-mandiri-navy border border-blue-200'
                          }`}
                        >
                          {p.stock} {p.unitCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.locationRack || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            p.status === 'active'
                              ? 'bg-blue-50 text-mandiri-navy border border-blue-200'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {p.status === 'active' ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setLabelProduct(p)}
                            className="p-1 text-slate-500 hover:text-mandiri-navy hover:bg-blue-50 rounded-lg transition"
                            title="Cetak Barcode & Label Harga"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {hasPermission('product.edit') && (
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit Produk"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('product.delete') && (
                            <button
                              onClick={() => handleDeleteProduct(p)}
                              className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Hapus / Nonaktifkan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD / EDIT PRODUCT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in my-6">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <span className="font-extrabold text-base">
                {editingProduct ? 'Edit Informasi Produk' : 'Tambah Produk Baru'}
              </span>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">SKU Produk *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-mandiri-navy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Barcode *</label>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-mandiri-navy"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Nama Produk *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Beras Pandan Wangi 5 Kg"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-mandiri-navy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Kategori *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-mandiri-navy"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Satuan *</label>
                  <select
                    value={formData.unitId}
                    onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-mandiri-navy"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Harga Beli / Pokok</label>
                  <input
                    type="number"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-mandiri-navy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Harga Jual Eceran *</label>
                  <input
                    type="number"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-mandiri-navy outline-none focus:ring-2 focus:ring-mandiri-navy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Harga Grosir</label>
                  <input
                    type="number"
                    value={formData.wholesalePrice}
                    onChange={(e) => setFormData({ ...formData, wholesalePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-mandiri-navy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Min Beli Grosir (Qty)</label>
                  <input
                    type="number"
                    value={formData.minWholesaleQty}
                    onChange={(e) => setFormData({ ...formData, minWholesaleQty: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-mandiri-navy"
                  />
                </div>

                {!editingProduct && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Stok Awal</label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-mandiri-navy"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Minimum Stok (Peringatan)</label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-mandiri-navy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Lokasi / Rak Barang</label>
                  <input
                    type="text"
                    value={formData.locationRack}
                    onChange={(e) => setFormData({ ...formData, locationRack: e.target.value })}
                    placeholder="Contoh: Rak B-02"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-mandiri-navy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Supplier Utama</label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-mandiri-navy"
                  >
                    <option value="">Tanpa Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl text-xs font-bold shadow-md shadow-mandiri-navy/30 border-b-2 border-mandiri-gold transition cursor-pointer"
                >
                  {editingProduct ? 'Perbarui Produk' : 'Simpan Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PRINT BARCODE LABEL MODAL --- */}
      {labelProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <span className="font-bold text-sm">Cetak Barcode & Label Harga</span>
              <button onClick={() => setLabelProduct(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-xs text-slate-600">
                Produk: <strong>{labelProduct.name}</strong>
                <br />
                Harga: <strong>{formatRupiah(labelProduct.sellingPrice)}</strong>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Jumlah Lembar Stiker
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={labelCopies}
                  onChange={(e) => setLabelCopies(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setLabelProduct(null)}
                  className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Tutup
                </button>
                <button
                  onClick={printLabelSheet}
                  className="px-4 py-2 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl text-xs font-bold shadow-md shadow-mandiri-navy/30 border-b-2 border-mandiri-gold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-mandiri-gold" />
                  <span>Cetak Label</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- IMPORT JSON MODAL --- */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <span className="font-bold text-sm">Import Massal Produk (JSON)</span>
              <button onClick={() => setIsImportOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500">
                Tempelkan array object JSON produk (format: sku, barcode, name, sellingPrice, stock, minStock).
              </p>

              <textarea
                rows={8}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='[{"sku": "BRG-01", "barcode": "899001", "name": "Sabun Cuci", "sellingPrice": 5000, "stock": 20}]'
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-mandiri-navy"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsImportOpen(false)}
                  className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleProcessImport}
                  className="px-4 py-2 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl text-xs font-bold shadow-md shadow-mandiri-navy/30 border-b-2 border-mandiri-gold transition cursor-pointer"
                >
                  Proses Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
