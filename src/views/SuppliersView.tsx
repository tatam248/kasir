import React, { useState, useEffect } from 'react';
import { Truck, Plus, Phone, Mail, MapPin, User, Edit2, X } from 'lucide-react';
import { Supplier } from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const SuppliersView: React.FC = () => {
  const { hasPermission } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSup, setEditingSup] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<any>({
    code: '',
    name: '',
    address: '',
    phone: '',
    whatsapp: '',
    email: '',
    picName: '',
    bankAccount: '',
    notes: '',
  });

  const fetchSuppliers = async () => {
    const res = await apiRequest('/suppliers');
    if (res.success) setSuppliers(res.suppliers || []);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleOpenAdd = () => {
    setEditingSup(null);
    setFormData({
      code: `SUP-${String(suppliers.length + 1).padStart(3, '0')}`,
      name: '',
      address: '',
      phone: '',
      whatsapp: '',
      email: '',
      picName: '',
      bankAccount: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSup(s);
    setFormData(s);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!editingSup;
    const url = isEdit ? `/suppliers/${editingSup.id}` : '/suppliers';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await apiRequest(url, {
      method,
      body: JSON.stringify(formData),
    });

    if (res.success) {
      alert(res.message);
      setIsModalOpen(false);
      fetchSuppliers();
    } else {
      alert(res.message || 'Gagal menyimpan supplier.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-mandiri-orange rounded-full inline-block"></span>
            <Truck className="w-6 h-6 text-mandiri-navy" />
            <span>Master Data Supplier</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Daftar distributor rekanan, kontak PIC, dan rekening pembayaran.
          </p>
        </div>

        {hasPermission('purchase.create') && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl text-xs font-bold shadow-md shadow-mandiri-navy/30 border-b-2 border-mandiri-gold transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-mandiri-gold" />
            <span>Tambah Supplier</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map((s) => (
          <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">{s.code}</span>
                <h3 className="font-bold text-sm text-slate-900 mt-0.5">{s.name}</h3>
              </div>
              <button
                onClick={() => handleOpenEdit(s)}
                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>PIC: {s.picName || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{s.phone || s.whatsapp || '-'}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{s.address || '-'}</span>
              </div>
            </div>

            {s.bankAccount && (
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                Rek: {s.bankAccount}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <span className="font-bold text-sm">
                {editingSup ? 'Edit Data Supplier' : 'Tambah Supplier Baru'}
              </span>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Nama Supplier *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="PT Sumber Pangan"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Nama Kontak PIC</label>
                <input
                  type="text"
                  value={formData.picName}
                  onChange={(e) => setFormData({ ...formData, picName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">No. Telepon / WA</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Alamat Kantor/Gudang</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Rekening Pembayaran</label>
                <input
                  type="text"
                  value={formData.bankAccount}
                  onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                  placeholder="Contoh: BCA 1234567890 a/n PT Pangan"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-mono"
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
                  Simpan Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
