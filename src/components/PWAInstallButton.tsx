import { useState } from 'react';
import { Download, MonitorSmartphone, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'inline' | 'mobile-drawer';
  label?: string;
}

export default function PWAInstallButton({
  variant = 'header',
  label = 'Install App',
}: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setShowGuideModal(true);
  };

  const buttonClasses =
    variant === 'mobile-drawer'
      ? 'w-full min-h-[44px] py-2.5 px-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-md transition-colors cursor-pointer whitespace-nowrap'
      : variant === 'inline'
        ? 'min-h-[40px] px-3.5 py-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0'
        : 'min-h-[36px] px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0';

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        className={buttonClasses}
      >
        <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>
          {isIOS ? 'Add to Home Screen' : label}
        </span>
      </button>

      {showGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Install Ahzan Tech Ltd App"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 p-5 sm:p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/pwa-192x192.png"
                  alt="Ahzan Tech Ltd icon"
                  className="w-10 h-10 rounded-lg border border-slate-200 object-contain bg-white"
                />
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Install Ahzan Tech Ltd App
                  </h3>
                  <p className="text-xs text-slate-500">
                    Desktop, Android &amp; iOS standalone access
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="Close install guide"
                className="p-2 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                <p className="font-semibold text-slate-900">
                  On iPhone &amp; iPad (Safari):
                </p>
                <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                  <li>
                    Tap the{' '}
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                      <Share className="w-3.5 h-3.5 text-amber-600 inline" />
                      Share
                    </span>{' '}
                    button in your Safari toolbar.
                  </li>
                  <li>
                    Scroll down and select{' '}
                    <strong className="text-slate-900">Add to Home Screen</strong>.
                  </li>
                  <li>
                    Tap <strong className="text-slate-900">Add</strong> to launch
                    Ahzan Tech Ltd as a full-screen iOS app.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <MonitorSmartphone className="w-4 h-4 text-amber-600" />
                  <span>Desktop &amp; Android Installation</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                  <li>
                    <strong className="text-slate-900">Desktop (Chrome / Edge):</strong>{' '}
                    Click the <strong className="text-slate-900">Install</strong> icon
                    in your browser address bar, or open the browser menu and select{' '}
                    <strong className="text-slate-900">
                      Save and share → Install Ahzan Tech Ltd
                    </strong>
                    .
                  </li>
                  <li>
                    <strong className="text-slate-900">Android (Chrome):</strong> Tap
                    the browser menu (<strong className="text-slate-900">⋮</strong>)
                    and choose{' '}
                    <strong className="text-slate-900">Install app</strong> or{' '}
                    <strong className="text-slate-900">Add to Home screen</strong>.
                  </li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full min-h-[44px] py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
