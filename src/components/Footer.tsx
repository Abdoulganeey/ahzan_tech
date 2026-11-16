import { useLanguage } from '../i18n/LanguageContext';

export default function Footer() {
  const { lang, t } = useLanguage();

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 py-12">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-slate-800/80">
          <div className="md:col-span-5 space-y-3">
            <div className="inline-flex items-center gap-3">
              <img
                src="/assets/aistudio/IMG_2443_68d163ee.jpeg"
                alt="Ahzan Tech Ltd emblem"
                className="w-9 h-9 rounded-md bg-white p-0.5 object-contain shrink-0"
              />
              <div className="font-display text-lg font-bold text-white">
                Ahzan Tech Ltd
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md">
              {t.footer.summary}
            </p>
            <p className="font-mono text-xs text-slate-500">
              RC 2012723 · Mining Cadastre Licence No. 65197 EL · SCUML · FIRS TCC · NEPC
            </p>
          </div>

          <div className="md:col-span-3 space-y-2.5">
            <div className="text-xs font-semibold text-white">
              {t.footer.navHeading}
            </div>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#catalog" className="hover:text-white transition-colors">
                  {t.nav.catalog}
                </a>
              </li>
              <li>
                <a href="#price-lists" className="hover:text-white transition-colors">
                  {lang === 'fr' ? 'Tarifs 2026' : 'Price Lists 2026'}
                </a>
              </li>
              <li>
                <a href="#calculator" className="hover:text-white transition-colors">
                  {t.nav.calculator}
                </a>
              </li>
              <li>
                <a href="#verification" className="hover:text-white transition-colors">
                  {t.nav.verification}
                </a>
              </li>
              <li>
                <a href="#compliance" className="hover:text-white transition-colors">
                  {t.nav.compliance}
                </a>
              </li>
              <li>
                <a href="#leadership" className="hover:text-white transition-colors">
                  {lang === 'fr' ? 'Direction' : 'Executive Desk'}
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-2.5">
            <div className="text-xs font-semibold text-white">
              {t.footer.contactHeading}
            </div>
            <ul className="space-y-2 text-sm font-mono">
              <li>
                <a
                  href="mailto:abdoul@ahzantechltd.com"
                  className="hover:text-amber-400 transition-colors"
                >
                  abdoul@ahzantechltd.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+2349033524525"
                  className="hover:text-amber-400 transition-colors"
                >
                  +234 903 352 4525
                </a>
              </li>
            </ul>
            <p className="text-xs text-slate-500 pt-1">
              Abdulganiyu Hamza, Founder &amp; CEO · Kano State, Nigeria
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} Ahzan Tech Ltd (RC 2012723).{' '}
            {t.footer.rights}
          </p>
          <p>{t.footer.standards}</p>
        </div>
      </div>
    </footer>
  );
}
