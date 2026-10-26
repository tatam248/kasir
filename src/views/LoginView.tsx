import React, { useState } from 'react';
import {
  Lock,
  User,
  AlertCircle,
  ShieldCheck,
  Database,
  CheckCircle2,
  Eye,
  EyeOff,
  Settings2,
  KeyRound,
  RotateCcw,
  Copy,
  Check,
  HelpCircle,
  X,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { ServerConfigModal } from '../components/common/ServerConfigModal.tsx';
import { Footer } from '../components/layout/Footer.tsx';
import { apiRequest, getRawServerUrl } from '../lib/api.ts';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const sqlQuery = `USE \`kasirpro_db\`;
UPDATE \`users\` 
SET \`password_hash\` = '$2a$10$123456789012345678901u./zCLeARnBuyfsw17qkjYMfd7L4o2om', 
    \`status\` = 'active', 
    \`failed_login_attempts\` = 0,
    \`updated_at\` = NOW()
WHERE \`username\` = 'admin';`;

  const cliCommand = `npm run reset-admin`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setError('Username dan password wajib diisi.');
      setSuccessMsg('');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    const res = await login(cleanUser, cleanPass);
    setLoading(false);

    if (!res.success) {
      setError(res.message || 'Login gagal.');
    }
  };

  const handleQuickResetAdmin = async () => {
    setResetLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await apiRequest('/auth/reset-admin-emergency', { method: 'POST' });
      if (res.success) {
        setUsername('admin');
        setPassword('admin123');
        setSuccessMsg('Akun admin berhasil dipulihkan! Password diset ke "admin123". Klik "Masuk Sekarang".');
      } else {
        setError(res.message || 'Gagal mereset admin.');
      }
    } catch (err: any) {
      setError('Gagal menghubungi server: ' + err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'sql' | 'cli') => {
    navigator.clipboard.writeText(text);
    if (type === 'sql') {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } else {
      setCopiedCli(true);
      setTimeout(() => setCopiedCli(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-mandiri-navy-dark to-[#001833] flex flex-col justify-between p-4">
      <div className="flex-1 flex items-center justify-center py-4">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-700/40">
          {/* Left Side: Brand & System Features */}
          <div className="bg-gradient-to-br from-mandiri-navy via-[#00224b] to-mandiri-navy-dark text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-mandiri-orange/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-mandiri-gold/15 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white text-mandiri-navy flex items-center justify-center font-black text-2xl shadow-xl border border-mandiri-gold/40">
                  K
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-wide leading-none">
                    KASIR<span className="text-mandiri-gold">PRO</span>
                  </h1>
                  <p className="text-xs text-amber-200/90 uppercase tracking-widest mt-1 font-semibold">
                    Point of Sale & Inventory
                  </p>
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-snug mb-3">
                Solusi Kasir & Pengelolaan Stok Terintegrasi
              </h2>
              <p className="text-slate-200/90 text-xs sm:text-sm leading-relaxed mb-6">
                Sistem kasir cepat, kartu stok multi-pergerakan, kalkulasi HPP Rata-rata Tertimbang, dan kontrol hak akses pengguna berbasis RBAC.
              </p>

              <div className="space-y-2.5 text-xs text-slate-200 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-mandiri-gold shrink-0" />
                  <span>Single Source of Truth dengan MySQL / Relasional</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-mandiri-gold shrink-0" />
                  <span>Stock Ledger (Kartu Stok) & Stock Opname</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-mandiri-gold shrink-0" />
                  <span>Cetak Struk Thermal 58mm & 80mm</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-mandiri-gold shrink-0" />
                  <span>Keamanan Sandi Enkripsi Bcrypt & Otorisasi PIN</span>
                </div>
              </div>
            </div>

            {/* Clean Security Info */}
            <div className="mt-8 pt-6 border-t border-slate-700/60 relative z-10 flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl border border-mandiri-gold/30">
                <ShieldCheck className="w-5 h-5 text-mandiri-gold" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-white">Autentikasi Terpusat</div>
                <div className="text-[11px] text-slate-300">
                  Akun pengguna dan role dikelola langsung dari database.
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Login Form */}
          <div className="p-8 sm:p-12 flex flex-col justify-center bg-white">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Masuk ke Sistem</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Gunakan kredensial akun kasir atau staf Anda untuk mulai bekerja.
              </p>
            </div>

            {error && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs sm:text-sm flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div>{error}</div>
                  <div className="mt-2 pt-2 border-t border-rose-200/80 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleQuickResetAdmin}
                      disabled={resetLoading}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <RotateCcw className={`w-3 h-3 ${resetLoading ? 'animate-spin' : ''}`} />
                      <span>{resetLoading ? 'Memulihkan...' : 'Pulihkan Akun Admin (1-Klik)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowHelpModal(true)}
                      className="text-xs text-rose-800 underline font-medium hover:text-rose-950 cursor-pointer"
                    >
                      Mengapa akun admin gagal di lokal?
                    </button>
                  </div>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username (contoh: admin)"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-mandiri-navy focus:bg-white outline-none transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Kata Sandi (Password)
                  </label>
                  <button
                    type="button"
                    onClick={handleQuickResetAdmin}
                    disabled={resetLoading}
                    className="text-[11px] text-mandiri-navy hover:text-mandiri-orange font-semibold flex items-center gap-1 transition cursor-pointer"
                    title="Otomatis isi dan pulihkan password admin ke default: admin123"
                  >
                    <KeyRound className="w-3 h-3 text-mandiri-orange" />
                    <span>Reset ke admin123</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi (contoh: admin123)"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-mandiri-navy focus:bg-white outline-none transition"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
                    title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-mandiri-navy hover:bg-mandiri-navy-dark active:scale-[0.99] text-white rounded-xl text-sm font-bold shadow-lg shadow-mandiri-navy/30 border-b-2 border-mandiri-gold disabled:opacity-50 transition duration-150 mt-2 cursor-pointer"
              >
                {loading ? 'Memeriksa Kredensial...' : 'Masuk Sekarang'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <button
                type="button"
                onClick={() => setShowServerModal(true)}
                className="flex items-center gap-1.5 text-slate-500 hover:text-mandiri-navy font-medium transition cursor-pointer group"
                title="Atur IP Server PC Lokal / Host"
              >
                <Settings2 className="w-3.5 h-3.5 text-mandiri-navy group-hover:rotate-45 transition-transform" />
                <span>Pengaturan Server {getRawServerUrl() ? `(${getRawServerUrl().replace(/^https?:\/\//, '')})` : ''}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="flex items-center gap-1 text-slate-500 hover:text-mandiri-orange font-medium transition cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-mandiri-orange" />
                <span>Bantuan Admin Lokal</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer variant="dark" />

      <ServerConfigModal
        isOpen={showServerModal}
        onClose={() => setShowServerModal(false)}
      />

      {/* Emergency Admin Local Recovery Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-gradient-to-r from-mandiri-navy to-mandiri-navy-dark text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-mandiri-gold" />
                <h3 className="font-bold text-base">Panduan Reset Kredensial Admin di Lokal</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-600">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                <p className="font-bold mb-1 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  Kenapa password "admin123" dinyatakan salah terus di MySQL lokal?
                </p>
                <p className="text-xs leading-relaxed text-amber-800">
                  Sistem KasirPro menggunakan algoritma keamanan <strong>Bcrypt</strong>. Jika Anda mengubah password secara manual di phpMyAdmin dengan mengetik kata <code>admin123</code> biasa (plain text) atau memilih MD5, sistem akan <strong>menolak</strong> karena format hash-nya tidak sesuai. Selain itu, database lokal Anda mungkin masih menyimpan tabel dari dump SQL awal yang belum terupdate.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Solusi 1: Pemulihan Otomatis 1-Klik (Paling Mudah)
                </h4>
                <p className="text-xs text-slate-500 mb-2">
                  Cukup klik tombol di bawah ini. Server akan otomatis memformat ulang hash Bcrypt admin ke <code>admin123</code> dan menyimpannya ke MySQL lokal:
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await handleQuickResetAdmin();
                    setShowHelpModal(false);
                  }}
                  disabled={resetLoading}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  <RotateCcw className={`w-4 h-4 ${resetLoading ? 'animate-spin' : ''}`} />
                  <span>{resetLoading ? 'Sedang Memproses...' : 'Pulihkan Akun Admin Sekarang (admin / admin123)'}</span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-mandiri-navy" />
                  Solusi 2: Jalankan Query di phpMyAdmin (Tab SQL)
                </h4>
                <p className="text-xs text-slate-500 mb-2">
                  Buka phpMyAdmin (<code>http://localhost/phpmyadmin</code>) &gt; pilih database <code>kasirpro_db</code> &gt; klik tab <strong>SQL</strong> &gt; salin dan jalankan query berikut:
                </p>
                <div className="relative">
                  <pre className="p-3 bg-slate-900 text-amber-300 rounded-xl text-[11px] font-mono overflow-x-auto whitespace-pre leading-relaxed border border-slate-800">
                    {sqlQuery}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(sqlQuery, 'sql')}
                    className="absolute top-2 right-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-medium flex items-center gap-1 border border-slate-700 transition cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'Tersalin!' : 'Salin SQL'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-slate-700" />
                  Solusi 3: Perintah Terminal Node.js
                </h4>
                <p className="text-xs text-slate-500 mb-2">
                  Jalankan perintah berikut di folder proyek KasirPro Anda:
                </p>
                <div className="relative">
                  <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono border border-slate-800">
                    {cliCommand}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(cliCommand, 'cli')}
                    className="absolute top-2 right-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-medium flex items-center gap-1 border border-slate-700 transition cursor-pointer"
                  >
                    {copiedCli ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCli ? 'Tersalin!' : 'Salin'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
