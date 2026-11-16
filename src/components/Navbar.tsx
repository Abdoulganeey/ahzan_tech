import { useState } from 'react';
import { Globe, LayoutDashboard, Menu, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useBuyerAuth } from '../context/BuyerAuthContext';
import PWAInstallButton from './PWAInstallButton';

interface NavbarProps {
  onOpenDealRoom: () => void;
  onToggleBuyerDashboard: () => void;
  onOpenAdminPage: () => void;
  buyerDashboardOpen?: boolean;
  manifestCount?: number;
}

export default function Navbar({
  onOpenDealRoom,
  onToggleBuyerDashboard,
  onOpenAdminPage,
  buyerDashboardOpen = false,
  manifestCount = 0,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { lang, setLang, t } = useLanguage();
  const { user, isAdminUser } = useBuyerAuth();

  const navLinks = [
    { label: t.nav.catalog, href: '#catalog' },
    { label: t.nav.calculator, href: '#calculator' },
    { label: t.nav.verification, href: '#verification' },
    { label: t.nav.compliance, href: '#compliance' },
    { label: t.nav.contact, href: '#contact' },
  ];

  const handleNavClick = () => {
    setMobileOpen(false);
  };

  const ctaLabel =
    manifestCount > 0
      ? `${t.nav.requestQuote} (${manifestCount})`
      : t.nav.requestQuote;

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Logo + Single-line Wordmark */}
        <a
          href="#top"
          className="inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-sm"
        >
          <img
            src="./assets/aistudio/IMG_2443_68d163ee.jpeg"
            alt="Ahzan Tech Ltd logo"
            className="w-8 h-8 rounded-md bg-white p-0.5 object-contain shrink-0"
          />
          <span>Ahzan Tech Ltd</span>
        </a>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-300"
        >
          {navLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hover:text-white transition-colors duration-150 py-1 border-b border-transparent hover:border-amber-500 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-sm"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Language + Install + Portal/Admin + Quote CTA + Mobile Trigger */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            role="group"
            aria-label="Language Switcher"
            className="inline-flex items-center gap-0.5 p-0.5 bg-slate-900 border border-slate-700 rounded-md shrink-0"
          >
            <Globe
              aria-hidden="true"
              className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1 hidden sm:block shrink-0"
            />
            <button
              type="button"
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
              className={`px-2 py-1 text-xs font-mono font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                lang === 'en'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('fr')}
              aria-pressed={lang === 'fr'}
              className={`px-2 py-1 text-xs font-mono font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                lang === 'fr'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              FR
            </button>
          </div>

          <div className="hidden md:block">
            <PWAInstallButton variant="header" label="Install App" />
          </div>

          {isAdminUser && (
            <button
              type="button"
              onClick={onOpenAdminPage}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border border-slate-700 bg-slate-900 text-slate-200 hover:border-emerald-400 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Admin Console</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleBuyerDashboard}
            aria-pressed={buyerDashboardOpen}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              buyerDashboardOpen
                ? 'bg-slate-800 text-white border-amber-500'
                : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-slate-500 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              {user
                ? lang === 'fr'
                  ? 'Tableau Acheteur'
                  : 'Buyer Dashboard'
                : lang === 'fr'
                  ? 'Espace Acheteur'
                  : 'Buyer Portal'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenDealRoom}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            {ctaLabel}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-md text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div
          id="mobile-nav-drawer"
          className="lg:hidden bg-slate-950 border-t border-slate-800 px-4 pt-3 pb-5 space-y-1.5"
        >
          {navLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className="block min-h-[44px] px-3 py-2.5 text-base font-medium text-slate-200 hover:text-white hover:bg-slate-900 rounded-md transition-colors"
            >
              {item.label}
            </a>
          ))}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <PWAInstallButton variant="mobile-drawer" label="Install App on Phone / Desktop" />

            {isAdminUser && (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenAdminPage();
                }}
                className="w-full min-h-[44px] py-2.5 px-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
              >
                <span>Open Full-Page Admin Console</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onToggleBuyerDashboard();
              }}
              className="w-full min-h-[44px] py-2.5 px-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4 text-amber-400" />
              <span>
                {user
                  ? lang === 'fr'
                    ? 'Tableau Acheteur'
                    : 'Buyer Dashboard'
                  : lang === 'fr'
                    ? 'Espace Acheteur'
                    : 'Buyer Portal'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenDealRoom();
              }}
              className="w-full min-h-[44px] py-3 px-4 text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md transition-colors cursor-pointer tabular-nums"
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
