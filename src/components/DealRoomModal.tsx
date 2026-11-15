import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  X,
} from 'lucide-react';
import {
  COMMODITY_PRODUCTS,
  type IncotermCode,
} from '../data/tradeData';
import type { CalculatorPrefill } from './IncotermsCalculator';

interface DealRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProductId?: string | null;
  calculatorPrefill?: CalculatorPrefill | null;
}

interface FormState {
  companyName: string;
  contactName: string;
  corporateEmail: string;
  destinationPort: string;
  productId: string;
  targetVolume: string;
  incoterm: IncotermCode;
  paymentTerms: string;
  specifications: string;
}

interface FormErrors {
  companyName?: string;
  contactName?: string;
  corporateEmail?: string;
  destinationPort?: string;
  targetVolume?: string;
}

const PAYMENT_OPTIONS = [
  'Irrevocable L/C at Sight (UCP 600)',
  'Cash Against Documents (CAD)',
  'T/T 30% Advance / 70% Against B/L & SGS',
  'Escrow / Bank Guarantee (BG)',
];

const INCOTERM_OPTIONS: IncotermCode[] = ['EXW', 'FOB', 'CFR', 'CIF', 'DAP'];

export default function DealRoomModal({
  isOpen,
  onClose,
  initialProductId,
  calculatorPrefill,
}: DealRoomModalProps) {
  const [form, setForm] = useState<FormState>({
    companyName: '',
    contactName: '',
    corporateEmail: '',
    destinationPort: '',
    productId: COMMODITY_PRODUCTS[0].id,
    targetVolume: '100 MT',
    incoterm: 'FOB',
    paymentTerms: PAYMENT_OPTIONS[0],
    specifications: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Sync incoming prefill from Calculator or Catalog card
  useEffect(() => {
    if (!isOpen) return;

    if (calculatorPrefill) {
      setForm((prev) => ({
        ...prev,
        productId: calculatorPrefill.productId,
        targetVolume: `${calculatorPrefill.targetUnits} ${calculatorPrefill.unitLabel} (${calculatorPrefill.containersNeeded} × ${calculatorPrefill.containerSize} FCL)`,
        incoterm: calculatorPrefill.incoterm,
        specifications: `Indicative calculator model: $${calculatorPrefill.estimatedUnitPriceUsd.toLocaleString('en-US')}/${calculatorPrefill.unitLabel} (~$${calculatorPrefill.estimatedTotalUsd.toLocaleString('en-US')} total ${calculatorPrefill.incoterm}).`,
      }));
      setSubmittedRef(null);
      setErrors({});
    } else if (initialProductId) {
      const matched = COMMODITY_PRODUCTS.find((p) => p.id === initialProductId);
      setForm((prev) => ({
        ...prev,
        productId: initialProductId,
        targetVolume: matched ? matched.minOrder : prev.targetVolume,
      }));
      setSubmittedRef(null);
      setErrors({});
    }
  }, [isOpen, initialProductId, calculatorPrefill]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectedProduct =
    COMMODITY_PRODUCTS.find((p) => p.id === form.productId) ||
    COMMODITY_PRODUCTS[0];

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!form.companyName.trim() || form.companyName.trim().length < 2) {
      nextErrors.companyName = 'Enter your registered buyer company name.';
    }
    if (!form.contactName.trim() || form.contactName.trim().length < 2) {
      nextErrors.contactName = 'Enter the authorized signatory or buyer contact.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.corporateEmail.trim())) {
      nextErrors.corporateEmail = 'Enter a valid corporate email address.';
    }
    if (!form.destinationPort.trim() || form.destinationPort.trim().length < 2) {
      nextErrors.destinationPort = 'Specify destination port and country (e.g., Qingdao, China).';
    }
    if (!form.targetVolume.trim()) {
      nextErrors.targetVolume = 'Specify target volume or container count.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const timestampPart = String(Date.now()).slice(-6);
    setSubmittedRef(`AHT-RFQ-${timestampPart}`);
  };

  const handleCopySummary = async () => {
    if (!submittedRef) return;
    const summaryText = [
      `Ahzan Tech Ltd — B2B Deal Room Submission (${submittedRef})`,
      `Buyer Company: ${form.companyName}`,
      `Contact: ${form.contactName} (${form.corporateEmail})`,
      `Commodity: ${selectedProduct.name}`,
      `Target Volume: ${form.targetVolume}`,
      `Incoterms 2020: ${form.incoterm} · Destination: ${form.destinationPort}`,
      `Payment Terms: ${form.paymentTerms}`,
      form.specifications ? `Specs: ${form.specifications}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  const handleReset = () => {
    setSubmittedRef(null);
    setErrors({});
    setForm({
      companyName: '',
      contactName: '',
      corporateEmail: '',
      destinationPort: '',
      productId: COMMODITY_PRODUCTS[0].id,
      targetVolume: '100 MT',
      incoterm: 'FOB',
      paymentTerms: PAYMENT_OPTIONS[0],
      specifications: '',
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deal-room-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
    >
      {/* Click outside backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0"
      />

      <div className="relative z-10 w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h2
                id="deal-room-title"
                className="font-display text-lg font-bold text-white"
              >
                B2B Deal Room — RFQ &amp; Letter of Intent
              </h2>
              <p className="text-xs text-slate-300">
                Ahzan Tech Ltd (RC 2012723) · Formal Proforma &amp; FCO Desk
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Deal Room modal"
            className="w-9 h-9 rounded-md inline-flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto">
          {submittedRef ? (
            /* Confirmation State */
            <div className="py-4 space-y-6">
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    RFQ / LOI Dossier Logged Successfully
                  </h3>
                  <p className="text-sm text-slate-700 mt-1 leading-relaxed">
                    Your trade inquiry has been assigned reference{' '}
                    <span className="font-mono font-semibold text-slate-900">
                      {submittedRef}
                    </span>
                    . Our executive desk (<span className="font-mono">ceo@ahzan.tech</span>) issues formal Soft Corporate Offers (SCO) / Proforma Invoices within 24 business hours.
                  </p>
                </div>
              </div>

              <dl className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                  <dt className="text-slate-500">Reference ID</dt>
                  <dd className="font-mono font-semibold text-slate-900">
                    {submittedRef}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Buyer Entity</dt>
                  <dd className="font-medium text-slate-900 text-right">
                    {form.companyName}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Commodity Line</dt>
                  <dd className="font-medium text-slate-900 text-right">
                    {selectedProduct.shortName}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Volume &amp; Incoterm</dt>
                  <dd className="font-mono text-slate-900 text-right">
                    {form.targetVolume} · {form.incoterm} {form.destinationPort}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Settlement Preference</dt>
                  <dd className="font-medium text-slate-900 text-right">
                    {form.paymentTerms}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  {copiedSummary ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Copied Summary</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy RFQ Summary</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    New Inquiry
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* RFQ / LOI Form */
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="rfq-company"
                    className="block text-xs font-semibold text-slate-800 mb-1.5"
                  >
                    Buyer Company Name *
                  </label>
                  <input
                    id="rfq-company"
                    type="text"
                    value={form.companyName}
                    onChange={(e) =>
                      setForm({ ...form, companyName: e.target.value })
                    }
                    placeholder="e.g., NordBaltic Materials GmbH"
                    className={`w-full h-10 px-3 text-sm text-slate-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      errors.companyName ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  {errors.companyName && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.companyName}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="rfq-contact"
                    className="block text-xs font-semibold text-slate-800 mb-1.5"
                  >
                    Authorized Representative *
                  </label>
                  <input
                    id="rfq-contact"
                    type="text"
                    value={form.contactName}
                    onChange={(e) =>
                      setForm({ ...form, contactName: e.target.value })
                    }
                    placeholder="Full Name & Title"
                    className={`w-full h-10 px-3 text-sm text-slate-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      errors.contactName ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  {errors.contactName && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.contactName}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="rfq-email"
                    className="block text-xs font-semibold text-slate-800 mb-1.5"
                  >
                    Corporate Email *
                  </label>
                  <input
                    id="rfq-email"
                    type="email"
                    value={form.corporateEmail}
                    onChange={(e) =>
                      setForm({ ...form, corporateEmail: e.target.value })
                    }
                    placeholder="procurement@company.com"
                    className={`w-full h-10 px-3 text-sm text-slate-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      errors.corporateEmail ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  {errors.corporateEmail && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.corporateEmail}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="rfq-port"
                    className="block text-xs font-semibold text-slate-800 mb-1.5"
                  >
                    Destination Port / Country *
                  </label>
                  <input
                    id="rfq-port"
                    type="text"
                    value={form.destinationPort}
                    onChange={(e) =>
                      setForm({ ...form, destinationPort: e.target.value })
                    }
                    placeholder="e.g., Qingdao, China / Rotterdam, NL"
                    className={`w-full h-10 px-3 text-sm text-slate-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      errors.destinationPort ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  {errors.destinationPort && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.destinationPort}</span>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="rfq-product"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Target Commodity / Product Line
                </label>
                <select
                  id="rfq-product"
                  value={form.productId}
                  onChange={(e) =>
                    setForm({ ...form, productId: e.target.value })
                  }
                  className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {COMMODITY_PRODUCTS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.category} — {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="rfq-volume"
                    className="block text-xs font-semibold text-slate-800 mb-1.5"
                  >
                    Target Volume *
                  </label>
                  <input
                    id="rfq-volume"
                    type="text"
                    value={form.targetVolume}
                    onChange={(e) =>
                      setForm({ ...form, targetVolume: e.target.value })
                    }
                    placeholder="e.g., 500 MT / 10 FCL"
                    className={`w-full h-10 px-3 text-sm font-mono text-slate-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      errors.targetVolume ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  {errors.targetVolume && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.targetVolume}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="rfq-incoterm"
                    className="block text-xs font-semibold text-slate-800 mb-1.5"
                  >
                    Incoterms 2020
                  </label>
                  <select
                    id="rfq-incoterm"
                    value={form.incoterm}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        incoterm: e.target.value as IncotermCode,
                      })
                    }
                    className="w-full h-10 px-3 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {INCOTERM_OPTIONS.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="rfq-payment"
                    className="block text-xs font-semibold text-slate-800 mb-1.5"
                  >
                    Payment Instrument
                  </label>
                  <select
                    id="rfq-payment"
                    value={form.paymentTerms}
                    onChange={(e) =>
                      setForm({ ...form, paymentTerms: e.target.value })
                    }
                    className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {PAYMENT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="rfq-specs"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Custom Assay, Packaging, or Inspection Requirements
                </label>
                <textarea
                  id="rfq-specs"
                  rows={3}
                  value={form.specifications}
                  onChange={(e) =>
                    setForm({ ...form, specifications: e.target.value })
                  }
                  placeholder="Specify Li2O cutoff grade, moisture tolerance, SGS/BV inspection port, or custom OEM packaging..."
                  className="w-full p-3 text-sm text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Direct submission to Executive Trade Desk · RC 2012723
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors cursor-pointer"
                  >
                    Submit RFQ / LOI
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
