import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  AlertTriangle,
  Anchor,
  Bell,
  Briefcase,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Database,
  DollarSign,
  Download,
  Edit3,
  FileCheck2,
  FileDown,
  FileText,
  Globe2,
  Landmark,
  Loader2,
  Mail,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  Ship,
  Smartphone,
  Trash2,
  Users,
} from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  DEFAULT_MARKET_CONFIG,
  useBuyerAuth,
  type BuyerRfqDoc,
  type BuyerShipmentDoc,
  type PriceAlertDoc,
  type RfqStatus,
  type ShipmentStatus,
  type TradeDocStatus,
  type TradeDocType,
  type TradeDocumentDoc,
} from '../context/BuyerAuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import type { LithiumIntelRecord } from '../types/lithiumIntel';
import {
  exportManifestQuotePdf,
  exportSchedulePdf,
} from '../utils/pdfQuoteGenerator';
import AdminSyncDrawer from './admin/AdminSyncDrawer';
import AndroidSyncBridgeDrawer from './admin/AndroidSyncBridgeDrawer';
import CrmContactsDirectory from './admin/CrmContactsDirectory';
import CrmEmailDesk from './admin/CrmEmailDesk';
import CrmLeadsWorkspace, {
  type EmailComposerPrefill,
  type LeadFormPrefill,
} from './admin/CrmLeadsWorkspace';
import DuplicateAuditBadge from './admin/DuplicateAuditBadge';
import GeoHeatmapView from './admin/GeoHeatmapView';
import InvestorsFinanceHub from './admin/InvestorsFinanceHub';
import LeadDetailDrawer from './admin/LeadDetailDrawer';
import TradeDocumentStudio from './admin/TradeDocumentStudio';

type AdminSubTab =
  | 'overview'
  | 'crm-leads'
  | 'geo-heatmap'
  | 'investors-hub'
  | 'doc-studio'
  | 'android-bridge'
  | 'crm-emails'
  | 'crm-contacts'
  | 'rates'
  | 'rfqs'
  | 'shipments'
  | 'documents'
  | 'alerts';

const RFQ_STAGES: RfqStatus[] = [
  'Submitted',
  'Under Executive Review',
  'SCO / Proforma Issued',
  'L/C Confirmed',
  'Export Cleared',
];

const SHIPMENT_STAGES: Array<{
  index: number;
  status: ShipmentStatus;
}> = [
  { index: 1, status: 'Mine / Farm Gate' },
  { index: 2, status: 'SGS Assay Verification' },
  { index: 3, status: 'NESS & Customs Cleared' },
  { index: 4, status: 'In Ocean Transit' },
  { index: 5, status: 'Discharged at Port' },
];

const TRADE_DOC_TYPES: TradeDocType[] = [
  'Proforma Invoice',
  'SGS Assay Certificate',
  'Bill of Lading',
  'Certificate of Origin',
  'Phytosanitary Certificate',
  'Form NXP / NESS Clearance',
];

const TRADE_DOC_STATUSES: TradeDocStatus[] = [
  'Verified',
  'Pending Countersignature',
  'Archived',
];

function todaySlash(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

function todayDash(): string {
  return todaySlash().replace(/\//g, '-');
}

export default function AdminWorkspacePanel() {
  const { lang } = useLanguage();
  const {
    user,
    allRfqs,
    allShipments,
    allTradeDocuments,
    allPriceAlerts,
    allBuyers,
    crmContacts,
    crmLeads,
    crmEmails,
    unifiedTradeBook,
    duplicateAudit,
    kpiSummary,
    canonicalProfile,
    marketConfig,
    lastSyncedAt,
    adminUpdateRfq,
    adminDeleteRfq,
    adminCreateShipment,
    adminUpdateShipmentDetails,
    adminDeleteShipment,
    adminCreateTradeDocument,
    adminVerifyTradeDocument,
    adminUpdateTradeDocument,
    adminDeleteTradeDocument,
    adminSaveMarketConfig,
    adminSyncWebActivityToCrm,
    togglePriceAlertStatus,
    deletePriceAlert,
  } = useBuyerAuth();

  const [subTab, setSubTab] = useState<AdminSubTab>('overview');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [syncingWebCrm, setSyncingWebCrm] = useState(false);
  const [showDuplicatePanel, setShowDuplicatePanel] = useState(false);
  const [syncDrawerOpen, setSyncDrawerOpen] = useState(false);

  // Dossier Drawer & Doc Studio Prefill state
  const [selectedIntelRankId, setSelectedIntelRankId] = useState<number | null>(null);
  const [docStudioLead, setDocStudioLead] = useState<LithiumIntelRecord | null>(null);

  const selectedIntelRecord = useMemo(
    () =>
      selectedIntelRankId === null
        ? null
        : unifiedTradeBook.find((r) => r.rankId === selectedIntelRankId) || null,
    [selectedIntelRankId, unifiedTradeBook]
  );

  // Cross-workspace CRM composer/lead prefills
  const [emailPrefill, setEmailPrefill] =
    useState<EmailComposerPrefill | null>(null);
  const [leadPrefill, setLeadPrefill] = useState<LeadFormPrefill | null>(null);

  // Market Rates & Dates Sync draft state
  const [lithiumRateDraft, setLithiumRateDraft] = useState(
    String(marketConfig.lithiumRatePerPercentUsd)
  );
  const [lithiumAssayDraft, setLithiumAssayDraft] = useState(
    String(marketConfig.lithiumAssayPct)
  );
  const [agroDateDraft, setAgroDateDraft] = useState(marketConfig.agroIssueDate);
  const [lubeDateDraft, setLubeDateDraft] = useState(
    marketConfig.lubricantIssueDate
  );
  const [validityDraft, setValidityDraft] = useState(
    String(marketConfig.quoteValidityDays)
  );
  const [fxNgnDraft, setFxNgnDraft] = useState(String(marketConfig.fxNgnPerUsd));
  const [fxXofDraft, setFxXofDraft] = useState(String(marketConfig.fxXofPerUsd));
  const [noticeDraft, setNoticeDraft] = useState(marketConfig.adminNotice);
  const [savingRates, setSavingRates] = useState(false);

  useEffect(() => {
    setLithiumRateDraft(String(marketConfig.lithiumRatePerPercentUsd));
    setLithiumAssayDraft(String(marketConfig.lithiumAssayPct));
    setAgroDateDraft(marketConfig.agroIssueDate);
    setLubeDateDraft(marketConfig.lubricantIssueDate);
    setValidityDraft(String(marketConfig.quoteValidityDays));
    setFxNgnDraft(String(marketConfig.fxNgnPerUsd));
    setFxXofDraft(String(marketConfig.fxXofPerUsd));
    setNoticeDraft(marketConfig.adminNotice);
  }, [marketConfig]);

  // RFQ Admin State
  const [rfqQuery, setRfqQuery] = useState('');
  const [rfqStatusFilter, setRfqStatusFilter] = useState<'All' | RfqStatus>('All');
  const [editingRfqId, setEditingRfqId] = useState<string | null>(null);
  const [rfqEditDraft, setRfqEditDraft] = useState<{
    status: RfqStatus;
    destinationPort: string;
    targetVolume: string;
    estimatedValueUsd: string;
    specifications: string;
  }>({
    status: 'Submitted',
    destinationPort: '',
    targetVolume: '',
    estimatedValueUsd: '',
    specifications: '',
  });
  const [savingRfqId, setSavingRfqId] = useState<string | null>(null);
  const [exportingPdfId, setExportingPdfId] = useState<string | null>(null);

  // Shipment Admin State
  const [showCreateShipment, setShowCreateShipment] = useState(false);
  const [newShipDraft, setNewShipDraft] = useState({
    buyerUid: user?.uid || '',
    trackingCode: `AHT-SHP-${String(Date.now()).slice(-5)}`,
    rfqRefId: 'AHT-RFQ-65197A',
    commodity: 'Lithium-Bearing Spodumene Ore (4.61% Li2O)',
    originPort: 'Apapa Wharf, Lagos',
    destinationPort: 'Qingdao, China',
    vesselName: 'MV Atlantic Meridian',
    billOfLadingNo: `MAEU-APP-${String(Date.now()).slice(-6)}`,
    containerAllocation: '2 × 20ft FCL (54 MT Net)',
    stageIndex: 1,
    status: 'Mine / Farm Gate' as ShipmentStatus,
    etaDate: todayDash(),
    lastUpdateNote:
      'Lot allocated at origin warehouse; SGS composite assay sampling scheduled.',
  });
  const [creatingShipment, setCreatingShipment] = useState(false);
  const [editingShipId, setEditingShipId] = useState<string | null>(null);
  const [shipEditDraft, setShipEditDraft] = useState({
    stageIndex: 1,
    status: 'Mine / Farm Gate' as ShipmentStatus,
    vesselName: '',
    billOfLadingNo: '',
    containerAllocation: '',
    etaDate: '',
    lastUpdateNote: '',
  });
  const [savingShipId, setSavingShipId] = useState<string | null>(null);

  // Trade Document Admin State
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [newDocDraft, setNewDocDraft] = useState({
    buyerUid: user?.uid || '',
    docCode: `AHT-DOC-${String(Date.now()).slice(-5)}`,
    title: 'Signed Proforma Invoice & Export Schedule',
    docType: 'Proforma Invoice' as TradeDocType,
    rfqRefId: 'AHT-RFQ-65197A',
    commodity: 'Lithium-Bearing Ore / Agro-Export Lot',
    issuer: 'Ahzan Tech Ltd · Executive Trade Desk',
    issuedDate: todayDash(),
    status: 'Verified' as TradeDocStatus,
    summaryText:
      'Formal export documentation issued under RC 2012723 and MCO Licence 65197 EL, subject to SGS pre-shipment inspection and ICC Incoterms 2020.',
  });
  const [creatingDoc, setCreatingDoc] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docEditDraft, setDocEditDraft] = useState({
    status: 'Verified' as TradeDocStatus,
    summaryText: '',
  });
  const [savingDocId, setSavingDocId] = useState<string | null>(null);

  // Alerts Admin State
  const [alertCategoryFilter, setAlertCategoryFilter] = useState('All');
  const [alertStatusFilter, setAlertStatusFilter] = useState<
    'All' | 'Active' | 'Paused'
  >('All');

  const notify = (msg: string) => {
    setErrorMsg(null);
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleOpenEmailFromWorkspace = (prefill: EmailComposerPrefill) => {
    setEmailPrefill(prefill);
    setSubTab('crm-emails');
  };

  const handleCreateLeadFromContact = (prefill: LeadFormPrefill) => {
    setLeadPrefill(prefill);
    setSubTab('crm-leads');
  };

  const handleOpenInDocStudio = (record: LithiumIntelRecord) => {
    setSelectedIntelRankId(null);
    setDocStudioLead(record);
    setSubTab('doc-studio');
  };

  const handleGlobalSyncWebToCrm = async () => {
    setSyncingWebCrm(true);
    setErrorMsg(null);
    try {
      const res = await adminSyncWebActivityToCrm();
      notify(
        `Web-to-CRM Sync complete: ${res.contactsAdded} new contact(s) & ${res.leadsAdded} new lead(s) added from RFQs and Price Alerts.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to sync web activity to CRM.'
      );
    } finally {
      setSyncingWebCrm(false);
    }
  };

  // Computed Admin KPIs
  const totalRfqPipelineUsd = useMemo(
    () =>
      allRfqs.reduce(
        (sum, rfq) =>
          sum + (typeof rfq.estimatedValueUsd === 'number' ? rfq.estimatedValueUsd : 0),
        0
      ),
    [allRfqs]
  );

  const crmActivePipelineUsd = useMemo(
    () =>
      crmLeads
        .filter((l) => l.stage !== 'Lost / Archived')
        .reduce((sum, l) => sum + (l.dealValueUsd || 0), 0),
    [crmLeads]
  );

  const crmOpenLeadsCount = useMemo(
    () =>
      crmLeads.filter(
        (l) => l.stage !== 'Lost / Archived' && l.stage !== 'Won / Contracted'
      ).length,
    [crmLeads]
  );

  const upcomingFollowUps = useMemo(
    () =>
      [...crmLeads]
        .filter(
          (l) =>
            l.stage !== 'Lost / Archived' &&
            l.stage !== 'Won / Contracted' &&
            Boolean(l.followUpDate)
        )
        .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate))
        .slice(0, 5),
    [crmLeads]
  );

  const activeAlertsCount = useMemo(
    () => allPriceAlerts.filter((a) => a.status === 'Active').length,
    [allPriceAlerts]
  );

  const pendingDocsCount = useMemo(
    () =>
      allTradeDocuments.filter((d) => d.status === 'Pending Countersignature')
        .length,
    [allTradeDocuments]
  );

  const knownBuyers = useMemo(() => {
    const map = new Map<string, string>();
    allRfqs.forEach((r) => {
      if (!map.has(r.buyerUid)) {
        map.set(r.buyerUid, `${r.companyName} (${r.corporateEmail})`);
      }
    });
    if (user?.uid && !map.has(user.uid)) {
      map.set(user.uid, `${user.displayName || 'Executive Account'} (${user.email})`);
    }
    return Array.from(map.entries());
  }, [allRfqs, user]);

  const filteredRfqs = useMemo(() => {
    const q = rfqQuery.trim().toLowerCase();
    return allRfqs.filter((r) => {
      if (rfqStatusFilter !== 'All' && r.status !== rfqStatusFilter) return false;
      if (!q) return true;
      return (
        r.refId.toLowerCase().includes(q) ||
        r.companyName.toLowerCase().includes(q) ||
        r.corporateEmail.toLowerCase().includes(q) ||
        r.commoditySummary.toLowerCase().includes(q) ||
        r.destinationPort.toLowerCase().includes(q)
      );
    });
  }, [allRfqs, rfqQuery, rfqStatusFilter]);

  const filteredAlerts = useMemo(() => {
    return allPriceAlerts.filter((a) => {
      if (alertCategoryFilter !== 'All' && a.category !== alertCategoryFilter) {
        return false;
      }
      if (alertStatusFilter !== 'All' && a.status !== alertStatusFilter) {
        return false;
      }
      return true;
    });
  }, [allPriceAlerts, alertCategoryFilter, alertStatusFilter]);

  const syncJsonSnippet = useMemo(
    () =>
      JSON.stringify(
        {
          projectId: firebaseConfig.projectId,
          firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
          authDomain: firebaseConfig.authDomain,
          collections: [
            'crmContacts/{contactId}',
            'crmLeads/{leadId}',
            'crmEmails/{emailId}',
            'buyers/{buyerId}',
            'rfqs/{rfqId}',
            'shipments/{shipmentId}',
            'tradeDocuments/{docId}',
            'priceAlerts/{alertId}',
            'siteConfig/market',
          ],
        },
        null,
        2
      ),
    []
  );

  const fundingCount = useMemo(
    () => unifiedTradeBook.filter((r) => r.leadCategory === 'FUNDING_FINANCE').length,
    [unifiedTradeBook]
  );

  const navGroups: Array<{
    groupLabel: string;
    items: Array<{
      id: AdminSubTab;
      label: string;
      count?: number;
      icon: typeof Database;
    }>;
  }> = [
    {
      groupLabel: 'Command Center',
      items: [
        { id: 'overview', label: 'Overview & Sync', icon: Database },
        { id: 'geo-heatmap', label: 'Europe & APAC Heatmap', count: 14, icon: Globe2 },
        { id: 'investors-hub', label: 'Investors & Grants', count: fundingCount, icon: Landmark },
      ],
    },
    {
      groupLabel: 'CRM Workspace',
      items: [
        {
          id: 'crm-leads',
          label: 'Trade Book & Pipeline',
          count: unifiedTradeBook.length,
          icon: Briefcase,
        },
        {
          id: 'crm-emails',
          label: 'Email Command Desk',
          count: crmEmails.length,
          icon: Mail,
        },
        {
          id: 'crm-contacts',
          label: 'Contacts Directory',
          count: crmContacts.length,
          icon: Users,
        },
        {
          id: 'android-bridge',
          label: 'Android Sync Bridge',
          icon: Smartphone,
        },
      ],
    },
    {
      groupLabel: 'Trade & Market Ops',
      items: [
        { id: 'doc-studio', label: 'Trade Doc Studio', count: 7, icon: FileText },
        { id: 'rates', label: 'Rates & Dates', icon: Calendar },
        { id: 'rfqs', label: 'RFQs & Quotes', count: allRfqs.length, icon: ClipboardList },
        {
          id: 'shipments',
          label: 'FCL Shipments',
          count: allShipments.length,
          icon: Ship,
        },
        {
          id: 'documents',
          label: 'Trade Vault',
          count: allTradeDocuments.length,
          icon: FileCheck2,
        },
        {
          id: 'alerts',
          label: 'Price Alerts',
          count: allPriceAlerts.length,
          icon: Bell,
        },
      ],
    },
  ];

  // Handlers
  const handleSaveRates = async (e: FormEvent) => {
    e.preventDefault();
    setSavingRates(true);
    setErrorMsg(null);
    try {
      await adminSaveMarketConfig({
        lithiumRatePerPercentUsd:
          Number(lithiumRateDraft) || DEFAULT_MARKET_CONFIG.lithiumRatePerPercentUsd,
        lithiumAssayPct:
          Number(lithiumAssayDraft) || DEFAULT_MARKET_CONFIG.lithiumAssayPct,
        agroIssueDate: agroDateDraft.trim() || DEFAULT_MARKET_CONFIG.agroIssueDate,
        lubricantIssueDate:
          lubeDateDraft.trim() || DEFAULT_MARKET_CONFIG.lubricantIssueDate,
        quoteValidityDays:
          Number(validityDraft) || DEFAULT_MARKET_CONFIG.quoteValidityDays,
        fxNgnPerUsd: Number(fxNgnDraft) || DEFAULT_MARKET_CONFIG.fxNgnPerUsd,
        fxXofPerUsd: Number(fxXofDraft) || DEFAULT_MARKET_CONFIG.fxXofPerUsd,
        adminNotice: noticeDraft,
      });
      notify(
        lang === 'fr'
          ? 'Tarifs, dates et taux de change synchronisés avec Firestore.'
          : 'Live commodity rates, issue dates, and FX benchmarks published & synced.'
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to save market configuration.'
      );
    } finally {
      setSavingRates(false);
    }
  };

  const handleResetDefaultRates = () => {
    setLithiumRateDraft(String(DEFAULT_MARKET_CONFIG.lithiumRatePerPercentUsd));
    setLithiumAssayDraft(String(DEFAULT_MARKET_CONFIG.lithiumAssayPct));
    setAgroDateDraft(DEFAULT_MARKET_CONFIG.agroIssueDate);
    setLubeDateDraft(DEFAULT_MARKET_CONFIG.lubricantIssueDate);
    setValidityDraft(String(DEFAULT_MARKET_CONFIG.quoteValidityDays));
    setFxNgnDraft(String(DEFAULT_MARKET_CONFIG.fxNgnPerUsd));
    setFxXofDraft(String(DEFAULT_MARKET_CONFIG.fxXofPerUsd));
    setNoticeDraft('');
  };

  const handleStartEditRfq = (rfq: BuyerRfqDoc) => {
    setEditingRfqId(rfq.id);
    setRfqEditDraft({
      status: rfq.status,
      destinationPort: rfq.destinationPort,
      targetVolume: rfq.targetVolume,
      estimatedValueUsd:
        typeof rfq.estimatedValueUsd === 'number' ? String(rfq.estimatedValueUsd) : '',
      specifications: rfq.specifications || '',
    });
  };

  const handleSaveRfqEdit = async (rfqId: string) => {
    setSavingRfqId(rfqId);
    setErrorMsg(null);
    try {
      const parsedVal = rfqEditDraft.estimatedValueUsd.trim()
        ? Number(rfqEditDraft.estimatedValueUsd)
        : undefined;
      await adminUpdateRfq(rfqId, {
        status: rfqEditDraft.status,
        destinationPort: rfqEditDraft.destinationPort,
        targetVolume: rfqEditDraft.targetVolume,
        specifications: rfqEditDraft.specifications,
        estimatedValueUsd: Number.isFinite(parsedVal) ? parsedVal : undefined,
      });
      setEditingRfqId(null);
      notify('RFQ record updated and synchronized.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update RFQ.');
    } finally {
      setSavingRfqId(null);
    }
  };

  const handleConvertRfqToShipment = (rfq: BuyerRfqDoc) => {
    setNewShipDraft({
      buyerUid: rfq.buyerUid,
      trackingCode: `AHT-SHP-${String(Date.now()).slice(-5)}`,
      rfqRefId: rfq.refId,
      commodity: rfq.commoditySummary.slice(0, 180),
      originPort: 'Apapa Wharf, Lagos',
      destinationPort: rfq.destinationPort,
      vesselName: 'MV Atlantic Meridian',
      billOfLadingNo: `MAEU-APP-${String(Date.now()).slice(-6)}`,
      containerAllocation: rfq.targetVolume.slice(0, 80),
      stageIndex: 2,
      status: 'SGS Assay Verification',
      etaDate: todayDash(),
      lastUpdateNote: `Dispatched from RFQ ${rfq.refId} (${rfq.companyName}). SGS pre-shipment sampling initiated.`,
    });
    setSubTab('shipments');
    setShowCreateShipment(true);
  };

  const handleCreateShipment = async (e: FormEvent) => {
    e.preventDefault();
    setCreatingShipment(true);
    setErrorMsg(null);
    try {
      await adminCreateShipment(newShipDraft);
      setShowCreateShipment(false);
      setNewShipDraft((prev) => ({
        ...prev,
        trackingCode: `AHT-SHP-${String(Date.now()).slice(-5)}`,
        billOfLadingNo: `MAEU-APP-${String(Date.now()).slice(-6)}`,
      }));
      notify('New FCL shipment dispatched and synced to buyer portal.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create shipment.');
    } finally {
      setCreatingShipment(false);
    }
  };

  const handleStartEditShipment = (s: BuyerShipmentDoc) => {
    setEditingShipId(s.id);
    setShipEditDraft({
      stageIndex: s.stageIndex,
      status: s.status,
      vesselName: s.vesselName,
      billOfLadingNo: s.billOfLadingNo,
      containerAllocation: s.containerAllocation,
      etaDate: s.etaDate,
      lastUpdateNote: s.lastUpdateNote,
    });
  };

  const handleSaveShipmentEdit = async (shipmentId: string) => {
    setSavingShipId(shipmentId);
    setErrorMsg(null);
    try {
      await adminUpdateShipmentDetails(shipmentId, shipEditDraft);
      setEditingShipId(null);
      notify('Shipment milestone, vessel, B/L & ETA updated.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update shipment.');
    } finally {
      setSavingShipId(null);
    }
  };

  const handleCreateTradeDoc = async (e: FormEvent) => {
    e.preventDefault();
    setCreatingDoc(true);
    setErrorMsg(null);
    try {
      await adminCreateTradeDocument(newDocDraft);
      setShowCreateDoc(false);
      setNewDocDraft((prev) => ({
        ...prev,
        docCode: `AHT-DOC-${String(Date.now()).slice(-5)}`,
      }));
      notify('Official trade document issued to buyer vault.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to issue trade document.');
    } finally {
      setCreatingDoc(false);
    }
  };

  const handleStartEditDoc = (d: TradeDocumentDoc) => {
    setEditingDocId(d.id);
    setDocEditDraft({
      status: d.status,
      summaryText: d.summaryText,
    });
  };

  const handleSaveDocEdit = async (docId: string) => {
    setSavingDocId(docId);
    setErrorMsg(null);
    try {
      await adminUpdateTradeDocument(docId, docEditDraft);
      setEditingDocId(null);
      notify('Trade document updated.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update document.');
    } finally {
      setSavingDocId(null);
    }
  };

  const handleExportSnapshotJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId,
      marketConfig,
      crmContacts,
      crmLeads,
      crmEmails,
      rfqs: allRfqs,
      shipments: allShipments,
      tradeDocuments: allTradeDocuments,
      priceAlerts: allPriceAlerts,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AhzanTech-CommandCenter-${todayDash()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportRfqsCsv = () => {
    const header = [
      'RefID',
      'Company',
      'Contact',
      'Email',
      'DestinationPort',
      'Commodity',
      'Volume',
      'Incoterm',
      'EstimatedUSD',
      'Status',
    ];
    const escapeCell = (v: string | number | undefined) =>
      `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = allRfqs.map((r) =>
      [
        r.refId,
        r.companyName,
        r.contactName,
        r.corporateEmail,
        r.destinationPort,
        r.commoditySummary,
        r.targetVolume,
        r.incoterm,
        r.estimatedValueUsd ?? '',
        r.status,
      ]
        .map(escapeCell)
        .join(',')
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AhzanTech-RFQs-${todayDash()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Executive Command Center Header Strip */}
      <div className="p-4 bg-slate-950 text-white rounded-lg border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-emerald-400">
            <Activity className="w-3.5 h-3.5" />
            <span>
              {lang === 'fr'
                ? 'LITHIUM INTEL COMMAND CENTER · SYNC ANDROID & FIRESTORE'
                : 'AHZAN TECH LITHIUM INTEL COMMAND CENTER · TWO-WAY ANDROID SYNC'}
            </span>
          </div>
          <h3 className="font-display text-base sm:text-lg font-bold text-white">
            {canonicalProfile.companyName} · {canonicalProfile.miningCadastreId} ({canonicalProfile.verifiedLi2OPct}% Li2O) · {unifiedTradeBook.length} Partner Records
          </h3>
          <p className="text-[11px] text-slate-400 font-mono">
            DB: {firebaseConfig.projectId} / {firebaseConfig.firestoreDatabaseId}
            {lastSyncedAt ? ` · Synced ${lastSyncedAt.toLocaleTimeString()}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <DuplicateAuditBadge
            records={unifiedTradeBook}
            extraBuyers={allBuyers}
            auditSummary={duplicateAudit}
            variant="dark"
            expanded={showDuplicatePanel}
            onToggle={() => setShowDuplicatePanel((prev) => !prev)}
            showInlinePanel={false}
          />

          <button
            type="button"
            onClick={() => setSyncDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
            <span>Sync Drawer</span>
          </button>

          <button
            type="button"
            disabled={syncingWebCrm}
            onClick={() => void handleGlobalSyncWebToCrm()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${syncingWebCrm ? 'animate-spin' : ''}`}
            />
            <span>Sync Web → CRM</span>
          </button>
          <button
            type="button"
            onClick={handleExportRfqsCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>RFQs CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportSnapshotJson}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Full JSON</span>
          </button>
        </div>
      </div>

      {/* Expandable DuplicateAuditBadge Panel */}
      {showDuplicatePanel && (
        <DuplicateAuditBadge
          records={unifiedTradeBook}
          extraBuyers={allBuyers}
          auditSummary={duplicateAudit}
          variant="light"
          expanded={showDuplicatePanel}
          onToggle={() => setShowDuplicatePanel(false)}
          onInspectRecord={(rec) => {
            setShowDuplicatePanel(false);
            setSelectedIntelRankId(rec.rankId);
          }}
        />
      )}

      {/* Executive Command Center Live KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3 bg-white border border-slate-200 rounded-lg">
          <div className="text-[11px] font-medium text-slate-500">Weighted Pipeline USD</div>
          <div className="font-mono text-lg font-bold text-slate-900 mt-0.5 tabular-nums">
            ${kpiSummary.totalWeightedUsd.toLocaleString('en-US')}
          </div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-lg">
          <div className="text-[11px] font-medium text-slate-500">Closed Won USD</div>
          <div className="font-mono text-lg font-bold text-emerald-700 mt-0.5 tabular-nums">
            ${kpiSummary.closedWonUsd.toLocaleString('en-US')}
          </div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-lg">
          <div className="text-[11px] font-medium text-slate-500">Open Follow-Up Tasks</div>
          <div className="font-mono text-lg font-bold text-slate-900 mt-0.5 tabular-nums">
            {kpiSummary.openTasksCount}{' '}
            <span className={`text-xs ${kpiSummary.overdueTasksCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
              ({kpiSummary.overdueTasksCount} overdue)
            </span>
          </div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-lg">
          <div className="text-[11px] font-medium text-slate-500">Quotes &amp; Docs Sent</div>
          <div className="font-mono text-lg font-bold text-slate-900 mt-0.5 tabular-nums">
            {kpiSummary.quotesSentCount}
          </div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-lg col-span-2 sm:col-span-1">
          <div className="text-[11px] font-medium text-slate-500">Active Commercial Deals</div>
          <div className="font-mono text-lg font-bold text-amber-700 mt-0.5 tabular-nums">
            {kpiSummary.activeDealsCount} / {unifiedTradeBook.length}
          </div>
        </div>
      </div>

      {/* Feedback / Error Alerts */}
      {feedback && (
        <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}
      {errorMsg && (
        <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Responsive Mobile/Tablet Horizontal Navigation (< lg) */}
      <div
        role="tablist"
        aria-label="Command Center Sections Mobile"
        className="lg:hidden flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-200/70 border border-slate-300/80 rounded-lg"
      >
        {navGroups
          .flatMap((g) => g.items)
          .map((item) => {
            const Icon = item.icon;
            const active = subTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSubTab(item.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-slate-950 text-white'
                    : 'text-slate-700 hover:bg-white/80'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    active ? 'text-amber-400' : 'text-slate-500'
                  }`}
                />
                <span>{item.label}</span>
                {typeof item.count === 'number' && (
                  <span className="font-mono text-[11px] opacity-80">
                    ({item.count})
                  </span>
                )}
              </button>
            );
          })}
      </div>

      {/* Desktop 240px Sidebar + Fluid Workspace Canvas */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <aside
          aria-label="Executive Command Center Navigation"
          className="hidden lg:flex flex-col w-60 shrink-0 bg-white border border-slate-200 rounded-lg p-3 space-y-4 sticky top-0"
        >
          {navGroups.map((group) => (
            <div key={group.groupLabel} className="space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.groupLabel}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = subTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSubTab(item.id)}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-950 text-white'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0 truncate">
                      <Icon
                        className={`w-3.5 h-3.5 shrink-0 ${
                          active ? 'text-amber-400' : 'text-slate-500'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {typeof item.count === 'number' && (
                      <span
                        className={`font-mono text-[11px] tabular-nums ${
                          active ? 'text-amber-300' : 'text-slate-400'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        {/* Main Active Workspace Viewport */}
        <div className="flex-1 min-w-0 w-full">
          {/* 1. OVERVIEW & COMPANION SYNC */}
          {subTab === 'overview' && (
            <div className="space-y-5">
              {/* Top 4 CRM Command Center KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
                <button
                  type="button"
                  onClick={() => setSubTab('crm-leads')}
                  className="p-4 text-left bg-white border border-slate-200 hover:border-slate-300 rounded-lg cursor-pointer"
                >
                  <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                    <span>CRM Pipeline Value</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                    ${crmActivePipelineUsd.toLocaleString('en-US')}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {crmOpenLeadsCount} open lead(s) · {crmLeads.length} total
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSubTab('crm-contacts')}
                  className="p-4 text-left bg-white border border-slate-200 hover:border-slate-300 rounded-lg cursor-pointer"
                >
                  <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-700" />
                    <span>Contacts Directory</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                    {crmContacts.length}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {crmContacts.filter((c) => c.segment === 'Offtaker').length} offtakers synced
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSubTab('crm-emails')}
                  className="p-4 text-left bg-white border border-slate-200 hover:border-slate-300 rounded-lg cursor-pointer"
                >
                  <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-600" />
                    <span>CRM Email Threads</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                    {crmEmails.length}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {crmEmails.filter((m) => m.status === 'Draft').length} draft(s) ·{' '}
                    {crmEmails.filter((m) => m.direction === 'Outbound').length} outbound
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSubTab('rfqs')}
                  className="p-4 text-left bg-white border border-slate-200 hover:border-slate-300 rounded-lg cursor-pointer"
                >
                  <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Website RFQ Desk</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                    ${totalRfqPipelineUsd.toLocaleString('en-US')}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {allRfqs.length} RFQs · {allShipments.length} FCL · {pendingDocsCount} pending docs
                  </p>
                </button>
              </div>

              {/* Actionable Follow-Ups + Recent Emails */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <div className="xl:col-span-6 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-amber-600" />
                      <span>CRM Lead Follow-Up Queue</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setSubTab('crm-leads')}
                      className="text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
                    >
                      Open Pipeline
                    </button>
                  </div>

                  {upcomingFollowUps.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-md">
                      No open follow-ups scheduled. Add a lead or sync Website RFQs &amp; Alerts into CRM.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {upcomingFollowUps.map((lead) => (
                        <div
                          key={lead.id}
                          className="py-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {lead.title}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {lead.companyName} · {lead.stage} ·{' '}
                              <span className="font-mono">{lead.followUpDate}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono font-bold text-emerald-700 tabular-nums">
                              ${lead.dealValueUsd.toLocaleString('en-US')}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenEmailFromWorkspace({
                                  toEmail: lead.email,
                                  contactName: lead.contactName,
                                  companyName: lead.companyName,
                                  leadId: lead.id,
                                  subject: `Follow-Up: ${lead.title}`,
                                })
                              }
                              className="p-1.5 text-slate-700 bg-slate-100 hover:bg-amber-100 rounded cursor-pointer"
                              title="Email Lead"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="xl:col-span-6 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-amber-600" />
                      <span>Recent Email Desk Activity</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setSubTab('crm-emails')}
                      className="text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
                    >
                      Compose Email
                    </button>
                  </div>

                  {crmEmails.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-md">
                      No email threads logged yet. Open Email Command Desk to send quotes or log correspondence.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {crmEmails.slice(0, 5).map((mail) => (
                        <div
                          key={mail.id}
                          className="py-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {mail.subject}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate font-mono">
                              {mail.direction} ({mail.status}) · {mail.companyName} ·{' '}
                              {mail.sentDate}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Synced Market Benchmarks + Shared Firestore Companion Config */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <div className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-display text-sm font-bold text-slate-900">
                      Live Synced Dates &amp; Benchmarks
                    </h4>
                    <button
                      type="button"
                      onClick={() => setSubTab('rates')}
                      className="text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
                    >
                      Edit Rates
                    </button>
                  </div>
                  <dl className="divide-y divide-slate-100 text-xs">
                    <div className="py-2 flex items-center justify-between gap-2">
                      <dt className="text-slate-500">Lithium Ore Rate</dt>
                      <dd className="font-mono font-bold text-slate-900 tabular-nums">
                        ${marketConfig.lithiumRatePerPercentUsd.toFixed(2)} / % Li2O (
                        {marketConfig.lithiumAssayPct}%)
                      </dd>
                    </div>
                    <div className="py-2 flex items-center justify-between gap-2">
                      <dt className="text-slate-500">Agro List Issue Date</dt>
                      <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                        {marketConfig.agroIssueDate}
                      </dd>
                    </div>
                    <div className="py-2 flex items-center justify-between gap-2">
                      <dt className="text-slate-500">Lubricants Issue Date</dt>
                      <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                        {marketConfig.lubricantIssueDate}
                      </dd>
                    </div>
                    <div className="py-2 flex items-center justify-between gap-2">
                      <dt className="text-slate-500">FX Benchmarks</dt>
                      <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                        ₦{marketConfig.fxNgnPerUsd} / {marketConfig.fxXofPerUsd} XOF
                      </dd>
                    </div>
                    <div className="py-2 flex items-center justify-between gap-2">
                      <dt className="text-slate-500">Quote Validity &amp; Alerts</dt>
                      <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                        {marketConfig.quoteValidityDays} Days · {activeAlertsCount} Alerts
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="xl:col-span-7 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-display text-sm font-bold text-slate-900">
                      Companion App Sync Schema (Bidirectional Cloud Firestore)
                    </h4>
                    <button
                      type="button"
                      onClick={() => void handleCopy('sync-json', syncJsonSnippet)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                    >
                      {copiedKey === 'sync-json' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>{copiedKey === 'sync-json' ? 'Copied' : 'Copy Config'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Connect your companion AI Studio workspace (
                    <span className="font-mono">
                      fbcac233-2db2-4d11-82dd-bb542a229162
                    </span>
                    ) to this exact Firebase project, database ID, and CRM/Trade collections so every Lead, Contact, Email, RFQ, and Market Date stays synchronized both ways in real time:
                  </p>
                  <pre className="p-3 bg-slate-950 text-amber-300 font-mono text-[11px] rounded-md overflow-x-auto leading-relaxed">
                    {syncJsonSnippet}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* 2. CRM LEADS & PIPELINE */}
          {subTab === 'crm-leads' && (
            <CrmLeadsWorkspace
              onOpenEmailComposer={handleOpenEmailFromWorkspace}
              onNotify={notify}
              onError={setErrorMsg}
              initialPrefill={leadPrefill}
              onConsumePrefill={() => setLeadPrefill(null)}
              onSelectRecord={(rec) => setSelectedIntelRankId(rec.rankId)}
              onOpenInDocStudio={handleOpenInDocStudio}
              onOpenSyncBridge={() => setSyncDrawerOpen(true)}
            />
          )}

          {/* 2b. EUROPE & ASIA-PACIFIC GEOGRAPHIC HEATMAP */}
          {subTab === 'geo-heatmap' && (
            <GeoHeatmapView
              onSelectLead={(rec) => setSelectedIntelRankId(rec.rankId)}
              onOpenEmailComposer={handleOpenEmailFromWorkspace}
            />
          )}

          {/* 2c. INVESTORS, BANKS & GRANTS HUB */}
          {subTab === 'investors-hub' && (
            <InvestorsFinanceHub
              onSelectLead={(rec) => setSelectedIntelRankId(rec.rankId)}
              onOpenEmailComposer={handleOpenEmailFromWorkspace}
              onNotify={notify}
              onError={setErrorMsg}
            />
          )}

          {/* 2d. TRADE DOCUMENT STUDIO (4 CATALOGS / 1,024 SKUs / 7 PDF TEMPLATES) */}
          {subTab === 'doc-studio' && (
            <TradeDocumentStudio
              initialLead={docStudioLead}
              onConsumeLead={() => setDocStudioLead(null)}
              onNotify={notify}
              onError={setErrorMsg}
            />
          )}

          {/* 2e. ANDROID TWO-WAY SYNC BRIDGE */}
          {subTab === 'android-bridge' && (
            <AndroidSyncBridgeDrawer onNotify={notify} onError={setErrorMsg} />
          )}

          {/* 3. CRM EMAIL COMMAND DESK */}
          {subTab === 'crm-emails' && (
            <CrmEmailDesk
              prefill={emailPrefill}
              onClearPrefill={() => setEmailPrefill(null)}
              onNotify={notify}
              onError={setErrorMsg}
            />
          )}

          {/* 4. CRM CONTACTS DIRECTORY */}
          {subTab === 'crm-contacts' && (
            <CrmContactsDirectory
              onOpenEmailComposer={handleOpenEmailFromWorkspace}
              onCreateLeadForContact={handleCreateLeadFromContact}
              onNotify={notify}
              onError={setErrorMsg}
            />
          )}

          {/* 5. RATES, SCHEDULE DATES & FX SYNC */}
          {subTab === 'rates' && (
            <form
              onSubmit={(e) => void handleSaveRates(e)}
              className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <h4 className="font-display text-base font-bold text-slate-900">
                    Publish Live Commodity Rates, Schedule Dates &amp; FX Benchmarks
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Stored in <span className="font-mono">/siteConfig/market</span>{' '}
                    and synced immediately to all public schedules and signed PDF quote exports.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetDefaultRates}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Defaults</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void exportSchedulePdf('minerals', lang, {
                        lithiumRatePerPercentUsd: Number(lithiumRateDraft) || 207,
                        lithiumAssayPct: Number(lithiumAssayDraft) || 4.61,
                        agroIssueDate: agroDateDraft,
                        lubricantIssueDate: lubeDateDraft,
                        quoteValidityDays: Number(validityDraft) || 10,
                        fxNgnPerUsd: Number(fxNgnDraft) || 1390,
                        fxXofPerUsd: Number(fxXofDraft) || 584.46,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Test Mineral Quote PDF</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lithium Rate (USD / 1% Li2O / MT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={1}
                    max={100000}
                    required
                    value={lithiumRateDraft}
                    onChange={(e) => setLithiumRateDraft(e.target.value)}
                    className="w-full h-10 px-3 text-sm font-mono text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Verified Assay Grade (% Li2O · ZMGN057)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0.1}
                    max={100}
                    required
                    value={lithiumAssayDraft}
                    onChange={(e) => setLithiumAssayDraft(e.target.value)}
                    className="w-full h-10 px-3 text-sm font-mono text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quote Validity Window (Calendar Days)
                  </label>
                  <input
                    type="number"
                    step={1}
                    min={1}
                    max={365}
                    required
                    value={validityDraft}
                    onChange={(e) => setValidityDraft(e.target.value)}
                    className="w-full h-10 px-3 text-sm font-mono text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Agro Price List Issue Date
                    </label>
                    <button
                      type="button"
                      onClick={() => setAgroDateDraft(todaySlash())}
                      className="text-[11px] font-semibold text-amber-700 hover:underline cursor-pointer"
                    >
                      Today ({todaySlash()})
                    </button>
                  </div>
                  <input
                    type="text"
                    minLength={4}
                    maxLength={40}
                    required
                    value={agroDateDraft}
                    onChange={(e) => setAgroDateDraft(e.target.value)}
                    className="w-full h-10 px-3 text-sm font-mono text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Lubricant List Issue Date
                    </label>
                    <button
                      type="button"
                      onClick={() => setLubeDateDraft(todaySlash())}
                      className="text-[11px] font-semibold text-amber-700 hover:underline cursor-pointer"
                    >
                      Today ({todaySlash()})
                    </button>
                  </div>
                  <input
                    type="text"
                    minLength={4}
                    maxLength={40}
                    required
                    value={lubeDateDraft}
                    onChange={(e) => setLubeDateDraft(e.target.value)}
                    className="w-full h-10 px-3 text-sm font-mono text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      1 USD = NGN (₦)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={1}
                      max={1000000}
                      required
                      value={fxNgnDraft}
                      onChange={(e) => setFxNgnDraft(e.target.value)}
                      className="w-full h-10 px-2.5 text-sm font-mono text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      1 USD = XOF
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={1}
                      max={1000000}
                      required
                      value={fxXofDraft}
                      onChange={(e) => setFxXofDraft(e.target.value)}
                      className="w-full h-10 px-2.5 text-sm font-mono text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Executive Schedule Notice Banner (Optional · displayed on live Price Schedules)
                </label>
                <input
                  type="text"
                  maxLength={320}
                  value={noticeDraft}
                  onChange={(e) => setNoticeDraft(e.target.value)}
                  placeholder="e.g., Q4 Lagos Wharf allocation window open — SGS lot ZMGN057 ready for immediate L/C booking."
                  className="w-full h-10 px-3 text-xs text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={savingRates}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 rounded-lg cursor-pointer"
                >
                  {savingRates ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>
                    {savingRates
                      ? 'Publishing to Firestore...'
                      : 'Publish & Sync Live Across App'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* 6. ALL BUYER RFQs & CONVERT TO SHIPMENT */}
          {subTab === 'rfqs' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(['All', ...RFQ_STAGES] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setRfqStatusFilter(status)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                        rfqStatusFilter === status
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={rfqQuery}
                    onChange={(e) => setRfqQuery(e.target.value)}
                    placeholder="Search RFQ ID, company, port..."
                    className="w-full h-9 pl-8 pr-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {filteredRfqs.length === 0 ? (
                <div className="py-10 text-center bg-white border border-slate-200 rounded-lg text-sm text-slate-600">
                  No buyer RFQs match the current filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRfqs.map((rfq) => {
                    const isEditing = editingRfqId === rfq.id;
                    const isConfirmingDel = confirmDeleteId === `rfq-${rfq.id}`;
                    return (
                      <div
                        key={rfq.id}
                        className="p-4 sm:p-5 bg-white border border-slate-200 rounded-lg space-y-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-mono font-bold text-slate-900">
                                {rfq.refId}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="font-semibold text-amber-700">
                                {rfq.incoterm}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="font-mono text-slate-500">
                                {rfq.destinationPort}
                              </span>
                            </div>
                            <h4 className="font-display text-base font-bold text-slate-900">
                              {rfq.commoditySummary}
                            </h4>
                            <p className="text-xs text-slate-600">
                              {rfq.companyName} · {rfq.contactName} ({rfq.corporateEmail}) · Volume:{' '}
                              <span className="font-mono font-semibold">
                                {rfq.targetVolume}
                              </span>
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-semibold text-slate-900">
                              {rfq.status}
                            </span>
                            {typeof rfq.estimatedValueUsd === 'number' && (
                              <div className="font-mono text-sm font-bold text-emerald-700 mt-0.5 tabular-nums">
                                US${rfq.estimatedValueUsd.toLocaleString('en-US')}
                              </div>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  Stage / Status
                                </label>
                                <select
                                  value={rfqEditDraft.status}
                                  onChange={(e) =>
                                    setRfqEditDraft((prev) => ({
                                      ...prev,
                                      status: e.target.value as RfqStatus,
                                    }))
                                  }
                                  className="w-full h-9 px-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-md"
                                >
                                  {RFQ_STAGES.map((st) => (
                                    <option key={st} value={st}>
                                      {st}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  Destination Port
                                </label>
                                <input
                                  type="text"
                                  value={rfqEditDraft.destinationPort}
                                  onChange={(e) =>
                                    setRfqEditDraft((prev) => ({
                                      ...prev,
                                      destinationPort: e.target.value,
                                    }))
                                  }
                                  maxLength={120}
                                  className="w-full h-9 px-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-md"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  Target Volume
                                </label>
                                <input
                                  type="text"
                                  value={rfqEditDraft.targetVolume}
                                  onChange={(e) =>
                                    setRfqEditDraft((prev) => ({
                                      ...prev,
                                      targetVolume: e.target.value,
                                    }))
                                  }
                                  maxLength={120}
                                  className="w-full h-9 px-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-md"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  Estimated USD Value
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={rfqEditDraft.estimatedValueUsd}
                                  onChange={(e) =>
                                    setRfqEditDraft((prev) => ({
                                      ...prev,
                                      estimatedValueUsd: e.target.value,
                                    }))
                                  }
                                  className="w-full h-9 px-2.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-md"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Assay / Executive Notes
                              </label>
                              <textarea
                                rows={2}
                                maxLength={1000}
                                value={rfqEditDraft.specifications}
                                onChange={(e) =>
                                  setRfqEditDraft((prev) => ({
                                    ...prev,
                                    specifications: e.target.value,
                                  }))
                                }
                                className="w-full p-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-md"
                              />
                            </div>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingRfqId(null)}
                                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={savingRfqId === rfq.id}
                                onClick={() => void handleSaveRfqEdit(rfq.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
                              >
                                {savingRfqId === rfq.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Save className="w-3.5 h-3.5" />
                                )}
                                <span>Save RFQ Changes</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          rfq.specifications && (
                            <p className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-md border border-slate-100">
                              {rfq.specifications}
                            </p>
                          )
                        )}

                        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartEditRfq(rfq)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit RFQ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenEmailFromWorkspace({
                                  toEmail: rfq.corporateEmail,
                                  contactName: rfq.contactName,
                                  companyName: rfq.companyName,
                                  subject: `Ahzan Tech Ltd · Quotation for ${rfq.refId} (${rfq.commoditySummary})`,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-amber-100 rounded-md cursor-pointer"
                            >
                              <Mail className="w-3 h-3 text-amber-700" />
                              <span>Email Buyer</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConvertRfqToShipment(rfq)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md cursor-pointer"
                            >
                              <Ship className="w-3 h-3" />
                              <span>Dispatch Shipment</span>
                            </button>
                            <button
                              type="button"
                              disabled={exportingPdfId === rfq.id}
                              onClick={async () => {
                                setExportingPdfId(rfq.id);
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
                                        productId: rfq.refId,
                                        productName: rfq.commoditySummary,
                                        volumeSummary: rfq.targetVolume,
                                        incoterm: rfq.incoterm,
                                        estimatedTotalUsd: rfq.estimatedValueUsd,
                                      },
                                    ],
                                    lang,
                                  });
                                } finally {
                                  setExportingPdfId(null);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
                            >
                              {exportingPdfId === rfq.id ? (
                                <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                              ) : (
                                <FileDown className="w-3 h-3 text-amber-400" />
                              )}
                              <span>Signed PDF</span>
                            </button>
                          </div>

                          {isConfirmingDel ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-red-700">
                                Delete permanently?
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmDeleteId(null);
                                  void adminDeleteRfq(rfq.id).then(() =>
                                    notify('RFQ deleted.')
                                  );
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 text-xs text-slate-600 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(`rfq-${rfq.id}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 7. FCL SHIPMENTS CONTROL */}
          {subTab === 'shipments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-display text-base font-bold text-slate-900">
                  Global FCL Vessel &amp; Port Logistics Control
                </h4>
                <button
                  type="button"
                  onClick={() => setShowCreateShipment((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showCreateShipment ? 'Hide Form' : 'Dispatch New Shipment'}</span>
                </button>
              </div>

              {showCreateShipment && (
                <form
                  onSubmit={(e) => void handleCreateShipment(e)}
                  className="p-5 bg-white border border-amber-300 rounded-lg space-y-4"
                >
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Create &amp; Dispatch Buyer FCL Shipment
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Buyer Account UID
                      </label>
                      <select
                        value={newShipDraft.buyerUid}
                        onChange={(e) =>
                          setNewShipDraft((p) => ({ ...p, buyerUid: e.target.value }))
                        }
                        className="w-full h-9 px-2.5 text-xs font-mono text-slate-900 border border-slate-300 rounded-md bg-white"
                      >
                        {knownBuyers.map(([uid, label]) => (
                          <option key={uid} value={uid}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Tracking Code
                      </label>
                      <input
                        type="text"
                        required
                        minLength={4}
                        maxLength={48}
                        value={newShipDraft.trackingCode}
                        onChange={(e) =>
                          setNewShipDraft((p) => ({ ...p, trackingCode: e.target.value }))
                        }
                        className="w-full h-9 px-2.5 text-xs font-mono text-slate-900 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Linked RFQ Ref ID
                      </label>
                      <input
                        type="text"
                        required
                        minLength={4}
                        maxLength={40}
                        value={newShipDraft.rfqRefId}
                        onChange={(e) =>
                          setNewShipDraft((p) => ({ ...p, rfqRefId: e.target.value }))
                        }
                        className="w-full h-9 px-2.5 text-xs font-mono text-slate-900 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Commodity Description
                      </label>
                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={180}
                        value={newShipDraft.commodity}
                        onChange={(e) =>
                          setNewShipDraft((p) => ({ ...p, commodity: e.target.value }))
                        }
                        className="w-full h-9 px-2.5 text-xs text-slate-900 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Origin Port
                      </label>
                      <input
                        type="text"
                        required
                        value={newShipDraft.originPort}
                        onChange={(e) =>
                          setNewShipDraft((p) => ({ ...p, originPort: e.target.value }))
                        }
                        className="w-full h-9 px-2.5 text-xs text-slate-900 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Destination Port
                      </label>
                      <input
                        type="text"
                        required
                        value={newShipDraft.destinationPort}
                        onChange={(e) =>
                          setNewShipDraft((p) => ({
                            ...p,
                            destinationPort: e.target.value,
                          }))
                        }
                        className="w-full h-9 px-2.5 text-xs text-slate-900 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Vessel Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newShipDraft.vesselName}
                        onChange={(e) =>
                          setNewShipDraft((p) => ({ ...p, vesselName: e.target.value }))
                        }
                        className="w-full h-9 px-2.5 text-xs text-slate-900 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Bill of Lading No.
                      </label>
                      <input
                        type="text"
                        required
                        value={newShipDraft.billOfLadingNo}
                        onChange={(e) =>
                          setNewShipDraft((p) => ({
                            ...p,
                            billOfLadingNo: e.target.value,
                          }))
                        }
                        className="w-full h-9 px-2.5 text-xs font-mono text-slate-900 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        ETA Date (YYYY-MM-DD)
                      </label>
                      <input
                        type="date"
                        required
                        value={newShipDraft.etaDate}
                        onChange={(e) =>
                          setNewShipDraft((p) => ({ ...p, etaDate: e.target.value }))
                        }
                        className="w-full h-9 px-2.5 text-xs font-mono text-slate-900 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Container Allocation
                      </label>
                      <input
                        type="text"
                        required
                        value={newShipDraft.containerAllocation}
                        onChange={(e) =>
                          setNewShipDraft((p) => ({
                            ...p,
                            containerAllocation: e.target.value,
                          }))
                        }
                        className="w-full h-9 px-2.5 text-xs text-slate-900 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Initial Stage
                      </label>
                      <select
                        value={newShipDraft.stageIndex}
                        onChange={(e) => {
                          const idx = Number(e.target.value);
                          const found =
                            SHIPMENT_STAGES.find((s) => s.index === idx) ||
                            SHIPMENT_STAGES[0];
                          setNewShipDraft((p) => ({
                            ...p,
                            stageIndex: found.index,
                            status: found.status,
                          }));
                        }}
                        className="w-full h-9 px-2.5 text-xs text-slate-900 border border-slate-300 rounded-md bg-white"
                      >
                        {SHIPMENT_STAGES.map((s) => (
                          <option key={s.index} value={s.index}>
                            {s.index}. {s.status}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Dispatch Update Note
                      </label>
                      <input
                        type="text"
                        required
                        minLength={4}
                        maxLength={320}
                        value={newShipDraft.lastUpdateNote}
                        onChange={(e) =>
                          setNewShipDraft((p) => ({
                            ...p,
                            lastUpdateNote: e.target.value,
                          }))
                        }
                        className="w-full h-9 px-2.5 text-xs text-slate-900 border border-slate-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateShipment(false)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingShipment}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
                    >
                      {creatingShipment && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                      <span>Create &amp; Sync Shipment</span>
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {allShipments.map((s) => {
                  const isEditing = editingShipId === s.id;
                  const isConfirmingDel = confirmDeleteId === `ship-${s.id}`;
                  return (
                    <div
                      key={s.id}
                      className="p-4 sm:p-5 bg-white border border-slate-200 rounded-lg space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                            <span className="font-bold text-slate-900">
                              {s.trackingCode}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="text-slate-600">RFQ {s.rfqRefId}</span>
                            <span className="text-slate-300">·</span>
                            <span className="text-slate-600">
                              B/L {s.billOfLadingNo}
                            </span>
                          </div>
                          <h5 className="font-display text-base font-bold text-slate-900 mt-0.5">
                            {s.commodity}
                          </h5>
                          <p className="text-xs text-slate-600 mt-0.5">
                            <Anchor className="w-3 h-3 inline mr-1 text-amber-600" />
                            {s.originPort} → {s.destinationPort} · {s.vesselName} ·{' '}
                            {s.containerAllocation}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-semibold text-amber-700 font-mono">
                            {s.stageIndex}/5 · {s.status}
                          </div>
                          <div className="font-mono text-xs text-slate-600 mt-0.5">
                            ETA: {s.etaDate}
                          </div>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Milestone Stage
                              </label>
                              <select
                                value={shipEditDraft.stageIndex}
                                onChange={(e) => {
                                  const idx = Number(e.target.value);
                                  const st =
                                    SHIPMENT_STAGES.find((x) => x.index === idx) ||
                                    SHIPMENT_STAGES[0];
                                  setShipEditDraft((p) => ({
                                    ...p,
                                    stageIndex: st.index,
                                    status: st.status,
                                  }));
                                }}
                                className="w-full h-9 px-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-md"
                              >
                                {SHIPMENT_STAGES.map((st) => (
                                  <option key={st.index} value={st.index}>
                                    {st.index}. {st.status}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Vessel Name
                              </label>
                              <input
                                type="text"
                                value={shipEditDraft.vesselName}
                                onChange={(e) =>
                                  setShipEditDraft((p) => ({
                                    ...p,
                                    vesselName: e.target.value,
                                  }))
                                }
                                className="w-full h-9 px-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Bill of Lading No.
                              </label>
                              <input
                                type="text"
                                value={shipEditDraft.billOfLadingNo}
                                onChange={(e) =>
                                  setShipEditDraft((p) => ({
                                    ...p,
                                    billOfLadingNo: e.target.value,
                                  }))
                                }
                                className="w-full h-9 px-2.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Container Allocation
                              </label>
                              <input
                                type="text"
                                value={shipEditDraft.containerAllocation}
                                onChange={(e) =>
                                  setShipEditDraft((p) => ({
                                    ...p,
                                    containerAllocation: e.target.value,
                                  }))
                                }
                                className="w-full h-9 px-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                ETA Date
                              </label>
                              <input
                                type="date"
                                value={shipEditDraft.etaDate}
                                onChange={(e) =>
                                  setShipEditDraft((p) => ({
                                    ...p,
                                    etaDate: e.target.value,
                                  }))
                                }
                                className="w-full h-9 px-2.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Port / Tracking Note
                              </label>
                              <input
                                type="text"
                                value={shipEditDraft.lastUpdateNote}
                                onChange={(e) =>
                                  setShipEditDraft((p) => ({
                                    ...p,
                                    lastUpdateNote: e.target.value,
                                  }))
                                }
                                maxLength={320}
                                className="w-full h-9 px-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-md"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingShipId(null)}
                              className="px-3 py-1.5 text-xs text-slate-600 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={savingShipId === s.id}
                              onClick={() => void handleSaveShipmentEdit(s.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
                            >
                              {savingShipId === s.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                              <span>Update Shipment</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-md border border-slate-100">
                          {s.lastUpdateNote}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEditShipment(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit Vessel, ETA &amp; Stage</span>
                        </button>

                        {isConfirmingDel ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-red-700">
                              Delete shipment?
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteId(null);
                                void adminDeleteShipment(s.id).then(() =>
                                  notify('Shipment deleted.')
                                );
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 rounded cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs text-slate-600 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(`ship-${s.id}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 8. TRADE DOCUMENTS ISSUANCE & VERIFICATION */}
          {subTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-display text-base font-bold text-slate-900">
                  Trade Documentation Vault &amp; Issuance
                </h4>
                <button
                  type="button"
                  onClick={() => setShowCreateDoc((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showCreateDoc ? 'Hide Form' : 'Issue New Trade Document'}</span>
                </button>
              </div>

              {showCreateDoc && (
                <form
                  onSubmit={(e) => void handleCreateTradeDoc(e)}
                  className="p-5 bg-white border border-amber-300 rounded-lg space-y-4"
                >
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Issue Verified Export Document to Buyer Dossier
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Buyer UID
                      </label>
                      <select
                        value={newDocDraft.buyerUid}
                        onChange={(e) =>
                          setNewDocDraft((p) => ({ ...p, buyerUid: e.target.value }))
                        }
                        className="w-full h-9 px-2.5 text-xs font-mono text-slate-900 border border-slate-300 rounded-md bg-white"
                      >
                        {knownBuyers.map(([uid, label]) => (
                          <option key={uid} value={uid}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Document Code
                      </label>
                      <input
                        type="text"
                        required
                        minLength={4}
                        maxLength={48}
                        value={newDocDraft.docCode}
                        onChange={(e) =>
                          setNewDocDraft((p) => ({ ...p, docCode: e.target.value }))
                        }
                        className="w-full h-9 px-2.5 text-xs font-mono text-slate-900 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Document Type
                      </label>
                      <select
                        value={newDocDraft.docType}
                        onChange={(e) =>
                          setNewDocDraft((p) => ({
                            ...p,
                            docType: e.target.value as TradeDocType,
                          }))
                        }
                        className="w-full h-9 px-2.5 text-xs text-slate-900 border border-slate-300 rounded-md bg-white"
                      >
                        {TRADE_DOC_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Document Title
                      </label>
                      <input
                        type="text"
                        required
                        minLength={3}
                        maxLength={180}
                        value={newDocDraft.title}
                        onChange={(e) =>
                          setNewDocDraft((p) => ({ ...p, title: e.target.value }))
                        }
                        className="w-full h-9 px-2.5 text-xs text-slate-900 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Linked RFQ Ref ID
                      </label>
                      <input
                        type="text"
                        required
                        minLength={4}
                        maxLength={40}
                        value={newDocDraft.rfqRefId}
                        onChange={(e) =>
                          setNewDocDraft((p) => ({ ...p, rfqRefId: e.target.value }))
                        }
                        className="w-full h-9 px-2.5 text-xs font-mono text-slate-900 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Issue Date (YYYY-MM-DD)
                      </label>
                      <input
                        type="date"
                        required
                        value={newDocDraft.issuedDate}
                        onChange={(e) =>
                          setNewDocDraft((p) => ({ ...p, issuedDate: e.target.value }))
                        }
                        className="w-full h-9 px-2.5 text-xs font-mono text-slate-900 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Commodity
                      </label>
                      <input
                        type="text"
                        required
                        value={newDocDraft.commodity}
                        onChange={(e) =>
                          setNewDocDraft((p) => ({ ...p, commodity: e.target.value }))
                        }
                        className="w-full h-9 px-2.5 text-xs text-slate-900 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Issuing Authority
                      </label>
                      <input
                        type="text"
                        required
                        value={newDocDraft.issuer}
                        onChange={(e) =>
                          setNewDocDraft((p) => ({ ...p, issuer: e.target.value }))
                        }
                        className="w-full h-9 px-2.5 text-xs text-slate-900 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Initial Status
                      </label>
                      <select
                        value={newDocDraft.status}
                        onChange={(e) =>
                          setNewDocDraft((p) => ({
                            ...p,
                            status: e.target.value as TradeDocStatus,
                          }))
                        }
                        className="w-full h-9 px-2.5 text-xs text-slate-900 border border-slate-300 rounded-md bg-white"
                      >
                        {TRADE_DOC_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Document Summary &amp; Verification Findings
                    </label>
                    <textarea
                      rows={2}
                      required
                      minLength={4}
                      maxLength={1500}
                      value={newDocDraft.summaryText}
                      onChange={(e) =>
                        setNewDocDraft((p) => ({ ...p, summaryText: e.target.value }))
                      }
                      className="w-full p-2.5 text-xs text-slate-900 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateDoc(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingDoc}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
                    >
                      {creatingDoc && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Issue Document</span>
                    </button>
                  </div>
                </form>
              )}

              <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
                {allTradeDocuments.map((d) => {
                  const isEditing = editingDocId === d.id;
                  const isConfirmingDel = confirmDeleteId === `doc-${d.id}`;
                  return (
                    <div key={d.id} className="p-4 sm:p-5 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono font-bold text-slate-900">
                              {d.docCode}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="font-semibold text-amber-700">
                              {d.docType}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="font-mono text-slate-500">
                              {d.issuedDate}
                            </span>
                          </div>
                          <h5 className="font-display text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                            {d.title}
                          </h5>
                          <p className="text-xs text-slate-500">
                            {d.issuer} · RFQ {d.rfqRefId} ·{' '}
                            <span
                              className={`font-semibold ${
                                d.status === 'Verified'
                                  ? 'text-emerald-700'
                                  : d.status === 'Archived'
                                    ? 'text-slate-500'
                                    : 'text-amber-700'
                              }`}
                            >
                              {d.status}
                            </span>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {d.status === 'Pending Countersignature' && (
                            <button
                              type="button"
                              onClick={() =>
                                void adminVerifyTradeDocument(d.id).then(() =>
                                  notify(`Document ${d.docCode} marked Verified.`)
                                )
                              }
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md cursor-pointer"
                            >
                              Verify Now
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleStartEditDoc(d)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          {isConfirmingDel ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmDeleteId(null);
                                  void adminDeleteTradeDocument(d.id).then(() =>
                                    notify('Trade document removed.')
                                  );
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 rounded cursor-pointer"
                              >
                                Confirm Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 text-xs text-slate-600 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(`doc-${d.id}`)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Document Status
                              </label>
                              <select
                                value={docEditDraft.status}
                                onChange={(e) =>
                                  setDocEditDraft((p) => ({
                                    ...p,
                                    status: e.target.value as TradeDocStatus,
                                  }))
                                }
                                className="w-full h-9 px-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-md"
                              >
                                {TRADE_DOC_STATUSES.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Summary &amp; Inspection Notes
                              </label>
                              <input
                                type="text"
                                maxLength={1500}
                                value={docEditDraft.summaryText}
                                onChange={(e) =>
                                  setDocEditDraft((p) => ({
                                    ...p,
                                    summaryText: e.target.value,
                                  }))
                                }
                                className="w-full h-9 px-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-md"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingDocId(null)}
                              className="px-3 py-1 text-xs text-slate-600 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={savingDocId === d.id}
                              onClick={() => void handleSaveDocEdit(d.id)}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md cursor-pointer"
                            >
                              Save Document
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-md border border-slate-100">
                          {d.summaryText}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 9. BUYER PRICE ALERTS QUEUE */}
          {subTab === 'alerts' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {['All', 'Critical Minerals', 'Agro-Commodities', 'Lubricants'].map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setAlertCategoryFilter(cat)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md border cursor-pointer whitespace-nowrap ${
                          alertCategoryFilter === cat
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {(['All', 'Active', 'Paused'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setAlertStatusFilter(st)}
                      className={`px-2.5 py-1.5 text-xs font-semibold rounded-md border cursor-pointer ${
                        alertStatusFilter === st
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {filteredAlerts.length === 0 ? (
                <div className="py-10 text-center bg-white border border-slate-200 rounded-lg text-sm text-slate-600">
                  No buyer price alert subscriptions match the filter.
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
                  {filteredAlerts.map((alert: PriceAlertDoc) => {
                    const isConfirmingDel = confirmDeleteId === `alert-${alert.id}`;
                    const triggerLabel =
                      alert.triggerDirection === 'below'
                        ? `Drop <= $${alert.thresholdValue}`
                        : alert.triggerDirection === 'above'
                          ? `Spike >= $${alert.thresholdValue}`
                          : `Variance +/- ${alert.thresholdValue}%`;
                    const liveLithiumRate = marketConfig.lithiumRatePerPercentUsd;
                    const liveLithiumFob =
                      marketConfig.lithiumRatePerPercentUsd * marketConfig.lithiumAssayPct;
                    const liveBenchmark =
                      alert.category === 'Critical Minerals'
                        ? alert.unitLabel.toLowerCase().includes('mt')
                          ? liveLithiumFob
                          : liveLithiumRate
                        : alert.baselinePrice;
                    const isTriggered =
                      alert.status === 'Active' &&
                      ((alert.triggerDirection === 'below' &&
                        liveBenchmark <= alert.thresholdValue) ||
                        (alert.triggerDirection === 'above' &&
                          liveBenchmark >= alert.thresholdValue) ||
                        (alert.triggerDirection === 'pct_change' &&
                          alert.baselinePrice > 0 &&
                          (Math.abs(liveBenchmark - alert.baselinePrice) /
                            alert.baselinePrice) *
                            100 >=
                            alert.thresholdValue));
                    return (
                      <div
                        key={alert.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono font-bold text-slate-900">
                              {alert.commodityLabel}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="text-amber-700 font-semibold">
                              {alert.category}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span
                              className={`font-semibold ${
                                alert.status === 'Active'
                                  ? 'text-emerald-700'
                                  : 'text-slate-500'
                              }`}
                            >
                              {alert.status}
                            </span>
                            {isTriggered && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className="inline-flex items-center gap-1 font-mono font-bold text-red-700">
                                  <AlertTriangle className="w-3 h-3" />
                                  THRESHOLD BREACHED (${liveBenchmark.toFixed(2)})
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 font-mono">
                            {alert.email} · Trigger: {triggerLabel} (Base: $
                            {alert.baselinePrice} / {alert.unitLabel}) · Channel:{' '}
                            {alert.channel === 'email_whatsapp'
                              ? 'Email + WhatsApp'
                              : 'Email'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenEmailFromWorkspace({
                                toEmail: alert.email,
                                contactName: alert.email.split('@')[0],
                                companyName:
                                  alert.email.split('@')[1]?.split('.')[0]?.toUpperCase() ||
                                  'Subscriber',
                                subject: `Price Update: ${alert.commodityLabel} (${alert.category})`,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-amber-100 rounded-md cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5 text-amber-700" />
                            <span>Email</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void togglePriceAlertStatus(
                                alert.id,
                                alert.status === 'Active' ? 'Paused' : 'Active'
                              ).then(() => notify('Price alert status updated.'))
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                          >
                            {alert.status === 'Active' ? (
                              <>
                                <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Pause</span>
                              </>
                            ) : (
                              <>
                                <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Resume</span>
                              </>
                            )}
                          </button>

                          {isConfirmingDel ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmDeleteId(null);
                                  void deletePriceAlert(alert.id).then(() =>
                                    notify('Price alert removed.')
                                  );
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 rounded cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 text-xs text-slate-600 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(`alert-${alert.id}`)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lead Dossier Slide-Over Drawer */}
      <LeadDetailDrawer
        record={selectedIntelRecord}
        onClose={() => setSelectedIntelRankId(null)}
        onOpenEmailComposer={(prefill) => {
          setSelectedIntelRankId(null);
          handleOpenEmailFromWorkspace(prefill);
        }}
        onOpenInDocStudio={handleOpenInDocStudio}
        onNotify={notify}
        onError={setErrorMsg}
      />

      {/* Admin Firestore Sync & 18-Column CSV Drawer */}
      <AdminSyncDrawer
        isOpen={syncDrawerOpen}
        onClose={() => setSyncDrawerOpen(false)}
        onNotify={notify}
        onError={setErrorMsg}
        onSelectLead={(rec) => setSelectedIntelRankId(rec.rankId)}
      />
    </div>
  );
}
