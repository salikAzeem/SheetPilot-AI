import { Response } from 'express';
import { Workflow } from '../models/Workflow';
import { ActivityLog } from '../models/ActivityLog';

export const saveWorkflow = async (req: any, res: Response): Promise<void> => {
  const { name, description, steps } = req.body;

  if (!name || !steps || !Array.isArray(steps)) {
    res.status(400).json({ error: 'Name and steps list are required' });
    return;
  }

  try {
    const newWorkflow = new Workflow({
      name,
      description,
      steps,
      userId: req.user.id
    });
    await newWorkflow.save();

    await new ActivityLog({
      userId: req.user.id,
      action: 'save_workflow',
      details: `Saved workflow: ${name} with ${steps.length} steps`
    });

    res.status(201).json(newWorkflow);
  } catch (error) {
    console.error('Save workflow error:', error);
    res.status(500).json({ error: 'Failed to save workflow' });
  }
};

export const getWorkflows = async (req: any, res: Response): Promise<void> => {
  try {
    const workflows = await Workflow.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(workflows);
  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({ error: 'Failed to retrieve workflows' });
  }
};

export const deleteWorkflow = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const workflow = await Workflow.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!workflow) {
      res.status(404).json({ error: 'Workflow not found or unauthorized' });
      return;
    }

    await new ActivityLog({
      userId: req.user.id,
      action: 'delete_workflow',
      details: `Deleted workflow: ${workflow.name}`
    });

    res.status(200).json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    console.error('Delete workflow error:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
};
