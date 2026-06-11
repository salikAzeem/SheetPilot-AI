"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Report = void 0;
const mongoose_1 = require("mongoose");
const ReportSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    type: { type: String, enum: ['sales', 'customer', 'recruitment', 'inventory', 'custom'], required: true },
    summaryText: { type: String, required: true },
    data: [{ type: mongoose_1.Schema.Types.Mixed }],
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});
exports.Report = (0, mongoose_1.model)('Report', ReportSchema);
