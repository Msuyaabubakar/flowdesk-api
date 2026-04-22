import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId:   string;
  tenantId: string;
  role:     string;
  email:    string;
}

declare global {
  namespace Express {
    interface Request {
      user: JWTPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    const payload = jwt.verify(
      header.slice(7),
      process.env.JWT_SECRET || 'devsecret'
    ) as JWTPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (min: string) =>
  (req: Request, res: Response, next: NextFunction) => {
    const rank: Record<string, number> = { admin: 3, supervisor: 2, field_agent: 1 };
    if (!req.user || (rank[req.user.role] || 0) < (rank[min] || 0)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };