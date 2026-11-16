export type Language = 'en' | 'fr';

export const PRODUCT_FR: Record<
  string,
  { name: string; shortName: string; summary: string; packaging: string; minOrder: string; gradeOrPurity: string }
> = {
  'lithium-spodumene-lepidolite': {
    name: 'Minerai de Lithium Nigérian (Spodumène / Lépidolite)',
    shortName: 'Minerai de Lithium (4,61% Li2O)',
    summary:
      'Approvisionnement direct bord-carreau de minerai de spodumène et lépidolite à haute teneur sous permis minier actif 65197 EL, préparé pour le raffinage chimique.',
    packaging: 'Big-Bags PP anti-UV de 1 000 kg / 1 250 kg',
    minOrder: '50 MT (2 × 20ft FCL essai) · Jusqu’à 5 000 MT/mois',
    gradeOrPurity: '4,61% Li2O Certifié (Plage 3,8%–4,8%)',
  },
  'tantalite-coltan-ore': {
    name: 'Concentré Industriel de Tantalite et Niobium',
    shortName: 'Minerai de Tantalite (Ta2O5 28%+)',
    summary:
      'Concentré de tantalite traçable et sans conflit, enrichi par séparation gravimétrique et contrôlé pour une faible radioactivité avant exportation.',
    packaging: 'Fûts acier scellés 50 kg sur palettes ISPM-15',
    minOrder: 'Lot d’essai 5 MT',
    gradeOrPurity: '28%–35% Ta2O5 / Nb2O5 Co-produit',
  },
  'hulled-white-sesame': {
    name: 'Graines de Sésame Blanc Naturelles & Décortiquées du Nigeria',
    shortName: 'Sésame Blanc (99,9%)',
    summary:
      'Graines de sésame blanc triées optiquement (Sortex), prisées par les transformateurs agroalimentaires d’Europe, du Moyen-Orient et d’Asie pour leur rendement en huile.',
    packaging: 'Sacs PP tissés neufs de 25 kg / 50 kg',
    minOrder: '19 MT (1 × 20ft FCL)',
    gradeOrPurity: '99,95% Tri Sortex (Teneur en huile ≥ 50%)',
  },
  'dried-split-ginger-hibiscus': {
    name: 'Gingembre Séché Coupé & Calices d’Hibiscus Entiers',
    shortName: 'Gingembre Séché & Hibiscus',
    summary:
      'Gingembre nigérian à forte teneur en oléorésine et fleurs d’hibiscus séchées au soleil, conformes aux limites maximales de résidus (LMR) de l’UE.',
    packaging: 'Sacs export PP respirants de 25 kg / 40 kg',
    minOrder: '14 MT (1 × 20ft FCL) ou 26 MT (40ft HC)',
    gradeOrPurity: 'Grade ASTA Propre · Huile volatile ≥ 2,2%',
  },
  'raw-cashew-soybeans': {
    name: 'Noix de Cajou Brutes (RCN) & Soja Non-OGM',
    shortName: 'Cajou Brut & Soja',
    summary:
      'Noix de cajou brutes à rendement vérifié (KOR) et soja nigérian non-OGM de qualité alimentaire ou fourragère emballés en sacs jute ou polypropylène.',
    packaging: 'Sacs jute 80 kg (Cajou) / Sacs PP 50 kg (Soja)',
    minOrder: '18 MT (1 × 20ft FCL)',
    gradeOrPurity: 'KOR 47–49 lbs/80kg · Calibre 180–200 noix/kg',
  },
  'heavy-duty-auto-lubricants': {
    name: 'Pièces Automobiles Poids Lourds & Lubrifiants Synthétiques',
    shortName: 'Pièces Auto & Lubrifiants',
    summary:
      'Fourniture en gros de disques de frein, ensembles de filtration hydraulique et lubrifiants diesel/hydrauliques API distribués en Afrique de l’Ouest et de l’Est.',
    packaging: 'Cartons export & fûts acier 20L/208L sur palettes Euro',
    minOrder: '10 Palettes (FCL partiel) · 20ft / 40ft FCL',
    gradeOrPurity: 'API CK-4 / ISO VG 46 · Norme OEM',
  },
  'commercial-solar-inverter-kits': {
    name: 'Panneaux Solaires PV Commerciaux, Onduleurs Hybrides & LiFePO4',
    shortName: 'Kits Solaires & Onduleurs (10kVA)',
    summary:
      'Kits énergétiques clés en main associant panneaux monocristallins Tier-1, onduleurs hybrides MPPT et batteries LiFePO4 longue durée pour télécoms et PME.',
    packaging: 'Caisses export antichoc & palettes antistatiques',
    minOrder: '6 Kits (20ft FCL) · 18 Kits (40ft HC)',
    gradeOrPurity: 'Mono PERC N-Type 580W + Hybride 10kVA + 15kWh LiFePO4',
  },
};

export const CATEGORY_FR: Record<string, string> = {
  All: 'Toutes les filières',
  'Critical Minerals': 'Minerais critiques',
  'Agro-Commodities': 'Agro-commodités',
  'Automotive & Lubricants': 'Automobile & Lubrifiants',
  'Solar & Electronics': 'Solaire & Électronique',
};

export const INCOTERM_DESC_FR: Record<
  string,
  { name: string; riskTransfer: string; description: string }
> = {
  EXW: {
    name: 'Départ Usine / Carreau (Mine / Entrepôt)',
    riskTransfer: 'Entrepôt ou carreau minier d’origine, Nigeria',
    description:
      'L’acheteur assume le transport terrestre intérieur, le dédouanement export nigérian, la manutention portuaire et le fret maritime.',
  },
  FOB: {
    name: 'Franco à Bord (Apapa / Tin Can / Onne)',
    riskTransfer: 'Chargé à bord du navire au port nigérian',
    description:
      'Ahzan Tech Ltd prend en charge le transport intérieur, l’inspection SGS/BV, la procédure NESS et le chargement à bord.',
  },
  CFR: {
    name: 'Coût et Fret (Port de destination)',
    riskTransfer: 'À bord du navire au port d’embarquement (fret payé)',
    description:
      'Inclut la mise à FOB au port d’origine plus le fret maritime conteneurisé jusqu’au port désigné par l’acheteur.',
  },
  CIF: {
    name: 'Coût, Assurance et Fret',
    riskTransfer: 'À bord du navire au port d’embarquement (assuré)',
    description:
      'Couverture export complète : inspection à l’origine, douane, fret maritime et assurance facultés maritimes Clauses (A).',
  },
  DAP: {
    name: 'Rendu au Lieu de Destination (Terminal intérieur)',
    riskTransfer: 'Prêt au déchargement au terminal convenu',
    description:
      'Livraison jusqu’au hub intérieur convenu (droits d’importation et dédouanement à destination à la charge de l’acheteur).',
  },
};

export const COMPLIANCE_BADGE_FR: Record<
  string,
  { shortLabel: string; statusLabel: string; scopeSummary: string }
> = {
  rc: {
    shortLabel: 'Registre du Commerce (CAC)',
    statusLabel: 'Actif · Vérifié',
    scopeSummary:
      'Société à responsabilité limitée enregistrée en règle, intégrant la division commerciale AhzanEmporium.',
  },
  'mining-licence': {
    shortLabel: 'Cadastre Minier (MCO)',
    statusLabel: 'Permis Actif',
    scopeSummary:
      'Permis d’exploration minière actif couvrant les gisements vérifiés de spodumène et lépidolite lithinifères.',
  },
  scuml: {
    shortLabel: 'Conformité LCB / FT (SCUML)',
    statusLabel: 'Conforme',
    scopeSummary:
      'Certification anti-blanchiment et financement du terrorisme délivrée par l’EFCC SCUML.',
  },
  tcc: {
    shortLabel: 'Quitus Fiscal (FIRS TCC)',
    statusLabel: 'À jour',
    scopeSummary:
      'Certificat de régularité fiscale fédérale requis pour le règlement par crédit documentaire (L/C) et l’exportation.',
  },
  'export-licence': {
    shortLabel: 'Licence d’Exportation (NEPC)',
    statusLabel: 'Permis Actif',
    scopeSummary:
      'Agrément d’exportateur hors-pétrole permettant l’enregistrement Form NXP et l’expédition portuaire NESS.',
  },
};

export const TRANSLATIONS = {
  en: {
    nav: {
      catalog: 'Catalog',
      calculator: 'Calculator',
      verification: 'Verification',
      compliance: 'Compliance',
      contact: 'Contact',
      requestQuote: 'Request Quote',
    },
    hero: {
      kicker: 'Ahzan Tech Ltd · Incorporating AhzanEmporium · RC 2012723',
      headline:
        'Direct Nigerian Critical Minerals, Agro-Commodities & Industrial Supply',
      subcopy:
        'Contracted international sourcing from mine-gate and farm-gate across Nigeria to global refining and wholesale hubs. Backed by verified assay governance, SGS pre-shipment inspection, and Incoterms 2020 execution.',
      ctaPrimary: 'Request a Trade Quote / Proforma',
      ctaSecondary: 'Explore Our Catalog',
      verifiedCompliance: 'Verified Compliance',
      syncing: 'Synchronizing statutory registry...',
      verifyBtn: 'Verify',
      viewDossier: 'View Full Compliance Dossier',
      metrics: [
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
      ],
    },
    calculator: {
      eyebrow: '01. Trade Cost & Container Engineering',
      title: 'Incoterms 2020 Price & FCL Container Calculator',
      subtitle:
        'Configure commodity tonnage, FCL equipment, delivery term, and settlement currency to model landed costs and container utilization before issuing a formal RFQ.',
      currencyLabel: 'Settlement Currency',
      commodityLabel: 'Commodity or Industrial Line',
      corridorLabel: 'Target Port Corridor',
      originPrefix: 'Origin',
      transitPrefix: 'Transit Est',
      quantityLabel: 'Order Quantity Input',
      byFcl: 'By FCL',
      byUnit: 'By',
      containerLabel: 'Container Equipment Size',
      internalDims: 'Internal',
      incotermLabel: 'Incoterms® 2020 Delivery Basis',
      iccRules: 'ICC Official Rules',
      riskTransfer: 'Risk Transfer',
      oceanFreight: 'Ocean Freight',
      marineInsurance: 'Marine Insurance',
      included: 'Included',
      buyerAccount: 'Buyer Account',
      estimateTitle: 'Indicative Proforma Estimate',
      unitPriceLabel: 'Estimated Unit Price',
      totalValueLabel: 'Estimated Total Value',
      exwBase: 'EXW Commodity Base',
      adderLabel: 'Export, Logistics & Insurance Adder',
      containerAlloc: 'Container Allocation',
      payloadWeight: 'Payload Weight',
      cubicVolume: 'Cubic Volume',
      totalSuffix: 'total',
      packagingSpec: 'Packaging Specification',
      unitPackages: 'Estimated Unit Packages',
      loadConstraint: 'Governing Load Constraint',
      lockQuoteBtn: 'Lock Parameters & Request Formal Proforma',
      addManifestBtn: 'Add Line to Combined RFQ Manifest',
      addedManifestBtn: 'Added to Multi-Line RFQ Manifest',
      disclaimer:
        'Indicative FX & Incoterms benchmarks; binding FCO issued upon LOI/KYC verification.',
    },
    catalog: {
      eyebrow: '02. Export & Wholesale Portfolio',
      title: 'Verified Commodities & Industrial Supply Catalog',
      subtitle:
        'Every export lot is backed by documented chain-of-custody, export-grade packaging, and mandatory SGS or Bureau Veritas pre-shipment verification.',
      searchPlaceholder: 'Search lithium, sesame, ZMGN057...',
      emptyTitle: 'No matching commodities found',
      emptyBody: 'Try clearing your search query or switching to All Verticals.',
      resetFilters: 'Reset Filters',
      gradeLabel: 'Grade / Purity',
      assayLabel: 'Assay / Cert Ref',
      packagingLabel: 'Packaging',
      inspectionLabel: 'Inspection',
      minOrderLabel: 'Min Order / Lead',
      techSheetTitle: 'Technical Specification Sheet',
      hideSpecs: 'Hide Specs',
      showSpecs: 'Assay Specs',
      inManifest: 'In Manifest',
      addManifest: 'Manifest',
      proformaBtn: 'Proforma',
    },
    verification: {
      eyebrow: '03. Assay Lookup & Trade Execution',
      title: 'Live Assay Verification & L/C Execution Protocol',
      subtitle:
        'Inspect our geochemical assay benchmarks, verify statutory Nigerian export registrations, and review the 5-stage bankable delivery workflow from LOI to Bill of Lading.',
      lookupTitle: 'Assay & Certificate Lookup',
      lookupLabel: 'Enter Assay Ref, Licence No, or Compliance Code',
      lookupPlaceholder: 'e.g. ZMGN057, 65197 EL, RC 2012723, AHT-AG-019...',
      issuedBy: 'Issued by',
      noMatchTitle: 'No matching reference in public index',
      noMatchBody:
        'Select a quick reference above (such as ZMGN057 or 65197 EL) or request batch-specific SGS dossiers via the Deal Room.',
      timelineTitle: 'Export & L/C Execution Timeline',
      typicalDuration: '19–24 Days Typical',
      stagePrefix: 'Stage',
      leadPrefix: 'Lead',
      deliverablesHeading: 'Required Stage Deliverables & Trade Documents',
      prevStage: 'Previous Stage',
      nextStage: 'Next Stage',
    },
    compliance: {
      eyebrow: '04. Global Compliance & Trust Center',
      title: 'Verifiable Governance from Origin Mine-Gate to Discharge Port',
      subtitle:
        'International commodity buyers require transparent title documentation, independent assay chains, and bank-grade settlement certainty before committing vessel space.',
      corridorsTitle: 'Active Maritime & Wholesale Logistics Corridors',
      corridorsSubtitle:
        'Direct containerised FCL & break-bulk routing across Europe, Asia, MENA, and Africa',
      exportHub: 'Export Hub: Lagos & Port Harcourt, Nigeria',
    },
    leadership: {
      eyebrow: '05. Executive Leadership & Governance',
      title: 'Accountable Principal Oversight on Every Contract',
      subtitle:
        'Ahzan Tech Ltd (incorporating AhzanEmporium, RC 2012723) operates with direct executive accountability from initial Letter of Intent through final SGS port release and Bill of Lading handover.',
      signatoryBadge: 'Principal Signatory',
      role: 'Founder & Chief Executive Officer · Ahzan Tech Ltd & AhzanEmporium',
      bio: 'Overseeing mineral tenure compliance (Licence No. 65197 EL), Nigerian agro-export aggregation, and cross-border wholesale distribution across West Africa, Europe, and East Asia.',
      corpEntity: 'Corporate Entity',
      tradingDiv: 'Trading Division',
      deskTitle: 'Direct Executive Desk & Trade Channels',
      deskSubtitle:
        'Engage directly with our executive trade desk for Full Corporate Offers (FCO), assay verification dossiers, or wholesale distribution partnerships.',
      execEmailLabel: 'Executive Office & Mineral Offtake',
      tradeEmailLabel: 'International Trade & Wholesale Desk',
      copyBtn: 'Copy',
      copiedBtn: 'Copied',
      hqTitle: 'Corporate Headquarters & Export Coordination',
      hqAddress: 'Abuja & Lagos Trade Corridors, Federal Republic of Nigeria',
      hqPorts: 'Port Dispatch Terminals: Apapa Wharf · Tin Can Island · Onne Port',
      whatsappBtn: 'WhatsApp Business',
      dealRoomBtn: 'Open B2B Deal Room',
    },
    dealRoom: {
      title: 'B2B Deal Room — RFQ & Letter of Intent',
      subtitle: 'Ahzan Tech Ltd (RC 2012723) · Formal Proforma & FCO Desk',
      tabForm: 'RFQ / LOI Submission',
      tabHistory: 'Saved Dossiers',
      emptyHistory: 'No RFQ dossiers have been logged in this browser session yet.',
      manifestTitle: 'Combined RFQ Manifest',
      clearManifest: 'Clear Manifest',
      companyLabel: 'Buyer Company Name *',
      contactLabel: 'Authorized Representative *',
      emailLabel: 'Corporate Email *',
      portLabel: 'Destination Port / Country *',
      productLabel: 'Target Commodity / Product Line',
      volumeLabel: 'Target Volume *',
      incotermLabel: 'Incoterms 2020',
      paymentLabel: 'Payment Instrument',
      specsLabel: 'Custom Assay, Packaging, or Inspection Requirements',
      specsPlaceholder:
        'Specify Li2O cutoff grade, moisture tolerance, SGS/BV inspection port, or custom OEM packaging...',
      footerNote: 'Direct submission to Executive Trade Desk · RC 2012723',
      cancelBtn: 'Cancel',
      submitBtn: 'Submit RFQ / LOI',
      successTitle: 'RFQ / LOI Dossier Logged Successfully',
      successBody1: 'Your trade inquiry has been assigned reference',
      successBody2:
        'Our executive desk (ceo@ahzan.tech) issues formal Soft Corporate Offers (SCO) / Proforma Invoices within 24 business hours.',
      refIdLabel: 'Reference ID',
      buyerEntityLabel: 'Buyer Entity',
      commodityScopeLabel: 'Commodity Scope',
      volumeIncotermLabel: 'Volume & Incoterm',
      settlementLabel: 'Settlement Preference',
      copySummaryBtn: 'Copy Summary',
      downloadBtn: 'Download Dossier (.txt)',
      newInquiryBtn: 'New Inquiry',
      doneBtn: 'Done',
    },
    footer: {
      summary:
        'Incorporating AhzanEmporium. Nigerian critical minerals sourcing, international agro-commodities export, and industrial wholesale supply.',
      navHeading: 'Navigation',
      contactHeading: 'Direct Corporate Contact',
      rights: 'All rights reserved.',
      standards: 'Incoterms® 2020 · SGS & Bureau Veritas Pre-Shipment Verified',
    },
  },
  fr: {
    nav: {
      catalog: 'Catalogue',
      calculator: 'Calculateur',
      verification: 'Vérification',
      compliance: 'Conformité',
      contact: 'Contact',
      requestQuote: 'Demander un devis',
    },
    hero: {
      kicker: 'Ahzan Tech Ltd · Intégrant AhzanEmporium · RC 2012723',
      headline:
        'Minerais Critiques, Agro-Commodités & Fourniture Industrielle du Nigeria',
      subcopy:
        'Approvisionnement contractuel direct bord-carreau et bord-champ au Nigeria vers les pôles de raffinage et de gros mondiaux. Gouvernance par analyses certifiées, inspection SGS avant embarquement et exécution Incoterms 2020.',
      ctaPrimary: 'Demander un Devis / Proforma',
      ctaSecondary: 'Explorer le Catalogue',
      verifiedCompliance: 'Conformité Vérifiée',
      syncing: 'Synchronisation du registre légal...',
      verifyBtn: 'Vérifier',
      viewDossier: 'Voir le Dossier de Conformité Complet',
      metrics: [
        {
          label: 'Registre des Sociétés',
          value: 'RC 2012723',
          detail: 'CAC Nigeria · Ahzan Tech Ltd & AhzanEmporium',
        },
        {
          label: 'Titre Minier',
          value: 'Licence 65197 EL',
          detail: 'Vérifié par le Cadastre Minier du Nigeria',
        },
        {
          label: 'Teneur Lithium Record',
          value: '4,61% Li2O',
          detail: 'Réf. Labo ZMGN057 · Spodumène / Lépidolite',
        },
        {
          label: 'Protocole Avant Embarquement',
          value: 'SGS / Bureau Veritas',
          detail: 'Analyse portuaire obligatoire & agrément NESS',
        },
      ],
    },
    calculator: {
      eyebrow: '01. Ingénierie Tarifaire & Conteneurisation',
      title: 'Calculateur de Prix Incoterms 2020 & Conteneurs FCL',
      subtitle:
        'Configurez votre produit, le tonnage cible ou le nombre de conteneurs, l’Incoterm et la devise de règlement pour modéliser les coûts rendus avant d’émettre une demande de cotation.',
      currencyLabel: 'Devise de règlement',
      commodityLabel: 'Matière première ou ligne industrielle',
      corridorLabel: 'Corridor portuaire cible',
      originPrefix: 'Origine',
      transitPrefix: 'Transit est.',
      quantityLabel: 'Saisie de quantité',
      byFcl: 'Par FCL',
      byUnit: 'Par',
      containerLabel: 'Format de conteneur',
      internalDims: 'Intérieur',
      incotermLabel: 'Base de livraison Incoterms® 2020',
      iccRules: 'Règles officielles CCI',
      riskTransfer: 'Transfert des risques',
      oceanFreight: 'Fret maritime',
      marineInsurance: 'Assurance maritime',
      included: 'Inclus',
      buyerAccount: 'Compte acheteur',
      estimateTitle: 'Estimation Proforma Indicative',
      unitPriceLabel: 'Prix Unitaire Estimé',
      totalValueLabel: 'Valeur Totale Estimée',
      exwBase: 'Base EXW Produit',
      adderLabel: 'Supplément Export, Fret & Assurance',
      containerAlloc: 'Allocation Conteneurs',
      payloadWeight: 'Charge utile',
      cubicVolume: 'Volume cubique',
      totalSuffix: 'total',
      packagingSpec: 'Spécification d’emballage',
      unitPackages: 'Unités conditionnées est.',
      loadConstraint: 'Contrainte de chargement',
      lockQuoteBtn: 'Verrouiller & Demander une Proforma',
      addManifestBtn: 'Ajouter au Manifeste RFQ Multi-Lignes',
      addedManifestBtn: 'Ajouté au Manifeste RFQ',
      disclaimer:
        'Estimations indicatives de change et fret ; FCO ferme délivrée après vérification LOI/KYC.',
    },
    catalog: {
      eyebrow: '02. Portefeuille Export & Distribution Gros',
      title: 'Catalogue de Commodités & Fournitures Industrielles Vérifiées',
      subtitle:
        'Chaque lot d’exportation bénéficie d’une traçabilité documentée, d’un conditionnement export et d’une inspection SGS ou Bureau Veritas avant embarquement.',
      searchPlaceholder: 'Rechercher sésame, gingembre, lithium, ZMGN057...',
      emptyTitle: 'Aucun produit correspondant',
      emptyBody:
        'Effacez votre recherche ou sélectionnez Toutes les filières.',
      resetFilters: 'Réinitialiser les filtres',
      gradeLabel: 'Qualité / Pureté',
      assayLabel: 'Réf. Analyse / Cert',
      packagingLabel: 'Conditionnement',
      inspectionLabel: 'Inspection',
      minOrderLabel: 'Commande Min / Délai',
      techSheetTitle: 'Fiche Technique & Analyses',
      hideSpecs: 'Masquer',
      showSpecs: 'Fiche Tech',
      inManifest: 'Dans Manifeste',
      addManifest: 'Manifeste',
      proformaBtn: 'Proforma',
    },
    verification: {
      eyebrow: '03. Vérification des Analyses & Exécution L/C',
      title: 'Vérification en Direct & Protocole d’Exécution Export',
      subtitle:
        'Consultez nos certificats d’analyse géochimique et agricole, vérifiez nos enregistrements légaux nigérians et parcourez les 5 étapes de la LOI au Connaissement.',
      lookupTitle: 'Recherche d’Analyse & Certificat',
      lookupLabel: 'Saisir une réf. analyse, permis minier ou code légal',
      lookupPlaceholder: 'ex. ZMGN057, 65197 EL, RC 2012723, AHT-AG-019...',
      issuedBy: 'Délivré par',
      noMatchTitle: 'Aucune référence correspondante dans l’index public',
      noMatchBody:
        'Sélectionnez une référence rapide ci-dessus (comme ZMGN057 ou 65197 EL) ou demandez le dossier SGS complet via la Deal Room.',
      timelineTitle: 'Calendrier d’Exécution Export & L/C',
      typicalDuration: '19–24 Jours Typiques',
      stagePrefix: 'Étape',
      leadPrefix: 'Responsable',
      deliverablesHeading: 'Livrables & Documents Commerciaux Requis',
      prevStage: 'Étape précédente',
      nextStage: 'Étape suivante',
    },
    compliance: {
      eyebrow: '04. Conformité Internationale & Centre de Confiance',
      title: 'Gouvernance Vérifiable du Site d’Origine au Port de Déchargement',
      subtitle:
        'Les acheteurs internationaux exigent des titres d’origine transparents, des chaînes d’analyses indépendantes et une sécurité bancaire irréprochable avant d’affréter un navire.',
      corridorsTitle: 'Corridors Maritimes & Logistiques Actifs',
      corridorsSubtitle:
        'Acheminement direct en conteneurs FCL et conventionnel vers l’Europe, l’Asie, le Moyen-Orient et l’Afrique',
      exportHub: 'Hub Export : Lagos & Port Harcourt, Nigeria',
    },
    leadership: {
      eyebrow: '05. Direction Exécutive & Gouvernance',
      title: 'Supervision Directe du Principal Signataire sur Chaque Contrat',
      subtitle:
        'Ahzan Tech Ltd (intégrant AhzanEmporium, RC 2012723) garantit un suivi exécutif direct de la Lettre d’Intention initiale jusqu’à la libération portuaire SGS et la remise du Connaissement.',
      signatoryBadge: 'Signataire Principal',
      role: 'Fondateur & Directeur Général · Ahzan Tech Ltd & AhzanEmporium',
      bio: 'Supervisant la conformité minière (Licence 65197 EL), l’agrégation agro-exportatrice nigériane et la distribution de gros en Afrique de l’Ouest, en Europe et en Asie de l’Est.',
      corpEntity: 'Entité Juridique',
      tradingDiv: 'Division Négoce',
      deskTitle: 'Bureau Exécutif & Canaux Directs',
      deskSubtitle:
        'Contactez directement notre bureau commercial pour recevoir une Offre Corporative Ferme (FCO), les dossiers d’analyse ou nouer un partenariat de gros.',
      execEmailLabel: 'Direction Générale & Minerais Critiques',
      tradeEmailLabel: 'Commerce International & Agro-Commodités',
      copyBtn: 'Copier',
      copiedBtn: 'Copié',
      hqTitle: 'Siège Social & Coordination des Exportations',
      hqAddress: 'Corridors Commerciaux d’Abuja & Lagos, Nigeria',
      hqPorts: 'Terminaux d’embarquement : Apapa Wharf · Tin Can Island · Onne Port',
      whatsappBtn: 'WhatsApp Business',
      dealRoomBtn: 'Ouvrir la Deal Room B2B',
    },
    dealRoom: {
      title: 'Deal Room B2B — Demande de Cotation (RFQ) & LOI',
      subtitle: 'Ahzan Tech Ltd (RC 2012723) · Bureau Proforma & FCO',
      tabForm: 'Soumission RFQ / LOI',
      tabHistory: 'Dossiers Enregistrés',
      emptyHistory:
        'Aucun dossier RFQ n’a encore été enregistré dans cette session.',
      manifestTitle: 'Manifeste RFQ Combiné',
      clearManifest: 'Vider le manifeste',
      companyLabel: 'Raison Sociale Acheteur *',
      contactLabel: 'Représentant Autorisé *',
      emailLabel: 'E-mail Professionnel *',
      portLabel: 'Port de Destination / Pays *',
      productLabel: 'Commodité ou Ligne Produit Cible',
      volumeLabel: 'Volume Cible *',
      incotermLabel: 'Incoterms 2020',
      paymentLabel: 'Instrument de Paiement',
      specsLabel: 'Exigences d’Analyse, Emballage ou Inspection',
      specsPlaceholder:
        'Précisez la teneur Li2O, tolérance d’humidité, port d’inspection SGS/BV ou conditionnement OEM...',
      footerNote: 'Transmission directe au Bureau Exécutif · RC 2012723',
      cancelBtn: 'Annuler',
      submitBtn: 'Soumettre RFQ / LOI',
      successTitle: 'Dossier RFQ / LOI Enregistré avec Succès',
      successBody1: 'Votre demande commerciale a reçu la référence',
      successBody2:
        'Notre direction (ceo@ahzan.tech) délivre une Offre Corporative (SCO) / Facture Proforma sous 24 heures ouvrées.',
      refIdLabel: 'Référence Dossier',
      buyerEntityLabel: 'Société Acheteuse',
      commodityScopeLabel: 'Périmètre Commodités',
      volumeIncotermLabel: 'Volume & Incoterm',
      settlementLabel: 'Mode de Règlement',
      copySummaryBtn: 'Copier le Résumé',
      downloadBtn: 'Télécharger Dossier (.txt)',
      newInquiryBtn: 'Nouvelle Demande',
      doneBtn: 'Terminer',
    },
    footer: {
      summary:
        'Intégrant AhzanEmporium. Approvisionnement en minerais critiques du Nigeria, exportation d’agro-commodités et négoce industriel en gros.',
      navHeading: 'Navigation',
      contactHeading: 'Contact Corporatif Direct',
      rights: 'Tous droits réservés.',
      standards: 'Incoterms® 2020 · Vérifié SGS & Bureau Veritas',
    },
  },
} as const;
