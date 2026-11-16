import mineralLithiumImg from '../assets/images/mineral_lithium_ore_1794786070574.jpg';
import agroSesameGingerImg from '../assets/images/agro_sesame_ginger_1794786072003.jpg';
import industrialAutoImg from '../assets/images/industrial_auto_parts_1794786071653.jpg';
import solarInverterImg from '../assets/images/solar_inverter_kit_1794786071188.jpg';

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
  // Calculator pricing & container metrics (FOB baseline)
  unitLabel: 'MT' | 'Kit' | 'Drum' | 'Pallet';
  fobUsdPerUnit: number;
  ratePerPercentLi2O?: number;
  defaultLi2OPercent?: number;
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
  deltaFromFobUsd: number;
  freightMultiplierFromFobPct: number;
  description: string;
}

export const INCOTERMS_DATA: Record<IncotermCode, IncotermDetail> = {
  EXW: {
    code: 'EXW',
    name: 'Ex Works (Mine / Warehouse)',
    riskTransfer: 'Origin Warehouse / Mine Gate, Nigeria',
    freightIncluded: false,
    insuranceIncluded: false,
    deltaFromFobUsd: -55,
    freightMultiplierFromFobPct: -0.04,
    description:
      'Buyer assumes full responsibility for inland haulage, Nigerian customs export clearance, terminal handling, and ocean freight.',
  },
  FOB: {
    code: 'FOB',
    name: 'Free On Board (Apapa / Tin Can / Nansha)',
    riskTransfer: 'Loaded On Board Vessel at Origin Port',
    freightIncluded: false,
    insuranceIncluded: false,
    deltaFromFobUsd: 0,
    freightMultiplierFromFobPct: 0,
    description:
      'Official quoted FOB export price: Ahzan Tech Ltd handles inland haulage, SGS/BV pre-shipment inspection, NESS clearance, and vessel loading.',
  },
  CFR: {
    code: 'CFR',
    name: 'Cost and Freight (Destination Port)',
    riskTransfer: 'On Board Vessel at Origin Port (Freight Paid to Destination)',
    freightIncluded: true,
    insuranceIncluded: false,
    deltaFromFobUsd: 95,
    freightMultiplierFromFobPct: 0.05,
    description:
      'Includes FOB origin handling plus ocean container freight to buyer-nominated international deep-sea port.',
  },
  CIF: {
    code: 'CIF',
    name: 'Cost, Insurance and Freight',
    riskTransfer: 'On Board Vessel at Origin Port (Insured to Destination)',
    freightIncluded: true,
    insuranceIncluded: true,
    deltaFromFobUsd: 118,
    freightMultiplierFromFobPct: 0.07,
    description:
      'Complete export coverage: origin inspection, customs clearance, ocean freight, and Institute Cargo Clauses (A) marine insurance.',
  },
  DAP: {
    code: 'DAP',
    name: 'Delivered at Place (Inland Terminal)',
    riskTransfer: 'Ready for Unloading at Buyer Named Destination',
    freightIncluded: true,
    insuranceIncluded: true,
    deltaFromFobUsd: 185,
    freightMultiplierFromFobPct: 0.11,
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
    shortName: 'Lithium Ore ($207 / 1% Li2O)',
    category: 'Critical Minerals',
    hsCode: '2530.90',
    origin: 'Nasarawa & Kwara Belts, Nigeria',
    gradeOrPurity: '$207 / 1% Li2O · 4.61% Assay ($954 / MT FOB)',
    assayRef: 'Assay Ref: ZMGN057 · Licence No. 65197 EL',
    packaging: '1,000 kg / 1,250 kg UV-Stabilized PP Jumbo Bags',
    packageUnitWeightKg: 1000,
    inspectionStandard: 'SGS / Bureau Veritas (ICP-OES & XRF)',
    minOrder: '50 MT (2 × 20ft FCL Trial) · Up to 5,000 MT/Mo',
    leadTime: '14–21 Days Post-L/C',
    image: mineralLithiumImg,
    summary:
      'Direct mine-gate sourcing of high-grade crushed lithium-bearing spodumene and lepidolite ore priced at $207 per 1% Li2O per metric ton under active Mining Cadastre tenure 65197 EL.',
    technicalSpecs: [
      { label: 'Unit Benchmark', value: '$207 / 1% Li2O / MT' },
      { label: 'Verified Li2O', value: '4.61% ($954.27/MT FOB)' },
      { label: 'Fe2O3 Impurity', value: '< 1.25% Max' },
      { label: 'Moisture (H2O)', value: '< 2.0% As-Shipped' },
      { label: 'Mining Title', value: 'MCO Licence No. 65197 EL' },
      { label: 'Assay Protocol', value: 'SGS / BV Umpire Sampling' },
    ],
    unitLabel: 'MT',
    fobUsdPerUnit: 954,
    ratePerPercentLi2O: 207,
    defaultLi2OPercent: 4.61,
    maxUnitsPer20ft: 27,
    maxUnitsPer40ft: 27,
    weightKgPerUnit: 1000,
    volumeCbmPerUnit: 0.72,
  },
  {
    id: 'hulled-white-sesame',
    name: 'Natural Whitish Sesame Seeds (Machine Cleaned 99/1)',
    shortName: 'Whitish Sesame ($1,400/MT FOB)',
    category: 'Agro-Commodities',
    hsCode: '1207.40',
    origin: 'Benue, Jigawa & Kano States, Nigeria',
    gradeOrPurity: '99/1 Machine Cleaned · Oil ≥ 50% · $1,400/MT FOB',
    assayRef: 'Lab Ref: AHT-AG-019 · Aflatoxin & MRL Tested',
    packaging: '50 kg New Woven PP Bags',
    packageUnitWeightKg: 50,
    inspectionStandard: 'SGS / Bureau Veritas + NAQS Phytosanitary',
    minOrder: '18 MT (1 × 20ft FCL · $25,200)',
    leadTime: '15–25 Working Days',
    image: agroSesameGingerImg,
    summary:
      'Machine-cleaned 99/1 Nigerian whitish sesame seeds quoted at US$1,400/MT FOB Lagos (Apapa / Tin Can Island), prized for ≥50% oil yield and ≤2% free fatty acid profile.',
    technicalSpecs: [
      { label: 'FOB Lagos Price', value: '$1,400 / MT ($25,200/20ft)' },
      { label: 'Purity Grade', value: 'Machine Cleaned 99/1' },
      { label: 'Oil Content', value: '≥ 50%' },
      { label: 'Moisture / FFA', value: '≤ 6.0% / ≤ 2.0%' },
      { label: '20ft FCL Load', value: '18 MT (360 × 50kg Bags)' },
      { label: 'Certification', value: 'NAQS Phytosanitary + SGS' },
    ],
    unitLabel: 'MT',
    fobUsdPerUnit: 1400,
    maxUnitsPer20ft: 18,
    maxUnitsPer40ft: 26,
    weightKgPerUnit: 1000,
    volumeCbmPerUnit: 1.68,
  },
  {
    id: 'dried-split-ginger-hibiscus',
    name: 'Nigerian Dried Split Ginger & Hibiscus Flowers (Zobo)',
    shortName: 'Split Ginger ($1,360/MT) & Hibiscus ($1,740/MT)',
    category: 'Agro-Commodities',
    hsCode: '0910.11',
    origin: 'Kaduna & Jigawa Export Hubs, Nigeria',
    gradeOrPurity: 'FAQ / ASTA Grade · Split $1,360/MT · Hibiscus $1,740/MT',
    assayRef: 'Lab Ref: AHT-AG-042 · EU MRL Compliant',
    packaging: '25 kg / 50 kg Breathable PP Export Sacks & Bales',
    packageUnitWeightKg: 25,
    inspectionStandard: 'SGS / Intertek + Phytosanitary Fumigation Cert',
    minOrder: '10 MT (14 MT / 20ft FCL · $19,040)',
    leadTime: '15–25 Working Days',
    image: agroSesameGingerImg,
    summary:
      'Export-grade Nigerian dried split ginger (US$1,360/MT FOB Lagos; whole ginger US$1,190/MT) and deep-red dried hibiscus calyces (US$1,740/MT FOB Lagos) tested to EU MRL standards.',
    technicalSpecs: [
      { label: 'Split Ginger FOB', value: '$1,360 / MT ($19,040/20ft)' },
      { label: 'Whole Ginger FOB', value: '$1,190 / MT ($16,660/20ft)' },
      { label: 'Hibiscus FOB', value: '$1,740 / MT ($20,880/20ft)' },
      { label: 'Moisture / Admix', value: '≤ 10% / ≤ 1%' },
      { label: 'Fumigation', value: 'Certified Export Fumigation' },
      { label: 'Inspection', value: 'SGS / Intertek Pre-Load' },
    ],
    unitLabel: 'MT',
    fobUsdPerUnit: 1360,
    maxUnitsPer20ft: 14,
    maxUnitsPer40ft: 26,
    weightKgPerUnit: 1000,
    volumeCbmPerUnit: 2.35,
  },
  {
    id: 'raw-cashew-soybeans',
    name: 'Raw Cashew Nuts (RCN), Cocoa Beans & Non-GMO Soybeans',
    shortName: 'RCN ($1,105/MT) · Cocoa ($3,638/MT) · Soy ($450/MT)',
    category: 'Agro-Commodities',
    hsCode: '0801.31',
    origin: 'Ogbomoso, Kogi & Benue Corridors, Nigeria',
    gradeOrPurity: 'KOR 46–48 lbs (RCN) · Grade 1 Main Crop (Cocoa)',
    assayRef: 'Lab Ref: AHT-AG-068 · 2026 Crop Schedule',
    packaging: '80 kg Jute Bags (RCN) / 50 kg PP Bags (Soy)',
    packageUnitWeightKg: 80,
    inspectionStandard: 'SGS / Bureau Veritas Outturn Cutting Test',
    minOrder: '16 MT (16 MT / 20ft FCL · $17,680)',
    leadTime: '15–25 Working Days',
    image: agroSesameGingerImg,
    summary:
      'Direct origin Nigerian Raw Cashew Nuts at US$1,105/MT FOB Lagos, Processed W320 Kernels ($6,800/MT), Grade 1 Fermented Cocoa Beans ($3,638/MT), and Non-GMO Soybeans ($450/MT).',
    technicalSpecs: [
      { label: 'RCN FOB Lagos', value: '$1,105 / MT (KOR 46–48)' },
      { label: 'Cashew W320 FOB', value: '$6,800 / MT ($102k/20ft)' },
      { label: 'Cocoa Gr.1 FOB', value: '$3,638 / MT (12.5 MT/20ft)' },
      { label: 'Soybeans FOB', value: '$450 / MT ($9,000/20ft)' },
      { label: 'Moisture', value: '≤ 9.0% Max (RCN)' },
      { label: 'Verification', value: 'SGS Outturn Cutting Test' },
    ],
    unitLabel: 'MT',
    fobUsdPerUnit: 1105,
    maxUnitsPer20ft: 16,
    maxUnitsPer40ft: 26,
    weightKgPerUnit: 1000,
    volumeCbmPerUnit: 1.95,
  },
  {
    id: 'heavy-duty-auto-lubricants',
    name: 'Commercial Automotive & Diesel Engine Lubricants (API SL / CI-4)',
    shortName: 'CI-4 & SL Lubricants (200L Drum $394)',
    category: 'Automotive & Lubricants',
    hsCode: '2710.19',
    origin: 'Kano Wholesale Hub · Foshan/Hefei OEM Plants',
    gradeOrPurity: 'API CI-4 15W-40 ($394.28/Drum) · SL 5W-30/10W-40/20W-50',
    assayRef: 'Official Kano 2026 Schedule · 1L to 200L Packs',
    packaging: '1L/4L/5L Cartons, 20L Jerrycans & 200L Steel Drums',
    packageUnitWeightKg: 195,
    inspectionStandard: 'SONCAP / Intertek / API SL & CI-4 Certified',
    minOrder: '8 × 200L Drums or 1 × 20ft FCL (80 Drums)',
    leadTime: '20–30 Working Days',
    image: industrialAutoImg,
    summary:
      'Official Kano & UEMOA wholesale distribution of API SL gasoline and CI-4 heavy-duty diesel engine oils in 1L, 4L, 5L, 20L barrels, and 200L steel drums priced in USD, NGN, and XOF.',
    technicalSpecs: [
      { label: 'CI-4 15W-40 200L', value: '$394.28 / ₦548,049 / 230k XOF' },
      { label: 'SL 10W-40 200L', value: '$380.00 / ₦528,200' },
      { label: 'SL 5W-30 200L', value: '$420.00 / ₦583,800' },
      { label: '20L Barrel Range', value: '$37.80 – $44.80' },
      { label: '1L / 4L / 5L Packs', value: '$2.08 – $11.50 / unit' },
      { label: '20ft FCL Capacity', value: '80 Drums or 756 Barrels' },
    ],
    unitLabel: 'Drum',
    fobUsdPerUnit: 394,
    maxUnitsPer20ft: 80,
    maxUnitsPer40ft: 160,
    weightKgPerUnit: 195,
    volumeCbmPerUnit: 0.32,
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
    image: solarInverterImg,
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
    fobUsdPerUnit: 4480,
    maxUnitsPer20ft: 12,
    maxUnitsPer40ft: 26,
    weightKgPerUnit: 380,
    volumeCbmPerUnit: 2.15,
  },
];

export const TRADE_CORRIDORS = [
  {
    region: 'West Africa Origin Hubs',
    ports: 'Apapa · Tin Can Island · Onne · Kano Wholesale Hub',
    focus: 'Mine-gate consolidation, NESS inspection, SGS sealing, export customs clearance.',
  },
  {
    region: 'East Asia Refining & Processing',
    ports: 'Qingdao · Ningbo · Nansha · Shanghai',
    focus: 'Lithium spodumene/lepidolite conversion deliveries & OEM lubricant plant sourcing.',
  },
  {
    region: 'European & Mediterranean Ports',
    ports: 'Rotterdam · Hamburg · London Gateway · Antwerp',
    focus: 'EU MRL-compliant dried ginger, hibiscus, cocoa, and specialty African food lines.',
  },
  {
    region: 'UEMOA & Pan-African Wholesale',
    ports: 'Jebel Ali · Cotonou · Lomé · Dakar · Abidjan',
    focus: 'AhzanEmporium lubricants (USD/NGN/XOF), agro-commodities, and solar kits.',
  },
];
