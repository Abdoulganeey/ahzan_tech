import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  COMMODITY_PRODUCTS,
  type CommodityProduct,
  type ProductCategory,
} from '../data/tradeData';
import { useLanguage } from '../i18n/LanguageContext';
import { CATEGORY_FR, PRODUCT_FR } from '../i18n/translations';

interface ProductCatalogProps {
  onSelectProductForQuote: (productId: string) => void;
  onAddToManifest: (productId: string) => void;
  manifestProductIds?: string[];
}

const CATEGORIES: ('All' | ProductCategory)[] = [
  'All',
  'Critical Minerals',
  'Agro-Commodities',
  'Automotive & Lubricants',
  'Solar & Electronics',
];

function ResilientProductImage({ product }: { product: CommodityProduct }) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <div className="w-full aspect-[4/3] bg-gradient-to-br from-slate-800 to-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <PackageCheck className="w-8 h-8 text-amber-400 mb-2" />
        <span className="font-display text-sm font-semibold text-white">
          {product.shortName}
        </span>
        <span className="font-mono text-xs text-slate-400 mt-1">
          HS {product.hsCode}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full aspect-[4/3] bg-slate-900 overflow-hidden">
      <img
        src={product.image}
        alt={product.name}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
      />
    </div>
  );
}

export default function ProductCatalog({
  onSelectProductForQuote,
  onAddToManifest,
  manifestProductIds = [],
}: ProductCatalogProps) {
  const { lang, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<'All' | ProductCategory>(
    'All'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleSpecs = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return COMMODITY_PRODUCTS.filter((item) => {
      const matchesCategory =
        activeCategory === 'All' || item.category === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      const fr = PRODUCT_FR[item.id];
      return (
        item.name.toLowerCase().includes(q) ||
        item.shortName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.hsCode.toLowerCase().includes(q) ||
        item.assayRef.toLowerCase().includes(q) ||
        item.gradeOrPurity.toLowerCase().includes(q) ||
        (fr ? fr.name.toLowerCase().includes(q) || fr.summary.toLowerCase().includes(q) : false)
      );
    });
  }, [activeCategory, searchQuery]);

  return (
    <section id="catalog" className="py-16 lg:py-24 bg-white border-b border-slate-200">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-amber-700 mb-2">
              {t.catalog.eyebrow}
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance mb-3">
              {t.catalog.title}
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              {t.catalog.subtitle}
            </p>
          </div>

          {/* Search Input */}
          <div className="w-full lg:w-80 shrink-0">
            <label htmlFor="catalog-search" className="sr-only">
              Filter catalog by commodity, HS code, or assay reference
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="catalog-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.catalog.searchPlaceholder}
                className="w-full h-11 pl-10 pr-4 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Interactive Category Filter Controls */}
        <div
          role="tablist"
          aria-label="Commodity Categories"
          className="flex items-center gap-1.5 p-1.5 bg-slate-100 border border-slate-200 rounded-lg overflow-x-auto mb-10"
        >
          {CATEGORIES.map((category) => {
            const isActive = activeCategory === category;
            const displayCategory =
              lang === 'fr'
                ? CATEGORY_FR[category] || category
                : category === 'All'
                  ? 'All Verticals'
                  : category;
            return (
              <button
                key={category}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {displayCategory}
              </button>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center border border-slate-200 rounded-xl bg-slate-50">
            <p className="text-base font-semibold text-slate-900">
              {t.catalog.emptyTitle}
            </p>
            <p className="text-sm text-slate-600 mt-1 mb-4">
              {t.catalog.emptyBody}
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('All');
                setSearchQuery('');
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            >
              {t.catalog.resetFilters}
            </button>
          </div>
        ) : (
          /* Product Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {filteredProducts.map((product) => {
              const isExpanded = Boolean(expandedIds[product.id]);
              const fr = lang === 'fr' ? PRODUCT_FR[product.id] : null;
              const categoryText =
                lang === 'fr' ? CATEGORY_FR[product.category] || product.category : product.category;

              return (
                <article
                  key={product.id}
                  className="group flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors duration-150"
                >
                  {/* Visual Asset */}
                  <ResilientProductImage product={product} />

                  {/* Card Body */}
                  <div className="p-6 flex flex-col flex-1">
                    {/* Clean Unboxed Metadata Line (Zero-Pill Discipline) */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-500 mb-2">
                      <span className="text-amber-700 font-semibold">
                        {categoryText}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">HS {product.hsCode}</span>
                      <span aria-hidden="true">·</span>
                      <span>{product.origin}</span>
                    </div>

                    <h3 className="font-display text-lg font-bold text-slate-900 leading-snug mb-2">
                      {fr ? fr.name : product.name}
                    </h3>

                    <p className="text-sm text-slate-600 leading-relaxed mb-5">
                      {fr ? fr.summary : product.summary}
                    </p>

                    {/* Structured Key Specs List */}
                    <dl className="border-t border-slate-200 pt-4 space-y-2.5 text-xs mb-5">
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500 shrink-0">{t.catalog.gradeLabel}</dt>
                        <dd className="font-medium text-slate-900 text-right">
                          {fr ? fr.gradeOrPurity : product.gradeOrPurity}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500 shrink-0">{t.catalog.assayLabel}</dt>
                        <dd className="font-mono text-slate-800 text-right">
                          {product.assayRef}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500 shrink-0">{t.catalog.packagingLabel}</dt>
                        <dd className="text-slate-800 text-right">
                          {fr ? fr.packaging : product.packaging}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500 shrink-0">{t.catalog.inspectionLabel}</dt>
                        <dd className="text-emerald-700 font-medium text-right inline-flex items-center justify-end gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>{product.inspectionStandard}</span>
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500 shrink-0">{t.catalog.minOrderLabel}</dt>
                        <dd className="font-mono text-slate-800 text-right tabular-nums">
                          {fr ? fr.minOrder : product.minOrder}
                        </dd>
                      </div>
                    </dl>

                    {/* Expandable Technical Assay Sheet */}
                    {isExpanded && (
                      <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="text-xs font-semibold text-slate-900 mb-2">
                          {t.catalog.techSheetTitle}
                        </div>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                          {product.technicalSpecs.map((spec) => (
                            <div key={spec.label}>
                              <dt className="text-slate-500">{spec.label}</dt>
                              <dd className="font-mono font-medium text-slate-900">
                                {spec.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )}

                    {/* Card Action Bar */}
                    <div className="mt-auto pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSpecs(product.id)}
                        aria-expanded={isExpanded}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 py-2 cursor-pointer whitespace-nowrap"
                      >
                        <span>
                          {isExpanded ? t.catalog.hideSpecs : t.catalog.showSpecs}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onAddToManifest(product.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                            manifestProductIds.includes(product.id)
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {manifestProductIds.includes(product.id) ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>{t.catalog.inManifest}</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>{t.catalog.addManifest}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectProductForQuote(product.id)}
                          className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-amber-500 hover:text-slate-950 rounded-md transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <span>{t.catalog.proformaBtn}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
