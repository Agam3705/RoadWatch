import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onSuccess: (credential: string) => void;
  onError?: (error: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  text = 'continue_with',
}) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [showConfigHint, setShowConfigHint] = useState(false);

  useEffect(() => {
    // Check if Google script is loaded
    const checkGoogle = () => {
      if (window.google?.accounts?.id) {
        setScriptLoaded(true);
      }
    };

    checkGoogle();
    const interval = setInterval(checkGoogle, 300);
    const timeout = setTimeout(() => clearInterval(interval), 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!clientId || !scriptLoaded || !buttonRef.current || !window.google?.accounts?.id) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential?: string }) => {
          if (response?.credential) {
            onSuccess(response.credential);
          } else {
            onError?.('Failed to get credential from Google response.');
          }
        },
      });

      // Clear existing content and render
      buttonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        width: buttonRef.current.offsetWidth || 340,
        text: text,
        shape: 'rectangular',
        logo_alignment: 'left',
      });
    } catch (err: any) {
      console.error('Google Sign-In initialization error:', err);
    }
  }, [clientId, scriptLoaded, onSuccess, onError, text]);

  const handleFallbackClick = () => {
    if (!clientId) {
      setShowConfigHint(true);
    }
  };

  return (
    <div className="w-full space-y-2">
      {clientId && scriptLoaded ? (
        <div ref={buttonRef} className="w-full flex justify-center min-h-[42px]" />
      ) : (
        <button
          type="button"
          onClick={handleFallbackClick}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.41 7.34 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.98 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.59 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>
      )}

      {showConfigHint && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
          <p className="font-bold">Google Client ID required:</p>
          <p className="mt-0.5 text-amber-800">
            Create an OAuth 2.0 Web Client in Google Cloud Console and paste your <code>Client ID</code> into{' '}
            <code className="bg-amber-100 px-1 py-0.5 rounded">frontend/.env</code> as{' '}
            <code>VITE_GOOGLE_CLIENT_ID</code>.
          </p>
        </div>
      )}
    </div>
  );
};
