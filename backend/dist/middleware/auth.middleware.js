"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Fall back to guest session
        try {
            let guestUser = await User_1.User.findOne({ email: 'demo@sheetpilot.ai' });
            if (!guestUser) {
                guestUser = new User_1.User({
                    name: 'Guest User',
                    email: 'demo@sheetpilot.ai',
                    picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
                });
                await guestUser.save();
            }
            req.user = {
                id: guestUser._id.toString(),
                email: guestUser.email,
                isGuest: true
            };
            return next();
        }
        catch (err) {
            res.status(500).json({ error: 'Failed to initialize guest session' });
            return;
        }
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        req.user = {
            ...decoded,
            isGuest: false
        };
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'Token is invalid or expired' });
    }
};
exports.authMiddleware = authMiddleware;
