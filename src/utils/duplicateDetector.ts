import type { LithiumIntelRecord } from '../types/lithiumIntel';

const LEGAL_SUFFIXES = new Set([
  'ltd',
  'limited',
  'inc',
  'incorporated',
  'corp',
  'corporation',
  'gmbh',
  'ag',
  'sa',
  'sas',
  'sarl',
  'bv',
  'nv',
  'llc',
  'llp',
  'plc',
  'pty',
  'co',
  'company',
  'group',
  'holdings',
  'holding',
  'international',
  'intl',
  'trading',
  'enterprises',
]);

/**
 * Exact Android-compatible company normalization key for deduplication across
 * Lithium Intel mobile backups, CSV imports, and Firestore CRM collections.
 */
export function normalizeCompanyKey(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const filtered = words.filter((w, idx) => {
    if (idx === 0) return true;
    return !LEGAL_SUFFIXES.has(w);
  });

  const joined = (filtered.length > 0 ? filtered : words).join('');
  return joined.slice(0, 80);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export interface DuplicateMatchResult {
  hasDuplicate: boolean;
  matchedBy: Array<'company' | 'email' | 'phone'>;
  matches: LithiumIntelRecord[];
}

export function checkDuplicateLead(
  candidate: {
    id?: string;
    rankId?: number;
    companyName: string;
    generalEmail?: string;
    directEmail?: string;
    whatsappNumber?: string;
  },
  existingRecords: LithiumIntelRecord[]
): DuplicateMatchResult {
  const targetCompanyKey = normalizeCompanyKey(candidate.companyName);
  const candidateEmails = [candidate.generalEmail, candidate.directEmail]
    .map((e) => normalizeEmail(e || ''))
    .filter((e) => e.length >= 5);
  const candidatePhone = normalizePhoneDigits(candidate.whatsappNumber || '');

  const matchedBySet = new Set<'company' | 'email' | 'phone'>();
  const matchedRecords: LithiumIntelRecord[] = [];

  for (const record of existingRecords) {
    if (candidate.id && record.id === candidate.id) continue;
    if (candidate.rankId && record.rankId === candidate.rankId) continue;

    let hit = false;
    const recKey = record.normalizedCompanyKey || normalizeCompanyKey(record.companyName);
    if (targetCompanyKey && recKey === targetCompanyKey) {
      matchedBySet.add('company');
      hit = true;
    }

    const recEmails = [record.generalEmail, record.directEmail]
      .map((e) => normalizeEmail(e || ''))
      .filter((e) => e.length >= 5);

    if (candidateEmails.some((e) => recEmails.includes(e))) {
      matchedBySet.add('email');
      hit = true;
    }

    if (candidatePhone.length >= 7) {
      const recPhone = normalizePhoneDigits(record.whatsappNumber || '');
      if (recPhone.length >= 7 && (recPhone === candidatePhone || recPhone.endsWith(candidatePhone.slice(-8)))) {
        matchedBySet.add('phone');
        hit = true;
      }
    }

    if (hit) matchedRecords.push(record);
  }

  return {
    hasDuplicate: matchedRecords.length > 0,
    matchedBy: Array.from(matchedBySet),
    matches: matchedRecords,
  };
}

export interface DuplicateAuditSummary {
  totalRecords: number;
  duplicateGroupCount: number;
  duplicateRecordCount: number;
  groups: Array<{
    key: string;
    reason: 'company' | 'email' | 'phone';
    records: LithiumIntelRecord[];
  }>;
}

export function auditDuplicates(records: LithiumIntelRecord[]): DuplicateAuditSummary {
  const byCompany = new Map<string, LithiumIntelRecord[]>();
  const byEmail = new Map<string, LithiumIntelRecord[]>();

  for (const rec of records) {
    const cKey = rec.normalizedCompanyKey || normalizeCompanyKey(rec.companyName);
    if (cKey) {
      const arr = byCompany.get(cKey) || [];
      arr.push(rec);
      byCompany.set(cKey, arr);
    }

    const email = normalizeEmail(rec.directEmail || rec.generalEmail || '');
    if (email.length >= 5 && !email.includes('placeholder')) {
      const arr = byEmail.get(email) || [];
      arr.push(rec);
      byEmail.set(email, arr);
    }
  }

  const groups: DuplicateAuditSummary['groups'] = [];
  const dupIds = new Set<string>();

  byCompany.forEach((recs, key) => {
    if (recs.length > 1) {
      groups.push({ key, reason: 'company', records: recs });
      recs.slice(1).forEach((r) => dupIds.add(r.id));
    }
  });

  byEmail.forEach((recs, key) => {
    if (recs.length > 1) {
      const alreadyGrouped = recs.every((r) => dupIds.has(r.id));
      if (!alreadyGrouped) {
        groups.push({ key, reason: 'email', records: recs });
        recs.slice(1).forEach((r) => dupIds.add(r.id));
      }
    }
  });

  return {
    totalRecords: records.length,
    duplicateGroupCount: groups.length,
    duplicateRecordCount: dupIds.size,
    groups,
  };
}

/**
 * Non-blocking Android <-> Web timestamp merge: retains user edits where
 * incoming.lastUpdatedMillis is newer, and backfills missing metadata cleanly.
 */
export function mergeRecordsByTimestamp(
  baseRecords: LithiumIntelRecord[],
  incomingRecords: LithiumIntelRecord[]
): {
  merged: LithiumIntelRecord[];
  insertedCount: number;
  updatedCount: number;
  skippedOlderCount: number;
} {
  const map = new Map<string, LithiumIntelRecord>();
  baseRecords.forEach((r) => {
    const key = r.normalizedCompanyKey || normalizeCompanyKey(r.companyName);
    map.set(key, r);
  });

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedOlderCount = 0;

  for (const inc of incomingRecords) {
    const key = inc.normalizedCompanyKey || normalizeCompanyKey(inc.companyName);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, inc);
      insertedCount++;
    } else if ((inc.lastUpdatedMillis || 0) >= (existing.lastUpdatedMillis || 0)) {
      map.set(key, {
        ...existing,
        ...inc,
        id: existing.id || inc.id,
        normalizedCompanyKey: key,
        impliedFobPricePerMt:
          inc.estimatedTonnage > 0
            ? Number((inc.targetFobValue / inc.estimatedTonnage).toFixed(2))
            : existing.impliedFobPricePerMt,
        weightedValueUsd: Math.round((inc.targetFobValue * (inc.winProbability || 0)) / 100),
      });
      updatedCount++;
    } else {
      skippedOlderCount++;
    }
  }

  return {
    merged: Array.from(map.values()).sort((a, b) => a.rankId - b.rankId),
    insertedCount,
    updatedCount,
    skippedOlderCount,
  };
}
