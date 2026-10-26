import React, { useState } from 'react';
import { ShieldCheck, X, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { apiRequest } from '../../lib/api.ts';

interface SupervisorPinModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  onSuccess: (pin: string, supervisor: any) => void;
  onCancel: () => void;
}

export const SupervisorPinModal: React.FC<SupervisorPinModalProps> = ({
  isOpen,
  title = 'Otorisasi Supervisor Diperlukan',
  description = 'Tindakan ini memerlukan verifikasi PIN Supervisor (Manager / Owner / Super Admin).',
  onSuccess,
  onCancel,
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setError('Masukkan 6-digit PIN Supervisor.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await apiRequest('/auth/verify-supervisor-pin', {
      method: 'POST',
      body: JSON.stringify({ pin, reason: description }),
    });

    setLoading(false);

    if (res.success && res.supervisor) {
      onSuccess(pin, res.supervisor);
      setPin('');
    } else {
      setError(res.message || 'PIN Supervisor salah atau tidak berwenang.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-amber-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <ShieldCheck className="w-6 h-6" />
            <span>{title}</span>
          </div>
          <button
            onClick={onCancel}
            className="text-white/80 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">{description}</p>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              PIN Supervisor (6 Angka)
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                maxLength={10}
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Contoh: 123456"
                className="w-full text-center tracking-widest text-2xl font-mono px-10 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none transition"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPin(!showPin)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
                title={showPin ? 'Sembunyikan PIN' : 'Lihat PIN'}
                aria-label={showPin ? 'Sembunyikan PIN' : 'Lihat PIN'}
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 text-center">
              (PIN Default Manager: 999999 / Superadmin: 123456)
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !pin}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-md disabled:opacity-50 transition"
            >
              {loading ? 'Memverifikasi...' : 'Konfirmasi Otorisasi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
