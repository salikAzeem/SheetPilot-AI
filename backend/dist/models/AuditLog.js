"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = void 0;
const mongoose_1 = require("mongoose");
const AuditLogSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    fileId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'File' },
    action: { type: String, required: true },
    affectedRows: { type: Number, default: 0 },
    changesApplied: [{ type: String }],
    timestamp: { type: Date, default: Date.now }
});
exports.AuditLog = (0, mongoose_1.model)('AuditLog', AuditLogSchema);
