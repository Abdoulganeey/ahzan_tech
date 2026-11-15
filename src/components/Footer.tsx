export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 py-12">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-slate-800/80">
          <div className="md:col-span-5 space-y-3">
            <div className="font-display text-lg font-bold text-white">
              Ahzan Tech Ltd
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md">
              Incorporating AhzanEmporium. Nigerian critical minerals sourcing, international agro-commodities export, and industrial wholesale supply.
            </p>
            <p className="font-mono text-xs text-slate-500">
              RC 2012723 · Mining Cadastre Licence No. 65197 EL
            </p>
          </div>

          <div className="md:col-span-3 space-y-2.5">
            <div className="text-xs font-semibold text-white">Navigation</div>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#catalog" className="hover:text-white transition-colors">
                  Commodity Catalog
                </a>
              </li>
              <li>
                <a href="#calculator" className="hover:text-white transition-colors">
                  Incoterms Calculator
                </a>
              </li>
              <li>
                <a href="#compliance" className="hover:text-white transition-colors">
                  Compliance Center
                </a>
              </li>
              <li>
                <a href="#leadership" className="hover:text-white transition-colors">
                  Executive Desk
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-2.5">
            <div className="text-xs font-semibold text-white">
              Direct Corporate Contact
            </div>
            <ul className="space-y-2 text-sm font-mono">
              <li>
                <a
                  href="mailto:ceo@ahzan.tech"
                  className="hover:text-amber-400 transition-colors"
                >
                  ceo@ahzan.tech
                </a>
              </li>
              <li>
                <a
                  href="mailto:abdoul@ahzantechltd.com"
                  className="hover:text-amber-400 transition-colors"
                >
                  abdoul@ahzantechltd.com
                </a>
              </li>
            </ul>
            <p className="text-xs text-slate-500 pt-1">
              Abdulganiyu Hamza, Founder &amp; CEO
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} Ahzan Tech Ltd (RC 2012723). All rights reserved.
          </p>
          <p>
            Incoterms® 2020 · SGS &amp; Bureau Veritas Pre-Shipment Verified
          </p>
        </div>
      </div>
    </footer>
  );
}
