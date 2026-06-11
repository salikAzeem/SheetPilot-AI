"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileModel = void 0;
const mongoose_1 = require("mongoose");
const FileSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['csv', 'xlsx', 'google'], required: true },
    sizeBytes: { type: Number },
    rowCount: { type: Number },
    columnCount: { type: Number },
    columns: [{ type: String }],
    data: [mongoose_1.Schema.Types.Mixed],
    googleSheetId: { type: String },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});
exports.FileModel = (0, mongoose_1.model)('File', FileSchema);
