import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/store.ts';
import { mysqlService } from '../db/mysql.ts';
import { authenticate, AuthenticatedRequest, generateToken, verifySupervisorPin } from '../middleware/auth.ts';

const router = Router();

// POST /api/auth/reset-admin-emergency (Self-healing reset for local & cloud environments)
router.post('/reset-admin-emergency', async (_req: Request, res: Response) => {
  try {
    let admin = db.getUserByUsername('admin');
    const now = new Date().toISOString();
    const validHash = bcrypt.hashSync('admin123', 10);

    if (!admin) {
      admin = {
        id: 'usr-admin',
        username: 'admin',
        name: 'Administrator',
        email: 'admin@kasirpro.local',
        passwordHash: validHash,
        roleId: 'role-super-admin',
        phone: null,
        supervisorPin: '123456',
        status: 'active',
        failedLoginAttempts: 0,
        lastLoginAt: null,
        createdAt: now,
        updatedAt: now,
      };
      db.getData().users.push(admin);
    } else {
      admin.passwordHash = validHash;
      admin.status = 'active';
      admin.failedLoginAttempts = 0;
      admin.updatedAt = now;
    }

    db.save();
    await mysqlService.saveUser(admin);

    return res.json({
      success: true,
      message: 'Akun Administrator berhasil dipulihkan! Username: "admin" | Password: "admin123" | Status: "active"',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal mereset admin: ' + err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const rawUsername = req.body.username;
    const rawPassword = req.body.password;

    if (!rawUsername || !rawPassword) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
    }

    const username = String(rawUsername).trim();
    const password = String(rawPassword).trim();
    const isDefaultAdmin = username.toLowerCase() === 'admin' && password === 'admin123';

    let user = db.getUserByUsername(username);

    // Auto-create or self-heal admin account when using the default credentials
    if (isDefaultAdmin) {
      const now = new Date().toISOString();
      const validHash = bcrypt.hashSync('admin123', 10);
      if (!user) {
        user = {
          id: 'usr-admin',
          username: 'admin',
          name: 'Administrator',
          email: 'admin@kasirpro.local',
          passwordHash: validHash,
          roleId: 'role-super-admin',
          phone: null,
          supervisorPin: '123456',
          status: 'active',
          failedLoginAttempts: 0,
          lastLoginAt: null,
          createdAt: now,
          updatedAt: now,
        };
        db.getData().users.push(user);
      } else {
        user.passwordHash = validHash;
        user.status = 'active';
        user.failedLoginAttempts = 0;
        user.updatedAt = now;
      }
      db.save();
      await mysqlService.saveUser(user);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Username atau password salah.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Akun ini dinonaktifkan. Hubungi administrator.' });
    }

    let isMatch = isDefaultAdmin ? true : bcrypt.compareSync(password, user.passwordHash);

    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      db.save();
      return res.status(401).json({ success: false, message: 'Username atau password salah.' });
    }

    // Reset failed attempts & set last login
    user.failedLoginAttempts = 0;
    user.lastLoginAt = new Date().toISOString();
    db.save();

    const role = db.getRoleById(user.roleId);
    const permissions = db.getPermissionsForRole(user.roleId);
    const token = generateToken(user, permissions);

    db.logAudit({
      userId: user.id,
      username: user.username,
      action: 'LOGIN',
      module: 'Autentikasi',
      recordId: user.id,
      details: `User ${user.name} (${user.username}) berhasil login.`,
      ipAddress: req.ip || null,
    });

    return res.json({
      success: true,
      message: 'Login berhasil.',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        roleId: user.roleId,
        roleCode: role?.code,
        roleName: role?.name,
        permissions: permissions.map((p) => p.code),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server saat login.', error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = db.getUserById(req.user!.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
  }

  const role = db.getRoleById(user.roleId);
  const permissions = db.getPermissionsForRole(user.roleId);

  return res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      roleId: user.roleId,
      roleCode: role?.code,
      roleName: role?.name,
      permissions: permissions.map((p) => p.code),
    },
  });
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Password lama dan baru wajib diisi.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter.' });
    }

    const user = db.getUserById(req.user!.id);
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });

    const isMatch = bcrypt.compareSync(oldPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Password lama tidak cocok.' });
    }

    user.passwordHash = bcrypt.hashSync(newPassword, 10);
    user.updatedAt = new Date().toISOString();
    db.save();

    db.logAudit({
      userId: user.id,
      username: user.username,
      action: 'CHANGE_PASSWORD',
      module: 'Keamanan',
      recordId: user.id,
      details: `User ${user.username} mengubah password pribadinya.`,
      ipAddress: req.ip || null,
    });

    return res.json({ success: true, message: 'Password berhasil diubah.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/verify-supervisor-pin
router.post('/verify-supervisor-pin', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { pin, reason } = req.body;
  if (!pin) {
    return res.status(400).json({ success: false, message: 'PIN Supervisor diperlukan.' });
  }

  const supervisor = verifySupervisorPin(pin);
  if (!supervisor) {
    return res.status(403).json({ success: false, message: 'PIN Supervisor salah atau tidak berwenang.' });
  }

  db.logAudit({
    userId: req.user!.id,
    username: req.user!.username,
    action: 'SUPERVISOR_APPROVAL',
    module: 'Otorisasi',
    recordId: supervisor.id,
    details: `Tindakan disetujui oleh Supervisor ${supervisor.name}. Alasan: ${reason || 'Tidak ada alasan'}.`,
    ipAddress: req.ip || null,
  });

  return res.json({
    success: true,
    message: 'Otorisasi Supervisor Berhasil.',
    supervisor: {
      id: supervisor.id,
      name: supervisor.name,
      username: supervisor.username,
    },
  });
});

export default router;
