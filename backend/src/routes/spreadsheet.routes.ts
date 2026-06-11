import { Router } from 'express';
import {
  uploadFile,
  previewCommand,
  applyChanges,
  generateFormula,
  generateDashboard,
  generateReport,
  getConnectedSheets,
  importGoogleSheet,
  exportGoogleSheet,
  downloadSpreadsheet,
  getFileData
} from '../controllers/spreadsheet.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/upload', upload.single('file'), uploadFile);
router.post('/preview', previewCommand);
router.post('/apply', applyChanges);
router.post('/formula', generateFormula);
router.post('/dashboard', generateDashboard);
router.post('/report', generateReport);
router.get('/sheets/connection', getConnectedSheets);
router.post('/sheets/import', importGoogleSheet);
router.post('/sheets/export', exportGoogleSheet);
router.post('/download', downloadSpreadsheet);
router.get('/files/:id', getFileData);

export default router;
