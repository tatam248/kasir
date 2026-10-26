import React, { useState, useEffect } from 'react';
import {
  UserCog,
  Plus,
  Key,
  Shield,
  Check,
  X,
  Lock,
  UserCheck,
  UserX,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [rolePerms, setRolePerms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // New User Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [newSupervisorPin, setNewSupervisorPin] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);

  // Reset Password Modal
  const [resetTargetUser, setResetTargetUser] = useState<any>(null);
  const [resetNewPass, setResetNewPass] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [uRes, rRes] = await Promise.all([
      apiRequest('/users'),
      apiRequest('/users/roles/all'),
    ]);
    if (uRes.success) setUsers(uRes.users || []);
    if (rRes.success) {
      setRoles(rRes.roles || []);
      setAvailablePermissions(rRes.availablePermissions || []);
      if (rRes.roles?.length > 0 && !selectedRole) {
        setSelectedRole(rRes.roles[0]);
        setRolePerms(rRes.roles[0].permissions || []);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectRole = (r: any) => {
    setSelectedRole(r);
    setRolePerms(r.permissions || []);
  };

  const togglePermission = (code: string) => {
    if (rolePerms.includes(code)) {
      setRolePerms(rolePerms.filter((p) => p !== code));
    } else {
      setRolePerms([...rolePerms, code]);
    }
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return;
    const res = await apiRequest(`/users/roles/${selectedRole.id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions: rolePerms }),
    });

    if (res.success) {
      alert(res.message);
      fetchData();
    } else {
      alert(res.message || 'Gagal menyimpan permission.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify({
        username: newUsername,
        name: newName,
        email: newEmail,
        password: newPassword,
        roleId: newRoleId || roles[0]?.id,
        supervisorPin: newSupervisorPin || null,
      }),
    });

    if (res.success) {
      alert(res.message);
      setIsAddOpen(false);
      fetchData();
    } else {
      alert(res.message || 'Gagal membuat pengguna.');
    }
  };

  const handleToggleStatus = async (u: any) => {
    const nextStatus = u.status === 'active' ? 'inactive' : 'active';
    const res = await apiRequest(`/users/${u.id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: nextStatus }),
    });

    if (res.success) {
      fetchData();
    } else {
      alert(res.message || 'Gagal mengubah status.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;

    const res = await apiRequest(`/users/${resetTargetUser.id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword: resetNewPass }),
    });

    if (res.success) {
      alert(res.message);
      setResetTargetUser(null);
    } else {
      alert(res.message || 'Gagal reset password.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <UserCog className="w-6 h-6 text-emerald-600" />
            <span>Manajemen Pengguna & Hak Akses (RBAC)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola akun staf kasir, supervisor, admin gudang, dan matriks izin permission granular.
          </p>
        </div>

        <button
          onClick={() => {
            setNewRoleId(roles[0]?.id || '');
            setIsAddOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Users Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-sm text-slate-800">Daftar Akun Pengguna</span>
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                {users.length} Akun
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Nama & Username</th>
                    <th className="px-4 py-3">Role Sistem</th>
                    <th className="px-4 py-3 text-center">PIN Supervisor</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{u.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">@{u.username}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 capitalize">
                          {u.roleName || u.roleCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        {u.hasSupervisorPin ? (
                          <span className="text-emerald-600 font-bold">●●●●●● (Aktif)</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] transition ${
                            u.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-rose-100 hover:text-rose-800'
                              : 'bg-rose-100 text-rose-800 hover:bg-emerald-100 hover:text-emerald-800'
                          }`}
                          title="Klik untuk ubah status aktif/nonaktif"
                        >
                          {u.status === 'active' ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setResetTargetUser(u)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[10px] flex items-center gap-1 mx-auto transition"
                          title="Reset Password Pengguna"
                        >
                          <Key className="w-3 h-3 text-amber-600" />
                          <span>Reset Sandi</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Role + Granular Permission Matrix */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div>
              <h2 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Matriks Izin Role (Permissions)</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Sesuaikan hak akses spesifik untuk setiap kelompok pengguna.
              </p>
            </div>

            {/* Role Buttons */}
            <div className="flex flex-wrap gap-1.5">
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelectRole(r)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedRole?.id === r.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>

            {/* Permission Checkboxes */}
            <div className="border border-slate-200 rounded-xl p-3 max-h-96 overflow-y-auto space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Daftar Permission untuk: {selectedRole?.name}
              </span>

              {availablePermissions.map((perm) => {
                const isChecked = rolePerms.includes(perm.code);
                const isSuperAdminRole = selectedRole?.code === 'super_admin';

                return (
                  <label
                    key={perm.id}
                    className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer text-xs transition ${
                      isChecked ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isSuperAdminRole}
                      onChange={() => togglePermission(perm.code)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800">{perm.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{perm.code}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <button
              onClick={handleSaveRolePermissions}
              disabled={selectedRole?.code === 'super_admin'}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 disabled:opacity-40 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan Izin Role</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- ADD USER MODAL --- */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <span className="font-bold text-sm">Tambah Pengguna Baru</span>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Contoh: kasir2"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Rina Anggraini"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="kasir@toko.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Password Awal *</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password awal"
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-mandiri-navy"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showNewPassword ? 'Sembunyikan password' : 'Lihat password'}
                    aria-label={showNewPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Role Jabatan *</label>
                <select
                  value={newRoleId}
                  onChange={(e) => setNewRoleId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-semibold"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  PIN Supervisor (Khusus Manager / Owner)
                </label>
                <div className="relative">
                  <input
                    type={showNewPin ? 'text' : 'password'}
                    maxLength={6}
                    value={newSupervisorPin}
                    onChange={(e) => setNewSupervisorPin(e.target.value)}
                    placeholder="6 angka (opsional)"
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-mono focus:ring-2 focus:ring-mandiri-navy"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showNewPin ? 'Sembunyikan PIN' : 'Lihat PIN'}
                    aria-label={showNewPin ? 'Sembunyikan PIN' : 'Lihat PIN'}
                  >
                    {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RESET PASSWORD MODAL --- */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <span className="font-bold text-sm">Reset Password (@{resetTargetUser.username})</span>
              <button onClick={() => setResetTargetUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Password Baru (min 6)</label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    value={resetNewPass}
                    onChange={(e) => setResetNewPass(e.target.value)}
                    placeholder="Masukkan password baru"
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-mandiri-navy"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showResetPassword ? 'Sembunyikan password' : 'Lihat password'}
                    aria-label={showResetPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md transition"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
