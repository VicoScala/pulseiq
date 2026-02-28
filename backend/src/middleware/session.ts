import { Request, Response, NextFunction } from 'express';
import { getSession, getUserById } from '../db/database';

export interface AuthRequest extends Request {
  userId?: number;
  user?: any;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const sessionId = req.cookies?.pulseiq_session;
  if (!sessionId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const session = getSession(sessionId);
  if (!session) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  if (new Date(session.expires_at) < new Date()) {
    res.status(401).json({ error: 'Session expired' });
    return;
  }

  req.userId = session.user_id;
  req.user = getUserById(session.user_id);
  next();
}
