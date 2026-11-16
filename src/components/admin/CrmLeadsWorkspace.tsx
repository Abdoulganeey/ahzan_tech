import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react';
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  LayoutGrid,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Table2,
  UploadCloud,
} from 'lucide-react';
import {
  useBuyerAuth,
  type CrmLeadStage,
  type CrmPriority,
} from '../../context/BuyerAuthContext';
import {
  computePriorityTier,
  CRM_STAGE_LABELS,
  CRM_STAGE_ORDER,
  CSV_EXPORT_HEADERS_18,
  LEAD_CATEGORY_LABELS,
  OUTREACH_STATUS_LIST,
  STAGE_WIN_PROBABILITY,
  TRADE_REGION_LABELS,
  type CrmStage,
  type LeadCategory,
  type LithiumIntelRecord,
  type OutreachStatus,
  type PriorityTier,
  type TradeRegion,
} from '../../types/lithiumIntel';
import {
  checkDuplicateLead,
  normalizeCompanyKey,
  type DuplicateMatchResult,
} from '../../utils/duplicateDetector';

// Preserved legacy export for backward compatibility with AdminWorkspacePanel & subviews
export const CRM_LEAD_STAGES: CrmLeadStage[] = [
  'New Lead',
  'Qualified',
  'Proposal / SCO Sent',
  'Negotiation',
  'Won / Contracted',
  'Lost / Archived',
];

export interface EmailComposerPrefill {
  toEmail: string;
  contactName: string;
  companyName: string;
  leadId?: string;
  leadRankId?: number;
  subject?: string;
  body?: string;
}

export interface LeadFormPrefill {
  contactId?: string;
  contactName: string;
  companyName: string;
  email: string;
  phoneWhatsapp: string;
  title?: string;
  commodityInterest?: string;
}

interface CrmLeadsWorkspaceProps {
  onOpenEmailComposer: (prefill: EmailComposerPrefill) => void;
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
  initialPrefill?: LeadFormPrefill | null;
  onConsumePrefill?: () => void;
  onSelectRecord?: (record: LithiumIntelRecord) => void;
  onOpenInDocStudio?: (record: LithiumIntelRecord) => void;
  onOpenSyncBridge?: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const REGION_OPTIONS = Object.keys(TRADE_REGION_LABELS) as TradeRegion[];

export default function CrmLeadsWorkspace({
  onOpenEmailComposer,
  onNotify,
  onError,
  initialPrefill,
  onConsumePrefill,
  onSelectRecord,
  onOpenInDocStudio,
  onOpenSyncBridge,
}: CrmLeadsWorkspaceProps) {
  const {
    unifiedTradeBook,
    adminUpsertIntelLead,
    adminMoveLeadStage,
    adminSyncWebActivityToCrm,
  } = useBuyerAuth();

  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | LeadCategory>('ALL');
  const [regionFilter, setRegionFilter] = useState<'ALL' | TradeRegion>('ALL');
  const [tierFilter, setTierFilter] = useState<'ALL' | PriorityTier>('ALL');
  const [riskOnly, setRiskOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingWeb, setSyncingWeb] = useState(false);

  // Drag-and-drop tracking
  const [draggedRankId, setDraggedRankId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<CrmStage | null>(null);

  // Column display expansion for snappy rendering across 249+ records
  const [expandedCols, setExpandedCols] = useState<Record<string, boolean>>({});
  const [tableLimit, setTableLimit] = useState(60);

  // Create New Custom Lead Form
  const [showCreateForm, setShowCreateForm] = useState(Boolean(initialPrefill));
  const [creating, setCreating] = useState(false);
  const [newCompany, setNewCompany] = useState(initialPrefill?.companyName || '');
  const [newCategory, setNewCategory] = useState<LeadCategory>('LITHIUM');
  const [newRegion, setNewRegion] = useState<TradeRegion>('ASIA_PACIFIC');
  const [newLocation, setNewLocation] = useState('International');
  const [newRole, setNewRole] = useState(
    initialPrefill?.commodityInterest || 'Lithium Ore / Commodity Offtaker'
  );
  const [newDecisionMaker, setNewDecisionMaker] = useState(
    initialPrefill?.contactName || ''
  );
  const [newTitle, setNewTitle] = useState('Procurement Director');
  const [newEmail, setNewEmail] = useState(initialPrefill?.email || '');
  const [newWhatsapp, setNewWhatsapp] = useState(initialPrefill?.phoneWhatsapp || '');
  const [newWebsite, setNewWebsite] = useState('');
  const [newScore, setNewScore] = useState('82');
  const [newTonnage, setNewTonnage] = useState('500');
  const [newTargetFob, setNewTargetFob] = useState('475000');
  const [newStage, setNewStage] = useState<CrmStage>('PROSPECT');
  const [newOutreach, setNewOutreach] = useState<OutreachStatus>('READY');
  const [newFollowUp, setNewFollowUp] = useState(todayIso());
  const [newNextAction, setNewNextAction] = useState('Send Corporate Offer & Assay Summary');
  const [newTags, setNewTags] = useState('Custom Entry, Verified');
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    if (!initialPrefill) return;
    setShowCreateForm(true);
    setNewCompany(initialPrefill.companyName);
    setNewDecisionMaker(initialPrefill.contactName);
    setNewEmail(initialPrefill.email);
    setNewWhatsapp(initialPrefill.phoneWhatsapp);
    if (initialPrefill.commodityInterest) {
      setNewRole(initialPrefill.commodityInterest);
    }
  }, [initialPrefill]);

  // Live duplicate detector check on custom lead form
  const liveDuplicateCheck: DuplicateMatchResult = useMemo(() => {
    if (!showCreateForm) return { hasDuplicate: false, matchedBy: [], matches: [] };
    if (!newCompany.trim() && !newEmail.trim() && !newWhatsapp.trim()) {
      return { hasDuplicate: false, matchedBy: [], matches: [] };
    }
    return checkDuplicateLead(
      {
        companyName: newCompany,
        directEmail: newEmail,
        generalEmail: newEmail,
        whatsappNumber: newWhatsapp,
      },
      unifiedTradeBook
    );
  }, [showCreateForm, newCompany, newEmail, newWhatsapp, unifiedTradeBook]);

  const categoryCounts = useMemo(() => {
    const counts: Record<LeadCategory, number> = {
      LITHIUM: 0,
      AFRICA_SOURCING: 0,
      FUNDING_FINANCE: 0,
    };
    unifiedTradeBook.forEach((r) => {
      counts[r.leadCategory] = (counts[r.leadCategory] || 0) + 1;
    });
    return counts;
  }, [unifiedTradeBook]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return unifiedTradeBook.filter((r) => {
      if (categoryFilter !== 'ALL' && r.leadCategory !== categoryFilter) return false;
      if (regionFilter !== 'ALL' && r.regionCode !== regionFilter) return false;
      if (tierFilter !== 'ALL' && r.priorityTier !== tierFilter) return false;
      if (riskOnly && !r.isRiskWatch) return false;
      if (!q) return true;
      return (
        r.companyName.toLowerCase().includes(q) ||
        r.decisionMaker.toLowerCase().includes(q) ||
        r.primaryRole.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.directEmail.toLowerCase().includes(q) ||
        r.generalEmail.toLowerCase().includes(q) ||
        r.whatsappNumber.toLowerCase().includes(q) ||
        r.tags.toLowerCase().includes(q) ||
        String(r.rankId).includes(q)
      );
    });
  }, [unifiedTradeBook, categoryFilter, regionFilter, tierFilter, riskOnly, searchQuery]);

  const handleSyncWeb = async () => {
    setSyncingWeb(true);
    try {
      const res = await adminSyncWebActivityToCrm();
      onNotify(
        `Web-to-CRM Sync complete: ${res.contactsAdded} contact(s) & ${res.leadsAdded} lead(s) imported.`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to sync website activity.');
    } finally {
      setSyncingWeb(false);
    }
  };

  const handleExport18ColCsv = () => {
    const escapeCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = filteredRecords.map((r) =>
      [
        r.companyName,
        r.leadCategory,
        TRADE_REGION_LABELS[r.regionCode] || r.regionCode,
        r.decisionMaker,
        r.title,
        r.whatsappNumber,
        r.directEmail || r.generalEmail,
        r.websiteUrl || r.websiteDisplay,
        r.priorityScore,
        r.crmStage,
        r.winProbability,
        r.outreachStatus,
        r.estimatedTonnage,
        r.targetFobValue,
        r.impliedFobPricePerMt,
        new Date(r.followUpAtMillis || Date.now()).toISOString().slice(0, 10),
        r.nextAction,
        r.tags,
      ]
        .map(escapeCell)
        .join(',')
    );
    const csv = [CSV_EXPORT_HEADERS_18.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AhzanTech-LithiumIntel-TradeBook-${todayIso()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotify(`Exported ${filteredRecords.length} records to 18-column Android-compatible CSV.`);
  };

  const handleCreateCustomLead = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const maxCustomRank = unifiedTradeBook.reduce(
        (m, r) => (r.rankId >= 1001 && r.rankId > m ? r.rankId : m),
        1000
      );
      const nextRankId = maxCustomRank + 1;
      const score = Math.min(100, Math.max(0, Number(newScore) || 75));
      const tier = computePriorityTier(score);
      const tonnage = Math.max(0, Number(newTonnage) || 0);
      const targetFob = Math.max(0, Number(newTargetFob) || 0);
      const winProb = STAGE_WIN_PROBABILITY[newStage];

      const record: LithiumIntelRecord = {
        id: `intel-${nextRankId}`,
        rankId: nextRankId,
        companyName: newCompany.trim(),
        normalizedCompanyKey: normalizeCompanyKey(newCompany),
        leadCategory: newCategory,
        regionCode: newRegion,
        location: newLocation.trim() || 'International',
        primaryRole: newRole.trim() || 'Trade Counterparty',
        priorityScore: score,
        priorityTier: tier,
        fitScore: Math.round(score * 0.25),
        procScore: Math.round(score * 0.25),
        finScore: Math.round(score * 0.15),
        dmScore: Math.round(score * 0.15),
        esgScore: Math.round(score * 0.1),
        volScore: Math.round(score * 0.1),
        decisionMaker: newDecisionMaker.trim() || 'Procurement Director',
        title: newTitle.trim() || 'Director',
        generalEmail: newEmail.trim(),
        directEmail: newEmail.trim(),
        emailRouteNote: 'Custom Web Command Entry',
        whatsappNumber: newWhatsapp.trim(),
        websiteUrl: newWebsite.trim(),
        websiteDisplay: newWebsite.replace(/^https?:\/\//i, ''),
        profileSource: 'Web Command Center',
        operationalFit: newNotes.trim() || newRole.trim(),
        emailSubject: `Ahzan Tech Ltd (EL 65197) — Commercial Proposal for ${newCompany.trim()}`,
        emailBody: `Dear ${newDecisionMaker.trim() || 'Trade Partner'},\n\nAhzan Tech Ltd (Nigeria MCO EL No. 65197) welcomes commercial collaboration with ${newCompany.trim()}.\n\nBest regards,\nAbdulganiyu Hamza\nabdoul@ahzantechltd.com`,
        linkedInNote: `Connecting regarding Ahzan Tech Ltd direct mineral & B2B commodity trade.`,
        outreachStatus: newOutreach,
        crmStage: newStage,
        winProbability: winProb,
        estimatedTonnage: tonnage,
        targetFobValue: targetFob,
        impliedFobPricePerMt: tonnage > 0 ? Number((targetFob / tonnage).toFixed(2)) : 0,
        weightedValueUsd: Math.round((targetFob * winProb) / 100),
        followUpAtMillis: newFollowUp ? new Date(newFollowUp).getTime() : Date.now() + 3 * 86400000,
        nextAction: newNextAction.trim() || 'Send SCO & Assay Certificate',
        tags: newTags.trim(),
        lostReason: '',
        notes: newNotes.trim(),
        isRiskWatch: newOutreach === 'RISK_PREPAY_ONLY',
        isCustomLead: true,
        leadSource: 'Web Admin Manual',
        lastUpdatedMillis: Date.now(),
      };

      await adminUpsertIntelLead(record);
      setShowCreateForm(false);
      onConsumePrefill?.();
      setNewCompany('');
      setNewDecisionMaker('');
      setNewEmail('');
      setNewWhatsapp('');
      setNewNotes('');
      onNotify(`Created custom lead #${nextRankId} (${record.companyName}) and synced to Cloud.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to save custom lead.');
    } finally {
      setCreating(false);
    }
  };

  const handleDropOnStage = async (e: DragEvent<HTMLDivElement>, stage: CrmStage) => {
    e.preventDefault();
    setDragOverStage(null);
    const rankStr = e.dataTransfer.getData('text/plain');
    const rankId = Number(rankStr) || draggedRankId;
    setDraggedRankId(null);
    if (!rankId) return;
    const record = unifiedTradeBook.find((r) => r.rankId === rankId);
    if (!record || record.crmStage === stage) return;
    try {
      await adminMoveLeadStage(record, stage);
      onNotify(`${record.companyName} moved to ${CRM_STAGE_LABELS[stage]}.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update stage.');
    }
  };

  const tierTextClass = (tier: PriorityTier) => {
    if (tier === 'A') return 'text-emerald-700 font-bold';
    if (tier === 'B') return 'text-amber-700 font-semibold';
    return 'text-slate-500 font-medium';
  };

  const stageLegacyPriorityHelper = (tier: PriorityTier): CrmPriority =>
    tier === 'A' ? 'High' : tier === 'B' ? 'Medium' : 'Low';

  return (
    <div className="space-y-4">
      {/* Category Segmented Tabs + Sync Controls */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Category Segmented Bar */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap ${
                categoryFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Trade Book ({unifiedTradeBook.length})
            </button>
            {(['LITHIUM', 'AFRICA_SOURCING', 'FUNDING_FINANCE'] as LeadCategory[]).map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap ${
                    categoryFilter === cat
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {LEAD_CATEGORY_LABELS[cat]} ({categoryCounts[cat]})
                </button>
              )
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenSyncBridge && (
              <button
                type="button"
                onClick={onOpenSyncBridge}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md cursor-pointer whitespace-nowrap"
              >
                <UploadCloud className="w-3.5 h-3.5 text-amber-600" />
                <span>Android Sync Bridge</span>
              </button>
            )}
            <button
              type="button"
              disabled={syncingWeb}
              onClick={() => void handleSyncWeb()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-md cursor-pointer whitespace-nowrap"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-amber-600 ${syncingWeb ? 'animate-spin' : ''}`}
              />
              <span>Sync Web RFQs</span>
            </button>
            <button
              type="button"
              onClick={handleExport18ColCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-md cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>18-Col CSV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (showCreateForm) onConsumePrefill?.();
                setShowCreateForm((prev) => !prev);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showCreateForm ? 'Close Form' : 'New Lead'}</span>
            </button>
          </div>
        </div>

        {/* Search, Region, Tier, Risk Watch & Board/Table Toggle */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rank #, company, decision maker, location, email, WhatsApp, tags..."
              className="w-full h-9 pl-8 pr-3 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value as 'ALL' | TradeRegion)}
            aria-label="Filter by region"
            className="h-9 px-2.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-md"
          >
            <option value="ALL">All Regions (20 Corridors)</option>
            {REGION_OPTIONS.map((reg) => (
              <option key={reg} value={reg}>
                {TRADE_REGION_LABELS[reg]}
              </option>
            ))}
          </select>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as 'ALL' | PriorityTier)}
            aria-label="Filter by Priority Tier"
            className="h-9 px-2.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-md"
          >
            <option value="ALL">All Tiers (A / B / C)</option>
            <option value="A">Tier A (80–100 pts)</option>
            <option value="B">Tier B (65–79 pts)</option>
            <option value="C">Tier C (50–64 pts)</option>
          </select>

          <button
            type="button"
            onClick={() => setRiskOnly((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-md border cursor-pointer whitespace-nowrap ${
              riskOnly
                ? 'bg-red-50 text-red-800 border-red-300'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            <span>Risk Watch</span>
          </button>

          <div
            role="group"
            aria-label="Leads layout mode"
            className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-md ml-auto"
          >
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded cursor-pointer ${
                viewMode === 'board'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>7-Stage Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>18-Col Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Create Custom Lead Form with Live Duplicate Check */}
      {showCreateForm && (
        <form
          onSubmit={(e) => void handleCreateCustomLead(e)}
          className="p-5 bg-white border border-amber-300 rounded-lg space-y-4"
        >
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <h4 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-600" />
              <span>Add Custom Partner / Lead (Rank #1001+ · 1:1 Android Schema)</span>
            </h4>
          </div>

          {liveDuplicateCheck.hasDuplicate && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-md flex items-start gap-2.5 text-xs text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">
                  Potential Duplicate Detected ({liveDuplicateCheck.matchedBy.join(' · ')})
                </div>
                <div className="text-[11px] text-amber-900">
                  Matched existing records:{' '}
                  {liveDuplicateCheck.matches
                    .map((m) => `#${m.rankId} ${m.companyName}`)
                    .join(', ')}
                  . Verify before saving to prevent duplicate entries.
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                required
                minLength={2}
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                className="w-full h-9 px-2.5 text-xs border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as LeadCategory)}
                className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                {(['LITHIUM', 'AFRICA_SOURCING', 'FUNDING_FINANCE'] as LeadCategory[]).map(
                  (c) => (
                    <option key={c} value={c}>
                      {LEAD_CATEGORY_LABELS[c]}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Region Corridor
              </label>
              <select
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value as TradeRegion)}
                className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                {REGION_OPTIONS.map((reg) => (
                  <option key={reg} value={reg}>
                    {TRADE_REGION_LABELS[reg]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                City / Country
              </label>
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="w-full h-9 px-2.5 text-xs border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Decision Maker
              </label>
              <input
                type="text"
                required
                value={newDecisionMaker}
                onChange={(e) => setNewDecisionMaker(e.target.value)}
                className="w-full h-9 px-2.5 text-xs border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Role / Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full h-9 px-2.5 text-xs border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Direct Email
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full h-9 px-2.5 text-xs font-mono border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                WhatsApp / Phone
              </label>
              <input
                type="text"
                value={newWhatsapp}
                onChange={(e) => setNewWhatsapp(e.target.value)}
                className="w-full h-9 px-2.5 text-xs font-mono border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Primary Role / Commodity
              </label>
              <input
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full h-9 px-2.5 text-xs border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Est. Tonnage (MT)
              </label>
              <input
                type="number"
                min={0}
                value={newTonnage}
                onChange={(e) => setNewTonnage(e.target.value)}
                className="w-full h-9 px-2.5 text-xs font-mono border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Target FOB Value (USD)
              </label>
              <input
                type="number"
                min={0}
                value={newTargetFob}
                onChange={(e) => setNewTargetFob(e.target.value)}
                className="w-full h-9 px-2.5 text-xs font-mono border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Score (/100)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={newScore}
                onChange={(e) => setNewScore(e.target.value)}
                className="w-full h-9 px-2.5 text-xs font-mono border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                CRM Stage
              </label>
              <select
                value={newStage}
                onChange={(e) => setNewStage(e.target.value as CrmStage)}
                className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                {CRM_STAGE_ORDER.map((st) => (
                  <option key={st} value={st}>
                    {CRM_STAGE_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Outreach Status
              </label>
              <select
                value={newOutreach}
                onChange={(e) => setNewOutreach(e.target.value as OutreachStatus)}
                className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                {OUTREACH_STATUS_LIST.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Follow-Up Date
              </label>
              <input
                type="date"
                value={newFollowUp}
                onChange={(e) => setNewFollowUp(e.target.value)}
                className="w-full h-9 px-2.5 text-xs font-mono border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Website URL (Optional)
              </label>
              <input
                type="text"
                value={newWebsite}
                onChange={(e) => setNewWebsite(e.target.value)}
                className="w-full h-9 px-2.5 text-xs border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Next Action
              </label>
              <input
                type="text"
                value={newNextAction}
                onChange={(e) => setNewNextAction(e.target.value)}
                className="w-full h-9 px-2.5 text-xs border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                className="w-full h-9 px-2.5 text-xs border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Operational Fit / Executive Notes
            </label>
            <textarea
              rows={2}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-md"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                onConsumePrefill?.();
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
            >
              {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save &amp; Sync to Firestore</span>
            </button>
          </div>
        </form>
      )}

      {/* Results Display */}
      {filteredRecords.length === 0 ? (
        <div className="py-12 px-4 text-center bg-white border border-slate-200 rounded-lg space-y-2">
          <p className="text-sm font-semibold text-slate-900">
            No Trade Book records match your active filters.
          </p>
          <p className="text-xs text-slate-500">
            Adjust category, region corridor, or search keywords to inspect all 249+ seeded and custom partners.
          </p>
        </div>
      ) : viewMode === 'board' ? (
        /* 7-STAGE DRAG-AND-DROP KANBAN BOARD */
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-flow-col auto-cols-[300px] gap-3">
            {CRM_STAGE_ORDER.map((stage) => {
              const stageItems = filteredRecords.filter((r) => r.crmStage === stage);
              const stageWeighted = stageItems.reduce(
                (s, r) => s + (r.weightedValueUsd || 0),
                0
              );
              const isExpanded = Boolean(expandedCols[stage]);
              const visibleItems = isExpanded ? stageItems : stageItems.slice(0, 20);
              const isDropTarget = dragOverStage === stage;

              return (
                <div
                  key={stage}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverStage !== stage) setDragOverStage(stage);
                  }}
                  onDragLeave={() => {
                    if (dragOverStage === stage) setDragOverStage(null);
                  }}
                  onDrop={(e) => void handleDropOnStage(e, stage)}
                  className={`rounded-lg border p-2.5 flex flex-col gap-2 min-h-[340px] transition-colors ${
                    isDropTarget
                      ? 'bg-amber-50/70 border-amber-400'
                      : 'bg-slate-100/80 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 px-0.5">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {CRM_STAGE_LABELS[stage]}
                    </div>
                    <div className="font-mono text-[11px] text-slate-600 tabular-nums shrink-0">
                      {stageItems.length} · ${(stageWeighted / 1000).toFixed(0)}k
                    </div>
                  </div>

                  {stageItems.length === 0 ? (
                    <div className="py-10 text-center text-[11px] text-slate-400">
                      Drag lead card here
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {visibleItems.map((rec) => {
                        const waDigits = rec.whatsappNumber.replace(/\D/g, '');
                        return (
                          <div
                            key={`${rec.rankId}-${rec.normalizedCompanyKey}`}
                            draggable
                            onDragStart={(e) => {
                              setDraggedRankId(rec.rankId);
                              e.dataTransfer.setData('text/plain', String(rec.rankId));
                            }}
                            onClick={() => onSelectRecord?.(rec)}
                            className="p-3 bg-white border border-slate-200 hover:border-slate-400 rounded-md space-y-1.5 cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                                  <span className="font-mono font-semibold text-slate-700">
                                    #{rec.rankId}
                                  </span>
                                  <span>·</span>
                                  <span className={tierTextClass(rec.priorityTier)}>
                                    {rec.priorityScore}pt ({rec.priorityTier})
                                  </span>
                                  {rec.isRiskWatch && (
                                    <>
                                      <span>·</span>
                                      <span className="text-red-600 font-semibold">Risk</span>
                                    </>
                                  )}
                                </div>
                                <h5 className="text-xs font-bold text-slate-900 leading-snug truncate mt-0.5">
                                  {rec.companyName}
                                </h5>
                              </div>
                              {rec.syncedInCloud && (
                                <span title="Synced in Firestore" className="shrink-0 mt-0.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-600 truncate">
                              {rec.location} · {rec.decisionMaker}
                            </div>

                            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums pt-1">
                              <span className="text-slate-700">
                                {rec.estimatedTonnage.toLocaleString('en-US')} MT
                              </span>
                              <span className="font-bold text-emerald-700">
                                ${rec.targetFobValue.toLocaleString('en-US')}
                              </span>
                            </div>

                            <div
                              className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="font-mono text-slate-500 truncate">
                                {rec.outreachStatus}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  title="Compose Email"
                                  onClick={() =>
                                    onOpenEmailComposer({
                                      toEmail: rec.directEmail || rec.generalEmail,
                                      contactName: rec.decisionMaker,
                                      companyName: rec.companyName,
                                      leadId: rec.id,
                                      leadRankId: rec.rankId,
                                      subject: rec.emailSubject,
                                      body: rec.emailBody,
                                    })
                                  }
                                  className="p-1 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded cursor-pointer"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </button>
                                {onOpenInDocStudio && (
                                  <button
                                    type="button"
                                    title="Open in Doc Studio"
                                    onClick={() => onOpenInDocStudio(rec)}
                                    className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {waDigits.length >= 7 && (
                                  <a
                                    href={`https://wa.me/${waDigits}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open WhatsApp"
                                    className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {stageItems.length > 20 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCols((prev) => ({ ...prev, [stage]: !prev[stage] }))
                          }
                          className="w-full py-1.5 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded cursor-pointer"
                        >
                          {isExpanded
                            ? 'Show top 20'
                            : `Show all ${stageItems.length} records in ${stage}`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 18-COLUMN ANDROID SCHEMA DATA TABLE */
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Category / Region</th>
                  <th className="py-2.5 px-3">Decision Maker</th>
                  <th className="py-2.5 px-3">Email / WhatsApp</th>
                  <th className="py-2.5 px-3 text-right">Score</th>
                  <th className="py-2.5 px-3">Stage (Win%)</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">MT</th>
                  <th className="py-2.5 px-3 text-right">Target USD</th>
                  <th className="py-2.5 px-3 text-right">FOB/MT</th>
                  <th className="py-2.5 px-3">Follow-Up</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.slice(0, tableLimit).map((rec) => (
                  <tr
                    key={`${rec.rankId}-${rec.normalizedCompanyKey}`}
                    onClick={() => onSelectRecord?.(rec)}
                    className="hover:bg-slate-50/80 cursor-pointer"
                  >
                    <td className="py-2 px-3 font-mono text-slate-500 tabular-nums">
                      #{rec.rankId}
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-900">{rec.companyName}</div>
                      <div className="text-[11px] text-slate-500">{rec.location}</div>
                    </td>
                    <td className="py-2 px-3 text-[11px] text-slate-700">
                      <div>{rec.leadCategory}</div>
                      <div className="text-slate-500">
                        {TRADE_REGION_LABELS[rec.regionCode] || rec.regionCode}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="text-slate-900 font-medium">{rec.decisionMaker}</div>
                      <div className="text-[11px] text-slate-500">{rec.title}</div>
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                      <div>{rec.directEmail || rec.generalEmail || '—'}</div>
                      <div>{rec.whatsappNumber || '—'}</div>
                    </td>
                    <td className={`py-2 px-3 text-right font-mono tabular-nums ${tierTextClass(rec.priorityTier)}`}>
                      {rec.priorityScore} ({rec.priorityTier})
                    </td>
                    <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={rec.crmStage}
                        onChange={(e) =>
                          void adminMoveLeadStage(rec, e.target.value as CrmStage).then(() =>
                            onNotify(`${rec.companyName} stage updated.`)
                          )
                        }
                        aria-label={`Stage for ${rec.companyName}`}
                        className="h-7 px-1.5 text-[11px] bg-white border border-slate-200 rounded"
                      >
                        {CRM_STAGE_ORDER.map((st) => (
                          <option key={st} value={st}>
                            {CRM_STAGE_LABELS[st]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-700">
                      {rec.outreachStatus}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                      {rec.estimatedTonnage.toLocaleString('en-US')}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-emerald-700">
                      ${rec.targetFobValue.toLocaleString('en-US')}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                      ${rec.impliedFobPricePerMt.toLocaleString('en-US')}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-500 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="w-3 h-3 text-amber-600" />
                        {new Date(rec.followUpAtMillis || Date.now()).toISOString().slice(0, 10)}
                      </span>
                    </td>
                    <td
                      className="py-2 px-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenEmailComposer({
                              toEmail: rec.directEmail || rec.generalEmail,
                              contactName: rec.decisionMaker,
                              companyName: rec.companyName,
                              leadId: rec.id,
                              leadRankId: rec.rankId,
                              subject: rec.emailSubject,
                              body: rec.emailBody,
                            })
                          }
                          className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded cursor-pointer"
                          title={`Email (${stageLegacyPriorityHelper(rec.priorityTier)} priority)`}
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                        {onOpenInDocStudio && (
                          <button
                            type="button"
                            onClick={() => onOpenInDocStudio(rec)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                            title="Open in Doc Studio"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredRecords.length > tableLimit && (
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-mono tabular-nums">
                Showing {tableLimit} of {filteredRecords.length} records
              </span>
              <button
                type="button"
                onClick={() => setTableLimit((prev) => prev + 100)}
                className="px-3 py-1.5 font-semibold text-slate-900 bg-white border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer"
              >
                Load +100 More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
