import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onOpenDealRoom: () => void;
}

const NAV_LINKS = [
  { label: 'Catalog', href: '#catalog' },
  { label: 'Calculator', href: '#calculator' },
  { label: 'Compliance', href: '#compliance' },
  { label: 'Leadership', href: '#leadership' },
  { label: 'Contact', href: '#contact' },
];

export default function Navbar({ onOpenDealRoom }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = () => {
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <a
          href="#top"
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-sm"
        >
          Ahzan Tech Ltd
        </a>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300"
        >
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hover:text-white transition-colors duration-150 py-1 border-b border-transparent hover:border-amber-500 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-sm"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: 1 Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenDealRoom}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Request Quote
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-md text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div
          id="mobile-nav-drawer"
          className="md:hidden bg-slate-950 border-t border-slate-800 px-4 pt-3 pb-5 space-y-1"
        >
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className="block px-3 py-3 text-base font-medium text-slate-200 hover:text-white hover:bg-slate-900 rounded-md transition-colors"
            >
              {item.label}
            </a>
          ))}
          <div className="pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenDealRoom();
              }}
              className="w-full py-3 px-4 text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md transition-colors cursor-pointer"
            >
              Request Trade Quote
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
