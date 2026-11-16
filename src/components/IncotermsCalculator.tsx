import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calculator,
  Check,
  CheckCircle2,
  Info,
  Package,
  Plus,
} from 'lucide-react';
import {
  COMMODITY_PRODUCTS,
  CONTAINER_SPECS,
  INCOTERMS_DATA,
  type CommodityProduct,
  type ContainerSize,
  type IncotermCode,
} from '../data/tradeData';
import { useLanguage } from '../i18n/LanguageContext';
import {
  CATEGORY_FR,
  INCOTERM_DESC_FR,
  PRODUCT_FR,
} from '../i18n/translations';

export type SettlementCurrency = 'USD' | 'EUR' | 'GBP' | 'CNY' | 'NGN' | 'XOF';

const FX_RATES: Record<
  SettlementCurrency,
  { symbol: string; rateFromUsd: number; label: string }
> = {
  USD: { symbol: '$', rateFromUsd: 1, label: 'USD' },
  EUR: { symbol: '€', rateFromUsd: 0.92, label: 'EUR' },
  GBP: { symbol: '£', rateFromUsd: 0.79, label: 'GBP' },
  CNY: { symbol: '¥', rateFromUsd: 7.24, label: 'CNY' },
  NGN: { symbol: '₦', rateFromUsd: 1390, label: 'NGN' },
  XOF: { symbol: 'CFA ', rateFromUsd: 584.46, label: 'XOF' },
};

const PORT_CORRIDORS = [
  { id: 'ng-origin', label: 'Apapa / Tin Can, Nigeria (Origin)', transit: 'Origin Port', transitFr: 'Port d’origine', extraDays: 0 },
  { id: 'cn-qingdao', label: 'Qingdao / Ningbo, China', transit: '32–38 Days Sea', transitFr: '32–38 jours mer', extraDays: 35 },
  { id: 'eu-rotterdam', label: 'Rotterdam / Hamburg / London, EU/UK', transit: '18–22 Days Sea', transitFr: '18–22 jours mer', extraDays: 20 },
  { id: 'ae-jebel-ali', label: 'Jebel Ali, UAE', transit: '24–28 Days Sea', transitFr: '24–28 jours mer', extraDays: 26 },
  { id: 'ke-mombasa', label: 'Cotonou / Dakar / Abidjan (UEMOA)', transit: '6–12 Days Sea', transitFr: '6–12 jours mer', extraDays: 9 },
];

export interface CalculatorPrefill {
  productId: string;
  targetUnits: number;
  unitLabel: string;
  containerSize: ContainerSize;
  containersNeeded: number;
  incoterm: IncotermCode;
  estimatedUnitPriceUsd: number;
  estimatedTotalUsd: number;
  destinationPort?: string;
}

interface IncotermsCalculatorProps {
  onTransferToDealRoom: (prefill: CalculatorPrefill) => void;
  onAddToManifest: (item: CalculatorPrefill) => void;
}

const INCOTERM_CODES: IncotermCode[] = ['EXW', 'FOB', 'CFR', 'CIF', 'DAP'];
const CURRENCIES: SettlementCurrency[] = ['USD', 'EUR', 'GBP', 'CNY', 'NGN', 'XOF'];

export default function IncotermsCalculator({
  onTransferToDealRoom,
  onAddToManifest,
}: IncotermsCalculatorProps) {
  const { lang, t } = useLanguage();
  const [selectedProductId, setSelectedProductId] = useState<string>(
    COMMODITY_PRODUCTS[0].id
  );
  const [li2oGradePct, setLi2oGradePct] = useState<number>(4.61);
  const [inputMode, setInputMode] = useState<'units' | 'containers'>('units');
  const [targetUnitsInput, setTargetUnitsInput] = useState<number>(100);
  const [containerCountInput, setContainerCountInput] = useState<number>(4);
  const [containerSize, setContainerSize] = useState<ContainerSize>('20ft');
  const [incoterm, setIncoterm] = useState<IncotermCode>('FOB');
  const [currency, setCurrency] = useState<SettlementCurrency>('USD');
  const [corridorId, setCorridorId] = useState<string>('eu-rotterdam');
  const [addedToManifest, setAddedToManifest] = useState(false);

  const product: CommodityProduct = useMemo(
    () =>
      COMMODITY_PRODUCTS.find((p) => p.id === selectedProductId) ||
      COMMODITY_PRODUCTS[0],
    [selectedProductId]
  );

  const selectedCorridor = useMemo(
    () => PORT_CORRIDORS.find((c) => c.id === corridorId) || PORT_CORRIDORS[2],
    [corridorId]
  );

  const maxUnitsPerContainer =
    containerSize === '20ft' ? product.maxUnitsPer20ft : product.maxUnitsPer40ft;

  const handleProductChange = (newId: string) => {
    setSelectedProductId(newId);
    const nextProduct =
      COMMODITY_PRODUCTS.find((p) => p.id === newId) || COMMODITY_PRODUCTS[0];
    const perBox =
      containerSize === '20ft'
        ? nextProduct.maxUnitsPer20ft
        : nextProduct.maxUnitsPer40ft;
    if (inputMode === 'containers') {
      setTargetUnitsInput(containerCountInput * perBox);
    } else {
      setTargetUnitsInput(perBox * 2);
    }
  };

  const handleContainerSizeChange = (size: ContainerSize) => {
    setContainerSize(size);
    const perBox =
      size === '20ft' ? product.maxUnitsPer20ft : product.maxUnitsPer40ft;
    if (inputMode === 'containers') {
      setTargetUnitsInput(containerCountInput * perBox);
    }
  };

  const calculation = useMemo(() => {
    const safeUnits =
      inputMode === 'units'
        ? Math.max(1, Number.isFinite(targetUnitsInput) ? targetUnitsInput : 1)
        : Math.max(1, containerCountInput) * maxUnitsPerContainer;

    const containersNeeded = Math.max(
      1,
      Math.ceil(safeUnits / maxUnitsPerContainer)
    );

    const term = INCOTERMS_DATA[incoterm];
    const volumeDiscountFactor =
      safeUnits >= maxUnitsPerContainer * 10
        ? 0.96
        : safeUnits >= maxUnitsPerContainer * 4
          ? 0.98
          : 1.0;

    // For Lithium Mineral: exact $207 per 1% Li2O per MT
    const rawFobUsd = product.ratePerPercentLi2O
      ? Math.round(li2oGradePct * product.ratePerPercentLi2O * 100) / 100
      : product.fobUsdPerUnit;

    const discountedFobUsd = Math.round(rawFobUsd * volumeDiscountFactor);
    const termAdder = Math.round(
      term.deltaFromFobUsd + discountedFobUsd * term.freightMultiplierFromFobPct
    );
    const estimatedUnitPriceUsd = Math.max(1, discountedFobUsd + termAdder);
    const estimatedTotalUsd = Math.round(estimatedUnitPriceUsd * safeUnits);

    const fx = FX_RATES[currency];
    const convertedUnitPrice = Math.round(estimatedUnitPriceUsd * fx.rateFromUsd);
    const convertedTotal = Math.round(estimatedTotalUsd * fx.rateFromUsd);

    const totalWeightKg = safeUnits * product.weightKgPerUnit;
    const totalVolumeCbm = safeUnits * product.volumeCbmPerUnit;
    const containerSpec = CONTAINER_SPECS[containerSize];

    const totalWeightCapacityKg = containersNeeded * containerSpec.maxPayloadKg;
    const totalVolumeCapacityCbm =
      containersNeeded * containerSpec.internalVolumeCbm;

    const weightUtilizationPct = Math.min(
      100,
      Math.round((totalWeightKg / totalWeightCapacityKg) * 100)
    );
    const volumeUtilizationPct = Math.min(
      100,
      Math.round((totalVolumeCbm / totalVolumeCapacityCbm) * 100)
    );

    const packageCount = Math.ceil(totalWeightKg / product.packageUnitWeightKg);

    const limitingFactor =
      weightUtilizationPct >= volumeUtilizationPct
        ? lang === 'fr'
          ? 'Limite de charge utile'
          : 'Payload Weight Limit'
        : lang === 'fr'
          ? 'Limite de volume cubique'
          : 'Cubic Volume Limit';

    return {
      effectiveUnits: safeUnits,
      containersNeeded,
      rawFobUsd,
      discountedFobUsd,
      termAdder,
      estimatedUnitPriceUsd,
      estimatedTotalUsd,
      convertedUnitPrice,
      convertedTotal,
      fx,
      totalWeightKg,
      totalVolumeCbm,
      weightUtilizationPct,
      volumeUtilizationPct,
      packageCount,
      volumeDiscountPct: Math.round((1 - volumeDiscountFactor) * 100),
      limitingFactor,
    };
  }, [
    inputMode,
    targetUnitsInput,
    containerCountInput,
    maxUnitsPerContainer,
    incoterm,
    product,
    li2oGradePct,
    containerSize,
    currency,
    lang,
  ]);

  const termInfo = INCOTERMS_DATA[incoterm];
  const termFr = lang === 'fr' ? INCOTERM_DESC_FR[incoterm] : null;
  const containerInfo = CONTAINER_SPECS[containerSize];
  const productFr = lang === 'fr' ? PRODUCT_FR[product.id] : null;

  const currentPayload: CalculatorPrefill = {
    productId: product.id,
    targetUnits: calculation.effectiveUnits,
    unitLabel: product.unitLabel,
    containerSize,
    containersNeeded: calculation.containersNeeded,
    incoterm,
    estimatedUnitPriceUsd: calculation.estimatedUnitPriceUsd,
    estimatedTotalUsd: calculation.estimatedTotalUsd,
    destinationPort: selectedCorridor.label,
  };

  const handleAddManifestClick = () => {
    onAddToManifest(currentPayload);
    setAddedToManifest(true);
    setTimeout(() => setAddedToManifest(false), 1800);
  };

  return (
    <section
      id="calculator"
      className="py-16 lg:py-24 bg-slate-50 border-b border-slate-200"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-amber-700 mb-2">
              {t.calculator.eyebrow}
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance mb-3">
              {t.calculator.title}
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              {t.calculator.subtitle}
            </p>
          </div>

          {/* Multi-Currency Settlement Switcher (USD, EUR, GBP, CNY, NGN, XOF) */}
          <div className="shrink-0">
            <span className="block text-xs font-semibold text-slate-600 mb-1.5">
              {t.calculator.currencyLabel}
            </span>
            <div className="inline-flex flex-wrap p-1 bg-white border border-slate-200 rounded-lg">
              {CURRENCIES.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setCurrency(code)}
                  className={`px-2.5 py-1.5 text-xs font-mono font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    currency === code
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calculator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Panel: Configuration Inputs */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
            {/* 1. Product Selector & Corridor */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-7">
                <label
                  htmlFor="calc-product-select"
                  className="block text-sm font-semibold text-slate-900 mb-2"
                >
                  {t.calculator.commodityLabel}
                </label>
                <select
                  id="calc-product-select"
                  value={product.id}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full h-11 px-3.5 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                >
                  {COMMODITY_PRODUCTS.map((item) => {
                    const catLabel =
                      lang === 'fr' ? CATEGORY_FR[item.category] || item.category : item.category;
                    const itemName =
                      lang === 'fr' && PRODUCT_FR[item.id]
                        ? PRODUCT_FR[item.id].shortName
                        : item.shortName;
                    return (
                      <option key={item.id} value={item.id}>
                        {catLabel} — {itemName} (HS {item.hsCode})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="sm:col-span-5">
                <label
                  htmlFor="calc-corridor-select"
                  className="block text-sm font-semibold text-slate-900 mb-2"
                >
                  {t.calculator.corridorLabel}
                </label>
                <select
                  id="calc-corridor-select"
                  value={corridorId}
                  onChange={(e) => setCorridorId(e.target.value)}
                  className="w-full h-11 px-3 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                >
                  {PORT_CORRIDORS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 -mt-3">
              <span>{t.calculator.originPrefix}: {product.origin}</span>
              <span aria-hidden="true">·</span>
              <span>{product.assayRef}</span>
              <span aria-hidden="true">·</span>
              <span>
                {t.calculator.transitPrefix}:{' '}
                {lang === 'fr' ? selectedCorridor.transitFr : selectedCorridor.transit}
              </span>
            </div>

            {/* Dynamic $207 per 1% Li2O Grade Input (Shown when Lithium Ore is selected) */}
            {product.ratePerPercentLi2O && (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="li2o-grade-range"
                    className="text-xs font-bold text-slate-900"
                  >
                    {lang === 'fr'
                      ? 'Teneur Li2O (%) — Tarif : 207 $ / 1% / MT'
                      : 'Target Li2O Grade (%) — Rate: $207 per 1% / MT'}
                  </label>
                  <span className="font-mono text-sm font-bold text-amber-800 tabular-nums">
                    {li2oGradePct.toFixed(2)}% × $207 = $
                    {(li2oGradePct * product.ratePerPercentLi2O).toFixed(2)} / MT FOB
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id="li2o-grade-range"
                    type="range"
                    min={3.0}
                    max={6.0}
                    step={0.01}
                    value={li2oGradePct}
                    onChange={(e) => setLi2oGradePct(Number(e.target.value))}
                    className="flex-1 accent-amber-600 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setLi2oGradePct(4.61)}
                    className="px-2.5 py-1 text-[11px] font-mono font-semibold text-slate-800 bg-white border border-amber-300 rounded hover:bg-amber-100 cursor-pointer whitespace-nowrap"
                  >
                    4.61% (ZMGN057)
                  </button>
                </div>
              </div>
            )}

            {/* 2. Volume Mode + Container Size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {t.calculator.quantityLabel}
                  </span>
                  <div className="inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setInputMode('units')}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                        inputMode === 'units'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t.calculator.byUnit} {product.unitLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode('containers')}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                        inputMode === 'containers'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t.calculator.byFcl}
                    </button>
                  </div>
                </div>

                {inputMode === 'units' ? (
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={25000}
                      value={targetUnitsInput}
                      onChange={(e) =>
                        setTargetUnitsInput(Math.max(1, Number(e.target.value) || 1))
                      }
                      aria-label={`Target quantity in ${product.unitLabel}`}
                      className="w-full h-11 pl-3.5 pr-16 text-sm font-mono font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-medium text-slate-500">
                      {product.unitLabel}
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={containerCountInput}
                      onChange={(e) =>
                        setContainerCountInput(
                          Math.max(1, Number(e.target.value) || 1)
                        )
                      }
                      aria-label="Number of FCL containers"
                      className="w-full h-11 pl-3.5 pr-24 text-sm font-mono font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-medium text-slate-500">
                      × {containerSize} FCL
                    </span>
                  </div>
                )}

                {/* Quick Volume Presets */}
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {[1, 2, 5, 10].map((fcl) => {
                    const presetUnits = fcl * maxUnitsPerContainer;
                    return (
                      <button
                        key={fcl}
                        type="button"
                        onClick={() => {
                          if (inputMode === 'units') {
                            setTargetUnitsInput(presetUnits);
                          } else {
                            setContainerCountInput(fcl);
                          }
                        }}
                        className="px-2.5 py-1 text-xs font-mono text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {fcl} FCL ({presetUnits} {product.unitLabel})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Container Type Selector */}
              <div>
                <span className="block text-sm font-semibold text-slate-900 mb-2">
                  {t.calculator.containerLabel}
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['20ft', '40ft'] as ContainerSize[]).map((size) => {
                    const spec = CONTAINER_SPECS[size];
                    const active = containerSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleContainerSizeChange(size)}
                        className={`p-3 text-left rounded-lg border transition-colors cursor-pointer ${
                          active
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <div className="text-sm font-semibold whitespace-nowrap">
                          {size === '20ft' ? '20ft Standard' : '40ft High-Cube'}
                        </div>
                        <div
                          className={`text-xs font-mono tabular-nums mt-0.5 ${
                            active ? 'text-amber-400' : 'text-slate-500'
                          }`}
                        >
                          {spec.internalVolumeCbm} m³ · {(spec.maxPayloadKg / 1000).toFixed(1)} MT
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-500 font-mono">
                  {t.calculator.internalDims}: {containerInfo.dimensions}
                </p>
              </div>
            </div>

            {/* 3. Incoterms 2020 Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-900">
                  {t.calculator.incotermLabel}
                </span>
                <span className="text-xs text-slate-500">{t.calculator.iccRules}</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {INCOTERM_CODES.map((code) => {
                  const active = incoterm === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setIncoterm(code)}
                      className={`py-2.5 px-2 text-center rounded-lg border font-mono text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {code}
                    </button>
                  );
                })}
              </div>

              {/* Contractual Scope Explanation */}
              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 leading-relaxed space-y-1">
                    <div className="font-semibold text-slate-900">
                      {termInfo.code} — {termFr ? termFr.name : termInfo.name}
                    </div>
                    <p>{termFr ? termFr.description : termInfo.description}</p>
                    <div className="pt-1 flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                      <span>
                        {t.calculator.riskTransfer}:{' '}
                        {termFr ? termFr.riskTransfer : termInfo.riskTransfer}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {t.calculator.oceanFreight}:{' '}
                        {termInfo.freightIncluded
                          ? t.calculator.included
                          : t.calculator.buyerAccount}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {t.calculator.marineInsurance}:{' '}
                        {termInfo.insuranceIncluded
                          ? t.calculator.included
                          : t.calculator.buyerAccount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Live Quote & Container Utilization Output */}
          <div className="lg:col-span-5 bg-slate-900 text-white rounded-xl p-6 sm:p-8 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Calculator className="w-5 h-5 text-amber-400" />
                <h3 className="font-display text-lg font-semibold text-white">
                  {t.calculator.estimateTitle}
                </h3>
              </div>
              <span className="font-mono text-xs text-amber-400">
                {incoterm} · {containerSize.toUpperCase()} · {currency}
              </span>
            </div>

            {/* Primary Pricing Readout */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-400 mb-1">
                  {t.calculator.unitPriceLabel}
                </div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-white tabular-nums">
                  {calculation.fx.symbol}
                  {calculation.convertedUnitPrice.toLocaleString('en-US')}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {currency} / {product.unitLabel}
                  {calculation.volumeDiscountPct > 0 && (
                    <span className="text-emerald-400 ml-1.5">
                      (-{calculation.volumeDiscountPct}%)
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">
                  {t.calculator.totalValueLabel}
                </div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-amber-400 tabular-nums">
                  {calculation.fx.symbol}
                  {calculation.convertedTotal.toLocaleString('en-US')}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 tabular-nums">
                  {calculation.effectiveUnits.toLocaleString('en-US')} {product.unitLabel}
                </div>
              </div>
            </div>

            {/* Cost Structure Breakdown */}
            <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>
                  FOB {lang === 'fr' ? 'Origine' : 'Baseline'} ({calculation.effectiveUnits} {product.unitLabel})
                </span>
                <span className="font-mono tabular-nums">
                  ${calculation.discountedFobUsd.toLocaleString('en-US')} / {product.unitLabel}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>
                  {incoterm} {lang === 'fr' ? 'Ajustement Fret / Terme' : 'Term & Freight Adjustment'}
                </span>
                <span className="font-mono tabular-nums">
                  {calculation.termAdder >= 0 ? '+' : ''}
                  ${calculation.termAdder.toLocaleString('en-US')} / {product.unitLabel}
                </span>
              </div>
            </div>

            {/* Packaging & Container Allocation */}
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300 flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{t.calculator.containerAlloc}</span>
                </span>
                <span className="font-mono font-semibold text-white tabular-nums">
                  {calculation.containersNeeded} × {containerSize} FCL
                </span>
              </div>

              {/* Weight & Volume Utilization Progress Bars */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">
                      {t.calculator.payloadWeight} ({(calculation.totalWeightKg / 1000).toFixed(1)} MT {t.calculator.totalSuffix})
                    </span>
                    <span className="font-mono text-slate-200 tabular-nums">
                      {calculation.weightUtilizationPct}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-200"
                      style={{ width: `${calculation.weightUtilizationPct}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">
                      {t.calculator.cubicVolume} ({calculation.totalVolumeCbm.toFixed(1)} m³ {t.calculator.totalSuffix})
                    </span>
                    <span className="font-mono text-slate-200 tabular-nums">
                      {calculation.volumeUtilizationPct}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-200"
                      style={{ width: `${calculation.volumeUtilizationPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Packaging Breakdown */}
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs space-y-1.5">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">{t.calculator.packagingSpec}</span>
                  <span className="text-slate-200 font-medium text-right max-w-[60%]">
                    {productFr ? productFr.packaging : product.packaging}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">{t.calculator.unitPackages}</span>
                  <span className="font-mono text-white tabular-nums">
                    {calculation.packageCount.toLocaleString('en-US')} ({product.packageUnitWeightKg} kg)
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">{t.calculator.loadConstraint}</span>
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {calculation.limitingFactor}
                  </span>
                </div>
              </div>
            </div>

            {/* Deal Room & Manifest Actions */}
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={() => onTransferToDealRoom(currentPayload)}
                className="w-full py-3.5 px-5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-lg transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <span>{t.calculator.lockQuoteBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleAddManifestClick}
                className="w-full py-2.5 px-4 inline-flex items-center justify-center gap-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                {addedToManifest ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">
                      {t.calculator.addedManifestBtn}
                    </span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>{t.calculator.addManifestBtn}</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-400 text-center pt-1">
                {t.calculator.disclaimer}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
