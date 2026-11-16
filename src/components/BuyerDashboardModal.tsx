import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Anchor,
  Archive,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  Download,
  Edit3,
  FileCheck2,
  FileDown,
  FileText,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Ship,
  SlidersHorizontal,
  X,
  XCircle,
} from 'lucide-react';
import {
  getDocReviewCategory,
  getRfqReviewCategory,
  useBuyerAuth,
  type BuyerRfqDoc,
  type BuyerShipmentDoc,
  type RfqStatus,
  type ShipmentStatus,
  type TradeDocumentDoc,
} from '../context/BuyerAuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { exportManifestQuotePdf } from '../utils/pdfQuoteGenerator';

interface BuyerDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewRfq: () => void;
  onOpenAdminPage: () => void;
}

const RFQ_STAGES: RfqStatus[] = [
  'Submitted',
  'Under Executive Review',
  'Quote Approved',
  'SCO / Proforma Issued',
  'L/C Confirmed',
  'Export Cleared',
];

const SHIPMENT_STAGES: Array<{
  index: number;
  status: ShipmentStatus;
  en: string;
  fr: string;
}> = [
  { index: 1, status: 'Mine / Farm Gate', en: 'Mine / Farm Gate', fr: 'Origine Mine / Champ' },
  {
    index: 2,
    status: 'SGS Assay Verification',
    en: 'SGS Assay Verification',
    fr: 'Analyse SGS',
  },
  {
    index: 3,
    status: 'NESS & Customs Cleared',
    en: 'NESS & Customs Cleared',
    fr: 'Dédouanement NESS',
  },
  {
    index: 4,
    status: 'In Ocean Transit',
    en: 'In Ocean Transit',
    fr: 'Transit Maritime',
  },
  {
    index: 5,
    status: 'Discharged at Port',
    en: 'Discharged at Port',
    fr: 'Déchargé au Port',
  },
];

export default function BuyerDashboardModal({
  isOpen,
  onClose,
  onOpenNewRfq,
  onOpenAdminPage,
}: BuyerDashboardModalProps) {
  const { lang } = useLanguage();
  const {
    user,
    isAdminUser,
    authReady,
    signingIn,
    authError,
    dataLoading,
    dataError,
    profile,
    rfqs,
    shipments,
    tradeDocuments,
    allRfqs,
    allShipments,
    allTradeDocuments,
    marketConfig,
    signInWithGoogle,
    signOutBuyer,
    updateBuyerProfile,
    updateRfqDetails,
    appendShipmentNote,
    archiveTradeDocument,
    adminUpdateRfqStatus,
    adminUpdateShipmentStage,
    adminVerifyTradeDocument,
  } = useBuyerAuth();

  const [workspaceMode, setWorkspaceMode] = useState<'buyer' | 'admin'>('buyer');
  const [activeTab, setActiveTab] = useState<'rfqs' | 'shipments' | 'documents'>(
    'rfqs'
  );
  const [rfqReviewFilter, setRfqReviewFilter] = useState<
    'all' | 'approved' | 'pending' | 'not_approved'
  >('all');
  const [rfqFilter, setRfqFilter] = useState<'All' | RfqStatus>('All');
  const [docSearch, setDocSearch] = useState('');
  const [docReviewFilter, setDocReviewFilter] = useState<
    'all' | 'approved' | 'pending' | 'not_approved'
  >('all');
  const [docTypeFilter, setDocTypeFilter] = useState('All');
  const [showArchivedDocs, setShowArchivedDocs] = useState(false);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportingRfqId, setExportingRfqId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Profile editor state
  const [editingProfile, setEditingProfile] = useState(false);
  const [companyDraft, setCompanyDraft] = useState('');
  const [contactDraft, setContactDraft] = useState('');
  const [portDraft, setPortDraft] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // RFQ amendment state
  const [editingRfqId, setEditingRfqId] = useState<string | null>(null);
  const [rfqPortDraft, setRfqPortDraft] = useState('');
  const [rfqVolumeDraft, setRfqVolumeDraft] = useState('');
  const [rfqSpecsDraft, setRfqSpecsDraft] = useState('');
  const [savingRfq, setSavingRfq] = useState(false);

  // Shipment note editor state
  const [noteTargetId, setNoteTargetId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (profile) {
      setCompanyDraft(profile.companyName);
      setContactDraft(profile.contactName);
      setPortDraft(profile.defaultPort);
    }
  }, [profile]);

  useEffect(() => {
    if (!isAdminUser && workspaceMode === 'admin') {
      setWorkspaceMode('buyer');
    }
  }, [isAdminUser, workspaceMode]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const activeRfqsList = workspaceMode === 'admin' && isAdminUser ? allRfqs : rfqs;
  const activeShipmentsList =
    workspaceMode === 'admin' && isAdminUser ? allShipments : shipments;
  const activeDocsList =
    workspaceMode === 'admin' && isAdminUser ? allTradeDocuments : tradeDocuments;

  const rfqCounts = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let notApproved = 0;
    for (const r of activeRfqsList) {
      const cat = getRfqReviewCategory(r.status);
      if (cat === 'approved') approved++;
      else if (cat === 'pending') pending++;
      else notApproved++;
    }
    return { total: activeRfqsList.length, approved, pending, notApproved };
  }, [activeRfqsList]);

  const filteredRfqs = useMemo(() => {
    return activeRfqsList.filter((item) => {
      if (rfqReviewFilter !== 'all' && getRfqReviewCategory(item.status) !== rfqReviewFilter) {
        return false;
      }
      if (rfqFilter !== 'All' && item.status !== rfqFilter) return false;
      return true;
    });
  }, [activeRfqsList, rfqFilter, rfqReviewFilter]);

  const docTypes = useMemo(() => {
    const types = Array.from(new Set(activeDocsList.map((d) => d.docType)));
    return ['All', ...types];
  }, [activeDocsList]);

  const docCounts = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let notApproved = 0;
    for (const d of activeDocsList) {
      const cat = getDocReviewCategory(d.status);
      if (cat === 'approved') approved++;
      else if (cat === 'pending') pending++;
      else if (cat === 'not_approved') notApproved++;
    }
    return {
      total: activeDocsList.filter((d) => d.status !== 'Archived').length,
      approved,
      pending,
      notApproved,
    };
  }, [activeDocsList]);

  const filteredDocs = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    return activeDocsList.filter((docItem) => {
      if (!showArchivedDocs && docItem.status === 'Archived') return false;
      if (
        docReviewFilter !== 'all' &&
        getDocReviewCategory(docItem.status) !== docReviewFilter
      ) {
        return false;
      }
      const matchesType =
        docTypeFilter === 'All' || docItem.docType === docTypeFilter;
      if (!matchesType) return false;
      if (!q) return true;
      return (
        docItem.title.toLowerCase().includes(q) ||
        docItem.docCode.toLowerCase().includes(q) ||
        docItem.rfqRefId.toLowerCase().includes(q) ||
        docItem.commodity.toLowerCase().includes(q)
      );
    });
  }, [activeDocsList, docReviewFilter, docTypeFilter, docSearch, showArchivedDocs]);

  const pendingDocsCount = useMemo(
    () =>
      activeDocsList.filter((d) => getDocReviewCategory(d.status) === 'pending')
        .length,
    [activeDocsList]
  );

  const inTransitCount = useMemo(
    () => activeShipmentsList.filter((s) => s.status === 'In Ocean Transit').length,
    [activeShipmentsList]
  );

  if (!isOpen) return null;

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(code);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (
      companyDraft.trim().length < 2 ||
      contactDraft.trim().length < 2 ||
      portDraft.trim().length < 2
    ) {
      return;
    }
    setSavingProfile(true);
    setMutationError(null);
    try {
      await updateBuyerProfile({
        companyName: companyDraft,
        contactName: contactDraft,
        defaultPort: portDraft,
      });
      setEditingProfile(false);
    } catch (err) {
      setMutationError(
        err instanceof Error ? err.message : 'Unable to save buyer profile.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveRfqAmendment = async (rfqId: string) => {
    if (rfqPortDraft.trim().length < 2 || rfqVolumeDraft.trim().length < 1) {
      return;
    }
    setSavingRfq(true);
    setMutationError(null);
    try {
      await updateRfqDetails(rfqId, {
        destinationPort: rfqPortDraft,
        targetVolume: rfqVolumeDraft,
        specifications: rfqSpecsDraft,
      });
      setEditingRfqId(null);
    } catch (err) {
      setMutationError(
        err instanceof Error ? err.message : 'Unable to amend RFQ details.'
      );
    } finally {
      setSavingRfq(false);
    }
  };

  const handleSaveShipmentNote = async (shipmentId: string) => {
    if (noteDraft.trim().length < 4) return;
    setSavingNote(true);
    setMutationError(null);
    try {
      await appendShipmentNote(shipmentId, noteDraft);
      setNoteTargetId(null);
      setNoteDraft('');
    } catch (err) {
      setMutationError(
        err instanceof Error ? err.message : 'Unable to update shipment note.'
      );
    } finally {
      setSavingNote(false);
    }
  };

  const handleDownloadTradeDocument = (docItem: TradeDocumentDoc) => {
    const content = [
      `================================================================`,
      `AHZAN TECH LTD (INCORPORATING AHZANEMPORIUM)`,
      `CAC RC 2012723 | MCO LICENCE 65197 EL | SCUML | FIRS TCC | NEPC`,
      `OFFICIAL BUYER PORTAL — VERIFIED TRADE DOCUMENT RECORD`,
      `================================================================`,
      `Document Code:   ${docItem.docCode}`,
      `Document Type:   ${docItem.docType}`,
      `Title:           ${docItem.title}`,
      `Status:          ${docItem.status}`,
      ...(docItem.reviewNote
        ? [`Admin Review:    ${docItem.reviewNote}`]
        : []),
      `Linked RFQ:      ${docItem.rfqRefId}`,
      `Commodity:       ${docItem.commodity}`,
      `Issuing Entity:  ${docItem.issuer}`,
      `Issue Date:      ${docItem.issuedDate}`,
      `Account Email:   ${user?.email || 'Verified Buyer'}`,
      ``,
      `VERIFIED SUMMARY & SPECIFICATIONS:`,
      `${docItem.summaryText}`,
      ``,
      `Executive Trade Desk: abdoul@ahzantechltd.com`,
      `Kano State HQ · Tel/WhatsApp: +234 903 352 4525`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docItem.docCode}-${docItem.rfqRefId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportRfqPdf = async (rfq: BuyerRfqDoc) => {
    if (exportingRfqId) return;
    setExportingRfqId(rfq.id);
    try {
      await exportManifestQuotePdf({
        refId: rfq.refId,
        companyName: rfq.companyName,
        contactName: rfq.contactName,
        corporateEmail: rfq.corporateEmail,
        destinationPort: rfq.destinationPort,
        incoterm: rfq.incoterm,
        paymentTerms: rfq.paymentTerms,
        specifications: rfq.specifications,
        validityDays: marketConfig.quoteValidityDays,
        manifestItems: [
          {
            id: rfq.id,
            productId: rfq.id,
            productName: rfq.commoditySummary,
            volumeSummary: rfq.targetVolume,
            incoterm: rfq.incoterm,
            estimatedTotalUsd: rfq.estimatedValueUsd,
          },
        ],
        lang,
      });
    } finally {
      setExportingRfqId(null);
    }
  };

  const getRfqStepIndex = (status: RfqStatus) => {
    const idx = RFQ_STAGES.indexOf(status);
    return idx === -1 ? 0 : idx;
  };

  const renderRfqCard = (rfq: BuyerRfqDoc) => {
    const stepIdx = getRfqStepIndex(rfq.status);
    const reviewCategory = getRfqReviewCategory(rfq.status);
    const isEditing = editingRfqId === rfq.id;
    const canBuyerAmend =
      rfq.status !== 'Export Cleared' && rfq.buyerUid === user?.uid;

    return (
      <div
        key={rfq.id}
        className={`p-5 bg-white border rounded-xl space-y-4 ${
          reviewCategory === 'not_approved'
            ? 'border-red-200'
            : reviewCategory === 'approved'
              ? 'border-emerald-200'
              : 'border-slate-200'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => void handleCopyCode(rfq.refId)}
                className="inline-flex items-center gap-1 font-mono font-bold text-slate-900 hover:text-amber-700 cursor-pointer"
                title="Copy RFQ Reference"
              >
                <span>{rfq.refId}</span>
                {copiedId === rfq.refId ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400" />
                )}
              </button>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="font-mono text-amber-700 font-semibold">
                {rfq.incoterm}
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="text-slate-500">{rfq.destinationPort}</span>
            </div>
            <h4 className="font-display text-base font-bold text-slate-900 mt-1">
              {rfq.commoditySummary}
            </h4>
          </div>

          <div className="text-right shrink-0 space-y-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border ${
                reviewCategory === 'approved'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : reviewCategory === 'not_approved'
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}
            >
              {reviewCategory === 'approved' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : reviewCategory === 'not_approved' ? (
                <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              )}
              <span>
                {reviewCategory === 'approved'
                  ? rfq.status === 'Quote Approved'
                    ? lang === 'fr'
                      ? 'Devis Approuvé'
                      : 'Approved Quote'
                    : `${lang === 'fr' ? 'Approuvé' : 'Approved'} · ${rfq.status}`
                  : reviewCategory === 'not_approved'
                    ? lang === 'fr'
                      ? 'Non Approuvé (Après Examen)'
                      : 'Not Approved (Admin Review)'
                    : `${lang === 'fr' ? 'En Attente' : 'Pending Review'} · ${rfq.status}`}
              </span>
            </span>
            {typeof rfq.estimatedValueUsd === 'number' && (
              <div className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
                Est. US${rfq.estimatedValueUsd.toLocaleString('en-US')}
              </div>
            )}
          </div>
        </div>

        {rfq.reviewNote && (
          <div
            className={`px-3.5 py-2.5 rounded-lg border text-xs leading-relaxed ${
              reviewCategory === 'not_approved'
                ? 'bg-red-50/70 border-red-200 text-red-900'
                : 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
            }`}
          >
            <span className="font-semibold">
              {lang === 'fr' ? 'Note de révision Admin : ' : 'Executive Review Note: '}
            </span>
            <span>{rfq.reviewNote}</span>
          </div>
        )}

        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <dt className="text-slate-500">
              {lang === 'fr' ? 'Volume Cible' : 'Target Volume'}
            </dt>
            <dd className="font-mono font-semibold text-slate-900 mt-0.5">
              {rfq.targetVolume}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">
              {lang === 'fr' ? 'Instrument de Paiement' : 'Payment Terms'}
            </dt>
            <dd className="font-medium text-slate-800 mt-0.5">
              {rfq.paymentTerms}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">
              {lang === 'fr' ? 'Entité Acheteuse' : 'Buyer Entity'}
            </dt>
            <dd className="font-medium text-slate-800 mt-0.5 truncate">
              {rfq.companyName}
            </dd>
          </div>
        </dl>

        {rfq.specifications && !isEditing && (
          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200/80 rounded-lg p-3 leading-relaxed">
            {rfq.specifications}
          </p>
        )}

        {/* Inline Buyer Amendment Drawer */}
        {isEditing && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {lang === 'fr' ? 'Port de Destination' : 'Destination Port'}
                </label>
                <input
                  type="text"
                  value={rfqPortDraft}
                  onChange={(e) => setRfqPortDraft(e.target.value)}
                  maxLength={120}
                  className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {lang === 'fr' ? 'Volume Cible' : 'Target Volume'}
                </label>
                <input
                  type="text"
                  value={rfqVolumeDraft}
                  onChange={(e) => setRfqVolumeDraft(e.target.value)}
                  maxLength={120}
                  className="w-full h-9 px-3 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                {lang === 'fr'
                  ? 'Spécifications & Tolérances'
                  : 'Assay & Packaging Specifications'}
              </label>
              <textarea
                rows={2}
                value={rfqSpecsDraft}
                onChange={(e) => setRfqSpecsDraft(e.target.value)}
                maxLength={1000}
                className="w-full p-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRfqId(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                {lang === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={savingRfq}
                onClick={() => void handleSaveRfqAmendment(rfq.id)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
              >
                {savingRfq
                  ? lang === 'fr'
                    ? 'Sauvegarde...'
                    : 'Saving...'
                  : lang === 'fr'
                    ? 'Enregistrer'
                    : 'Save Amendment'}
              </button>
            </div>
          </div>
        )}

        {/* RFQ Progress Stepper (or Not Approved Banner) */}
        {reviewCategory === 'not_approved' ? (
          <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              {lang === 'fr'
                ? 'Ce devis n’a pas été approuvé après révision. Utilisez « Modifier détails » pour soumettre une révision.'
                : 'This quote was marked Not Approved after admin review. Use "Amend Details" to revise volume, pricing, or port requirements.'}
            </span>
          </div>
        ) : (
          <div className="pt-1">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-1.5">
              {RFQ_STAGES.map((stageName, idx) => {
                const reached = idx <= stepIdx;
                return (
                  <div key={stageName} className="space-y-1">
                    <div
                      className={`h-1.5 rounded-full ${
                        reached ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                    <div
                      className={`text-[10px] leading-tight truncate ${
                        reached
                          ? 'font-semibold text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {stageName}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Row: Buyer Amend + Export Quote PDF + Executive Admin Status Switcher */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {canBuyerAmend && !isEditing && (
              <button
                type="button"
                onClick={() => {
                  setEditingRfqId(rfq.id);
                  setRfqPortDraft(rfq.destinationPort);
                  setRfqVolumeDraft(rfq.targetVolume);
                  setRfqSpecsDraft(rfq.specifications || '');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>
                  {lang === 'fr' ? 'Modifier détails' : 'Amend Details'}
                </span>
              </button>
            )}
            <button
              type="button"
              disabled={exportingRfqId === rfq.id}
              onClick={() => void handleExportRfqPdf(rfq)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-md transition-colors cursor-pointer"
            >
              {exportingRfqId === rfq.id ? (
                <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
              ) : (
                <FileDown className="w-3 h-3 text-amber-400" />
              )}
              <span>
                {lang === 'fr' ? 'Devis PDF' : 'Export Quote PDF'}
              </span>
            </button>
          </div>

          {workspaceMode === 'admin' && isAdminUser && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">
                Admin Stage:
              </span>
              <select
                aria-label={`Set status for ${rfq.refId}`}
                value={rfq.status}
                onChange={(e) =>
                  void adminUpdateRfqStatus(rfq.id, e.target.value as RfqStatus)
                }
                className="h-8 px-2 text-xs font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {RFQ_STAGES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderShipmentCard = (shipment: BuyerShipmentDoc) => {
    const isEditingNote = noteTargetId === shipment.id;
    const isTerminal = shipment.status === 'Discharged at Port';

    return (
      <div
        key={shipment.id}
        className="p-5 bg-white border border-slate-200 rounded-xl space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => void handleCopyCode(shipment.trackingCode)}
                className="inline-flex items-center gap-1 font-mono font-bold text-slate-900 hover:text-amber-700 cursor-pointer"
                title="Copy Tracking Code"
              >
                <span>{shipment.trackingCode}</span>
                {copiedId === shipment.trackingCode ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400" />
                )}
              </button>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="font-mono text-slate-600">
                RFQ {shipment.rfqRefId}
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="font-mono text-slate-600">
                B/L {shipment.billOfLadingNo}
              </span>
            </div>
            <h4 className="font-display text-base font-bold text-slate-900 mt-1">
              {shipment.commodity}
            </h4>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-900 bg-amber-100 border border-amber-300 rounded-md">
              <Ship className="w-3.5 h-3.5 text-amber-700" />
              <span>{shipment.status}</span>
            </span>
            <div className="font-mono text-xs text-slate-600 mt-1 tabular-nums">
              ETA: {shipment.etaDate}
            </div>
          </div>
        </div>

        {/* Route & Vessel Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs">
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-slate-500">
                {lang === 'fr' ? 'Corridor Maritime' : 'Maritime Corridor'}
              </div>
              <div className="font-semibold text-slate-900">
                {shipment.originPort} → {shipment.destinationPort}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Anchor className="w-3.5 h-3.5 text-slate-700 shrink-0 mt-0.5" />
            <div>
              <div className="text-slate-500">
                {lang === 'fr' ? 'Navire Assigné' : 'Nominated Vessel'}
              </div>
              <div className="font-semibold text-slate-900">
                {shipment.vesselName}
              </div>
            </div>
          </div>
          <div>
            <div className="text-slate-500">
              {lang === 'fr' ? 'Allocation Conteneurs' : 'FCL Allocation'}
            </div>
            <div className="font-mono font-semibold text-slate-900">
              {shipment.containerAllocation}
            </div>
          </div>
        </div>

        {/* 5-Stage Shipment Logistics Stepper */}
        <div className="grid grid-cols-5 gap-1.5">
          {SHIPMENT_STAGES.map((stage) => {
            const reached = stage.index <= shipment.stageIndex;
            return (
              <div key={stage.index} className="space-y-1">
                <div
                  className={`h-1.5 rounded-full ${
                    reached ? 'bg-amber-500' : 'bg-slate-200'
                  }`}
                />
                <div
                  className={`text-[10px] leading-tight ${
                    reached ? 'font-semibold text-slate-800' : 'text-slate-400'
                  }`}
                >
                  {stage.index}. {lang === 'fr' ? stage.fr : stage.en}
                </div>
              </div>
            );
          })}
        </div>

        {/* Latest Dispatch Update + Buyer Receiving Note / Admin Stage Control */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-700 leading-relaxed">
            <span className="font-semibold text-slate-900">
              {lang === 'fr' ? 'Dernier suivi :' : 'Latest Update:'}{' '}
            </span>
            {shipment.lastUpdateNote}
          </p>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {workspaceMode === 'admin' && isAdminUser && (
              <select
                aria-label={`Set milestone for ${shipment.trackingCode}`}
                value={shipment.stageIndex}
                onChange={(e) => {
                  const nextIdx = Number(e.target.value);
                  const stageObj =
                    SHIPMENT_STAGES.find((s) => s.index === nextIdx) ||
                    SHIPMENT_STAGES[0];
                  void adminUpdateShipmentStage(shipment.id, {
                    stageIndex: stageObj.index,
                    status: stageObj.status,
                    lastUpdateNote: shipment.lastUpdateNote,
                  });
                }}
                className="h-8 px-2 text-xs font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-md"
              >
                {SHIPMENT_STAGES.map((s) => (
                  <option key={s.index} value={s.index}>
                    {s.index}. {s.status}
                  </option>
                ))}
              </select>
            )}

            {!isTerminal && !isEditingNote && (
              <button
                type="button"
                onClick={() => {
                  setNoteTargetId(shipment.id);
                  setNoteDraft(shipment.lastUpdateNote);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                <Edit3 className="w-3 h-3" />
                <span>
                  {lang === 'fr' ? 'Note de réception' : 'Add Buyer Note'}
                </span>
              </button>
            )}
          </div>
        </div>

        {isEditingNote && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
            <label className="block text-xs font-semibold text-slate-800">
              {lang === 'fr'
                ? 'Mettre à jour la note d’instruction / réception acheteur'
                : 'Update Buyer Port / Clearing Instruction Note'}
            </label>
            <input
              type="text"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              maxLength={300}
              className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setNoteTargetId(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                {lang === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={savingNote || noteDraft.trim().length < 4}
                onClick={() => void handleSaveShipmentNote(shipment.id)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-md cursor-pointer"
              >
                {savingNote
                  ? lang === 'fr'
                    ? 'Enregistrement...'
                    : 'Saving...'
                  : lang === 'fr'
                    ? 'Enregistrer'
                    : 'Save Note'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="buyer-dashboard-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs overflow-y-auto"
    >
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0" />

      <div
        className={`relative z-10 w-full ${
          workspaceMode === 'admin' && isAdminUser
            ? 'max-w-[1340px]'
            : 'max-w-5xl'
        } bg-slate-50 border border-slate-200 rounded-xl shadow-2xl overflow-hidden my-auto max-h-[93vh] flex flex-col`}
      >
        {/* Executive Overlay Top Bar */}
        <div className="px-5 sm:px-6 py-4 bg-slate-950 text-white flex items-center justify-between gap-4 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="./assets/aistudio/IMG_2443_68d163ee.jpeg"
              alt="Ahzan Tech Ltd emblem"
              className="w-9 h-9 rounded-md bg-white p-0.5 object-contain shrink-0"
            />
            <div className="min-w-0">
              <h2
                id="buyer-dashboard-title"
                className="font-display text-base sm:text-lg font-bold text-white truncate"
              >
                {lang === 'fr'
                  ? 'Espace Acheteur — Suivi RFQ, Expéditions & Documents'
                  : 'Buyer Dashboard — Active RFQs, Shipments & Trade Documents'}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Ahzan Tech Ltd (RC 2012723) · Licence No. 65197 EL · SGS &amp; NESS Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdminUser && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdminPage();
                }}
                className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Open Admin Page</span>
              </button>
            )}

            {user && (
              <button
                type="button"
                onClick={() => void signOutBuyer()}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{lang === 'fr' ? 'Déconnexion' : 'Sign Out'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Buyer Dashboard overlay"
              className="w-9 h-9 rounded-md inline-flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {!authReady ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-600">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
              <p className="text-sm font-medium">
                {lang === 'fr'
                  ? 'Vérification de la session acheteur...'
                  : 'Checking authenticated buyer session...'}
              </p>
            </div>
          ) : !user ? (
            /* Unauthenticated Sign-In Gate */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch py-2">
              <div className="lg:col-span-7 bg-slate-900 text-white rounded-xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400">
                    <Lock className="w-4 h-4" />
                    <span>
                      {lang === 'fr'
                        ? 'Accès Sécurisé & Isolation Strict UID'
                        : 'Zero-Trust UID-Isolated Buyer Workspace'}
                    </span>
                  </div>
                  <h3 className="font-display text-2xl font-bold text-white leading-tight">
                    {lang === 'fr'
                      ? 'Suivez vos cotations, conteneurs FCL et documents d’exportation en temps réel'
                      : 'Track Active RFQs, FCL Vessel Milestones & Verified Trade Documents'}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {lang === 'fr'
                      ? 'Connectez-vous avec votre compte Google professionnel pour accéder à vos demandes RFQ soumises, aux certificats d’analyse SGS, aux connaissements (B/L) et au suivi portuaire.'
                      : 'Sign in with your verified Google account to synchronize submitted RFQ dossiers, inspect live SGS & NESS port clearance updates, and download historical Bills of Lading and assay certificates.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-xs">
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                    <ClipboardList className="w-4 h-4 text-amber-400 mb-1.5" />
                    <div className="font-semibold text-white">
                      {lang === 'fr' ? 'Statut RFQ & L/C' : 'Active RFQ Status'}
                    </div>
                    <p className="text-slate-400 mt-0.5">
                      SCO, Proforma &amp; L/C progression
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                    <Ship className="w-4 h-4 text-amber-400 mb-1.5" />
                    <div className="font-semibold text-white">
                      {lang === 'fr' ? 'Suivi Expéditions' : 'FCL Tracking'}
                    </div>
                    <p className="text-slate-400 mt-0.5">
                      Apapa, Tin Can &amp; ocean transit ETA
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                    <FileCheck2 className="w-4 h-4 text-amber-400 mb-1.5" />
                    <div className="font-semibold text-white">
                      {lang === 'fr' ? 'Archives Export' : 'Trade Documents'}
                    </div>
                    <p className="text-slate-400 mt-0.5">
                      SGS ZMGN057, B/L &amp; Form NXP
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-center space-y-5">
                <div>
                  <h4 className="font-display text-xl font-bold text-slate-900">
                    {lang === 'fr'
                      ? 'Connexion Portail Acheteur'
                      : 'Sign In to Buyer Dashboard'}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {lang === 'fr'
                      ? 'Authentification Google vérifiée requise. Aucun tiers ne peut consulter vos dossiers ou documents.'
                      : 'Verified Google Authentication required. Every RFQ, shipment record, and trade document is enforced at the database layer per buyer UID.'}
                  </p>
                </div>

                {authError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={signingIn}
                  onClick={() => void signInWithGoogle()}
                  className="w-full py-3.5 px-5 inline-flex items-center justify-center gap-2.5 text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                >
                  {signingIn ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span>
                    {signingIn
                      ? lang === 'fr'
                        ? 'Connexion en cours...'
                        : 'Signing in...'
                      : lang === 'fr'
                        ? 'Continuer avec Google'
                        : 'Sign in with Google'}
                  </span>
                </button>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {lang === 'fr'
                    ? 'Première connexion ? Un portefeuille complet (Lithium 4,61% Li2O à 207 $/% et Sésame FOB Lagos) est initialisé automatiquement.'
                    : 'First sign-in automatically provisions your starter trade dossier (4.61% Li2O @ $207/% and FOB Lagos Agro shipments).'}
                </p>
              </div>
            </div>
          ) : (
            /* Authenticated Buyer Workspace */
            <div className="space-y-5">
              {/* Buyer Identity & Profile Strip */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Buyer avatar'}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-full border border-slate-200 object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-slate-900 text-amber-400 font-display font-bold flex items-center justify-center shrink-0">
                        {(user.displayName || user.email || 'B')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-base font-bold text-slate-900 truncate">
                          {profile?.companyName || user.displayName || 'Verified Buyer'}
                        </span>
                        <span className="text-xs font-medium text-emerald-700 inline-flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {isAdminUser && workspaceMode === 'admin'
                            ? 'Executive Admin'
                            : lang === 'fr'
                              ? 'Acheteur Vérifié'
                              : 'Verified Buyer'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono truncate">
                        {profile?.contactName || user.displayName} · {user.email} ·{' '}
                        {profile?.defaultPort || 'Rotterdam / Qingdao'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingProfile((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>
                        {lang === 'fr' ? 'Profil Société' : 'Edit Profile'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={onOpenNewRfq}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {lang === 'fr' ? 'Nouvelle RFQ' : 'New RFQ / LOI'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void signOutBuyer()}
                      className="sm:hidden inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-md cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {editingProfile && (
                  <form
                    onSubmit={handleSaveProfile}
                    className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
                  >
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {lang === 'fr' ? 'Raison Sociale' : 'Company Name'}
                      </label>
                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={160}
                        value={companyDraft}
                        onChange={(e) => setCompanyDraft(e.target.value)}
                        className="w-full h-9 px-3 text-xs text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {lang === 'fr' ? 'Signataire Autorisé' : 'Authorized Contact'}
                      </label>
                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={120}
                        value={contactDraft}
                        onChange={(e) => setContactDraft(e.target.value)}
                        className="w-full h-9 px-3 text-xs text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {lang === 'fr'
                          ? 'Port de Destination'
                          : 'Default Discharge Port'}
                      </label>
                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={120}
                        value={portDraft}
                        onChange={(e) => setPortDraft(e.target.value)}
                        className="w-full h-9 px-3 text-xs text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="flex-1 h-9 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
                      >
                        {savingProfile
                          ? lang === 'fr'
                            ? 'Enregistrement...'
                            : 'Saving...'
                          : lang === 'fr'
                            ? 'Enregistrer'
                            : 'Save Profile'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingProfile(false)}
                        className="h-9 px-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        {lang === 'fr' ? 'Annuler' : 'Cancel'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Actionable Trade Status Callout */}
              {workspaceMode !== 'admin' &&
                (pendingDocsCount > 0 || inTransitCount > 0) && (
                <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-800">
                    <SlidersHorizontal className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      {pendingDocsCount > 0
                        ? lang === 'fr'
                          ? `${pendingDocsCount} document(s) en attente de contre-signature et ${inTransitCount} expédition(s) FCL en transit.`
                          : `${pendingDocsCount} document(s) awaiting countersignature and ${inTransitCount} active FCL shipment(s) currently in ocean transit.`
                        : lang === 'fr'
                          ? `${inTransitCount} expédition(s) FCL en transit maritime actif.`
                          : `${inTransitCount} active FCL shipment(s) currently in ocean transit.`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {pendingDocsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('documents')}
                        className="font-semibold text-amber-800 hover:text-slate-900 underline cursor-pointer"
                      >
                        {lang === 'fr' ? 'Voir Documents' : 'Review Documents'}
                      </button>
                    )}
                    {inTransitCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('shipments')}
                        className="font-semibold text-amber-800 hover:text-slate-900 underline cursor-pointer"
                      >
                        {lang === 'fr' ? 'Suivre Navires' : 'Track Vessels'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {(dataError || mutationError) && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{mutationError || dataError}</span>
                  </div>
                  {mutationError && (
                    <button
                      type="button"
                      onClick={() => setMutationError(null)}
                      className="font-semibold underline cursor-pointer"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              )}

              {isAdminUser && (
                <div className="p-3.5 bg-slate-900 text-white border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 text-xs">
                    <div className="font-semibold text-emerald-400">
                      Executive Admin Console Available
                    </div>
                    <p className="text-slate-300">
                      Manage 249+ Trade Book leads, Google Drive Vault, and live Android CRM sync in the full-screen Admin page.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAdminPage();
                    }}
                    className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Launch Full-Page Admin
                  </button>
                </div>
              )}

              {/* 3-Column KPI Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => setActiveTab('rfqs')}
                      className={`p-4 text-left rounded-xl border transition-colors cursor-pointer ${
                        activeTab === 'rfqs'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`text-xs font-medium flex items-center gap-1.5 ${
                          activeTab === 'rfqs' ? 'text-amber-400' : 'text-slate-500'
                        }`}
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>
                          {lang === 'fr' ? 'Demandes RFQ Actives' : 'Active RFQ Status'}
                        </span>
                      </div>
                      <div className="font-mono text-2xl font-bold mt-1 tabular-nums">
                        {activeRfqsList.length}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('shipments')}
                      className={`p-4 text-left rounded-xl border transition-colors cursor-pointer ${
                        activeTab === 'shipments'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`text-xs font-medium flex items-center gap-1.5 ${
                          activeTab === 'shipments'
                            ? 'text-amber-400'
                            : 'text-slate-500'
                        }`}
                      >
                        <Ship className="w-3.5 h-3.5" />
                        <span>
                          {lang === 'fr'
                            ? 'Expéditions & Suivi FCL'
                            : 'Shipment Tracking'}
                        </span>
                      </div>
                      <div className="font-mono text-2xl font-bold mt-1 tabular-nums">
                        {activeShipmentsList.length}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('documents')}
                      className={`p-4 text-left rounded-xl border transition-colors cursor-pointer ${
                        activeTab === 'documents'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`text-xs font-medium flex items-center gap-1.5 ${
                          activeTab === 'documents'
                            ? 'text-amber-400'
                            : 'text-slate-500'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>
                          {lang === 'fr'
                            ? 'Documents Commerciaux'
                            : 'Historical Trade Docs'}
                        </span>
                      </div>
                      <div className="font-mono text-2xl font-bold mt-1 tabular-nums">
                        {activeDocsList.length}
                      </div>
                    </button>
                  </div>

                  {/* Loading Skeleton */}
                  {dataLoading ? (
                    <div className="py-12 flex items-center justify-center gap-2 text-sm text-slate-600">
                      <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                      <span>
                        {lang === 'fr'
                          ? 'Synchronisation de votre dossier commercial...'
                          : 'Synchronizing your Firestore trade records...'}
                      </span>
                    </div>
                  ) : (
                <>
                  {/* Tab 1: Active RFQs */}
                  {activeTab === 'rfqs' && (
                    <div className="space-y-4">
                      {/* Review Category Filter Strip (Approved Quote vs Pending vs Not Approved) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setRfqReviewFilter('all');
                            setRfqFilter('All');
                          }}
                          className={`p-3 text-left rounded-lg border transition-colors cursor-pointer ${
                            rfqReviewFilter === 'all'
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-[11px] font-medium opacity-75">
                            {lang === 'fr' ? 'Tous les Devis' : 'All Quotes'}
                          </div>
                          <div className="font-mono text-lg font-bold tabular-nums">
                            {rfqCounts.total}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRfqReviewFilter('approved');
                            setRfqFilter('All');
                          }}
                          className={`p-3 text-left rounded-lg border transition-colors cursor-pointer ${
                            rfqReviewFilter === 'approved'
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-emerald-50/70 text-emerald-950 border-emerald-200 hover:border-emerald-300'
                          }`}
                        >
                          <div className="text-[11px] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {lang === 'fr' ? 'Devis Approuvés' : 'Approved Quotes'}
                            </span>
                          </div>
                          <div className="font-mono text-lg font-bold tabular-nums">
                            {rfqCounts.approved}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRfqReviewFilter('pending');
                            setRfqFilter('All');
                          }}
                          className={`p-3 text-left rounded-lg border transition-colors cursor-pointer ${
                            rfqReviewFilter === 'pending'
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-amber-50/70 text-amber-950 border-amber-200 hover:border-amber-300'
                          }`}
                        >
                          <div className="text-[11px] font-semibold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {lang === 'fr' ? 'En Attente' : 'Pending Review'}
                            </span>
                          </div>
                          <div className="font-mono text-lg font-bold tabular-nums">
                            {rfqCounts.pending}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRfqReviewFilter('not_approved');
                            setRfqFilter('All');
                          }}
                          className={`p-3 text-left rounded-lg border transition-colors cursor-pointer ${
                            rfqReviewFilter === 'not_approved'
                              ? 'bg-red-700 text-white border-red-700'
                              : 'bg-red-50/70 text-red-950 border-red-200 hover:border-red-300'
                          }`}
                        >
                          <div className="text-[11px] font-semibold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {lang === 'fr' ? 'Non Approuvés' : 'Not Approved'}
                            </span>
                          </div>
                          <div className="font-mono text-lg font-bold tabular-nums">
                            {rfqCounts.notApproved}
                          </div>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(['All', ...RFQ_STAGES, 'Not Approved'] as const).map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => setRfqFilter(status)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                                rfqFilter === status
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {status === 'All'
                                ? lang === 'fr'
                                  ? 'Tous les stades'
                                  : 'All Stages'
                                : status}
                            </button>
                          ))}
                        </div>
                      </div>

                      {filteredRfqs.length === 0 ? (
                        <div className="py-12 text-center bg-white border border-slate-200 rounded-xl space-y-3">
                          <p className="text-sm font-semibold text-slate-900">
                            {lang === 'fr'
                              ? 'Aucune RFQ trouvée pour ce filtre.'
                              : 'No RFQs match the selected status filter.'}
                          </p>
                          <button
                            type="button"
                            onClick={onOpenNewRfq}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>
                              {lang === 'fr'
                                ? 'Soumettre une nouvelle RFQ'
                                : 'Submit New RFQ / LOI'}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filteredRfqs.map(renderRfqCard)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Shipment Tracking */}
                  {activeTab === 'shipments' && (
                    <div className="space-y-4">
                      {activeShipmentsList.length === 0 ? (
                        <div className="py-12 text-center bg-white border border-slate-200 rounded-xl text-sm text-slate-600">
                          {lang === 'fr'
                            ? 'Aucune expédition active enregistrée.'
                            : 'No active FCL shipments logged yet.'}
                        </div>
                      ) : (
                        activeShipmentsList.map(renderShipmentCard)
                      )}
                    </div>
                  )}

                  {/* Tab 3: Historical Trade Documents */}
                  {activeTab === 'documents' && (
                    <div className="space-y-4">
                      {/* Document Review Status Differentiation Strip */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setDocReviewFilter('all')}
                          className={`p-3 text-left rounded-lg border transition-colors cursor-pointer ${
                            docReviewFilter === 'all'
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-[11px] font-medium opacity-75">
                            {lang === 'fr' ? 'Tous Documents' : 'All Documents'}
                          </div>
                          <div className="font-mono text-lg font-bold tabular-nums">
                            {docCounts.total}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDocReviewFilter('approved')}
                          className={`p-3 text-left rounded-lg border transition-colors cursor-pointer ${
                            docReviewFilter === 'approved'
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-emerald-50/70 text-emerald-950 border-emerald-200 hover:border-emerald-300'
                          }`}
                        >
                          <div className="text-[11px] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {lang === 'fr' ? 'Approuvés / Vérifiés' : 'Approved / Verified'}
                            </span>
                          </div>
                          <div className="font-mono text-lg font-bold tabular-nums">
                            {docCounts.approved}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDocReviewFilter('pending')}
                          className={`p-3 text-left rounded-lg border transition-colors cursor-pointer ${
                            docReviewFilter === 'pending'
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-amber-50/70 text-amber-950 border-amber-200 hover:border-amber-300'
                          }`}
                        >
                          <div className="text-[11px] font-semibold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {lang === 'fr' ? 'En Attente' : 'Pending Review'}
                            </span>
                          </div>
                          <div className="font-mono text-lg font-bold tabular-nums">
                            {docCounts.pending}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDocReviewFilter('not_approved')}
                          className={`p-3 text-left rounded-lg border transition-colors cursor-pointer ${
                            docReviewFilter === 'not_approved'
                              ? 'bg-red-700 text-white border-red-700'
                              : 'bg-red-50/70 text-red-950 border-red-200 hover:border-red-300'
                          }`}
                        >
                          <div className="text-[11px] font-semibold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {lang === 'fr' ? 'Non Approuvés' : 'Not Approved'}
                            </span>
                          </div>
                          <div className="font-mono text-lg font-bold tabular-nums">
                            {docCounts.notApproved}
                          </div>
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {docTypes.map((typeName) => (
                            <button
                              key={typeName}
                              type="button"
                              onClick={() => setDocTypeFilter(typeName)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                                docTypeFilter === typeName
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {typeName}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={showArchivedDocs}
                              onChange={(e) =>
                                setShowArchivedDocs(e.target.checked)
                              }
                              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                            />
                            <span>
                              {lang === 'fr' ? 'Archives' : 'Show Archived'}
                            </span>
                          </label>

                          <div className="relative w-full sm:w-56">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={docSearch}
                              onChange={(e) => setDocSearch(e.target.value)}
                              placeholder={
                                lang === 'fr'
                                  ? 'Code, RFQ...'
                                  : 'Search code, RFQ...'
                              }
                              className="w-full h-9 pl-8 pr-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                        </div>
                      </div>

                      {filteredDocs.length === 0 ? (
                        <div className="py-12 text-center bg-white border border-slate-200 rounded-xl text-sm text-slate-600">
                          {lang === 'fr'
                            ? 'Aucun document correspondant.'
                            : 'No matching trade documents found.'}
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                          {filteredDocs.map((docItem) => {
                            const isExpanded = expandedDocId === docItem.id;
                            const docCategory = getDocReviewCategory(docItem.status);
                            return (
                              <div key={docItem.id} className="p-4 sm:p-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                      <span className="font-mono font-bold text-slate-900">
                                        {docItem.docCode}
                                      </span>
                                      <span className="text-slate-300">·</span>
                                      <span className="font-semibold text-amber-700">
                                        {docItem.docType}
                                      </span>
                                      <span className="text-slate-300">·</span>
                                      <span className="font-mono text-slate-500">
                                        {docItem.issuedDate}
                                      </span>
                                    </div>
                                    <h4 className="font-display text-sm sm:text-base font-bold text-slate-900">
                                      {docItem.title}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                      <span>
                                        {docItem.issuer} · RFQ {docItem.rfqRefId}
                                      </span>
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold border ${
                                          docCategory === 'approved'
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                            : docCategory === 'not_approved'
                                              ? 'bg-red-50 text-red-800 border-red-200'
                                              : docCategory === 'pending'
                                                ? 'bg-amber-50 text-amber-900 border-amber-200'
                                                : 'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}
                                      >
                                        {docCategory === 'approved' ? (
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        ) : docCategory === 'not_approved' ? (
                                          <XCircle className="w-3 h-3 text-red-600" />
                                        ) : docCategory === 'pending' ? (
                                          <Clock className="w-3 h-3 text-amber-600" />
                                        ) : null}
                                        <span>{docItem.status}</span>
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                                    {workspaceMode === 'admin' &&
                                      isAdminUser &&
                                      docCategory === 'pending' && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void adminVerifyTradeDocument(
                                              docItem.id
                                            )
                                          }
                                          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md cursor-pointer"
                                        >
                                          Verify Doc
                                        </button>
                                      )}

                                    {docItem.status !== 'Archived' &&
                                      docItem.buyerUid === user.uid && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void archiveTradeDocument(docItem.id)
                                          }
                                          title="Archive document"
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                                        >
                                          <Archive className="w-3.5 h-3.5" />
                                          <span className="hidden sm:inline">
                                            {lang === 'fr' ? 'Archiver' : 'Archive'}
                                          </span>
                                        </button>
                                      )}

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedDocId(
                                          isExpanded ? null : docItem.id
                                        )
                                      }
                                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                                    >
                                      {isExpanded
                                        ? lang === 'fr'
                                          ? 'Masquer'
                                          : 'Hide'
                                        : lang === 'fr'
                                          ? 'Aperçu'
                                          : 'Preview'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDownloadTradeDocument(docItem)
                                      }
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-amber-500 hover:text-slate-950 rounded-md transition-colors cursor-pointer"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span>.txt</span>
                                    </button>
                                  </div>
                                </div>

                                {docItem.reviewNote && (
                                  <div
                                    className={`mt-2.5 px-3 py-2 rounded-lg border text-xs ${
                                      docCategory === 'not_approved'
                                        ? 'bg-red-50/70 border-red-200 text-red-900'
                                        : 'bg-slate-50 border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    <span className="font-semibold">
                                      {lang === 'fr' ? 'Note Admin : ' : 'Admin Review Note: '}
                                    </span>
                                    <span>{docItem.reviewNote}</span>
                                  </div>
                                )}

                                {isExpanded && (
                                  <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed">
                                    <div className="font-semibold text-slate-900 mb-1">
                                      {docItem.commodity}
                                    </div>
                                    <p>{docItem.summaryText}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
