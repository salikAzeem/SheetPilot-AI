"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command = void 0;
const mongoose_1 = require("mongoose");
const CommandSchema = new mongoose_1.Schema({
    prompt: { type: String, required: true },
    success: { type: Boolean, required: true },
    affectedRows: { type: Number, default: 0 },
    newRows: { type: Number, default: 0 },
    columnsChanged: [{ type: String }],
    explanation: { type: String },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    fileId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'File' },
    timestamp: { type: Date, default: Date.now }
});
exports.Command = (0, mongoose_1.model)('Command', CommandSchema);
