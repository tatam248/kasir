import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/store.ts';
import { mysqlService } from '../db/mysql.ts';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.ts';

const router = Router();

// GET /api/users
router.get('/', authenticate, requirePermission('user.manage'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const users = data.users
    .filter((u) => !u.deletedAt)
    .map((u) => {
      const role = db.getRoleById(u.roleId);
      return {
        id: u.id,
        username: u.username,
        name: u.name,
        email: u.email,
        roleId: u.roleId,
        roleCode: role?.code,
        roleName: role?.name,
        phone: u.phone,
        status: u.status,
        hasSupervisorPin: !!u.supervisorPin,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      };
    });

  return res.json({ success: true, users });
});

// POST /api/users
router.post('/', authenticate, requirePermission('user.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, name, email, password, roleId, phone, supervisorPin, status } = req.body;
    if (!username || !name || !password || !roleId) {
      return res.status(400).json({ success: false, message: 'Username, nama, password, dan role wajib diisi.' });
    }

    const data = db.getData();
    if (data.users.some((u) => u.username.toLowerCase() === username.toLowerCase() && !u.deletedAt)) {
      return res.status(400).json({ success: false, message: `Username '${username}' sudah digunakan.` });
    }

    const now = new Date().toISOString();
    const newUser = {
      id: `usr-${Date.now()}`,
      username: username.trim(),
      name: name.trim(),
      email: email ? email.trim() : null,
      passwordHash: bcrypt.hashSync(password, 10),
      roleId,
      phone: phone || null,
      supervisorPin: supervisorPin || null,
      status: status || 'active',
      failedLoginAttempts: 0,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };

    data.users.push(newUser);
    db.save();

    // Persist directly to MySQL
    await mysqlService.saveUser(newUser);

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'CREATE_USER',
      module: 'Pengguna',
      recordId: newUser.id,
      details: `Membuat akun baru ${newUser.name} (@${newUser.username}) dengan role ${roleId}.`,
      ipAddress: req.ip || null,
    });

    return res.status(201).json({ success: true, message: 'Pengguna berhasil ditambahkan dan disimpan ke database.', user: newUser });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', authenticate, requirePermission('user.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, roleId, phone, supervisorPin, status } = req.body;

    const data = db.getData();
    const user = data.users.find((u) => u.id === id && !u.deletedAt);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    const before = { ...user };

    if (name) user.name = name.trim();
    if (email !== undefined) user.email = email ? email.trim() : null;
    if (roleId) user.roleId = roleId;
    if (phone !== undefined) user.phone = phone;
    if (supervisorPin !== undefined) user.supervisorPin = supervisorPin;
    if (status) user.status = status;
    user.updatedAt = new Date().toISOString();

    db.save();

    // Persist directly to MySQL
    await mysqlService.saveUser(user);

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'UPDATE_USER',
      module: 'Pengguna',
      recordId: user.id,
      details: `Memperbarui data pengguna @${user.username}.`,
      dataBefore: before,
      dataAfter: user,
      ipAddress: req.ip || null,
    });

    return res.json({ success: true, message: 'Data pengguna berhasil diperbarui dan disimpan ke database.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users/:id/reset-password
router.post('/:id/reset-password', authenticate, requirePermission('user.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter.' });
    }

    const data = db.getData();
    const user = data.users.find((u) => u.id === id && !u.deletedAt);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    user.passwordHash = bcrypt.hashSync(newPassword, 10);
    user.failedLoginAttempts = 0;
    user.updatedAt = new Date().toISOString();
    db.save();

    // Persist directly to MySQL
    await mysqlService.saveUser(user);

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'RESET_PASSWORD',
      module: 'Pengguna',
      recordId: user.id,
      details: `Mereset password pengguna @${user.username}.`,
      ipAddress: req.ip || null,
    });

    return res.json({ success: true, message: `Password pengguna @${user.username} berhasil direset dan disimpan ke database.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, requirePermission('user.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = db.getData();
    const user = data.users.find((u) => u.id === id && !u.deletedAt);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    if (user.roleId === 'role-super-admin' || user.username === 'admin') {
      return res.status(400).json({ success: false, message: 'Akun Super Administrator utama tidak dapat dihapus.' });
    }

    user.deletedAt = new Date().toISOString();
    user.status = 'inactive';
    db.save();

    await mysqlService.saveUser(user);

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'DELETE_USER',
      module: 'Pengguna',
      recordId: user.id,
      details: `Menghapus akun pengguna @${user.username}.`,
      ipAddress: req.ip || null,
    });

    return res.json({ success: true, message: `Pengguna @${user.username} berhasil dihapus dari sistem.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/roles
router.get('/roles/all', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const rolesWithPerms = data.roles.map((role) => {
    const permissions = db.getPermissionsForRole(role.id);
    return {
      ...role,
      permissions: permissions.map((p) => p.code),
    };
  });

  return res.json({
    success: true,
    roles: rolesWithPerms,
    availablePermissions: data.permissions,
  });
});

// PUT /api/roles/:id/permissions
router.put('/roles/:id/permissions', authenticate, requirePermission('user.manage'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { permissions: permissionCodes } = req.body; // array of string codes

    if (!Array.isArray(permissionCodes)) {
      return res.status(400).json({ success: false, message: 'Daftar permission harus berupa array.' });
    }

    const data = db.getData();
    const role = data.roles.find((r) => r.id === id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role tidak ditemukan.' });
    }

    // Remove existing role_permissions for this role
    data.rolePermissions = data.rolePermissions.filter((rp) => rp.roleId !== id);

    // Add selected permissions
    for (const code of permissionCodes) {
      const p = data.permissions.find((perm) => perm.code === code);
      if (p) {
        data.rolePermissions.push({ roleId: id, permissionId: p.id });
      }
    }

    db.save();

    db.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'UPDATE_ROLE_PERMISSIONS',
      module: 'Pengguna',
      recordId: role.id,
      details: `Mengubah hak akses permission untuk role ${role.name}. Total: ${permissionCodes.length} izin.`,
      ipAddress: req.ip || null,
    });

    return res.json({ success: true, message: `Hak akses role ${role.name} berhasil diperbarui.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
