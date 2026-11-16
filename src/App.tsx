import { useEffect, useState } from 'react';
import {
  ClipboardList,
  LayoutDashboard,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { LanguageProvider } from './i18n/LanguageContext';
import { BuyerAuthProvider, useBuyerAuth } from './context/BuyerAuthContext';
import AdminPage from './components/AdminPage';
import AssayVerificationHub from './components/AssayVerificationHub';
import BuyerDashboardModal from './components/BuyerDashboardModal';
import ComplianceCenter from './components/ComplianceCenter';
import DealRoomModal, {
  type ManifestLineItem,
} from './components/DealRoomModal';
import Footer from './components/Footer';
import GlobalLogisticsRoutes from './components/GlobalLogisticsRoutes';
import Hero from './components/Hero';
import IncotermsCalculator, {
  type CalculatorPrefill,
} from './components/IncotermsCalculator';
import LeadershipContact from './components/LeadershipContact';
import Navbar from './components/Navbar';
import OfflineIndicator from './components/OfflineIndicator';
import PriceSchedulesSection, {
  type CustomScheduleItem,
} from './components/PriceSchedulesSection';
import ProductCatalog from './components/ProductCatalog';
import { COMMODITY_PRODUCTS } from './data/tradeData';

type AppPage = 'portal' | 'admin';

function detectInitialPage(): AppPage {
  if (typeof window === 'undefined') return 'portal';
  const { pathname, hash, search } = window.location;
  const params = new URLSearchParams(search);
  if (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    hash.startsWith('#/admin') ||
    hash === '#admin' ||
    params.get('page') === 'admin'
  ) {
    return 'admin';
  }
  return 'portal';
}

function PortalContent() {
  const { isAdminUser } = useBuyerAuth();
  const [activePage, setActivePage] = useState<AppPage>(() =>
    detectInitialPage()
  );
  const [dealRoomOpen, setDealRoomOpen] = useState(false);
  const [buyerDashboardOpen, setBuyerDashboardOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [calculatorPrefill, setCalculatorPrefill] =
    useState<CalculatorPrefill | null>(null);
  const [manifestItems, setManifestItems] = useState<ManifestLineItem[]>([]);

  useEffect(() => {
    const syncFromUrl = () => {
      setActivePage(detectInitialPage());
    };
    window.addEventListener('popstate', syncFromUrl);
    window.addEventListener('hashchange', syncFromUrl);
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('hashchange', syncFromUrl);
    };
  }, []);

  const navigateToAdminPage = () => {
    setDealRoomOpen(false);
    setBuyerDashboardOpen(false);
    setActivePage('admin');
    if (!window.location.hash.startsWith('#/admin')) {
      window.history.pushState({ page: 'admin' }, '', '#/admin');
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const navigateToPortalPage = () => {
    setActivePage('portal');
    if (
      window.location.pathname === '/admin' ||
      window.location.hash.startsWith('#/admin') ||
      window.location.hash === '#admin'
    ) {
      window.history.pushState({ page: 'portal' }, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const openGeneralDealRoom = () => {
    setCalculatorPrefill(null);
    setSelectedProductId(null);
    setDealRoomOpen(true);
  };

  const openDealRoomForProduct = (productId: string) => {
    setCalculatorPrefill(null);
    setSelectedProductId(productId);
    setDealRoomOpen(true);
  };

  const openDealRoomFromCalculator = (prefill: CalculatorPrefill) => {
    setSelectedProductId(prefill.productId);
    setCalculatorPrefill(prefill);
    setDealRoomOpen(true);
  };

  const handleAddProductToManifest = (productId: string) => {
    const exists = manifestItems.some((item) => item.productId === productId);
    if (exists) {
      setManifestItems((prev) =>
        prev.filter((item) => item.productId !== productId)
      );
      return;
    }
    const product = COMMODITY_PRODUCTS.find((p) => p.id === productId);
    if (!product) return;
    setManifestItems((prev) => [
      ...prev,
      {
        id: `${productId}-${Date.now()}`,
        productId: product.id,
        productName: product.shortName,
        volumeSummary: product.minOrder,
        incoterm: 'FOB',
      },
    ]);
  };

  const handleAddScheduleItemToManifest = (item: CustomScheduleItem) => {
    const exists = manifestItems.some((m) => m.productId === item.productId);
    if (exists) {
      setManifestItems((prev) =>
        prev.filter((m) => m.productId !== item.productId)
      );
      return;
    }
    setManifestItems((prev) => [
      ...prev,
      {
        id: `${item.productId}-${Date.now()}`,
        productId: item.productId,
        productName: item.productName,
        volumeSummary: item.volumeSummary,
        incoterm: 'FOB',
        estimatedTotalUsd: item.estimatedTotalUsd,
      },
    ]);
  };

  const handleAddCalculatorToManifest = (prefill: CalculatorPrefill) => {
    const product = COMMODITY_PRODUCTS.find((p) => p.id === prefill.productId);
    if (!product) return;
    setManifestItems((prev) => [
      ...prev.filter((item) => item.productId !== prefill.productId),
      {
        id: `${prefill.productId}-${Date.now()}`,
        productId: prefill.productId,
        productName: product.shortName,
        volumeSummary: `${prefill.targetUnits} ${prefill.unitLabel} (${prefill.containersNeeded} × ${prefill.containerSize} FCL)`,
        incoterm: prefill.incoterm,
        estimatedTotalUsd: prefill.estimatedTotalUsd,
      },
    ]);
  };

  const handleRemoveManifestItem = (lineId: string) => {
    setManifestItems((prev) => prev.filter((item) => item.id !== lineId));
  };

  if (activePage === 'admin') {
    return (
      <>
        <AdminPage
          onBackToPortal={navigateToPortalPage}
          onOpenBuyerPortal={() => {
            navigateToPortalPage();
            setBuyerDashboardOpen(true);
          }}
        />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div id="top" className="min-h-screen flex flex-col bg-white text-slate-900">
      <Navbar
        onOpenDealRoom={openGeneralDealRoom}
        onToggleBuyerDashboard={() => setBuyerDashboardOpen((prev) => !prev)}
        onOpenAdminPage={navigateToAdminPage}
        buyerDashboardOpen={buyerDashboardOpen}
        manifestCount={manifestItems.length}
      />

      <main className="flex-1">
        <Hero
          onOpenDealRoom={openGeneralDealRoom}
          onOpenBuyerDashboard={() => setBuyerDashboardOpen(true)}
        />
        <IncotermsCalculator
          onTransferToDealRoom={openDealRoomFromCalculator}
          onAddToManifest={handleAddCalculatorToManifest}
        />
        <ProductCatalog
          onSelectProductForQuote={openDealRoomForProduct}
          onAddToManifest={handleAddProductToManifest}
          manifestProductIds={manifestItems.map((m) => m.productId)}
        />
        <PriceSchedulesSection
          onAddScheduleItemToManifest={handleAddScheduleItemToManifest}
          manifestProductIds={manifestItems.map((m) => m.productId)}
        />
        <AssayVerificationHub />
        <GlobalLogisticsRoutes onSelectRouteForQuote={openDealRoomForProduct} />
        <ComplianceCenter />
        <LeadershipContact onOpenDealRoom={openGeneralDealRoom} />
      </main>

      <Footer onOpenAdminPage={isAdminUser ? navigateToAdminPage : undefined} />

      {/* Mobile Bottom Thumb Bar (Android & iOS Friendly) */}
      <nav
        aria-label="Mobile Trade Portal Navigation"
        className={`md:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 grid ${
          isAdminUser ? 'grid-cols-4' : 'grid-cols-3'
        } items-center px-1`}
      >
        <a
          href="#catalog"
          className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-slate-300 hover:text-white"
        >
          <Package className="w-4 h-4 text-amber-400" />
          <span>Catalog</span>
        </a>
        <button
          type="button"
          onClick={() => setBuyerDashboardOpen(true)}
          className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-slate-300 hover:text-white cursor-pointer"
        >
          <LayoutDashboard className="w-4 h-4 text-amber-400" />
          <span>Buyer</span>
        </button>
        {isAdminUser && (
          <button
            type="button"
            onClick={navigateToAdminPage}
            className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-slate-300 hover:text-white cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Admin</span>
          </button>
        )}
        <button
          type="button"
          onClick={openGeneralDealRoom}
          className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
        >
          <ClipboardList className="w-4 h-4" />
          <span>
            Quote{manifestItems.length > 0 ? ` (${manifestItems.length})` : ''}
          </span>
        </button>
      </nav>

      <DealRoomModal
        isOpen={dealRoomOpen}
        onClose={() => setDealRoomOpen(false)}
        initialProductId={selectedProductId}
        calculatorPrefill={calculatorPrefill}
        manifestItems={manifestItems}
        onRemoveManifestItem={handleRemoveManifestItem}
        onClearManifest={() => setManifestItems([])}
        onOpenBuyerDashboard={() => setBuyerDashboardOpen(true)}
      />

      <BuyerDashboardModal
        isOpen={buyerDashboardOpen}
        onClose={() => setBuyerDashboardOpen(false)}
        onOpenNewRfq={() => {
          setBuyerDashboardOpen(false);
          openGeneralDealRoom();
        }}
        onOpenAdminPage={navigateToAdminPage}
      />

      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <BuyerAuthProvider>
        <PortalContent />
      </BuyerAuthProvider>
    </LanguageProvider>
  );
}
