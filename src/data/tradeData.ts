export type ProductCategory =
  | 'Critical Minerals'
  | 'Agro-Commodities'
  | 'Automotive & Lubricants'
  | 'Solar & Electronics';

export type IncotermCode = 'EXW' | 'FOB' | 'CFR' | 'CIF' | 'DAP';

export type ContainerSize = '20ft' | '40ft';

export interface CommodityProduct {
  id: string;
  name: string;
  shortName: string;
  category: ProductCategory;
  hsCode: string;
  origin: string;
  gradeOrPurity: string;
  assayRef: string;
  packaging: string;
  packageUnitWeightKg: number;
  inspectionStandard: string;
  minOrder: string;
  leadTime: string;
  image: string;
  summary: string;
  technicalSpecs: { label: string; value: string }[];
  // Calculator pricing & container metrics
  unitLabel: 'MT' | 'Kit' | 'Pallet';
  baseExwUsdPerUnit: number;
  maxUnitsPer20ft: number;
  maxUnitsPer40ft: number;
  weightKgPerUnit: number;
  volumeCbmPerUnit: number;
}

export interface IncotermDetail {
  code: IncotermCode;
  name: string;
  riskTransfer: string;
  freightIncluded: boolean;
  insuranceIncluded: boolean;
  surchargePerUnitUsd: number;
  freightMultiplierPct: number;
  description: string;
}

export const INCOTERMS_DATA: Record<IncotermCode, IncotermDetail> = {
  EXW: {
    code: 'EXW',
    name: 'Ex Works (Mine / Warehouse)',
    riskTransfer: 'Origin Warehouse / Mine Gate, Nigeria',
    freightIncluded: false,
    insuranceIncluded: false,
    surchargePerUnitUsd: 0,
    freightMultiplierPct: 0,
    description:
      'Buyer assumes full responsibility for inland haulage, Nigerian customs export clearance, terminal handling, and ocean freight.',
  },
  FOB: {
    code: 'FOB',
    name: 'Free On Board (Apapa / Tin Can / Onne)',
    riskTransfer: 'Loaded On Board Vessel at Nigerian Port',
    freightIncluded: false,
    insuranceIncluded: false,
    surchargePerUnitUsd: 68,
    freightMultiplierPct: 0.04,
    description:
      'Ahzan Tech Ltd handles inland haulage, SGS/BV pre-shipment inspection, Nigerian Export Supervision Scheme (NESS) clearance, and vessel loading.',
  },
  CFR: {
    code: 'CFR',
    name: 'Cost and Freight (Destination Port)',
    riskTransfer: 'On Board Vessel at Origin Port (Freight Paid to Destination)',
    freightIncluded: true,
    insuranceIncluded: false,
    surchargePerUnitUsd: 162,
    freightMultiplierPct: 0.09,
    description:
      'Includes FOB origin handling plus ocean container freight to buyer-nominated international deep-sea port.',
  },
  CIF: {
    code: 'CIF',
    name: 'Cost, Insurance and Freight',
    riskTransfer: 'On Board Vessel at Origin Port (Insured to Destination)',
    freightIncluded: true,
    insuranceIncluded: true,
    surchargePerUnitUsd: 188,
    freightMultiplierPct: 0.11,
    description:
      'Complete export coverage: origin inspection, customs clearance, ocean freight, and Institute Cargo Clauses (A) marine insurance.',
  },
  DAP: {
    code: 'DAP',
    name: 'Delivered at Place (Inland Terminal)',
    riskTransfer: 'Ready for Unloading at Buyer Named Destination',
    freightIncluded: true,
    insuranceIncluded: true,
    surchargePerUnitUsd: 265,
    freightMultiplierPct: 0.15,
    description:
      'Door-to-terminal delivery up to named inland hub (import duties and destination customs clearance borne by buyer).',
  },
};

export const CONTAINER_SPECS: Record<
  ContainerSize,
  { label: string; maxPayloadKg: number; internalVolumeCbm: number; dimensions: string }
> = {
  '20ft': {
    label: '20ft Standard FCL',
    maxPayloadKg: 28000,
    internalVolumeCbm: 33.2,
    dimensions: '5.90m × 2.35m × 2.39m',
  },
  '40ft': {
    label: '40ft High-Cube FCL',
    maxPayloadKg: 28800,
    internalVolumeCbm: 76.3,
    dimensions: '12.03m × 2.35m × 2.69m',
  },
};

export const COMMODITY_PRODUCTS: CommodityProduct[] = [
  {
    id: 'lithium-spodumene-lepidolite',
    name: 'Nigerian Lithium-Bearing Ore (Spodumene / Lepidolite)',
    shortName: 'Lithium Ore (4.61% Li2O)',
    category: 'Critical Minerals',
    hsCode: '2530.90',
    origin: 'Nasarawa & Kwara Belts, Nigeria',
    gradeOrPurity: '4.61% Li2O Verified Assay (Range 3.8%–4.8%)',
    assayRef: 'Assay Ref: ZMGN057 · Licence No. 65197 EL',
    packaging: '1,000 kg / 1,250 kg UV-Stabilized PP Jumbo Bags',
    packageUnitWeightKg: 1000,
    inspectionStandard: 'SGS / Bureau Veritas (ICP-OES & XRF)',
    minOrder: '50 MT (2 × 20ft FCL Trial) · Up to 5,000 MT/Mo',
    leadTime: '14–21 Days Post-L/C',
    image: '/src/assets/images/mineral_lithium_ore_1794786070574.jpg',
    summary:
      'Direct mine-gate sourcing of high-grade crushed lithium-bearing spodumene and lepidolite ore under active Mining Cadastre exploration tenure 65197 EL, prepared for battery-grade chemical conversion.',
    technicalSpecs: [
      { label: 'Li2O Content', value: '4.61% (Lab Ref ZMGN057)' },
      { label: 'Fe2O3 Impurity', value: '< 1.25% Max' },
      { label: 'Moisture (H2O)', value: '< 2.0% As-Shipped' },
      { label: 'Particle Sizing', value: '0–50 mm Crushed / Lump' },
      { label: 'Mining Title', value: 'MCO Licence No. 65197 EL' },
      { label: 'Assay Protocol', value: 'SGS / BV Umpire Sampling' },
    ],
    unitLabel: 'MT',
    baseExwUsdPerUnit: 690,
    maxUnitsPer20ft: 27,
    maxUnitsPer40ft: 27,
    weightKgPerUnit: 1000,
    volumeCbmPerUnit: 0.72,
  },
  {
    id: 'tantalite-coltan-ore',
    name: 'Industrial Tantalite & Niobium Concentrate',
    shortName: 'Tantalite Ore (Ta2O5 28%+)',
    category: 'Critical Minerals',
    hsCode: '2615.90',
    origin: 'Kogi & Nasarawa Mineral Corridors, Nigeria',
    gradeOrPurity: '28%–35% Ta2O5 / Nb2O5 Co-Product',
    assayRef: 'Assay Ref: AHT-TA-204 · OECD DDG Traceable',
    packaging: '50 kg Sealed Steel Drums on ISPM-15 Pallets',
    packageUnitWeightKg: 50,
    inspectionStandard: 'SGS / Alex Stewart International (Radioactivity & XRF)',
    minOrder: '5 MT Trial Lot',
    leadTime: '18–25 Days Post-L/C',
    image: '/src/assets/images/mineral_lithium_ore_1794786070574.jpg',
    summary:
      'Conflict-free, chain-of-custody documented tantalite concentrate processed via gravity separation and screened for low uranium/thorium activity prior to export.',
    technicalSpecs: [
      { label: 'Ta2O5 Content', value: '28.0% – 35.0% Min' },
      { label: 'Nb2O5 Content', value: '18.0% – 24.0%' },
      { label: 'U3O8 + ThO2', value: '< 0.10% (Class 7 Exempt)' },
      { label: 'Moisture', value: '< 1.0% Max' },
      { label: 'Packaging', value: '50 kg UN Steel Drums' },
      { label: 'Traceability', value: 'MCO / NEPC Chain Tagged' },
    ],
    unitLabel: 'MT',
    baseExwUsdPerUnit: 14500,
    maxUnitsPer20ft: 20,
    maxUnitsPer40ft: 22,
    weightKgPerUnit: 1000,
    volumeCbmPerUnit: 0.65,
  },
  {
    id: 'hulled-white-sesame',
    name: 'Nigerian Natural & Hulled White Sesame Seeds',
    shortName: 'White Sesame Seeds (99.9%)',
    category: 'Agro-Commodities',
    hsCode: '1207.40',
    origin: 'Benue, Jigawa & Kano States, Nigeria',
    gradeOrPurity: '99.95% Sortex Cleaned (Oil Content ≥ 50%)',
    assayRef: 'Lab Ref: AHT-AG-019 · Aflatoxin & Salmonella Tested',
    packaging: '25 kg / 50 kg New Woven PP Bags',
    packageUnitWeightKg: 50,
    inspectionStandard: 'SGS / Bureau Veritas + NAQS Phytosanitary',
    minOrder: '19 MT (1 × 20ft FCL)',
    leadTime: '10–14 Days Post-L/C',
    image: '/src/assets/images/agro_sesame_ginger_1794786072003.jpg',
    summary:
      'Machine-cleaned, optical-sorted Nigerian white sesame seeds prized by European, Middle Eastern, and East Asian food processors for high oil yield and low free fatty acid profile.',
    technicalSpecs: [
      { label: 'Purity', value: '99.95% Sortex Cleaned' },
      { label: 'Oil Content', value: '49% – 52%' },
      { label: 'Moisture', value: '< 6.0% Max' },
      { label: 'FFA (as Oleic)', value: '< 1.5% Max' },
      { label: 'Admixture', value: '< 0.05%' },
      { label: 'Certification', value: 'NAQS Phytosanitary + SGS' },
    ],
    unitLabel: 'MT',
    baseExwUsdPerUnit: 1640,
    maxUnitsPer20ft: 19,
    maxUnitsPer40ft: 26,
    weightKgPerUnit: 1000,
    volumeCbmPerUnit: 1.62,
  },
  {
    id: 'dried-split-ginger-hibiscus',
    name: 'Sun-Dried Split Ginger & Whole Hibiscus Calyces',
    shortName: 'Dried Ginger & Hibiscus',
    category: 'Agro-Commodities',
    hsCode: '0910.11',
    origin: 'Kaduna & Jigawa Export Hubs, Nigeria',
    gradeOrPurity: 'ASTA Clean Grade · Volatile Oil ≥ 2.2%',
    assayRef: 'Lab Ref: AHT-AG-042 · EU MRL Compliant',
    packaging: '25 kg / 40 kg Breathable PP Export Sacks',
    packageUnitWeightKg: 25,
    inspectionStandard: 'SGS / Intertek + Phytosanitary Fumigation Cert',
    minOrder: '14 MT (1 × 20ft FCL) or 26 MT (40ft HC)',
    leadTime: '12–16 Days Post-L/C',
    image: '/src/assets/images/agro_sesame_ginger_1794786072003.jpg',
    summary:
      'High-pungency Nigerian split ginger and deep-crimson dried hibiscus flowers harvested at peak maturity, machine-sieved, and moisture-stabilized for beverage and spice extraction markets.',
    technicalSpecs: [
      { label: 'Ginger Oil', value: '2.2% – 2.8% Volatile Oil' },
      { label: 'Moisture', value: '< 10.0% Max' },
      { label: 'Foreign Matter', value: '< 1.0% Max' },
      { label: 'Sack Weight', value: '25 kg / 40 kg PP Bags' },
      { label: 'Fumigation', value: 'Methyl Bromide / Phosphine' },
      { label: 'Inspection', value: 'SGS / Intertek Pre-Load' },
    ],
    unitLabel: 'MT',
    baseExwUsdPerUnit: 2180,
    maxUnitsPer20ft: 14,
    maxUnitsPer40ft: 26,
    weightKgPerUnit: 1000,
    volumeCbmPerUnit: 2.35,
  },
  {
    id: 'raw-cashew-soybeans',
    name: 'Raw Cashew Nuts (RCN) & Non-GMO Soybeans',
    shortName: 'Raw Cashew & Soybeans',
    category: 'Agro-Commodities',
    hsCode: '0801.31',
    origin: 'Ogbomoso, Kogi & Benue Corridors, Nigeria',
    gradeOrPurity: 'KOR 47–49 lbs/80kg · Nut Count 180–200/kg',
    assayRef: 'Lab Ref: AHT-AG-068 · Crop 2026 Fresh Harvest',
    packaging: '80 kg Jute Bags (RCN) / 50 kg PP Bags (Soy)',
    packageUnitWeightKg: 80,
    inspectionStandard: 'SGS / Bureau Veritas Outturn Cutting Test',
    minOrder: '18 MT (1 × 20ft FCL)',
    leadTime: '10–15 Days Post-L/C',
    image: '/src/assets/images/agro_sesame_ginger_1794786072003.jpg',
    summary:
      'Export-graded Raw Cashew Nuts with verified Kernel Outturn Ratio (KOR) and non-GMO feed/food-grade Nigerian soybeans packed in breathable jute or polypropylene export sacks.',
    technicalSpecs: [
      { label: 'Outturn (KOR)', value: '47 – 49 lbs / 80 kg' },
      { label: 'Nut Count', value: '180 – 200 Nuts / kg' },
      { label: 'Moisture', value: '< 9.0% Max' },
      { label: 'Defective Nuts', value: '< 6.0% Max' },
      { label: 'Packaging', value: '80 kg Breathable Jute' },
      { label: 'Verification', value: 'SGS Outturn Cutting Test' },
    ],
    unitLabel: 'MT',
    baseExwUsdPerUnit: 1380,
    maxUnitsPer20ft: 18,
    maxUnitsPer40ft: 27,
    weightKgPerUnit: 1000,
    volumeCbmPerUnit: 1.75,
  },
  {
    id: 'heavy-duty-auto-lubricants',
    name: 'Commercial Auto Spare Parts & Synthetic Lubricants',
    shortName: 'Auto Parts & Lubricants',
    category: 'Automotive & Lubricants',
    hsCode: '8708.30',
    origin: 'AhzanEmporium Wholesale Hub (UAE / China / Nigeria)',
    gradeOrPurity: 'API CK-4 / ISO VG 46 · OEM Spec Brake & Filter Kits',
    assayRef: 'Batch Cert: AE-IND-310 · ISO/TS 16949',
    packaging: 'Export Cartons & 20L/208L Steel Drums on Euro Pallets',
    packageUnitWeightKg: 420,
    inspectionStandard: 'SONCAP / Intertek / Bureau Veritas',
    minOrder: '10 Pallets (Partial FCL) · 20ft / 40ft FCL',
    leadTime: '7–14 Days Ex-Warehouse',
    image: '/src/assets/images/industrial_auto_parts_1794786071653.jpg',
    summary:
      'High-turnover wholesale supply of heavy-duty fleet brake rotors, hydraulic & fuel filtration assemblies, and API-certified diesel/hydraulic lubricants distributed across West & East Africa.',
    technicalSpecs: [
      { label: 'Lubricant Grade', value: 'API CK-4 15W-40 / ISO 46' },
      { label: 'Parts Standard', value: 'OEM / ISO-TS 16949' },
      { label: 'Pallet Spec', value: '420 kg Euro Pallet Unit' },
      { label: 'Drum Options', value: '20L Pails & 208L Steel Drums' },
      { label: 'Conformity', value: 'SONCAP / PVoC Certified' },
      { label: 'Warranty', value: '12-Month Commercial Fleet' },
    ],
    unitLabel: 'Pallet',
    baseExwUsdPerUnit: 1120,
    maxUnitsPer20ft: 11,
    maxUnitsPer40ft: 24,
    weightKgPerUnit: 420,
    volumeCbmPerUnit: 1.44,
  },
  {
    id: 'commercial-solar-inverter-kits',
    name: 'Commercial Solar PV Arrays, Hybrid Inverters & LiFePO4 Storage',
    shortName: 'Solar & Inverter Kits (10kVA)',
    category: 'Solar & Electronics',
    hsCode: '8541.43',
    origin: 'Tier-1 Global OEM · AhzanEmporium Distribution',
    gradeOrPurity: 'N-Type Mono PERC 580W + 10kVA Hybrid + 15kWh LiFePO4',
    assayRef: 'Cert Ref: AE-SOL-882 · IEC 61215 / UN38.3',
    packaging: 'Shock-Protected Export Crates & Anti-Static Pallets',
    packageUnitWeightKg: 380,
    inspectionStandard: 'CE / IEC / Bureau Veritas Pre-Shipment',
    minOrder: '6 Kits (20ft FCL) · 18 Kits (40ft HC)',
    leadTime: '10–18 Days Dispatch',
    image: '/src/assets/images/solar_inverter_kit_1794786071188.jpg',
    summary:
      'Turnkey commercial energy kits combining Tier-1 monocrystalline solar panels, pure-sine-wave hybrid MPPT inverters, and deep-cycle LiFePO4 battery banks for telecom, mining, and SME infrastructure.',
    technicalSpecs: [
      { label: 'PV Module', value: '580W N-Type Bifacial' },
      { label: 'Inverter Rating', value: '10kVA / 48V Pure Sine MPPT' },
      { label: 'Battery Bank', value: '15.36 kWh LiFePO4 (6,000 Cycles)' },
      { label: 'Transit Rating', value: 'UN38.3 Hazmat Certified' },
      { label: 'Unit Weight', value: '380 kg Complete Palletized Kit' },
      { label: 'Warranty', value: '10-Yr Panel / 5-Yr Storage' },
    ],
    unitLabel: 'Kit',
    baseExwUsdPerUnit: 4250,
    maxUnitsPer20ft: 12,
    maxUnitsPer40ft: 26,
    weightKgPerUnit: 380,
    volumeCbmPerUnit: 2.15,
  },
];

export const TRADE_CORRIDORS = [
  {
    region: 'West Africa Origin Hubs',
    ports: 'Apapa · Tin Can Island · Onne · Lekki Deep Sea',
    focus: 'Mine-gate consolidation, NESS inspection, SGS sealing, export customs clearance.',
  },
  {
    region: 'East Asia Refining & Processing',
    ports: 'Qingdao · Ningbo · Shanghai · Busan',
    focus: 'Lithium spodumene/lepidolite conversion deliveries & white sesame container corridors.',
  },
  {
    region: 'European & Mediterranean Ports',
    ports: 'Rotterdam · Hamburg · Antwerp · Valencia',
    focus: 'EU MRL-compliant dried ginger, hibiscus, and industrial mineral concentrates.',
  },
  {
    region: 'MENA & Pan-African Wholesale',
    ports: 'Jebel Ali · Mombasa · Tema · Douala',
    focus: 'AhzanEmporium automotive parts, lubricants, and commercial solar equipment distribution.',
  },
];
