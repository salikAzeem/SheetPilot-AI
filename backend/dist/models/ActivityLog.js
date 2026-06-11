"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLog = void 0;
const mongoose_1 = require("mongoose");
const ActivityLogSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    details: { type: String },
    ipAddress: { type: String },
    timestamp: { type: Date, default: Date.now }
});
exports.ActivityLog = (0, mongoose_1.model)('ActivityLog', ActivityLogSchema);
