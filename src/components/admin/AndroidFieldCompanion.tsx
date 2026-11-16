import { useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Landmark,
  Loader2,
  Mail,
  MessageSquare,
  PhoneCall,
  Pickaxe,
  Plus,
  Search,
  Ship,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import {
  CRM_STAGE_LABELS,
  LEAD_CATEGORY_LABELS,
  TRADE_REGION_LABELS,
  type CrmActivityType,
  type CrmStage,
  type LeadCategory,
  type LithiumIntelRecord,
  type TaskPriority,
} from '../../types/lithiumIntel';
import type { EmailComposerPrefill } from './CrmLeadsWorkspace';

interface AndroidFieldCompanionProps {
  onSelectLead: (record: LithiumIntelRecord) => void;
  onOpenEmailComposer: (prefill: EmailComposerPrefill) => void;
  onOpenInDocStudio: (record: LithiumIntelRecord) => void;
  onOpenSyncDrawer: () => void;
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

type TaskBucketFilter = 'OPEN' | 'OVERDUE' | 'TODAY' | 'COMPLETED' | 'ALL';

function formatDueBadge(dueAtMillis: number, isCompleted: boolean): {
  label: string;
  tone: 'overdue' | 'today' | 'upcoming' | 'done';
} {
  if (isCompleted) return { label: 'Completed', tone: 'done' };
  if (!dueAtMillis) return { label: 'No date', tone: 'upcoming' };
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = todayStart.getTime() + 86400000;
  const dateStr = new Date(dueAtMillis).toISOString().slice(0, 10);

  if (dueAtMillis < now && dueAtMillis < todayStart.getTime()) {
    return { label: `Overdue (${dateStr})`, tone: 'overdue' };
  }
  if (dueAtMillis >= todayStart.getTime() && dueAtMillis < tomorrowStart) {
    return { label: `Due Today (${dateStr})`, tone: 'today' };
  }
  return { label: dateStr, tone: 'upcoming' };
}

function getNextStage(current: CrmStage): CrmStage | null {
  const progression: CrmStage[] = [
    'PROSPECT',
    'CONTACTED',
    'QUALIFIED',
    'PROPOSAL_QUOTE',
    'NEGOTIATION',
    'WON',
  ];
  const idx = progression.indexOf(current);
  if (idx === -1 || idx >= progression.length - 1) return null;
  return progression[idx + 1];
}

function toWhatsappHref(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7) return null;
  return `https://wa.me/${digits}`;
}

export default function AndroidFieldCompanion({
  onSelectLead,
  onOpenEmailComposer,
  onOpenInDocStudio,
  onOpenSyncDrawer,
  onNotify,
  onError,
}: AndroidFieldCompanionProps) {
  const {
    unifiedTradeBook,
    crmTasks,
    crmActivities,
    kpiSummary,
    lastSyncedAt,
    adminCreateTask,
    adminToggleTask,
    adminRescheduleTask,
    adminDeleteTask,
    adminMoveLeadStage,
    adminLogActivity,
  } = useBuyerAuth();

  // Task Queue State
  const [taskFilter, setTaskFilter] = useState<TaskBucketFilter>('OPEN');
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskRankId, setNewTaskRankId] = useState<number>(
    unifiedTradeBook[0]?.rankId || 1
  );
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('HIGH');
  const [newTaskDueDate, setNewTaskDueDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [creatingTask, setCreatingTask] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  // Android Quick-Tap Card Deck State
  const [categoryTab, setCategoryTab] = useState<'ALL' | LeadCategory>('ALL');
  const [tierAOnly, setTierAOnly] = useState(false);
  const [cardSearch, setCardSearch] = useState('');
  const [cardLimit, setCardLimit] = useState(18);
  const [loggingRankId, setLoggingRankId] = useState<number | null>(null);
  const [quickLogType, setQuickLogType] = useState<CrmActivityType>('CALL');
  const [quickLogNote, setQuickLogNote] = useState('');
  const [savingQuickLog, setSavingQuickLog] = useState(false);
  const [advancingRankId, setAdvancingRankId] = useState<number | null>(null);

  const filteredTasks = useMemo(() => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = todayStart.getTime() + 86400000;

    return crmTasks.filter((t) => {
      if (taskFilter === 'OPEN') return !t.isCompleted;
      if (taskFilter === 'COMPLETED') return t.isCompleted;
      if (taskFilter === 'OVERDUE') {
        return !t.isCompleted && t.dueAtMillis > 0 && t.dueAtMillis < now;
      }
      if (taskFilter === 'TODAY') {
        return (
          !t.isCompleted &&
          t.dueAtMillis >= todayStart.getTime() &&
          t.dueAtMillis < tomorrowStart
        );
      }
      return true;
    });
  }, [crmTasks, taskFilter]);

  const deckRecords = useMemo(() => {
    const q = cardSearch.trim().toLowerCase();
    return unifiedTradeBook.filter((r) => {
      if (categoryTab !== 'ALL' && r.leadCategory !== categoryTab) return false;
      if (tierAOnly && r.priorityTier !== 'A') return false;
      if (!q) return true;
      return (
        r.companyName.toLowerCase().includes(q) ||
        r.decisionMaker.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.primaryRole.toLowerCase().includes(q) ||
        String(r.rankId).includes(q)
      );
    });
  }, [unifiedTradeBook, categoryTab, tierAOnly, cardSearch]);

  const handleCreateTaskSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const partner = unifiedTradeBook.find((r) => r.rankId === newTaskRankId);
    if (!partner) return;
    setCreatingTask(true);
    try {
      const dueMs = newTaskDueDate
        ? new Date(newTaskDueDate).getTime() + 12 * 3600000
        : Date.now() + 86400000;
      await adminCreateTask({
        leadRankId: partner.rankId,
        companyName: partner.companyName,
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
        dueAtMillis: dueMs,
      });
      setNewTaskTitle('');
      setShowNewTaskForm(false);
      onNotify(`Follow-up task queued for ${partner.companyName} & synced to Firestore crmTasks.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to create task.');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleSnoozeTask = async (taskId: string, days: number) => {
    setBusyTaskId(taskId);
    try {
      await adminRescheduleTask(taskId, Date.now() + days * 86400000);
      onNotify(`Task rescheduled +${days} day(s) in Firestore.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to reschedule task.');
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleAdvanceStage = async (record: LithiumIntelRecord) => {
    const next = getNextStage(record.crmStage);
    if (!next) return;
    setAdvancingRankId(record.rankId);
    try {
      await adminMoveLeadStage(record, next);
      onNotify(`${record.companyName} advanced to ${CRM_STAGE_LABELS[next]}.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to advance stage.');
    } finally {
      setAdvancingRankId(null);
    }
  };

  const handleLogWhatsappTap = async (record: LithiumIntelRecord) => {
    try {
      await adminLogActivity({
        leadRankId: record.rankId,
        leadId: record.id,
        companyName: record.companyName,
        contactName: record.decisionMaker,
        toEmail: record.directEmail || record.generalEmail,
        activityType: 'WHATSAPP',
        outcome: 'WhatsApp Outreach Opened',
        summary: `Launched WhatsApp field outreach to ${record.decisionMaker} (${record.whatsappNumber}).`,
      });
    } catch {
      // Non-blocking audit log
    }
  };

  const handleSaveQuickLog = async (record: LithiumIntelRecord) => {
    if (!quickLogNote.trim()) return;
    setSavingQuickLog(true);
    try {
      await adminLogActivity({
        leadRankId: record.rankId,
        leadId: record.id,
        companyName: record.companyName,
        contactName: record.decisionMaker,
        toEmail: record.directEmail || record.generalEmail,
        activityType: quickLogType,
        outcome: `${quickLogType} Logged (Field Companion)`,
        summary: quickLogNote.trim(),
      });
      setLoggingRankId(null);
      setQuickLogNote('');
      onNotify(`${quickLogType} activity logged for ${record.companyName}.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to log activity.');
    } finally {
      setSavingQuickLog(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Android Companion Header Banner */}
      <div className="p-4 bg-slate-900 text-white border border-slate-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-mono text-amber-400">
            <Smartphone className="w-3.5 h-3.5" />
            <span>LITHIUM INTEL ANDROID FIELD COMPANION · MIRROR DESK</span>
          </div>
          <h4 className="font-display text-base font-bold">
            Daily Follow-Ups, Quick-Tap Outreach Cards &amp; Live Activity Feed
          </h4>
          <p className="text-xs text-slate-300">
            Mirrors the mobile Lithium Intel app workflow 1:1 over live Firestore collections{' '}
            <span className="font-mono text-emerald-300">crmTasks</span>,{' '}
            <span className="font-mono text-emerald-300">crmLeads</span>, and{' '}
            <span className="font-mono text-emerald-300">crmEmails</span>
            {lastSyncedAt ? ` · Updated ${lastSyncedAt.toLocaleTimeString()}` : ''}.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenSyncDrawer}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md cursor-pointer shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Pair Remixed Android App / CSV Sync</span>
        </button>
      </div>

      {/* Top Split: Tasks Queue (Left 7 cols) + Live Activity Feed (Right 5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Tasks Command Queue */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h5 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-amber-600" />
                <span>Follow-Up Tasks Queue ({crmTasks.length})</span>
              </h5>
              <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                {kpiSummary.openTasksCount} open · {kpiSummary.overdueTasksCount} overdue
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewTaskForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>{showNewTaskForm ? 'Close' : 'New Task'}</span>
            </button>
          </div>

          {showNewTaskForm && (
            <form
              onSubmit={(e) => void handleCreateTaskSubmit(e)}
              className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2.5 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Counterparty (#Rank)
                  </label>
                  <select
                    value={newTaskRankId}
                    onChange={(e) => setNewTaskRankId(Number(e.target.value))}
                    className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
                  >
                    {unifiedTradeBook.map((r) => (
                      <option key={r.rankId} value={r.rankId}>
                        #{r.rankId} {r.companyName} ({r.leadCategory})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                      className="w-full h-9 px-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
                    >
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="w-full h-9 px-2 text-xs font-mono bg-white border border-slate-300 rounded-md text-slate-900"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={240}
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g., Follow up on Foshan Assay Q38625 & L/C confirmation"
                  className="flex-1 h-9 px-3 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
                />
                <button
                  type="submit"
                  disabled={creatingTask}
                  className="inline-flex items-center justify-center gap-1.5 px-4 h-9 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md cursor-pointer disabled:opacity-60 shrink-0"
                >
                  {creatingTask && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Task</span>
                </button>
              </div>
            </form>
          )}

          {/* Task Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'OPEN', label: `Open (${kpiSummary.openTasksCount})` },
                { id: 'OVERDUE', label: `Overdue (${kpiSummary.overdueTasksCount})` },
                { id: 'TODAY', label: 'Due Today' },
                { id: 'COMPLETED', label: 'Completed' },
                { id: 'ALL', label: `All (${crmTasks.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTaskFilter(tab.id)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded border cursor-pointer font-mono tabular-nums ${
                  taskFilter === tab.id
                    ? 'bg-slate-950 text-white border-slate-950'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {filteredTasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-md">
              No tasks in this queue. Tap &ldquo;New Task&rdquo; or schedule follow-ups from any partner card below.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
              {filteredTasks.map((task) => {
                const badge = formatDueBadge(task.dueAtMillis, task.isCompleted);
                const linkedRecord = unifiedTradeBook.find(
                  (r) => r.rankId === task.leadRankId
                );
                const busy = busyTaskId === task.id;
                return (
                  <div
                    key={task.id}
                    className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void adminToggleTask(task.id, !task.isCompleted)
                        }
                        aria-label={task.isCompleted ? 'Reopen task' : 'Complete task'}
                        className="mt-0.5 text-slate-500 hover:text-emerald-600 cursor-pointer shrink-0"
                      >
                        {task.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div
                          className={`font-semibold ${
                            task.isCompleted
                              ? 'line-through text-slate-400'
                              : 'text-slate-900'
                          }`}
                        >
                          {task.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-700">
                            #{task.leadRankId} {task.companyName}
                          </span>
                          <span>·</span>
                          <span
                            className={
                              task.priority === 'HIGH'
                                ? 'text-red-700 font-bold'
                                : task.priority === 'MEDIUM'
                                  ? 'text-amber-700 font-semibold'
                                  : 'text-slate-500'
                            }
                          >
                            {task.priority}
                          </span>
                          <span>·</span>
                          <span
                            className={
                              badge.tone === 'overdue'
                                ? 'text-red-700 font-bold'
                                : badge.tone === 'today'
                                  ? 'text-amber-700 font-semibold'
                                  : 'text-slate-500'
                            }
                          >
                            {badge.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pl-6 sm:pl-0">
                      {!task.isCompleted && (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleSnoozeTask(task.id, 1)}
                            className="px-2 py-1 text-[11px] font-mono text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                          >
                            +1d
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleSnoozeTask(task.id, 3)}
                            className="px-2 py-1 text-[11px] font-mono text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                          >
                            +3d
                          </button>
                        </>
                      )}
                      {linkedRecord && (
                        <button
                          type="button"
                          onClick={() => onSelectLead(linkedRecord)}
                          className="px-2 py-1 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded cursor-pointer"
                        >
                          Dossier
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void adminDeleteTask(task.id)}
                        aria-label="Delete task"
                        className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Unified Mobile/Web Activity Feed */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <h5 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Two-Way Field Activity Stream</span>
            </h5>
            <span className="font-mono text-[11px] text-slate-500 tabular-nums">
              {crmActivities.length} event(s)
            </span>
          </div>

          {crmActivities.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-md">
              No outreach events logged yet. Tap WhatsApp, Log Call, or Stage Advance below to record synced activities.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
              {crmActivities.slice(0, 25).map((act) => {
                const linkedRecord = unifiedTradeBook.find(
                  (r) => r.rankId === act.leadRankId
                );
                return (
                  <div key={act.id} className="py-2.5 text-xs space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-900">
                        {act.activityType} · {act.companyName}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                        {new Date(act.createdAtMillis).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">
                      {act.outcome} — {act.summary}
                    </p>
                    {linkedRecord && (
                      <button
                        type="button"
                        onClick={() => onSelectLead(linkedRecord)}
                        className="text-[11px] font-semibold text-amber-700 hover:underline cursor-pointer"
                      >
                        Open #{linkedRecord.rankId} Dossier
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Android-Style Quick-Tap Field Outreach Card Deck */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h5 className="font-display text-sm font-bold text-slate-900">
              Field Outreach Card Deck ({deckRecords.length} Partners)
            </h5>
            <p className="text-xs text-slate-500">
              Tap WhatsApp, Email, Quick Call Log, or Stage Advance on any card — mutations sync immediately to Android via Firestore.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={cardSearch}
                onChange={(e) => setCardSearch(e.target.value)}
                placeholder="Filter company, port, #rank..."
                className="h-9 pl-8 pr-3 text-xs border border-slate-300 rounded-md text-slate-900 w-56"
              />
            </div>
            <button
              type="button"
              onClick={() => setTierAOnly((p) => !p)}
              className={`h-9 px-3 text-xs font-semibold rounded-md border cursor-pointer ${
                tierAOnly
                  ? 'bg-amber-500 text-slate-950 border-amber-500'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Tier A Only (80+)
            </button>
          </div>
        </div>

        {/* Category Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'ALL', label: `All Partners (${unifiedTradeBook.length})`, icon: Smartphone },
              {
                id: 'LITHIUM',
                label: `${LEAD_CATEGORY_LABELS.LITHIUM}`,
                icon: Pickaxe,
              },
              {
                id: 'AFRICA_SOURCING',
                label: `${LEAD_CATEGORY_LABELS.AFRICA_SOURCING}`,
                icon: Ship,
              },
              {
                id: 'FUNDING_FINANCE',
                label: `${LEAD_CATEGORY_LABELS.FUNDING_FINANCE}`,
                icon: Landmark,
              },
            ] as const
          ).map((cat) => {
            const Icon = cat.icon;
            const active = categoryTab === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategoryTab(cat.id);
                  setCardLimit(18);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border cursor-pointer ${
                  active
                    ? 'bg-slate-950 text-white border-slate-950'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Responsive Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {deckRecords.slice(0, cardLimit).map((rec) => {
            const waHref = toWhatsappHref(rec.whatsappNumber);
            const nextStage = getNextStage(rec.crmStage);
            const isLogging = loggingRankId === rec.rankId;
            const advancing = advancingRankId === rec.rankId;

            return (
              <div
                key={rec.id}
                className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectLead(rec)}
                      className="text-left font-display text-sm font-bold text-slate-900 hover:text-amber-700 cursor-pointer leading-snug"
                    >
                      #{rec.rankId} · {rec.companyName}
                    </button>
                    <span
                      className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border shrink-0 tabular-nums ${
                        rec.priorityTier === 'A'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : rec.priorityTier === 'B'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {rec.priorityTier}·{rec.priorityScore}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-1.5">
                    <span>{TRADE_REGION_LABELS[rec.regionCode] || rec.regionCode}</span>
                    <span>·</span>
                    <span>{rec.decisionMaker}</span>
                    {rec.isRiskWatch && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5 text-red-700 font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          Prepay Watch
                        </span>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px] font-mono tabular-nums">
                    <div className="p-1.5 bg-white border border-slate-200 rounded">
                      <div className="text-[10px] text-slate-400">Stage</div>
                      <div className="font-semibold text-slate-800 truncate">
                        {rec.crmStage}
                      </div>
                    </div>
                    <div className="p-1.5 bg-white border border-slate-200 rounded">
                      <div className="text-[10px] text-slate-400">Tonnage</div>
                      <div className="font-semibold text-slate-800">
                        {rec.estimatedTonnage} MT
                      </div>
                    </div>
                    <div className="p-1.5 bg-white border border-slate-200 rounded">
                      <div className="text-[10px] text-slate-400">Target FOB</div>
                      <div className="font-semibold text-emerald-700">
                        ${(rec.targetFobValue / 1000).toFixed(0)}k
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inline Quick Activity Log Input */}
                {isLogging && (
                  <div className="p-2.5 bg-white border border-slate-300 rounded space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={quickLogType}
                        onChange={(e) =>
                          setQuickLogType(e.target.value as CrmActivityType)
                        }
                        className="h-7 px-2 text-[11px] font-mono border border-slate-200 rounded"
                      >
                        <option value="CALL">CALL</option>
                        <option value="WHATSAPP">WHATSAPP</option>
                        <option value="MEETING">MEETING</option>
                        <option value="NOTE">NOTE</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setLoggingRankId(null)}
                        className="text-[11px] text-slate-500 hover:text-slate-900 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    <input
                      type="text"
                      value={quickLogNote}
                      onChange={(e) => setQuickLogNote(e.target.value)}
                      placeholder="Quick outcome note..."
                      className="w-full h-8 px-2 text-xs border border-slate-200 rounded"
                    />
                    <button
                      type="button"
                      disabled={savingQuickLog || !quickLogNote.trim()}
                      onClick={() => void handleSaveQuickLog(rec)}
                      className="w-full h-7 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded cursor-pointer disabled:opacity-50"
                    >
                      {savingQuickLog ? 'Saving...' : 'Save Synced Activity'}
                    </button>
                  </div>
                )}

                {/* Quick-Tap Field Action Strip */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200">
                  {waHref && (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => void handleLogWhatsappTap(rec)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </a>
                  )}

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
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-amber-50 border border-slate-200 rounded cursor-pointer"
                  >
                    <Mail className="w-3 h-3 text-amber-700" />
                    <span>Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoggingRankId(isLogging ? null : rec.rankId);
                      setQuickLogNote('');
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded cursor-pointer"
                  >
                    <PhoneCall className="w-3 h-3 text-slate-600" />
                    <span>Log</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenInDocStudio(rec)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded cursor-pointer"
                  >
                    <FileText className="w-3 h-3 text-slate-600" />
                    <span>Doc</span>
                  </button>

                  {nextStage && (
                    <button
                      type="button"
                      disabled={advancing}
                      onClick={() => void handleAdvanceStage(rec)}
                      className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded cursor-pointer disabled:opacity-50"
                    >
                      {advancing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ArrowRight className="w-3 h-3 text-amber-400" />
                      )}
                      <span>{nextStage.replace('_', ' ')}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {deckRecords.length > cardLimit && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setCardLimit((c) => c + 18)}
              className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md cursor-pointer inline-flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>
                Load More ({deckRecords.length - cardLimit} remaining)
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
