import { Router } from 'express';
import { googleLogin, getProfile, mockLogin } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/google-login', googleLogin);
router.post('/mock-login', mockLogin);
router.get('/me', authMiddleware, getProfile);

export default router;
