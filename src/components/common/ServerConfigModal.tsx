import React, { useState, useEffect } from 'react';
import {
  Server,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  HelpCircle,
  Smartphone,
  Laptop,
} from 'lucide-react';
import {
  getRawServerUrl,
  setCustomApiUrl,
  testServerConnection,
} from '../../lib/api.ts';

interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [serverUrl, setServerUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    engine?: string;
  }>({
    tested: false,
    success: false,
    message: '',
  });

  useEffect(() => {
    if (isOpen) {
      const current = getRawServerUrl();
      setServerUrl(current || (typeof window !== 'undefined' ? window.location.origin : ''));
      setTestResult({ tested: false, success: false, message: '' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult({ tested: false, success: false, message: '' });

    const res = await testServerConnection(serverUrl);
    setTesting(false);
    setTestResult({
      tested: true,
      success: res.success,
      message: res.message,
      engine: res.data?.engine,
    });
  };

  const handleSave = () => {
    setCustomApiUrl(serverUrl);
    if (onSuccess) onSuccess();
    onClose();
    // Reload if needed to reset queries cleanly
    window.location.reload();
  };

  const handleReset = () => {
    setServerUrl(window.location.origin);
    setCustomApiUrl('');
    setTestResult({
      tested: true,
      success: true,
      message: 'URL dikembalikan ke host default.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-mandiri-navy to-[#002b5e] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl border border-mandiri-gold/40">
              <Server className="w-5 h-5 text-mandiri-gold" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Pengaturan Server Host</h3>
              <p className="text-xs text-slate-300">Koneksi Android APK ke PC Server & Database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-slate-800 text-sm overflow-y-auto max-h-[80vh]">
          {/* Architecture diagram mini card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-mandiri-navy" />
              <span>Arsitektur Jaringan Toko</span>
            </div>
            <div className="text-xs text-slate-600 leading-relaxed">
              Aplikasi Android KasirPro terhubung ke <strong>Node.js Server KasirPro di PC Toko</strong> melalui jaringan Wi-Fi lokal, lalu PC server membaca & menyimpan transaksi langsung ke <strong>Database MySQL</strong>.
            </div>
            <div className="flex items-center justify-between text-[11px] font-semibold bg-white p-2 rounded-lg border border-slate-200 text-slate-700">
              <span className="flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-blue-600" /> HP Android
              </span>
              <span className="text-slate-400">➔ Wi-Fi ➔</span>
              <span className="flex items-center gap-1">
                <Laptop className="w-3.5 h-3.5 text-emerald-600" /> PC Server (:3000)
              </span>
              <span className="text-slate-400">➔ TCP ➔</span>
              <span className="flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-amber-600" /> MySQL (:3306)
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Alamat IP Server KasirPro (PC Lokal / Cloud)
            </label>
            <div className="relative">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="Contoh: http://192.168.1.15:3000"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-mandiri-navy focus:bg-white outline-none transition"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              Ketikkan <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">ipconfig</code> di CMD laptop/PC server untuk melihat IPv4 (misal: 192.168.1.X).
            </p>
          </div>

          {/* Test connection result box */}
          {testResult.tested && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold">{testResult.message}</div>
                {testResult.engine && (
                  <div className="text-[11px] font-mono text-emerald-700">
                    Engine Database: {testResult.engine}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Buttons: Test & Reset */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !serverUrl}
              className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Menguji Sambungan...' : 'Uji Koneksi Server'}</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition"
            >
              Reset Default
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl text-xs font-bold shadow-md shadow-mandiri-navy/30 border-b-2 border-mandiri-gold transition"
          >
            Simpan & Terapkan
          </button>
        </div>
      </div>
    </div>
  );
};
