import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';

interface JwtPayload { id: string; }

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    // Always fetch fresh from DB — status and isSuperAdmin must never come from token to avoid stale auth
    const user = await prisma.user.findUnique({ where: { id: payload.id } });

    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = {
      id: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      status: user.status,
      profileComplete: user.profileComplete,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
