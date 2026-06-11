"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const UserSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    googleId: { type: String },
    picture: { type: String },
    createdAt: { type: Date, default: Date.now }
});
exports.User = (0, mongoose_1.model)('User', UserSchema);
