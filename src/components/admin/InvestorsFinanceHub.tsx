import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Landmark,
  Mail,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  useBuyerAuth,
  type BankReadinessDocsState,
} from '../../context/BuyerAuthContext';
import {
  TRADE_REGION_LABELS,
  type LithiumIntelRecord,
  type TradeRegion,
} from '../../types/lithiumIntel';

interface InvestorsFinanceHubProps {
  onSelectLead: (record: LithiumIntelRecord) => void;
  onOpenEmailComposer: (prefill: {
    toEmail: string;
    contactName: string;
    companyName: string;
    leadId?: string;
    leadRankId?: number;
    subject?: string;
    body?: string;
  }) => void;
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

type FundingFilter =
  | 'ALL'
  | 'FAST_TRACK'
  | 'INVESTMENT_PARTNERS'
  | 'EU_GRANTS_FINANCE'
  | 'US_GRANTS_FINANCE'
  | 'DFI_GRANTS'
  | 'COMMERCIAL_TRADE_BANKS'
  | 'EXPORT_CREDIT_FINANCE';

const READINESS_DOCS: Array<{
  key: keyof BankReadinessDocsState;
  label: string;
  detail: string;
}> = [
  {
    key: 'nepcCacVerified',
    label: 'CAC RC 2012723 + NEPC Exporter Certificate + SCUML + FIRS TCC',
    detail: 'Corporate & non-oil statutory export compliance dossier.',
  },
  {
    key: 'cadastreAssaysVerified',
    label: 'MCO Licence EL No. 65197 (Jega LGA) + Assays ZMGN057 & Q38625/H260715-164',
    detail: '4.61% Li2O mineral origin, Zuma Gani & Foshan Ceramics verification.',
  },
  {
    key: 'signedOfftakeLoiVerified',
    label: 'Countersigned Offtake LOI / Draft SPA with Tier-A Refiner',
    detail: 'Collateralized offtake commitment for DFI / bank working capital.',
  },
  {
    key: 'sealedProformaVerified',
    label: 'Sealed Proforma Invoice (PI) + SWIFT MT700 L/C Routing Terms',
    detail: 'Prepared via Trade Doc Studio for commercial trade bank review.',
  },
];

export default function InvestorsFinanceHub({
  onSelectLead,
  onOpenEmailComposer,
  onNotify,
  onError,
}: InvestorsFinanceHubProps) {
  const {
    unifiedTradeBook,
    marketConfig,
    adminToggleBankReadiness,
  } = useBuyerAuth();

  const [filter, setFilter] = useState<FundingFilter>('ALL');
  const [search, setSearch] = useState('');
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const fundingRecords = useMemo(
    () => unifiedTradeBook.filter((r) => r.leadCategory === 'FUNDING_FINANCE'),
    [unifiedTradeBook]
  );

  const countsByRegion = useMemo(() => {
    const map: Record<string, number> = {
      INVESTMENT_PARTNERS: 0,
      EU_GRANTS_FINANCE: 0,
      US_GRANTS_FINANCE: 0,
      DFI_GRANTS: 0,
      COMMERCIAL_TRADE_BANKS: 0,
      EXPORT_CREDIT_FINANCE: 0,
      FAST_TRACK: 0,
    };
    fundingRecords.forEach((r) => {
      map[r.regionCode] = (map[r.regionCode] || 0) + 1;
      if (r.priorityScore >= 85) map.FAST_TRACK += 1;
    });
    return map;
  }, [fundingRecords]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fundingRecords.filter((r) => {
      if (filter === 'FAST_TRACK' && r.priorityScore < 85) return false;
      if (filter !== 'ALL' && filter !== 'FAST_TRACK' && r.regionCode !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        r.companyName.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.primaryRole.toLowerCase().includes(q) ||
        r.decisionMaker.toLowerCase().includes(q) ||
        r.tags.toLowerCase().includes(q)
      );
    });
  }, [fundingRecords, filter, search]);

  const readinessState = marketConfig.bankReadinessDocs;
  const readinessCompletedCount = Object.values(readinessState).filter(Boolean).length;

  const totalCapitalTargetUsd = useMemo(
    () => filtered.reduce((s, r) => s + (r.targetFobValue || 0), 0),
    [filtered]
  );

  const handleToggleReadiness = async (key: keyof BankReadinessDocsState) => {
    setTogglingKey(key);
    try {
      await adminToggleBankReadiness(key);
      onNotify('Bank & Investor Readiness Checklist synced to siteConfig/market.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to update readiness state.');
    } finally {
      setTogglingKey(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Split: Capital Summary + Persistent 4-Doc Bank Readiness Checklist */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Landmark className="w-4 h-4 text-amber-600" />
              <span>Investors, DFIs, EU/U.S. Grants &amp; Trade Banks</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              65 vetted mineral capital funds, bilateral trade banks, export credit agencies, and critical-minerals grant vehicles synchronized across Web and Android.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div>
              <div className="text-[11px] text-slate-500">Matched Partners</div>
              <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                {filtered.length} / {fundingRecords.length}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Fast-Track (85+)</div>
              <div className="font-mono text-lg font-bold text-amber-700 tabular-nums">
                {countsByRegion.FAST_TRACK}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Target Facility</div>
              <div className="font-mono text-lg font-bold text-emerald-700 tabular-nums">
                ${(totalCapitalTargetUsd / 1_000_000).toFixed(1)}M
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-lg p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Bank &amp; Investor Data-Room Readiness Checklist</span>
            </h4>
            <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
              {readinessCompletedCount} / 4 Verified
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {READINESS_DOCS.map((docItem) => {
              const checked = Boolean(readinessState[docItem.key]);
              return (
                <button
                  key={docItem.key}
                  type="button"
                  disabled={togglingKey === docItem.key}
                  onClick={() => void handleToggleReadiness(docItem.key)}
                  className={`p-2.5 text-left border rounded-md flex items-start gap-2 cursor-pointer transition-colors ${
                    checked
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {checked ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 leading-snug">
                      {docItem.label}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {docItem.detail}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category Filter Pills & Search */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'ALL', label: `All Capital (${fundingRecords.length})` },
              { id: 'FAST_TRACK', label: `Fast-Track 85+ (${countsByRegion.FAST_TRACK})` },
              {
                id: 'INVESTMENT_PARTNERS',
                label: `Investment Partners (${countsByRegion.INVESTMENT_PARTNERS})`,
              },
              {
                id: 'EU_GRANTS_FINANCE',
                label: `EU Grants (${countsByRegion.EU_GRANTS_FINANCE})`,
              },
              {
                id: 'US_GRANTS_FINANCE',
                label: `U.S. Grants (${countsByRegion.US_GRANTS_FINANCE})`,
              },
              {
                id: 'DFI_GRANTS',
                label: `DFI Grants (${countsByRegion.DFI_GRANTS})`,
              },
              {
                id: 'COMMERCIAL_TRADE_BANKS',
                label: `Trade Banks (${countsByRegion.COMMERCIAL_TRADE_BANKS})`,
              },
              {
                id: 'EXPORT_CREDIT_FINANCE',
                label: `ECAs (${countsByRegion.EXPORT_CREDIT_FINANCE})`,
              },
            ] as Array<{ id: FundingFilter; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border cursor-pointer whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter fund, bank, grant agency, ticket focus..."
            className="w-full h-9 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-md"
          />
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
              <th className="py-2.5 px-3">Rank</th>
              <th className="py-2.5 px-3">Institution / Partner</th>
              <th className="py-2.5 px-3">Mandate Track</th>
              <th className="py-2.5 px-3">Decision Maker / Desk</th>
              <th className="py-2.5 px-3 text-right">Score</th>
              <th className="py-2.5 px-3 text-right">Est. Facility</th>
              <th className="py-2.5 px-3">Stage</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((rec) => (
              <tr
                key={rec.rankId}
                onClick={() => onSelectLead(rec)}
                className="hover:bg-slate-50/80 cursor-pointer"
              >
                <td className="py-2.5 px-3 font-mono text-slate-500 tabular-nums">
                  #{rec.rankId}
                </td>
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-slate-900">{rec.companyName}</div>
                  <div className="text-[11px] text-slate-500">{rec.location}</div>
                </td>
                <td className="py-2.5 px-3">
                  <div className="text-slate-800">
                    {TRADE_REGION_LABELS[rec.regionCode as TradeRegion] || rec.regionCode}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[240px]">
                    {rec.primaryRole}
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <div className="text-slate-800">{rec.decisionMaker}</div>
                  <div className="font-mono text-[11px] text-slate-500">
                    {rec.directEmail || rec.generalEmail}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                  {rec.priorityScore} ({rec.priorityTier})
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                  ${rec.targetFobValue.toLocaleString('en-US')}
                </td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                  {rec.crmStage}
                </td>
                <td
                  className="py-2.5 px-3 text-right"
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
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-900 bg-slate-100 hover:bg-amber-100 rounded cursor-pointer"
                    >
                      <Mail className="w-3 h-3" />
                      <span>Pitch</span>
                    </button>
                    {rec.websiteUrl && (
                      <a
                        href={rec.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded"
                        title="Open website"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
