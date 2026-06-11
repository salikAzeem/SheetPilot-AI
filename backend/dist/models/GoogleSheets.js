"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleSheets = void 0;
const mongoose_1 = require("mongoose");
const GoogleSheetsSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    googleEmail: { type: String, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    expiryDate: { type: Number },
    connectedAt: { type: Date, default: Date.now }
});
exports.GoogleSheets = (0, mongoose_1.model)('GoogleSheets', GoogleSheetsSchema);
