import { useState } from 'react';
import { LanguageProvider } from './i18n/LanguageContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import IncotermsCalculator, {
  type CalculatorPrefill,
} from './components/IncotermsCalculator';
import ProductCatalog from './components/ProductCatalog';
import AssayVerificationHub from './components/AssayVerificationHub';
import ComplianceCenter from './components/ComplianceCenter';
import LeadershipContact from './components/LeadershipContact';
import DealRoomModal, {
  type ManifestLineItem,
} from './components/DealRoomModal';
import Footer from './components/Footer';
import { COMMODITY_PRODUCTS } from './data/tradeData';

function PortalContent() {
  const [dealRoomOpen, setDealRoomOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [calculatorPrefill, setCalculatorPrefill] =
    useState<CalculatorPrefill | null>(null);
  const [manifestItems, setManifestItems] = useState<ManifestLineItem[]>([]);

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

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Navbar
        onOpenDealRoom={openGeneralDealRoom}
        manifestCount={manifestItems.length}
      />

      <main className="flex-1">
        <Hero onOpenDealRoom={openGeneralDealRoom} />
        <IncotermsCalculator
          onTransferToDealRoom={openDealRoomFromCalculator}
          onAddToManifest={handleAddCalculatorToManifest}
        />
        <ProductCatalog
          onSelectProductForQuote={openDealRoomForProduct}
          onAddToManifest={handleAddProductToManifest}
          manifestProductIds={manifestItems.map((m) => m.productId)}
        />
        <AssayVerificationHub />
        <ComplianceCenter />
        <LeadershipContact onOpenDealRoom={openGeneralDealRoom} />
      </main>

      <Footer />

      <DealRoomModal
        isOpen={dealRoomOpen}
        onClose={() => setDealRoomOpen(false)}
        initialProductId={selectedProductId}
        calculatorPrefill={calculatorPrefill}
        manifestItems={manifestItems}
        onRemoveManifestItem={handleRemoveManifestItem}
        onClearManifest={() => setManifestItems([])}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <PortalContent />
    </LanguageProvider>
  );
}
