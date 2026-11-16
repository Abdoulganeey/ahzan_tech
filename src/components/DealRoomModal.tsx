import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Trash2,
  X,
} from 'lucide-react';
import {
  COMMODITY_PRODUCTS,
  type IncotermCode,
} from '../data/tradeData';
import type { CalculatorPrefill } from './IncotermsCalculator';
import { useLanguage } from '../i18n/LanguageContext';
import { PRODUCT_FR } from '../i18n/translations';

export interface ManifestLineItem {
  id: string;
  productId: string;
  productName: string;
  volumeSummary: string;
  incoterm: IncotermCode;
  estimatedTotalUsd?: number;
}

interface SavedRfqRecord {
  refId: string;
  submittedAt: string;
  companyName: string;
  commoditySummary: string;
  incoterm: IncotermCode;
  destinationPort: string;
  paymentTerms: string;
}

interface DealRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProductId?: string | null;
  calculatorPrefill?: CalculatorPrefill | null;
  manifestItems?: ManifestLineItem[];
  onRemoveManifestItem?: (lineId: string) => void;
  onClearManifest?: () => void;
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

const PAYMENT_OPTIONS_FR = [
  'Crédit Documentaire Irrévocable à Vue (L/C UCP 600)',
  'Paiement Contre Documents (CAD)',
  'Virement T/T 30% Acompte / 70% Contre B/L & SGS',
  'Séquestre / Garantie Bancaire (BG)',
];

const INCOTERM_OPTIONS: IncotermCode[] = ['EXW', 'FOB', 'CFR', 'CIF', 'DAP'];
const STORAGE_KEY = 'ahzan_rfq_history_v1';

export default function DealRoomModal({
  isOpen,
  onClose,
  initialProductId,
  calculatorPrefill,
  manifestItems = [],
  onRemoveManifestItem,
  onClearManifest,
}: DealRoomModalProps) {
  const { lang, t } = useLanguage();
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
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [history, setHistory] = useState<SavedRfqRecord[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedRfqRecord[];
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch {
      // Ignore storage read failure
    }
  }, [isOpen]);

  // Sync incoming prefill from Calculator or Catalog card
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('form');

    if (calculatorPrefill) {
      setForm((prev) => ({
        ...prev,
        productId: calculatorPrefill.productId,
        destinationPort:
          calculatorPrefill.destinationPort || prev.destinationPort,
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

  const hasManifest = manifestItems.length > 0;

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!form.companyName.trim() || form.companyName.trim().length < 2) {
      nextErrors.companyName =
        lang === 'fr'
          ? 'Veuillez saisir le nom officiel de votre société.'
          : 'Enter your registered buyer company name.';
    }
    if (!form.contactName.trim() || form.contactName.trim().length < 2) {
      nextErrors.contactName =
        lang === 'fr'
          ? 'Veuillez indiquer le représentant autorisé.'
          : 'Enter the authorized signatory or buyer contact.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.corporateEmail.trim())) {
      nextErrors.corporateEmail =
        lang === 'fr'
          ? 'Veuillez saisir une adresse e-mail professionnelle valide.'
          : 'Enter a valid corporate email address.';
    }
    if (!form.destinationPort.trim() || form.destinationPort.trim().length < 2) {
      nextErrors.destinationPort =
        lang === 'fr'
          ? 'Précisez le port et le pays de destination (ex. Rotterdam, NL / Abidjan).'
          : 'Specify destination port and country (e.g., Qingdao, China).';
    }
    if (!hasManifest && !form.targetVolume.trim()) {
      nextErrors.targetVolume =
        lang === 'fr'
          ? 'Indiquez le volume ou nombre de conteneurs souhaité.'
          : 'Specify target volume or container count.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildDossierText = (refId: string) => {
    const lines = [
      `============================================================`,
      `AHZAN TECH LTD (INCORPORATING AHZANEMPORIUM)`,
      `CAC RC 2012723 | MCO LICENCE 65197 EL | SCUML | FIRS TCC | NEPC`,
      `B2B DEAL ROOM — FORMAL RFQ / LOI DOSSIER`,
      `============================================================`,
      `Reference ID:         ${refId}`,
      `Submission Timestamp: ${new Date().toUTCString()}`,
      `Buyer Company:        ${form.companyName}`,
      `Authorized Contact:   ${form.contactName} (${form.corporateEmail})`,
      `Destination Port:     ${form.destinationPort}`,
      `Incoterms 2020:       ${form.incoterm}`,
      `Payment Instrument:   ${form.paymentTerms}`,
      ``,
      hasManifest
        ? `COMMODITY MANIFEST (${manifestItems.length} LINES):`
        : `PRIMARY COMMODITY LINE:`,
      ...(hasManifest
        ? manifestItems.map(
            (item, idx) =>
              `  ${idx + 1}. ${item.productName} | ${item.volumeSummary} | ${item.incoterm}`
          )
        : [
            `  - ${selectedProduct.name} (HS ${selectedProduct.hsCode})`,
            `  - Target Volume: ${form.targetVolume}`,
          ]),
      ``,
      form.specifications ? `CUSTOM SPECIFICATIONS:\n${form.specifications}` : '',
      ``,
      `Executive Trade Desk: ceo@ahzan.tech | abdoul@ahzantechltd.com`,
      `Principal Signatory:  Abdulganiyu Hamza, Founder & CEO`,
    ].filter((l) => l !== undefined);

    return lines.join('\n');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const timestampPart = String(Date.now()).slice(-6);
    const refId = `AHT-RFQ-${timestampPart}`;
    setSubmittedRef(refId);

    const commoditySummary = hasManifest
      ? `${manifestItems.length} manifest lines (${manifestItems.map((m) => m.productName).join(', ')})`
      : `${selectedProduct.shortName} (${form.targetVolume})`;

    const newRecord: SavedRfqRecord = {
      refId,
      submittedAt: new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      companyName: form.companyName.trim(),
      commoditySummary,
      incoterm: form.incoterm,
      destinationPort: form.destinationPort.trim(),
      paymentTerms: form.paymentTerms,
    };

    const updatedHistory = [newRecord, ...history].slice(0, 8);
    setHistory(updatedHistory);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch {
      // Ignore storage quota error
    }
  };

  const handleCopySummary = async () => {
    if (!submittedRef) return;
    try {
      await navigator.clipboard.writeText(buildDossierText(submittedRef));
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      // Ignore clipboard permission failure
    }
  };

  const handleDownloadDossier = () => {
    if (!submittedRef) return;
    const blob = new Blob([buildDossierText(submittedRef)], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${submittedRef}-AhzanTech-RFQ.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const paymentOptionsList = lang === 'fr' ? PAYMENT_OPTIONS_FR : PAYMENT_OPTIONS;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deal-room-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
    >
      {/* Click outside backdrop */}
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0" />

      <div className="relative z-10 w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header with Official Company Logo */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/IMG_2443_68d163ee.jpeg"
              alt="Ahzan Tech Ltd emblem"
              className="w-9 h-9 rounded-md bg-white p-0.5 object-contain shrink-0"
            />
            <div>
              <h2
                id="deal-room-title"
                className="font-display text-lg font-bold text-white"
              >
                {t.dealRoom.title}
              </h2>
              <p className="text-xs text-slate-300">{t.dealRoom.subtitle}</p>
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

        {/* Sub-Navigation Tabs: New RFQ vs Saved Inquiries */}
        <div className="px-6 pt-3 pb-0 bg-slate-50 border-b border-slate-200 flex items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'form'
                ? 'border-amber-500 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.dealRoom.tabForm}{' '}
            {hasManifest ? `(${manifestItems.length})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-amber-500 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {t.dealRoom.tabHistory} ({history.length})
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto">
          {activeTab === 'history' ? (
            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  {t.dealRoom.emptyHistory}
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.refId}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-slate-900">
                        {item.refId}
                      </span>
                      <span className="text-slate-500">{item.submittedAt}</span>
                    </div>
                    <div className="font-semibold text-slate-800">
                      {item.companyName}
                    </div>
                    <div className="text-slate-600">{item.commoditySummary}</div>
                    <div className="font-mono text-slate-500">
                      {item.incoterm} · {item.destinationPort} · {item.paymentTerms}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : submittedRef ? (
            /* Confirmation State */
            <div className="py-2 space-y-6">
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    {t.dealRoom.successTitle}
                  </h3>
                  <p className="text-sm text-slate-700 mt-1 leading-relaxed">
                    {t.dealRoom.successBody1}{' '}
                    <span className="font-mono font-semibold text-slate-900">
                      {submittedRef}
                    </span>
                    . {t.dealRoom.successBody2}
                  </p>
                </div>
              </div>

              <dl className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                  <dt className="text-slate-500">{t.dealRoom.refIdLabel}</dt>
                  <dd className="font-mono font-semibold text-slate-900">
                    {submittedRef}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">{t.dealRoom.buyerEntityLabel}</dt>
                  <dd className="font-medium text-slate-900 text-right">
                    {form.companyName}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">{t.dealRoom.commodityScopeLabel}</dt>
                  <dd className="font-medium text-slate-900 text-right">
                    {hasManifest
                      ? `${manifestItems.length} Lines`
                      : lang === 'fr' && PRODUCT_FR[selectedProduct.id]
                        ? PRODUCT_FR[selectedProduct.id].shortName
                        : selectedProduct.shortName}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">{t.dealRoom.volumeIncotermLabel}</dt>
                  <dd className="font-mono text-slate-900 text-right">
                    {hasManifest ? 'Manifest' : form.targetVolume} · {form.incoterm}{' '}
                    {form.destinationPort}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">{t.dealRoom.settlementLabel}</dt>
                  <dd className="font-medium text-slate-900 text-right">
                    {form.paymentTerms}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedSummary ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>{t.leadership.copiedBtn}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>{t.dealRoom.copySummaryBtn}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadDossier}
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t.dealRoom.downloadBtn}</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    {t.dealRoom.newInquiryBtn}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    {t.dealRoom.doneBtn}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* RFQ / LOI Form */
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Active Multi-Line Manifest Summary (when populated) */}
              {hasManifest && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {t.dealRoom.manifestTitle} ({manifestItems.length})
                    </span>
                    {onClearManifest && (
                      <button
                        type="button"
                        onClick={onClearManifest}
                        className="text-xs font-medium text-slate-500 hover:text-red-600 cursor-pointer"
                      >
                        {t.dealRoom.clearManifest}
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {manifestItems.map((line) => (
                      <div
                        key={line.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">
                            {lang === 'fr' && PRODUCT_FR[line.productId]
                              ? PRODUCT_FR[line.productId].shortName
                              : line.productName}
                          </div>
                          <div className="font-mono text-slate-500">
                            {line.volumeSummary} · {line.incoterm}
                            {line.estimatedTotalUsd
                              ? ` · ~$${line.estimatedTotalUsd.toLocaleString('en-US')}`
                              : ''}
                          </div>
                        </div>
                        {onRemoveManifestItem && (
                          <button
                            type="button"
                            onClick={() => onRemoveManifestItem(line.id)}
                            aria-label={`Remove ${line.productName}`}
                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="rfq-company"
                    className="block text-xs font-semibold text-slate-800 mb-1.5"
                  >
                    {t.dealRoom.companyLabel}
                  </label>
                  <input
                    id="rfq-company"
                    type="text"
                    value={form.companyName}
                    onChange={(e) =>
                      setForm({ ...form, companyName: e.target.value })
                    }
                    placeholder="e.g., EuroAgro Négoce SAS"
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
                    {t.dealRoom.contactLabel}
                  </label>
                  <input
                    id="rfq-contact"
                    type="text"
                    value={form.contactName}
                    onChange={(e) =>
                      setForm({ ...form, contactName: e.target.value })
                    }
                    placeholder="Nom complet & Fonction"
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
                    {t.dealRoom.emailLabel}
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
                    {t.dealRoom.portLabel}
                  </label>
                  <input
                    id="rfq-port"
                    type="text"
                    value={form.destinationPort}
                    onChange={(e) =>
                      setForm({ ...form, destinationPort: e.target.value })
                    }
                    placeholder="Rotterdam, NL / Marseille, FR / Abidjan"
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

              {!hasManifest && (
                <div>
                  <label
                    htmlFor="rfq-product"
                    className="block text-xs font-semibold text-slate-800 mb-1.5"
                  >
                    {t.dealRoom.productLabel}
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
                        {lang === 'fr' && PRODUCT_FR[item.id]
                          ? PRODUCT_FR[item.id].name
                          : item.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {!hasManifest && (
                  <div>
                    <label
                      htmlFor="rfq-volume"
                      className="block text-xs font-semibold text-slate-800 mb-1.5"
                    >
                      {t.dealRoom.volumeLabel}
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
                )}

                <div className={hasManifest ? 'sm:col-span-1' : ''}>
                  <label
                    htmlFor="rfq-incoterm"
                    className="block text-xs font-semibold text-slate-800 mb-1.5"
                  >
                    {t.dealRoom.incotermLabel}
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

                <div className={hasManifest ? 'sm:col-span-2' : ''}>
                  <label
                    htmlFor="rfq-payment"
                    className="block text-xs font-semibold text-slate-800 mb-1.5"
                  >
                    {t.dealRoom.paymentLabel}
                  </label>
                  <select
                    id="rfq-payment"
                    value={form.paymentTerms}
                    onChange={(e) =>
                      setForm({ ...form, paymentTerms: e.target.value })
                    }
                    className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {paymentOptionsList.map((opt) => (
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
                  {t.dealRoom.specsLabel}
                </label>
                <textarea
                  id="rfq-specs"
                  rows={3}
                  value={form.specifications}
                  onChange={(e) =>
                    setForm({ ...form, specifications: e.target.value })
                  }
                  placeholder={t.dealRoom.specsPlaceholder}
                  className="w-full p-3 text-sm text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-500">{t.dealRoom.footerNote}</p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    {t.dealRoom.cancelBtn}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors cursor-pointer"
                  >
                    {t.dealRoom.submitBtn}
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
