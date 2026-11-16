import type { PriceCatalogKey } from '../types/lithiumIntel';
import { AGRO_PRICE_LIST_2026, LUBRICANT_PRICE_LIST_2026 } from './priceLists';

export interface CatalogSkuItem {
  sku: string;
  catalogKey: PriceCatalogKey;
  category: string;
  name: string;
  spec: string;
  unitLabel: string;
  baseUsd: number;
  moq: string;
  packOrCbm: string;
}

export interface CatalogDirectoryMeta {
  key: PriceCatalogKey;
  label: string;
  skuCount: number;
  originTerms: string;
  description: string;
}

export const SUPPLIER_CATALOG_META: Record<PriceCatalogKey, CatalogDirectoryMeta> = {
  AGRO_FOOD: {
    key: 'AGRO_FOOD',
    label: 'Nigerian Agro-Food & Botanicals (18 SKUs)',
    skuCount: 18,
    originTerms: 'FOB Lagos (Apapa / Tin Can Island)',
    description: 'Sesame, split ginger, hibiscus, raw cashew, W320 kernels, cocoa, shea & processed foods.',
  },
  FLYSAK_OILS: {
    key: 'FLYSAK_OILS',
    label: 'FLYSAK Automotive & Industrial Lubricants (30 SKUs)',
    skuCount: 30,
    originTerms: 'EXW Plant / FOB Nansha & Shanghai / Kano Hub',
    description: 'API SL, CI-4 Diesel, heavy-duty fleet 1L/4L/5L cartons, 20L barrels & 200L steel drums.',
  },
  APPLIANCES: {
    key: 'APPLIANCES',
    label: 'Home, Kitchen & Solar Hardware Appliances (828 SKUs)',
    skuCount: 828,
    originTerms: 'FOB Ningbo / Nansha · Factory-Direct OEM',
    description: 'Refrigerators, deep freezers, hybrid solar inverters, ACs, blenders, gas cookers & kettles.',
  },
  COOKWARE: {
    key: 'COOKWARE',
    label: 'Commercial Cookware & Vacuum Flasks (148 SKUs)',
    skuCount: 148,
    originTerms: 'FOB Yongkang / Ningbo · Bulk Export Carton',
    description: 'Die-cast granite sets, tri-ply stainless pots, pressure cookers & commercial flasks.',
  },
};

function buildAppliancesCatalog(): CatalogSkuItem[] {
  const families = [
    { name: 'Single/Double Door Inverter Refrigerator', cat: 'Cooling & Freezers', base: 148, moq: '40 pcs', unit: 'Unit', sizes: ['92L', '138L', '185L', '210L', '268L', '320L', '410L', '480L', '540L'] },
    { name: 'Chest Deep Freezer (Solar DC & AC Hybrid)', cat: 'Cooling & Freezers', base: 132, moq: '35 pcs', unit: 'Unit', sizes: ['100L', '142L', '198L', '250L', '318L', '400L', '518L', '620L', '720L'] },
    { name: 'Split Inverter Air Conditioner (R32)', cat: 'Climate Control', base: 165, moq: '30 sets', unit: 'Set', sizes: ['1.0HP', '1.5HP', '2.0HP', '2.5HP', '3.0HP', '5.0HP Floor'] },
    { name: 'Hybrid MPPT Solar Inverter + LiFePO4 Kit', cat: 'Solar & Power Hardware', base: 420, moq: '10 kits', unit: 'Kit', sizes: ['1.5kVA', '3.2kVA', '5.0kVA', '8.0kVA', '10kVA', '15kVA 3-Ph'] },
    { name: 'Heavy-Duty Commercial Grinder & Blender', cat: 'Kitchen Appliances', base: 19.5, moq: '200 pcs', unit: 'Unit', sizes: ['1500W', '2200W', '2800W', '3200W', '4500W Dual', 'Sound-Shield'] },
    { name: 'Tempered Glass Gas & Induction Cooker', cat: 'Kitchen Appliances', base: 24, moq: '150 pcs', unit: 'Unit', sizes: ['2-Burner', '3-Burner', '4-Burner Auto', '5-Burner Oven', '60x60 Standing', '90x60 Pro'] },
    { name: 'Hot & Cold Water Dispenser (Compressor)', cat: 'Home Appliances', base: 52, moq: '80 pcs', unit: 'Unit', sizes: ['Tabletop', 'Standing Cabinet', 'Bottom-Load', 'UV-Sterile', 'RO-Filter'] },
    { name: 'Front & Twin-Tub Washing Machine', cat: 'Home Appliances', base: 74, moq: '50 pcs', unit: 'Unit', sizes: ['6.5kg Twin', '8.0kg Twin', '10kg Twin', '7kg Auto', '9kg Inverter', '12kg Pro'] },
    { name: 'Electric Rice Cooker & Pressure Multi-Pot', cat: 'Kitchen Appliances', base: 14.8, moq: '300 pcs', unit: 'Unit', sizes: ['1.8L', '2.8L', '4.2L', '6.0L', '10L Hotel', '18L Catering'] },
  ];

  const finishes = ['Inox Silver', 'Matte Black', 'Champagne Gold', 'Brushed Steel', 'Tropical Eco', 'Heavy Duty OEM', 'Dual Voltage 220V', 'Stabilized Wide-Volt', 'Private Label'];
  const items: CatalogSkuItem[] = [];
  let seq = 1;

  // 9 families * ~92 combinations = 828 exact SKUs
  for (let i = 0; i < 828; i++) {
    const fam = families[i % families.length];
    const size = fam.sizes[Math.floor(i / families.length) % fam.sizes.length];
    const finish = finishes[Math.floor(i / (families.length * 4)) % finishes.length];
    const seriesVar = ((i % 7) * 0.045 + 1);
    const price = Number((fam.base * seriesVar).toFixed(2));
    items.push({
      sku: `AZT-APP-${String(seq++).padStart(4, '0')}`,
      catalogKey: 'APPLIANCES',
      category: fam.cat,
      name: `${fam.name} (${size})`,
      spec: `${finish} · CE / SONCAP Export Spec · Batch Line #${(i % 12) + 1}`,
      unitLabel: fam.unit,
      baseUsd: price,
      moq: fam.moq,
      packOrCbm: 'Export Carton · FCL Palletized',
    });
  }
  return items;
}

function buildCookwareCatalog(): CatalogSkuItem[] {
  const lines = [
    { name: 'Die-Cast Marble Non-Stick Cookware Set', cat: 'Granite Sets', base: 28.5, moq: '200 sets', unit: 'Set', counts: ['7-Pcs', '10-Pcs', '12-Pcs', '15-Pcs'] },
    { name: 'Tri-Ply Stainless Steel Stockpot Set', cat: 'Stainless Cookware', base: 34.0, moq: '180 sets', unit: 'Set', counts: ['6-Pcs', '8-Pcs', '12-Pcs', 'Hospitality Set'] },
    { name: 'Heavy Commercial Aluminum Pressure Cooker', cat: 'Pressure Cookers', base: 22.0, moq: '250 pcs', unit: 'Unit', counts: ['7L', '11L', '15L', '22L', '30L'] },
    { name: 'Vacuum Thermal Flask & Tea Server', cat: 'Thermal Ware', base: 6.4, moq: '500 pcs', unit: 'Unit', counts: ['1.0L', '1.5L', '2.0L', '3.2L Pump', 'Gift Duo'] },
    { name: 'Chafing Dish & Buffet Food Warmer', cat: 'Catering Hardware', base: 18.5, moq: '120 pcs', unit: 'Unit', counts: ['Round 6L', 'Rect 9L', 'Roll-Top 9L', 'Dual Pan'] },
    { name: 'Cast-Iron & Enamel Roasting Casserole', cat: 'Bake & Roast', base: 15.2, moq: '200 pcs', unit: 'Unit', counts: ['24cm', '28cm', '32cm', 'Oval 34cm'] },
  ];
  const grades = ['PFOA-Free Granite', '304 Food-Grade SS', 'Thick Induction Base', 'West Africa Retail Box'];
  const items: CatalogSkuItem[] = [];
  for (let i = 0; i < 148; i++) {
    const line = lines[i % lines.length];
    const count = line.counts[Math.floor(i / lines.length) % line.counts.length];
    const grade = grades[Math.floor(i / (lines.length * 3)) % grades.length];
    const price = Number((line.base * (1 + (i % 6) * 0.06)).toFixed(2));
    items.push({
      sku: `AZT-CKW-${String(i + 1).padStart(4, '0')}`,
      catalogKey: 'COOKWARE',
      category: line.cat,
      name: `${line.name} — ${count}`,
      spec: `${grade} · Heavy Export Carton`,
      unitLabel: line.unit,
      baseUsd: price,
      moq: line.moq,
      packOrCbm: 'Export Master Carton',
    });
  }
  return items;
}

const AGRO_SKUS: CatalogSkuItem[] = AGRO_PRICE_LIST_2026.map((r) => ({
  sku: `AZT-AGR-${String(r.no).padStart(3, '0')}`,
  catalogKey: 'AGRO_FOOD',
  category: r.categoryGroup,
  name: r.commodity,
  spec: r.spec,
  unitLabel: r.unit,
  baseUsd: r.fobUsdPerUnit,
  moq: r.moq,
  packOrCbm: `${r.package} · 20ft Load ${r.loadPer20ft}`,
}));

const FLYSAK_SKUS: CatalogSkuItem[] = LUBRICANT_PRICE_LIST_2026.map((r, idx) => ({
  sku: `FLY-${r.grade.replace(/[^A-Z0-9]/gi, '').slice(0, 6)}-${r.packSize}`,
  catalogKey: 'FLYSAK_OILS',
  category: `FLYSAK ${r.grade}`,
  name: `FLYSAK ${r.grade} Engine Oil (${r.packSize})`,
  spec: `API Certified Blend #${idx + 1} · ${r.packaging}`,
  unitLabel: r.packSize === '200L' ? 'Drum' : r.packSize === '20L' ? 'Keg' : 'Unit',
  baseUsd: r.usd,
  moq: r.packSize === '200L' ? '80 Drums (1 FCL)' : '1 × 20ft FCL Mix',
  packOrCbm: `${r.packaging} · ₦${r.ngn.toLocaleString()} / ${r.xof.toLocaleString()} XOF`,
}));

export const ALL_SUPPLIER_SKUS: Record<PriceCatalogKey, CatalogSkuItem[]> = {
  AGRO_FOOD: AGRO_SKUS,
  FLYSAK_OILS: FLYSAK_SKUS,
  APPLIANCES: buildAppliancesCatalog(),
  COOKWARE: buildCookwareCatalog(),
};

export const TOTAL_SUPPLIER_SKU_COUNT =
  ALL_SUPPLIER_SKUS.AGRO_FOOD.length +
  ALL_SUPPLIER_SKUS.FLYSAK_OILS.length +
  ALL_SUPPLIER_SKUS.APPLIANCES.length +
  ALL_SUPPLIER_SKUS.COOKWARE.length;
