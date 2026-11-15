import { useMemo, useState } from 'react';
import { ArrowRight, Calculator, CheckCircle2, Info, Package } from 'lucide-react';
import {
  COMMODITY_PRODUCTS,
  CONTAINER_SPECS,
  INCOTERMS_DATA,
  type CommodityProduct,
  type ContainerSize,
  type IncotermCode,
} from '../data/tradeData';

export interface CalculatorPrefill {
  productId: string;
  targetUnits: number;
  unitLabel: string;
  containerSize: ContainerSize;
  containersNeeded: number;
  incoterm: IncotermCode;
  estimatedUnitPriceUsd: number;
  estimatedTotalUsd: number;
}

interface IncotermsCalculatorProps {
  onTransferToDealRoom: (prefill: CalculatorPrefill) => void;
}

const INCOTERM_CODES: IncotermCode[] = ['EXW', 'FOB', 'CFR', 'CIF', 'DAP'];

export default function IncotermsCalculator({
  onTransferToDealRoom,
}: IncotermsCalculatorProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>(
    COMMODITY_PRODUCTS[0].id
  );
  const [inputMode, setInputMode] = useState<'units' | 'containers'>('units');
  const [targetUnitsInput, setTargetUnitsInput] = useState<number>(100);
  const [containerCountInput, setContainerCountInput] = useState<number>(4);
  const [containerSize, setContainerSize] = useState<ContainerSize>('20ft');
  const [incoterm, setIncoterm] = useState<IncotermCode>('FOB');

  const product: CommodityProduct = useMemo(
    () =>
      COMMODITY_PRODUCTS.find((p) => p.id === selectedProductId) ||
      COMMODITY_PRODUCTS[0],
    [selectedProductId]
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
    // Volume discount tier for large institutional orders
    const volumeDiscountFactor =
      safeUnits >= maxUnitsPerContainer * 10
        ? 0.96
        : safeUnits >= maxUnitsPerContainer * 4
          ? 0.98
          : 1.0;

    const baseDiscountedExw = Math.round(
      product.baseExwUsdPerUnit * volumeDiscountFactor
    );
    const termAdder = Math.round(
      term.surchargePerUnitUsd +
        baseDiscountedExw * term.freightMultiplierPct
    );
    const estimatedUnitPriceUsd = baseDiscountedExw + termAdder;
    const estimatedTotalUsd = estimatedUnitPriceUsd * safeUnits;

    // Last / average container utilization metrics
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

    const packageCount = Math.ceil(
      totalWeightKg / product.packageUnitWeightKg
    );

    return {
      effectiveUnits: safeUnits,
      containersNeeded,
      baseDiscountedExw,
      termAdder,
      estimatedUnitPriceUsd,
      estimatedTotalUsd,
      totalWeightKg,
      totalVolumeCbm,
      weightUtilizationPct,
      volumeUtilizationPct,
      packageCount,
      volumeDiscountPct: Math.round((1 - volumeDiscountFactor) * 100),
      limitingFactor:
        weightUtilizationPct >= volumeUtilizationPct
          ? 'Payload Weight Limit'
          : 'Cubic Volume Limit',
    };
  }, [
    inputMode,
    targetUnitsInput,
    containerCountInput,
    maxUnitsPerContainer,
    incoterm,
    product,
    containerSize,
  ]);

  const termInfo = INCOTERMS_DATA[incoterm];
  const containerInfo = CONTAINER_SPECS[containerSize];

  return (
    <section
      id="calculator"
      className="py-16 lg:py-24 bg-slate-50 border-b border-slate-200"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-10">
          <p className="text-sm font-semibold text-amber-700 mb-2">
            01. Trade Cost &amp; Container Engineering
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance mb-3">
            Incoterms 2020 Price &amp; FCL Container Calculator
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            Configure your commodity, target volume or container count, and delivery term to model indicative landed costs, packaging unit counts, and container payload utilization before issuing a formal RFQ.
          </p>
        </div>

        {/* Calculator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Panel: Configuration Inputs */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-7">
            {/* 1. Product Selector */}
            <div>
              <label
                htmlFor="calc-product-select"
                className="block text-sm font-semibold text-slate-900 mb-2"
              >
                Select Commodity or Industrial Line
              </label>
              <select
                id="calc-product-select"
                value={product.id}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full h-11 px-3.5 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
              >
                {COMMODITY_PRODUCTS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.category} — {item.shortName} (HS {item.hsCode})
                  </option>
                ))}
              </select>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>Origin: {product.origin}</span>
                <span aria-hidden="true">·</span>
                <span>{product.assayRef}</span>
                <span aria-hidden="true">·</span>
                <span>Max {maxUnitsPerContainer} {product.unitLabel}/{containerSize} FCL</span>
              </div>
            </div>

            {/* 2. Volume Mode + Container Size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-900">
                    Order Quantity Input
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
                      By {product.unitLabel}
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
                      By FCL
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
                  Container Equipment Size
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
                  Internal: {containerInfo.dimensions}
                </p>
              </div>
            </div>

            {/* 3. Incoterms 2020 Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-900">
                  Incoterms® 2020 Delivery Basis
                </span>
                <span className="text-xs text-slate-500">ICC Official Rules</span>
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
                      {termInfo.code} — {termInfo.name}
                    </div>
                    <p>{termInfo.description}</p>
                    <div className="pt-1 flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                      <span>Risk Transfer: {termInfo.riskTransfer}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Ocean Freight: {termInfo.freightIncluded ? 'Included' : 'Buyer Account'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Marine Insurance: {termInfo.insuranceIncluded ? 'Included' : 'Buyer Account'}
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
                  Indicative Proforma Estimate
                </h3>
              </div>
              <span className="font-mono text-xs text-amber-400">
                {incoterm} · {containerSize.toUpperCase()}
              </span>
            </div>

            {/* Primary Pricing Readout */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-400 mb-1">
                  Estimated Unit Price
                </div>
                <div className="font-mono text-2xl sm:text-3xl font-bold text-white tabular-nums">
                  ${calculation.estimatedUnitPriceUsd.toLocaleString('en-US')}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  USD per {product.unitLabel}
                  {calculation.volumeDiscountPct > 0 && (
                    <span className="text-emerald-400 ml-1.5">
                      (-{calculation.volumeDiscountPct}% tier)
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">
                  Estimated Total Value
                </div>
                <div className="font-mono text-2xl sm:text-3xl font-bold text-amber-400 tabular-nums">
                  ${calculation.estimatedTotalUsd.toLocaleString('en-US')}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 tabular-nums">
                  For {calculation.effectiveUnits.toLocaleString('en-US')} {product.unitLabel}
                </div>
              </div>
            </div>

            {/* Cost Structure Breakdown */}
            <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>EXW Commodity Base ({calculation.effectiveUnits} {product.unitLabel})</span>
                <span className="font-mono tabular-nums">
                  ${calculation.baseDiscountedExw.toLocaleString('en-US')} / {product.unitLabel}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>{incoterm} Export, Logistics &amp; Insurance Adder</span>
                <span className="font-mono tabular-nums">
                  +${calculation.termAdder.toLocaleString('en-US')} / {product.unitLabel}
                </span>
              </div>
            </div>

            {/* Packaging & Container Allocation */}
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300 flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Container Allocation</span>
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
                      Payload Weight ({(calculation.totalWeightKg / 1000).toFixed(1)} MT total)
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
                      Cubic Volume ({calculation.totalVolumeCbm.toFixed(1)} m³ total)
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
                <div className="flex justify-between">
                  <span className="text-slate-400">Packaging Specification</span>
                  <span className="text-slate-200 font-medium text-right max-w-[60%]">
                    {product.packaging}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimated Unit Packages</span>
                  <span className="font-mono text-white tabular-nums">
                    {calculation.packageCount.toLocaleString('en-US')} units ({product.packageUnitWeightKg} kg avg)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Governing Load Constraint</span>
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {calculation.limitingFactor}
                  </span>
                </div>
              </div>
            </div>

            {/* Transfer to Deal Room CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() =>
                  onTransferToDealRoom({
                    productId: product.id,
                    targetUnits: calculation.effectiveUnits,
                    unitLabel: product.unitLabel,
                    containerSize,
                    containersNeeded: calculation.containersNeeded,
                    incoterm,
                    estimatedUnitPriceUsd: calculation.estimatedUnitPriceUsd,
                    estimatedTotalUsd: calculation.estimatedTotalUsd,
                  })
                }
                className="w-full py-3.5 px-5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-lg transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <span>Lock Parameters &amp; Request Formal Proforma</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-2.5">
                Indicative pricing reflects current Nigerian export benchmarks; binding FCO issued upon LOI/KYC verification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
