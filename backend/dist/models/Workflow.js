"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Workflow = void 0;
const mongoose_1 = require("mongoose");
const WorkflowStepSchema = new mongoose_1.Schema({
    type: { type: String, required: true },
    params: { type: mongoose_1.Schema.Types.Mixed, required: true },
    description: { type: String, required: true }
}, { _id: false });
const WorkflowSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: { type: String },
    steps: [WorkflowStepSchema],
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});
exports.Workflow = (0, mongoose_1.model)('Workflow', WorkflowSchema);
