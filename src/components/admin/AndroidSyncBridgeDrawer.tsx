import { useMemo, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  Download,
  FileSpreadsheet,
  FileUp,
  Loader2,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import {
  computePriorityTier,
  CSV_EXPORT_HEADERS_18,
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
  checkDuplicateLead,
  mergeRecordsByTimestamp,
  normalizeCompanyKey,
} from '../../utils/duplicateDetector';

interface AndroidSyncBridgeDrawerProps {
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

interface PendingImportState {
  sourceLabel: string;
  leads: LithiumIntelRecord[];
  activities: CrmActivityRecord[];
  tasks: CrmTaskRecord[];
  marketUpdates?: AndroidBackupPayload['marketConfig'];
  previewInserted: number;
  previewUpdated: number;
  previewSkippedOlder: number;
  duplicateWarnings: string[];
}

function parseCsvLines(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
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

export default function AndroidSyncBridgeDrawer({
  onNotify,
  onError,
}: AndroidSyncBridgeDrawerProps) {
  const {
    unifiedTradeBook,
    crmActivities,
    crmTasks,
    marketConfig,
    canonicalProfile,
    allRfqs,
    allShipments,
    allTradeDocuments,
    adminImportAndroidRecords,
    adminSyncSeedCatalogToCloud,
  } = useBuyerAuth();

  const [pendingImport, setPendingImport] = useState<PendingImportState | null>(null);
  const [applyingImport, setApplyingImport] = useState(false);
  const [pushingSeed, setPushingSeed] = useState(false);

  const unsyncedSeedCount = useMemo(
    () => unifiedTradeBook.filter((r) => !r.syncedInCloud).length,
    [unifiedTradeBook]
  );

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
      activities: crmActivities,
      tasks: crmTasks,
      rfqs: allRfqs as unknown as Array<Record<string, unknown>>,
      shipments: allShipments as unknown as Array<Record<string, unknown>>,
      tradeDocuments: allTradeDocuments as unknown as Array<Record<string, unknown>>,
    };

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
    onNotify(
      `Exported Android-compatible JSON backup v1 (${unifiedTradeBook.length} leads, ${crmActivities.length} activities, ${crmTasks.length} tasks).`
    );
  };

  const handleExport18ColCsv = () => {
    const escapeCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = unifiedTradeBook.map((r) =>
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
    link.download = `AhzanTech-18Col-TradeBook-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotify(`Exported ${unifiedTradeBook.length} records to 18-Column CSV.`);
  };

  const handleJsonFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<AndroidBackupPayload>;
      if (!Array.isArray(parsed.leads)) {
        onError('Invalid Android backup JSON: missing "leads" array.');
        return;
      }
      const importedLeads = parsed.leads.map((item, idx) => ({
        ...item,
        normalizedCompanyKey:
          item.normalizedCompanyKey || normalizeCompanyKey(item.companyName || `Partner ${idx + 1}`),
        lastUpdatedMillis: item.lastUpdatedMillis || parsed.exportedAtMillis || Date.now(),
      }));

      const mergePreview = mergeRecordsByTimestamp(unifiedTradeBook, importedLeads);
      const dupWarnings: string[] = [];
      for (const imp of importedLeads) {
        const dup = checkDuplicateLead(imp, unifiedTradeBook);
        if (dup.hasDuplicate && dup.matchedBy.length > 0) {
          dupWarnings.push(`${imp.companyName} (${dup.matchedBy[0]})`);
        }
      }

      setPendingImport({
        sourceLabel: `${file.name} (${parsed.appName || 'Backup v1'})`,
        leads: importedLeads,
        activities: Array.isArray(parsed.activities) ? parsed.activities : [],
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        marketUpdates: parsed.marketConfig,
        previewInserted: mergePreview.insertedCount,
        previewUpdated: mergePreview.updatedCount,
        previewSkippedOlder: mergePreview.skippedOlderCount,
        duplicateWarnings: dupWarnings.slice(0, 8),
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to parse Android backup JSON.');
    }
  };

  const handleCsvFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseCsvLines(text);
      if (rows.length < 2) {
        onError('CSV file has no data rows.');
        return;
      }
      const dataRows = rows.slice(1);
      const nextCustomBase = unifiedTradeBook.reduce(
        (m, r) => (r.rankId >= 1001 && r.rankId > m ? r.rankId : m),
        1000
      );

      const importedLeads: LithiumIntelRecord[] = dataRows.map((cols, i) => {
        const companyName = cols[0] || `Imported Partner ${i + 1}`;
        const existingMatch = unifiedTradeBook.find(
          (u) => u.normalizedCompanyKey === normalizeCompanyKey(companyName)
        );
        const cat = (['LITHIUM', 'AFRICA_SOURCING', 'FUNDING_FINANCE'].includes(cols[1])
          ? cols[1]
          : 'LITHIUM') as LeadCategory;
        const stage = (Object.keys(STAGE_WIN_PROBABILITY).includes(cols[9])
          ? cols[9]
          : 'PROSPECT') as CrmStage;
        const score = Math.min(100, Math.max(1, Number(cols[8]) || 75));
        const estTonnage = Math.max(0, Number(cols[12]) || 100);
        const targetFob = Math.max(0, Number(cols[13]) || 0);
        const winProb = Number(cols[10]) || STAGE_WIN_PROBABILITY[stage];

        return {
          id: existingMatch?.id || `intel-${nextCustomBase + i + 1}`,
          rankId: existingMatch?.rankId || nextCustomBase + i + 1,
          companyName,
          normalizedCompanyKey: normalizeCompanyKey(companyName),
          leadCategory: cat,
          regionCode: existingMatch?.regionCode || ('ASIA_PACIFIC' as TradeRegion),
          location: cols[2] || 'International',
          primaryRole: cols[4] || 'Trade Partner',
          priorityScore: score,
          priorityTier: computePriorityTier(score),
          fitScore: Math.round(score * 0.25),
          procScore: Math.round(score * 0.25),
          finScore: Math.round(score * 0.15),
          dmScore: Math.round(score * 0.15),
          esgScore: Math.round(score * 0.1),
          volScore: Math.round(score * 0.1),
          decisionMaker: cols[3] || 'Procurement Desk',
          title: cols[4] || 'Director',
          generalEmail: cols[6] || '',
          directEmail: cols[6] || '',
          emailRouteNote: '18-Col CSV Import',
          whatsappNumber: cols[5] || '',
          websiteUrl: cols[7] || '',
          websiteDisplay: cols[7] || '',
          profileSource: '18-Column CSV Import',
          operationalFit: cols[16] || '',
          emailSubject: `Ahzan Tech Ltd · ${companyName}`,
          emailBody: '',
          linkedInNote: '',
          outreachStatus: (cols[11] || 'READY') as OutreachStatus,
          crmStage: stage,
          winProbability: winProb,
          estimatedTonnage: estTonnage,
          targetFobValue: targetFob,
          impliedFobPricePerMt: estTonnage > 0 ? Number((targetFob / estTonnage).toFixed(2)) : 0,
          weightedValueUsd: Math.round((targetFob * winProb) / 100),
          followUpAtMillis: cols[15] ? new Date(cols[15]).getTime() : Date.now() + 3 * 86400000,
          nextAction: cols[16] || 'Review dossier',
          tags: cols[17] || '',
          lostReason: '',
          notes: existingMatch?.notes || '',
          isRiskWatch: cols[11] === 'RISK_PREPAY_ONLY',
          isCustomLead: !existingMatch,
          leadSource: '18-Col CSV Import',
          lastUpdatedMillis: Date.now(),
        };
      });

      const mergePreview = mergeRecordsByTimestamp(unifiedTradeBook, importedLeads);
      setPendingImport({
        sourceLabel: `${file.name} (18-Column CSV)`,
        leads: importedLeads,
        activities: [],
        tasks: [],
        previewInserted: mergePreview.insertedCount,
        previewUpdated: mergePreview.updatedCount,
        previewSkippedOlder: mergePreview.skippedOlderCount,
        duplicateWarnings: [],
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to parse 18-Col CSV.');
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    setApplyingImport(true);
    try {
      const res = await adminImportAndroidRecords(
        pendingImport.leads,
        pendingImport.activities,
        pendingImport.tasks,
        pendingImport.marketUpdates
      );
      setPendingImport(null);
      onNotify(
        `Android Two-Way Merge Complete: ${res.insertedCount} inserted, ${res.updatedCount} updated, ${res.skippedOlderCount} skipped (newer in cloud).`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setApplyingImport(false);
    }
  };

  const handlePushSeedCatalog = async () => {
    setPushingSeed(true);
    try {
      const res = await adminSyncSeedCatalogToCloud();
      onNotify(
        `Seed-to-Cloud Push Complete: ${res.syncedCount} local Trade Book records pushed to Firestore crmLeads.`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Cloud push failed.');
    } finally {
      setPushingSeed(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2">
        <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-amber-600" />
          <span>Lithium Intel Android ↔ Web Two-Way Sync Bridge</span>
        </h3>
        <p className="text-xs text-slate-600">
          Target Database: <span className="font-mono text-slate-800">ai-studio-ahzantechltdglob-4ce3e8c5-17ef-4978-8bc8-8d346f298cc8</span> ·
          Non-blocking merge preserves the newest <span className="font-mono">lastUpdatedMillis</span> timestamp across mobile and web without duplicating counterparties.
        </p>
      </div>

      {/* 3 Action Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Export */}
        <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            1. Export Web → Android App
          </h4>
          <p className="text-xs text-slate-500">
            Download the live Trade Book ({unifiedTradeBook.length} leads), activities ({crmActivities.length}), and tasks ({crmTasks.length}) in native Android schema.
          </p>
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleExportAndroidJson}
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export Android Backup JSON (v1)</span>
            </button>
            <button
              type="button"
              onClick={handleExport18ColCsv}
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export 18-Column CSV</span>
            </button>
          </div>
        </div>

        {/* Column 2: Import */}
        <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            2. Import Android App → Web Cloud
          </h4>
          <p className="text-xs text-slate-500">
            Upload <span className="font-mono">ahzan_lithium_intel_crm_backup</span> JSON or 18-column CSV. Runs duplicate detection and timestamp diff before committing.
          </p>
          <div className="space-y-2 pt-1">
            <label className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md cursor-pointer">
              <FileUp className="w-3.5 h-3.5" />
              <span>Import Android Backup JSON</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => void handleJsonFileChange(e)}
                className="sr-only"
              />
            </label>
            <label className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer">
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
              <span>Import 18-Column CSV</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => void handleCsvFileChange(e)}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        {/* Column 3: Push Seed Catalog */}
        <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            3. Cloud Firestore Parity Push
          </h4>
          <p className="text-xs text-slate-500">
            Materialize all 249 seeded records into live Firestore <span className="font-mono">crmLeads</span> so Android &amp; Web share identical cloud documents.
          </p>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between text-xs font-mono tabular-nums">
            <span className="text-slate-600">Unsynced Local Seeds</span>
            <span className="font-bold text-slate-900">{unsyncedSeedCount}</span>
          </div>
          <button
            type="button"
            disabled={pushingSeed || unsyncedSeedCount === 0}
            onClick={() => void handlePushSeedCatalog()}
            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-md cursor-pointer"
          >
            {pushingSeed ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CloudUpload className="w-3.5 h-3.5" />
            )}
            <span>
              {unsyncedSeedCount === 0
                ? 'All 249+ Records Synced in Cloud'
                : `Push ${unsyncedSeedCount} Unsynced Seeds → Cloud`}
            </span>
          </button>
        </div>
      </div>

      {/* Pending Merge Dry-Run Preview */}
      {pendingImport && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                Dry-Run Merge Preview: {pendingImport.sourceLabel}
              </h4>
              <p className="text-[11px] text-slate-700 mt-0.5 font-mono tabular-nums">
                {pendingImport.leads.length} lead(s) · {pendingImport.activities.length} activit(y/ies) ·{' '}
                {pendingImport.tasks.length} task(s)
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
                onClick={() => void handleConfirmImport()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
              >
                {applyingImport ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>Confirm &amp; Merge to Firestore</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs font-mono tabular-nums">
            <div className="p-2.5 bg-white border border-slate-200 rounded">
              <div className="text-slate-500">New Inserts</div>
              <div className="text-base font-bold text-emerald-700">
                +{pendingImport.previewInserted}
              </div>
            </div>
            <div className="p-2.5 bg-white border border-slate-200 rounded">
              <div className="text-slate-500">Newer Updates</div>
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

          {pendingImport.duplicateWarnings.length > 0 && (
            <div className="text-[11px] text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Key-matched existing records (updated non-destructively):{' '}
                {pendingImport.duplicateWarnings.join(' · ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
