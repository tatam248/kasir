import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/store.ts';
import { User, Permission } from '../db/types.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'kasirpro_jwt_super_secret_production_key_2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    name: string;
    roleId: string;
    roleCode: string;
    permissions: string[];
  };
}

export function generateToken(user: User, permissions: Permission[]): string {
  const role = db.getRoleById(user.roleId);
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      name: user.name,
      roleId: user.roleId,
      roleCode: role?.code || 'kasir',
      permissions: permissions.map((p) => p.code),
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Autentikasi diperlukan. Silakan login kembali.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Verify user is still active in database
    const user = db.getUserById(decoded.id);
    if (!user || user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Akun Anda tidak aktif atau telah dinonaktifkan.' });
    }

    // Refresh user's actual permissions from database so permission changes take effect immediately
    const permissions = db.getPermissionsForRole(user.roleId);
    const role = db.getRoleById(user.roleId);

    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      roleId: user.roleId,
      roleCode: role?.code || 'kasir',
      permissions: permissions.map((p) => p.code),
    };

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Sesi login telah berakhir atau token tidak valid.' });
  }
}

export function requirePermission(permissionCode: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Akses ditolak. Silakan login.' });
    }

    // Super Admin has access to everything
    if (req.user.roleCode === 'super_admin') {
      return next();
    }

    if (!req.user.permissions.includes(permissionCode)) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Anda tidak memiliki hak akses '${permissionCode}'.`,
      });
    }

    next();
  };
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Akses ditolak. Silakan login.' });
    }

    if (allowedRoles.includes(req.user.roleCode)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Aksi ini hanya dapat dilakukan oleh Super Admin dan Pemilik Toko.',
    });
  };
}

export function verifySupervisorPin(pin: string): User | null {
  if (!pin) return null;
  const data = db.getData();
  // Find a manager, owner, or superadmin user with this PIN
  const supervisor = data.users.find(
    (u) =>
      u.status === 'active' &&
      u.supervisorPin === pin &&
      ['role-super-admin', 'role-owner', 'role-manager'].includes(u.roleId)
  );
  return supervisor || null;
}
