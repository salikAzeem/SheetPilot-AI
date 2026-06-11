"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subscription = void 0;
const mongoose_1 = require("mongoose");
const SubscriptionSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    plan: { type: String, enum: ['free', 'pro'], default: 'free' },
    commandsUsedThisMonth: { type: Number, default: 0 },
    limitResetDate: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    status: { type: String, enum: ['active', 'canceled'], default: 'active' },
    updatedAt: { type: Date, default: Date.now }
});
exports.Subscription = (0, mongoose_1.model)('Subscription', SubscriptionSchema);
