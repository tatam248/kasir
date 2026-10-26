import React, { useState, useEffect } from 'react';
import { Users, Plus, Phone, Award, CreditCard, Edit2, X, Star } from 'lucide-react';
import { Customer } from '../types/index.ts';
import { apiRequest, formatRupiah } from '../lib/api.ts';

export const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCust, setEditingCust] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<any>({
    name: '',
    phone: '',
    whatsapp: '',
    address: '',
    customerType: 'umum',
    creditLimit: 0,
    notes: '',
  });

  const fetchCustomers = async () => {
    const res = await apiRequest('/customers');
    if (res.success) setCustomers(res.customers || []);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenAdd = () => {
    setEditingCust(null);
    setFormData({
      name: '',
      phone: '',
      whatsapp: '',
      address: '',
      customerType: 'member',
      creditLimit: 1000000,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCust(c);
    setFormData(c);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!editingCust;
    const url = isEdit ? `/customers/${editingCust.id}` : '/customers';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await apiRequest(url, {
      method,
      body: JSON.stringify(formData),
    });

    if (res.success) {
      alert(res.message);
      setIsModalOpen(false);
      fetchCustomers();
    } else {
      alert(res.message || 'Gagal menyimpan pelanggan.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-mandiri-orange rounded-full inline-block"></span>
            <Users className="w-6 h-6 text-mandiri-navy" />
            <span>Master Data Pelanggan & Member</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola tipe pelanggan (Umum, Member, Grosir), saldo piutang, limit kredit, dan poin loyalitas.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl text-xs font-bold shadow-md shadow-mandiri-navy/30 border-b-2 border-mandiri-gold transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-mandiri-gold" />
          <span>Tambah Pelanggan</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((c) => (
          <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">{c.code}</span>
                <h3 className="font-bold text-sm text-slate-900 mt-0.5">{c.name}</h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                  c.customerType === 'grosir'
                    ? 'bg-purple-100 text-purple-700'
                    : c.customerType === 'member'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {c.customerType}
              </span>
            </div>

            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{c.phone || c.whatsapp || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Poin Loyalitas: {c.loyaltyPoints || 0} Poin</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Limit Kredit:</span>
                <span className="font-bold text-slate-700">{formatRupiah(c.creditLimit)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Sisa Piutang:</span>
                <span className="font-extrabold text-purple-700">{formatRupiah(c.receivableBalance)}</span>
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                onClick={() => handleOpenEdit(c)}
                className="text-[11px] text-slate-500 hover:text-mandiri-navy font-bold flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit Pelanggan</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <span className="font-bold text-sm">
                {editingCust ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
              </span>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Toko Bu Siti"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">No. HP / WA</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Tipe Pelanggan</label>
                  <select
                    value={formData.customerType}
                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-semibold"
                  >
                    <option value="umum">Umum</option>
                    <option value="member">Member VIP</option>
                    <option value="grosir">Grosir / Mitra</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Alamat</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Limit Kredit (Rp)</label>
                <input
                  type="number"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl font-bold shadow-md shadow-mandiri-navy/30 border-b-2 border-mandiri-gold transition cursor-pointer"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
