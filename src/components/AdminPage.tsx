import {
  ArrowLeft,
  LayoutDashboard,
  Loader2,
  LogOut,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useBuyerAuth } from '../context/BuyerAuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import AdminWorkspacePanel from './AdminWorkspacePanel';
import PWAInstallButton from './PWAInstallButton';

interface AdminPageProps {
  onBackToPortal: () => void;
  onOpenBuyerPortal: () => void;
}

export default function AdminPage({
  onBackToPortal,
  onOpenBuyerPortal,
}: AdminPageProps) {
  const { lang } = useLanguage();
  const {
    user,
    isAdminUser,
    authReady,
    signingIn,
    authError,
    signInWithGoogle,
    signOutBuyer,
  } = useBuyerAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Full-Page Admin Top Header */}
      <header className="sticky top-0 z-30 h-14 sm:h-16 bg-slate-950 text-white border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToPortal}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'fr' ? 'Portail Public' : 'Trade Portal'}</span>
          </button>

          {isAdminUser && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 min-w-0 truncate">
              <img
                src="./assets/aistudio/IMG_2443_68d163ee.jpeg"
                alt="Ahzan Tech Ltd"
                className="w-6 h-6 rounded bg-white p-0.5 object-contain shrink-0"
              />
              <span className="font-display font-semibold text-white whitespace-nowrap">
                Ahzan Tech Ltd
              </span>
              <span aria-hidden="true">/</span>
              <span className="truncate font-mono text-amber-400">
                {lang === 'fr'
                  ? 'Centre de Commande Admin'
                  : 'Executive Command Center'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <PWAInstallButton variant="header" label="Install App" />

          {isAdminUser && (
            <button
              type="button"
              onClick={onOpenBuyerPortal}
              className="hidden md:inline-flex min-h-[36px] items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md cursor-pointer whitespace-nowrap"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'fr' ? 'Vue Acheteur' : 'Buyer View'}</span>
            </button>
          )}

          {user && (
            <>
              <span className="hidden lg:inline-block text-xs font-mono text-slate-300 truncate max-w-[200px]">
                {user.email}
              </span>
              <button
                type="button"
                onClick={() => void signOutBuyer()}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {lang === 'fr' ? 'Déconnexion' : 'Sign Out'}
                </span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Dedicated Full-Page Body */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6 pb-24 lg:pb-10">
        {!authReady ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500 text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            <span>Verifying credentials...</span>
          </div>
        ) : !user ? (
          <div className="max-w-lg mx-auto my-8 sm:my-16 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-slate-700">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>RESTRICTED ACCESS</span>
              </div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                Authorized Sign-In Required
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Sign in with an authorized Ahzan Tech Ltd executive credential to continue, or return to the public Trade Portal.
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                {authError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <button
                type="button"
                disabled={signingIn}
                onClick={() => void signInWithGoogle()}
                className="gsi-material-button min-h-[44px] inline-flex items-center justify-center gap-3 px-5 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-[#1f1f1f] border border-[#747775] rounded-[4px] font-medium text-sm shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                <div className="gsi-material-button-icon w-[18px] h-[18px] shrink-0">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="block w-full h-full"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  {signingIn ? 'Signing in...' : 'Sign in with Google'}
                </span>
              </button>

              <button
                type="button"
                onClick={onBackToPortal}
                className="min-h-[44px] px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
              >
                Return to Public Portal
              </button>
            </div>
          </div>
        ) : !isAdminUser ? (
          <div className="max-w-lg mx-auto my-8 sm:my-16 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-red-50 text-red-700 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h1 className="font-display text-lg font-bold text-slate-900">
                  Access Restricted
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Your account (
                  <span className="font-mono font-semibold text-slate-900">
                    {user.email}
                  </span>
                  ) does not have permission to view this area. You can return to the public portal or open your Buyer Portal.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onOpenBuyerPortal}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md cursor-pointer"
              >
                Open Buyer Portal
              </button>
              <button
                type="button"
                onClick={onBackToPortal}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
              >
                Back to Trade Portal
              </button>
              <button
                type="button"
                onClick={async () => {
                  await signOutBuyer();
                  await signInWithGoogle();
                }}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
              >
                Switch Account
              </button>
            </div>
          </div>
        ) : (
          <AdminWorkspacePanel />
        )}
      </main>
    </div>
  );
}
