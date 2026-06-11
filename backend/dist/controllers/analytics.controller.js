"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = exports.getDashboardAnalytics = void 0;
const File_1 = require("../models/File");
const Command_1 = require("../models/Command");
const Workflow_1 = require("../models/Workflow");
const ActivityLog_1 = require("../models/ActivityLog");
const Subscription_1 = require("../models/Subscription");
const getDashboardAnalytics = async (req, res) => {
    try {
        const userId = req.user.id;
        // Run parallel aggregation queries for speed
        const [totalFiles, recentFiles, totalCommands, totalWorkflows, recentActivity, subscription] = await Promise.all([
            File_1.FileModel.countDocuments({ userId }),
            File_1.FileModel.find({ userId }).sort({ createdAt: -1 }).limit(10),
            Command_1.Command.countDocuments({ userId }),
            Workflow_1.Workflow.countDocuments({ userId }),
            ActivityLog_1.ActivityLog.find({ userId }).sort({ timestamp: -1 }).limit(10),
            Subscription_1.Subscription.findOne({ userId })
        ]);
        const activeSub = subscription || { plan: 'free', commandsUsedThisMonth: 0, limitResetDate: new Date() };
        res.status(200).json({
            metrics: {
                totalFiles,
                totalCommands,
                totalWorkflows,
                commandsLimit: activeSub.plan === 'free' ? 50 : Infinity,
                commandsUsed: activeSub.commandsUsedThisMonth,
                plan: activeSub.plan
            },
            recentFiles: recentFiles.map(file => ({
                id: file._id,
                name: file.name,
                type: file.type,
                rowCount: file.rowCount,
                columnCount: file.columnCount,
                columns: file.columns,
                createdAt: file.createdAt
            })),
            recentActivity: recentActivity.map(act => ({
                id: act._id,
                action: act.action,
                details: act.details,
                timestamp: act.timestamp
            }))
        });
    }
    catch (error) {
        console.error('Analytics retrieve error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics metrics' });
    }
};
exports.getDashboardAnalytics = getDashboardAnalytics;
const getAuditLogs = async (req, res) => {
    try {
        const commandsHistory = await Command_1.Command.find({ userId: req.user.id })
            .sort({ timestamp: -1 })
            .limit(50);
        res.status(200).json(commandsHistory);
    }
    catch (error) {
        console.error('Audit retrieve error:', error);
        res.status(500).json({ error: 'Failed to retrieve command audit trail' });
    }
};
exports.getAuditLogs = getAuditLogs;
