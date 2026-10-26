import { Router, Response } from 'express';
import { db } from '../db/store.ts';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.ts';

const router = Router();

// GET /api/audit
router.get('/', authenticate, requirePermission('user.manage'), (req: AuthenticatedRequest, res: Response) => {
  const { module, username, startDate, endDate } = req.query;
  const data = db.getData();

  let logs = [...data.auditLogs];

  if (module && module !== 'all') {
    logs = logs.filter((l) => l.module.toLowerCase() === (module as string).toLowerCase());
  }

  if (username) {
    const q = (username as string).toLowerCase().trim();
    logs = logs.filter((l) => l.username.toLowerCase().includes(q));
  }

  if (startDate) {
    logs = logs.filter((l) => l.createdAt.slice(0, 10) >= (startDate as string));
  }
  if (endDate) {
    logs = logs.filter((l) => l.createdAt.slice(0, 10) <= (endDate as string));
  }

  return res.json({ success: true, logs });
});

export default router;
