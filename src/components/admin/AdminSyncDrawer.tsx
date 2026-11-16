import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CloudUpload,
  Copy,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  FileUp,
  KeyRound,
  Loader2,
  RefreshCw,
  Server,
  Smartphone,
  Users,
  X,
} from 'lucide-react';
import firebaseConfig from '../../../firebase-applet-config.json';
import { useBuyerAuth, type AdminBuyerDoc } from '../../context/BuyerAuthContext';
import {
  computePriorityTier,
  CRM_STAGE_ORDER,
  CSV_EXPORT_HEADERS_18,
  OUTREACH_STATUS_LIST,
  STAGE_WIN_PROBABILITY,
  TRADE_REGION_LABELS,
  type AndroidBackupPayload,
  type CrmActivityRecord,
  type CrmStage,
  type CrmTaskRecord,
  type LeadCategory,
  type LithiumIntelRecord,
  type OutreachStatus,
  type TradeRegion,
} from '../../types/lithiumIntel';
import {
  auditDuplicates,
  checkDuplicateLead,
  mergeRecordsByTimestamp,
  normalizeCompanyKey,
} from '../../utils/duplicateDetector';
import DuplicateAuditBadge from './DuplicateAuditBadge';

type CsvDatasetScope = 'leads' | 'buyers' | 'both';

interface AdminSyncDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
  onSelectLead?: (record: LithiumIntelRecord) => void;
}

interface PendingCsvImport {
  kind: 'csv';
  scope: CsvDatasetScope;
  sourceLabel: string;
  records: LithiumIntelRecord[];
  previewInserted: number;
  previewUpdated: number;
  previewSkippedOlder: number;
  duplicateWarnings: string[];
  intraFileDuplicates: number;
}

interface PendingJsonImport {
  kind: 'json';
  sourceLabel: string;
  records: LithiumIntelRecord[];
  activities: CrmActivityRecord[];
  tasks: CrmTaskRecord[];
  marketUpdates?: AndroidBackupPayload['marketConfig'];
  previewInserted: number;
  previewUpdated: number;
  previewSkippedOlder: number;
  duplicateWarnings: string[];
}

type PendingSyncPayload = PendingCsvImport | PendingJsonImport;

function parseCsvLines(text: string): string[][] {
  const cleaned = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const next = cleaned[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(current.trim());
      current = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && next === '\n') i++;
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }
  return rows;
}

function buildRegionLookup(): Map<string, TradeRegion> {
  const map = new Map<string, TradeRegion>();
  (Object.keys(TRADE_REGION_LABELS) as TradeRegion[]).forEach((code) => {
    map.set(code.toLowerCase(), code);
    map.set(TRADE_REGION_LABELS[code].toLowerCase(), code);
  });
  return map;
}

const REGION_LOOKUP = buildRegionLookup();

function resolveTradeRegion(raw: string | undefined, fallback?: TradeRegion): TradeRegion {
  if (!raw) return fallback || 'ASIA_PACIFIC';
  const norm = raw.trim().toLowerCase();
  const exact = REGION_LOOKUP.get(norm);
  if (exact) return exact;
  for (const [label, code] of REGION_LOOKUP.entries()) {
    if (norm.includes(label) || label.includes(norm)) return code;
  }
  return fallback || 'ASIA_PACIFIC';
}

function resolveLeadCategory(raw: string | undefined, fallback?: LeadCategory): LeadCategory {
  const norm = (raw || '').trim().toUpperCase();
  if (norm === 'LITHIUM' || norm.includes('LITHIUM')) return 'LITHIUM';
  if (norm === 'AFRICA_SOURCING' || norm.includes('AFRICA') || norm.includes('SOURCING')) {
    return 'AFRICA_SOURCING';
  }
  if (norm === 'FUNDING_FINANCE' || norm.includes('FUND') || norm.includes('INVEST')) {
    return 'FUNDING_FINANCE';
  }
  return fallback || 'LITHIUM';
}

function resolveCrmStage(raw: string | undefined, fallback?: CrmStage): CrmStage {
  const norm = (raw || '').trim().toUpperCase().replace(/[^A-Z_]/g, '_');
  if (CRM_STAGE_ORDER.includes(norm as CrmStage)) return norm as CrmStage;
  if (norm.includes('PROSPECT')) return 'PROSPECT';
  if (norm.includes('CONTACT')) return 'CONTACTED';
  if (norm.includes('QUALIF')) return 'QUALIFIED';
  if (norm.includes('PROPOSAL') || norm.includes('QUOTE')) return 'PROPOSAL_QUOTE';
  if (norm.includes('NEGOT')) return 'NEGOTIATION';
  if (norm.includes('WON')) return 'WON';
  if (norm.includes('LOST')) return 'LOST';
  return fallback || 'PROSPECT';
}

function resolveOutreachStatus(
  raw: string | undefined,
  fallback?: OutreachStatus
): OutreachStatus {
  const norm = (raw || '').trim().toUpperCase().replace(/[^A-Z_]/g, '_');
  if (OUTREACH_STATUS_LIST.includes(norm as OutreachStatus)) {
    return norm as OutreachStatus;
  }
  return fallback || 'READY';
}

function mapBuyerDocToIntelRecord(
  buyer: AdminBuyerDoc,
  tradeBook: LithiumIntelRecord[],
  fallbackIdx: number
): LithiumIntelRecord {
  const normKey = buyer.normalizedCompanyKey || normalizeCompanyKey(buyer.companyName || '');
  const matched = tradeBook.find(
    (r) =>
      (typeof buyer.rankId === 'number' && r.rankId === buyer.rankId) ||
      (normKey && r.normalizedCompanyKey === normKey)
  );
  if (matched) {
    return {
      ...matched,
      companyName: buyer.companyName || matched.companyName,
      decisionMaker: buyer.contactName || matched.decisionMaker,
      directEmail: buyer.email || matched.directEmail,
      location: buyer.defaultPort || matched.location,
      leadCategory: buyer.leadCategory || matched.leadCategory,
      regionCode: buyer.regionCode || matched.regionCode,
      crmStage: buyer.crmStage || matched.crmStage,
      outreachStatus: buyer.outreachStatus || matched.outreachStatus,
      priorityScore: buyer.priorityScore ?? matched.priorityScore,
      priorityTier: buyer.priorityTier || matched.priorityTier,
      targetFobValue: buyer.targetFobValue ?? matched.targetFobValue,
      lastUpdatedMillis: buyer.lastUpdatedMillis || matched.lastUpdatedMillis,
    };
  }

  const score = buyer.priorityScore ?? 75;
  const stage: CrmStage = buyer.crmStage || 'QUALIFIED';
  const winProb = STAGE_WIN_PROBABILITY[stage] ?? 50;
  const targetFob = buyer.targetFobValue ?? 0;

  return {
    id: buyer.id,
    rankId: buyer.rankId ?? 2000 + fallbackIdx,
    companyName: buyer.companyName || `Buyer ${fallbackIdx + 1}`,
    normalizedCompanyKey: normKey,
    leadCategory: buyer.leadCategory || 'LITHIUM',
    regionCode: buyer.regionCode || 'ASIA_PACIFIC',
    location: buyer.defaultPort || 'International',
    primaryRole: 'Verified Buyer Account',
    priorityScore: score,
    priorityTier: buyer.priorityTier || computePriorityTier(score),
    fitScore: Math.round(score * 0.25),
    procScore: Math.round(score * 0.25),
    finScore: Math.round(score * 0.15),
    dmScore: Math.round(score * 0.15),
    esgScore: Math.round(score * 0.1),
    volScore: Math.round(score * 0.1),
    decisionMaker: buyer.contactName || 'Procurement Desk',
    title: 'Buyer Representative',
    generalEmail: buyer.email || '',
    directEmail: buyer.email || '',
    emailRouteNote: 'Firestore buyers collection',
    whatsappNumber: '',
    websiteUrl: '',
    websiteDisplay: '',
    profileSource: 'Firestore Buyers Collection',
    operationalFit: '',
    emailSubject: `Ahzan Tech Ltd · ${buyer.companyName}`,
    emailBody: '',
    linkedInNote: '',
    outreachStatus: buyer.outreachStatus || 'READY',
    crmStage: stage,
    winProbability: winProb,
    estimatedTonnage: 100,
    targetFobValue: targetFob,
    impliedFobPricePerMt: targetFob > 0 ? Number((targetFob / 100).toFixed(2)) : 0,
    weightedValueUsd: Math.round((targetFob * winProb) / 100),
    followUpAtMillis: Date.now() + 3 * 86400000,
    nextAction: 'Confirm port & allocation window',
    tags: 'firestore-buyer',
    lostReason: '',
    notes: '',
    isRiskWatch: false,
    isCustomLead: true,
    leadSource: 'Firestore Buyers',
    lastUpdatedMillis: buyer.lastUpdatedMillis || Date.now(),
    syncedInCloud: true,
  };
}

function recordTo18CsvRow(r: LithiumIntelRecord): string {
  const escapeCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [
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
    .join(',');
}

export default function AdminSyncDrawer({
  isOpen,
  onClose,
  onNotify,
  onError,
  onSelectLead,
}: AdminSyncDrawerProps) {
  const {
    user,
    unifiedTradeBook,
    allBuyers,
    crmLeads,
    crmContacts,
    crmEmails,
    crmTasks,
    allRfqs,
    allShipments,
    allTradeDocuments,
    allPriceAlerts,
    marketConfig,
    canonicalProfile,
    lastSyncedAt,
    adminTestFirestoreConnection,
    adminImportCsvRecords,
    adminImportAndroidRecords,
    adminSyncSeedCatalogToCloud,
  } = useBuyerAuth();

  const [csvScope, setCsvScope] = useState<CsvDatasetScope>('both');
  const [testingConn, setTestingConn] = useState(false);
  const [connResult, setConnResult] = useState<{
    ok: boolean;
    latencyMs: number;
    serverTimeIso: string;
    error?: string;
  } | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingSyncPayload | null>(null);
  const [applyingImport, setApplyingImport] = useState(false);
  const [pushingSeed, setPushingSeed] = useState(false);
  const [copiedPairingKey, setCopiedPairingKey] = useState<'xml' | 'kotlin' | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const buyerIntelRecords = useMemo(
    () =>
      allBuyers.map((b, idx) =>
        mapBuyerDocToIntelRecord(b, unifiedTradeBook, idx)
      ),
    [allBuyers, unifiedTradeBook]
  );

  const combinedExportRecords = useMemo(() => {
    const merged = mergeRecordsByTimestamp(unifiedTradeBook, buyerIntelRecords);
    return merged.merged;
  }, [unifiedTradeBook, buyerIntelRecords]);

  const unsyncedSeedCount = useMemo(
    () => unifiedTradeBook.filter((r) => !r.syncedInCloud).length,
    [unifiedTradeBook]
  );

  if (!isOpen) return null;

  const handleVerifyConnection = async () => {
    setTestingConn(true);
    try {
      const res = await adminTestFirestoreConnection();
      setConnResult(res);
      if (res.ok) {
        onNotify(
          `Firestore live connection verified (${res.latencyMs}ms) on database ${firebaseConfig.firestoreDatabaseId}.`
        );
      } else {
        onError(res.error || 'Firestore connection check failed.');
      }
    } finally {
      setTestingConn(false);
    }
  };

  const handleExport18ColCsv = () => {
    const sourceRecords =
      csvScope === 'leads'
        ? unifiedTradeBook
        : csvScope === 'buyers'
          ? buyerIntelRecords
          : combinedExportRecords;

    if (sourceRecords.length === 0) {
      onError(
        `No ${csvScope} records available to export yet. Push seed catalog or add records first.`
      );
      return;
    }

    const rows = sourceRecords.map(recordTo18CsvRow);
    const csv = [CSV_EXPORT_HEADERS_18.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AhzanTech-18Col-${csvScope}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotify(
      `Exported ${sourceRecords.length} ${csvScope} record(s) to 18-Column CSV.`
    );
  };

  const handleDownload18ColTemplate = () => {
    const sampleRow = [
      'Example Lithium Refiner Co.',
      'LITHIUM',
      'Japan (+81)',
      'Kenji Sato',
      'Head of Battery Raw Materials',
      '+819012345678',
      'procurement@example-refiner.jp',
      'https://example-refiner.jp',
      '88',
      'QUALIFIED',
      '50',
      'IN_DISCUSSION',
      '500',
      '477135',
      '954.27',
      new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      'Send ZMGN057 ICP-OES Assay & FCO',
      'spodumene,4.61%,el65197',
    ]
      .map((v) => `"${v}"`)
      .join(',');

    const csv = [CSV_EXPORT_HEADERS_18.join(','), sampleRow].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'AhzanTech-18Col-Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotify('Downloaded 18-Column CSV template (exact schema + 1 sample row).');
  };

  const handleCsvFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseCsvLines(text);
      if (rows.length < 2) {
        onError('CSV file must include the 18-column header row and at least 1 data row.');
        return;
      }

      const headers = rows[0].map((h) => h.trim().toLowerCase());
      const colIndexByHeader = (targetIdx: number, aliases: string[]): number => {
        for (const alias of aliases) {
          const found = headers.findIndex((h) => h === alias || h.includes(alias));
          if (found !== -1) return found;
        }
        return targetIdx < rows[0].length ? targetIdx : -1;
      };

      const idxMap = {
        companyName: colIndexByHeader(0, ['company name', 'company']),
        category: colIndexByHeader(1, ['category', 'leadcategory']),
        region: colIndexByHeader(2, ['country/region', 'region', 'country']),
        decisionMaker: colIndexByHeader(3, ['decision maker', 'contact']),
        title: colIndexByHeader(4, ['title', 'role']),
        whatsapp: colIndexByHeader(5, ['whatsapp', 'phone']),
        email: colIndexByHeader(6, ['email']),
        website: colIndexByHeader(7, ['website', 'url']),
        priorityScore: colIndexByHeader(8, ['priority score', 'score']),
        stage: colIndexByHeader(9, ['deal stage', 'stage']),
        winPct: colIndexByHeader(10, ['win %', 'win']),
        status: colIndexByHeader(11, ['status', 'outreach']),
        tonnage: colIndexByHeader(12, ['estimated tonnage', 'tonnage']),
        targetValue: colIndexByHeader(13, ['target value', 'target fob']),
        impliedPrice: colIndexByHeader(14, ['implied price', 'price (usd/mt)']),
        followUpDate: colIndexByHeader(15, ['follow-up date', 'follow up']),
        nextAction: colIndexByHeader(16, ['next action']),
        tags: colIndexByHeader(17, ['tags']),
      };

      const readCol = (cols: string[], idx: number): string =>
        idx >= 0 && idx < cols.length ? (cols[idx] || '').trim() : '';

      const nextCustomBase = unifiedTradeBook.reduce(
        (m, r) => (r.rankId >= 1001 && r.rankId > m ? r.rankId : m),
        1000
      );

      const baselineList =
        csvScope === 'buyers'
          ? [...buyerIntelRecords, ...unifiedTradeBook]
          : unifiedTradeBook;

      const parsedRecords: LithiumIntelRecord[] = rows.slice(1).map((cols, i) => {
        const companyName = readCol(cols, idxMap.companyName) || `Imported Partner ${i + 1}`;
        const normKey = normalizeCompanyKey(companyName);
        const existingMatch = baselineList.find(
          (u) => u.normalizedCompanyKey === normKey
        );

        const cat = resolveLeadCategory(
          readCol(cols, idxMap.category),
          existingMatch?.leadCategory
        );
        const regionRaw = readCol(cols, idxMap.region);
        const regionCode = resolveTradeRegion(regionRaw, existingMatch?.regionCode);
        const decisionMaker =
          readCol(cols, idxMap.decisionMaker) ||
          existingMatch?.decisionMaker ||
          'Procurement Desk';
        const title =
          readCol(cols, idxMap.title) || existingMatch?.title || 'Procurement Director';
        const whatsapp =
          readCol(cols, idxMap.whatsapp) || existingMatch?.whatsappNumber || '';
        const email =
          readCol(cols, idxMap.email) ||
          existingMatch?.directEmail ||
          existingMatch?.generalEmail ||
          '';
        const website =
          readCol(cols, idxMap.website) || existingMatch?.websiteUrl || '';
        const score = Math.min(
          100,
          Math.max(
            1,
            Math.round(Number(readCol(cols, idxMap.priorityScore)) || existingMatch?.priorityScore || 75)
          )
        );
        const crmStage = resolveCrmStage(
          readCol(cols, idxMap.stage),
          existingMatch?.crmStage
        );
        const winNum = Number(readCol(cols, idxMap.winPct));
        const winProbability =
          Number.isFinite(winNum) && readCol(cols, idxMap.winPct) !== ''
            ? Math.min(100, Math.max(0, Math.round(winNum)))
            : STAGE_WIN_PROBABILITY[crmStage];
        const outreachStatus = resolveOutreachStatus(
          readCol(cols, idxMap.status),
          existingMatch?.outreachStatus
        );
        const estTonnage = Math.max(
          0,
          Number(readCol(cols, idxMap.tonnage)) || existingMatch?.estimatedTonnage || 100
        );
        const targetFobValue = Math.max(
          0,
          Number(readCol(cols, idxMap.targetValue)) || existingMatch?.targetFobValue || 0
        );
        const impliedNum = Number(readCol(cols, idxMap.impliedPrice));
        const impliedFobPricePerMt =
          Number.isFinite(impliedNum) && impliedNum > 0
            ? Number(impliedNum.toFixed(2))
            : estTonnage > 0
              ? Number((targetFobValue / estTonnage).toFixed(2))
              : 0;
        const followRaw = readCol(cols, idxMap.followUpDate);
        const parsedFollowMs = followRaw ? Date.parse(followRaw) : NaN;
        const followUpAtMillis = Number.isFinite(parsedFollowMs)
          ? parsedFollowMs
          : existingMatch?.followUpAtMillis || Date.now() + 3 * 86400000;
        const nextAction =
          readCol(cols, idxMap.nextAction) ||
          existingMatch?.nextAction ||
          'Review dossier & issue quote';
        const tags = readCol(cols, idxMap.tags) || existingMatch?.tags || '';

        return {
          id: existingMatch?.id || `intel-${nextCustomBase + i + 1}`,
          rankId: existingMatch?.rankId || nextCustomBase + i + 1,
          companyName,
          normalizedCompanyKey: normKey,
          leadCategory: cat,
          regionCode,
          location:
            regionRaw || existingMatch?.location || TRADE_REGION_LABELS[regionCode],
          primaryRole: title,
          priorityScore: score,
          priorityTier: computePriorityTier(score),
          fitScore: existingMatch?.fitScore ?? Math.round(score * 0.25),
          procScore: existingMatch?.procScore ?? Math.round(score * 0.25),
          finScore: existingMatch?.finScore ?? Math.round(score * 0.15),
          dmScore: existingMatch?.dmScore ?? Math.round(score * 0.15),
          esgScore: existingMatch?.esgScore ?? Math.round(score * 0.1),
          volScore: existingMatch?.volScore ?? Math.round(score * 0.1),
          decisionMaker,
          title,
          generalEmail: email,
          directEmail: email,
          emailRouteNote: `18-Col CSV Import (${csvScope})`,
          whatsappNumber: whatsapp,
          websiteUrl: website,
          websiteDisplay: website,
          profileSource: `18-Col CSV (${csvScope})`,
          operationalFit: existingMatch?.operationalFit || nextAction,
          emailSubject:
            existingMatch?.emailSubject || `Ahzan Tech Ltd · ${companyName}`,
          emailBody: existingMatch?.emailBody || '',
          linkedInNote: existingMatch?.linkedInNote || '',
          outreachStatus,
          crmStage,
          winProbability,
          estimatedTonnage: estTonnage,
          targetFobValue,
          impliedFobPricePerMt,
          weightedValueUsd: Math.round((targetFobValue * winProbability) / 100),
          followUpAtMillis,
          nextAction,
          tags,
          lostReason: existingMatch?.lostReason || '',
          notes: existingMatch?.notes || '',
          isRiskWatch: outreachStatus === 'RISK_PREPAY_ONLY',
          isCustomLead: !existingMatch,
          leadSource: `18-Col CSV (${csvScope})`,
          lastUpdatedMillis: Date.now(),
        };
      });

      const mergePreview = mergeRecordsByTimestamp(unifiedTradeBook, parsedRecords);
      const intraAudit = auditDuplicates(parsedRecords);
      const dupWarnings: string[] = [];

      for (const rec of parsedRecords) {
        const dup = checkDuplicateLead(rec, unifiedTradeBook);
        if (dup.hasDuplicate && dup.matchedBy.length > 0) {
          dupWarnings.push(`${rec.companyName} (${dup.matchedBy.join('/')})`);
        }
      }

      setPendingImport({
        kind: 'csv',
        scope: csvScope,
        sourceLabel: `${file.name} (${rows[0].length} columns detected · target: ${csvScope})`,
        records: parsedRecords,
        previewInserted: mergePreview.insertedCount,
        previewUpdated: mergePreview.updatedCount,
        previewSkippedOlder: mergePreview.skippedOlderCount,
        duplicateWarnings: dupWarnings.slice(0, 8),
        intraFileDuplicates: intraAudit.duplicateGroupCount,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to parse 18-Column CSV.');
    }
  };

  const handleExportAndroidJson = () => {
    const payload: AndroidBackupPayload = {
      appName: 'ahzan_lithium_intel_crm_backup',
      backupVersion: 1,
      exportedAtMillis: Date.now(),
      companyProfile: {
        company: canonicalProfile.companyName,
        domain: canonicalProfile.domain,
        ceo: canonicalProfile.ceoName,
        email: canonicalProfile.ceoEmail,
        cadastreId: canonicalProfile.miningCadastreId,
        location: canonicalProfile.miningLocation,
        assays: [canonicalProfile.assayRefPrimary, canonicalProfile.assayRefSecondary],
      },
      marketConfig: {
        lithiumRatePerPercentUsd: marketConfig.lithiumRatePerPercentUsd,
        lithiumAssayPct: marketConfig.lithiumAssayPct,
        fxNgnPerUsd: marketConfig.fxNgnPerUsd,
        fxXofPerUsd: marketConfig.fxXofPerUsd,
        quoteValidityDays: marketConfig.quoteValidityDays,
      },
      leads: unifiedTradeBook.map(({ syncedInCloud: _omit, ...rest }) => rest),
      activities: crmActivitiesProxy(),
      tasks: crmTasks.map((t) => ({
        id: t.id,
        ownerUid: t.ownerUid,
        leadRankId: t.leadRankId,
        companyName: t.companyName,
        title: t.title,
        priority: t.priority,
        dueAtMillis: t.dueAtMillis,
        isCompleted: t.isCompleted,
        completedAtMillis: t.completedAtMillis,
      })),
      rfqs: allRfqs as unknown as Array<Record<string, unknown>>,
      shipments: allShipments as unknown as Array<Record<string, unknown>>,
      tradeDocuments: allTradeDocuments as unknown as Array<Record<string, unknown>>,
    };

    function crmActivitiesProxy(): CrmActivityRecord[] {
      return crmEmails.map((m) => ({
        id: m.id,
        ownerUid: m.ownerUid,
        leadRankId: m.leadRankId ?? 0,
        leadId: m.leadId,
        companyName: m.companyName,
        activityType: m.activityType || (m.direction === 'Draft' ? 'NOTE' : 'EMAIL'),
        outcome: m.outcome || m.status,
        summary: m.summary || m.subject,
        quoteAmountUsd: m.quoteAmountUsd,
        createdAtMillis: m.createdAtMillis || Date.now(),
        direction: m.direction,
        toEmail: m.toEmail,
        fromEmail: m.fromEmail,
        contactName: m.contactName,
        subject: m.subject,
        body: m.body,
        status: m.status,
        sentDate: m.sentDate,
      }));
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ahzan_lithium_intel_crm_backup_v1_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotify(`Exported Android JSON v1 backup (${unifiedTradeBook.length} records).`);
  };

  const handleJsonFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<AndroidBackupPayload>;
      if (!Array.isArray(parsed.leads)) {
        onError('Invalid Android JSON backup: missing "leads" array.');
        return;
      }
      const importedLeads = parsed.leads.map((item, idx) => ({
        ...item,
        normalizedCompanyKey:
          item.normalizedCompanyKey ||
          normalizeCompanyKey(item.companyName || `Partner ${idx + 1}`),
        lastUpdatedMillis:
          item.lastUpdatedMillis || parsed.exportedAtMillis || Date.now(),
      }));
      const mergePreview = mergeRecordsByTimestamp(unifiedTradeBook, importedLeads);
      const dupWarnings: string[] = [];
      for (const rec of importedLeads) {
        const dup = checkDuplicateLead(rec, unifiedTradeBook);
        if (dup.hasDuplicate && dup.matchedBy.length > 0) {
          dupWarnings.push(`${rec.companyName} (${dup.matchedBy.join('/')})`);
        }
      }

      setPendingImport({
        kind: 'json',
        sourceLabel: `${file.name} (${parsed.appName || 'Backup v1'})`,
        records: importedLeads,
        activities: Array.isArray(parsed.activities) ? parsed.activities : [],
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        marketUpdates: parsed.marketConfig,
        previewInserted: mergePreview.insertedCount,
        previewUpdated: mergePreview.updatedCount,
        previewSkippedOlder: mergePreview.skippedOlderCount,
        duplicateWarnings: dupWarnings.slice(0, 8),
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to parse Android JSON backup.');
    }
  };

  const handleConfirmPendingImport = async () => {
    if (!pendingImport) return;
    setApplyingImport(true);
    try {
      if (pendingImport.kind === 'csv') {
        const res = await adminImportCsvRecords({
          scope: pendingImport.scope,
          records: pendingImport.records,
        });
        setPendingImport(null);
        onNotify(
          `CSV Sync Committed to Firestore (${pendingImport.scope}): ${res.leadsWritten} crmLeads write(s), ${res.buyersWritten} buyers write(s) · +${res.insertedCount} new, ${res.updatedCount} updated.`
        );
      } else {
        const res = await adminImportAndroidRecords(
          pendingImport.records,
          pendingImport.activities,
          pendingImport.tasks,
          pendingImport.marketUpdates
        );
        setPendingImport(null);
        onNotify(
          `Android JSON Merge Complete: +${res.insertedCount} inserted, ${res.updatedCount} updated, ${res.skippedOlderCount} skipped (cloud newer).`
        );
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Firestore batch commit failed.');
    } finally {
      setApplyingImport(false);
    }
  };

  const handlePushSeedCatalog = async () => {
    setPushingSeed(true);
    try {
      const res = await adminSyncSeedCatalogToCloud();
      onNotify(
        `Seed-to-Cloud Push Complete: ${res.syncedCount} partner records materialized into Firestore crmLeads & buyers.`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Seed catalog cloud push failed.');
    } finally {
      setPushingSeed(false);
    }
  };

  const collectionParityStats = [
    { label: 'crmLeads', count: crmLeads.length, note: `${unifiedTradeBook.length} total book` },
    { label: 'buyers', count: allBuyers.length, note: 'buyer mirror + profiles' },
    { label: 'crmContacts', count: crmContacts.length, note: 'directory' },
    { label: 'crmEmails', count: crmEmails.length, note: 'activities & threads' },
    { label: 'crmTasks', count: crmTasks.length, note: 'follow-ups' },
    { label: 'rfqs', count: allRfqs.length, note: 'buyer quotes' },
    { label: 'shipments', count: allShipments.length, note: 'FCL tracking' },
    { label: 'tradeDocuments', count: allTradeDocuments.length, note: 'vault PDFs' },
    { label: 'priceAlerts', count: allPriceAlerts.length, note: 'subscriptions' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label="Admin Firestore Sync Drawer"
    >
      <div className="w-full max-w-4xl bg-slate-50 h-full overflow-y-auto shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Sticky Drawer Header */}
        <div className="sticky top-0 z-10 bg-slate-950 text-white px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span>ADMIN SYNC DRAWER · TWO-WAY FIRESTORE &amp; 18-COL CSV</span>
            </div>
            <h2 className="font-display text-base sm:text-lg font-bold truncate mt-0.5">
              {canonicalProfile.companyName} Cloud &amp; Android Command Sync
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={testingConn}
              onClick={() => void handleVerifyConnection()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md cursor-pointer disabled:opacity-60"
            >
              {testingConn ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Test Firestore</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Admin Sync Drawer"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="p-5 space-y-5">
          {/* 1. Live Firestore Configuration & Server Probe */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-slate-700" />
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Named Firestore Database Binding
                </h3>
              </div>
              {connResult ? (
                <span
                  className={`font-mono text-[11px] font-semibold tabular-nums ${
                    connResult.ok ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {connResult.ok
                    ? `CONNECTED · ${connResult.latencyMs}ms roundtrip`
                    : `OFFLINE / ERROR (${connResult.latencyMs}ms)`}
                </span>
              ) : (
                <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                  {lastSyncedAt
                    ? `Last snapshot sync: ${lastSyncedAt.toLocaleTimeString()}`
                    : 'Realtime listeners active'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <div className="text-[11px] text-slate-500">Project ID</div>
                <div className="font-mono font-semibold text-slate-900 truncate">
                  {firebaseConfig.projectId}
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded sm:col-span-2">
                <div className="text-[11px] text-slate-500">
                  Firestore Database ID
                </div>
                <div className="font-mono font-semibold text-slate-900 truncate">
                  {firebaseConfig.firestoreDatabaseId}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 font-mono">
              <span>Auth Domain: {firebaseConfig.authDomain}</span>
              <span>Admin Session: {user?.email || 'Not signed in'}</span>
            </div>

            {/* Live Collection Counts */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1">
              {collectionParityStats.map((stat) => (
                <div
                  key={stat.label}
                  className="p-2 bg-slate-50 border border-slate-200 rounded"
                >
                  <div className="font-mono text-[10px] text-slate-500 truncate">
                    {stat.label}
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                    {stat.count}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {stat.note}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. DuplicateAuditBadge Across Leads & Buyers */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Cross-Collection Duplicate Integrity Audit
                </h3>
                <p className="text-xs text-slate-500">
                  Audits company normalization keys, email addresses, and WhatsApp digits across Leads and Buyers before cloud commits.
                </p>
              </div>
              <button
                type="button"
                disabled={pushingSeed || unsyncedSeedCount === 0}
                onClick={() => void handlePushSeedCatalog()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-md cursor-pointer"
              >
                {pushingSeed ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CloudUpload className="w-3.5 h-3.5" />
                )}
                <span>
                  {unsyncedSeedCount === 0
                    ? 'All Seeds Pushed to Cloud'
                    : `Push ${unsyncedSeedCount} Unsynced Seeds`}
                </span>
              </button>
            </div>

            <DuplicateAuditBadge
              records={unifiedTradeBook}
              extraBuyers={allBuyers}
              variant="light"
              onInspectRecord={(rec) => {
                onClose();
                onSelectLead?.(rec);
              }}
            />
          </div>

          {/* 3. 18-Column CSV Import / Export for Leads & Buyers */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>18-Column CSV Import &amp; Export (Leads &amp; Buyers)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select target Firestore dataset and export or batch-import 18-column trade sheets with automatic deduplication.
                </p>
              </div>

              {/* Scope Selector */}
              <div
                role="group"
                aria-label="CSV Target Scope"
                className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5 shrink-0"
              >
                {(
                  [
                    { id: 'leads', label: 'Leads', count: unifiedTradeBook.length },
                    { id: 'buyers', label: 'Buyers', count: buyerIntelRecords.length },
                    { id: 'both', label: 'Both', count: combinedExportRecords.length },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCsvScope(opt.id)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer font-mono tabular-nums ${
                      csvScope === opt.id
                        ? 'bg-slate-950 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label} ({opt.count})
                  </button>
                ))}
              </div>
            </div>

            {/* 18-Column Header Strip Reference */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800">18 Columns: </span>
              {CSV_EXPORT_HEADERS_18.join(' · ')}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={handleExport18ColCsv}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Export {csvScope === 'both' ? 'Combined' : csvScope === 'buyers' ? 'Buyers' : 'Leads'} CSV
                </span>
              </button>

              <label className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md cursor-pointer">
                <FileUp className="w-3.5 h-3.5" />
                <span>
                  Import 18-Col CSV → {csvScope === 'both' ? 'Leads & Buyers' : csvScope}
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => void handleCsvFileChange(e)}
                  className="sr-only"
                />
              </label>

              <button
                type="button"
                onClick={handleDownload18ColTemplate}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-slate-600" />
                <span>Download 18-Col Template</span>
              </button>
            </div>
          </div>

          {/* 4. Android JSON v1 Two-Way Backup Bridge */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-600" />
                  <span>Android Lithium Intel JSON Backup v1</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Full-fidelity sync of Leads, CRM Activities, Follow-Up Tasks, RFQs, and Market Rates with the mobile app.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportAndroidJson}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5 text-slate-700" />
                  <span>Export JSON v1</span>
                </button>
                <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer">
                  <FileUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>Import JSON v1</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => void handleJsonFileChange(e)}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* 4b. Remixed Android App Pairing Config (firebase_applet_config.xml + Named DB) */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-700" />
                  <span>Remixed Android App Direct Pairing</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Point your remixed Android app to this named Firestore database so web and mobile edits sync in real time, or use JSON/CSV above if on a separate project.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const xmlSnippet = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="project_id" translatable="false">${firebaseConfig.projectId}</string>
    <string name="firebase_app_id" translatable="false">${firebaseConfig.appId}</string>
    <string name="google_api_key" translatable="false">${firebaseConfig.apiKey}</string>
    <string name="auth_domain" translatable="false">${firebaseConfig.authDomain}</string>
    <string name="storage_bucket" translatable="false">${firebaseConfig.storageBucket}</string>
    <string name="firestore_database_id" translatable="false">${firebaseConfig.firestoreDatabaseId}</string>
</resources>`;
                    void navigator.clipboard.writeText(xmlSnippet).then(() => {
                      setCopiedPairingKey('xml');
                      setTimeout(() => setCopiedPairingKey(null), 1800);
                      onNotify('Copied firebase_applet_config.xml for your remixed Android app.');
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md cursor-pointer"
                >
                  {copiedPairingKey === 'xml' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  <span>Copy firebase_applet_config.xml</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ktSnippet = `val db = FirebaseFirestore.getInstance(FirebaseApp.getInstance(), "${firebaseConfig.firestoreDatabaseId}")
// Shared collections: crmLeads, buyers, crmContacts, crmEmails, crmTasks, rfqs, shipments, tradeDocuments, priceAlerts, siteConfig/market`;
                    void navigator.clipboard.writeText(ktSnippet).then(() => {
                      setCopiedPairingKey('kotlin');
                      setTimeout(() => setCopiedPairingKey(null), 1800);
                      onNotify('Copied Kotlin named-database Firestore binding.');
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
                >
                  {copiedPairingKey === 'kotlin' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>Copy Kotlin Firestore Binding</span>
                </button>
              </div>
            </div>

            <pre className="p-3 bg-slate-950 text-emerald-300 font-mono text-[11px] rounded-md overflow-x-auto leading-relaxed">
{`Project ID: ${firebaseConfig.projectId}
Database ID: ${firebaseConfig.firestoreDatabaseId}
Collections: crmLeads · buyers · crmContacts · crmEmails · crmTasks · rfqs · shipments · tradeDocuments · priceAlerts · siteConfig/market`}
            </pre>
          </div>

          {/* 5. Dry-Run Import Preview & Firestore Commit Panel */}
          {pendingImport && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Dry-Run Import Preview: {pendingImport.sourceLabel}
                  </h4>
                  <p className="text-[11px] text-slate-700 font-mono tabular-nums mt-0.5">
                    {pendingImport.records.length} record(s) staged
                    {pendingImport.kind === 'json'
                      ? ` · ${pendingImport.activities.length} activit(y/ies) · ${pendingImport.tasks.length} task(s)`
                      : ` · target collection(s): ${
                          pendingImport.scope === 'both'
                            ? 'crmLeads + buyers'
                            : pendingImport.scope === 'buyers'
                              ? 'buyers'
                              : 'crmLeads'
                        }`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingImport(null)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={applyingImport}
                    onClick={() => void handleConfirmPendingImport()}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer disabled:opacity-60"
                  >
                    {applyingImport ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>Commit Batch to Firestore</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-xs font-mono tabular-nums">
                <div className="p-2.5 bg-white border border-slate-200 rounded">
                  <div className="text-slate-500">New Inserts</div>
                  <div className="text-base font-bold text-emerald-700">
                    +{pendingImport.previewInserted}
                  </div>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded">
                  <div className="text-slate-500">Updates</div>
                  <div className="text-base font-bold text-amber-700">
                    {pendingImport.previewUpdated}
                  </div>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded">
                  <div className="text-slate-500">Skipped (Cloud Newer)</div>
                  <div className="text-base font-bold text-slate-600">
                    {pendingImport.previewSkippedOlder}
                  </div>
                </div>
              </div>

              {pendingImport.kind === 'csv' && pendingImport.intraFileDuplicates > 0 && (
                <div className="text-[11px] text-amber-900 flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>
                    {pendingImport.intraFileDuplicates} intra-CSV duplicate group(s) detected and consolidated by timestamp before commit.
                  </span>
                </div>
              )}

              {pendingImport.duplicateWarnings.length > 0 && (
                <div className="text-[11px] text-amber-900 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    Matched existing partners (merged non-destructively):{' '}
                    {pendingImport.duplicateWarnings.join(' · ')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
