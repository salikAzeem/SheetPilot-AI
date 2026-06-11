import { Router } from 'express';
import { getDashboardAnalytics, getAuditLogs } from '../controllers/analytics.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/dashboard', getDashboardAnalytics);
router.get('/audit', getAuditLogs);

export default router;
