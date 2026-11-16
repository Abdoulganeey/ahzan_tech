import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  FileDown,
  FileText,
  Loader2,
  PackagePlus,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import {
  ALL_SUPPLIER_SKUS,
  SUPPLIER_CATALOG_META,
  TOTAL_SUPPLIER_SKU_COUNT,
  type CatalogSkuItem,
} from '../../data/extendedCatalogs';
import { INCOTERMS_DATA, type IncotermCode } from '../../data/tradeData';
import {
  TRADE_DOCUMENT_META,
  type LithiumIntelRecord,
  type PriceCatalogKey,
  type TradeDocumentType,
} from '../../types/lithiumIntel';
import {
  exportInternationalTradeDocPdf,
  type TradeStudioLineItem,
} from '../../utils/pdfQuoteGenerator';

interface TradeDocumentStudioProps {
  initialLead?: LithiumIntelRecord | null;
  onConsumeLead?: () => void;
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

const DOC_TYPE_ORDER: TradeDocumentType[] = [
  'PRICE_LIST',
  'LOI',
  'MOU',
  'FCO',
  'PROFORMA_INVOICE',
  'SALES_CONTRACT',
  'MANDATE_NCNDA',
];

const CATALOG_KEYS: PriceCatalogKey[] = [
  'AGRO_FOOD',
  'FLYSAK_OILS',
  'APPLIANCES',
  'COOKWARE',
];

function generateDocRef(docType: TradeDocumentType): string {
  const prefix = TRADE_DOCUMENT_META[docType].prefix;
  return `${prefix}-${String(Date.now()).slice(-6)}`;
}

export default function TradeDocumentStudio({
  initialLead,
  onConsumeLead,
  onNotify,
  onError,
}: TradeDocumentStudioProps) {
  const {
    user,
    unifiedTradeBook,
    marketConfig,
    adminIssueTradeDocument,
  } = useBuyerAuth();

  const [docType, setDocType] = useState<TradeDocumentType>('FCO');
  const [referenceNo, setReferenceNo] = useState<string>(() => generateDocRef('FCO'));
  const [selectedRankId, setSelectedRankId] = useState<string>(
    initialLead ? String(initialLead.rankId) : ''
  );

  const [counterpartyCompany, setCounterpartyCompany] = useState(
    initialLead?.companyName || 'Global Battery & Commodity Partner'
  );
  const [counterpartyContact, setCounterpartyContact] = useState(
    initialLead?.decisionMaker || 'Procurement Director'
  );
  const [counterpartyEmail, setCounterpartyEmail] = useState(
    initialLead?.directEmail || initialLead?.generalEmail || 'trade@partner.com'
  );
  const [counterpartyLocation, setCounterpartyLocation] = useState(
    initialLead?.location || 'Rotterdam / Qingdao'
  );

  const [incoterm, setIncoterm] = useState<IncotermCode>('FOB');
  const [destinationPort, setDestinationPort] = useState(
    initialLead?.location || 'Qingdao / Rotterdam'
  );
  const [paymentTerms, setPaymentTerms] = useState(
    '100% Irrevocable L/C at Sight (UCP 600) or 30/70 T/T Escrow'
  );
  const [validityDays, setValidityDays] = useState(
    String(marketConfig.quoteValidityDays || 10)
  );
  const [fxNgn, setFxNgn] = useState(String(marketConfig.fxNgnPerUsd || 1390));
  const [fxXof, setFxXof] = useState(String(marketConfig.fxXofPerUsd || 584.46));
  const [marginPct, setMarginPct] = useState('0');
  const [customClauses, setCustomClauses] = useState('');

  // Active Document Line Items
  const [lines, setLines] = useState<TradeStudioLineItem[]>(() => {
    const unitPerMt = Number(
      (
        (marketConfig.lithiumRatePerPercentUsd || 207) *
        (marketConfig.lithiumAssayPct || 4.61)
      ).toFixed(2)
    );
    return [
      {
        sku: 'AZT-LI-65197',
        description: 'Nigerian Lithium-Bearing Ore (Spodumene / Lepidolite)',
        specification: `${marketConfig.lithiumAssayPct || 4.61}% Li2O · EL No. 65197 · Assays ZMGN057 & Q38625/H260715-164`,
        unitLabel: 'MT',
        quantity: initialLead?.estimatedTonnage || 500,
        unitUsd: unitPerMt,
      },
    ];
  });

  // Catalog Browser State (4 Catalogs / 1,024 SKUs)
  const [activeCatalog, setActiveCatalog] = useState<PriceCatalogKey>('AGRO_FOOD');
  const [skuSearch, setSkuSearch] = useState('');
  const [skuLimit, setSkuLimit] = useState(24);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [savingVault, setSavingVault] = useState(false);

  useEffect(() => {
    if (!initialLead) return;
    setSelectedRankId(String(initialLead.rankId));
    setCounterpartyCompany(initialLead.companyName);
    setCounterpartyContact(initialLead.decisionMaker);
    setCounterpartyEmail(initialLead.directEmail || initialLead.generalEmail || '');
    setCounterpartyLocation(initialLead.location);
    setDestinationPort(initialLead.location || 'Discharge Port TBA');
    if (initialLead.estimatedTonnage > 0) {
      setLines((prev) =>
        prev.map((l, idx) =>
          idx === 0 ? { ...l, quantity: initialLead.estimatedTonnage } : l
        )
      );
    }
    onConsumeLead?.();
  }, [initialLead, onConsumeLead]);

  const handleSelectCounterparty = (rankIdStr: string) => {
    setSelectedRankId(rankIdStr);
    const rankNum = Number(rankIdStr);
    const rec = unifiedTradeBook.find((r) => r.rankId === rankNum);
    if (!rec) return;
    setCounterpartyCompany(rec.companyName);
    setCounterpartyContact(rec.decisionMaker);
    setCounterpartyEmail(rec.directEmail || rec.generalEmail || '');
    setCounterpartyLocation(rec.location);
    setDestinationPort(rec.location);
  };

  const handleDocTypeChange = (nextType: TradeDocumentType) => {
    setDocType(nextType);
    setReferenceNo(generateDocRef(nextType));
  };

  const catalogItems = useMemo(() => {
    const list = ALL_SUPPLIER_SKUS[activeCatalog] || [];
    const q = skuSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.sku.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.spec.toLowerCase().includes(q)
    );
  }, [activeCatalog, skuSearch]);

  const handleAddSkuLine = (item: CatalogSkuItem) => {
    setLines((prev) => [
      ...prev,
      {
        sku: item.sku,
        description: item.name,
        specification: `${item.spec} · MOQ ${item.moq}`,
        unitLabel: item.unitLabel,
        quantity: 20,
        unitUsd: item.baseUsd,
      },
    ]);
    onNotify(`Added ${item.sku} (${item.name}) to document lines.`);
  };

  const handleAddLithiumPreset = () => {
    const unitPerMt = Number(
      (
        (marketConfig.lithiumRatePerPercentUsd || 207) *
        (marketConfig.lithiumAssayPct || 4.61)
      ).toFixed(2)
    );
    setLines((prev) => [
      ...prev,
      {
        sku: 'AZT-LI-65197',
        description: 'Nigerian Spodumene / Lepidolite Lithium Ore',
        specification: `${marketConfig.lithiumAssayPct || 4.61}% Li2O @ $${marketConfig.lithiumRatePerPercentUsd || 207}/% · EL No. 65197 (Jega LGA)`,
        unitLabel: 'MT',
        quantity: 500,
        unitUsd: unitPerMt,
      },
    ]);
  };

  const handleAddCustomLine = () => {
    setLines((prev) => [
      ...prev,
      {
        sku: `AZT-CUS-${prev.length + 1}`,
        description: 'Custom Sourcing / Industrial Commodity Line',
        specification: 'Factory-direct OEM inspection · SGS Certified',
        unitLabel: 'MT',
        quantity: 10,
        unitUsd: 1200,
      },
    ]);
  };

  const marginMult = 1 + (Number(marginPct) || 0) / 100;
  const computedTotalUsd = useMemo(
    () =>
      lines.reduce(
        (sum, l) => sum + Math.round(l.unitUsd * marginMult * l.quantity),
        0
      ),
    [lines, marginMult]
  );

  const handleExportPdf = async () => {
    if (lines.length === 0) {
      onError('Add at least one SKU or commodity line before generating a PDF.');
      return;
    }
    setExportingPdf(true);
    try {
      await exportInternationalTradeDocPdf({
        docType,
        referenceNo: referenceNo.trim() || generateDocRef(docType),
        counterpartyCompany: counterpartyCompany.trim() || 'Trade Counterparty',
        counterpartyContact: counterpartyContact.trim() || 'Procurement Desk',
        counterpartyEmail: counterpartyEmail.trim() || 'trade@partner.com',
        counterpartyLocation: counterpartyLocation.trim() || 'International',
        incoterm,
        paymentTerms: paymentTerms.trim(),
        destinationPort: destinationPort.trim(),
        validityDays: Math.max(1, Number(validityDays) || 10),
        fxNgnPerUsd: Math.max(1, Number(fxNgn) || 1390),
        fxXofPerUsd: Math.max(1, Number(fxXof) || 584.46),
        marginPct: Number(marginPct) || 0,
        lines,
        customClauses: customClauses.trim() || undefined,
      });
      onNotify(
        `Sealed ${TRADE_DOCUMENT_META[docType].label} (${referenceNo}) exported as PDF.`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'PDF generation failed.');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleSaveToVault = async () => {
    if (lines.length === 0) {
      onError('Add at least one line item before archiving to Vault.');
      return;
    }
    setSavingVault(true);
    try {
      const rankNum = Number(selectedRankId) || undefined;
      await adminIssueTradeDocument({
        buyerUid: user?.uid || 'admin',
        docCode: referenceNo,
        referenceNo,
        title: `${TRADE_DOCUMENT_META[docType].label} — ${counterpartyCompany}`,
        docType,
        rfqRefId: referenceNo,
        leadRankId: rankNum,
        counterpartyCompany,
        commodity: lines.map((l) => l.description).slice(0, 3).join('; '),
        issuer: 'Ahzan Tech Ltd · Executive Trade Desk',
        issuedDate: new Date().toISOString().slice(0, 10),
        status: 'Verified',
        incoterm,
        totalValue: computedTotalUsd,
        summaryText: `${lines.length} line item(s) totaling US$${computedTotalUsd.toLocaleString('en-US')} (${incoterm} ${destinationPort}). Validity: ${validityDays}d. EL 65197 / ZMGN057.`,
      });
      onNotify(`Issued & archived ${referenceNo} into Firestore tradeDocuments vault.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to save to tradeDocuments vault.');
    } finally {
      setSavingVault(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Studio Header & 7 Document Template Buttons */}
      <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>Price List &amp; International Trade Document Studio</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              4 Supplier Price Catalogs ({TOTAL_SUPPLIER_SKU_COUNT.toLocaleString()} SKUs) + 7 Sealed PDF Generators with Logo, CEO Signature, Stamp Seal &amp; Contact QR Codes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={exportingPdf}
              onClick={() => void handleExportPdf()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md cursor-pointer"
            >
              {exportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>Generate Sealed PDF</span>
            </button>

            <button
              type="button"
              disabled={savingVault}
              onClick={() => void handleSaveToVault()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
            >
              {savingVault ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Save &amp; Issue to Cloud Vault</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2 border-t border-slate-100">
          {DOC_TYPE_ORDER.map((dt) => {
            const meta = TRADE_DOCUMENT_META[dt];
            const active = docType === dt;
            return (
              <button
                key={dt}
                type="button"
                onClick={() => handleDocTypeChange(dt)}
                className={`p-2 text-left rounded-md border cursor-pointer transition-colors ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className={`font-mono text-[10px] ${active ? 'text-amber-400' : 'text-slate-500'}`}>
                  {meta.prefix}
                </div>
                <div className="text-xs font-semibold truncate mt-0.5">{meta.shortLabel}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split: Document Builder (Left 7 cols) + 1,024-SKU Catalog Picker (Right 5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Left: Counterparty, Commercial Controls & Line Items */}
        <div className="xl:col-span-7 space-y-4">
          <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Counterparty &amp; Incoterms® 2020 Parameters
              </span>
              <select
                value={selectedRankId}
                onChange={(e) => handleSelectCounterparty(e.target.value)}
                aria-label="Prefill from Trade Book"
                className="h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-md max-w-xs"
              >
                <option value="">Prefill Counterparty from 249+ Trade Book...</option>
                {unifiedTradeBook.map((r) => (
                  <option key={r.rankId} value={r.rankId}>
                    #{r.rankId} {r.companyName} ({r.location})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Document Reference #
                </label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Counterparty Company
                </label>
                <input
                  type="text"
                  value={counterpartyCompany}
                  onChange={(e) => setCounterpartyCompany(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Decision Maker
                </label>
                <input
                  type="text"
                  value={counterpartyContact}
                  onChange={(e) => setCounterpartyContact(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Counterparty Email
                </label>
                <input
                  type="email"
                  value={counterpartyEmail}
                  onChange={(e) => setCounterpartyEmail(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Incoterm 2020
                </label>
                <select
                  value={incoterm}
                  onChange={(e) => setIncoterm(e.target.value as IncotermCode)}
                  className="w-full h-8 px-2 text-xs bg-white border border-slate-300 rounded-md"
                >
                  {Object.values(INCOTERMS_DATA).map((inc) => (
                    <option key={inc.code} value={inc.code}>
                      {inc.code} — {inc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Destination Port / Hub
                </label>
                <input
                  type="text"
                  value={destinationPort}
                  onChange={(e) => setDestinationPort(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Margin Adjust (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={marginPct}
                  onChange={(e) => setMarginPct(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  FX NGN / USD
                </label>
                <input
                  type="number"
                  step="1"
                  value={fxNgn}
                  onChange={(e) => setFxNgn(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  FX XOF / USD
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={fxXof}
                  onChange={(e) => setFxXof(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Settlement / Payment Terms
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Validity (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs font-mono border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Special Contractual / Assay Clauses (Optional Override)
              </label>
              <textarea
                rows={2}
                value={customClauses}
                onChange={(e) => setCustomClauses(e.target.value)}
                placeholder="Defaults to MCO Licence EL No. 65197 (Jega LGA, Kebbi), Zuma Gani ZMGN057 & Foshan Ceramics Q38625/H260715-164 umpire clause."
                className="w-full p-2 text-xs border border-slate-300 rounded-md"
              />
            </div>
          </div>

          {/* Active Document Line Items Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-900">
                Document Line Items ({lines.length}) · Total: US$
                <span className="font-mono tabular-nums">
                  {computedTotalUsd.toLocaleString('en-US')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddLithiumPreset}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-amber-950 bg-amber-100 hover:bg-amber-200 rounded cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>4.61% Li2O Ore</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomLine}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Custom Line</span>
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {lines.map((line, idx) => (
                <div key={`${line.sku}-${idx}`} className="p-3 space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={line.sku}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, sku: e.target.value } : l))
                        )
                      }
                      className="sm:col-span-3 h-8 px-2 font-mono text-[11px] border border-slate-200 rounded"
                    />
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === idx ? { ...l, description: e.target.value } : l
                          )
                        )
                      }
                      className="sm:col-span-5 h-8 px-2 text-xs font-semibold border border-slate-200 rounded"
                    />
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === idx ? { ...l, quantity: Math.max(1, Number(e.target.value) || 1) } : l
                          )
                        )
                      }
                      className="sm:col-span-2 h-8 px-2 font-mono text-right border border-slate-200 rounded"
                    />
                    <div className="sm:col-span-2 flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitUsd}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l, i) =>
                              i === idx ? { ...l, unitUsd: Math.max(0, Number(e.target.value) || 0) } : l
                            )
                          )
                        }
                        className="w-full h-8 px-2 font-mono text-right border border-slate-200 rounded"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setLines((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                        title="Remove line"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={line.specification}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === idx ? { ...l, specification: e.target.value } : l
                        )
                      )
                    }
                    className="w-full h-7 px-2 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: 4-Catalog Supplier SKU Picker (1,024 SKUs) */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col max-h-[680px]">
          <div className="p-3.5 border-b border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <PackagePlus className="w-4 h-4 text-amber-600" />
                <span>4 Supplier Catalogs ({TOTAL_SUPPLIER_SKU_COUNT.toLocaleString()} SKUs)</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {CATALOG_KEYS.map((key) => {
                const meta = SUPPLIER_CATALOG_META[key];
                const active = activeCatalog === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setActiveCatalog(key);
                      setSkuLimit(24);
                    }}
                    className={`px-2.5 py-1.5 text-left text-[11px] font-semibold rounded border cursor-pointer truncate ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {key.replace('_', ' ')} ({meta.skuCount})
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={skuSearch}
                onChange={(e) => setSkuSearch(e.target.value)}
                placeholder={`Search ${SUPPLIER_CATALOG_META[activeCatalog].skuCount} SKUs...`}
                className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-md"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {catalogItems.slice(0, skuLimit).map((item) => (
              <div
                key={item.sku}
                className="p-3 hover:bg-slate-50 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-mono text-[10px] text-slate-500">
                    {item.sku} · {item.category}
                  </div>
                  <div className="font-semibold text-slate-900 truncate">{item.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{item.spec}</div>
                </div>
                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <div className="font-mono font-bold text-slate-900 tabular-nums">
                      ${item.baseUsd.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500">/ {item.unitLabel}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddSkuLine(item)}
                    className="px-2 py-1 text-[11px] font-semibold text-slate-900 bg-amber-100 hover:bg-amber-200 rounded cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>
            ))}
          </div>

          {catalogItems.length > skuLimit && (
            <div className="p-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                {skuLimit} of {catalogItems.length} shown
              </span>
              <button
                type="button"
                onClick={() => setSkuLimit((p) => p + 50)}
                className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-300 rounded cursor-pointer"
              >
                Show +50
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
