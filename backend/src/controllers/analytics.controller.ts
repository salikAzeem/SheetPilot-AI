import { Response } from 'express';
import { FileModel } from '../models/File';
import { Command } from '../models/Command';
import { Workflow } from '../models/Workflow';
import { ActivityLog } from '../models/ActivityLog';
import { Subscription } from '../models/Subscription';

export const getDashboardAnalytics = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    // Run parallel aggregation queries for speed
    const [
      totalFiles,
      recentFiles,
      totalCommands,
      totalWorkflows,
      recentActivity,
      subscription
    ] = await Promise.all([
      FileModel.countDocuments({ userId }),
      FileModel.find({ userId }).sort({ createdAt: -1 }).limit(10),
      Command.countDocuments({ userId }),
      Workflow.countDocuments({ userId }),
      ActivityLog.find({ userId }).sort({ timestamp: -1 }).limit(10),
      Subscription.findOne({ userId })
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
  } catch (error) {
    console.error('Analytics retrieve error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics metrics' });
  }
};

export const getAuditLogs = async (req: any, res: Response): Promise<void> => {
  try {
    const commandsHistory = await Command.find({ userId: req.user.id })
      .sort({ timestamp: -1 })
      .limit(50);
      
    res.status(200).json(commandsHistory);
  } catch (error) {
    console.error('Audit retrieve error:', error);
    res.status(500).json({ error: 'Failed to retrieve command audit trail' });
  }
};
