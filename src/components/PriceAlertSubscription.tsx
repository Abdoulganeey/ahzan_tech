import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Bell,
  BellOff,
  CheckCircle2,
  Loader2,
  LogIn,
  Mail,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
  Activity,
} from 'lucide-react';
import {
  AGRO_PRICE_LIST_2026,
  LITHIUM_ASSAY_GRADE_PCT,
  LITHIUM_RATE_PER_PERCENT_USD,
  LUBRICANT_PRICE_LIST_2026,
} from '../data/priceLists';
import {
  useBuyerAuth,
  type AlertCategory,
  type AlertChannel,
  type AlertTriggerDirection,
} from '../context/BuyerAuthContext';
import { useLanguage } from '../i18n/LanguageContext';

export type ScheduleTabType = 'minerals' | 'agro' | 'lubricants';

interface MonitorableCommodity {
  key: string;
  label: string;
  category: AlertCategory;
  scheduleTab: ScheduleTabType;
  baselinePrice: number;
  unitLabel: string;
}

interface PriceAlertSubscriptionProps {
  activeScheduleTab: ScheduleTabType;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

function getSuggestedThreshold(
  baseline: number,
  direction: AlertTriggerDirection
): string {
  if (direction === 'pct_change') return '5';
  const multiplier = direction === 'below' ? 0.95 : 1.05;
  const computed = roundPrice(baseline * multiplier);
  return baseline >= 100 ? String(Math.round(computed)) : computed.toFixed(2);
}

export default function PriceAlertSubscription({
  activeScheduleTab,
}: PriceAlertSubscriptionProps) {
  const { lang } = useLanguage();
  const {
    user,
    signingIn,
    authError,
    priceAlerts,
    signInWithGoogle,
    createPriceAlert,
    togglePriceAlertStatus,
    deletePriceAlert,
  } = useBuyerAuth();

  const monitorableCommodities = useMemo<MonitorableCommodity[]>(() => {
    const lithiumBenchmark = Number(
      (LITHIUM_ASSAY_GRADE_PCT * LITHIUM_RATE_PER_PERCENT_USD).toFixed(2)
    );

    const mineralItems: MonitorableCommodity[] = [
      {
        key: 'li2o_pct_rate',
        label: 'Lithium Ore Benchmark ($207.00 / 1% Li2O)',
        category: 'Critical Minerals',
        scheduleTab: 'minerals',
        baselinePrice: LITHIUM_RATE_PER_PERCENT_USD,
        unitLabel: '% Li2O',
      },
      {
        key: 'li2o_461_assay_lot',
        label: `Lithium Ore Verified Lot (${LITHIUM_ASSAY_GRADE_PCT}% Li2O · ZMGN057)`,
        category: 'Critical Minerals',
        scheduleTab: 'minerals',
        baselinePrice: lithiumBenchmark,
        unitLabel: 'MT FOB',
      },
    ];

    const agroItems: MonitorableCommodity[] = AGRO_PRICE_LIST_2026.map((row) => ({
      key: `agro_sku_${row.no}`,
      label: `${row.commodity} (FOB Lagos)`,
      category: 'Agro-Commodities',
      scheduleTab: 'agro',
      baselinePrice: row.fobUsdPerUnit,
      unitLabel: `${row.unit} FOB`,
    }));

    const lubricantItems: MonitorableCommodity[] = LUBRICANT_PRICE_LIST_2026.filter(
      (row) => row.packSize === '200L' || row.packSize === '20L'
    ).map((row) => ({
      key: `lube_${row.grade.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')}_${row.packSize}`,
      label: `Ahzan Lubricant ${row.grade} (${row.packSize} · ${row.packaging})`,
      category: 'Lubricants',
      scheduleTab: 'lubricants',
      baselinePrice: row.usd,
      unitLabel: row.packSize === '200L' ? 'Drum' : 'Barrel',
    }));

    return [...mineralItems, ...agroItems, ...lubricantItems];
  }, []);

  const defaultKeyForTab = (tab: ScheduleTabType): string => {
    if (tab === 'agro') return 'agro_sku_4'; // Natural Whitish Sesame Seeds ($1,400/MT)
    if (tab === 'lubricants') return 'lube_CI_4_15W_40_Diesel_200L'; // CI-4 15W-40 200L ($394.28)
    return 'li2o_pct_rate';
  };

  const [selectedKey, setSelectedKey] = useState<string>(() =>
    defaultKeyForTab(activeScheduleTab)
  );
  const [direction, setDirection] = useState<AlertTriggerDirection>('below');
  const [thresholdInput, setThresholdInput] = useState<string>(() =>
    getSuggestedThreshold(LITHIUM_RATE_PER_PERCENT_USD, 'below')
  );
  const [emailInput, setEmailInput] = useState<string>(user?.email || '');
  const [channel, setChannel] = useState<AlertChannel>('email');

  const [submitting, setSubmitting] = useState(false);
  const [busyAlertId, setBusyAlertId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const selectedCommodity = useMemo(() => {
    return (
      monitorableCommodities.find((item) => item.key === selectedKey) ||
      monitorableCommodities[0]
    );
  }, [monitorableCommodities, selectedKey]);

  // Sync default commodity selection when schedule tab changes
  useEffect(() => {
    const nextKey = defaultKeyForTab(activeScheduleTab);
    const match =
      monitorableCommodities.find((c) => c.key === nextKey) ||
      monitorableCommodities[0];
    setSelectedKey(match.key);
    setThresholdInput(getSuggestedThreshold(match.baselinePrice, direction));
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScheduleTab, monitorableCommodities]);

  // Auto-populate verified buyer email once signed in
  useEffect(() => {
    if (user?.email && emailInput.trim() === '') {
      setEmailInput(user.email);
    }
  }, [user, emailInput]);

  const handleCommodityChange = (nextKey: string) => {
    setSelectedKey(nextKey);
    const nextCommodity = monitorableCommodities.find((c) => c.key === nextKey);
    if (nextCommodity) {
      setThresholdInput(
        getSuggestedThreshold(nextCommodity.baselinePrice, direction)
      );
    }
    setFormError(null);
    setStatusNotice(null);
  };

  const handleDirectionChange = (nextDir: AlertTriggerDirection) => {
    setDirection(nextDir);
    setThresholdInput(
      getSuggestedThreshold(selectedCommodity.baselinePrice, nextDir)
    );
    setFormError(null);
  };

  const applyPreset = (pctDelta: number) => {
    if (direction === 'pct_change') {
      setThresholdInput(String(Math.abs(pctDelta)));
      return;
    }
    const target = roundPrice(
      selectedCommodity.baselinePrice * (1 + pctDelta / 100)
    );
    setThresholdInput(
      selectedCommodity.baselinePrice >= 100
        ? String(Math.round(target))
        : target.toFixed(2)
    );
  };

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setStatusNotice(null);

    const trimmedEmail = (emailInput || user?.email || '').trim();
    if (!EMAIL_PATTERN.test(trimmedEmail) || trimmedEmail.length > 160) {
      setFormError(
        lang === 'fr'
          ? 'Veuillez saisir une adresse e-mail professionnelle valide.'
          : 'Please enter a valid corporate email address for alert notifications.'
      );
      return;
    }

    const parsedThreshold = Number(thresholdInput);
    if (!Number.isFinite(parsedThreshold) || parsedThreshold <= 0) {
      setFormError(
        lang === 'fr'
          ? 'Le seuil de déclenchement doit être supérieur à zéro.'
          : 'Trigger threshold must be a valid number greater than zero.'
      );
      return;
    }

    if (direction === 'pct_change' && parsedThreshold > 100) {
      setFormError(
        lang === 'fr'
          ? 'La variation en pourcentage doit être comprise entre 0,5% et 100%.'
          : 'Percentage fluctuation threshold must be between 0.5% and 100%.'
      );
      return;
    }

    if (parsedThreshold > 1000000) {
      setFormError(
        lang === 'fr'
          ? 'Le montant maximal autorisé est 1 000 000 USD.'
          : 'Maximum allowed target value is $1,000,000 USD.'
      );
      return;
    }

    setSubmitting(true);
    try {
      let targetUser = user;
      if (!targetUser) {
        targetUser = await signInWithGoogle();
        if (!targetUser) {
          setSubmitting(false);
          return;
        }
      }

      const finalEmail = EMAIL_PATTERN.test(trimmedEmail)
        ? trimmedEmail
        : targetUser.email || '';

      if (!finalEmail) {
        setFormError('No verified email address found for your account.');
        setSubmitting(false);
        return;
      }

      await createPriceAlert(
        {
          email: finalEmail,
          commodityKey: selectedCommodity.key,
          commodityLabel: selectedCommodity.label,
          category: selectedCommodity.category,
          baselinePrice: selectedCommodity.baselinePrice,
          unitLabel: selectedCommodity.unitLabel,
          triggerDirection: direction,
          thresholdValue: parsedThreshold,
          channel,
        },
        targetUser
      );

      setStatusNotice(
        lang === 'fr'
          ? `Alerte activée pour ${selectedCommodity.label}.`
          : `Watchlist alert activated for ${selectedCommodity.label}.`
      );
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Unable to save price alert subscription.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAlert = async (alertId: string, currentStatus: 'Active' | 'Paused') => {
    setBusyAlertId(alertId);
    setFormError(null);
    try {
      await togglePriceAlertStatus(
        alertId,
        currentStatus === 'Active' ? 'Paused' : 'Active'
      );
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to update alert status.'
      );
    } finally {
      setBusyAlertId(null);
    }
  };

  const handleRemoveAlert = async (alertId: string) => {
    setBusyAlertId(alertId);
    setFormError(null);
    try {
      await deletePriceAlert(alertId);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to delete price alert.'
      );
    } finally {
      setBusyAlertId(null);
    }
  };

  const mailtoDispatchHref = useMemo(() => {
    const triggerText =
      direction === 'pct_change'
        ? `+/- ${thresholdInput || '5'}% fluctuation from current $${selectedCommodity.baselinePrice} / ${selectedCommodity.unitLabel}`
        : `${direction === 'below' ? 'Drops to or below' : 'Rises to or above'} $${thresholdInput || selectedCommodity.baselinePrice} / ${selectedCommodity.unitLabel}`;

    const subject = encodeURIComponent(
      `Commodity Price Alert Subscription: ${selectedCommodity.label}`
    );
    const body = encodeURIComponent(
      `Hello Ahzan Tech Ltd Trade Desk,\n\nPlease enroll my address in price fluctuation alerts:\n- Commodity: ${selectedCommodity.label}\n- Current Benchmark: $${selectedCommodity.baselinePrice} / ${selectedCommodity.unitLabel}\n- Alert Trigger: ${triggerText}\n- Delivery Channel: ${channel === 'email_whatsapp' ? 'Email + WhatsApp Trade Desk' : 'Email Dispatch'}\n- Subscriber Email: ${emailInput || '(Enter your email)'}\n`
    );
    return `mailto:abdoul@ahzantechltd.com?subject=${subject}&body=${body}`;
  }, [selectedCommodity, direction, thresholdInput, channel, emailInput]);

  return (
    <div
      id="price-alert-subscription"
      className="mt-10 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs"
    >
      {/* Top Bar */}
      <div className="px-6 py-4 bg-slate-950 text-white flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-white">
              {lang === 'fr'
                ? 'Alertes de Fluctuation des Cours — Lithium, Agro-Export & Lubrifiants'
                : 'Commodity Price Fluctuation Alerts — Minerals, Agro & Lubricants'}
            </h3>
            <p className="text-xs text-slate-300">
              {lang === 'fr'
                ? 'Recevez une notification instantanée lorsque les tarifs FOB Lagos, le % Li2O ou les barèmes Kano atteignent votre seuil.'
                : 'Set custom target thresholds or % volatility triggers against official FOB Lagos, Lithium % Li2O ($207/%), and Kano lubricant schedules.'}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-700/40 rounded-md">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            {user
              ? lang === 'fr'
                ? `Synchronisé (${priceAlerts.length})`
                : `Cloud Watchlist (${priceAlerts.length})`
              : lang === 'fr'
                ? 'Alertes Marché 2026'
                : 'Live Schedule Watchlist'}
          </span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Left: Alert Configuration Form */}
        <form
          onSubmit={handleSubscribe}
          className="lg:col-span-7 p-6 space-y-5 bg-white"
        >
          {/* Commodity Selector & Live Benchmark */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-8">
              <label
                htmlFor="alert-commodity-select"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                {lang === 'fr'
                  ? 'Commodité / Référence à Surveiller'
                  : 'Monitored Commodity / Schedule SKU'}
              </label>
              <select
                id="alert-commodity-select"
                value={selectedKey}
                onChange={(e) => handleCommodityChange(e.target.value)}
                className="w-full px-3 py-2.5 text-sm font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-600"
              >
                <optgroup label="Critical Minerals ($207 / % Li2O)">
                  {monitorableCommodities
                    .filter((c) => c.category === 'Critical Minerals')
                    .map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Agro-Commodities (FOB Lagos)">
                  {monitorableCommodities
                    .filter((c) => c.category === 'Agro-Commodities')
                    .map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label} — ${c.baselinePrice.toLocaleString('en-US')}/{c.unitLabel}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Industrial Lubricants (Kano 20L / 200L)">
                  {monitorableCommodities
                    .filter((c) => c.category === 'Lubricants')
                    .map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label} — ${c.baselinePrice.toFixed(2)}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            <div className="sm:col-span-4 px-3.5 py-2 bg-slate-900 text-white rounded-lg border border-slate-800">
              <div className="text-[11px] font-medium text-slate-400">
                {lang === 'fr' ? 'Tarif Actuel' : 'Current Benchmark'}
              </div>
              <div className="font-mono text-sm font-bold text-amber-400 tabular-nums mt-0.5 truncate">
                ${selectedCommodity.baselinePrice.toLocaleString('en-US', {
                  minimumFractionDigits: selectedCommodity.baselinePrice < 100 ? 2 : 0,
                  maximumFractionDigits: 2,
                })}{' '}
                <span className="text-xs font-normal text-slate-300">
                  / {selectedCommodity.unitLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Trigger Condition Buttons */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              {lang === 'fr'
                ? 'Condition de Déclenchement'
                : 'Fluctuation Trigger Rule'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDirectionChange('below')}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  direction === 'below'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  {lang === 'fr' ? 'Baisse ≤ Seuil' : 'Drops ≤ Target'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDirectionChange('above')}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  direction === 'above'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {lang === 'fr' ? 'Hausse ≥ Seuil' : 'Rises ≥ Target'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDirectionChange('pct_change')}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  direction === 'pct_change'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  {lang === 'fr' ? 'Variation ±%' : 'Moves ±%'}
                </span>
              </button>
            </div>
          </div>

          {/* Threshold Input + Quick Presets & Notification Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="alert-threshold-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                {direction === 'pct_change'
                  ? lang === 'fr'
                    ? 'Variation Maximale (%)'
                    : 'Fluctuation Tolerance (%)'
                  : lang === 'fr'
                    ? `Prix Cible (USD / ${selectedCommodity.unitLabel})`
                    : `Target Trigger Price (USD / ${selectedCommodity.unitLabel})`}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-500">
                  {direction === 'pct_change' ? '±%' : '$'}
                </span>
                <input
                  id="alert-threshold-input"
                  type="number"
                  step="any"
                  min={direction === 'pct_change' ? '0.5' : '0.01'}
                  max={direction === 'pct_change' ? '100' : '1000000'}
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 font-mono text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-600 tabular-nums"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {direction === 'below' && (
                  <>
                    <button
                      type="button"
                      onClick={() => applyPreset(-3)}
                      className="px-2 py-1 text-[11px] font-mono font-semibold text-slate-700 bg-slate-100 hover:bg-amber-100 rounded border border-slate-200 cursor-pointer"
                    >
                      -3%
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(-5)}
                      className="px-2 py-1 text-[11px] font-mono font-semibold text-slate-700 bg-slate-100 hover:bg-amber-100 rounded border border-slate-200 cursor-pointer"
                    >
                      -5%
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(-10)}
                      className="px-2 py-1 text-[11px] font-mono font-semibold text-slate-700 bg-slate-100 hover:bg-amber-100 rounded border border-slate-200 cursor-pointer"
                    >
                      -10%
                    </button>
                  </>
                )}
                {direction === 'above' && (
                  <>
                    <button
                      type="button"
                      onClick={() => applyPreset(3)}
                      className="px-2 py-1 text-[11px] font-mono font-semibold text-slate-700 bg-slate-100 hover:bg-amber-100 rounded border border-slate-200 cursor-pointer"
                    >
                      +3%
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(5)}
                      className="px-2 py-1 text-[11px] font-mono font-semibold text-slate-700 bg-slate-100 hover:bg-amber-100 rounded border border-slate-200 cursor-pointer"
                    >
                      +5%
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(10)}
                      className="px-2 py-1 text-[11px] font-mono font-semibold text-slate-700 bg-slate-100 hover:bg-amber-100 rounded border border-slate-200 cursor-pointer"
                    >
                      +10%
                    </button>
                  </>
                )}
                {direction === 'pct_change' && (
                  <>
                    <button
                      type="button"
                      onClick={() => applyPreset(3)}
                      className="px-2 py-1 text-[11px] font-mono font-semibold text-slate-700 bg-slate-100 hover:bg-amber-100 rounded border border-slate-200 cursor-pointer"
                    >
                      ±3%
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(5)}
                      className="px-2 py-1 text-[11px] font-mono font-semibold text-slate-700 bg-slate-100 hover:bg-amber-100 rounded border border-slate-200 cursor-pointer"
                    >
                      ±5%
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(10)}
                      className="px-2 py-1 text-[11px] font-mono font-semibold text-slate-700 bg-slate-100 hover:bg-amber-100 rounded border border-slate-200 cursor-pointer"
                    >
                      ±10%
                    </button>
                  </>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="alert-email-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                {lang === 'fr'
                  ? 'E-mail de Notification'
                  : 'Notification Corporate Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="alert-email-input"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="procurement@company.com"
                  required
                  maxLength={160}
                  className="w-full pl-9 pr-3 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-600"
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setChannel('email')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors cursor-pointer ${
                    channel === 'email'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {lang === 'fr' ? 'E-mail Uniquement' : 'Email Only'}
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('email_whatsapp')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors cursor-pointer ${
                    channel === 'email_whatsapp'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {lang === 'fr' ? 'E-mail + WhatsApp Desk' : 'Email + WhatsApp Desk'}
                </button>
              </div>
            </div>
          </div>

          {/* Feedback Notices */}
          {(formError || authError) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError || authError}</span>
            </div>
          )}

          {statusNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{statusNotice}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting || signingIn}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {submitting || signingIn ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : user ? (
                <Bell className="w-4 h-4" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>
                {user
                  ? lang === 'fr'
                    ? 'Activer l’Alerte Prix'
                    : 'Activate Price Alert'
                  : lang === 'fr'
                    ? 'Connexion Google & Activer'
                    : 'Sign in with Google & Activate Alert'}
              </span>
            </button>

            <a
              href={mailtoDispatchHref}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-slate-600" />
              <span>
                {lang === 'fr'
                  ? 'Demande par E-mail Desk'
                  : 'Send via Trade Desk Email'}
              </span>
            </a>
          </div>
        </form>

        {/* Right: Active Watchlist Panel */}
        <div className="lg:col-span-5 p-6 bg-slate-50 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h4 className="font-display text-sm font-bold text-slate-900">
                {lang === 'fr'
                  ? 'Vos Alertes Actives'
                  : 'Your Active Price Watchlist'}
              </h4>
              {user && (
                <span className="text-[11px] font-mono font-semibold text-slate-600 tabular-nums">
                  {priceAlerts.filter((a) => a.status === 'Active').length}{' '}
                  {lang === 'fr' ? 'actives' : 'active'}
                </span>
              )}
            </div>

            {!user ? (
              <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  {lang === 'fr'
                    ? 'Connectez-vous avec votre compte Google pour sauvegarder, suspendre ou supprimer vos alertes de fluctuation de manière sécurisée (isolées par UID acheteur).'
                    : 'Sign in with Google to save, pause, or manage persistent fluctuation alerts tied strictly to your verified buyer account.'}
                </p>

                <div className="pt-2 border-t border-slate-100 space-y-2 text-[11px] text-slate-600">
                  <div className="flex items-center justify-between font-mono">
                    <span>Lithium Ore (1% Li2O)</span>
                    <span className="font-bold text-slate-900">$207.00 / %</span>
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span>Whitish Sesame 99/1</span>
                    <span className="font-bold text-slate-900">$1,400 / MT</span>
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span>Fermented Cocoa Gr.1</span>
                    <span className="font-bold text-slate-900">$3,638 / MT</span>
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span>CI-4 15W-40 (200L)</span>
                    <span className="font-bold text-slate-900">$394.28 / Drum</span>
                  </div>
                </div>
              </div>
            ) : priceAlerts.length === 0 ? (
              <div className="p-5 bg-white border border-dashed border-slate-300 rounded-lg text-center space-y-2">
                <BellOff className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-800">
                  {lang === 'fr'
                    ? 'Aucune alerte de prix configurée'
                    : 'No commodity price alerts configured yet'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {lang === 'fr'
                    ? 'Sélectionnez une commodité à gauche et activez votre première alerte.'
                    : 'Choose a commodity benchmark on the left to start tracking price movements.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {priceAlerts.map((alert) => {
                  const isBusy = busyAlertId === alert.id;
                  const isPaused = alert.status === 'Paused';
                  const ruleText =
                    alert.triggerDirection === 'pct_change'
                      ? `±${alert.thresholdValue}% move`
                      : alert.triggerDirection === 'below'
                        ? `≤ $${alert.thresholdValue.toLocaleString('en-US')}`
                        : `≥ $${alert.thresholdValue.toLocaleString('en-US')}`;

                  return (
                    <div
                      key={alert.id}
                      className={`p-3.5 bg-white border rounded-lg transition-opacity ${
                        isPaused
                          ? 'border-slate-200 opacity-75'
                          : 'border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {alert.commodityLabel}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {alert.category} ·{' '}
                            <span className="font-mono font-semibold text-slate-800 tabular-nums">
                              {ruleText}
                            </span>{' '}
                            / {alert.unitLabel}
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded border shrink-0 ${
                            isPaused
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-slate-500 truncate">
                          {alert.email}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              void handleToggleAlert(alert.id, alert.status)
                            }
                            aria-label={isPaused ? 'Resume alert' : 'Pause alert'}
                            className="inline-flex items-center gap-1 px-2 py-1 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isPaused ? (
                              <>
                                <PlayCircle className="w-3 h-3 text-emerald-600" />
                                <span>{lang === 'fr' ? 'Activer' : 'Resume'}</span>
                              </>
                            ) : (
                              <>
                                <PauseCircle className="w-3 h-3 text-amber-600" />
                                <span>{lang === 'fr' ? 'Pause' : 'Pause'}</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleRemoveAlert(alert.id)}
                            aria-label="Delete price alert"
                            className="p-1 text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-200 pt-3">
            {lang === 'fr'
              ? 'Les cotations officielles incluent le lithium à 207 $ / 1% Li2O, les 18 produits agro FOB Lagos et les lubrifiants Kano (USD/NGN/XOF).'
              : 'Benchmarks tracked daily against Ahzan Tech Ltd contract desks in Kano & Lagos (USD / NGN / XOF).'}
          </p>
        </div>
      </div>
    </div>
  );
}
