import { useMemo, useState } from 'react';
import {
  Bell,
  Check,
  Download,
  FileDown,
  FileSpreadsheet,
  Loader2,
  Plus,
} from 'lucide-react';
import {
  AGRO_PRICE_LIST_2026,
  LUBRICANT_PRICE_LIST_2026,
} from '../data/priceLists';
import { useBuyerAuth } from '../context/BuyerAuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { exportSchedulePdf } from '../utils/pdfQuoteGenerator';
import PriceAlertSubscription from './PriceAlertSubscription';

export interface CustomScheduleItem {
  productId: string;
  productName: string;
  volumeSummary: string;
  estimatedTotalUsd?: number;
}

interface PriceSchedulesSectionProps {
  onAddScheduleItemToManifest: (item: CustomScheduleItem) => void;
  manifestProductIds?: string[];
}

const LUBRICANT_GRADES = [
  'All',
  'SL 5W-30',
  'SL 5W-40',
  'SL 10W-40',
  'SL 15W-40',
  'CI-4 15W-40 (Diesel)',
  'SL 20W-50',
];

export default function PriceSchedulesSection({
  onAddScheduleItemToManifest,
  manifestProductIds = [],
}: PriceSchedulesSectionProps) {
  const { lang } = useLanguage();
  const { marketConfig } = useBuyerAuth();
  const [activeTab, setActiveTab] = useState<'minerals' | 'agro' | 'lubricants'>('minerals');
  const [lubricantGradeFilter, setLubricantGradeFilter] = useState('All');
  const [addedKey, setAddedKey] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const lithiumRate = marketConfig.lithiumRatePerPercentUsd;
  const lithiumAssay = marketConfig.lithiumAssayPct;
  const lithiumTiers = useMemo(
    () =>
      Array.from(new Set([3.5, 4.0, 4.5, lithiumAssay, 5.0, 5.5])).sort(
        (a, b) => a - b
      ),
    [lithiumAssay]
  );

  const filteredLubricants = useMemo(() => {
    if (lubricantGradeFilter === 'All') return LUBRICANT_PRICE_LIST_2026;
    return LUBRICANT_PRICE_LIST_2026.filter(
      (row) => row.grade === lubricantGradeFilter
    );
  }, [lubricantGradeFilter]);

  const handleQuickAdd = (key: string, item: CustomScheduleItem) => {
    onAddScheduleItemToManifest(item);
    setAddedKey(key);
    setTimeout(() => setAddedKey(null), 1500);
  };

  const handleExportSchedulePdf = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      await exportSchedulePdf(activeTab, lang, {
        lithiumRatePerPercentUsd: marketConfig.lithiumRatePerPercentUsd,
        lithiumAssayPct: marketConfig.lithiumAssayPct,
        agroIssueDate: marketConfig.agroIssueDate,
        lubricantIssueDate: marketConfig.lubricantIssueDate,
        quoteValidityDays: marketConfig.quoteValidityDays,
        fxNgnPerUsd: marketConfig.fxNgnPerUsd,
        fxXofPerUsd: marketConfig.fxXofPerUsd,
      });
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <section
      id="price-lists"
      className="py-16 lg:py-24 bg-white border-b border-slate-200"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header + Official PDF Downloads */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-amber-700 mb-2">
              {lang === 'fr'
                ? 'Barèmes Officiels 2026'
                : 'Official 2026 Rate Schedules'}
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance mb-3">
              {lang === 'fr'
                ? `Tarifs Officiels Lithium ($${lithiumRate}/%), Agro-Export & Lubrifiants`
                : `Official Lithium ($${lithiumRate}/%), Agro-Commodities & Lubricant Price Lists`}
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              {lang === 'fr'
                ? `Consultez nos tarifs contractuels directs : minerai de lithium à ${lithiumRate} $ par pourcent de Li2O, 18 commodités agroalimentaires FOB Lagos et 30 références de lubrifiants (USD, NGN, XOF).`
                : `Transparent origin-sourced pricing: lithium-bearing ore at $${lithiumRate} per 1% Li2O, 18 agro-commodities quoted FOB Lagos, and 30 API SL / CI-4 lubricant SKUs in USD, NGN, and XOF.`}
            </p>
            {marketConfig.adminNotice.trim().length > 0 && (
              <p className="mt-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md inline-block">
                {marketConfig.adminNotice}
              </p>
            )}
          </div>

          {/* Direct PDF Price List Downloads */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href="./assets/aistudio/Ahzan_Tech_Ltd_Price_List_26b8dc48.pdf"
              download="Ahzan_Tech_Ltd_Agro_Price_List_2026.pdf"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {lang === 'fr' ? 'PDF Agro-Export' : 'Agro Price List (PDF)'}
              </span>
            </a>

            <a
              href="./assets/aistudio/Ahzan_Tech_Lubricant_Official_Price_List_Kano_2026_ab828a2b.pdf"
              download="Ahzan_Tech_Lubricant_Price_List_Kano_2026.pdf"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {lang === 'fr'
                  ? 'PDF Lubrifiants Kano'
                  : 'Lubricants Price List (PDF)'}
              </span>
            </a>

            <button
              type="button"
              disabled={exportingPdf}
              onClick={() => void handleExportSchedulePdf()}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              {exportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>
                {exportingPdf
                  ? lang === 'fr'
                    ? 'Génération PDF...'
                    : 'Generating PDF...'
                  : lang === 'fr'
                    ? 'Exporter Barème en PDF Signé'
                    : 'Export Schedule Quote PDF'}
              </span>
            </button>

            <a
              href="#price-alert-subscription"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>
                {lang === 'fr' ? 'Alertes Prix' : 'Price Alerts'}
              </span>
            </a>
          </div>
        </div>

        {/* Interactive Schedule Tabs */}
        <div
          role="tablist"
          aria-label="Official Price Lists"
          className="inline-flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 border border-slate-200 rounded-lg mb-8"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'minerals'}
            onClick={() => setActiveTab('minerals')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'minerals'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            {lang === 'fr'
              ? `Minerais de Lithium ($${lithiumRate} / % Li2O)`
              : `Lithium Mineral ($${lithiumRate} / % Li2O)`}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'agro'}
            onClick={() => setActiveTab('agro')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'agro'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            {lang === 'fr'
              ? 'Agro-Commodités FOB Lagos (18)'
              : 'Agro-Commodities FOB Lagos (18)'}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'lubricants'}
            onClick={() => setActiveTab('lubricants')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'lubricants'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            {lang === 'fr'
              ? 'Lubrifiants API SL / CI-4 (30)'
              : 'Lubricants API SL / CI-4 (30)'}
          </button>
        </div>

        {/* Tab 1: Critical Minerals ($207 / % Li2O) */}
        {activeTab === 'minerals' && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <h3 className="font-display text-base font-bold text-white">
                    {lang === 'fr'
                      ? `Barème Minerai de Lithium (Spodumène / Lépidolite) — ${lithiumRate} USD / 1% Li2O`
                      : `Lithium Mineral Rate Schedule — US$${lithiumRate} per 1% Li2O per Metric Ton`}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Licence No. 65197 EL · Assay Ref ZMGN057 ({lithiumAssay.toFixed(2)}% Li2O) · SGS / Bureau Veritas Umpire Sampling
                  </p>
                </div>
              </div>
              <span className="font-mono text-sm font-bold text-amber-400 tabular-nums">
                ${lithiumRate.toFixed(2)} / 1% Li2O / MT
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Li2O Grade (%)</th>
                    <th className="py-3 px-4">Rate Formula</th>
                    <th className="py-3 px-4">FOB Price (USD / MT)</th>
                    <th className="py-3 px-4">20ft FCL (27 MT)</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {lithiumTiers.map((grade) => {
                    const pricePerMt = grade * lithiumRate;
                    const total20ft = pricePerMt * 27;
                    const isBenchmark = grade === lithiumAssay;
                    const rowKey = `li-${grade}`;
                    return (
                      <tr
                        key={grade}
                        className={isBenchmark ? 'bg-amber-50/70' : 'bg-white hover:bg-slate-50'}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 tabular-nums">
                          {grade.toFixed(2)}% Li2O
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600 tabular-nums">
                          {grade.toFixed(2)} × ${lithiumRate}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 tabular-nums">
                          US${pricePerMt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / MT
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700 tabular-nums">
                          US${Math.round(total20ft).toLocaleString('en-US')}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          {isBenchmark ? (
                            <span className="font-semibold text-emerald-700">
                              Assay Ref ZMGN057 (Verified Lot)
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              Pro-rata SGS Port Assay
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickAdd(rowKey, {
                                productId: `lithium-${grade}`,
                                productName: `Lithium Ore (${grade.toFixed(2)}% Li2O @ $${lithiumRate}/%)`,
                                volumeSummary: '54 MT (2 × 20ft FCL)',
                                estimatedTotalUsd: Math.round(pricePerMt * 54),
                              })
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-amber-500 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {addedKey === rowKey ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Added</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add to RFQ</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: 18 Agro-Commodities FOB Lagos */}
        {activeTab === 'agro' && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  {lang === 'fr'
                    ? 'Liste de Prix Officielle Agro-Commodités & Produits Alimentaires (FOB Lagos)'
                    : 'Official Agro-Commodities & Exported African Food Price List (FOB Lagos)'}
                </h3>
                <p className="text-xs text-slate-300">
                  Port of Loading: Apapa / Tin Can Island · Validity: {marketConfig.quoteValidityDays} Calendar Days · Lead Time: 15–25 Working Days · 70/30 Settlement
                </p>
              </div>
              <span className="font-mono text-xs text-amber-400">
                Issue Date: {marketConfig.agroIssueDate}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-3">No.</th>
                    <th className="py-3 px-4">Commodity / Food Item</th>
                    <th className="py-3 px-4">Export Grade &amp; Quality Spec</th>
                    <th className="py-3 px-4">Package</th>
                    <th className="py-3 px-4">FOB Lagos</th>
                    <th className="py-3 px-4">MOQ</th>
                    <th className="py-3 px-4">20ft FCL Load</th>
                    <th className="py-3 px-4">20ft Amount</th>
                    <th className="py-3 px-4 text-right">RFQ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                  {AGRO_PRICE_LIST_2026.map((row) => {
                    const rowKey = `agro-${row.no}`;
                    const productKey = `agro-sku-${row.no}`;
                    const inList = manifestProductIds.includes(productKey);
                    return (
                      <tr key={row.no} className="bg-white hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono text-xs text-slate-500 tabular-nums">
                          {row.no}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {row.commodity}
                          <div className="text-[11px] font-normal text-slate-500">
                            {row.categoryGroup}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 max-w-xs">
                          {row.spec}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                          {row.package}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap tabular-nums">
                          US${row.fobUsdPerUnit.toLocaleString('en-US', {
                            minimumFractionDigits: row.unit === 'Ctn' ? 2 : 0,
                          })}{' '}
                          / {row.unit}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap tabular-nums">
                          {row.moq}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap tabular-nums">
                          {row.loadPer20ft}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-emerald-700 whitespace-nowrap tabular-nums">
                          US${row.amountPer20ftUsd.toLocaleString('en-US')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickAdd(rowKey, {
                                productId: productKey,
                                productName: row.commodity,
                                volumeSummary: `${row.loadPer20ft} (1 × 20ft FCL)`,
                                estimatedTotalUsd: row.amountPer20ftUsd,
                              })
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                              addedKey === rowKey || inList
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 hover:bg-amber-500 text-slate-900'
                            }`}
                          >
                            {addedKey === rowKey || inList ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Added</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: 30 Lubricant SKUs (USD / NGN / XOF) */}
        {activeTab === 'lubricants' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {LUBRICANT_GRADES.map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setLubricantGradeFilter(grade)}
                  className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                    lubricantGradeFilter === grade
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-base font-bold text-white">
                    {lang === 'fr'
                      ? 'Barème Officiel Lubrifiants Kano 2026 (USD · NGN · XOF CFA)'
                      : 'Official Kano 2026 Lubricant Price Schedule (USD · NGN · XOF CFA)'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    EXW Factory / FOB Nansha &amp; Shanghai · FX Benchmark: 1 USD = ₦{marketConfig.fxNgnPerUsd.toLocaleString('en-US')} | 1 USD = {marketConfig.fxXofPerUsd} XOF · 30/70 T/T
                  </p>
                </div>
                <span className="font-mono text-xs text-amber-400">
                  Issue Date: {marketConfig.lubricantIssueDate}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-4">Viscosity Grade</th>
                      <th className="py-3 px-4">Pack Size</th>
                      <th className="py-3 px-4">Packaging</th>
                      <th className="py-3 px-4">Unit Price (USD)</th>
                      <th className="py-3 px-4">Approx. NGN (₦)</th>
                      <th className="py-3 px-4">Approx. XOF (CFA)</th>
                      <th className="py-3 px-4 text-right">RFQ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                    {filteredLubricants.map((row) => {
                      const rowKey = `lube-${row.grade}-${row.packSize}`;
                      const productKey = `lube-sku-${row.grade}-${row.packSize}`;
                      const inList = manifestProductIds.includes(productKey);
                      return (
                        <tr key={rowKey} className="bg-white hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {row.grade}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-700 whitespace-nowrap">
                            {row.packSize}
                          </td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {row.packaging}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap tabular-nums">
                            ${row.usd.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap tabular-nums">
                            ₦{row.ngn.toLocaleString('en-US')}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap tabular-nums">
                            {row.xof.toLocaleString('en-US')} CFA
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                handleQuickAdd(rowKey, {
                                  productId: productKey,
                                  productName: `${row.grade} (${row.packSize} · ${row.packaging})`,
                                  volumeSummary:
                                    row.packSize === '200L'
                                      ? '80 Drums (1 × 20ft FCL)'
                                      : row.packSize === '20L'
                                        ? '756 Barrels (1 × 20ft FCL)'
                                        : '1 × 20ft FCL Container',
                                  estimatedTotalUsd:
                                    row.packSize === '200L'
                                      ? Math.round(row.usd * 80)
                                      : row.packSize === '20L'
                                        ? Math.round(row.usd * 756)
                                        : undefined,
                                })
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                                addedKey === rowKey || inList
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 hover:bg-amber-500 text-slate-900'
                              }`}
                            >
                              {addedKey === rowKey || inList ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Added</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Commodity Price Fluctuation Alert Subscription */}
        <PriceAlertSubscription activeScheduleTab={activeTab} />
      </div>
    </section>
  );
}
