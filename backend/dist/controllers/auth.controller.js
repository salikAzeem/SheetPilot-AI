"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockLogin = exports.getProfile = exports.googleLogin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const Subscription_1 = require("../models/Subscription");
const google_1 = require("../config/google");
const GoogleSheets_1 = require("../models/GoogleSheets");
const googleLogin = async (req, res) => {
    const { code, redirectUri } = req.body;
    if (!code) {
        res.status(400).json({ error: 'Auth code is required' });
        return;
    }
    try {
        const oauth2Client = (0, google_1.getGoogleOAuth2Client)(redirectUri);
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        // Fetch user profile info from Google API
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        if (!userInfoResponse.ok) {
            res.status(400).json({ error: 'Failed to retrieve user profile from Google' });
            return;
        }
        const profile = await userInfoResponse.json();
        let user = await User_1.User.findOne({ email: profile.email });
        let isNewUser = false;
        if (!user) {
            user = new User_1.User({
                name: profile.name,
                email: profile.email,
                googleId: profile.sub,
                picture: profile.picture
            });
            await user.save();
            isNewUser = true;
        }
        else {
            user.name = profile.name;
            user.picture = profile.picture;
            user.googleId = profile.sub;
            await user.save();
        }
        // Set up or update GoogleSheets OAuth token link for this user
        if (tokens.access_token) {
            await GoogleSheets_1.GoogleSheets.findOneAndUpdate({ userId: user._id }, {
                googleEmail: profile.email,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || undefined,
                expiryDate: tokens.expiry_date || undefined,
                connectedAt: new Date()
            }, { upsert: true, new: true });
        }
        // Initialize free subscription if new user
        if (isNewUser) {
            const sub = new Subscription_1.Subscription({
                userId: user._id,
                plan: 'free',
                commandsUsedThisMonth: 0,
                status: 'active'
            });
            await sub.save();
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
        res.status(200).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                picture: user.picture
            }
        });
    }
    catch (error) {
        console.error('Google Auth login error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};
exports.googleLogin = googleLogin;
const getProfile = async (req, res) => {
    try {
        const user = await User_1.User.findById(req.user.id);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const subscription = await Subscription_1.Subscription.findOne({ userId: user._id });
        const isGoogleConnected = await GoogleSheets_1.GoogleSheets.exists({ userId: user._id });
        res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                picture: user.picture,
                createdAt: user.createdAt
            },
            subscription: subscription || { plan: 'free', commandsUsedThisMonth: 0 },
            isGoogleConnected: !!isGoogleConnected
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to retrieve profile' });
    }
};
exports.getProfile = getProfile;
const mockLogin = async (req, res) => {
    try {
        let user = await User_1.User.findOne({ email: 'demo@sheetpilot.ai' });
        if (!user) {
            user = new User_1.User({
                name: 'Demo User',
                email: 'demo@sheetpilot.ai',
                picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
            });
            await user.save();
            const sub = new Subscription_1.Subscription({
                userId: user._id,
                plan: 'free',
                commandsUsedThisMonth: 0,
                status: 'active'
            });
            await sub.save();
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
        res.status(200).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                picture: user.picture
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Mock login failed' });
    }
};
exports.mockLogin = mockLogin;
