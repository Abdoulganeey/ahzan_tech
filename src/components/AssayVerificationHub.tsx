import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FlaskConical,
  Search,
  Ship,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface VerificationRecord {
  queryKeys: string[];
  code: string;
  category: string;
  categoryFr: string;
  title: string;
  titleFr: string;
  issuer: string;
  status: string;
  statusFr: string;
  dateIssued: string;
  dateIssuedFr: string;
  summary: string;
  summaryFr: string;
  metrics: { label: string; value: string }[];
}

const VERIFICATION_DATABASE: VerificationRecord[] = [
  {
    queryKeys: ['ZMGN057', 'LITHIUM', 'LI2O', 'SPODUMENE'],
    code: 'ZMGN057',
    category: 'Geochemical Lab Assay',
    categoryFr: 'Analyse Géochimique Labo',
    title: 'Nigerian Spodumene / Lepidolite Ore Assay Certificate',
    titleFr: 'Certificat d’Analyse Spodumène / Lépidolite du Nigeria',
    issuer: 'Accredited ICP-OES & XRF Geochemical Laboratory',
    status: 'Verified · 4.61% Li2O Peak Grade',
    statusFr: 'Vérifié · Teneur Record 4,61% Li2O',
    dateIssued: 'Batch Verified 2026',
    dateIssuedFr: 'Lot Vérifié 2026',
    summary:
      'Representative composite sample crushed from Nasarawa / Kwara pegmatite belt under Licence No. 65197 EL, meeting battery-grade converter feedstock threshold.',
    summaryFr:
      'Échantillon composite représentatif concassé issu de la ceinture pegmatitique de Nasarawa / Kwara sous Licence 65197 EL, conforme aux seuils de conversion batterie.',
    metrics: [
      { label: 'Li2O (Lithium Oxide)', value: '4.61%' },
      { label: 'Contract Rate', value: '$207 / 1% Li2O' },
      { label: 'FOB Value (4.61%)', value: '$954.27 / MT' },
      { label: 'Fe2O3 (Iron Oxide)', value: '1.12%' },
      { label: 'Moisture (As-Received)', value: '1.45%' },
      { label: 'Umpire Protocol', value: 'SGS / Bureau Veritas' },
    ],
  },
  {
    queryKeys: ['65197 EL', '65197', 'MCO', 'MINING'],
    code: 'Licence 65197 EL',
    category: 'Mining Tenure Verification',
    categoryFr: 'Vérification Titre Minier',
    title: 'Nigeria Mining Cadastre Exploration Licence (EL)',
    titleFr: 'Permis d’Exploration du Cadastre Minier du Nigeria (EL)',
    issuer: 'Nigeria Mining Cadastre Office (MCO), Abuja',
    status: 'Active · Good Standing',
    statusFr: 'Actif · En Règle',
    dateIssued: 'Current Statutory Tenure',
    dateIssuedFr: 'Titre Légal en Vigueur',
    summary:
      'Statutory mineral exploration title authorizing legal extraction, pit sampling, haulage, and commercial export aggregation of lithium-bearing pegmatite ores.',
    summaryFr:
      'Titre minier légal autorisant l’échantillonnage, le transport et l’agrégation export de minerais de pegmatite lithinifère.',
    metrics: [
      { label: 'Title Reference', value: '65197 EL' },
      { label: 'Beneficial Operator', value: 'Ahzan Tech Ltd' },
      { label: 'Corporate Reg', value: 'RC 2012723' },
      { label: 'Primary Minerals', value: 'Spodumene / Lepidolite' },
      { label: 'Royalty Compliance', value: 'Federal Mines Dept Cleared' },
      { label: 'Export Gate', value: 'NESS / NEPC Approved' },
    ],
  },
  {
    queryKeys: ['RC 2012723', '2012723', 'CAC', 'SCUML', 'TCC', 'NEPC'],
    code: 'RC 2012723',
    category: 'Corporate & Statutory Dossier',
    categoryFr: 'Dossier Légal & Corporatif',
    title: 'CAC Incorporation, SCUML, FIRS Tax TCC & NEPC Export Bundle',
    titleFr: 'Dossier CAC, SCUML, Quitus Fiscal FIRS & Licence Export NEPC',
    issuer: 'CAC · EFCC SCUML · FIRS · NEPC',
    status: 'Verified · All 4 Clearances Active',
    statusFr: 'Vérifié · 4 Agréments Actifs',
    dateIssued: 'Current Fiscal Year 2026',
    dateIssuedFr: 'Exercice Fiscal 2026',
    summary:
      'Complete Nigerian corporate and anti-money laundering compliance stack required by international confirming banks for UCP 600 Letters of Credit.',
    summaryFr:
      'Dossier complet de conformité corporative et anti-blanchiment exigé par les banques confirmatrices internationales pour les crédits documentaires UCP 600.',
    metrics: [
      { label: 'CAC Registration', value: 'RC 2012723 (Active)' },
      { label: 'Trading Division', value: 'AhzanEmporium' },
      { label: 'AML / CFT', value: 'EFCC SCUML Registered' },
      { label: 'Tax Status', value: 'FIRS TCC Cleared' },
      { label: 'Export Permit', value: 'NEPC Exporter Active' },
      { label: 'Principal Signatory', value: 'Abdulganiyu Hamza, CEO' },
    ],
  },
  {
    queryKeys: ['AHT-AG-019', 'SESAME', 'AGRO'],
    code: 'AHT-AG-019',
    category: 'Agro-Commodity Quality Cert',
    categoryFr: 'Certificat Qualité Agro-Commodité',
    title: 'Hulled & Natural White Sesame Seeds Quality Report',
    titleFr: 'Rapport Qualité Graines de Sésame Blanc Naturelles & Décortiquées',
    issuer: 'SGS / NAQS Phytosanitary Laboratory',
    status: 'Verified · 99.95% Sortex Grade',
    statusFr: 'Vérifié · Grade Sortex 99,95%',
    dateIssued: '2026 Harvest Lot',
    dateIssuedFr: 'Récolte 2026',
    summary:
      'Optical-sorted white sesame lot tested for oil content, free fatty acids, salmonella absence, and EU/Asia import phytosanitary compliance.',
    summaryFr:
      'Lot de sésame blanc trié optiquement, analysé pour sa teneur en huile, acidité libre, absence de salmonelle et conformité phytosanitaire UE/Asie.',
    metrics: [
      { label: 'Purity', value: '99.95% Min' },
      { label: 'Oil Content', value: '51.4%' },
      { label: 'Moisture', value: '5.2%' },
      { label: 'FFA (Oleic)', value: '1.1%' },
      { label: 'Admixture', value: '0.04%' },
      { label: 'Phytosanitary', value: 'NAQS + SGS Sealed' },
    ],
  },
  {
    queryKeys: ['AHT-AG-042', 'GINGER', 'HIBISCUS'],
    code: 'AHT-AG-042',
    category: 'Agro-Commodity Quality Cert',
    categoryFr: 'Certificat Qualité Agro-Commodité',
    title: 'Sun-Dried Split Ginger & Hibiscus MRL & Oil Assay',
    titleFr: 'Analyse LMR & Huile Essentielle Gingembre Séché & Hibiscus',
    issuer: 'Intertek / NAQS Export Inspection',
    status: 'Verified · EU MRL Compliant',
    statusFr: 'Vérifié · Conforme LMR UE',
    dateIssued: '2026 Export Crop',
    dateIssuedFr: 'Campagne Export 2026',
    summary:
      'High-pungency Nigerian split ginger and whole hibiscus calyces cleared for European and Middle Eastern food & beverage processing.',
    summaryFr:
      'Gingembre coupé séché à haute teneur aromatique et calices d’hibiscus entiers conformes aux normes alimentaires européennes et du Moyen-Orient.',
    metrics: [
      { label: 'Volatile Oil', value: '2.55% Min' },
      { label: 'Moisture', value: '8.9%' },
      { label: 'Foreign Matter', value: '0.6%' },
      { label: 'Pesticide MRL', value: 'EU Reg 396/2005 Pass' },
      { label: 'Fumigation', value: 'Phosphine Certified' },
      { label: 'Packaging', value: '25 kg Breathable PP' },
    ],
  },
];

interface ExecutionStage {
  step: string;
  title: string;
  titleFr: string;
  sla: string;
  slaFr: string;
  owner: string;
  ownerFr: string;
  summary: string;
  summaryFr: string;
  documents: string[];
  documentsFr: string[];
}

const EXECUTION_STAGES: ExecutionStage[] = [
  {
    step: '01',
    title: 'LOI, KYC & Assay Review',
    titleFr: 'LOI, KYC & Revue des Analyses',
    sla: 'Day 1 – 2',
    slaFr: 'Jours 1 – 2',
    owner: 'Buyer & Ahzan Tech Desk',
    ownerFr: 'Acheteur & Bureau Ahzan Tech',
    summary:
      'Buyer submits corporate Letter of Intent (LOI) or B2B Deal Room RFQ specifying commodity grade, target tonnage, Incoterms 2020, and destination port.',
    summaryFr:
      'L’acheteur soumet une Lettre d’Intention (LOI) ou une demande Deal Room précisant la qualité, le tonnage cible, l’Incoterm 2020 et le port de destination.',
    documents: [
      'Buyer Corporate Profile / LOI',
      'Ref ZMGN057 / Product Assay Sheet',
      'RC 2012723 & Licence 65197 EL Pack',
    ],
    documentsFr: [
      'Profil Entreprise / Lettre d’Intention (LOI)',
      'Réf. ZMGN057 / Fiche d’Analyse Produit',
      'Dossier RC 2012723 & Licence 65197 EL',
    ],
  },
  {
    step: '02',
    title: 'FCO & Sales Contract (SPA)',
    titleFr: 'Offre Ferme (FCO) & Contrat (SPA)',
    sla: 'Day 3 – 5',
    slaFr: 'Jours 3 – 5',
    owner: 'Executive Signatory',
    ownerFr: 'Signataire Principal',
    summary:
      'Ahzan Tech Ltd issues binding Full Corporate Offer (FCO) and Sales & Purchase Agreement detailing penalty/bonus grade tolerances and inspection terms.',
    summaryFr:
      'Ahzan Tech Ltd émet l’Offre Corporative Ferme (FCO) et le Contrat de Vente détaillant les tolérances de teneur et les protocoles d’inspection.',
    documents: [
      'Signed Proforma Invoice / FCO',
      'Sales & Purchase Agreement (SPA)',
      'SCUML & FIRS TCC Banking Pack',
    ],
    documentsFr: [
      'Facture Proforma Signée / FCO',
      'Contrat d’Achat et de Vente (SPA)',
      'Dossier Bancaire SCUML & Quitus FIRS TCC',
    ],
  },
  {
    step: '03',
    title: 'L/C Opening or T/T Escrow',
    titleFr: 'Ouverture L/C ou Séquestre T/T',
    sla: 'Day 6 – 10',
    slaFr: 'Jours 6 – 10',
    owner: 'Buyer Issuing Bank',
    ownerFr: 'Banque Émettrice Acheteur',
    summary:
      'Buyer opens Irrevocable L/C at sight (UCP 600) or executes agreed T/T deposit / CAD arrangement; Nigerian Form NXP export registration is lodged.',
    summaryFr:
      'L’acheteur émet le Crédit Documentaire irrévocable à vue (UCP 600) ou exécute l’acompte T/T / CAD convenu ; le formulaire export Form NXP est enregistré.',
    documents: [
      'SWIFT MT700 L/C Draft Approval',
      'CBN / Commercial Bank Form NXP',
      'NEPC Export Licence Confirmation',
    ],
    documentsFr: [
      'Approbation Brouillon SWIFT MT700',
      'Formulaire Export CBN Form NXP',
      'Confirmation Licence Export NEPC',
    ],
  },
  {
    step: '04',
    title: 'Port Stuffing & SGS Assay',
    titleFr: 'Empotage Portuaire & Analyse SGS',
    sla: 'Day 11 – 18',
    slaFr: 'Jours 11 – 18',
    owner: 'SGS / Bureau Veritas',
    ownerFr: 'SGS / Bureau Veritas',
    summary:
      'Cargo is transported to Apapa, Tin Can, or Onne terminal. Independent inspectors witness container stuffing, draw composite samples, and seal boxes.',
    summaryFr:
      'La cargaison est acheminée vers Apapa, Tin Can ou Onne. Les inspecteurs indépendants supervisent l’empotage, prélèvent les échantillons et posent les scellés.',
    documents: [
      'SGS / BV Certificate of Weight & Quality',
      'NESS Clean Certificate of Inspection',
      'NAQS Phytosanitary / Fumigation Cert',
    ],
    documentsFr: [
      'Certificat de Poids et Qualité SGS / BV',
      'Certificat d’Inspection Propre NESS',
      'Certificat Phytosanitaire NAQS & Fumigation',
    ],
  },
  {
    step: '05',
    title: 'Vessel Sailing & Settlement',
    titleFr: 'Appareillage & Règlement Bancaire',
    sla: 'Day 19 – 24',
    slaFr: 'Jours 19 – 24',
    owner: 'Shipping Line & Banks',
    ownerFr: 'Compagnie Maritime & Banques',
    summary:
      'Clean On-Board Bill of Lading is issued upon vessel departure; full shipping dossier is presented through banking channels for immediate L/C negotiation.',
    summaryFr:
      'Le Connaissement maritime net à bord est émis au départ du navire ; le jeu complet des documents est présenté en banque pour négociation immédiate de la L/C.',
    documents: [
      '3/3 Original Clean On-Board B/L',
      'Commercial Invoice & Packing List',
      'Chamber of Commerce Certificate of Origin',
    ],
    documentsFr: [
      '3/3 Originaux Connaissement Net à Bord',
      'Facture Commerciale & Liste de Colisage',
      'Certificat d’Origine Chambre de Commerce',
    ],
  },
];

export default function AssayVerificationHub() {
  const { lang, t } = useLanguage();
  const [lookupInput, setLookupInput] = useState('ZMGN057');
  const [activeStageIdx, setActiveStageIdx] = useState(0);

  const matchedRecord = useMemo(() => {
    const q = lookupInput.trim().toUpperCase();
    if (!q) return VERIFICATION_DATABASE[0];
    return (
      VERIFICATION_DATABASE.find(
        (rec) =>
          rec.code.toUpperCase().includes(q) ||
          rec.queryKeys.some((k) => k.includes(q) || q.includes(k))
      ) || null
    );
  }, [lookupInput]);

  const activeStage = EXECUTION_STAGES[activeStageIdx];

  return (
    <section
      id="verification"
      className="py-16 lg:py-24 bg-slate-50 border-b border-slate-200"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-10">
          <p className="text-sm font-semibold text-amber-700 mb-2">
            {t.verification.eyebrow}
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance mb-3">
            {t.verification.title}
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            {t.verification.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Panel: Interactive Assay & Registry Verifier */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-2.5">
              <FileSearch className="w-5 h-5 text-amber-600 shrink-0" />
              <h3 className="font-display text-xl font-bold text-slate-900">
                {t.verification.lookupTitle}
              </h3>
            </div>

            <div>
              <label
                htmlFor="assay-lookup-input"
                className="block text-xs font-semibold text-slate-700 mb-2"
              >
                {t.verification.lookupLabel}
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="assay-lookup-input"
                  type="text"
                  value={lookupInput}
                  onChange={(e) => setLookupInput(e.target.value)}
                  placeholder={t.verification.lookupPlaceholder}
                  className="w-full h-11 pl-10 pr-4 text-sm font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Quick Lookup Presets */}
              <div className="mt-3 flex flex-wrap gap-2">
                {VERIFICATION_DATABASE.map((rec) => {
                  const active = matchedRecord?.code === rec.code;
                  return (
                    <button
                      key={rec.code}
                      type="button"
                      onClick={() => setLookupInput(rec.code)}
                      className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {rec.code}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Verification Result Display */}
            {matchedRecord ? (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-200">
                  <div>
                    <div className="text-xs font-medium text-amber-700">
                      {lang === 'fr' ? matchedRecord.categoryFr : matchedRecord.category} ·{' '}
                      {lang === 'fr' ? matchedRecord.dateIssuedFr : matchedRecord.dateIssued}
                    </div>
                    <h4 className="font-display text-base font-bold text-slate-900 mt-0.5">
                      {lang === 'fr' ? matchedRecord.titleFr : matchedRecord.title}
                    </h4>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {t.verification.issuedBy}: {matchedRecord.issuer}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {lang === 'fr' ? matchedRecord.statusFr : matchedRecord.status}
                    </span>
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {lang === 'fr' ? matchedRecord.summaryFr : matchedRecord.summary}
                </p>

                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  {matchedRecord.metrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="p-2.5 bg-white border border-slate-200 rounded-lg"
                    >
                      <dt className="text-[11px] text-slate-500 truncate">
                        {metric.label}
                      </dt>
                      <dd className="font-mono text-xs font-semibold text-slate-900 mt-0.5 tabular-nums">
                        {metric.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
                <FlaskConical className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-sm font-semibold text-slate-900">
                  {t.verification.noMatchTitle}
                </p>
                <p className="text-xs text-slate-600">
                  {t.verification.noMatchBody}
                </p>
              </div>
            )}
          </div>

          {/* Right Panel: Interactive 5-Stage Export & L/C Execution Protocol */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Ship className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="font-display text-xl font-bold text-slate-900">
                  {t.verification.timelineTitle}
                </h3>
              </div>
              <span className="font-mono text-xs text-slate-500 whitespace-nowrap">
                {t.verification.typicalDuration}
              </span>
            </div>

            {/* Interactive Stage Selector */}
            <div className="grid grid-cols-5 gap-1.5">
              {EXECUTION_STAGES.map((stage, idx) => {
                const isActive = idx === activeStageIdx;
                const stageTitle = lang === 'fr' ? stage.titleFr : stage.title;
                return (
                  <button
                    key={stage.step}
                    type="button"
                    onClick={() => setActiveStageIdx(idx)}
                    className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div
                      className={`font-mono text-[11px] font-semibold ${
                        isActive ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    >
                      {t.verification.stagePrefix} {stage.step}
                    </div>
                    <div className="text-xs font-semibold truncate mt-0.5">
                      {stageTitle.split(' ')[0]}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Stage Details */}
            <div className="p-5 bg-slate-900 text-white rounded-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <span className="font-mono text-xs text-amber-400">
                    {t.verification.stagePrefix} {activeStage.step} ·{' '}
                    {lang === 'fr' ? activeStage.slaFr : activeStage.sla}
                  </span>
                  <h4 className="font-display text-lg font-bold text-white mt-0.5">
                    {lang === 'fr' ? activeStage.titleFr : activeStage.title}
                  </h4>
                </div>
                <span className="text-xs text-slate-300 font-medium">
                  {t.verification.leadPrefix}:{' '}
                  {lang === 'fr' ? activeStage.ownerFr : activeStage.owner}
                </span>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                {lang === 'fr' ? activeStage.summaryFr : activeStage.summary}
              </p>

              <div className="pt-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-2.5">
                  <ClipboardCheck className="w-4 h-4 shrink-0" />
                  <span>{t.verification.deliverablesHeading}</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-200">
                  {(lang === 'fr'
                    ? activeStage.documentsFr
                    : activeStage.documents
                  ).map((doc) => (
                    <li
                      key={doc}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Stage Navigation Controls */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() =>
                  setActiveStageIdx((prev) => Math.max(0, prev - 1))
                }
                disabled={activeStageIdx === 0}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-md transition-colors cursor-pointer"
              >
                {t.verification.prevStage}
              </button>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {activeStageIdx + 1} / {EXECUTION_STAGES.length}
              </span>
              <button
                type="button"
                onClick={() =>
                  setActiveStageIdx((prev) =>
                    Math.min(EXECUTION_STAGES.length - 1, prev + 1)
                  )
                }
                disabled={activeStageIdx === EXECUTION_STAGES.length - 1}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-md transition-colors cursor-pointer"
              >
                {t.verification.nextStage}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
