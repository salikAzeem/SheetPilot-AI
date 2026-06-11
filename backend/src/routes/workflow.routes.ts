import { Router } from 'express';
import { saveWorkflow, getWorkflows, deleteWorkflow } from '../controllers/workflow.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', saveWorkflow);
router.get('/', getWorkflows);
router.delete('/:id', deleteWorkflow);

export default router;
