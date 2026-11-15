import { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import IncotermsCalculator, {
  type CalculatorPrefill,
} from './components/IncotermsCalculator';
import ProductCatalog from './components/ProductCatalog';
import ComplianceCenter from './components/ComplianceCenter';
import LeadershipContact from './components/LeadershipContact';
import DealRoomModal from './components/DealRoomModal';
import Footer from './components/Footer';

export default function App() {
  const [dealRoomOpen, setDealRoomOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [calculatorPrefill, setCalculatorPrefill] =
    useState<CalculatorPrefill | null>(null);

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

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Navbar onOpenDealRoom={openGeneralDealRoom} />

      <main className="flex-1">
        <Hero onOpenDealRoom={openGeneralDealRoom} />
        <IncotermsCalculator onTransferToDealRoom={openDealRoomFromCalculator} />
        <ProductCatalog onSelectProductForQuote={openDealRoomForProduct} />
        <ComplianceCenter />
        <LeadershipContact onOpenDealRoom={openGeneralDealRoom} />
      </main>

      <Footer />

      <DealRoomModal
        isOpen={dealRoomOpen}
        onClose={() => setDealRoomOpen(false)}
        initialProductId={selectedProductId}
        calculatorPrefill={calculatorPrefill}
      />
    </div>
  );
}
