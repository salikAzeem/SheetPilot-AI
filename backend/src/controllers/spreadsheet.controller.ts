import { Response } from 'express';
import { FileModel } from '../models/File';
import { Command } from '../models/Command';
import { ActivityLog } from '../models/ActivityLog';
import { AuditLog } from '../models/AuditLog';
import { Subscription } from '../models/Subscription';
import { GoogleSheets } from '../models/GoogleSheets';
import { parseCSV, parseExcel, applyTransformation, exportToExcel } from '../services/dataProcessor';
import { translateCommandToActions, generateFormula as aiGenerateFormula, generateDashboardData, generateReportData } from '../services/gemini.service';
import { getSpreadsheetData, updateSpreadsheetData, getSpreadsheetMetadata } from '../services/googleSheets.service';

export const uploadFile = async (req: any, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const { originalname, size, buffer } = req.file;
  const extension = originalname.split('.').pop()?.toLowerCase();

  try {
    let parsedData: Record<string, any>[] = [];
    if (extension === 'csv') {
      parsedData = await parseCSV(buffer);
    } else if (extension === 'xlsx') {
      parsedData = parseExcel(buffer);
    } else {
      res.status(400).json({ error: 'Unsupported file type. Use .csv or .xlsx' });
      return;
    }

    if (parsedData.length === 0) {
      res.status(400).json({ error: 'Spreadsheet is empty' });
      return;
    }

    const columns = Object.keys(parsedData[0]);

    const newFile = new FileModel({
      name: originalname,
      type: extension === 'csv' ? 'csv' : 'xlsx',
      sizeBytes: size,
      rowCount: parsedData.length,
      columnCount: columns.length,
      columns,
      data: parsedData,
      userId: req.user.id
    });
    await newFile.save();

    await new ActivityLog({
      userId: req.user.id,
      action: 'upload_file',
      details: `Uploaded file ${originalname} (${parsedData.length} rows)`
    });

    res.status(200).json({
      fileId: newFile._id,
      name: newFile.name,
      type: newFile.type,
      columns,
      rowCount: newFile.rowCount,
      data: parsedData // send initial data to UI memory
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process file' });
  }
};

export const previewCommand = async (req: any, res: Response): Promise<void> => {
  const { prompt, columns, sampleData } = req.body;

  if (!prompt || !columns || !sampleData) {
    res.status(400).json({ error: 'Missing prompt, columns or data' });
    return;
  }

  try {
    const aiResponse = await translateCommandToActions(prompt, columns, sampleData);
    
    res.status(200).json({
      explanation: aiResponse.explanation,
      actions: aiResponse.actions
    });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'AI interpretation failed' });
  }
};

export const applyChanges = async (req: any, res: Response): Promise<void> => {
  const { fileId, actions, data } = req.body;

  if (!actions || !Array.isArray(actions) || !data || !Array.isArray(data)) {
    res.status(400).json({ error: 'Missing actions or spreadsheet data' });
    return;
  }

  try {
    let currentDataset = [...data];
    let totalAffected = 0;
    const allColumnsChanged: string[] = [];
    const auditSummaries: string[] = [];

    // Increment commands counter for subscription check
    const subscription = await Subscription.findOne({ userId: req.user.id });
    if (subscription) {
      if (subscription.plan === 'free' && subscription.commandsUsedThisMonth >= 50) {
        res.status(403).json({ error: 'Monthly AI command limit reached (50/50). Please upgrade to Pro.' });
        return;
      }
      subscription.commandsUsedThisMonth += 1;
      subscription.updatedAt = new Date();
      await subscription.save();
    }

    // Apply each action sequentially
    for (const action of actions) {
      const result = applyTransformation(currentDataset, action);
      currentDataset = result.data;
      totalAffected += result.affectedCount;
      result.columnsChanged.forEach(col => {
        if (!allColumnsChanged.includes(col)) allColumnsChanged.push(col);
      });
      auditSummaries.push(action.description || action.type);
    }

    // Save Command History
    const commandLog = new Command({
      prompt: req.body.prompt || 'Batch Workflow Execution',
      success: true,
      affectedRows: totalAffected,
      newRows: currentDataset.length,
      columnsChanged: allColumnsChanged,
      explanation: auditSummaries.join(', '),
      userId: req.user.id,
      fileId: fileId || undefined
    });
    await commandLog.save();

    // Save detailed Audit Log
    const auditLog = new AuditLog({
      userId: req.user.id,
      fileId: fileId || undefined,
      action: req.body.prompt ? 'AI Command' : 'Workflow Execution',
      affectedRows: totalAffected,
      changesApplied: auditSummaries
    });
    await auditLog.save();

    // Sync updated data back to DB record if fileId is set
    if (fileId) {
      const updatedCols = currentDataset.length > 0 ? Object.keys(currentDataset[0]) : allColumnsChanged;
      await FileModel.findByIdAndUpdate(fileId, {
        data: currentDataset,
        rowCount: currentDataset.length,
        columns: updatedCols,
        columnCount: updatedCols.length
      });
    }

    await new ActivityLog({
      userId: req.user.id,
      action: 'apply_changes',
      details: `Applied changes: ${auditSummaries.join(', ')}`
    });

    res.status(200).json({
      data: currentDataset,
      explanation: 'Changes applied successfully',
      summary: {
        affectedRows: totalAffected,
        newRows: currentDataset.length,
        columnsChanged: allColumnsChanged,
        auditLogId: auditLog._id
      }
    });
  } catch (error) {
    console.error('Apply changes error:', error);
    res.status(500).json({ error: 'Failed to apply transformations' });
  }
};

export const generateFormula = async (req: any, res: Response): Promise<void> => {
  const { prompt, columns } = req.body;
  if (!prompt || !columns) {
    res.status(400).json({ error: 'Missing prompt or columns' });
    return;
  }

  try {
    const formulaDetails = await aiGenerateFormula(prompt, columns);
    res.status(200).json(formulaDetails);
  } catch (error) {
    console.error('Formula generate error:', error);
    res.status(500).json({ error: 'Failed to generate formula' });
  }
};

export const generateDashboard = async (req: any, res: Response): Promise<void> => {
  const { prompt, columns, data } = req.body;
  if (!prompt || !columns || !data) {
    res.status(400).json({ error: 'Missing parameters' });
    return;
  }

  try {
    const dashboardData = await generateDashboardData(prompt, columns, data);
    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to generate dashboard indicators' });
  }
};

export const generateReport = async (req: any, res: Response): Promise<void> => {
  const { prompt, columns, data } = req.body;
  if (!prompt || !columns || !data) {
    res.status(400).json({ error: 'Missing parameters' });
    return;
  }

  try {
    const reportData = await generateReportData(prompt, columns, data);
    res.status(200).json(reportData);
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: 'Failed to generate summary report' });
  }
};

// Connect Google Sheets (list sheet files or check integration status)
export const getConnectedSheets = async (req: any, res: Response): Promise<void> => {
  try {
    const sheetConnection = await GoogleSheets.findOne({ userId: req.user.id });
    if (!sheetConnection) {
      res.status(404).json({ error: 'Google Account not connected.' });
      return;
    }
    res.status(200).json({ connectedEmail: sheetConnection.googleEmail });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify sheets integration' });
  }
};

// Import Google Sheets worksheet values
export const importGoogleSheet = async (req: any, res: Response): Promise<void> => {
  if (req.user?.isGuest) {
    res.status(401).json({ error: 'Authentication required. Please sign in with Google to import spreadsheets.' });
    return;
  }

  const { spreadsheetId, sheetName = 'Sheet1' } = req.body;
  if (!spreadsheetId) {
    res.status(400).json({ error: 'Spreadsheet ID is required' });
    return;
  }

  // Extract raw spreadsheet ID if a full Google Sheets URL is pasted
  let parsedSpreadsheetId = spreadsheetId;
  const match = spreadsheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    parsedSpreadsheetId = match[1];
  }
  try {
    const gSheets = await GoogleSheets.findOne({ userId: req.user.id });
    if (!gSheets) {
      res.status(400).json({ error: 'Google integration is not connected.' });
      return;
    }

    const { title, sheets } = await getSpreadsheetMetadata(req.user.id, parsedSpreadsheetId);
    
    // Default to first sheet if the specified sheetName is not found or is default
    const activeSheetName = sheets.includes(sheetName) ? sheetName : sheets[0];

    const { columns, rows } = await getSpreadsheetData(req.user.id, parsedSpreadsheetId, activeSheetName);

    const newFile = new FileModel({
      name: title,
      type: 'google',
      googleSheetId: parsedSpreadsheetId,
      rowCount: rows.length,
      columnCount: columns.length,
      columns,
      data: rows,
      userId: req.user.id
    });
    await newFile.save();

    await new ActivityLog({
      userId: req.user.id,
      action: 'import_google_sheet',
      details: `Imported Google Sheet ${title} (${rows.length} rows)`
    });

    res.status(200).json({
      fileId: newFile._id,
      name: title,
      type: 'google',
      googleSheetId: parsedSpreadsheetId,
      sheetName: activeSheetName,
      availableSheets: sheets,
      columns,
      rowCount: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Import sheet error:', error);
    res.status(500).json({ error: 'Failed to import sheet values. Verify permission scopes.' });
  }
};

// Export active data back to Google Sheets
export const exportGoogleSheet = async (req: any, res: Response): Promise<void> => {
  if (req.user?.isGuest) {
    res.status(401).json({ error: 'Authentication required. Please sign in with Google to export spreadsheets.' });
    return;
  }

  const { spreadsheetId, sheetName = 'Sheet1', columns, data } = req.body;
  if (!spreadsheetId || !columns || !data) {
    res.status(400).json({ error: 'Missing parameters' });
    return;
  }

  try {
    const gSheets = await GoogleSheets.findOne({ userId: req.user.id });
    if (!gSheets) {
      res.status(400).json({ error: 'Google integration not connected.' });
      return;
    }

    await updateSpreadsheetData(req.user.id, spreadsheetId, sheetName, columns, data);

    await new ActivityLog({
      userId: req.user.id,
      action: 'export_google_sheet',
      details: `Exported data back to Google Sheet ID: ${spreadsheetId}`
    });

    res.status(200).json({ message: 'Spreadsheet updated successfully' });
  } catch (error) {
    console.error('Export sheet error:', error);
    res.status(500).json({ error: 'Failed to write data back to Google Sheets' });
  }
};

// Download active data as Excel XLSX file
export const downloadSpreadsheet = async (req: any, res: Response): Promise<void> => {
  if (req.user?.isGuest) {
    res.status(401).json({ error: 'Authentication required. Please sign in with Google to download spreadsheets.' });
    return;
  }

  const { columns, data, filename = 'SheetPilot_Export.xlsx' } = req.body;
  if (!columns || !data) {
    res.status(400).json({ error: 'Missing columns or data' });
    return;
  }

  try {
    const excelBuffer = exportToExcel(data, 'SheetPilot');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to compile file export download' });
  }
};

// Retrieve file data by ID
export const getFileData = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const file = await FileModel.findOne({ _id: id, userId: req.user.id });
    if (!file) {
      res.status(404).json({ error: 'File not found or unauthorized' });
      return;
    }

    res.status(200).json({
      fileId: file._id,
      name: file.name,
      type: file.type,
      columns: file.columns,
      rowCount: file.rowCount,
      data: file.data,
      googleSheetId: file.googleSheetId
    });
  } catch (error) {
    console.error('Get file data error:', error);
    res.status(500).json({ error: 'Failed to retrieve spreadsheet data' });
  }
};
