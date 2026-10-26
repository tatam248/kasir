import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Save,
  Download,
  Server,
  FileCode,
  HardDrive,
  Info,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Store,
  Receipt,
  Layers,
  SlidersHorizontal,
  Printer,
  Volume2,
  ShieldCheck,
  Hash,
  Coins,
  Percent,
  Sparkles,
  RotateCcw,
  Smartphone,
  Wifi,
  ExternalLink,
  Laptop,
  RefreshCw,
} from 'lucide-react';
import { apiRequest, getRawServerUrl, setCustomApiUrl, testServerConnection } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';

export const SettingsView: React.FC = () => {
  const { storeSettings, refreshSettings, user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'store' | 'app' | 'backup' | 'guide' | 'android'>('store');
  const [androidServerUrl, setAndroidServerUrl] = useState('');
  const [testingAndroidServer, setTestingAndroidServer] = useState(false);
  const [androidServerResult, setAndroidServerResult] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    storeName: '',
    address: '',
    phone: '',
    whatsapp: '',
    email: '',
    taxIdNpwp: '',
    receiptFooter: '',
    currencySymbol: 'Rp',
    invoicePrefix: 'INV',
    defaultTaxRate: 0,
    defaultMinStock: 5,
    receiptPaperSize: '58mm',
    autoPrintReceipt: true,
    enableSoundEffects: true,
    maxDiscountWithoutPin: 10,
  });

  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [checkingDb, setCheckingDb] = useState(false);
  const [syncingDb, setSyncingDb] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchDbStatus = async () => {
    setCheckingDb(true);
    try {
      const res = await apiRequest('/settings/db-status');
      if (res.success) {
        setDbStatus(res);
      }
    } catch {
      //
    } finally {
      setCheckingDb(false);
    }
  };

  const handleSyncDb = async () => {
    setSyncingDb(true);
    try {
      const res = await apiRequest('/settings/sync-mysql', { method: 'POST' });
      if (res.success) {
        showToast(res.message || 'Berhasil sinkronisasi seluruh data ke MySQL.', 'success');
        await fetchDbStatus();
      } else {
        showToast(res.message || 'Gagal sinkronisasi data ke MySQL.', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSyncingDb(false);
    }
  };

  useEffect(() => {
    fetchDbStatus();
  }, [activeTab]);

  useEffect(() => {
    if (storeSettings) {
      setFormData({
        storeName: storeSettings.storeName || '',
        address: storeSettings.address || '',
        phone: storeSettings.phone || '',
        whatsapp: storeSettings.whatsapp || '',
        email: storeSettings.email || '',
        taxIdNpwp: storeSettings.taxIdNpwp || '',
        receiptFooter: storeSettings.receiptFooter || '',
        currencySymbol: storeSettings.currencySymbol || 'Rp',
        invoicePrefix: storeSettings.invoicePrefix || 'INV',
        defaultTaxRate: storeSettings.defaultTaxRate !== undefined ? storeSettings.defaultTaxRate : 0,
        defaultMinStock: storeSettings.defaultMinStock !== undefined ? storeSettings.defaultMinStock : 5,
        receiptPaperSize: storeSettings.receiptPaperSize || '58mm',
        autoPrintReceipt: storeSettings.autoPrintReceipt !== undefined ? storeSettings.autoPrintReceipt : true,
        enableSoundEffects: storeSettings.enableSoundEffects !== undefined ? storeSettings.enableSoundEffects : true,
        maxDiscountWithoutPin: storeSettings.maxDiscountWithoutPin !== undefined ? storeSettings.maxDiscountWithoutPin : 10,
      });
      setHasChanges(false);
    }
    fetchDiagnostics();
  }, [storeSettings]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
  };

  const handleReset = () => {
    if (storeSettings) {
      setFormData({
        storeName: storeSettings.storeName || '',
        address: storeSettings.address || '',
        phone: storeSettings.phone || '',
        whatsapp: storeSettings.whatsapp || '',
        email: storeSettings.email || '',
        taxIdNpwp: storeSettings.taxIdNpwp || '',
        receiptFooter: storeSettings.receiptFooter || '',
        currencySymbol: storeSettings.currencySymbol || 'Rp',
        invoicePrefix: storeSettings.invoicePrefix || 'INV',
        defaultTaxRate: storeSettings.defaultTaxRate !== undefined ? storeSettings.defaultTaxRate : 0,
        defaultMinStock: storeSettings.defaultMinStock !== undefined ? storeSettings.defaultMinStock : 5,
        receiptPaperSize: storeSettings.receiptPaperSize || '58mm',
        autoPrintReceipt: storeSettings.autoPrintReceipt !== undefined ? storeSettings.autoPrintReceipt : true,
        enableSoundEffects: storeSettings.enableSoundEffects !== undefined ? storeSettings.enableSoundEffects : true,
        maxDiscountWithoutPin: storeSettings.maxDiscountWithoutPin !== undefined ? storeSettings.maxDiscountWithoutPin : 10,
      });
      setHasChanges(false);
      showToast('Form pengaturan dikembalikan ke data tersimpan.', 'info');
    }
  };

  const fetchDiagnostics = async () => {
    const res = await apiRequest('/settings/diagnostics');
    if (res.success) setDiagnostics(res);
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);

    try {
      const res = await apiRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify(formData),
      });

      if (res.success) {
        const msg = res.message || 'Pengaturan berhasil disimpan ke database!';
        setSaveSuccessMessage(msg);
        showToast(msg, 'success');
        setHasChanges(false);
        await refreshSettings();
      } else {
        const errMsg = res.message || 'Gagal menyimpan pengaturan ke database.';
        setSaveErrorMessage(errMsg);
        showToast(errMsg, 'error');
      }
    } catch (err: any) {
      const errMsg = err.message || 'Terjadi kesalahan sistem saat menyimpan.';
      setSaveErrorMessage(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadSql = () => {
    showToast('Mengunduh backup MySQL .sql...', 'info');
    const link = document.createElement('a');
    link.href = '/api/settings/backup/sql';
    link.setAttribute('download', `kasirpro_backup_${new Date().toISOString().slice(0, 10)}.sql`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadJson = () => {
    showToast('Mengunduh backup JSON database...', 'info');
    const link = document.createElement('a');
    link.href = '/api/settings/backup/json';
    link.setAttribute('download', `kasirpro_database_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-mandiri-orange rounded-full inline-block"></span>
            <Settings className="w-6 h-6 text-mandiri-navy" />
            <span>Pengaturan Sistem & Toko</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Konfigurasi identitas toko, pengaturan aplikasi & POS, format struk, serta backup MySQL.
          </p>
        </div>

        {/* Header Save Button (Always active for store & app tabs) */}
        {(activeTab === 'store' || activeTab === 'app') && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {hasChanges && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[11px] font-bold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-mandiri-orange"></span>
                Ada perubahan belum disimpan
              </span>
            )}
            <button
              type="button"
              onClick={() => handleSaveSettings()}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-mandiri-navy hover:bg-mandiri-navy-dark active:scale-[0.99] text-white rounded-xl text-xs font-black shadow-md shadow-mandiri-navy/30 border-b-2 border-mandiri-gold disabled:opacity-50 transition cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-mandiri-gold" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-mandiri-gold" />
                  <span>{activeTab === 'app' ? 'Simpan Pengaturan Aplikasi' : 'Simpan Profil Toko'}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'store', label: 'Profil Toko & Struk', icon: Store },
          { id: 'app', label: 'Pengaturan Aplikasi & POS', icon: SlidersHorizontal },
          { id: 'backup', label: 'Backup & Database MySQL', icon: Database },
          { id: 'guide', label: 'Panduan XAMPP / MySQL', icon: Server },
          { id: 'android', label: 'Aplikasi Android APK', icon: Smartphone },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any);
                setSaveSuccessMessage(null);
                setSaveErrorMessage(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs border-b-2 transition -mb-[2px] cursor-pointer shrink-0 ${
                isActive
                  ? 'border-mandiri-navy text-mandiri-navy bg-blue-50/60 rounded-t-xl font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-mandiri-navy' : ''}`} />
              <span>{t.label}</span>
              {t.id === 'app' && hasChanges && (
                <span className="w-2 h-2 rounded-full bg-mandiri-orange"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Global Toast / Feedback inside Form */}
      {saveSuccessMessage && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-mandiri-navy rounded-xl text-xs flex items-center justify-between gap-2.5 shadow-xs">
          <div className="flex items-center gap-2.5 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-mandiri-navy shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMessage(null)}
            className="text-xs font-bold text-mandiri-orange hover:text-mandiri-orange-dark cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {saveErrorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-2.5 shadow-xs">
          <div className="flex items-center gap-2.5 font-semibold">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{saveErrorMessage}</span>
          </div>
          <button
            onClick={() => setSaveErrorMessage(null)}
            className="text-xs font-bold text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* ========================================================
          TAB 1: STORE PROFILE
      ======================================================== */}
      {activeTab === 'store' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Store className="w-5 h-5 text-mandiri-navy" />
                <span>Identitas & Profil Usaha</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Data toko yang akan ditampilkan di header faktur invoice, laporan keuangan, dan struk kasir.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Nama Toko / Usaha *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.storeName || ''}
                    onChange={(e) => handleInputChange('storeName', e.target.value)}
                    placeholder="Contoh: Toko Anda / Swalayan Sukses"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-mandiri-navy focus:bg-white transition"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Alamat Lengkap Toko
                  </label>
                  <textarea
                    rows={2}
                    value={formData.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Alamat fisik toko yang tercetak di struk nota..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-mandiri-navy focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Nomor Telepon Toko
                  </label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="021-78945612"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-mandiri-navy focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    WhatsApp Layanan Konsumen
                  </label>
                  <input
                    type="text"
                    value={formData.whatsapp || ''}
                    onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                    placeholder="081298765432"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-mandiri-navy focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Email Usaha
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="admin@tokoberkah.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-mandiri-navy focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    NPWP / NIB Toko
                  </label>
                  <input
                    type="text"
                    value={formData.taxIdNpwp || ''}
                    onChange={(e) => handleInputChange('taxIdNpwp', e.target.value)}
                    placeholder="01.234.567.8-901.000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-mandiri-navy focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Bottom Save Action Bar for Store */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {hasChanges && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-3 py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Batal / Reset</span>
                    </button>
                  )}
                  <div className="text-[11px] text-slate-400">
                    Data disimpan persisten di MySQL.
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-mandiri-navy hover:bg-mandiri-navy-dark active:scale-[0.99] text-white rounded-xl font-bold shadow-md shadow-mandiri-navy/30 border-b-2 border-mandiri-gold disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-mandiri-gold" />
                      <span>Menyimpan Pengaturan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-mandiri-gold" />
                      <span>Simpan Profil Toko</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Struk Header Preview Panel */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="font-bold text-xs uppercase text-slate-600 tracking-wider flex items-center gap-2">
              <Receipt className="w-4 h-4 text-mandiri-navy" />
              <span>Pratinjau Header Struk</span>
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Tampilan header cetak struk nota berdasarkan isian profil di samping:
            </p>

            <div className="bg-white p-4 rounded-xl border border-dashed border-slate-300 font-mono text-[11px] text-center space-y-1 text-slate-800 shadow-2xs">
              <div className="font-bold text-xs uppercase text-mandiri-navy">{formData.storeName || 'NAMA TOKO ANDA'}</div>
              <div className="text-[10px] text-slate-600">{formData.address || 'Alamat Toko Belum Diisi'}</div>
              <div className="text-[10px] text-slate-600">Telp: {formData.phone || '-'} | WA: {formData.whatsapp || '-'}</div>
              <div className="border-t border-dashed border-slate-300 my-2 pt-1 text-[10px] text-slate-400">
                === FAKTUR PENJUALAN ===
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: APPLICATION & POS SETTINGS (FORM PENGATURAN APLIKASI)
      ======================================================== */}
      {activeTab === 'app' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 max-w-4xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-mandiri-navy" />
                <span>Form Pengaturan Aplikasi & POS</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Konfigurasi nomor faktur kasir, simbol mata uang, printer struk thermal, pajak, dan otorisasi transaksi.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-mandiri-navy border border-blue-200">
                <span className="w-2 h-2 rounded-full bg-mandiri-gold"></span>
                Form Siap Digunakan
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
            {/* Section 1: Transaksi & Invoice */}
            <div className="space-y-4">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2 text-mandiri-navy">
                <Hash className="w-4 h-4 text-mandiri-orange" />
                <span>Format Transaksi & Nota Kasir</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Prefix Nomor Invoice *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.invoicePrefix || 'INV'}
                    onChange={(e) => handleInputChange('invoicePrefix', e.target.value.toUpperCase())}
                    placeholder="INV"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase outline-none focus:ring-2 focus:ring-mandiri-navy focus:bg-white transition"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Contoh nomor: <strong className="text-mandiri-navy font-mono">{formData.invoicePrefix || 'INV'}-20260929-0012</strong>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Simbol Mata Uang *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.currencySymbol || 'Rp'}
                    onChange={(e) => handleInputChange('currencySymbol', e.target.value)}
                    placeholder="Rp"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-mandiri-navy focus:bg-white transition"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Format tampilan: <strong className="text-mandiri-navy">{formData.currencySymbol || 'Rp'} 50.000</strong>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    PPN / Pajak Default Penjualan (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.defaultTaxRate !== undefined ? formData.defaultTaxRate : 0}
                    onChange={(e) => handleInputChange('defaultTaxRate', Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-mandiri-navy focus:bg-white transition"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Default 0% jika harga barang sudah termasuk pajak.
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Inventori & Stok */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2 text-mandiri-navy">
                <Layers className="w-4 h-4 text-mandiri-orange" />
                <span>Peringatan Stok & Inventori</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Batas Minimum Stok Default (Peringatan Stok Rendah)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.defaultMinStock !== undefined ? formData.defaultMinStock : 5}
                    onChange={(e) => handleInputChange('defaultMinStock', Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-mandiri-navy focus:bg-white transition"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Produk akan ditandai alert & warning di kasir saat stok sama atau di bawah angka ini.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Diskon Kasir Mandiri Maksimal (%) tanpa Supervisor PIN
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.maxDiscountWithoutPin !== undefined ? formData.maxDiscountWithoutPin : 10}
                    onChange={(e) => handleInputChange('maxDiscountWithoutPin', Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-mandiri-navy focus:bg-white transition"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Diskon di atas persentase ini mewajibkan input PIN Manager/Owner.
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Printer & Struk Kasir */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2 text-mandiri-navy">
                <Printer className="w-4 h-4 text-mandiri-orange" />
                <span>Printer Struk Kasir & Format Thermal</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
                    Ukuran Lebar Kertas Struk Thermal
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleInputChange('receiptPaperSize', '58mm')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                        formData.receiptPaperSize === '58mm'
                          ? 'border-mandiri-navy bg-blue-50 text-mandiri-navy ring-2 ring-mandiri-navy/20 font-bold'
                          : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-bold text-xs">58 mm (Mini)</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Printer Bluetooth / POS Portable</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInputChange('receiptPaperSize', '80mm')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                        formData.receiptPaperSize === '80mm'
                          ? 'border-mandiri-navy bg-blue-50 text-mandiri-navy ring-2 ring-mandiri-navy/20 font-bold'
                          : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-bold text-xs">80 mm (Standar)</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Printer Thermal Desktop / Kasir Supermarket</div>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Opsi Otomasi Kasir
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.autoPrintReceipt)}
                      onChange={(e) => handleInputChange('autoPrintReceipt', e.target.checked)}
                      className="w-4 h-4 text-mandiri-navy rounded focus:ring-mandiri-navy cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-800">Cetak Struk Otomatis</div>
                      <div className="text-[10px] text-slate-500">Tampilkan modal struk otomatis setelah pembayaran berhasil</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.enableSoundEffects)}
                      onChange={(e) => handleInputChange('enableSoundEffects', e.target.checked)}
                      className="w-4 h-4 text-mandiri-navy rounded focus:ring-mandiri-navy cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-800">Efek Suara Notifikasi (Beep)</div>
                      <div className="text-[10px] text-slate-500">Bunyi saat memindai barcode produk & transaksi kasir</div>
                    </div>
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Teks Pesan Footer Struk Kasir
                  </label>
                  <textarea
                    rows={3}
                    value={formData.receiptFooter || ''}
                    onChange={(e) => handleInputChange('receiptFooter', e.target.value)}
                    placeholder="Pesan terima kasih atau syarat penukaran barang yang dicetak di bagian bawah struk..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-mandiri-navy focus:bg-white transition"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Save Action Bar with ALWAYS-ENABLED SAVE BUTTON */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 -mx-6 -mb-6 p-6 rounded-b-2xl">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-mandiri-gold shrink-0"></span>
                <span className="text-xs text-slate-600 font-medium">
                  {hasChanges ? 'Perubahan konfigurasi siap disimpan ke database.' : 'Konfigurasi aplikasi tersinkronisasi.'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {hasChanges && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Kembalikan Default</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-7 py-3 bg-mandiri-navy hover:bg-mandiri-navy-dark active:scale-[0.99] text-white rounded-xl font-black shadow-lg shadow-mandiri-navy/30 border-b-2 border-mandiri-gold disabled:opacity-50 transition flex items-center justify-center gap-2.5 cursor-pointer text-xs uppercase tracking-wider"
                  title="Klik untuk menyimpan perubahan form pengaturan aplikasi"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-mandiri-gold" />
                      <span>Menyimpan Pengaturan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-mandiri-gold" />
                      <span>Simpan Pengaturan Aplikasi</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          TAB 3: BACKUP & DATABASE
      ======================================================== */}
      {activeTab === 'backup' && (
        <div className="space-y-6 max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-mandiri-navy border border-blue-100 flex items-center justify-center mb-3">
                  <FileCode className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-slate-800">Export MySQL Database (.sql)</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Unduh seluruh struktur data dan transaksi terkini dalam format SQL Dump yang kompatibel dengan
                  XAMPP, phpMyAdmin, dan MySQL 8.0.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadSql}
                className="mt-5 w-full py-2.5 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer border-b-2 border-mandiri-gold"
              >
                <Download className="w-4 h-4 text-mandiri-gold" />
                <span>Unduh File .sql</span>
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-mandiri-orange border border-orange-100 flex items-center justify-center mb-3">
                  <HardDrive className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-slate-800">Export Backup Lengkap (.json)</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Cadangkan seluruh database dalam format JSON terstruktur untuk arsip data aman atau migrasi cepat antar server.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadJson}
                className="mt-5 w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File .json</span>
              </button>
            </div>
          </div>

          {/* Database Diagnostics Info */}
          {diagnostics && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Server className="w-4 h-4 text-mandiri-navy" />
                <span>Statistik Tabel Database Relasional</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {Object.entries(diagnostics.tables || {}).map(([table, count]) => (
                  <div key={table} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">{table}</span>
                    <div className="text-base font-extrabold text-slate-800 mt-0.5">
                      {String(count)} baris
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 4: XAMPP GUIDE
      ======================================================== */}
      {activeTab === 'guide' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 max-w-4xl space-y-6 text-xs leading-relaxed text-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
              <span className="w-2.5 h-5 bg-mandiri-orange rounded-full inline-block"></span>
              <span>Panduan Lengkap Uji Aplikasi di PC / Laptop Lokal (XAMPP & MySQL)</span>
            </h2>
            <p className="text-slate-500">
              Ikuti langkah-langkah di bawah ini untuk menyiapkan database MySQL dan menguji aplikasi KasirPro secara lokal di PC/laptop Anda.
            </p>
          </div>

          {/* Live MySQL Database Status Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${dbStatus?.connected ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800">Status Koneksi Database MySQL</span>
                    {dbStatus?.connected ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Terhubung Aktif
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                        Penyimpanan Lokal (JSON)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {dbStatus?.connected
                      ? `Terhubung ke MySQL di ${dbStatus.config?.host}:${dbStatus.config?.port} | Database: ${dbStatus.config?.database}`
                      : dbStatus?.error || 'Koneksi ke MySQL belum aktif. Periksa XAMPP dan file .env Anda.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={fetchDbStatus}
                  disabled={checkingDb}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Cek koneksi MySQL sekarang"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${checkingDb ? 'animate-spin' : ''}`} />
                  <span>{checkingDb ? 'Memeriksa...' : 'Cek Koneksi'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncDb}
                  disabled={syncingDb}
                  className="px-3 py-1.5 bg-mandiri-navy hover:bg-mandiri-navy-light text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  title="Sinkronkan seluruh data (Pengguna, Toko, Produk) ke MySQL"
                >
                  {syncingDb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HardDrive className="w-3.5 h-3.5" />}
                  <span>{syncingDb ? 'Menyinkronkan...' : 'Sinkronkan ke MySQL'}</span>
                </button>
              </div>
            </div>

            {dbStatus?.connected && dbStatus?.counts && (
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Toko Tersimpan di MySQL</span>
                  <strong className="text-xs text-slate-800 font-bold truncate block">{dbStatus.counts.storeName || '-'}</strong>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Pengguna di MySQL</span>
                  <strong className="text-xs text-mandiri-navy font-bold">{dbStatus.counts.users} Akun</strong>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Produk di MySQL</span>
                  <strong className="text-xs text-emerald-700 font-bold">{dbStatus.counts.products} Item</strong>
                </div>
              </div>
            )}
          </div>

          {/* Quick Credential Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <span className="font-bold text-mandiri-navy block text-xs uppercase tracking-wider mb-1">
              Kredensial Default Administrator (Setelah Import Database):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-xs font-mono">
              <div className="bg-white p-2 rounded-lg border border-blue-100">
                <span className="text-[10px] text-slate-400 block font-sans">Username:</span>
                <strong className="text-mandiri-navy text-sm">admin</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-blue-100">
                <span className="text-[10px] text-slate-400 block font-sans">Password:</span>
                <strong className="text-mandiri-navy text-sm">admin123</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-blue-100">
                <span className="text-[10px] text-slate-400 block font-sans">PIN Supervisor:</span>
                <strong className="text-mandiri-navy text-sm">123456</strong>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 mt-2">
              * Seluruh akun staf lain (kasir, manager, gudang) serta nama toko dibuat murni melalui menu sistem dan disimpan ke database.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block text-sm mb-1">Langkah 1: Jalankan MySQL di XAMPP</span>
              <p>Buka <strong>XAMPP Control Panel</strong> di PC/laptop Anda, lalu klik tombol <strong>Start</strong> pada modul <strong>Apache</strong> dan <strong>MySQL</strong> (port default 3306).</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block text-sm mb-1">Langkah 2: Buat Database di phpMyAdmin</span>
              <p>
                Buka web browser dan akses <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono">http://localhost/phpmyadmin</code>. Buat database baru dengan nama{' '}
                <strong className="text-mandiri-navy font-mono">kasirpro_db</strong> (Collation: <code className="bg-slate-200 px-1 rounded font-mono">utf8mb4_unicode_ci</code>).
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block text-sm mb-1">Langkah 3: Import Schema & Initial Seed SQL</span>
              <p className="mb-2">
                Pilih database <code className="bg-slate-200 px-1 font-mono">kasirpro_db</code> di phpMyAdmin, buka tab <strong>Import</strong>, lalu unggah file:
              </p>
              <ol className="list-decimal pl-5 space-y-1 font-mono text-[11px] text-slate-800">
                <li><code className="bg-slate-200 px-1 rounded">database/schema.sql</code> (Struktur seluruh 27 tabel & relasi foreign key)</li>
                <li><code className="bg-slate-200 px-1 rounded">database/seeds/001_seed_initial.sql</code> (Role RBAC, hak akses, & akun admin tunggal)</li>
              </ol>
              <p className="mt-2 text-[11px] text-slate-500">
                Atau via Command Prompt / Terminal:
              </p>
              <pre className="p-2.5 bg-slate-900 text-mandiri-gold font-mono text-[11px] rounded-lg mt-1 overflow-x-auto">
{`mysql -u root -p kasirpro_db < database/schema.sql
mysql -u root -p kasirpro_db < database/seeds/001_seed_initial.sql`}
              </pre>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block text-sm mb-1">Langkah 4: Konfigurasi File Lingkungan (.env)</span>
              <p>
                Salin file <code className="bg-slate-200 px-1 rounded font-mono">.env.example</code> menjadi <code className="bg-slate-200 px-1 rounded font-mono">.env</code> di root folder proyek:
              </p>
              <pre className="p-3 bg-slate-900 text-mandiri-gold font-mono text-[11px] rounded-lg mt-2 overflow-x-auto">
{`PORT=3000
APP_URL=http://localhost:3000
JWT_SECRET=kasirpro_jwt_super_secret_production_key_2026

DB_ENGINE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=kasirpro_db`}
              </pre>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block text-sm mb-1">Langkah 5: Jalankan Aplikasi di Terminal / CMD</span>
              <p className="mb-2">Buka terminal di direktori proyek dan jalankan perintah berikut:</p>
              <pre className="p-3 bg-slate-900 text-mandiri-gold font-mono text-[11px] rounded-lg overflow-x-auto">
{`# 1. Install dependensi
npm install

# 2. Jalankan server lokal (Express + Vite)
npm run dev`}
              </pre>
              <p className="mt-2">
                Aplikasi siap diakses di: <strong className="text-mandiri-navy">http://localhost:3000</strong>
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block text-sm mb-1">Langkah 6: Login & Konfigurasi Awal Toko</span>
              <ul className="list-disc pl-5 space-y-1">
                <li>Buka form login, masukkan <strong>admin</strong> dan password <strong>admin123</strong>.</li>
                <li>Masuk ke menu <strong>Pengaturan & DB</strong> &gt; Tab <strong>Profil Toko & Struk</strong>: isi Nama Toko Anda, alamat, dan nomor telepon, lalu klik <strong>Simpan Profil Toko</strong>.</li>
                <li>Masuk ke menu <strong>Pengguna & RBAC</strong> untuk mendaftarkan akun kasir baru, manajer, atau staf gudang dengan hak akses yang dapat disesuaikan.</li>
                <li>Mulai buka kasir di menu <strong>Shift Kasir</strong> dan lakukan transaksi penjualan di menu <strong>Kasir (POS)</strong>.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Aplikasi Android APK */}
      {activeTab === 'android' && (
        <div className="space-y-6">
          {/* Card: Host Configuration */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-blue-50 text-mandiri-navy rounded-xl border border-mandiri-navy/20">
                <Smartphone className="w-6 h-6 text-mandiri-navy" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">Konfigurasi Host Server untuk Perangkat Android</h3>
                <p className="text-xs text-slate-500">
                  Tentukan alamat IP PC Server agar aplikasi KasirPro di HP/Tablet Android dapat terhubung langsung ke database MySQL Anda.
                </p>
              </div>
            </div>

            {/* Architecture Box */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs text-mandiri-gold font-bold uppercase tracking-wider">
                <span>Alur Komunikasi Data KasirPro Android</span>
                <span className="bg-mandiri-gold/20 text-mandiri-gold px-2 py-0.5 rounded text-[10px]">Arsitektur Standar POS</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                  <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                    <Smartphone className="w-4 h-4 text-blue-400" />
                    <span>1. APK Android (Klien)</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Kasir memasukkan barang, scan barcode, dan cetak struk via bluetooth printer dari tablet/HP.
                  </p>
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                  <div className="font-bold text-mandiri-gold flex items-center gap-1.5 mb-1">
                    <Laptop className="w-4 h-4 text-mandiri-gold" />
                    <span>2. PC Server Toko (:3000)</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Server Node.js / Express menerima request REST API dari HP lewat Wi-Fi lokal toko.
                  </p>
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>3. MySQL Database (:3306)</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Seluruh transaksi, stok opname, & user disimpan aman di database MySQL (kasirpro_db).
                  </p>
                </div>
              </div>
            </div>

            {/* Input & Test Connection */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Alamat IP PC Server Toko (Format: http://IP_PC:3000)
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={androidServerUrl || getRawServerUrl()}
                  onChange={(e) => setAndroidServerUrl(e.target.value)}
                  placeholder="Contoh: http://192.168.1.15:3000"
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:ring-2 focus:ring-mandiri-navy focus:bg-white outline-none"
                />
                <button
                  type="button"
                  onClick={async () => {
                    setTestingAndroidServer(true);
                    setAndroidServerResult(null);
                    const target = androidServerUrl || getRawServerUrl();
                    const res = await testServerConnection(target);
                    setTestingAndroidServer(false);
                    setAndroidServerResult(res);
                  }}
                  disabled={testingAndroidServer}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${testingAndroidServer ? 'animate-spin' : ''}`} />
                  <span>{testingAndroidServer ? 'Menguji...' : 'Uji Koneksi Server'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = androidServerUrl || getRawServerUrl();
                    setCustomApiUrl(target);
                    showToast('Alamat server host berhasil disimpan!', 'success');
                  }}
                  className="px-5 py-2.5 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl text-xs font-bold shadow-md border-b-2 border-mandiri-gold transition cursor-pointer"
                >
                  Simpan Host IP
                </button>
              </div>

              {androidServerResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                    androidServerResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {androidServerResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold">{androidServerResult.message}</div>
                    {androidServerResult.data?.engine && (
                      <div className="mt-1 font-mono text-[11px] text-emerald-700">
                        Status Database: {androidServerResult.data.engine}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card: Step by Step Android Build Guide */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <span className="w-2 h-5 bg-mandiri-orange rounded-full inline-block"></span>
              <span>Panduan Lengkap Membuat APK Android (Capacitor)</span>
            </h3>

            <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block text-sm mb-1">
                  Metode 1: Build APK Native Menggunakan Capacitor (Resmi & Disarankan)
                </span>
                <p className="mb-2">
                  Project KasirPro ini sudah dilengkapi dengan file konfigurasi <code className="bg-slate-200 px-1 rounded font-mono">capacitor.config.ts</code>. Anda hanya membutuhkan <strong>Node.js</strong> dan <strong>Android Studio</strong> di PC/laptop Anda.
                </p>
                <div className="space-y-2 mt-3 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-500 font-sans block font-semibold mb-1">1. Build bundle web produksi:</span>
                    <pre className="p-2.5 bg-slate-900 text-mandiri-gold rounded-lg">npm run build</pre>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans block font-semibold mb-1">2. Tambahkan platform Android:</span>
                    <pre className="p-2.5 bg-slate-900 text-mandiri-gold rounded-lg">npx cap add android</pre>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans block font-semibold mb-1">3. Sinkronisasi aset dan konfigurasi:</span>
                    <pre className="p-2.5 bg-slate-900 text-mandiri-gold rounded-lg">npx cap sync</pre>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans block font-semibold mb-1">4. Buka proyek di Android Studio:</span>
                    <pre className="p-2.5 bg-slate-900 text-mandiri-gold rounded-lg">npx cap open android</pre>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans block font-semibold mb-1">5. Generate file APK di Android Studio:</span>
                    <p className="font-sans text-slate-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-xs">
                      Di jendela Android Studio, klik menu bar atas: <strong>Build</strong> &gt; <strong>Build Bundle(s) / APK(s)</strong> &gt; <strong>Build APK(s)</strong>.<br />
                      Setelah selesai (kurang lebih 1-2 menit), klik link <strong>locate</strong> di notifikasi kanan bawah untuk mengambil file <code className="font-mono font-bold text-mandiri-navy">app-debug.apk</code>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block text-sm mb-1">
                  Metode 2: PWA Instan (Tanpa Install Android Studio)
                </span>
                <p className="mb-2">
                  Jika Anda ingin langsung menggunakan HP/Tablet Android kasir tanpa perlu menginstall Android Studio:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>Pastikan PC Server Anda dan HP/Tablet kasir terhubung ke jaringan Wi-Fi yang sama.</li>
                  <li>Buka browser Google Chrome di HP Android kasir.</li>
                  <li>Ketik alamat IP PC server Anda, contoh: <code className="bg-slate-200 px-1 rounded font-mono">http://192.168.1.15:3000</code></li>
                  <li>Tekan tombol menu titik tiga (⋮) di pojok kanan atas Chrome, lalu pilih <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> atau <strong>&quot;Install Aplikasi&quot;</strong>.</li>
                  <li>Ikon KasirPro akan muncul di layar utama Android dan berjalan dalam mode layar penuh (fullscreen) persis seperti aplikasi APK biasa!</li>
                </ol>
              </div>

              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                <span className="font-bold text-mandiri-navy block text-sm">
                  Penting: Mengatasi Kendala Firewall Windows
                </span>
                <p className="text-slate-700 text-xs leading-relaxed">
                  Jika HP Android tidak dapat terhubung ke IP PC server (gagal / timeout):
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 text-xs">
                  <li>Buka <strong>Windows Defender Firewall with Advanced Security</strong> di PC server.</li>
                  <li>Pilih <strong>Inbound Rules</strong> &gt; <strong>New Rule</strong> &gt; <strong>Port</strong> &gt; <strong>TCP</strong> &gt; Masukkan Port <strong>3000</strong>.</li>
                  <li>Pilih <strong>Allow the connection</strong> dan klik <strong>Next</strong> sampai selesai.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
