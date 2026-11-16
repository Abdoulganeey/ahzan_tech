import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  fetchVerifiedComplianceStatus,
  type ComplianceBadgeRecord,
  type ComplianceRegistrySnapshot,
} from '../data/complianceRegistry';
import { useLanguage } from '../i18n/LanguageContext';
import { COMPLIANCE_BADGE_FR } from '../i18n/translations';
import heroPortLogisticsImg from '../assets/images/hero_port_logistics_1794786070092.jpg';

interface HeroProps {
  onOpenDealRoom: () => void;
  onOpenBuyerDashboard?: () => void;
}

export default function Hero({ onOpenDealRoom, onOpenBuyerDashboard }: HeroProps) {
  const { lang, t } = useLanguage();
  const [snapshot, setSnapshot] = useState<ComplianceRegistrySnapshot | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecordId, setSelectedRecordId] = useState<
    ComplianceBadgeRecord['id'] | null
  >('rc');

  const loadComplianceStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchVerifiedComplianceStatus();
      setSnapshot(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadComplianceStatus();
  }, [loadComplianceStatus]);

  const activeRecord =
    snapshot?.records.find((r) => r.id === selectedRecordId) ||
    snapshot?.records[0] ||
    null;

  return (
    <section id="top" className="relative bg-slate-950 text-white overflow-hidden">
      {/* Background Architectural Port Image with Measured Scrim */}
      <div className="relative min-h-[600px] lg:min-h-[660px] flex items-center">
        <div className="absolute inset-0">
          <img
            src={heroPortLogisticsImg}
            alt="International maritime container terminal and bulk mineral export port at golden hour"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/88 to-slate-950/65"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/45"
          />
        </div>

        {/* Primary Hero Split Grid */}
        <div className="relative z-10 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Core Trade Proposition & Dual CTAs */}
            <div className="lg:col-span-7">
              <p className="text-sm font-medium tracking-wide text-amber-400 mb-4">
                {t.hero.kicker}
              </p>

              <h1 className="font-display text-[clamp(2.25rem,4vw,3.5rem)] font-bold leading-[1.08] tracking-tight text-white text-balance mb-6">
                {t.hero.headline}
              </h1>

              <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-2xl mb-8">
                {t.hero.subcopy}
              </p>

              {/* Dual CTA Controls */}
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onOpenDealRoom}
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm sm:text-base font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  <span>{t.hero.ctaPrimary}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="#catalog"
                  className="inline-flex items-center justify-center px-6 py-3.5 text-sm sm:text-base font-semibold text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-600 hover:border-slate-500 rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  {t.hero.ctaSecondary}
                </a>
              </div>

              {onOpenBuyerDashboard && (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={onOpenBuyerDashboard}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    <span>
                      {lang === 'fr'
                        ? 'Acheteur enregistré ? Suivre vos RFQ, expéditions & documents'
                        : 'Existing buyer? Track active RFQs, FCL shipments & trade documents'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Dynamic Verified Compliance Badge Section */}
            <aside
              aria-label="Verified Compliance Registry Status"
              className="lg:col-span-5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-5 sm:p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h2 className="font-display text-base font-bold text-white leading-tight">
                      {t.hero.verifiedCompliance}
                    </h2>
                    <p className="font-mono text-[11px] text-slate-400 tabular-nums mt-0.5">
                      {isLoading
                        ? t.hero.syncing
                        : snapshot?.checkedAtDisplay}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void loadComplianceStatus()}
                  disabled={isLoading}
                  aria-label="Refresh verified compliance status"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 border border-slate-700 rounded-md transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
                  />
                  <span>{t.hero.verifyBtn}</span>
                </button>
              </div>

              {/* Dynamic Compliance Badges List */}
              <div className="mt-4 space-y-2">
                {isLoading || !snapshot
                  ? Array.from({ length: 5 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="h-12 rounded-lg bg-slate-800/70 border border-slate-800 animate-pulse"
                      />
                    ))
                  : snapshot.records.map((record, index) => {
                      const isSelected = activeRecord?.id === record.id;
                      const frRecord =
                        lang === 'fr' ? COMPLIANCE_BADGE_FR[record.id] : null;
                      return (
                        <motion.button
                          key={`${snapshot.checkedAtIso}-${record.id}`}
                          type="button"
                          onClick={() => setSelectedRecordId(record.id)}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.35,
                            delay: index * 0.06,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className={`w-full text-left px-3.5 py-2.5 rounded-lg border transition-colors duration-150 flex items-center justify-between gap-3 cursor-pointer ${
                            isSelected
                              ? 'bg-slate-800/95 border-amber-500/70'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] font-medium text-slate-400">
                              {frRecord ? frRecord.shortLabel : record.shortLabel}
                            </div>
                            <div className="font-mono text-sm font-semibold text-white truncate">
                              {record.identifier}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 whitespace-nowrap">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {frRecord ? frRecord.statusLabel : record.statusLabel}
                              </span>
                            </span>
                            <ChevronRight
                              className={`w-4 h-4 transition-transform ${
                                isSelected
                                  ? 'text-amber-400 translate-x-0.5'
                                  : 'text-slate-500'
                              }`}
                            />
                          </div>
                        </motion.button>
                      );
                    })}
              </div>

              {/* Selected Credential Statutory Detail Drawer */}
              {!isLoading && activeRecord && (
                <motion.div
                  key={activeRecord.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className="mt-4 pt-3.5 border-t border-slate-800 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-amber-400">
                      {activeRecord.authority}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {activeRecord.registryCode}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {lang === 'fr' && COMPLIANCE_BADGE_FR[activeRecord.id]
                      ? COMPLIANCE_BADGE_FR[activeRecord.id].scopeSummary
                      : activeRecord.scopeSummary}
                  </p>
                  <div className="pt-1">
                    <a
                      href="#compliance"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-white hover:text-amber-400 transition-colors"
                    >
                      <span>{t.hero.viewDossier}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </motion.div>
              )}
            </aside>
          </div>
        </div>
      </div>

      {/* Full-Width 4-Column Verifiable Credentials Strip */}
      <div className="relative z-10 border-t border-slate-800 bg-slate-900/90">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
            {t.hero.metrics.map((item) => (
              <div key={item.label} className="py-5 sm:px-6 first:pl-0 last:pr-0">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </div>
                <div className="font-mono text-lg font-semibold text-white tabular-nums tracking-tight">
                  {item.value}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
