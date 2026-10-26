import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, Tag, Box, Check, X } from 'lucide-react';
import { Category, Brand, Unit } from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const MastersView: React.FC = () => {
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState<'categories' | 'brands' | 'units'>('categories');

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDesc, setFormDesc] = useState('');

  const fetchAll = async () => {
    const [cRes, bRes, uRes] = await Promise.all([
      apiRequest('/masters/categories'),
      apiRequest('/masters/brands'),
      apiRequest('/masters/units'),
    ]);
    if (cRes.success) setCategories(cRes.categories || []);
    if (bRes.success) setBrands(bRes.brands || []);
    if (uRes.success) setUnits(uRes.units || []);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormName('');
    setFormCode('');
    setFormDesc('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormName(item.name || '');
    setFormCode(item.code || '');
    setFormDesc(item.description || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!editingItem;
    let endpoint = '';
    let body: any = {};

    if (tab === 'categories') {
      endpoint = isEdit ? `/masters/categories/${editingItem.id}` : '/masters/categories';
      body = { code: formCode, name: formName, description: formDesc };
    } else if (tab === 'brands') {
      endpoint = isEdit ? `/masters/brands/${editingItem.id}` : '/masters/brands';
      body = { name: formName, description: formDesc };
    } else {
      endpoint = isEdit ? `/masters/units/${editingItem.id}` : '/masters/units';
      body = { code: formCode, name: formName };
    }

    const res = await apiRequest(endpoint, {
      method: isEdit ? 'PUT' : 'POST',
      body: JSON.stringify(body),
    });

    if (res.success) {
      alert(res.message);
      setIsModalOpen(false);
      fetchAll();
    } else {
      alert(res.message || 'Gagal menyimpan.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-mandiri-orange rounded-full inline-block"></span>
            <Layers className="w-6 h-6 text-mandiri-navy" />
            <span>Master Data Klasifikasi Produk</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pengelolaan Kategori, Merek, dan Satuan Unit Barang Retail.
          </p>
        </div>

        {hasPermission('product.create') && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl text-xs font-bold shadow-md shadow-mandiri-navy/30 border-b-2 border-mandiri-gold transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-mandiri-gold" />
            <span>
              Tambah {tab === 'categories' ? 'Kategori' : tab === 'brands' ? 'Merek' : 'Satuan'}
            </span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { id: 'categories', label: `Kategori (${categories.length})`, icon: Layers },
          { id: 'brands', label: `Merek (${brands.length})`, icon: Tag },
          { id: 'units', label: `Satuan (${units.length})`, icon: Box },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs border-b-2 transition -mb-[2px] cursor-pointer ${
                isActive
                  ? 'border-mandiri-navy text-mandiri-navy bg-blue-50/60 rounded-t-xl font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-mandiri-navy' : ''}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Nama</th>
              {tab !== 'brands' && <th className="px-4 py-3">Kode</th>}
              {tab !== 'units' && <th className="px-4 py-3">Keterangan</th>}
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tab === 'categories' &&
              categories.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-semibold text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{c.code}</td>
                  <td className="px-4 py-3 text-slate-500">{c.description || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-mandiri-navy border border-blue-200 font-bold text-[10px]">
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-1 text-slate-500 hover:text-blue-600 rounded-lg cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

            {tab === 'brands' &&
              brands.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-semibold text-slate-800">{b.name}</td>
                  <td className="px-4 py-3 text-slate-500">{b.description || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-mandiri-navy border border-blue-200 font-bold text-[10px]">
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleOpenEdit(b)}
                      className="p-1 text-slate-500 hover:text-blue-600 rounded-lg cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

            {tab === 'units' &&
              units.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-semibold text-slate-800">{u.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-600 font-bold">{u.code}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-mandiri-navy border border-blue-200 font-bold text-[10px]">
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="p-1 text-slate-500 hover:text-blue-600 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* --- ADD/EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <span className="font-bold text-sm">
                {editingItem ? 'Edit' : 'Tambah'}{' '}
                {tab === 'categories' ? 'Kategori' : tab === 'brands' ? 'Merek' : 'Satuan'}
              </span>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3">
              {tab !== 'brands' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Kode *</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="Contoh: SEMBAKO / PCS"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase outline-none focus:ring-2 focus:ring-mandiri-navy"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Nama *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Sembako & Beras"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-mandiri-navy"
                />
              </div>

              {tab !== 'units' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Keterangan</label>
                  <input
                    type="text"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Deskripsi singkat"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-mandiri-navy"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl text-xs font-bold shadow-md shadow-mandiri-navy/30 border-b-2 border-mandiri-gold transition cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
