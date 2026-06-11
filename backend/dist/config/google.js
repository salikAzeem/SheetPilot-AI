"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoogleOAuth2Client = void 0;
const googleapis_1 = require("googleapis");
const getGoogleOAuth2Client = (redirectUri) => {
    return new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri || 'postmessage' // 'postmessage' is standard for client-side exchange
    );
};
exports.getGoogleOAuth2Client = getGoogleOAuth2Client;
