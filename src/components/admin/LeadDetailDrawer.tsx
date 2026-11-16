import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileText,
  Globe,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import { INCOTERMS_DATA, type IncotermCode } from '../../data/tradeData';
import {
  CRM_STAGE_LABELS,
  CRM_STAGE_ORDER,
  LEAD_CATEGORY_LABELS,
  OUTREACH_STATUS_LIST,
  TRADE_REGION_LABELS,
  type CrmActivityType,
  type CrmStage,
  type LithiumIntelRecord,
  type OutreachStatus,
  type TaskPriority,
} from '../../types/lithiumIntel';
import { normalizeCompanyKey } from '../../utils/duplicateDetector';

interface LeadDetailDrawerProps {
  record: LithiumIntelRecord | null;
  onClose: () => void;
  onOpenEmailComposer: (prefill: {
    toEmail: string;
    contactName: string;
    companyName: string;
    leadId?: string;
    leadRankId?: number;
    subject?: string;
    body?: string;
  }) => void;
  onOpenInDocStudio: (record: LithiumIntelRecord) => void;
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

const ACTIVITY_TYPES: CrmActivityType[] = [
  'WHATSAPP',
  'CALL',
  'EMAIL',
  'MEETING',
  'QUOTE_SENT',
  'NOTE',
];

function formatDateInput(ms: number): string {
  if (!ms || Number.isNaN(ms)) return new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  return new Date(ms).toISOString().slice(0, 10);
}

function toWhatsappHref(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7) return null;
  return `https://wa.me/${digits}`;
}

export default function LeadDetailDrawer({
  record,
  onClose,
  onOpenEmailComposer,
  onOpenInDocStudio,
  onNotify,
  onError,
}: LeadDetailDrawerProps) {
  const {
    crmTasks,
    crmActivities,
    marketConfig,
    adminUpsertIntelLead,
    adminMoveLeadStage,
    adminLogActivity,
    adminCreateTask,
    adminToggleTask,
    adminDeleteTask,
    adminCreateRfqFromLead,
  } = useBuyerAuth();

  const [outreachDraft, setOutreachDraft] = useState<OutreachStatus>('READY');
  const [stageDraft, setStageDraft] = useState<CrmStage>('PROSPECT');
  const [lostReasonDraft, setLostReasonDraft] = useState('');
  const [tonnageDraft, setTonnageDraft] = useState('100');
  const [targetFobDraft, setTargetFobDraft] = useState('0');
  const [nextActionDraft, setNextActionDraft] = useState('');
  const [followUpDateDraft, setFollowUpDateDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [savingPipeline, setSavingPipeline] = useState(false);

  // Copy feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('HIGH');
  const [taskDueDate, setTaskDueDate] = useState(
    new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
  );
  const [addingTask, setAddingTask] = useState(false);

  // Activity form
  const [activityType, setActivityType] = useState<CrmActivityType>('WHATSAPP');
  const [activityOutcome, setActivityOutcome] = useState('Reached Decision Maker');
  const [activitySummary, setActivitySummary] = useState('');
  const [loggingActivity, setLoggingActivity] = useState(false);

  // RFQ Creation Form
  const [showRfqForm, setShowRfqForm] = useState(false);
  const [rfqProduct, setRfqProduct] = useState(
    `Nigerian Lithium-Bearing Spodumene Ore (${marketConfig.lithiumAssayPct}% Li2O · EL 65197)`
  );
  const [rfqQtyMt, setRfqQtyMt] = useState('500');
  const [rfqUnitUsd, setRfqUnitUsd] = useState(
    String(
      Math.round(marketConfig.lithiumRatePerPercentUsd * marketConfig.lithiumAssayPct * 100) / 100
    )
  );
  const [rfqIncoterm, setRfqIncoterm] = useState<IncotermCode>('FOB');
  const [rfqPayment, setRfqPayment] = useState('100% Irrevocable L/C at Sight (UCP 600)');
  const [rfqPort, setRfqPort] = useState('Qingdao / Rotterdam');
  const [rfqValidity, setRfqValidity] = useState(String(marketConfig.quoteValidityDays || 10));
  const [creatingRfq, setCreatingRfq] = useState(false);

  useEffect(() => {
    if (!record) return;
    setOutreachDraft(record.outreachStatus);
    setStageDraft(record.crmStage);
    setLostReasonDraft(record.lostReason || '');
    setTonnageDraft(String(record.estimatedTonnage || 0));
    setTargetFobDraft(String(record.targetFobValue || 0));
    setNextActionDraft(record.nextAction || '');
    setFollowUpDateDraft(formatDateInput(record.followUpAtMillis));
    setNotesDraft(record.notes || record.operationalFit || '');
    setRfqPort(record.location || 'Discharge Port TBA');
    setRfqQtyMt(String(record.estimatedTonnage || 500));
    if (record.leadCategory === 'AFRICA_SOURCING') {
      setRfqProduct('Multi-Commodity Factory-Direct / FLYSAK Lubricants / Agro Schedule');
    } else if (record.leadCategory === 'FUNDING_FINANCE') {
      setRfqProduct('Trade Finance Facility / Offtake-Backed Pre-Export Tranche');
    } else {
      setRfqProduct(
        `Nigerian Lithium-Bearing Spodumene Ore (${marketConfig.lithiumAssayPct}% Li2O · EL 65197)`
      );
    }
    setShowRfqForm(false);
  }, [record, marketConfig.lithiumAssayPct]);

  const leadTasks = useMemo(() => {
    if (!record) return [];
    return crmTasks.filter((t) => t.leadRankId === record.rankId);
  }, [crmTasks, record]);

  const leadActivities = useMemo(() => {
    if (!record) return [];
    const norm = record.normalizedCompanyKey || normalizeCompanyKey(record.companyName);
    return crmActivities.filter(
      (a) =>
        a.leadRankId === record.rankId ||
        normalizeCompanyKey(a.companyName) === norm
    );
  }, [crmActivities, record]);

  if (!record) return null;

  const estTonnageNum = Math.max(0, Number(tonnageDraft) || 0);
  const targetFobNum = Math.max(0, Number(targetFobDraft) || 0);
  const impliedPrice = estTonnageNum > 0 ? targetFobNum / estTonnageNum : 0;
  const waHref = toWhatsappHref(record.whatsappNumber);
  const primaryEmail = record.directEmail || record.generalEmail || '';

  const handleCopy = async (key: string, value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // Clipboard blocked
    }
  };

  const handleStageSelect = async (nextStage: CrmStage) => {
    setStageDraft(nextStage);
    try {
      await adminMoveLeadStage(record, nextStage, lostReasonDraft);
      onNotify(`${record.companyName} moved to ${CRM_STAGE_LABELS[nextStage]}.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update stage.');
    }
  };

  const handleOutreachSelect = async (nextStatus: OutreachStatus) => {
    setOutreachDraft(nextStatus);
    try {
      await adminUpsertIntelLead({
        ...record,
        outreachStatus: nextStatus,
        lastUpdatedMillis: Date.now(),
      });
      onNotify(`Outreach status set to ${nextStatus}.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update outreach status.');
    }
  };

  const handleSaveCommercials = async (e: FormEvent) => {
    e.preventDefault();
    setSavingPipeline(true);
    try {
      await adminUpsertIntelLead({
        ...record,
        crmStage: stageDraft,
        outreachStatus: outreachDraft,
        lostReason: stageDraft === 'LOST' ? lostReasonDraft : '',
        estimatedTonnage: estTonnageNum,
        targetFobValue: targetFobNum,
        nextAction: nextActionDraft,
        followUpAtMillis: followUpDateDraft
          ? new Date(followUpDateDraft).getTime()
          : record.followUpAtMillis,
        notes: notesDraft,
        lastUpdatedMillis: Date.now(),
      });
      onNotify(`Saved commercial dossier for ${record.companyName}.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to save commercial details.');
    } finally {
      setSavingPipeline(false);
    }
  };

  const handleAddTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setAddingTask(true);
    try {
      await adminCreateTask({
        leadRankId: record.rankId,
        companyName: record.companyName,
        title: taskTitle.trim(),
        priority: taskPriority,
        dueAtMillis: taskDueDate ? new Date(taskDueDate).getTime() : Date.now() + 86400000,
      });
      setTaskTitle('');
      onNotify('Follow-up task added & synced.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to create task.');
    } finally {
      setAddingTask(false);
    }
  };

  const handleAddActivity = async (e: FormEvent) => {
    e.preventDefault();
    if (!activitySummary.trim()) return;
    setLoggingActivity(true);
    try {
      await adminLogActivity({
        leadRankId: record.rankId,
        leadId: record.id,
        companyName: record.companyName,
        contactName: record.decisionMaker,
        toEmail: primaryEmail,
        activityType,
        outcome: activityOutcome,
        summary: activitySummary.trim(),
      });
      setActivitySummary('');
      onNotify(`${activityType} interaction logged for ${record.companyName}.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to log activity.');
    } finally {
      setLoggingActivity(false);
    }
  };

  const handleCreateRfq = async (e: FormEvent) => {
    e.preventDefault();
    setCreatingRfq(true);
    try {
      const refId = await adminCreateRfqFromLead({
        lead: record,
        productDescription: rfqProduct,
        quantityMt: Number(rfqQtyMt) || 100,
        unitPriceUsd: Number(rfqUnitUsd) || 950,
        incoterm: rfqIncoterm,
        paymentTerms: rfqPayment,
        validityDays: Number(rfqValidity) || 10,
        destinationPort: rfqPort,
        specifications: `EL 65197 · Assays ZMGN057 & Q38625/H260715-164 · Lead Rank #${record.rankId}`,
      });
      setStageDraft('PROPOSAL_QUOTE');
      setShowRfqForm(false);
      onNotify(`RFQ ${refId} issued and ${record.companyName} advanced to Proposal / Quote (70%).`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to create RFQ.');
    } finally {
      setCreatingRfq(false);
    }
  };

  const rubricItems = [
    { label: 'Product / Spec Fit', score: record.fitScore, max: 25 },
    { label: 'Procurement Readiness', score: record.procScore, max: 25 },
    { label: 'Financial Strength', score: record.finScore, max: 15 },
    { label: 'Decision Maker Access', score: record.dmScore, max: 15 },
    { label: 'ESG & Compliance', score: record.esgScore, max: 10 },
    { label: 'Offtake Volume Capacity', score: record.volScore, max: 10 },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={`${record.companyName} CRM Dossier`}
    >
      <div className="w-full max-w-2xl bg-white h-full overflow-y-auto border-l border-slate-200 flex flex-col">
        {/* Sticky Drawer Header */}
        <div className="sticky top-0 z-10 bg-slate-900 text-white px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-300">
              <span className="text-amber-400 font-bold">#{record.rankId}</span>
              <span aria-hidden="true">·</span>
              <span>{LEAD_CATEGORY_LABELS[record.leadCategory]}</span>
              <span aria-hidden="true">·</span>
              <span>{TRADE_REGION_LABELS[record.regionCode]}</span>
              <span aria-hidden="true">·</span>
              <span className={record.syncedInCloud ? 'text-emerald-400' : 'text-slate-400'}>
                {record.syncedInCloud ? 'Cloud Synced' : 'Seed Catalog'}
              </span>
            </div>
            <h3 className="font-display text-lg font-bold text-white truncate mt-0.5">
              {record.companyName}
            </h3>
            <p className="text-xs text-slate-300 truncate">
              {record.primaryRole} · {record.location}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="font-mono text-lg font-bold text-amber-400 tabular-nums leading-none">
                {record.priorityScore}/100
              </div>
              <div className="text-[11px] font-mono text-slate-300 mt-1">
                Tier {record.priorityTier}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dossier drawer"
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-6 flex-1">
          {/* Risk Watch Callout */}
          {record.isRiskWatch && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2.5 text-xs text-red-900">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Risk Watch Counterparty — Prepay / L/C Only</div>
                <p className="text-[11px] text-red-800 mt-0.5">
                  Enforce 100% irrevocable L/C at sight or confirmed advance deposit prior to origin release.
                </p>
              </div>
            </div>
          )}

          {/* Quick Action Triggers */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onOpenEmailComposer({
                  toEmail: primaryEmail,
                  contactName: record.decisionMaker,
                  companyName: record.companyName,
                  leadId: record.id,
                  leadRankId: record.rankId,
                  subject: record.emailSubject,
                  body: record.emailBody,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              <span>Compose Email</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenInDocStudio(record)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Open in Doc Studio</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRfqForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md cursor-pointer"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>{showRfqForm ? 'Hide RFQ Form' : 'Create RFQ (Auto-Advance 70%)'}</span>
            </button>

            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-md"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </a>
            )}
          </div>

          {/* Inline Create RFQ (Auto-Advance 70%) */}
          {showRfqForm && (
            <form
              onSubmit={(e) => void handleCreateRfq(e)}
              className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-950">
                  Issue Official RFQ &amp; Advance Lead to Proposal / Quote (70%)
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Product / Allocation Description
                  </label>
                  <input
                    type="text"
                    required
                    value={rfqProduct}
                    onChange={(e) => setRfqProduct(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Quantity (MT)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={rfqQtyMt}
                    onChange={(e) => setRfqQtyMt(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Unit Price (USD / MT)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="0.01"
                    required
                    value={rfqUnitUsd}
                    onChange={(e) => setRfqUnitUsd(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Incoterm 2020
                  </label>
                  <select
                    value={rfqIncoterm}
                    onChange={(e) => setRfqIncoterm(e.target.value as IncotermCode)}
                    className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md"
                  >
                    {Object.values(INCOTERMS_DATA).map((inc) => (
                      <option key={inc.code} value={inc.code}>
                        {inc.code} — {inc.name}
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
                    required
                    value={rfqPort}
                    onChange={(e) => setRfqPort(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    required
                    value={rfqPayment}
                    onChange={(e) => setRfqPayment(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Validity (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    required
                    value={rfqValidity}
                    onChange={(e) => setRfqValidity(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-emerald-200 text-xs">
                <span className="font-mono font-bold text-emerald-950 tabular-nums">
                  Total RFQ Value: US$
                  {Math.round((Number(rfqQtyMt) || 0) * (Number(rfqUnitUsd) || 0)).toLocaleString(
                    'en-US'
                  )}
                </span>
                <button
                  type="submit"
                  disabled={creatingRfq}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md cursor-pointer"
                >
                  {creatingRfq && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Issue RFQ &amp; Advance Stage</span>
                </button>
              </div>
            </form>
          )}

          {/* Pipeline & Commercial State */}
          <form
            onSubmit={(e) => void handleSaveCommercials(e)}
            className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Pipeline Status &amp; Deal Sizing
              </h4>
              <span className="font-mono text-xs text-slate-600 tabular-nums">
                Win {record.winProbability}% · Weighted US$
                {record.weightedValueUsd.toLocaleString('en-US')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  CRM Stage
                </label>
                <select
                  value={stageDraft}
                  onChange={(e) => void handleStageSelect(e.target.value as CrmStage)}
                  className="w-full h-9 px-2.5 text-xs font-medium bg-white border border-slate-300 rounded-md"
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
                  value={outreachDraft}
                  onChange={(e) => void handleOutreachSelect(e.target.value as OutreachStatus)}
                  className="w-full h-9 px-2.5 text-xs font-medium bg-white border border-slate-300 rounded-md"
                >
                  {OUTREACH_STATUS_LIST.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {stageDraft === 'LOST' && (
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-red-700 mb-1">
                    Lost Reason (Required for Closed-Lost Audit)
                  </label>
                  <input
                    type="text"
                    value={lostReasonDraft}
                    onChange={(e) => setLostReasonDraft(e.target.value)}
                    placeholder="Price spread, credit terms, SGS logistics window..."
                    className="w-full h-9 px-2.5 text-xs bg-white border border-red-300 rounded-md"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Estimated Tonnage (MT)
                </label>
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={tonnageDraft}
                  onChange={(e) => setTonnageDraft(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Target FOB Value (USD)
                </label>
                <input
                  type="number"
                  min={0}
                  step="100"
                  value={targetFobDraft}
                  onChange={(e) => setTargetFobDraft(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Follow-Up Date
                </label>
                <input
                  type="date"
                  value={followUpDateDraft}
                  onChange={(e) => setFollowUpDateDraft(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div className="flex flex-col justify-end">
                <div className="h-9 px-3 bg-white border border-slate-200 rounded-md flex items-center justify-between text-xs">
                  <span className="text-slate-500">Implied FOB / MT</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    US${impliedPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Next Executive Action
                </label>
                <input
                  type="text"
                  value={nextActionDraft}
                  onChange={(e) => setNextActionDraft(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Executive Notes &amp; Operational Fit
                </label>
                <textarea
                  rows={2}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPipeline}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
              >
                {savingPipeline ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Save &amp; Sync Lead</span>
              </button>
            </div>
          </form>

          {/* 100-Point Rubric Breakdown */}
          <div className="p-4 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                100-Point Scoring Rubric Breakdown
              </h4>
              <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                {record.priorityScore} / 100
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5">
              {rubricItems.map((item) => {
                const pct = Math.min(100, Math.round((item.score / item.max) * 100));
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 font-medium">{item.label}</span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {item.score}/{item.max}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Decision Maker & Contact Channels */}
          <div className="p-4 border border-slate-200 rounded-lg space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Decision Maker &amp; Direct Routing
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[11px] text-slate-500">Decision Maker</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {record.decisionMaker}
                </div>
                <div className="text-[11px] text-slate-600">{record.title}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Routing Note / Source</div>
                <div className="text-slate-800 mt-0.5">
                  {record.emailRouteNote || record.profileSource || 'Direct Trade Registry'}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Direct / General Email</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-slate-900 truncate">
                    {primaryEmail || '—'}
                  </span>
                  {primaryEmail && (
                    <button
                      type="button"
                      onClick={() => void handleCopy('email', primaryEmail)}
                      className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                      title="Copy email"
                    >
                      {copiedKey === 'email' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">WhatsApp / Phone</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-slate-900">
                    {record.whatsappNumber || '—'}
                  </span>
                  {record.whatsappNumber && (
                    <button
                      type="button"
                      onClick={() => void handleCopy('wa', record.whatsappNumber)}
                      className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                      title="Copy WhatsApp number"
                    >
                      {copiedKey === 'wa' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {record.websiteUrl && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <a
                  href={record.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-slate-700 hover:text-amber-700 font-medium"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{record.websiteDisplay || record.websiteUrl}</span>
                </a>
                {record.linkedInNote && (
                  <button
                    type="button"
                    onClick={() => void handleCopy('li', record.linkedInNote)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    {copiedKey === 'li' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copy LinkedIn Note</span>
                  </button>
                )}
              </div>
            )}

            {/* Pre-built Outreach Email Template */}
            {record.emailBody && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-700">
                    Outreach Template: {record.emailSubject}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      void handleCopy(
                        'tpl',
                        `Subject: ${record.emailSubject}\n\n${record.emailBody}`
                      )
                    }
                    className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 cursor-pointer shrink-0"
                  >
                    {copiedKey === 'tpl' ? 'Copied' : 'Copy Script'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 whitespace-pre-line line-clamp-4">
                  {record.emailBody}
                </p>
              </div>
            )}
          </div>

          {/* Follow-Up Tasks */}
          <div className="p-4 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                <span>Follow-Up Tasks ({leadTasks.length})</span>
              </h4>
            </div>

            <form onSubmit={(e) => void handleAddTask(e)} className="flex flex-wrap gap-2">
              <input
                type="text"
                required
                placeholder="Add follow-up milestone (e.g., Send SGS Lab Certificate)..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="flex-1 min-w-[200px] h-8 px-2.5 text-xs border border-slate-300 rounded-md"
              />
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                className="h-8 px-2 text-xs bg-white border border-slate-300 rounded-md"
              >
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="h-8 px-2 text-xs font-mono border border-slate-300 rounded-md"
              />
              <button
                type="submit"
                disabled={addingTask}
                className="inline-flex items-center gap-1 px-3 h-8 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
              >
                {addingTask ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                <span>Add</span>
              </button>
            </form>

            {leadTasks.length === 0 ? (
              <p className="text-xs text-slate-500">No tasks scheduled for this lead yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {leadTasks.map((t) => {
                  const overdue = !t.isCompleted && t.dueAtMillis < Date.now();
                  return (
                    <li key={t.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => void adminToggleTask(t.id, !t.isCompleted)}
                        className="flex items-center gap-2 text-left cursor-pointer min-w-0"
                      >
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 ${
                            t.isCompleted ? 'text-emerald-600' : 'text-slate-300'
                          }`}
                        />
                        <span
                          className={`truncate ${
                            t.isCompleted ? 'line-through text-slate-400' : 'text-slate-900 font-medium'
                          }`}
                        >
                          {t.title}
                        </span>
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-mono text-[11px] tabular-nums ${
                            overdue ? 'text-red-600 font-semibold' : 'text-slate-500'
                          }`}
                        >
                          {t.priority} · {new Date(t.dueAtMillis).toISOString().slice(0, 10)}
                        </span>
                        <button
                          type="button"
                          onClick={() => void adminDeleteTask(t.id)}
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* CRM Activity Feed & Quick Logger */}
          <div className="p-4 border border-slate-200 rounded-lg space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-600" />
              <span>Interaction &amp; Outreach Timeline ({leadActivities.length})</span>
            </h4>

            <form onSubmit={(e) => void handleAddActivity(e)} className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value as CrmActivityType)}
                  className="h-8 px-2 text-xs bg-white border border-slate-300 rounded-md"
                >
                  {ACTIVITY_TYPES.map((tp) => (
                    <option key={tp} value={tp}>
                      {tp}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={activityOutcome}
                  onChange={(e) => setActivityOutcome(e.target.value)}
                  placeholder="Outcome (e.g., Requested CIF Qingdao Quote)"
                  className="h-8 px-2.5 text-xs border border-slate-300 rounded-md"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={activitySummary}
                  onChange={(e) => setActivitySummary(e.target.value)}
                  placeholder="Log call notes, WhatsApp response, or quote details..."
                  className="flex-1 h-8 px-2.5 text-xs border border-slate-300 rounded-md"
                />
                <button
                  type="submit"
                  disabled={loggingActivity}
                  className="inline-flex items-center gap-1 px-3 h-8 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
                >
                  {loggingActivity ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  <span>Log</span>
                </button>
              </div>
            </form>

            {leadActivities.length === 0 ? (
              <p className="text-xs text-slate-500">
                No interactions recorded yet. Log a WhatsApp, Call, Email, or Quote above.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {leadActivities.map((act) => (
                  <div key={act.id} className="py-2 text-xs space-y-0.5">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
                      <span className="font-bold text-slate-800">
                        {act.activityType} · {act.outcome}
                      </span>
                      <span className="tabular-nums">
                        {new Date(act.createdAtMillis).toISOString().slice(0, 10)}
                      </span>
                    </div>
                    <p className="text-slate-700">{act.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
