import { google } from 'googleapis';

export const getGoogleOAuth2Client = (redirectUri?: string) => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri || 'postmessage' // 'postmessage' is standard for client-side exchange
  );
};
