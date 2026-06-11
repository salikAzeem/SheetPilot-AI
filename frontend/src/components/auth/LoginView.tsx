import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuth, AuthProvider } from '../../hooks/useAuth';
import { Sparkles, Loader2, LogIn, Database, Lock, ShieldCheck } from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID || '213010427613-mkq8ran7atfmv6hhaevvt32spm429pf8.apps.googleusercontent.com';

export const LoginView: React.FC = () => {
  const { login, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Handle redirect code on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (code) {
      handleCallback(code);
    }
  }, []);

  const handleCallback = async (code: string) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const redirectUri = `${window.location.origin}/auth/login`;
      const response = await api.googleLogin(code, redirectUri);
      
      login(response.token, response.user);
      
      // Clean query params
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      console.error(err);
      setErrorMessage('Authentication with Google failed. Please verify credentials.');
      setLoading(false);
    }
  };

  const handleMockLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await api.mockLogin();
      login(response.token, response.user);
      window.location.href = '/dashboard';
    } catch (err) {
      setErrorMessage('Failed to sign in as guest.');
      setLoading(false);
    }
  };

  const handleGoogleRedirect = () => {
    setLoading(true);
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/login`);
    const clientId = encodeURIComponent(GOOGLE_CLIENT_ID);
    
    // Scopes include OpenID profile info + Google Sheets spreadsheet modify access
    const scope = encodeURIComponent(
      'openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly'
    );
    
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
    
    window.location.href = googleAuthUrl;
  };

  // If already logged in, redirect straight to dashboard
  useEffect(() => {
    if (user && !loading) {
      window.location.href = '/dashboard';
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-canvas-soft text-ink flex flex-col justify-center items-center px-4 font-sans relative">
      <div className="mesh-gradient-bg" />

      {/* Login Card Container */}
      <div className="max-w-md w-full p-8 rounded-xl border border-hairline bg-canvas shadow-xl space-y-8 flex flex-col items-center">
        
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="p-3 bg-primary text-on-primary rounded-xl mb-2">
            <Sparkles className="w-8 h-8 fill-on-primary" />
          </div>
          <h2 className="display-sm text-ink font-semibold">Sign In to SheetPilot AI</h2>
          <p className="text-xs text-body">Connect worksheets and automate cleanups using natural language.</p>
        </div>

        {errorMessage && (
          <div className="p-3 border border-error bg-error-soft text-error-deep rounded-lg text-xs w-full text-center">
            {errorMessage}
          </div>
        )}

        <div className="w-full space-y-3 pt-4 border-t border-hairline">
          {loading ? (
            <button
              disabled
              className="btn-primary w-full inline-flex items-center justify-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying credentials...
            </button>
          ) : (
            <div className="space-y-3.5 w-full">
              <button
                onClick={handleGoogleRedirect}
                className="btn-primary w-full inline-flex items-center justify-center gap-2 hover:bg-black/95 transition-all shadow"
              >
                <LogIn className="w-4 h-4" />
                Sign In with Google Account
              </button>
              
              <button
                onClick={handleMockLogin}
                className="btn-secondary w-full inline-flex items-center justify-center gap-2 transition-all"
              >
                <Sparkles className="w-4 h-4 text-violet" />
                Demo Sign In (Bypass Google)
              </button>

              {/* Developer Tip for Bypass */}
              <div className="p-3 border border-warning/30 bg-warning-soft text-warning-deep rounded-lg text-[11px] leading-relaxed text-center font-sans">
                <span className="font-semibold block mb-0.5">⚠️ Unverified App Warning?</span>
                If Google blocks you, click <span className="font-semibold">"Advanced"</span> (bottom-left) and select <span className="font-semibold">"Go to SheetPilot AI (unsafe)"</span> to bypass.
              </div>
            </div>
          )}
        </div>

        {/* Feature listings */}
        <div className="w-full text-xs text-body space-y-2.5 pt-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-link shrink-0" />
            <span>Link Google Sheets, Excel (.xlsx) & CSVs</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet shrink-0" />
            <span>AI commands engine powered by Gemini</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-success shrink-0" />
            <span>Secure encryption and OAuth flow checks</span>
          </div>
        </div>

      </div>

      <footer className="absolute bottom-6 text-center text-[10px] text-mute font-mono">
        Secure authentication node • SSL JWT encrypted
      </footer>
    </div>
  );
};

export const LoginViewWithAuth: React.FC = () => {
  return (
    <AuthProvider>
      <LoginView />
    </AuthProvider>
  );
};
