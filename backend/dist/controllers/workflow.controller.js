"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWorkflow = exports.getWorkflows = exports.saveWorkflow = void 0;
const Workflow_1 = require("../models/Workflow");
const ActivityLog_1 = require("../models/ActivityLog");
const saveWorkflow = async (req, res) => {
    const { name, description, steps } = req.body;
    if (!name || !steps || !Array.isArray(steps)) {
        res.status(400).json({ error: 'Name and steps list are required' });
        return;
    }
    try {
        const newWorkflow = new Workflow_1.Workflow({
            name,
            description,
            steps,
            userId: req.user.id
        });
        await newWorkflow.save();
        await new ActivityLog_1.ActivityLog({
            userId: req.user.id,
            action: 'save_workflow',
            details: `Saved workflow: ${name} with ${steps.length} steps`
        });
        res.status(201).json(newWorkflow);
    }
    catch (error) {
        console.error('Save workflow error:', error);
        res.status(500).json({ error: 'Failed to save workflow' });
    }
};
exports.saveWorkflow = saveWorkflow;
const getWorkflows = async (req, res) => {
    try {
        const workflows = await Workflow_1.Workflow.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(workflows);
    }
    catch (error) {
        console.error('Get workflows error:', error);
        res.status(500).json({ error: 'Failed to retrieve workflows' });
    }
};
exports.getWorkflows = getWorkflows;
const deleteWorkflow = async (req, res) => {
    const { id } = req.params;
    try {
        const workflow = await Workflow_1.Workflow.findOneAndDelete({ _id: id, userId: req.user.id });
        if (!workflow) {
            res.status(404).json({ error: 'Workflow not found or unauthorized' });
            return;
        }
        await new ActivityLog_1.ActivityLog({
            userId: req.user.id,
            action: 'delete_workflow',
            details: `Deleted workflow: ${workflow.name}`
        });
        res.status(200).json({ message: 'Workflow deleted successfully' });
    }
    catch (error) {
        console.error('Delete workflow error:', error);
        res.status(500).json({ error: 'Failed to delete workflow' });
    }
};
exports.deleteWorkflow = deleteWorkflow;
