import {
  Anchor,
  Building2,
  CheckCircle2,
  FileCheck2,
  Landmark,
  Microscope,
} from 'lucide-react';
import { TRADE_CORRIDORS } from '../data/tradeData';
import { useLanguage } from '../i18n/LanguageContext';

const COMPLIANCE_PILLARS = [
  {
    icon: FileCheck2,
    code: 'MCO 65197 EL · NEPC',
    title: 'Statutory Mining & Export Licensing',
    titleFr: 'Licences Minières & Agrément Export',
    body: 'Operations are backed by active Nigeria Mining Cadastre Office Exploration Licence No. 65197 EL, Nigerian Export Promotion Council (NEPC) Export Licence, and CAC incorporation RC 2012723.',
    bodyFr:
      'Les opérations reposent sur la Licence d’Exploration 65197 EL du Cadastre Minier du Nigeria, la Licence d’Exportation NEPC et l’immatriculation CAC RC 2012723.',
    facts: [
      'Mining Cadastre Tenure: 65197 EL',
      'Corporate Registry: RC 2012723',
      'NEPC Export Licence & Form NXP Active',
    ],
    factsFr: [
      'Titre Cadastre Minier : 65197 EL',
      'Registre des Sociétés : RC 2012723',
      'Licence Export NEPC & Form NXP Actifs',
    ],
  },
  {
    icon: Microscope,
    code: 'ASSAY ZMGN057',
    title: 'Independent Third-Party Inspection',
    titleFr: 'Inspection Indépendante par Tiers',
    body: 'Zero shipment leaves Nigerian terminals without independent sampling, moisture verification, and geochemical assay by buyer-nominated inspection agencies including SGS, Bureau Veritas, or Intertek.',
    bodyFr:
      'Aucune expédition ne quitte les terminaux nigérians sans échantillonnage indépendant, contrôle d’humidité et analyse par SGS, Bureau Veritas ou Intertek.',
    facts: [
      'ICP-OES & XRF Mineral Assaying',
      'EU MRL & NAQS Phytosanitary Certs',
      'Pre-Loading Weight & Seal Witnessing',
    ],
    factsFr: [
      'Analyses Minérales ICP-OES & XRF',
      'Certificats Phytosanitaires NAQS & LMR UE',
      'Pesage & Scellage Conteneurs Supervisés',
    ],
  },
  {
    icon: Landmark,
    code: 'SCUML · FIRS TCC · UCP 600',
    title: 'AML, Tax Clearance & Trade Finance',
    titleFr: 'LCB/FT, Quitus Fiscal & Financement',
    body: 'Full statutory standing with EFCC SCUML (AML/CFT compliance) and current FIRS Tax Clearance Certificate (TCC), supporting Irrevocable Letters of Credit (L/C) at sight, CAD, and milestone T/T.',
    bodyFr:
      'Conformité réglementaire complète EFCC SCUML (LCB/FT) et Quitus Fiscal FIRS TCC à jour, acceptant les Crédits Documentaires irrévocables à vue (L/C), CAD et T/T.',
    facts: [
      'EFCC SCUML AML/CFT Registered',
      'FIRS Tax Clearance Certificate (TCC)',
      'Irrevocable L/C at Sight (UCP 600)',
    ],
    factsFr: [
      'Enregistrement EFCC SCUML (LCB/FT)',
      'Certificat Fiscal FIRS TCC Valide',
      'Crédit Documentaire à Vue (UCP 600)',
    ],
  },
];

const CORRIDORS_FR: Record<string, { region: string; focus: string }> = {
  'West Africa Origin Hubs': {
    region: 'Pôles d’Origine Afrique de l’Ouest',
    focus:
      'Consolidation bord-carreau, inspection NESS, scellage SGS et dédouanement export.',
  },
  'East Asia Refining & Processing': {
    region: 'Raffinage & Transformation Asie de l’Est',
    focus:
      'Livraisons de spodumène/lépidolite de lithium et corridors conteneurs sésame blanc.',
  },
  'European & Mediterranean Ports': {
    region: 'Ports Européens & Méditerranéens',
    focus:
      'Gingembre séché, hibiscus et concentrés minéraux conformes aux normes LMR de l’UE.',
  },
  'MENA & Pan-African Wholesale': {
    region: 'Distribution Gros MENA & Panafricaine',
    focus:
      'Pièces automobiles, lubrifiants et kits solaires commerciaux AhzanEmporium.',
  },
};

export default function ComplianceCenter() {
  const { lang, t } = useLanguage();

  return (
    <section
      id="compliance"
      className="py-16 lg:py-24 bg-slate-900 text-white border-b border-slate-800"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <p className="text-sm font-semibold text-amber-400 mb-2">
            {t.compliance.eyebrow}
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance mb-3">
            {t.compliance.title}
          </h2>
          <p className="text-base text-slate-300 leading-relaxed">
            {t.compliance.subtitle}
          </p>
        </div>

        {/* 3 Compliance Pillars */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {COMPLIANCE_PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            const facts = lang === 'fr' ? pillar.factsFr : pillar.facts;
            return (
              <div
                key={pillar.code}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-6 sm:p-7 flex flex-col"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs font-medium text-emerald-400">
                    {pillar.code}
                  </span>
                </div>

                <h3 className="font-display text-xl font-semibold text-white mb-2.5">
                  {lang === 'fr' ? pillar.titleFr : pillar.title}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-6">
                  {lang === 'fr' ? pillar.bodyFr : pillar.body}
                </p>

                <ul className="mt-auto pt-4 border-t border-slate-800 space-y-2 text-xs text-slate-200">
                  {facts.map((fact) => (
                    <li key={fact} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Global Logistics Corridors Matrix */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <Anchor className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <h3 className="font-display text-lg font-semibold text-white">
                  {t.compliance.corridorsTitle}
                </h3>
                <p className="text-xs text-slate-400">
                  {t.compliance.corridorsSubtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{t.compliance.exportHub}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
            {TRADE_CORRIDORS.map((corridor) => {
              const frCorridor =
                lang === 'fr' ? CORRIDORS_FR[corridor.region] : null;
              return (
                <div key={corridor.region} className="space-y-1.5">
                  <div className="text-sm font-semibold text-white">
                    {frCorridor ? frCorridor.region : corridor.region}
                  </div>
                  <div className="font-mono text-xs text-amber-400 leading-relaxed">
                    {corridor.ports}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed pt-1">
                    {frCorridor ? frCorridor.focus : corridor.focus}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
