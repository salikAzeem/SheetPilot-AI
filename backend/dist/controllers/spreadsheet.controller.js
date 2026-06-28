"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileData = exports.downloadSpreadsheet = exports.exportGoogleSheet = exports.importGoogleSheet = exports.getConnectedSheets = exports.generateReport = exports.generateDashboard = exports.generateFormula = exports.applyChanges = exports.previewCommand = exports.uploadFile = void 0;
const File_1 = require("../models/File");
const Command_1 = require("../models/Command");
const ActivityLog_1 = require("../models/ActivityLog");
const AuditLog_1 = require("../models/AuditLog");
const Subscription_1 = require("../models/Subscription");
const GoogleSheets_1 = require("../models/GoogleSheets");
const dataProcessor_1 = require("../services/dataProcessor");
const gemini_service_1 = require("../services/gemini.service");
const googleSheets_service_1 = require("../services/googleSheets.service");
const uploadFile = async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    const { originalname, size, buffer } = req.file;
    const extension = originalname.split('.').pop()?.toLowerCase();
    try {
        let parsedData = [];
        if (extension === 'csv') {
            parsedData = await (0, dataProcessor_1.parseCSV)(buffer);
        }
        else if (extension === 'xlsx') {
            parsedData = (0, dataProcessor_1.parseExcel)(buffer);
        }
        else {
            res.status(400).json({ error: 'Unsupported file type. Use .csv or .xlsx' });
            return;
        }
        if (parsedData.length === 0) {
            res.status(400).json({ error: 'Spreadsheet is empty' });
            return;
        }
        const columns = Object.keys(parsedData[0]);
        const newFile = new File_1.FileModel({
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
        await new ActivityLog_1.ActivityLog({
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
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to process file' });
    }
};
exports.uploadFile = uploadFile;
const previewCommand = async (req, res) => {
    const { prompt, columns, sampleData } = req.body;
    if (!prompt || !columns || !sampleData) {
        res.status(400).json({ error: 'Missing prompt, columns or data' });
        return;
    }
    try {
        const aiResponse = await (0, gemini_service_1.translateCommandToActions)(prompt, columns, sampleData);
        res.status(200).json({
            explanation: aiResponse.explanation,
            actions: aiResponse.actions
        });
    }
    catch (error) {
        console.error('Preview error:', error);
        res.status(500).json({ error: 'AI interpretation failed' });
    }
};
exports.previewCommand = previewCommand;
const applyChanges = async (req, res) => {
    const { fileId, actions, data } = req.body;
    if (!actions || !Array.isArray(actions) || !data || !Array.isArray(data)) {
        res.status(400).json({ error: 'Missing actions or spreadsheet data' });
        return;
    }
    try {
        let currentDataset = [...data];
        let totalAffected = 0;
        const allColumnsChanged = [];
        const auditSummaries = [];
        // Increment commands counter for subscription check
        const subscription = await Subscription_1.Subscription.findOne({ userId: req.user.id });
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
            const result = (0, dataProcessor_1.applyTransformation)(currentDataset, action);
            currentDataset = result.data;
            totalAffected += result.affectedCount;
            result.columnsChanged.forEach(col => {
                if (!allColumnsChanged.includes(col))
                    allColumnsChanged.push(col);
            });
            auditSummaries.push(action.description || action.type);
        }
        // Save Command History
        const commandLog = new Command_1.Command({
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
        const auditLog = new AuditLog_1.AuditLog({
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
            await File_1.FileModel.findByIdAndUpdate(fileId, {
                data: currentDataset,
                rowCount: currentDataset.length,
                columns: updatedCols,
                columnCount: updatedCols.length
            });
        }
        await new ActivityLog_1.ActivityLog({
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
    }
    catch (error) {
        console.error('Apply changes error:', error);
        res.status(500).json({ error: 'Failed to apply transformations' });
    }
};
exports.applyChanges = applyChanges;
const generateFormula = async (req, res) => {
    const { prompt, columns } = req.body;
    if (!prompt || !columns) {
        res.status(400).json({ error: 'Missing prompt or columns' });
        return;
    }
    try {
        const formulaDetails = await (0, gemini_service_1.generateFormula)(prompt, columns);
        res.status(200).json(formulaDetails);
    }
    catch (error) {
        console.error('Formula generate error:', error);
        res.status(500).json({ error: 'Failed to generate formula' });
    }
};
exports.generateFormula = generateFormula;
const generateDashboard = async (req, res) => {
    const { prompt, columns, data } = req.body;
    if (!prompt || !columns || !data) {
        res.status(400).json({ error: 'Missing parameters' });
        return;
    }
    try {
        const dashboardData = await (0, gemini_service_1.generateDashboardData)(prompt, columns, data);
        res.status(200).json(dashboardData);
    }
    catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to generate dashboard indicators' });
    }
};
exports.generateDashboard = generateDashboard;
const generateReport = async (req, res) => {
    const { prompt, columns, data } = req.body;
    if (!prompt || !columns || !data) {
        res.status(400).json({ error: 'Missing parameters' });
        return;
    }
    try {
        const reportData = await (0, gemini_service_1.generateReportData)(prompt, columns, data);
        res.status(200).json(reportData);
    }
    catch (error) {
        console.error('Report error:', error);
        res.status(500).json({ error: 'Failed to generate summary report' });
    }
};
exports.generateReport = generateReport;
// Connect Google Sheets (list sheet files or check integration status)
const getConnectedSheets = async (req, res) => {
    try {
        const sheetConnection = await GoogleSheets_1.GoogleSheets.findOne({ userId: req.user.id });
        if (!sheetConnection) {
            res.status(404).json({ error: 'Google Account not connected.' });
            return;
        }
        res.status(200).json({ connectedEmail: sheetConnection.googleEmail });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to verify sheets integration' });
    }
};
exports.getConnectedSheets = getConnectedSheets;
// Import Google Sheets worksheet values
const importGoogleSheet = async (req, res) => {
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
        const gSheets = await GoogleSheets_1.GoogleSheets.findOne({ userId: req.user.id });
        if (!gSheets) {
            res.status(400).json({ error: 'Google integration is not connected.' });
            return;
        }
        const { title, sheets } = await (0, googleSheets_service_1.getSpreadsheetMetadata)(req.user.id, parsedSpreadsheetId);
        // Default to first sheet if the specified sheetName is not found or is default
        const activeSheetName = sheets.includes(sheetName) ? sheetName : sheets[0];
        const { columns, rows } = await (0, googleSheets_service_1.getSpreadsheetData)(req.user.id, parsedSpreadsheetId, activeSheetName);
        const newFile = new File_1.FileModel({
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
        await new ActivityLog_1.ActivityLog({
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
    }
    catch (error) {
        console.error('Import sheet error:', error);
        res.status(500).json({ error: 'Failed to import sheet values. Verify permission scopes.' });
    }
};
exports.importGoogleSheet = importGoogleSheet;
// Export active data back to Google Sheets
const exportGoogleSheet = async (req, res) => {
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
        const gSheets = await GoogleSheets_1.GoogleSheets.findOne({ userId: req.user.id });
        if (!gSheets) {
            res.status(400).json({ error: 'Google integration not connected.' });
            return;
        }
        await (0, googleSheets_service_1.updateSpreadsheetData)(req.user.id, spreadsheetId, sheetName, columns, data);
        await new ActivityLog_1.ActivityLog({
            userId: req.user.id,
            action: 'export_google_sheet',
            details: `Exported data back to Google Sheet ID: ${spreadsheetId}`
        });
        res.status(200).json({ message: 'Spreadsheet updated successfully' });
    }
    catch (error) {
        console.error('Export sheet error:', error);
        res.status(500).json({ error: 'Failed to write data back to Google Sheets' });
    }
};
exports.exportGoogleSheet = exportGoogleSheet;
// Download active data as Excel XLSX file
const downloadSpreadsheet = async (req, res) => {
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
        const excelBuffer = (0, dataProcessor_1.exportToExcel)(data, 'SheetPilot');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(excelBuffer);
    }
    catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Failed to compile file export download' });
    }
};
exports.downloadSpreadsheet = downloadSpreadsheet;
// Retrieve file data by ID
const getFileData = async (req, res) => {
    const { id } = req.params;
    try {
        const file = await File_1.FileModel.findOne({ _id: id, userId: req.user.id });
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
    }
    catch (error) {
        console.error('Get file data error:', error);
        res.status(500).json({ error: 'Failed to retrieve spreadsheet data' });
    }
};
exports.getFileData = getFileData;
