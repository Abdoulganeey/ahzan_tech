import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Database,
  Mail,
  Phone,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { AdminBuyerDoc } from '../../context/BuyerAuthContext';
import type { LithiumIntelRecord } from '../../types/lithiumIntel';
import {
  auditDuplicates,
  normalizeCompanyKey,
  normalizeEmail,
  normalizePhoneDigits,
  type DuplicateAuditSummary,
} from '../../utils/duplicateDetector';

export interface DuplicateAuditBadgeProps {
  records: LithiumIntelRecord[];
  extraBuyers?: AdminBuyerDoc[];
  auditSummary?: DuplicateAuditSummary;
  variant?: 'dark' | 'light';
  expanded?: boolean;
  onToggle?: () => void;
  onInspectRecord?: (record: LithiumIntelRecord) => void;
  showInlinePanel?: boolean;
  labelPrefix?: string;
}

interface PhoneCollisionGroup {
  key: string;
  records: LithiumIntelRecord[];
}

export default function DuplicateAuditBadge({
  records,
  extraBuyers = [],
  auditSummary,
  variant = 'light',
  expanded: controlledExpanded,
  onToggle,
  onInspectRecord,
  showInlinePanel = true,
  labelPrefix,
}: DuplicateAuditBadgeProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded =
    typeof controlledExpanded === 'boolean' ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  };

  const baseAudit = useMemo(
    () => auditSummary ?? auditDuplicates(records),
    [auditSummary, records]
  );

  // Additional phone/WhatsApp digit collision check across records
  const phoneCollisions = useMemo<PhoneCollisionGroup[]>(() => {
    const byPhone = new Map<string, LithiumIntelRecord[]>();
    const alreadyDupIds = new Set<string>();
    for (const grp of baseAudit.groups) {
      for (const rec of grp.records) {
        alreadyDupIds.add(rec.id);
      }
    }

    for (const rec of records) {
      const digits = normalizePhoneDigits(rec.whatsappNumber || '');
      if (digits.length >= 8) {
        const tailKey = digits.slice(-10);
        const list = byPhone.get(tailKey) || [];
        list.push(rec);
        byPhone.set(tailKey, list);
      }
    }

    const collisions: PhoneCollisionGroup[] = [];
    byPhone.forEach((recs, key) => {
      if (recs.length > 1 && !recs.every((r) => alreadyDupIds.has(r.id))) {
        collisions.push({ key, records: recs });
      }
    });
    return collisions;
  }, [records, baseAudit]);

  // Cross-collection duplicate check inside buyers collection
  const buyerDuplicateGroups = useMemo(() => {
    if (extraBuyers.length === 0) return [];
    const byKey = new Map<string, AdminBuyerDoc[]>();
    for (const b of extraBuyers) {
      const key =
        b.normalizedCompanyKey ||
        normalizeCompanyKey(b.companyName || '') ||
        normalizeEmail(b.email || '');
      if (!key) continue;
      const arr = byKey.get(key) || [];
      arr.push(b);
      byKey.set(key, arr);
    }
    const groups: Array<{ key: string; buyers: AdminBuyerDoc[] }> = [];
    byKey.forEach((buyers, key) => {
      if (buyers.length > 1) {
        groups.push({ key, buyers });
      }
    });
    return groups;
  }, [extraBuyers]);

  const totalGroups =
    baseAudit.duplicateGroupCount + phoneCollisions.length + buyerDuplicateGroups.length;
  const isClean = totalGroups === 0;

  const buttonClass =
    variant === 'dark'
      ? isClean
        ? 'text-emerald-300 bg-emerald-950/60 border-emerald-700/70 hover:bg-emerald-900/60'
        : 'text-amber-300 bg-amber-950/70 border-amber-600 hover:bg-amber-900/70'
      : isClean
        ? 'text-emerald-800 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
        : 'text-amber-900 bg-amber-50 border-amber-300 hover:bg-amber-100';

  return (
    <div className={showInlinePanel && isExpanded ? 'space-y-2' : 'inline-block'}>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isExpanded}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${buttonClass}`}
      >
        {isClean ? (
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        )}
        <span className="font-mono tabular-nums">
          {labelPrefix ? `${labelPrefix}: ` : ''}
          {isClean
            ? `0 Duplicates · ${baseAudit.totalRecords} Records`
            : `${totalGroups} Duplicate Group(s)`}
        </span>
        {extraBuyers.length > 0 && (
          <span className="opacity-75 font-mono text-[11px] tabular-nums">
            · {extraBuyers.length} Buyers
          </span>
        )}
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 opacity-80" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 opacity-80" />
        )}
      </button>

      {showInlinePanel && isExpanded && (
        <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3 text-xs text-slate-800">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900">
                DuplicateAuditBadge Diagnostics
              </span>
              <span className="text-slate-400">·</span>
              <span className="font-mono text-[11px] text-slate-600 tabular-nums">
                {baseAudit.totalRecords} Leads Checked
                {extraBuyers.length > 0 ? ` · ${extraBuyers.length} Buyers Checked` : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              aria-label="Close Duplicate Audit"
              className="p-1 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {isClean ? (
            <div className="flex items-start gap-2.5 text-emerald-800 bg-emerald-50/70 border border-emerald-200 rounded-md p-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">
                  Clean Catalog Verified — Zero Collisions Detected
                </p>
                <p className="text-[11px] text-emerald-700">
                  All {baseAudit.totalRecords} trade book leads
                  {extraBuyers.length > 0
                    ? ` and ${extraBuyers.length} Firestore buyer records`
                    : ''}{' '}
                  passed normalized company key, email address, and WhatsApp digit checks.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {baseAudit.groups.map((grp, idx) => (
                <div
                  key={`${grp.reason}-${grp.key}-${idx}`}
                  className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-md space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-amber-900">
                      {grp.reason === 'email' ? (
                        <Mail className="w-3.5 h-3.5 text-amber-700" />
                      ) : (
                        <Database className="w-3.5 h-3.5 text-amber-700" />
                      )}
                      <span>
                        {grp.reason.toUpperCase()} KEY: {grp.key}
                      </span>
                    </span>
                    <span className="font-mono text-[11px] text-amber-800 tabular-nums">
                      {grp.records.length} matching records
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {grp.records.map((rec) =>
                      onInspectRecord ? (
                        <button
                          key={rec.id}
                          type="button"
                          onClick={() => onInspectRecord(rec)}
                          className="px-2 py-1 text-[11px] font-medium bg-white hover:bg-amber-100 text-slate-800 border border-amber-300 rounded cursor-pointer font-mono"
                        >
                          #{rec.rankId} {rec.companyName}
                        </button>
                      ) : (
                        <span
                          key={rec.id}
                          className="px-2 py-1 text-[11px] font-mono bg-white text-slate-700 border border-slate-200 rounded"
                        >
                          #{rec.rankId} {rec.companyName}
                        </span>
                      )
                    )}
                  </div>
                </div>
              ))}

              {phoneCollisions.map((grp) => (
                <div
                  key={`phone-${grp.key}`}
                  className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-md space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-amber-900">
                      <Phone className="w-3.5 h-3.5 text-amber-700" />
                      <span>WHATSAPP DIGITS: ...{grp.key}</span>
                    </span>
                    <span className="font-mono text-[11px] text-amber-800 tabular-nums">
                      {grp.records.length} records
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {grp.records.map((rec) =>
                      onInspectRecord ? (
                        <button
                          key={rec.id}
                          type="button"
                          onClick={() => onInspectRecord(rec)}
                          className="px-2 py-1 text-[11px] font-mono bg-white hover:bg-amber-100 text-slate-800 border border-amber-300 rounded cursor-pointer"
                        >
                          #{rec.rankId} {rec.companyName}
                        </button>
                      ) : (
                        <span
                          key={rec.id}
                          className="px-2 py-1 text-[11px] font-mono bg-white text-slate-700 border border-slate-200 rounded"
                        >
                          #{rec.rankId} {rec.companyName}
                        </span>
                      )
                    )}
                  </div>
                </div>
              ))}

              {buyerDuplicateGroups.map((grp) => (
                <div
                  key={`buyer-dup-${grp.key}`}
                  className="p-2.5 bg-red-50/70 border border-red-200 rounded-md space-y-1"
                >
                  <div className="flex items-center justify-between gap-2 font-mono text-[11px] font-bold text-red-900">
                    <span>BUYERS COLLECTION COLLISION: {grp.key}</span>
                    <span>{grp.buyers.length} buyer docs</span>
                  </div>
                  <div className="text-[11px] text-red-800 font-mono">
                    {grp.buyers
                      .map((b) => `${b.id} (${b.companyName})`)
                      .join(' · ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
