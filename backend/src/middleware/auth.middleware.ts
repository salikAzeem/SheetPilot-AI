import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export interface IAuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    isGuest?: boolean;
  };
}

export const authMiddleware = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Fall back to guest session
    try {
      let guestUser = await User.findOne({ email: 'demo@sheetpilot.ai' });
      if (!guestUser) {
        guestUser = new User({
          name: 'Guest User',
          email: 'demo@sheetpilot.ai',
          picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
        });
        await guestUser.save();
      }
      req.user = {
        id: guestUser._id.toString(),
        email: guestUser.email,
        isGuest: true
      };
      return next();
    } catch (err) {
      res.status(500).json({ error: 'Failed to initialize guest session' });
      return;
    }
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as {
      id: string;
      email: string;
    };
    req.user = {
      ...decoded,
      isGuest: false
    };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is invalid or expired' });
  }
};
