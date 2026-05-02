import { Request, Response, NextFunction } from 'express';

export function requireApproved(req: Request, res: Response, next: NextFunction) {
  if (req.user?.status === 'REJECTED') return res.status(403).json({ error: 'Account has been rejected' });
  if (req.user?.status !== 'APPROVED') return res.status(403).json({ error: 'Account not yet approved' });
  if (!req.user?.profileComplete) return res.status(403).json({ error: 'Profile not complete' });
  next();
}
