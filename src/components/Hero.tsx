import { ArrowRight, ShieldCheck } from 'lucide-react';

interface HeroProps {
  onOpenDealRoom: () => void;
}

const VERIFIED_METRICS = [
  {
    label: 'Corporate Registration',
    value: 'RC 2012723',
    detail: 'CAC Nigeria · Ahzan Tech Ltd & AhzanEmporium',
  },
  {
    label: 'Mining Tenure',
    value: 'Licence 65197 EL',
    detail: 'Nigeria Mining Cadastre Office Verified',
  },
  {
    label: 'Peak Lithium Assay',
    value: '4.61% Li2O',
    detail: 'Lab Reference ZMGN057 · Spodumene / Lepidolite',
  },
  {
    label: 'Pre-Shipment Protocol',
    value: 'SGS / Bureau Veritas',
    detail: 'Mandatory Port Assay & NESS Export Clearance',
  },
];

export default function Hero({ onOpenDealRoom }: HeroProps) {
  return (
    <section id="top" className="relative bg-slate-950 text-white overflow-hidden">
      {/* Background Architectural Port Image with Measured Scrim */}
      <div className="relative min-h-[580px] lg:min-h-[640px] flex items-center">
        <div className="absolute inset-0">
          <img
            src="/src/assets/images/hero_port_logistics_1794786070092.jpg"
            alt="International maritime container terminal and bulk mineral export port at golden hour"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/85 to-slate-950/45"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40"
          />
        </div>

        {/* Primary Hero Content */}
        <div className="relative z-10 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-medium tracking-wide text-amber-400 mb-4">
              Ahzan Tech Ltd · Incorporating AhzanEmporium · RC 2012723
            </p>

            <h1 className="font-display text-[clamp(2.25rem,4.2vw,3.75rem)] font-bold leading-[1.08] tracking-tight text-white text-balance mb-6">
              Direct Nigerian Critical Minerals, Agro-Commodities &amp; Industrial Supply
            </h1>

            <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-2xl mb-9">
              Contracted international sourcing from mine-gate and farm-gate across Nigeria to global refining and wholesale hubs. Backed by verified assay governance, SGS pre-shipment inspection, and Incoterms 2020 execution.
            </p>

            {/* Dual CTA Controls */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onOpenDealRoom}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm sm:text-base font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <span>Request a Trade Quote / Proforma</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#catalog"
                className="inline-flex items-center justify-center px-6 py-3.5 text-sm sm:text-base font-semibold text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-600 hover:border-slate-500 rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                Explore Our Catalog
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width 4-Column Verifiable Credentials Strip */}
      <div className="relative z-10 border-t border-slate-800 bg-slate-900/90">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
            {VERIFIED_METRICS.map((item) => (
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
