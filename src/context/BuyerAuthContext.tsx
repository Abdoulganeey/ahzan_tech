import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  logFirestoreError,
  OperationType,
} from '../firebase';
import {
  LITHIUM_ASSAY_GRADE_PCT,
  LITHIUM_RATE_PER_PERCENT_USD,
} from '../data/priceLists';
import type { IncotermCode } from '../data/tradeData';
import { LITHIUM_INTEL_SEED_CATALOG } from '../data/lithiumIntelCatalog';
import {
  computePriorityTier,
  STAGE_WIN_PROBABILITY,
  type CanonicalCompanyConfig,
  type CrmActivityRecord,
  type CrmActivityType,
  type CrmStage,
  type CrmTaskRecord,
  type LeadCategory,
  type LithiumIntelRecord,
  type OutreachStatus,
  type PriorityTier,
  type TaskPriority,
  type TradeDocumentType,
  type TradeRegion,
} from '../types/lithiumIntel';
import {
  auditDuplicates,
  mergeRecordsByTimestamp,
  normalizeCompanyKey,
  type DuplicateAuditSummary,
} from '../utils/duplicateDetector';

export type RfqStatus =
  | 'Submitted'
  | 'Under Executive Review'
  | 'Quote Approved'
  | 'Not Approved'
  | 'SCO / Proforma Issued'
  | 'L/C Confirmed'
  | 'Export Cleared';

export type ShipmentStatus =
  | 'Mine / Farm Gate'
  | 'SGS Assay Verification'
  | 'NESS & Customs Cleared'
  | 'In Ocean Transit'
  | 'Discharged at Port';

export type TradeDocType =
  | 'Proforma Invoice'
  | 'SGS Assay Certificate'
  | 'Bill of Lading'
  | 'Certificate of Origin'
  | 'Phytosanitary Certificate'
  | 'Form NXP / NESS Clearance'
  | TradeDocumentType;

export type TradeDocStatus =
  | 'Verified'
  | 'Approved'
  | 'Pending Review'
  | 'Pending Countersignature'
  | 'Not Approved'
  | 'Archived';

export type ReviewDecisionBucket = 'approved' | 'pending' | 'not_approved';

export function getRfqReviewCategory(status: RfqStatus): ReviewDecisionBucket {
  if (status === 'Not Approved') return 'not_approved';
  if (status === 'Submitted' || status === 'Under Executive Review') return 'pending';
  return 'approved';
}

export function getDocReviewCategory(
  status: TradeDocStatus
): ReviewDecisionBucket | 'archived' {
  if (status === 'Archived') return 'archived';
  if (status === 'Not Approved') return 'not_approved';
  if (status === 'Pending Review' || status === 'Pending Countersignature') {
    return 'pending';
  }
  return 'approved';
}

export type AlertCategory = 'Critical Minerals' | 'Agro-Commodities' | 'Lubricants';
export type AlertTriggerDirection = 'below' | 'above' | 'pct_change';
export type AlertChannel = 'email' | 'email_whatsapp';
export type AlertStatus = 'Active' | 'Paused';

export interface BuyerProfileDoc {
  buyerUid: string;
  companyName: string;
  contactName: string;
  email: string;
  defaultPort: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface AdminBuyerDoc {
  id: string;
  ownerUid?: string;
  buyerUid?: string;
  rankId?: number;
  normalizedCompanyKey?: string;
  companyName: string;
  contactName?: string;
  email?: string;
  defaultPort?: string;
  leadCategory?: LeadCategory;
  regionCode?: TradeRegion;
  crmStage?: CrmStage;
  outreachStatus?: OutreachStatus;
  priorityScore?: number;
  priorityTier?: PriorityTier;
  targetFobValue?: number;
  lastUpdatedMillis?: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface BuyerRfqDoc {
  id: string;
  buyerUid: string;
  refId: string;
  leadRankId?: number;
  companyName: string;
  contactName: string;
  corporateEmail: string;
  destinationPort: string;
  commoditySummary: string;
  productDescription?: string;
  targetVolume: string;
  quantityMt?: number;
  unitPriceUsd?: number;
  totalValueUsd?: number;
  incoterm: IncotermCode;
  paymentTerms: string;
  validityDays?: number;
  specifications?: string;
  status: RfqStatus;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAtMillis?: number;
  estimatedValueUsd?: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface BuyerShipmentDoc {
  id: string;
  buyerUid: string;
  trackingCode: string;
  rfqRefId: string;
  leadRankId?: number;
  companyName?: string;
  commodity: string;
  originPort: string;
  destinationPort: string;
  vesselName: string;
  vesselOrContainerRef?: string;
  billOfLadingNo: string;
  containerAllocation: string;
  sgsInspectionStatus?: string;
  stageIndex: number;
  status: ShipmentStatus;
  etaDate: string;
  lastUpdateNote: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface TradeDocumentDoc {
  id: string;
  buyerUid: string;
  docCode: string;
  referenceNo?: string;
  title: string;
  docType: TradeDocType;
  rfqRefId: string;
  leadRankId?: number;
  counterpartyCompany?: string;
  commodity: string;
  issuer: string;
  issuedDate: string;
  status: TradeDocStatus;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAtMillis?: number;
  incoterm?: IncotermCode;
  totalValue?: number;
  createdAtMillis?: number;
  summaryText: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface NewRfqInput {
  refId: string;
  companyName: string;
  contactName: string;
  corporateEmail: string;
  destinationPort: string;
  commoditySummary: string;
  targetVolume: string;
  incoterm: IncotermCode;
  paymentTerms: string;
  specifications?: string;
  estimatedValueUsd?: number;
}

export interface PriceAlertDoc {
  id: string;
  buyerUid: string;
  email: string;
  commodityKey: string;
  commodityLabel: string;
  category: AlertCategory;
  baselinePrice: number;
  unitLabel: string;
  triggerDirection: AlertTriggerDirection;
  thresholdValue: number;
  channel: AlertChannel;
  status: AlertStatus;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface NewPriceAlertInput {
  email: string;
  commodityKey: string;
  commodityLabel: string;
  category: AlertCategory;
  baselinePrice: number;
  unitLabel: string;
  triggerDirection: AlertTriggerDirection;
  thresholdValue: number;
  channel: AlertChannel;
}

export interface BankReadinessDocsState {
  nepcCacVerified: boolean;
  cadastreAssaysVerified: boolean;
  signedOfftakeLoiVerified: boolean;
  sealedProformaVerified: boolean;
}

export interface MarketConfigDoc {
  lithiumRatePerPercentUsd: number;
  lithiumAssayPct: number;
  agroIssueDate: string;
  lubricantIssueDate: string;
  quoteValidityDays: number;
  fxNgnPerUsd: number;
  fxXofPerUsd: number;
  adminNotice: string;
  companyName: string;
  domain: string;
  ceoName: string;
  ceoEmail: string;
  primaryMineralAsset: string;
  miningCadastreId: string;
  miningLocation: string;
  assayRefPrimary: string;
  assayRefSecondary: string;
  activeSupplyCorridors: string;
  multiCommodityCapabilities: string;
  bankReadinessDocs: BankReadinessDocsState;
  updatedByUid?: string;
  updatedAt?: Timestamp | null;
}

export type MarketConfigInput = {
  lithiumRatePerPercentUsd: number;
  lithiumAssayPct: number;
  agroIssueDate: string;
  lubricantIssueDate: string;
  quoteValidityDays: number;
  fxNgnPerUsd: number;
  fxXofPerUsd: number;
  adminNotice: string;
  companyName?: string;
  domain?: string;
  ceoName?: string;
  ceoEmail?: string;
  primaryMineralAsset?: string;
  miningCadastreId?: string;
  miningLocation?: string;
  assayRefPrimary?: string;
  assayRefSecondary?: string;
  activeSupplyCorridors?: string;
  multiCommodityCapabilities?: string;
  bankReadinessDocs?: BankReadinessDocsState;
};

export interface AdminCreateShipmentInput {
  buyerUid: string;
  trackingCode: string;
  rfqRefId: string;
  leadRankId?: number;
  companyName?: string;
  commodity: string;
  originPort: string;
  destinationPort: string;
  vesselName: string;
  billOfLadingNo: string;
  containerAllocation: string;
  sgsInspectionStatus?: string;
  stageIndex: number;
  status: ShipmentStatus;
  etaDate: string;
  lastUpdateNote: string;
}

export interface AdminCreateTradeDocInput {
  buyerUid: string;
  docCode: string;
  referenceNo?: string;
  title: string;
  docType: TradeDocType;
  rfqRefId: string;
  leadRankId?: number;
  counterpartyCompany?: string;
  commodity: string;
  issuer: string;
  issuedDate: string;
  status: TradeDocStatus;
  incoterm?: IncotermCode;
  totalValue?: number;
  summaryText: string;
}

export type CrmSegment = 'Offtaker' | 'Broker' | 'Supplier' | 'Logistics' | 'VIP';
export type CrmSource =
  | 'Manual'
  | 'Companion App'
  | 'Website RFQ'
  | 'Price Alert'
  | 'Direct Inquiry';
export type CrmLeadStage =
  | 'New Lead'
  | 'Qualified'
  | 'Proposal / SCO Sent'
  | 'Negotiation'
  | 'Won / Contracted'
  | 'Lost / Archived';
export type CrmPriority = 'High' | 'Medium' | 'Low';
export type CrmEmailDirection = 'Outbound' | 'Inbound' | 'Draft';
export type CrmEmailStatus = 'Sent' | 'Received' | 'Scheduled' | 'Draft';

export interface CrmContactDoc {
  id: string;
  ownerUid: string;
  leadRankId?: number;
  normalizedCompanyKey?: string;
  fullName: string;
  companyName: string;
  roleTitle: string;
  email: string;
  directEmail?: string;
  phoneWhatsapp: string;
  countryPort: string;
  websiteUrl?: string;
  segment: CrmSegment;
  tagsSummary: string;
  notes: string;
  source: CrmSource;
  lastUpdatedMillis?: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface CrmLeadDoc {
  id: string;
  ownerUid: string;
  rankId?: number;
  normalizedCompanyKey?: string;
  leadCategory?: LeadCategory;
  regionCode?: TradeRegion;
  location?: string;
  primaryRole?: string;
  priorityScore?: number;
  priorityTier?: PriorityTier;
  fitScore?: number;
  procScore?: number;
  finScore?: number;
  dmScore?: number;
  esgScore?: number;
  volScore?: number;
  decisionMaker?: string;
  title: string;
  contactId: string;
  contactName: string;
  companyName: string;
  email: string;
  generalEmail?: string;
  directEmail?: string;
  emailRouteNote?: string;
  phoneWhatsapp: string;
  whatsappNumber?: string;
  websiteUrl?: string;
  websiteDisplay?: string;
  profileSource?: string;
  operationalFit?: string;
  emailSubject?: string;
  emailBody?: string;
  linkedInNote?: string;
  commodityInterest: string;
  outreachStatus?: OutreachStatus;
  crmStage?: CrmStage;
  winProbability?: number;
  estimatedTonnage?: number;
  targetFobValue?: number;
  impliedFobPricePerMt?: number;
  weightedValueUsd?: number;
  followUpAtMillis?: number;
  nextAction?: string;
  tags?: string;
  lostReason?: string;
  isRiskWatch?: boolean;
  isCustomLead?: boolean;
  leadSource?: string;
  lastUpdatedMillis?: number;
  stage: CrmLeadStage;
  priority: CrmPriority;
  dealValueUsd: number;
  followUpDate: string;
  source: CrmSource;
  notes: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface CrmEmailDoc {
  id: string;
  ownerUid: string;
  leadRankId?: number;
  activityType?: CrmActivityType;
  outcome?: string;
  summary?: string;
  quoteAmountUsd?: number;
  createdAtMillis?: number;
  direction: CrmEmailDirection;
  toEmail: string;
  fromEmail: string;
  contactName: string;
  companyName: string;
  leadId: string;
  subject: string;
  body: string;
  status: CrmEmailStatus;
  sentDate: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface CrmTaskDoc {
  id: string;
  ownerUid: string;
  leadRankId: number;
  companyName: string;
  title: string;
  priority: TaskPriority;
  dueAtMillis: number;
  isCompleted: boolean;
  completedAtMillis?: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface AdminCrmContactInput {
  fullName: string;
  companyName: string;
  roleTitle: string;
  email: string;
  directEmail?: string;
  phoneWhatsapp: string;
  countryPort: string;
  websiteUrl?: string;
  segment: CrmSegment;
  tagsSummary: string;
  notes: string;
  source?: CrmSource;
}

export interface AdminCrmLeadInput {
  title: string;
  contactId?: string;
  contactName: string;
  companyName: string;
  email: string;
  phoneWhatsapp: string;
  commodityInterest: string;
  stage: CrmLeadStage;
  priority: CrmPriority;
  dealValueUsd: number;
  followUpDate: string;
  source?: CrmSource;
  notes: string;
}

export interface AdminCrmEmailInput {
  direction: CrmEmailDirection;
  toEmail: string;
  fromEmail?: string;
  contactName: string;
  companyName: string;
  leadId?: string;
  leadRankId?: number;
  activityType?: CrmActivityType;
  outcome?: string;
  summary?: string;
  quoteAmountUsd?: number;
  subject: string;
  body: string;
  status: CrmEmailStatus;
  sentDate: string;
}

export interface ExecutiveKpiSummary {
  totalWeightedUsd: number;
  closedWonUsd: number;
  openTasksCount: number;
  overdueTasksCount: number;
  quotesSentCount: number;
  activeDealsCount: number;
  totalPipelineUsd: number;
}

export const DEFAULT_MARKET_CONFIG: MarketConfigDoc = {
  lithiumRatePerPercentUsd: LITHIUM_RATE_PER_PERCENT_USD,
  lithiumAssayPct: LITHIUM_ASSAY_GRADE_PCT,
  agroIssueDate: '2026/11/15',
  lubricantIssueDate: '2026/11/14',
  quoteValidityDays: 10,
  fxNgnPerUsd: 1390,
  fxXofPerUsd: 584.46,
  adminNotice: '',
  companyName: 'Ahzan Tech Ltd',
  domain: 'ahzantechltd.com',
  ceoName: 'Abdulganiyu Hamza',
  ceoEmail: 'abdoul@ahzantechltd.com',
  primaryMineralAsset: 'Nigerian Lithium-Bearing Ore (Spodumene / Lepidolite) — 4.61% Li2O',
  miningCadastreId: 'EL No. 65197',
  miningLocation: 'Jega LGA, Kebbi State, Nigeria',
  assayRefPrimary: 'Zuma Gani Mining Assay No. ZMGN057',
  assayRefSecondary: 'Foshan Ceramics Research Institute Testing No. Q38625/H260715-164',
  activeSupplyCorridors:
    'West & Central Africa (+227 Niger, +226 Burkina Faso, +223 Mali, +234 Nigeria, +233 Ghana, +225 Cote dIvoire, +221/+229/+228 Senegal/Benin/Togo), Europe (DE/UK/FR/NL/CH/NO/FI/ES/IT), Asia-Pacific (TW +886, JP +81, KR, MY +60, SG +65)',
  multiCommodityCapabilities:
    'Factory-direct sourcing, building materials, solar/power hardware, FLYSAK automotive lubricants, home/kitchen appliances, cookware, packaging, and Nigerian agro-food exports.',
  bankReadinessDocs: {
    nepcCacVerified: true,
    cadastreAssaysVerified: true,
    signedOfftakeLoiVerified: false,
    sealedProformaVerified: false,
  },
  updatedAt: null,
};

export function mapCrmStageToLegacyStage(stage: CrmStage): CrmLeadStage {
  switch (stage) {
    case 'PROSPECT':
    case 'CONTACTED':
      return 'New Lead';
    case 'QUALIFIED':
      return 'Qualified';
    case 'PROPOSAL_QUOTE':
      return 'Proposal / SCO Sent';
    case 'NEGOTIATION':
      return 'Negotiation';
    case 'WON':
      return 'Won / Contracted';
    case 'LOST':
      return 'Lost / Archived';
  }
}

export function mapLegacyStageToCrmStage(stage: CrmLeadStage): CrmStage {
  switch (stage) {
    case 'New Lead':
      return 'PROSPECT';
    case 'Qualified':
      return 'QUALIFIED';
    case 'Proposal / SCO Sent':
      return 'PROPOSAL_QUOTE';
    case 'Negotiation':
      return 'NEGOTIATION';
    case 'Won / Contracted':
      return 'WON';
    case 'Lost / Archived':
      return 'LOST';
  }
}

export function mapTierToLegacyPriority(tier: PriorityTier): CrmPriority {
  if (tier === 'A') return 'High';
  if (tier === 'B') return 'Medium';
  return 'Low';
}

function isValidEmailStr(val?: string): boolean {
  if (!val) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

function ensureLeadValidEmail(record: LithiumIntelRecord): string {
  if (isValidEmailStr(record.directEmail)) return record.directEmail.trim().toLowerCase().slice(0, 160);
  if (isValidEmailStr(record.generalEmail)) return record.generalEmail.trim().toLowerCase().slice(0, 160);
  const slug = (record.normalizedCompanyKey || normalizeCompanyKey(record.companyName) || 'partner')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 24) || 'partner';
  return `trade@${slug}.ahzanprospect.com`;
}

function getMillis(ts?: Timestamp | null): number {
  if (!ts || typeof ts.toMillis !== 'function') return 0;
  return ts.toMillis();
}

function sanitizeIdPart(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned.length > 0 ? cleaned.slice(0, 24) : 'buyer';
}

function buildLeadPayloadForFirestore(
  record: LithiumIntelRecord,
  ownerUid: string
): Record<string, unknown> {
  const normKey = record.normalizedCompanyKey || normalizeCompanyKey(record.companyName);
  const winProb =
    typeof record.winProbability === 'number'
      ? Math.min(100, Math.max(0, Math.round(record.winProbability)))
      : STAGE_WIN_PROBABILITY[record.crmStage] ?? 15;
  const estTonnage = Math.max(0, Number(record.estimatedTonnage || 0));
  const targetFob = Math.max(0, Math.round(record.targetFobValue || 0));
  const impliedPrice =
    estTonnage > 0 ? Number((targetFob / estTonnage).toFixed(2)) : Number(record.impliedFobPricePerMt || 0);
  const weightedUsd = Math.round((targetFob * winProb) / 100);
  const priorityScore = Math.min(100, Math.max(0, Math.round(record.priorityScore || 75)));
  const priorityTier = computePriorityTier(priorityScore);
  const followUpDate = record.followUpAtMillis
    ? new Date(record.followUpAtMillis).toISOString().slice(0, 10)
    : new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

  return {
    ownerUid,
    rankId: Math.min(999999, Math.max(1, Math.round(record.rankId || 1001))),
    normalizedCompanyKey: normKey.slice(0, 120),
    leadCategory: record.leadCategory,
    regionCode: record.regionCode.slice(0, 64),
    location: (record.location || 'International').slice(0, 160),
    primaryRole: (record.primaryRole || 'Trade Partner').slice(0, 160),
    priorityScore,
    priorityTier,
    fitScore: Math.min(25, Math.max(0, Math.round(record.fitScore || 18))),
    procScore: Math.min(25, Math.max(0, Math.round(record.procScore || 18))),
    finScore: Math.min(15, Math.max(0, Math.round(record.finScore || 12))),
    dmScore: Math.min(15, Math.max(0, Math.round(record.dmScore || 11))),
    esgScore: Math.min(10, Math.max(0, Math.round(record.esgScore || 8))),
    volScore: Math.min(10, Math.max(0, Math.round(record.volScore || 8))),
    decisionMaker: (record.decisionMaker || 'Procurement Desk').slice(0, 120),
    title: `${record.companyName} — ${record.primaryRole || record.leadCategory}`.slice(0, 180),
    contactId: '',
    contactName: (record.decisionMaker || 'Procurement Director').trim().slice(0, 120) || 'Procurement Desk',
    companyName: record.companyName.trim().slice(0, 160) || 'Trade Counterparty',
    email: ensureLeadValidEmail(record),
    generalEmail: (record.generalEmail || '').slice(0, 160),
    directEmail: (record.directEmail || '').slice(0, 160),
    emailRouteNote: (record.emailRouteNote || '').slice(0, 200),
    phoneWhatsapp: (record.whatsappNumber || '').slice(0, 60),
    whatsappNumber: (record.whatsappNumber || '').slice(0, 60),
    websiteUrl: (record.websiteUrl || '').slice(0, 240),
    websiteDisplay: (record.websiteDisplay || '').slice(0, 160),
    profileSource: (record.profileSource || 'Lithium Intel Catalog').slice(0, 120),
    operationalFit: (record.operationalFit || '').slice(0, 1000),
    emailSubject: (record.emailSubject || '').slice(0, 240),
    emailBody: (record.emailBody || '').slice(0, 4000),
    linkedInNote: (record.linkedInNote || '').slice(0, 500),
    commodityInterest: (record.primaryRole || record.leadCategory || 'Lithium Ore').slice(0, 200),
    outreachStatus: record.outreachStatus,
    crmStage: record.crmStage,
    winProbability: winProb,
    estimatedTonnage: estTonnage,
    targetFobValue: targetFob,
    impliedFobPricePerMt: impliedPrice,
    weightedValueUsd: weightedUsd,
    followUpAtMillis: record.followUpAtMillis || Date.now() + 3 * 86400000,
    nextAction: (record.nextAction || '').slice(0, 240),
    tags: (record.tags || '').slice(0, 300),
    lostReason: (record.lostReason || '').slice(0, 300),
    isRiskWatch: Boolean(record.isRiskWatch),
    isCustomLead: Boolean(record.isCustomLead),
    leadSource: (record.leadSource || 'Lithium Intel Seed').slice(0, 120),
    lastUpdatedMillis: record.lastUpdatedMillis || Date.now(),
    stage: mapCrmStageToLegacyStage(record.crmStage),
    priority: mapTierToLegacyPriority(priorityTier),
    dealValueUsd: Math.min(1000000000, targetFob),
    followUpDate,
    source: record.isCustomLead ? ('Manual' as CrmSource) : ('Companion App' as CrmSource),
    notes: (record.notes || record.operationalFit || '').slice(0, 1500),
  };
}

function cloudDocToLithiumRecord(docItem: CrmLeadDoc, fallbackRank: number): LithiumIntelRecord {
  const crmStage: CrmStage = docItem.crmStage || mapLegacyStageToCrmStage(docItem.stage);
  const winProb =
    typeof docItem.winProbability === 'number'
      ? docItem.winProbability
      : STAGE_WIN_PROBABILITY[crmStage];
  const targetFob =
    typeof docItem.targetFobValue === 'number'
      ? docItem.targetFobValue
      : docItem.dealValueUsd || 0;
  const estTonnage = typeof docItem.estimatedTonnage === 'number' ? docItem.estimatedTonnage : 100;
  const score =
    typeof docItem.priorityScore === 'number'
      ? docItem.priorityScore
      : docItem.priority === 'High'
        ? 85
        : docItem.priority === 'Medium'
          ? 70
          : 55;
  const tier = docItem.priorityTier || computePriorityTier(score);

  return {
    id: docItem.id,
    rankId: typeof docItem.rankId === 'number' ? docItem.rankId : fallbackRank,
    companyName: docItem.companyName,
    normalizedCompanyKey:
      docItem.normalizedCompanyKey || normalizeCompanyKey(docItem.companyName),
    leadCategory: docItem.leadCategory || 'LITHIUM',
    regionCode: docItem.regionCode || 'ASIA_PACIFIC',
    location: docItem.location || 'International',
    primaryRole: docItem.primaryRole || docItem.commodityInterest || 'Trade Counterparty',
    priorityScore: score,
    priorityTier: tier,
    fitScore: docItem.fitScore ?? Math.round(score * 0.25),
    procScore: docItem.procScore ?? Math.round(score * 0.25),
    finScore: docItem.finScore ?? Math.round(score * 0.15),
    dmScore: docItem.dmScore ?? Math.round(score * 0.15),
    esgScore: docItem.esgScore ?? Math.round(score * 0.1),
    volScore: docItem.volScore ?? Math.round(score * 0.1),
    decisionMaker: docItem.decisionMaker || docItem.contactName,
    title: docItem.title || 'Trade Lead',
    generalEmail: docItem.generalEmail || docItem.email,
    directEmail: docItem.directEmail || docItem.email,
    emailRouteNote: docItem.emailRouteNote || '',
    whatsappNumber: docItem.whatsappNumber || docItem.phoneWhatsapp || '',
    websiteUrl: docItem.websiteUrl || '',
    websiteDisplay: docItem.websiteDisplay || '',
    profileSource: docItem.profileSource || docItem.source || 'Cloud CRM',
    operationalFit: docItem.operationalFit || docItem.notes || '',
    emailSubject: docItem.emailSubject || `Ahzan Tech Ltd · ${docItem.companyName}`,
    emailBody: docItem.emailBody || docItem.notes || '',
    linkedInNote: docItem.linkedInNote || '',
    outreachStatus: docItem.outreachStatus || 'READY',
    crmStage,
    winProbability: winProb,
    estimatedTonnage: estTonnage,
    targetFobValue: targetFob,
    impliedFobPricePerMt:
      typeof docItem.impliedFobPricePerMt === 'number'
        ? docItem.impliedFobPricePerMt
        : estTonnage > 0
          ? Number((targetFob / estTonnage).toFixed(2))
          : 0,
    weightedValueUsd:
      typeof docItem.weightedValueUsd === 'number'
        ? docItem.weightedValueUsd
        : Math.round((targetFob * winProb) / 100),
    followUpAtMillis:
      docItem.followUpAtMillis ||
      (docItem.followUpDate ? new Date(docItem.followUpDate).getTime() : Date.now() + 3 * 86400000),
    nextAction: docItem.nextAction || 'Review dossier & send SCO',
    tags: docItem.tags || docItem.commodityInterest || '',
    lostReason: docItem.lostReason || '',
    notes: docItem.notes || '',
    isRiskWatch: Boolean(docItem.isRiskWatch),
    isCustomLead: docItem.isCustomLead ?? (docItem.rankId ? docItem.rankId >= 1001 : true),
    leadSource: docItem.leadSource || docItem.source || 'Cloud Firestore',
    lastUpdatedMillis:
      docItem.lastUpdatedMillis || getMillis(docItem.updatedAt) || Date.now(),
    syncedInCloud: true,
  };
}

interface BuyerAuthContextValue {
  user: User | null;
  isAdminUser: boolean;
  authReady: boolean;
  signingIn: boolean;
  authError: string | null;
  dataLoading: boolean;
  dataError: string | null;
  profile: BuyerProfileDoc | null;
  rfqs: BuyerRfqDoc[];
  shipments: BuyerShipmentDoc[];
  tradeDocuments: TradeDocumentDoc[];
  priceAlerts: PriceAlertDoc[];
  allRfqs: BuyerRfqDoc[];
  allShipments: BuyerShipmentDoc[];
  allTradeDocuments: TradeDocumentDoc[];
  allPriceAlerts: PriceAlertDoc[];
  allBuyers: AdminBuyerDoc[];
  crmContacts: CrmContactDoc[];
  crmLeads: CrmLeadDoc[];
  crmEmails: CrmEmailDoc[];
  crmTasks: CrmTaskDoc[];
  marketConfig: MarketConfigDoc;
  canonicalProfile: CanonicalCompanyConfig;
  unifiedTradeBook: LithiumIntelRecord[];
  duplicateAudit: DuplicateAuditSummary;
  crmActivities: CrmActivityRecord[];
  kpiSummary: ExecutiveKpiSummary;
  lastSyncedAt: Date | null;
  signInWithGoogle: () => Promise<User | null>;
  signOutBuyer: () => Promise<void>;
  saveNewRfqToFirestore: (input: NewRfqInput) => Promise<void>;
  createPriceAlert: (input: NewPriceAlertInput, explicitUser?: User) => Promise<void>;
  togglePriceAlertStatus: (alertId: string, nextStatus: AlertStatus) => Promise<void>;
  deletePriceAlert: (alertId: string) => Promise<void>;
  updateBuyerProfile: (updates: {
    companyName: string;
    contactName: string;
    defaultPort: string;
  }) => Promise<void>;
  updateRfqDetails: (
    rfqId: string,
    updates: {
      destinationPort: string;
      targetVolume: string;
      specifications: string;
    }
  ) => Promise<void>;
  appendShipmentNote: (shipmentId: string, note: string) => Promise<void>;
  archiveTradeDocument: (docId: string) => Promise<void>;
  adminUpdateRfqStatus: (rfqId: string, status: RfqStatus) => Promise<void>;
  adminReviewRfq: (
    rfqId: string,
    status: RfqStatus,
    reviewNote?: string
  ) => Promise<void>;
  adminUpdateRfq: (
    rfqId: string,
    updates: {
      status: RfqStatus;
      destinationPort: string;
      targetVolume: string;
      specifications: string;
      reviewNote?: string;
      estimatedValueUsd?: number;
    }
  ) => Promise<void>;
  adminDeleteRfq: (rfqId: string) => Promise<void>;
  adminCreateShipment: (input: AdminCreateShipmentInput) => Promise<void>;
  adminUpdateShipmentStage: (
    shipmentId: string,
    updates: {
      stageIndex: number;
      status: ShipmentStatus;
      lastUpdateNote: string;
    }
  ) => Promise<void>;
  adminUpdateShipmentDetails: (
    shipmentId: string,
    updates: {
      stageIndex: number;
      status: ShipmentStatus;
      vesselName: string;
      billOfLadingNo: string;
      containerAllocation: string;
      etaDate: string;
      lastUpdateNote: string;
    }
  ) => Promise<void>;
  adminDeleteShipment: (shipmentId: string) => Promise<void>;
  adminCreateTradeDocument: (input: AdminCreateTradeDocInput) => Promise<void>;
  adminVerifyTradeDocument: (docId: string) => Promise<void>;
  adminReviewTradeDocument: (
    docId: string,
    status: TradeDocStatus,
    reviewNote?: string
  ) => Promise<void>;
  adminUpdateTradeDocument: (
    docId: string,
    updates: {
      status: TradeDocStatus;
      summaryText: string;
      reviewNote?: string;
    }
  ) => Promise<void>;
  adminDeleteTradeDocument: (docId: string) => Promise<void>;
  adminSaveMarketConfig: (input: MarketConfigInput) => Promise<void>;
  adminToggleBankReadiness: (key: keyof BankReadinessDocsState) => Promise<void>;
  adminCreateCrmContact: (input: AdminCrmContactInput) => Promise<string | null>;
  adminUpdateCrmContact: (
    contactId: string,
    updates: Omit<AdminCrmContactInput, 'source'>
  ) => Promise<void>;
  adminDeleteCrmContact: (contactId: string) => Promise<void>;
  adminCreateCrmLead: (input: AdminCrmLeadInput) => Promise<string | null>;
  adminUpdateCrmLead: (
    leadId: string,
    updates: Omit<AdminCrmLeadInput, 'source'>
  ) => Promise<void>;
  adminDeleteCrmLead: (leadId: string) => Promise<void>;
  adminCreateCrmEmail: (input: AdminCrmEmailInput) => Promise<void>;
  adminUpdateCrmEmail: (
    emailId: string,
    updates: Omit<AdminCrmEmailInput, 'fromEmail'>
  ) => Promise<void>;
  adminDeleteCrmEmail: (emailId: string) => Promise<void>;
  adminSyncWebActivityToCrm: () => Promise<{ contactsAdded: number; leadsAdded: number }>;
  // Lithium Intel Two-Way Command Center Actions
  adminUpsertIntelLead: (record: LithiumIntelRecord) => Promise<string | null>;
  adminMoveLeadStage: (
    record: LithiumIntelRecord,
    nextStage: CrmStage,
    lostReason?: string
  ) => Promise<void>;
  adminLogActivity: (input: {
    leadRankId: number;
    leadId?: string;
    companyName: string;
    contactName?: string;
    toEmail?: string;
    activityType: CrmActivityType;
    outcome: string;
    summary: string;
    quoteAmountUsd?: number;
  }) => Promise<void>;
  adminCreateTask: (input: {
    leadRankId: number;
    companyName: string;
    title: string;
    priority: TaskPriority;
    dueAtMillis: number;
  }) => Promise<void>;
  adminToggleTask: (taskId: string, isCompleted: boolean) => Promise<void>;
  adminRescheduleTask: (taskId: string, dueAtMillis: number) => Promise<void>;
  adminDeleteTask: (taskId: string) => Promise<void>;
  adminImportAndroidRecords: (
    records: LithiumIntelRecord[],
    activities?: CrmActivityRecord[],
    tasks?: CrmTaskRecord[],
    marketUpdates?: Partial<MarketConfigInput>
  ) => Promise<{ insertedCount: number; updatedCount: number; skippedOlderCount: number }>;
  adminImportCsvRecords: (options: {
    scope: 'leads' | 'buyers' | 'both';
    records: LithiumIntelRecord[];
  }) => Promise<{
    leadsWritten: number;
    buyersWritten: number;
    insertedCount: number;
    updatedCount: number;
    skippedOlderCount: number;
  }>;
  adminTestFirestoreConnection: () => Promise<{
    ok: boolean;
    latencyMs: number;
    serverTimeIso: string;
    error?: string;
  }>;
  adminSyncSeedCatalogToCloud: () => Promise<{ syncedCount: number }>;
  adminIssueTradeDocument: (input: AdminCreateTradeDocInput) => Promise<void>;
  adminCreateRfqFromLead: (input: {
    lead: LithiumIntelRecord;
    productDescription: string;
    quantityMt: number;
    unitPriceUsd: number;
    incoterm: IncotermCode;
    paymentTerms: string;
    validityDays: number;
    destinationPort: string;
    specifications?: string;
  }) => Promise<string>;
}

const ADMIN_EMAILS = [
  'abdoulganeey@gmail.com',
  'ahzantechltd@gmail.com',
  'abdoul@ahzantechltd.com',
];

const BuyerAuthContext = createContext<BuyerAuthContextValue | null>(null);

export function BuyerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [profile, setProfile] = useState<BuyerProfileDoc | null>(null);
  const [rfqs, setRfqs] = useState<BuyerRfqDoc[]>([]);
  const [shipments, setShipments] = useState<BuyerShipmentDoc[]>([]);
  const [tradeDocuments, setTradeDocuments] = useState<TradeDocumentDoc[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlertDoc[]>([]);

  const [allRfqs, setAllRfqs] = useState<BuyerRfqDoc[]>([]);
  const [allShipments, setAllShipments] = useState<BuyerShipmentDoc[]>([]);
  const [allTradeDocuments, setAllTradeDocuments] = useState<TradeDocumentDoc[]>([]);
  const [allPriceAlerts, setAllPriceAlerts] = useState<PriceAlertDoc[]>([]);
  const [allBuyers, setAllBuyers] = useState<AdminBuyerDoc[]>([]);
  const [crmContacts, setCrmContacts] = useState<CrmContactDoc[]>([]);
  const [crmLeads, setCrmLeads] = useState<CrmLeadDoc[]>([]);
  const [crmEmails, setCrmEmails] = useState<CrmEmailDoc[]>([]);
  const [crmTasks, setCrmTasks] = useState<CrmTaskDoc[]>([]);
  const [marketConfig, setMarketConfig] = useState<MarketConfigDoc>(DEFAULT_MARKET_CONFIG);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const seededUidRef = useRef<string | null>(null);

  const isAdminUser = Boolean(
    user?.emailVerified &&
      user.email &&
      ADMIN_EMAILS.includes(user.email.toLowerCase())
  );

  // Sync public non-PII market benchmarks & canonical identity from /siteConfig/market
  useEffect(() => {
    const configRef = doc(db, 'siteConfig', 'market');
    const unsubConfig = onSnapshot(
      configRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<MarketConfigDoc>;
          setMarketConfig({
            lithiumRatePerPercentUsd:
              typeof data.lithiumRatePerPercentUsd === 'number'
                ? data.lithiumRatePerPercentUsd
                : DEFAULT_MARKET_CONFIG.lithiumRatePerPercentUsd,
            lithiumAssayPct:
              typeof data.lithiumAssayPct === 'number'
                ? data.lithiumAssayPct
                : DEFAULT_MARKET_CONFIG.lithiumAssayPct,
            agroIssueDate:
              typeof data.agroIssueDate === 'string' && data.agroIssueDate.length >= 4
                ? data.agroIssueDate
                : DEFAULT_MARKET_CONFIG.agroIssueDate,
            lubricantIssueDate:
              typeof data.lubricantIssueDate === 'string' && data.lubricantIssueDate.length >= 4
                ? data.lubricantIssueDate
                : DEFAULT_MARKET_CONFIG.lubricantIssueDate,
            quoteValidityDays:
              typeof data.quoteValidityDays === 'number'
                ? data.quoteValidityDays
                : DEFAULT_MARKET_CONFIG.quoteValidityDays,
            fxNgnPerUsd:
              typeof data.fxNgnPerUsd === 'number'
                ? data.fxNgnPerUsd
                : DEFAULT_MARKET_CONFIG.fxNgnPerUsd,
            fxXofPerUsd:
              typeof data.fxXofPerUsd === 'number'
                ? data.fxXofPerUsd
                : DEFAULT_MARKET_CONFIG.fxXofPerUsd,
            adminNotice:
              typeof data.adminNotice === 'string'
                ? data.adminNotice
                : DEFAULT_MARKET_CONFIG.adminNotice,
            companyName: data.companyName || DEFAULT_MARKET_CONFIG.companyName,
            domain: data.domain || DEFAULT_MARKET_CONFIG.domain,
            ceoName: data.ceoName || DEFAULT_MARKET_CONFIG.ceoName,
            ceoEmail: data.ceoEmail || DEFAULT_MARKET_CONFIG.ceoEmail,
            primaryMineralAsset:
              data.primaryMineralAsset || DEFAULT_MARKET_CONFIG.primaryMineralAsset,
            miningCadastreId:
              data.miningCadastreId || DEFAULT_MARKET_CONFIG.miningCadastreId,
            miningLocation:
              data.miningLocation || DEFAULT_MARKET_CONFIG.miningLocation,
            assayRefPrimary:
              data.assayRefPrimary || DEFAULT_MARKET_CONFIG.assayRefPrimary,
            assayRefSecondary:
              data.assayRefSecondary || DEFAULT_MARKET_CONFIG.assayRefSecondary,
            activeSupplyCorridors:
              data.activeSupplyCorridors || DEFAULT_MARKET_CONFIG.activeSupplyCorridors,
            multiCommodityCapabilities:
              data.multiCommodityCapabilities ||
              DEFAULT_MARKET_CONFIG.multiCommodityCapabilities,
            bankReadinessDocs: {
              ...DEFAULT_MARKET_CONFIG.bankReadinessDocs,
              ...(data.bankReadinessDocs || {}),
            },
            updatedByUid: data.updatedByUid,
            updatedAt: data.updatedAt ?? null,
          });
          setLastSyncedAt(new Date());
        }
      },
      () => {
        // Fallback silently to defaults
      }
    );
    return () => unsubConfig();
  }, []);

  // Listen for Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        void nextUser
          .getIdToken()
          .then((token) =>
            fetch('/api/sql/me', {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })
          )
          .catch(() => {
            // Silent when running on static hosting or offline
          });
      } else {
        setProfile(null);
        setRfqs([]);
        setShipments([]);
        setTradeDocuments([]);
        setPriceAlerts([]);
        setAllRfqs([]);
        setAllShipments([]);
        setAllTradeDocuments([]);
        setAllPriceAlerts([]);
        setAllBuyers([]);
        setCrmContacts([]);
        setCrmLeads([]);
        setCrmEmails([]);
        setCrmTasks([]);
        setDataError(null);
        seededUidRef.current = null;
      }
    });
    return () => unsub();
  }, []);

  const seedStarterBuyerPortfolio = useCallback(async (currentUser: User) => {
    if (!currentUser.email || seededUidRef.current === currentUser.uid) {
      return;
    }
    seededUidRef.current = currentUser.uid;

    const uid = currentUser.uid;
    const prefix = sanitizeIdPart(uid.slice(0, 10));
    const displayName = (currentUser.displayName || 'Authorized Buyer').slice(0, 120);
    const email = currentUser.email.slice(0, 160);
    const now = serverTimestamp();

    const batch = writeBatch(db);

    batch.set(doc(db, 'buyers', uid), {
      buyerUid: uid,
      companyName: 'Global Commodity Offtake Partner',
      contactName: displayName,
      email,
      defaultPort: 'Rotterdam, NL / Qingdao, CN',
      createdAt: now,
      updatedAt: now,
    });

    const rfq1Id = `rfq-${prefix}-li2o`;
    const rfq2Id = `rfq-${prefix}-agro`;

    batch.set(doc(db, 'rfqs', rfq1Id), {
      buyerUid: uid,
      refId: 'AHT-RFQ-65197A',
      companyName: 'Global Commodity Offtake Partner',
      contactName: displayName,
      corporateEmail: email,
      destinationPort: 'Qingdao, China',
      commoditySummary: 'Lithium Ore (4.61% Li2O @ $207/%) — Ref ZMGN057 & Q38625',
      targetVolume: '54 MT (2 × 20ft FCL)',
      incoterm: 'FOB',
      paymentTerms: 'Irrevocable L/C at Sight (UCP 600)',
      specifications:
        'Contract rate $207 per 1% Li2O ($954.27/MT FOB at 4.61% Li2O). Origin: EL No. 65197 (Jega LGA, Kebbi State). Assays: ZMGN057 & Foshan Q38625/H260715-164.',
      status: 'L/C Confirmed',
      estimatedValueUsd: 51531,
      createdAt: now,
      updatedAt: now,
    });

    batch.set(doc(db, 'rfqs', rfq2Id), {
      buyerUid: uid,
      refId: 'AHT-RFQ-2026B',
      companyName: 'Global Commodity Offtake Partner',
      contactName: displayName,
      corporateEmail: email,
      destinationPort: 'Rotterdam, Netherlands',
      commoditySummary: 'Natural Whitish Sesame Seeds (Machine Cleaned 99/1)',
      targetVolume: '36 MT (2 × 20ft FCL)',
      incoterm: 'CIF',
      paymentTerms: 'T/T 30% Advance / 70% Against B/L & SGS',
      specifications:
        'FOB Lagos benchmark $1,400/MT. Packed in 50 kg new woven PP bags with NAQS Phytosanitary & EU MRL inspection.',
      status: 'SCO / Proforma Issued',
      estimatedValueUsd: 53928,
      createdAt: now,
      updatedAt: now,
    });

    const ship1Id = `ship-${prefix}-01`;
    const ship2Id = `ship-${prefix}-02`;

    batch.set(doc(db, 'shipments', ship1Id), {
      buyerUid: uid,
      trackingCode: 'AHT-SHP-88412',
      rfqRefId: 'AHT-RFQ-65197A',
      commodity: 'Lithium-Bearing Spodumene Ore (4.61% Li2O · EL No. 65197)',
      originPort: 'Apapa Wharf, Lagos (ex-Jega LGA, Kebbi)',
      destinationPort: 'Qingdao, China',
      vesselName: 'MV Atlantic Meridian V.412E',
      billOfLadingNo: 'MAEU-APP-992104',
      containerAllocation: '2 × 20ft FCL (54 MT Net)',
      stageIndex: 4,
      status: 'In Ocean Transit',
      etaDate: '2026-12-14',
      lastUpdateNote:
        'Vessel departed Apapa Terminal after Zuma Gani Assay ZMGN057 / Foshan Q38625 verification and NESS export clearance.',
      createdAt: now,
      updatedAt: now,
    });

    batch.set(doc(db, 'shipments', ship2Id), {
      buyerUid: uid,
      trackingCode: 'AHT-SHP-88439',
      rfqRefId: 'AHT-RFQ-2026B',
      commodity: 'Whitish Sesame Seeds (99/1 Machine Cleaned)',
      originPort: 'Tin Can Island, Lagos',
      destinationPort: 'Rotterdam, Netherlands',
      vesselName: 'CMA CGM West Africa Express',
      billOfLadingNo: 'PENDING-BL-88439',
      containerAllocation: '2 × 20ft FCL (36 MT Net)',
      stageIndex: 2,
      status: 'SGS Assay Verification',
      etaDate: '2026-12-06',
      lastUpdateNote:
        'Bags staged at Tin Can export warehouse; SGS moisture, oil yield (50.4%), and NAQS sampling underway.',
      createdAt: now,
      updatedAt: now,
    });

    const docsSeed: Array<{
      id: string;
      docCode: string;
      title: string;
      docType: TradeDocType;
      rfqRefId: string;
      commodity: string;
      issuer: string;
      issuedDate: string;
      status: TradeDocStatus;
      summaryText: string;
    }> = [
      {
        id: `doc-${prefix}-sgs`,
        docCode: 'ZMGN057-ASSAY',
        title: 'Geochemical ICP-OES Lithium Assay Certificate (4.61% Li2O)',
        docType: 'SGS Assay Certificate',
        rfqRefId: 'AHT-RFQ-65197A',
        commodity: 'Nigerian Spodumene / Lepidolite Ore (EL No. 65197)',
        issuer: 'Zuma Gani Mining / Foshan Ceramics Research Institute',
        issuedDate: '2026-11-08',
        status: 'Verified',
        summaryText:
          'Confirmed Li2O content: 4.61% (ZMGN057 & Q38625/H260715-164) · Rate: US$207 per 1% Li2O ($954.27/MT FOB) · MCO EL No. 65197 (Jega LGA, Kebbi State).',
      },
      {
        id: `doc-${prefix}-bl`,
        docCode: 'MAEU-APP-992104',
        title: 'Clean On-Board Ocean Bill of Lading (2 × 20ft FCL)',
        docType: 'Bill of Lading',
        rfqRefId: 'AHT-RFQ-65197A',
        commodity: 'Lithium Ore (54 MT Jumbo Bags)',
        issuer: 'Maersk Line · Apapa Wharf',
        issuedDate: '2026-11-12',
        status: 'Verified',
        summaryText:
          'Shipper: Ahzan Tech Ltd (RC 2012723) · Port of Loading: Apapa Wharf, Lagos · Port of Discharge: Qingdao, China · Freight: As Per L/C.',
      },
      {
        id: `doc-${prefix}-ness`,
        docCode: 'NESS-NXP-77104',
        title: 'Form NXP & Nigerian Export Supervision Scheme (NESS) Clearance',
        docType: 'Form NXP / NESS Clearance',
        rfqRefId: 'AHT-RFQ-65197A',
        commodity: 'Critical Minerals Lot #65197-EL',
        issuer: 'Central Bank of Nigeria / Cobalt International',
        issuedDate: '2026-11-10',
        status: 'Verified',
        summaryText:
          'Verified Clean Certificate of Inspection (CCI) & non-oil mineral royalty settlement under NEPC Export Licence and FIRS TCC compliance.',
      },
      {
        id: `doc-${prefix}-proforma`,
        docCode: 'AHT-PI-202611',
        title: 'Signed Proforma Invoice — Whitish Sesame Seeds (99/1)',
        docType: 'Proforma Invoice',
        rfqRefId: 'AHT-RFQ-2026B',
        commodity: 'Natural Whitish Sesame Seeds (36 MT)',
        issuer: 'Ahzan Tech Ltd · Executive Trade Desk',
        issuedDate: '2026-11-15',
        status: 'Pending Countersignature',
        summaryText:
          'Quoted per Official 2026-11-15 Price List: US$1,400/MT FOB Lagos (36 MT = $50,400 FOB + CIF Rotterdam adjustment). Settlement: 30/70 T/T or L/C.',
      },
    ];

    for (const d of docsSeed) {
      batch.set(doc(db, 'tradeDocuments', d.id), {
        buyerUid: uid,
        docCode: d.docCode,
        title: d.title,
        docType: d.docType,
        rfqRefId: d.rfqRefId,
        commodity: d.commodity,
        issuer: d.issuer,
        issuedDate: d.issuedDate,
        status: d.status,
        summaryText: d.summaryText,
        createdAt: now,
        updatedAt: now,
      });
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `buyers/${uid}`);
    }
  }, []);

  // Attach real-time Firestore listeners ONLY when auth is ready and user is signed in
  useEffect(() => {
    if (!authReady || !user) return;

    setDataLoading(true);
    setDataError(null);

    const profileRef = doc(db, 'buyers', user.uid);
    const unsubProfile = onSnapshot(
      profileRef,
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as BuyerProfileDoc);
        } else {
          setProfile(null);
          void seedStarterBuyerPortfolio(user).catch((err) => {
            setDataError(
              err instanceof Error
                ? err.message
                : 'Failed to initialize buyer workspace.'
            );
          });
        }
        setDataLoading(false);
      },
      (error) => {
        const msg = logFirestoreError(error, OperationType.GET, `buyers/${user.uid}`);
        setDataError(msg);
        setDataLoading(false);
      }
    );

    const rfqsQuery = query(collection(db, 'rfqs'), where('buyerUid', '==', user.uid));
    const unsubRfqs = onSnapshot(
      rfqsQuery,
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<BuyerRfqDoc, 'id'>) }))
          .sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
        setRfqs(items);
      },
      (error) => {
        setDataError(logFirestoreError(error, OperationType.LIST, 'rfqs'));
      }
    );

    const shipmentsQuery = query(
      collection(db, 'shipments'),
      where('buyerUid', '==', user.uid)
    );
    const unsubShipments = onSnapshot(
      shipmentsQuery,
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<BuyerShipmentDoc, 'id'>) }))
          .sort((a, b) => getMillis(b.updatedAt) - getMillis(a.updatedAt));
        setShipments(items);
      },
      (error) => {
        setDataError(logFirestoreError(error, OperationType.LIST, 'shipments'));
      }
    );

    const docsQuery = query(
      collection(db, 'tradeDocuments'),
      where('buyerUid', '==', user.uid)
    );
    const unsubDocs = onSnapshot(
      docsQuery,
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<TradeDocumentDoc, 'id'>) }))
          .sort((a, b) => b.issuedDate.localeCompare(a.issuedDate));
        setTradeDocuments(items);
      },
      (error) => {
        setDataError(logFirestoreError(error, OperationType.LIST, 'tradeDocuments'));
      }
    );

    const alertsQuery = query(
      collection(db, 'priceAlerts'),
      where('buyerUid', '==', user.uid)
    );
    const unsubAlerts = onSnapshot(
      alertsQuery,
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<PriceAlertDoc, 'id'>) }))
          .sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
        setPriceAlerts(items);
      },
      (error) => {
        setDataError(logFirestoreError(error, OperationType.LIST, 'priceAlerts'));
      }
    );

    // Executive Admin global listeners
    let unsubAdminRfqs = () => {};
    let unsubAdminShipments = () => {};
    let unsubAdminDocs = () => {};
    let unsubAdminAlerts = () => {};
    let unsubAdminBuyers = () => {};
    let unsubCrmContacts = () => {};
    let unsubCrmLeads = () => {};
    let unsubCrmEmails = () => {};
    let unsubCrmTasks = () => {};

    if (isAdminUser) {
      unsubAdminRfqs = onSnapshot(
        collection(db, 'rfqs'),
        (snap) => {
          const items = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<BuyerRfqDoc, 'id'>) }))
            .sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
          setAllRfqs(items);
          setLastSyncedAt(new Date());
        },
        (error) => logFirestoreError(error, OperationType.LIST, 'rfqs (admin)')
      );

      unsubAdminShipments = onSnapshot(
        collection(db, 'shipments'),
        (snap) => {
          const items = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<BuyerShipmentDoc, 'id'>) }))
            .sort((a, b) => getMillis(b.updatedAt) - getMillis(a.updatedAt));
          setAllShipments(items);
          setLastSyncedAt(new Date());
        },
        (error) => logFirestoreError(error, OperationType.LIST, 'shipments (admin)')
      );

      unsubAdminDocs = onSnapshot(
        collection(db, 'tradeDocuments'),
        (snap) => {
          const items = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<TradeDocumentDoc, 'id'>) }))
            .sort((a, b) => b.issuedDate.localeCompare(a.issuedDate));
          setAllTradeDocuments(items);
          setLastSyncedAt(new Date());
        },
        (error) => logFirestoreError(error, OperationType.LIST, 'tradeDocuments (admin)')
      );

      unsubAdminAlerts = onSnapshot(
        collection(db, 'priceAlerts'),
        (snap) => {
          const items = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<PriceAlertDoc, 'id'>) }))
            .sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
          setAllPriceAlerts(items);
          setLastSyncedAt(new Date());
        },
        (error) => logFirestoreError(error, OperationType.LIST, 'priceAlerts (admin)')
      );

      unsubCrmContacts = onSnapshot(
        collection(db, 'crmContacts'),
        (snap) => {
          const items = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<CrmContactDoc, 'id'>) }))
            .sort((a, b) => getMillis(b.updatedAt) - getMillis(a.updatedAt));
          setCrmContacts(items);
          setLastSyncedAt(new Date());
        },
        (error) => logFirestoreError(error, OperationType.LIST, 'crmContacts (admin)')
      );

      unsubCrmLeads = onSnapshot(
        collection(db, 'crmLeads'),
        (snap) => {
          const items = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<CrmLeadDoc, 'id'>) }))
            .sort((a, b) => getMillis(b.updatedAt) - getMillis(a.updatedAt));
          setCrmLeads(items);
          setLastSyncedAt(new Date());
        },
        (error) => logFirestoreError(error, OperationType.LIST, 'crmLeads (admin)')
      );

      unsubCrmEmails = onSnapshot(
        collection(db, 'crmEmails'),
        (snap) => {
          const items = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<CrmEmailDoc, 'id'>) }))
            .sort((a, b) => getMillis(b.updatedAt) - getMillis(a.updatedAt));
          setCrmEmails(items);
          setLastSyncedAt(new Date());
        },
        (error) => logFirestoreError(error, OperationType.LIST, 'crmEmails (admin)')
      );

      unsubAdminBuyers = onSnapshot(
        collection(db, 'buyers'),
        (snap) => {
          const items = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<AdminBuyerDoc, 'id'>) }))
            .sort((a, b) => (a.rankId ?? 999999) - (b.rankId ?? 999999));
          setAllBuyers(items);
          setLastSyncedAt(new Date());
        },
        (error) => logFirestoreError(error, OperationType.LIST, 'buyers (admin)')
      );

      unsubCrmTasks = onSnapshot(
        collection(db, 'crmTasks'),
        (snap) => {
          const items = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<CrmTaskDoc, 'id'>) }))
            .sort((a, b) => (a.dueAtMillis || 0) - (b.dueAtMillis || 0));
          setCrmTasks(items);
          setLastSyncedAt(new Date());
        },
        (error) => logFirestoreError(error, OperationType.LIST, 'crmTasks (admin)')
      );
    }

    return () => {
      unsubProfile();
      unsubRfqs();
      unsubShipments();
      unsubDocs();
      unsubAlerts();
      unsubAdminRfqs();
      unsubAdminShipments();
      unsubAdminDocs();
      unsubAdminAlerts();
      unsubAdminBuyers();
      unsubCrmContacts();
      unsubCrmLeads();
      unsubCrmEmails();
      unsubCrmTasks();
    };
  }, [authReady, user, isAdminUser, seedStarterBuyerPortfolio]);

  // Derived Unified Trade Book (249 Seeded + Live Firestore Overlay via Non-Blocking Timestamp Merge)
  const unifiedTradeBook = useMemo(() => {
    let customRank = 1001;
    const cloudRecords = crmLeads.map((docItem) =>
      cloudDocToLithiumRecord(
        docItem,
        typeof docItem.rankId === 'number' ? docItem.rankId : customRank++
      )
    );
    return mergeRecordsByTimestamp(LITHIUM_INTEL_SEED_CATALOG, cloudRecords).merged;
  }, [crmLeads]);

  const duplicateAudit = useMemo(
    () => auditDuplicates(unifiedTradeBook),
    [unifiedTradeBook]
  );

  const crmActivities = useMemo<CrmActivityRecord[]>(() => {
    return crmEmails
      .map((m) => ({
        id: m.id,
        ownerUid: m.ownerUid,
        leadRankId: m.leadRankId ?? 0,
        leadId: m.leadId,
        companyName: m.companyName,
        activityType:
          m.activityType || (m.direction === 'Draft' ? 'NOTE' : 'EMAIL'),
        outcome: m.outcome || m.status,
        summary: m.summary || m.subject || m.body.slice(0, 140),
        quoteAmountUsd: m.quoteAmountUsd,
        createdAtMillis: m.createdAtMillis || getMillis(m.createdAt) || Date.now(),
        direction: m.direction,
        toEmail: m.toEmail,
        fromEmail: m.fromEmail,
        contactName: m.contactName,
        subject: m.subject,
        body: m.body,
        status: m.status,
        sentDate: m.sentDate,
      }))
      .sort((a, b) => b.createdAtMillis - a.createdAtMillis);
  }, [crmEmails]);

  const kpiSummary = useMemo<ExecutiveKpiSummary>(() => {
    let totalWeightedUsd = 0;
    let closedWonUsd = 0;
    let activeDealsCount = 0;
    let totalPipelineUsd = 0;

    for (const r of unifiedTradeBook) {
      if (r.crmStage === 'WON') {
        closedWonUsd += r.targetFobValue || 0;
        totalWeightedUsd += r.targetFobValue || 0;
        totalPipelineUsd += r.targetFobValue || 0;
      } else if (r.crmStage !== 'LOST') {
        totalPipelineUsd += r.targetFobValue || 0;
        totalWeightedUsd +=
          r.weightedValueUsd ||
          Math.round(((r.targetFobValue || 0) * (r.winProbability || 0)) / 100);
        if (r.crmStage !== 'PROSPECT') activeDealsCount++;
      }
    }

    const nowMs = Date.now();
    const openTasksCount = crmTasks.filter((t) => !t.isCompleted).length;
    const overdueTasksCount = crmTasks.filter(
      (t) => !t.isCompleted && t.dueAtMillis > 0 && t.dueAtMillis < nowMs
    ).length;
    const quotesSentCount =
      crmActivities.filter((a) => a.activityType === 'QUOTE_SENT').length +
      allTradeDocuments.filter((d) =>
        ['PROFORMA_INVOICE', 'FCO', 'Proforma Invoice', 'SALES_CONTRACT'].includes(
          d.docType
        )
      ).length;

    return {
      totalWeightedUsd,
      closedWonUsd,
      openTasksCount,
      overdueTasksCount,
      quotesSentCount,
      activeDealsCount,
      totalPipelineUsd,
    };
  }, [unifiedTradeBook, crmTasks, crmActivities, allTradeDocuments]);

  const canonicalProfile = useMemo<CanonicalCompanyConfig>(
    () => ({
      companyName: marketConfig.companyName || DEFAULT_MARKET_CONFIG.companyName,
      domain: marketConfig.domain || DEFAULT_MARKET_CONFIG.domain,
      ceoName: marketConfig.ceoName || DEFAULT_MARKET_CONFIG.ceoName,
      ceoEmail: marketConfig.ceoEmail || DEFAULT_MARKET_CONFIG.ceoEmail,
      primaryMineralAsset:
        marketConfig.primaryMineralAsset || DEFAULT_MARKET_CONFIG.primaryMineralAsset,
      miningCadastreId:
        marketConfig.miningCadastreId || DEFAULT_MARKET_CONFIG.miningCadastreId,
      miningLocation:
        marketConfig.miningLocation || DEFAULT_MARKET_CONFIG.miningLocation,
      assayRefPrimary:
        marketConfig.assayRefPrimary || DEFAULT_MARKET_CONFIG.assayRefPrimary,
      assayRefSecondary:
        marketConfig.assayRefSecondary || DEFAULT_MARKET_CONFIG.assayRefSecondary,
      verifiedLi2OPct: marketConfig.lithiumAssayPct,
      activeSupplyCorridors:
        marketConfig.activeSupplyCorridors ||
        DEFAULT_MARKET_CONFIG.activeSupplyCorridors,
      multiCommodityCapabilities:
        marketConfig.multiCommodityCapabilities ||
        DEFAULT_MARKET_CONFIG.multiCommodityCapabilities,
      bankReadinessDocs: marketConfig.bankReadinessDocs,
    }),
    [marketConfig]
  );

  // Auth Actions
  const signInWithGoogle = async (): Promise<User | null> => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      return cred.user;
    } catch (error) {
      const rawMsg =
        error instanceof Error ? error.message : 'Unable to complete sign-in.';
      const msg = rawMsg.includes('auth/unauthorized-domain')
        ? `Domain "${window.location.hostname}" is not yet authorized in Firebase Auth. Add it under Firebase Console -> Authentication -> Settings -> Authorized domains.`
        : rawMsg;
      setAuthError(msg);
      return null;
    } finally {
      setSigningIn(false);
    }
  };

  const signOutBuyer = async () => {
    setAuthError(null);
    await signOut(auth);
  };

  // Buyer Actions
  const saveNewRfqToFirestore = async (input: NewRfqInput) => {
    if (!user) return;
    const safeId = sanitizeIdPart(input.refId);
    const rfqDocId = `${safeId}-${Date.now()}`;
    const docPath = `rfqs/${rfqDocId}`;

    const payload: Record<string, unknown> = {
      buyerUid: user.uid,
      refId: safeId,
      companyName: input.companyName.trim().slice(0, 160),
      contactName: input.contactName.trim().slice(0, 120),
      corporateEmail: input.corporateEmail.trim().slice(0, 160),
      destinationPort: input.destinationPort.trim().slice(0, 120),
      commoditySummary: input.commoditySummary.trim().slice(0, 300),
      targetVolume: input.targetVolume.trim().slice(0, 120),
      incoterm: input.incoterm,
      paymentTerms: input.paymentTerms.trim().slice(0, 120),
      status: 'Submitted' as RfqStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (input.specifications && input.specifications.trim().length > 0) {
      payload.specifications = input.specifications.trim().slice(0, 1000);
    }
    if (
      typeof input.estimatedValueUsd === 'number' &&
      Number.isFinite(input.estimatedValueUsd) &&
      input.estimatedValueUsd >= 0
    ) {
      payload.estimatedValueUsd = Math.round(input.estimatedValueUsd);
    }

    try {
      await setDoc(doc(db, 'rfqs', rfqDocId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  };

  const createPriceAlert = async (
    input: NewPriceAlertInput,
    explicitUser?: User
  ) => {
    const activeUser = explicitUser || user;
    if (!activeUser) return;
    const safeKey = sanitizeIdPart(input.commodityKey).slice(0, 64);
    const alertId = `alert-${safeKey}-${Date.now()}`;
    const docPath = `priceAlerts/${alertId}`;

    const cleanThreshold = Math.min(
      1000000,
      Math.max(0.01, Number(input.thresholdValue.toFixed(2)))
    );
    const cleanBaseline = Math.min(
      1000000,
      Math.max(0, Number(input.baselinePrice.toFixed(2)))
    );

    try {
      await setDoc(doc(db, 'priceAlerts', alertId), {
        buyerUid: activeUser.uid,
        email: input.email.trim().slice(0, 160),
        commodityKey: safeKey.length >= 2 ? safeKey : 'commodity-alert',
        commodityLabel: input.commodityLabel.trim().slice(0, 160),
        category: input.category,
        baselinePrice: cleanBaseline,
        unitLabel: input.unitLabel.trim().slice(0, 32),
        triggerDirection: input.triggerDirection,
        thresholdValue: cleanThreshold,
        channel: input.channel,
        status: 'Active' as AlertStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  };

  const togglePriceAlertStatus = async (
    alertId: string,
    nextStatus: AlertStatus
  ) => {
    if (!user) return;
    const docPath = `priceAlerts/${alertId}`;
    try {
      await updateDoc(doc(db, 'priceAlerts', alertId), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const deletePriceAlert = async (alertId: string) => {
    if (!user) return;
    const docPath = `priceAlerts/${alertId}`;
    try {
      await deleteDoc(doc(db, 'priceAlerts', alertId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  };

  const updateBuyerProfile = async (updates: {
    companyName: string;
    contactName: string;
    defaultPort: string;
  }) => {
    if (!user) return;
    const docPath = `buyers/${user.uid}`;
    try {
      await updateDoc(doc(db, 'buyers', user.uid), {
        companyName: updates.companyName.trim().slice(0, 160),
        contactName: updates.contactName.trim().slice(0, 120),
        defaultPort: updates.defaultPort.trim().slice(0, 120),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const updateRfqDetails = async (
    rfqId: string,
    updates: {
      destinationPort: string;
      targetVolume: string;
      specifications: string;
    }
  ) => {
    if (!user) return;
    const docPath = `rfqs/${rfqId}`;
    try {
      await updateDoc(doc(db, 'rfqs', rfqId), {
        destinationPort: updates.destinationPort.trim().slice(0, 120),
        targetVolume: updates.targetVolume.trim().slice(0, 120),
        specifications: updates.specifications.trim().slice(0, 1000),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const appendShipmentNote = async (shipmentId: string, note: string) => {
    if (!user) return;
    const trimmed = note.trim().slice(0, 320);
    if (trimmed.length < 4) return;
    const docPath = `shipments/${shipmentId}`;
    try {
      await updateDoc(doc(db, 'shipments', shipmentId), {
        lastUpdateNote: trimmed,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const archiveTradeDocument = async (docId: string) => {
    if (!user) return;
    const docPath = `tradeDocuments/${docId}`;
    try {
      await updateDoc(doc(db, 'tradeDocuments', docId), {
        status: 'Archived' as TradeDocStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  // Admin RFQ, Shipment & Docs Actions
  const adminUpdateRfqStatus = async (rfqId: string, status: RfqStatus) => {
    if (!isAdminUser || !user) return;
    const docPath = `rfqs/${rfqId}`;
    try {
      await updateDoc(doc(db, 'rfqs', rfqId), {
        status,
        reviewedBy: (user.email || 'Executive Admin').slice(0, 160),
        reviewedAtMillis: Date.now(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const adminReviewRfq = async (
    rfqId: string,
    status: RfqStatus,
    reviewNote?: string
  ) => {
    if (!isAdminUser || !user) return;
    const docPath = `rfqs/${rfqId}`;
    const payload: Record<string, unknown> = {
      status,
      reviewedBy: (user.email || 'Executive Admin').slice(0, 160),
      reviewedAtMillis: Date.now(),
      updatedAt: serverTimestamp(),
    };
    if (typeof reviewNote === 'string') {
      payload.reviewNote = reviewNote.trim().slice(0, 500);
    }
    try {
      await updateDoc(doc(db, 'rfqs', rfqId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const adminUpdateRfq = async (
    rfqId: string,
    updates: {
      status: RfqStatus;
      destinationPort: string;
      targetVolume: string;
      specifications: string;
      reviewNote?: string;
      estimatedValueUsd?: number;
    }
  ) => {
    if (!isAdminUser || !user) return;
    const docPath = `rfqs/${rfqId}`;
    const payload: Record<string, unknown> = {
      status: updates.status,
      destinationPort: updates.destinationPort.trim().slice(0, 120),
      targetVolume: updates.targetVolume.trim().slice(0, 120),
      specifications: updates.specifications.trim().slice(0, 1000),
      reviewedBy: (user.email || 'Executive Admin').slice(0, 160),
      reviewedAtMillis: Date.now(),
      updatedAt: serverTimestamp(),
    };
    if (typeof updates.reviewNote === 'string') {
      payload.reviewNote = updates.reviewNote.trim().slice(0, 500);
    }
    if (
      typeof updates.estimatedValueUsd === 'number' &&
      Number.isFinite(updates.estimatedValueUsd) &&
      updates.estimatedValueUsd >= 0
    ) {
      payload.estimatedValueUsd = Math.round(updates.estimatedValueUsd);
    }
    try {
      await updateDoc(doc(db, 'rfqs', rfqId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const adminDeleteRfq = async (rfqId: string) => {
    if (!isAdminUser) return;
    const docPath = `rfqs/${rfqId}`;
    try {
      await deleteDoc(doc(db, 'rfqs', rfqId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  };

  const adminCreateShipment = async (input: AdminCreateShipmentInput) => {
    if (!isAdminUser || !user) return;
    const safeBuyerUid = sanitizeIdPart(input.buyerUid || user.uid);
    const safeTracking = sanitizeIdPart(input.trackingCode).slice(0, 48);
    const trackingCode =
      safeTracking.length >= 4
        ? safeTracking
        : `AHT-SHP-${String(Date.now()).slice(-5)}`;
    const safeRfqRef = sanitizeIdPart(input.rfqRefId).slice(0, 40);
    const rfqRefId = safeRfqRef.length >= 4 ? safeRfqRef : 'AHT-RFQ-EXEC';
    const shipmentId = `ship-${trackingCode}-${Date.now()}`;
    const docPath = `shipments/${shipmentId}`;

    const payload: Record<string, unknown> = {
      buyerUid: safeBuyerUid,
      trackingCode,
      rfqRefId,
      commodity: input.commodity.trim().slice(0, 180),
      originPort: input.originPort.trim().slice(0, 120),
      destinationPort: input.destinationPort.trim().slice(0, 120),
      vesselName: input.vesselName.trim().slice(0, 120),
      billOfLadingNo: input.billOfLadingNo.trim().slice(0, 80),
      containerAllocation: input.containerAllocation.trim().slice(0, 80),
      stageIndex: Math.min(5, Math.max(1, Math.round(input.stageIndex))),
      status: input.status,
      etaDate: input.etaDate.trim().slice(0, 40),
      lastUpdateNote: input.lastUpdateNote.trim().slice(0, 320),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (typeof input.leadRankId === 'number') payload.leadRankId = input.leadRankId;
    if (input.companyName) payload.companyName = input.companyName.slice(0, 160);
    if (input.sgsInspectionStatus) {
      payload.sgsInspectionStatus = input.sgsInspectionStatus.slice(0, 80);
    }

    try {
      await setDoc(doc(db, 'shipments', shipmentId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  };

  const adminUpdateShipmentStage = async (
    shipmentId: string,
    updates: {
      stageIndex: number;
      status: ShipmentStatus;
      lastUpdateNote: string;
    }
  ) => {
    if (!isAdminUser) return;
    const docPath = `shipments/${shipmentId}`;
    try {
      await updateDoc(doc(db, 'shipments', shipmentId), {
        stageIndex: updates.stageIndex,
        status: updates.status,
        lastUpdateNote: updates.lastUpdateNote.trim().slice(0, 320),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const adminUpdateShipmentDetails = async (
    shipmentId: string,
    updates: {
      stageIndex: number;
      status: ShipmentStatus;
      vesselName: string;
      billOfLadingNo: string;
      containerAllocation: string;
      etaDate: string;
      lastUpdateNote: string;
    }
  ) => {
    if (!isAdminUser) return;
    const docPath = `shipments/${shipmentId}`;
    try {
      await updateDoc(doc(db, 'shipments', shipmentId), {
        stageIndex: Math.min(5, Math.max(1, Math.round(updates.stageIndex))),
        status: updates.status,
        vesselName: updates.vesselName.trim().slice(0, 120),
        billOfLadingNo: updates.billOfLadingNo.trim().slice(0, 80),
        containerAllocation: updates.containerAllocation.trim().slice(0, 80),
        etaDate: updates.etaDate.trim().slice(0, 40),
        lastUpdateNote: updates.lastUpdateNote.trim().slice(0, 320),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const adminDeleteShipment = async (shipmentId: string) => {
    if (!isAdminUser) return;
    const docPath = `shipments/${shipmentId}`;
    try {
      await deleteDoc(doc(db, 'shipments', shipmentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  };

  const adminCreateTradeDocument = async (input: AdminCreateTradeDocInput) => {
    if (!isAdminUser || !user) return;
    const safeBuyerUid = sanitizeIdPart(input.buyerUid || user.uid);
    const safeDocCode = sanitizeIdPart(input.docCode).slice(0, 48);
    const docCode =
      safeDocCode.length >= 4
        ? safeDocCode
        : `AHT-DOC-${String(Date.now()).slice(-5)}`;
    const safeRfqRef = sanitizeIdPart(input.rfqRefId).slice(0, 40);
    const rfqRefId = safeRfqRef.length >= 4 ? safeRfqRef : 'AHT-RFQ-EXEC';
    const docId = `doc-${docCode}-${Date.now()}`;
    const docPath = `tradeDocuments/${docId}`;

    const payload: Record<string, unknown> = {
      buyerUid: safeBuyerUid,
      docCode,
      title: input.title.trim().slice(0, 180),
      docType: input.docType,
      rfqRefId,
      commodity: input.commodity.trim().slice(0, 160),
      issuer: input.issuer.trim().slice(0, 120),
      issuedDate: input.issuedDate.trim().slice(0, 40),
      status: input.status,
      summaryText: input.summaryText.trim().slice(0, 1500),
      createdAtMillis: Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (input.referenceNo) payload.referenceNo = input.referenceNo.slice(0, 64);
    if (typeof input.leadRankId === 'number') payload.leadRankId = input.leadRankId;
    if (input.counterpartyCompany) {
      payload.counterpartyCompany = input.counterpartyCompany.slice(0, 160);
    }
    if (input.incoterm) payload.incoterm = input.incoterm;
    if (typeof input.totalValue === 'number' && input.totalValue >= 0) {
      payload.totalValue = Math.round(input.totalValue);
    }

    try {
      await setDoc(doc(db, 'tradeDocuments', docId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  };

  const adminVerifyTradeDocument = async (docId: string) => {
    if (!isAdminUser || !user) return;
    const docPath = `tradeDocuments/${docId}`;
    try {
      await updateDoc(doc(db, 'tradeDocuments', docId), {
        status: 'Verified' as TradeDocStatus,
        reviewedBy: (user.email || 'Executive Admin').slice(0, 160),
        reviewedAtMillis: Date.now(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const adminReviewTradeDocument = async (
    docId: string,
    status: TradeDocStatus,
    reviewNote?: string
  ) => {
    if (!isAdminUser || !user) return;
    const docPath = `tradeDocuments/${docId}`;
    const payload: Record<string, unknown> = {
      status,
      reviewedBy: (user.email || 'Executive Admin').slice(0, 160),
      reviewedAtMillis: Date.now(),
      updatedAt: serverTimestamp(),
    };
    if (typeof reviewNote === 'string') {
      payload.reviewNote = reviewNote.trim().slice(0, 500);
    }
    try {
      await updateDoc(doc(db, 'tradeDocuments', docId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const adminUpdateTradeDocument = async (
    docId: string,
    updates: {
      status: TradeDocStatus;
      summaryText: string;
      reviewNote?: string;
    }
  ) => {
    if (!isAdminUser || !user) return;
    const docPath = `tradeDocuments/${docId}`;
    const payload: Record<string, unknown> = {
      status: updates.status,
      summaryText: updates.summaryText.trim().slice(0, 1500),
      reviewedBy: (user.email || 'Executive Admin').slice(0, 160),
      reviewedAtMillis: Date.now(),
      updatedAt: serverTimestamp(),
    };
    if (typeof updates.reviewNote === 'string') {
      payload.reviewNote = updates.reviewNote.trim().slice(0, 500);
    }
    try {
      await updateDoc(doc(db, 'tradeDocuments', docId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const adminDeleteTradeDocument = async (docId: string) => {
    if (!isAdminUser) return;
    const docPath = `tradeDocuments/${docId}`;
    try {
      await deleteDoc(doc(db, 'tradeDocuments', docId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  };

  const adminSaveMarketConfig = async (input: MarketConfigInput) => {
    if (!isAdminUser || !user) return;
    const docPath = 'siteConfig/market';
    const cleanNum = (val: number, min: number, max: number, decimals = 2) =>
      Math.min(max, Math.max(min, Number(val.toFixed(decimals))));

    try {
      await setDoc(doc(db, 'siteConfig', 'market'), {
        lithiumRatePerPercentUsd: cleanNum(input.lithiumRatePerPercentUsd, 1, 100000, 2),
        lithiumAssayPct: cleanNum(input.lithiumAssayPct, 0.1, 100, 2),
        agroIssueDate:
          input.agroIssueDate.trim().slice(0, 40) || DEFAULT_MARKET_CONFIG.agroIssueDate,
        lubricantIssueDate:
          input.lubricantIssueDate.trim().slice(0, 40) ||
          DEFAULT_MARKET_CONFIG.lubricantIssueDate,
        quoteValidityDays: Math.min(365, Math.max(1, Math.round(input.quoteValidityDays))),
        fxNgnPerUsd: cleanNum(input.fxNgnPerUsd, 1, 1000000, 2),
        fxXofPerUsd: cleanNum(input.fxXofPerUsd, 1, 1000000, 2),
        adminNotice: input.adminNotice.trim().slice(0, 320),
        companyName: (input.companyName || marketConfig.companyName).slice(0, 120),
        domain: (input.domain || marketConfig.domain).slice(0, 120),
        ceoName: (input.ceoName || marketConfig.ceoName).slice(0, 120),
        ceoEmail: (input.ceoEmail || marketConfig.ceoEmail).slice(0, 160),
        primaryMineralAsset: (
          input.primaryMineralAsset || marketConfig.primaryMineralAsset
        ).slice(0, 200),
        miningCadastreId: (
          input.miningCadastreId || marketConfig.miningCadastreId
        ).slice(0, 80),
        miningLocation: (
          input.miningLocation || marketConfig.miningLocation
        ).slice(0, 160),
        assayRefPrimary: (
          input.assayRefPrimary || marketConfig.assayRefPrimary
        ).slice(0, 160),
        assayRefSecondary: (
          input.assayRefSecondary || marketConfig.assayRefSecondary
        ).slice(0, 160),
        activeSupplyCorridors: (
          input.activeSupplyCorridors || marketConfig.activeSupplyCorridors
        ).slice(0, 400),
        multiCommodityCapabilities: (
          input.multiCommodityCapabilities ||
          marketConfig.multiCommodityCapabilities
        ).slice(0, 400),
        bankReadinessDocs: input.bankReadinessDocs || marketConfig.bankReadinessDocs,
        updatedByUid: user.uid,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  };

  const adminToggleBankReadiness = async (key: keyof BankReadinessDocsState) => {
    const nextDocs: BankReadinessDocsState = {
      ...marketConfig.bankReadinessDocs,
      [key]: !marketConfig.bankReadinessDocs[key],
    };
    await adminSaveMarketConfig({
      lithiumRatePerPercentUsd: marketConfig.lithiumRatePerPercentUsd,
      lithiumAssayPct: marketConfig.lithiumAssayPct,
      agroIssueDate: marketConfig.agroIssueDate,
      lubricantIssueDate: marketConfig.lubricantIssueDate,
      quoteValidityDays: marketConfig.quoteValidityDays,
      fxNgnPerUsd: marketConfig.fxNgnPerUsd,
      fxXofPerUsd: marketConfig.fxXofPerUsd,
      adminNotice: marketConfig.adminNotice,
      bankReadinessDocs: nextDocs,
    });
  };

  // CRM Contacts
  const adminCreateCrmContact = async (
    input: AdminCrmContactInput
  ): Promise<string | null> => {
    if (!isAdminUser || !user) return null;
    const contactId = `cnt-${sanitizeIdPart(input.companyName).slice(0, 14)}-${Date.now()}`;
    const docPath = `crmContacts/${contactId}`;
    const payload: Record<string, unknown> = {
      ownerUid: user.uid,
      normalizedCompanyKey: normalizeCompanyKey(input.companyName).slice(0, 120),
      fullName: input.fullName.trim().slice(0, 120),
      companyName: input.companyName.trim().slice(0, 160),
      roleTitle: input.roleTitle.trim().slice(0, 120),
      email: input.email.trim().toLowerCase().slice(0, 160),
      phoneWhatsapp: input.phoneWhatsapp.trim().slice(0, 60),
      countryPort: input.countryPort.trim().slice(0, 120),
      segment: input.segment,
      tagsSummary: input.tagsSummary.trim().slice(0, 240),
      notes: input.notes.trim().slice(0, 1500),
      source: input.source || 'Manual',
      lastUpdatedMillis: Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (input.directEmail) payload.directEmail = input.directEmail.trim().slice(0, 160);
    if (input.websiteUrl) payload.websiteUrl = input.websiteUrl.trim().slice(0, 240);

    try {
      await setDoc(doc(db, 'crmContacts', contactId), payload);
      return contactId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  };

  const adminUpdateCrmContact = async (
    contactId: string,
    updates: Omit<AdminCrmContactInput, 'source'>
  ) => {
    if (!isAdminUser) return;
    const docPath = `crmContacts/${contactId}`;
    try {
      await updateDoc(doc(db, 'crmContacts', contactId), {
        normalizedCompanyKey: normalizeCompanyKey(updates.companyName).slice(0, 120),
        fullName: updates.fullName.trim().slice(0, 120),
        companyName: updates.companyName.trim().slice(0, 160),
        roleTitle: updates.roleTitle.trim().slice(0, 120),
        email: updates.email.trim().toLowerCase().slice(0, 160),
        phoneWhatsapp: updates.phoneWhatsapp.trim().slice(0, 60),
        countryPort: updates.countryPort.trim().slice(0, 120),
        segment: updates.segment,
        tagsSummary: updates.tagsSummary.trim().slice(0, 240),
        notes: updates.notes.trim().slice(0, 1500),
        lastUpdatedMillis: Date.now(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const adminDeleteCrmContact = async (contactId: string) => {
    if (!isAdminUser) return;
    const docPath = `crmContacts/${contactId}`;
    try {
      await deleteDoc(doc(db, 'crmContacts', contactId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  };

  // CRM Leads (Legacy + Extended Compatible)
  const adminCreateCrmLead = async (
    input: AdminCrmLeadInput
  ): Promise<string | null> => {
    if (!isAdminUser || !user) return null;
    const leadId = `lead-${sanitizeIdPart(input.companyName).slice(0, 14)}-${Date.now()}`;
    const docPath = `crmLeads/${leadId}`;
    const cleanValue =
      typeof input.dealValueUsd === 'number' && Number.isFinite(input.dealValueUsd)
        ? Math.min(1000000000, Math.max(0, Math.round(input.dealValueUsd)))
        : 0;
    const crmStage = mapLegacyStageToCrmStage(input.stage);
    const winProb = STAGE_WIN_PROBABILITY[crmStage];
    const nextRank =
      Math.max(1000, ...unifiedTradeBook.map((r) => r.rankId || 0)) + 1;

    try {
      await setDoc(doc(db, 'crmLeads', leadId), {
        ownerUid: user.uid,
        rankId: nextRank,
        normalizedCompanyKey: normalizeCompanyKey(input.companyName).slice(0, 120),
        leadCategory: 'LITHIUM',
        regionCode: 'ASIA_PACIFIC',
        crmStage,
        winProbability: winProb,
        targetFobValue: cleanValue,
        weightedValueUsd: Math.round((cleanValue * winProb) / 100),
        outreachStatus: 'READY',
        priorityScore: input.priority === 'High' ? 88 : input.priority === 'Medium' ? 72 : 55,
        priorityTier: input.priority === 'High' ? 'A' : input.priority === 'Medium' ? 'B' : 'C',
        isCustomLead: true,
        lastUpdatedMillis: Date.now(),
        title: input.title.trim().slice(0, 180),
        contactId: (input.contactId || '').trim().slice(0, 128),
        contactName: input.contactName.trim().slice(0, 120),
        companyName: input.companyName.trim().slice(0, 160),
        email: input.email.trim().toLowerCase().slice(0, 160),
        directEmail: input.email.trim().toLowerCase().slice(0, 160),
        phoneWhatsapp: input.phoneWhatsapp.trim().slice(0, 60),
        whatsappNumber: input.phoneWhatsapp.trim().slice(0, 60),
        commodityInterest: input.commodityInterest.trim().slice(0, 200),
        stage: input.stage,
        priority: input.priority,
        dealValueUsd: cleanValue,
        followUpDate: input.followUpDate.trim().slice(0, 40),
        source: input.source || 'Manual',
        notes: input.notes.trim().slice(0, 1500),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return leadId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  };

  const adminUpdateCrmLead = async (
    leadId: string,
    updates: Omit<AdminCrmLeadInput, 'source'>
  ) => {
    if (!isAdminUser) return;
    const docPath = `crmLeads/${leadId}`;
    const cleanValue =
      typeof updates.dealValueUsd === 'number' && Number.isFinite(updates.dealValueUsd)
        ? Math.min(1000000000, Math.max(0, Math.round(updates.dealValueUsd)))
        : 0;
    const crmStage = mapLegacyStageToCrmStage(updates.stage);
    const winProb = STAGE_WIN_PROBABILITY[crmStage];

    try {
      await updateDoc(doc(db, 'crmLeads', leadId), {
        title: updates.title.trim().slice(0, 180),
        contactId: (updates.contactId || '').trim().slice(0, 128),
        contactName: updates.contactName.trim().slice(0, 120),
        companyName: updates.companyName.trim().slice(0, 160),
        normalizedCompanyKey: normalizeCompanyKey(updates.companyName).slice(0, 120),
        email: updates.email.trim().toLowerCase().slice(0, 160),
        directEmail: updates.email.trim().toLowerCase().slice(0, 160),
        phoneWhatsapp: updates.phoneWhatsapp.trim().slice(0, 60),
        whatsappNumber: updates.phoneWhatsapp.trim().slice(0, 60),
        commodityInterest: updates.commodityInterest.trim().slice(0, 200),
        crmStage,
        winProbability: winProb,
        targetFobValue: cleanValue,
        weightedValueUsd: Math.round((cleanValue * winProb) / 100),
        stage: updates.stage,
        priority: updates.priority,
        dealValueUsd: cleanValue,
        followUpDate: updates.followUpDate.trim().slice(0, 40),
        notes: updates.notes.trim().slice(0, 1500),
        lastUpdatedMillis: Date.now(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const adminDeleteCrmLead = async (leadId: string) => {
    if (!isAdminUser) return;
    const docPath = `crmLeads/${leadId}`;
    try {
      await deleteDoc(doc(db, 'crmLeads', leadId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  };

  // Two-Way Lithium Intel Upsert (writes both crmLeads & summary buyer mirror)
  const adminUpsertIntelLead = async (
    record: LithiumIntelRecord
  ): Promise<string | null> => {
    if (!isAdminUser || !user) return null;
    const targetId =
      record.id && /^[a-zA-Z0-9_-]+$/.test(record.id)
        ? record.id
        : `lead-rank-${record.rankId}`;
    const existingCloud = crmLeads.find((l) => l.id === targetId);
    const stampedRecord: LithiumIntelRecord = {
      ...record,
      id: targetId,
      lastUpdatedMillis: Date.now(),
    };
    const payload = buildLeadPayloadForFirestore(stampedRecord, user.uid);
    const docPath = `crmLeads/${targetId}`;

    try {
      if (existingCloud) {
        const updatePayload: Record<string, unknown> = { ...payload };
        delete updatePayload.ownerUid;
        delete updatePayload.source;
        updatePayload.updatedAt = serverTimestamp();
        await updateDoc(doc(db, 'crmLeads', targetId), updatePayload);
      } else {
        await setDoc(doc(db, 'crmLeads', targetId), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Non-blocking mirror summary into /buyers/{buyerId} for Android Buyer Book sync
      const buyerMirrorId = `buyer-rank-${stampedRecord.rankId}`;
      const existingBuyerDoc = allBuyers.find((b) => b.id === buyerMirrorId);
      const buyerSyncFields = {
        rankId: Math.min(999999, Math.max(1, Math.round(stampedRecord.rankId || 1001))),
        normalizedCompanyKey: (
          stampedRecord.normalizedCompanyKey || normalizeCompanyKey(stampedRecord.companyName)
        ).slice(0, 120),
        companyName: (stampedRecord.companyName.trim() || 'Trade Counterparty').slice(0, 160),
        contactName: (stampedRecord.decisionMaker || 'Trade Desk').trim().slice(0, 120),
        email: ensureLeadValidEmail(stampedRecord),
        defaultPort: (stampedRecord.location || 'International').trim().slice(0, 120),
        leadCategory: stampedRecord.leadCategory,
        regionCode: stampedRecord.regionCode,
        crmStage: stampedRecord.crmStage,
        outreachStatus: stampedRecord.outreachStatus,
        priorityScore: Math.min(100, Math.max(0, Math.round(stampedRecord.priorityScore || 75))),
        priorityTier: computePriorityTier(stampedRecord.priorityScore || 75),
        targetFobValue: Math.max(0, Math.round(stampedRecord.targetFobValue || 0)),
        lastUpdatedMillis: stampedRecord.lastUpdatedMillis,
        updatedAt: serverTimestamp(),
      };
      if (existingBuyerDoc && existingBuyerDoc.ownerUid) {
        await updateDoc(doc(db, 'buyers', buyerMirrorId), buyerSyncFields).catch(() => {
          // Buyer mirror is advisory; primary write is crmLeads
        });
      } else {
        await setDoc(doc(db, 'buyers', buyerMirrorId), {
          ownerUid: user.uid,
          ...buyerSyncFields,
          createdAt: serverTimestamp(),
        }).catch(() => {
          // Buyer mirror is advisory; primary write is crmLeads
        });
      }

      return targetId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  };

  // CRM Emails & Unified Activities
  const adminCreateCrmEmail = async (input: AdminCrmEmailInput) => {
    if (!isAdminUser || !user) return;
    const emailId = `mail-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
    const docPath = `crmEmails/${emailId}`;
    const payload: Record<string, unknown> = {
      ownerUid: user.uid,
      leadRankId: typeof input.leadRankId === 'number' ? input.leadRankId : 0,
      activityType: input.activityType || (input.direction === 'Draft' ? 'NOTE' : 'EMAIL'),
      outcome: (input.outcome || input.status).slice(0, 200),
      summary: (input.summary || input.subject).slice(0, 1500),
      createdAtMillis: Date.now(),
      direction: input.direction,
      toEmail: isValidEmailStr(input.toEmail)
        ? input.toEmail.trim().toLowerCase().slice(0, 160)
        : 'trade@ahzantechltd.com',
      fromEmail: (input.fromEmail || 'abdoul@ahzantechltd.com').trim().toLowerCase().slice(0, 160),
      contactName: (input.contactName.trim() || 'Trade Partner').slice(0, 120),
      companyName: input.companyName.trim().slice(0, 160),
      leadId: (input.leadId || '').trim().slice(0, 128),
      subject: input.subject.trim().slice(0, 200),
      body: input.body.trim().slice(0, 5000),
      status: input.status,
      sentDate: input.sentDate.trim().slice(0, 40),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (typeof input.quoteAmountUsd === 'number' && input.quoteAmountUsd >= 0) {
      payload.quoteAmountUsd = Math.round(input.quoteAmountUsd);
    }

    try {
      await setDoc(doc(db, 'crmEmails', emailId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  };

  const adminUpdateCrmEmail = async (
    emailId: string,
    updates: Omit<AdminCrmEmailInput, 'fromEmail'>
  ) => {
    if (!isAdminUser) return;
    const docPath = `crmEmails/${emailId}`;
    try {
      await updateDoc(doc(db, 'crmEmails', emailId), {
        direction: updates.direction,
        toEmail: updates.toEmail.trim().toLowerCase().slice(0, 160),
        contactName: updates.contactName.trim().slice(0, 120),
        companyName: updates.companyName.trim().slice(0, 160),
        leadId: (updates.leadId || '').trim().slice(0, 128),
        subject: updates.subject.trim().slice(0, 200),
        body: updates.body.trim().slice(0, 5000),
        status: updates.status,
        sentDate: updates.sentDate.trim().slice(0, 40),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const adminDeleteCrmEmail = async (emailId: string) => {
    if (!isAdminUser) return;
    const docPath = `crmEmails/${emailId}`;
    try {
      await deleteDoc(doc(db, 'crmEmails', emailId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  };

  const adminLogActivity = async (input: {
    leadRankId: number;
    leadId?: string;
    companyName: string;
    contactName?: string;
    toEmail?: string;
    activityType: CrmActivityType;
    outcome: string;
    summary: string;
    quoteAmountUsd?: number;
  }) => {
    if (!isAdminUser || !user) return;
    const safeSubject = `[${input.activityType}] ${input.companyName}: ${input.outcome}`.slice(
      0,
      200
    );
    await adminCreateCrmEmail({
      direction: 'Outbound',
      toEmail: isValidEmailStr(input.toEmail)
        ? (input.toEmail as string)
        : 'desk@ahzantechltd.com',
      fromEmail: user.email || 'abdoul@ahzantechltd.com',
      contactName: input.contactName || 'Trade Contact',
      companyName: input.companyName,
      leadId: input.leadId || `lead-rank-${input.leadRankId}`,
      leadRankId: input.leadRankId,
      activityType: input.activityType,
      outcome: input.outcome,
      summary: input.summary,
      quoteAmountUsd: input.quoteAmountUsd,
      subject: safeSubject.length >= 2 ? safeSubject : 'CRM Activity Log',
      body: input.summary.trim().length >= 2 ? input.summary : input.outcome,
      status: 'Sent',
      sentDate: new Date().toISOString().slice(0, 10),
    });
  };

  const adminMoveLeadStage = async (
    record: LithiumIntelRecord,
    nextStage: CrmStage,
    lostReason?: string
  ) => {
    if (!isAdminUser || !user) return;
    const prevStage = record.crmStage;
    const winProb = STAGE_WIN_PROBABILITY[nextStage];
    const weightedValueUsd = Math.round(((record.targetFobValue || 0) * winProb) / 100);
    const updatedRecord: LithiumIntelRecord = {
      ...record,
      crmStage: nextStage,
      winProbability: winProb,
      weightedValueUsd,
      lostReason: nextStage === 'LOST' ? lostReason || record.lostReason : record.lostReason,
      lastUpdatedMillis: Date.now(),
    };
    await adminUpsertIntelLead(updatedRecord);
    if (prevStage !== nextStage) {
      await adminLogActivity({
        leadRankId: record.rankId,
        leadId: updatedRecord.id,
        companyName: record.companyName,
        contactName: record.decisionMaker,
        toEmail: record.directEmail || record.generalEmail,
        activityType: 'STAGE_CHANGE',
        outcome: `${prevStage} -> ${nextStage} (${winProb}%)`,
        summary: lostReason
          ? `Stage moved from ${prevStage} to ${nextStage}. Reason: ${lostReason}`
          : `Pipeline stage updated from ${prevStage} to ${nextStage} (Win probability: ${winProb}%).`,
      });
    }
  };

  // CRM Follow-Up Tasks (/crmTasks/{taskId})
  const adminCreateTask = async (input: {
    leadRankId: number;
    companyName: string;
    title: string;
    priority: TaskPriority;
    dueAtMillis: number;
  }) => {
    if (!isAdminUser || !user) return;
    const taskId = `task-${input.leadRankId}-${Date.now()}`;
    const docPath = `crmTasks/${taskId}`;
    try {
      await setDoc(doc(db, 'crmTasks', taskId), {
        ownerUid: user.uid,
        leadRankId: Math.max(0, Math.round(input.leadRankId)),
        companyName: input.companyName.trim().slice(0, 160),
        title: input.title.trim().slice(0, 240),
        priority: input.priority,
        dueAtMillis: Math.max(0, Math.round(input.dueAtMillis)),
        isCompleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  };

  const adminToggleTask = async (taskId: string, isCompleted: boolean) => {
    if (!isAdminUser) return;
    const docPath = `crmTasks/${taskId}`;
    try {
      await updateDoc(doc(db, 'crmTasks', taskId), {
        isCompleted,
        completedAtMillis: isCompleted ? Date.now() : 0,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const adminRescheduleTask = async (taskId: string, dueAtMillis: number) => {
    if (!isAdminUser) return;
    const docPath = `crmTasks/${taskId}`;
    try {
      await updateDoc(doc(db, 'crmTasks', taskId), {
        dueAtMillis: Math.max(0, Math.round(dueAtMillis)),
        isCompleted: false,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const adminDeleteTask = async (taskId: string) => {
    if (!isAdminUser) return;
    const docPath = `crmTasks/${taskId}`;
    try {
      await deleteDoc(doc(db, 'crmTasks', taskId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  };

  // Bulk Android Import & Cloud Seeding
  const adminImportAndroidRecords = async (
    records: LithiumIntelRecord[],
    activities: CrmActivityRecord[] = [],
    tasks: CrmTaskRecord[] = [],
    marketUpdates?: Partial<MarketConfigInput>
  ) => {
    if (!isAdminUser || !user) {
      return { insertedCount: 0, updatedCount: 0, skippedOlderCount: 0 };
    }

    const mergeResult = mergeRecordsByTimestamp(unifiedTradeBook, records);
    const existingIds = new Set(crmLeads.map((l) => l.id));

    // Only write records present in incoming payload that won or are new
    const incomingKeys = new Set(
      records.map((r) => r.normalizedCompanyKey || normalizeCompanyKey(r.companyName))
    );
    const toPersist = mergeResult.merged.filter((r) =>
      incomingKeys.has(r.normalizedCompanyKey || normalizeCompanyKey(r.companyName))
    );

    const chunkSize = 350;
    for (let i = 0; i < toPersist.length; i += chunkSize) {
      const slice = toPersist.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const rec of slice) {
        const docId =
          rec.id && /^[a-zA-Z0-9_-]+$/.test(rec.id)
            ? rec.id
            : `lead-rank-${rec.rankId}`;
        const payload = buildLeadPayloadForFirestore(rec, user.uid);
        if (existingIds.has(docId)) {
          const upd: Record<string, unknown> = { ...payload };
          delete upd.ownerUid;
          delete upd.source;
          upd.updatedAt = serverTimestamp();
          batch.update(doc(db, 'crmLeads', docId), upd);
        } else {
          batch.set(doc(db, 'crmLeads', docId), {
            ...payload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'crmLeads (android import)');
      }
    }

    // Import activities into crmEmails
    const existingActIds = new Set(crmEmails.map((m) => m.id));
    const newActivities = activities.filter((a) => !existingActIds.has(a.id));
    for (let i = 0; i < newActivities.length; i += chunkSize) {
      const batch = writeBatch(db);
      for (const act of newActivities.slice(i, i + chunkSize)) {
        const cleanId = /^[a-zA-Z0-9_-]+$/.test(act.id)
          ? act.id
          : `act-${act.leadRankId}-${act.createdAtMillis}`;
        batch.set(doc(db, 'crmEmails', cleanId), {
          ownerUid: user.uid,
          leadRankId: act.leadRankId || 0,
          activityType: act.activityType || 'NOTE',
          outcome: (act.outcome || 'Synced').slice(0, 200),
          summary: (act.summary || 'Android activity').slice(0, 1500),
          createdAtMillis: act.createdAtMillis || Date.now(),
          direction: act.direction || 'Outbound',
          toEmail: isValidEmailStr(act.toEmail)
            ? (act.toEmail as string)
            : 'desk@ahzantechltd.com',
          fromEmail: act.fromEmail || 'abdoul@ahzantechltd.com',
          contactName: (act.contactName || 'Trade Contact').slice(0, 120),
          companyName: (act.companyName || 'Counterparty').slice(0, 160),
          leadId: act.leadId || `lead-rank-${act.leadRankId || 0}`,
          subject: (act.subject || `[${act.activityType}] ${act.companyName}`).slice(0, 200),
          body: (act.body || act.summary || 'Imported from Android backup').slice(0, 5000),
          status: act.status || 'Sent',
          sentDate:
            act.sentDate ||
            new Date(act.createdAtMillis || Date.now()).toISOString().slice(0, 10),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }

    // Import tasks into crmTasks
    const existingTaskIds = new Set(crmTasks.map((t) => t.id));
    const newTasks = tasks.filter((t) => !existingTaskIds.has(t.id));
    for (let i = 0; i < newTasks.length; i += chunkSize) {
      const batch = writeBatch(db);
      for (const t of newTasks.slice(i, i + chunkSize)) {
        const cleanId = /^[a-zA-Z0-9_-]+$/.test(t.id)
          ? t.id
          : `task-${t.leadRankId}-${Date.now()}`;
        batch.set(doc(db, 'crmTasks', cleanId), {
          ownerUid: user.uid,
          leadRankId: t.leadRankId || 0,
          companyName: (t.companyName || 'Counterparty').slice(0, 160),
          title: (t.title || 'Follow-Up').slice(0, 240),
          priority: t.priority || 'MEDIUM',
          dueAtMillis: t.dueAtMillis || Date.now() + 86400000,
          isCompleted: Boolean(t.isCompleted),
          completedAtMillis: t.completedAtMillis || 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }

    if (marketUpdates) {
      await adminSaveMarketConfig({
        lithiumRatePerPercentUsd:
          marketUpdates.lithiumRatePerPercentUsd ?? marketConfig.lithiumRatePerPercentUsd,
        lithiumAssayPct: marketUpdates.lithiumAssayPct ?? marketConfig.lithiumAssayPct,
        agroIssueDate: marketUpdates.agroIssueDate ?? marketConfig.agroIssueDate,
        lubricantIssueDate:
          marketUpdates.lubricantIssueDate ?? marketConfig.lubricantIssueDate,
        quoteValidityDays:
          marketUpdates.quoteValidityDays ?? marketConfig.quoteValidityDays,
        fxNgnPerUsd: marketUpdates.fxNgnPerUsd ?? marketConfig.fxNgnPerUsd,
        fxXofPerUsd: marketUpdates.fxXofPerUsd ?? marketConfig.fxXofPerUsd,
        adminNotice: marketUpdates.adminNotice ?? marketConfig.adminNotice,
      });
    }

    return {
      insertedCount: mergeResult.insertedCount,
      updatedCount: mergeResult.updatedCount,
      skippedOlderCount: mergeResult.skippedOlderCount,
    };
  };

  const adminTestFirestoreConnection = async (): Promise<{
    ok: boolean;
    latencyMs: number;
    serverTimeIso: string;
    error?: string;
  }> => {
    const started = performance.now();
    try {
      await getDocFromServer(doc(db, 'siteConfig', 'market'));
      const latencyMs = Math.max(1, Math.round(performance.now() - started));
      setLastSyncedAt(new Date());
      return {
        ok: true,
        latencyMs,
        serverTimeIso: new Date().toISOString(),
      };
    } catch (error) {
      const latencyMs = Math.max(1, Math.round(performance.now() - started));
      const msg = logFirestoreError(error, OperationType.GET, 'siteConfig/market');
      return {
        ok: false,
        latencyMs,
        serverTimeIso: new Date().toISOString(),
        error: msg,
      };
    }
  };

  const adminImportCsvRecords = async ({
    scope,
    records,
  }: {
    scope: 'leads' | 'buyers' | 'both';
    records: LithiumIntelRecord[];
  }) => {
    if (!isAdminUser || !user || records.length === 0) {
      return {
        leadsWritten: 0,
        buyersWritten: 0,
        insertedCount: 0,
        updatedCount: 0,
        skippedOlderCount: 0,
      };
    }

    const mergeResult = mergeRecordsByTimestamp(unifiedTradeBook, records);
    const incomingKeys = new Set(
      records.map((r) => r.normalizedCompanyKey || normalizeCompanyKey(r.companyName))
    );
    const toPersist = mergeResult.merged.filter((r) =>
      incomingKeys.has(r.normalizedCompanyKey || normalizeCompanyKey(r.companyName))
    );

    const existingLeadIds = new Set(crmLeads.map((l) => l.id));
    const existingBuyersById = new Map(allBuyers.map((b) => [b.id, b]));
    const writeLeads = scope === 'leads' || scope === 'both';
    const writeBuyers = scope === 'buyers' || scope === 'both';

    const chunkSize = scope === 'both' ? 180 : 350;
    let leadsWritten = 0;
    let buyersWritten = 0;

    for (let i = 0; i < toPersist.length; i += chunkSize) {
      const slice = toPersist.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const rec of slice) {
        if (writeLeads) {
          const docId =
            rec.id && /^[a-zA-Z0-9_-]+$/.test(rec.id)
              ? rec.id
              : `lead-rank-${rec.rankId}`;
          const payload = buildLeadPayloadForFirestore(rec, user.uid);
          if (existingLeadIds.has(docId)) {
            const upd: Record<string, unknown> = { ...payload };
            delete upd.ownerUid;
            delete upd.source;
            upd.updatedAt = serverTimestamp();
            batch.update(doc(db, 'crmLeads', docId), upd);
          } else {
            batch.set(doc(db, 'crmLeads', docId), {
              ...payload,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          leadsWritten++;
        }

        if (writeBuyers) {
          const safeRank = Math.min(999999, Math.max(1, Math.round(rec.rankId || 1001)));
          const buyerDocId = `buyer-rank-${safeRank}`;
          const existingBuyer = existingBuyersById.get(buyerDocId);
          const buyerFields = {
            rankId: safeRank,
            normalizedCompanyKey: (
              rec.normalizedCompanyKey || normalizeCompanyKey(rec.companyName)
            ).slice(0, 120),
            companyName: (rec.companyName.trim() || 'Trade Counterparty').slice(0, 160),
            contactName: (rec.decisionMaker || 'Trade Desk').trim().slice(0, 120),
            email: ensureLeadValidEmail(rec),
            defaultPort: (rec.location || 'International').trim().slice(0, 120),
            leadCategory: rec.leadCategory,
            regionCode: rec.regionCode,
            crmStage: rec.crmStage,
            outreachStatus: rec.outreachStatus,
            priorityScore: Math.min(100, Math.max(0, Math.round(rec.priorityScore || 75))),
            priorityTier: computePriorityTier(rec.priorityScore || 75),
            targetFobValue: Math.max(0, Math.round(rec.targetFobValue || 0)),
            lastUpdatedMillis: rec.lastUpdatedMillis || Date.now(),
            updatedAt: serverTimestamp(),
          };

          if (existingBuyer && existingBuyer.ownerUid) {
            batch.update(doc(db, 'buyers', buyerDocId), buyerFields);
          } else {
            batch.set(doc(db, 'buyers', buyerDocId), {
              ownerUid: user.uid,
              ...buyerFields,
              createdAt: serverTimestamp(),
            });
          }
          buyersWritten++;
        }
      }

      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `CSV import (${scope})`);
      }
    }

    setLastSyncedAt(new Date());
    return {
      leadsWritten,
      buyersWritten,
      insertedCount: mergeResult.insertedCount,
      updatedCount: mergeResult.updatedCount,
      skippedOlderCount: mergeResult.skippedOlderCount,
    };
  };

  const adminSyncSeedCatalogToCloud = async (): Promise<{ syncedCount: number }> => {
    if (!isAdminUser || !user) return { syncedCount: 0 };
    const existingIds = new Set(crmLeads.map((l) => l.id));
    const existingBuyersById = new Map(allBuyers.map((b) => [b.id, b]));
    const toPush = unifiedTradeBook.filter((r) => !existingIds.has(r.id));
    const chunkSize = 180; // 2 writes per record = 360 ops < 500 Firestore batch limit
    let syncedCount = 0;

    for (let i = 0; i < toPush.length; i += chunkSize) {
      const batch = writeBatch(db);
      for (const rec of toPush.slice(i, i + chunkSize)) {
        const docId =
          rec.id && /^[a-zA-Z0-9_-]+$/.test(rec.id)
            ? rec.id
            : `lead-rank-${rec.rankId}`;
        const payload = buildLeadPayloadForFirestore(rec, user.uid);
        batch.set(doc(db, 'crmLeads', docId), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        const buyerDocId = `buyer-rank-${rec.rankId}`;
        const existingBuyer = existingBuyersById.get(buyerDocId);
        const buyerPayload = {
          rankId: rec.rankId,
          normalizedCompanyKey: rec.normalizedCompanyKey,
          companyName: rec.companyName.slice(0, 160),
          contactName: (rec.decisionMaker || 'Trade Desk').slice(0, 120),
          email: ensureLeadValidEmail(rec),
          defaultPort: rec.location.slice(0, 120),
          leadCategory: rec.leadCategory,
          regionCode: rec.regionCode,
          crmStage: rec.crmStage,
          outreachStatus: rec.outreachStatus,
          priorityScore: rec.priorityScore,
          priorityTier: rec.priorityTier,
          targetFobValue: Math.round(rec.targetFobValue || 0),
          lastUpdatedMillis: rec.lastUpdatedMillis,
          updatedAt: serverTimestamp(),
        };
        if (existingBuyer && existingBuyer.ownerUid) {
          batch.update(doc(db, 'buyers', buyerDocId), buyerPayload);
        } else {
          batch.set(doc(db, 'buyers', buyerDocId), {
            ownerUid: user.uid,
            ...buyerPayload,
            createdAt: serverTimestamp(),
          });
        }
        syncedCount++;
      }
      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'crmLeads/buyers seed sync');
      }
    }

    return { syncedCount };
  };

  const adminIssueTradeDocument = async (input: AdminCreateTradeDocInput) => {
    await adminCreateTradeDocument(input);
    if (input.leadRankId || input.counterpartyCompany) {
      await adminLogActivity({
        leadRankId: input.leadRankId || 0,
        companyName: input.counterpartyCompany || 'Trade Counterparty',
        activityType: 'QUOTE_SENT',
        outcome: `Issued ${input.docType} (${input.referenceNo || input.docCode})`,
        summary: `${input.title} — ${input.summaryText}`,
        quoteAmountUsd: input.totalValue,
      });
    }
  };

  const adminCreateRfqFromLead = async (input: {
    lead: LithiumIntelRecord;
    productDescription: string;
    quantityMt: number;
    unitPriceUsd: number;
    incoterm: IncotermCode;
    paymentTerms: string;
    validityDays: number;
    destinationPort: string;
    specifications?: string;
  }): Promise<string> => {
    if (!isAdminUser || !user) return '';
    const refId = `AHT-RFQ-${input.lead.rankId}-${String(Date.now()).slice(-4)}`;
    const rfqDocId = `${refId}`;
    const totalUsd = Math.round(input.quantityMt * input.unitPriceUsd);

    try {
      await setDoc(doc(db, 'rfqs', rfqDocId), {
        buyerUid: user.uid,
        refId,
        leadRankId: input.lead.rankId,
        companyName: input.lead.companyName.slice(0, 160),
        contactName: (input.lead.decisionMaker || 'Procurement Director').slice(0, 120),
        corporateEmail: ensureLeadValidEmail(input.lead),
        destinationPort: (input.destinationPort || input.lead.location).slice(0, 120),
        commoditySummary: input.productDescription.slice(0, 300),
        productDescription: input.productDescription.slice(0, 400),
        targetVolume: `${input.quantityMt.toLocaleString('en-US')} MT`,
        quantityMt: input.quantityMt,
        unitPriceUsd: input.unitPriceUsd,
        totalValueUsd: totalUsd,
        incoterm: input.incoterm,
        paymentTerms: input.paymentTerms.slice(0, 120),
        validityDays: Math.min(365, Math.max(1, input.validityDays)),
        specifications: (
          input.specifications ||
          `${marketConfig.miningCadastreId} (${marketConfig.miningLocation}) · ${marketConfig.assayRefPrimary} & ${marketConfig.assayRefSecondary}`
        ).slice(0, 1000),
        status: 'SCO / Proforma Issued' as RfqStatus,
        estimatedValueUsd: totalUsd,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const nextWinProb = STAGE_WIN_PROBABILITY.PROPOSAL_QUOTE; // 70%
      await adminUpsertIntelLead({
        ...input.lead,
        crmStage: 'PROPOSAL_QUOTE',
        winProbability: nextWinProb,
        estimatedTonnage: input.quantityMt,
        targetFobValue: totalUsd,
        impliedFobPricePerMt: input.unitPriceUsd,
        weightedValueUsd: Math.round((totalUsd * nextWinProb) / 100),
        outreachStatus: 'DEAL_IN_PROGRESS',
        lastUpdatedMillis: Date.now(),
      });

      await adminLogActivity({
        leadRankId: input.lead.rankId,
        leadId: input.lead.id,
        companyName: input.lead.companyName,
        contactName: input.lead.decisionMaker,
        toEmail: ensureLeadValidEmail(input.lead),
        activityType: 'QUOTE_SENT',
        outcome: `RFQ ${refId} (${input.incoterm} · ${input.quantityMt} MT)`,
        summary: `Issued ${input.incoterm} quote for ${input.productDescription}: ${input.quantityMt} MT @ $${input.unitPriceUsd}/MT = US$${totalUsd.toLocaleString('en-US')}. Pipeline auto-advanced to Proposal/Quote (70%).`,
        quoteAmountUsd: totalUsd,
      });

      return refId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `rfqs/${rfqDocId}`);
    }
  };

  const adminSyncWebActivityToCrm = async (): Promise<{
    contactsAdded: number;
    leadsAdded: number;
  }> => {
    if (!isAdminUser || !user) return { contactsAdded: 0, leadsAdded: 0 };

    const existingEmails = new Set(crmContacts.map((c) => c.email.toLowerCase()));
    const existingLeadKeys = new Set(
      crmLeads.map((l) => `${l.email.toLowerCase()}|${l.title.toLowerCase()}`)
    );

    const batch = writeBatch(db);
    const now = serverTimestamp();
    let contactsAdded = 0;
    let leadsAdded = 0;
    let ops = 0;

    for (const rfq of allRfqs) {
      const normEmail = rfq.corporateEmail.trim().toLowerCase();
      if (!existingEmails.has(normEmail) && ops < 450) {
        const contactId = `cnt-rfq-${sanitizeIdPart(rfq.refId).slice(0, 20)}`;
        batch.set(doc(db, 'crmContacts', contactId), {
          ownerUid: user.uid,
          normalizedCompanyKey: normalizeCompanyKey(rfq.companyName).slice(0, 120),
          fullName: rfq.contactName.trim().slice(0, 120),
          companyName: rfq.companyName.trim().slice(0, 160),
          roleTitle: 'Procurement / Offtake Contact',
          email: normEmail.slice(0, 160),
          phoneWhatsapp: '',
          countryPort: rfq.destinationPort.trim().slice(0, 120),
          segment: 'Offtaker',
          tagsSummary: `${rfq.incoterm} · ${rfq.refId}`,
          notes: `Synced automatically from Website RFQ ${rfq.refId}. Commodity: ${rfq.commoditySummary}`,
          source: 'Website RFQ',
          lastUpdatedMillis: Date.now(),
          createdAt: now,
          updatedAt: now,
        });
        existingEmails.add(normEmail);
        contactsAdded++;
        ops++;
      }

      const leadTitle = `${rfq.refId} — ${rfq.commoditySummary}`.slice(0, 180);
      const leadKey = `${normEmail}|${leadTitle.toLowerCase()}`;
      if (!existingLeadKeys.has(leadKey) && ops < 450) {
        const stageMap: Record<RfqStatus, CrmLeadStage> = {
          Submitted: 'New Lead',
          'Under Executive Review': 'Qualified',
          'Quote Approved': 'Proposal / SCO Sent',
          'Not Approved': 'Lost / Archived',
          'SCO / Proforma Issued': 'Proposal / SCO Sent',
          'L/C Confirmed': 'Negotiation',
          'Export Cleared': 'Won / Contracted',
        };
        const legacyStage = stageMap[rfq.status] || 'New Lead';
        const androidStage = mapLegacyStageToCrmStage(legacyStage);
        const leadId = `lead-rfq-${sanitizeIdPart(rfq.refId).slice(0, 24)}`;
        const valUsd =
          typeof rfq.estimatedValueUsd === 'number' ? Math.round(rfq.estimatedValueUsd) : 0;

        batch.set(doc(db, 'crmLeads', leadId), {
          ownerUid: user.uid,
          normalizedCompanyKey: normalizeCompanyKey(rfq.companyName).slice(0, 120),
          leadCategory: 'LITHIUM',
          regionCode: 'ASIA_PACIFIC',
          crmStage: androidStage,
          winProbability: STAGE_WIN_PROBABILITY[androidStage],
          targetFobValue: valUsd,
          weightedValueUsd: Math.round((valUsd * STAGE_WIN_PROBABILITY[androidStage]) / 100),
          isCustomLead: true,
          lastUpdatedMillis: Date.now(),
          title: leadTitle,
          contactId: `cnt-rfq-${sanitizeIdPart(rfq.refId).slice(0, 20)}`,
          contactName: rfq.contactName.trim().slice(0, 120),
          companyName: rfq.companyName.trim().slice(0, 160),
          email: normEmail.slice(0, 160),
          phoneWhatsapp: '',
          commodityInterest: `${rfq.commoditySummary} (${rfq.targetVolume})`.slice(0, 200),
          stage: legacyStage,
          priority: valUsd >= 40000 ? 'High' : 'Medium',
          dealValueUsd: valUsd,
          followUpDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
          source: 'Website RFQ',
          notes: `Synced from ${rfq.incoterm} RFQ to ${rfq.destinationPort}. Payment: ${rfq.paymentTerms}. ${rfq.specifications || ''}`.slice(0, 1500),
          createdAt: now,
          updatedAt: now,
        });
        existingLeadKeys.add(leadKey);
        leadsAdded++;
        ops++;
      }
    }

    for (const alert of allPriceAlerts) {
      const normEmail = alert.email.trim().toLowerCase();
      if (!existingEmails.has(normEmail) && ops < 450) {
        const contactId = `cnt-alt-${sanitizeIdPart(alert.id).slice(0, 20)}`;
        const compName =
          normEmail.split('@')[1]?.split('.')[0]?.toUpperCase() || 'Price Alert Subscriber';
        batch.set(doc(db, 'crmContacts', contactId), {
          ownerUid: user.uid,
          normalizedCompanyKey: normalizeCompanyKey(compName).slice(0, 120),
          fullName: normEmail.split('@')[0].slice(0, 60) || 'Trade Subscriber',
          companyName: compName,
          roleTitle: 'Market Desk Subscriber',
          email: normEmail.slice(0, 160),
          phoneWhatsapp: '',
          countryPort: 'International Buyer',
          segment: 'Offtaker',
          tagsSummary: alert.category,
          notes: `Auto-captured from Price Alert subscription on ${alert.commodityLabel}.`,
          source: 'Price Alert',
          lastUpdatedMillis: Date.now(),
          createdAt: now,
          updatedAt: now,
        });
        existingEmails.add(normEmail);
        contactsAdded++;
        ops++;
      }

      const alertLeadTitle = `Price Alert: ${alert.commodityLabel}`.slice(0, 180);
      const alertKey = `${normEmail}|${alertLeadTitle.toLowerCase()}`;
      if (!existingLeadKeys.has(alertKey) && ops < 450) {
        const leadId = `lead-alt-${sanitizeIdPart(alert.id).slice(0, 24)}`;
        const compName =
          normEmail.split('@')[1]?.split('.')[0]?.toUpperCase() || 'Prospect Account';
        const valUsd = Math.round(alert.baselinePrice * 20);
        batch.set(doc(db, 'crmLeads', leadId), {
          ownerUid: user.uid,
          normalizedCompanyKey: normalizeCompanyKey(compName).slice(0, 120),
          leadCategory:
            alert.category === 'Critical Minerals' ? 'LITHIUM' : 'AFRICA_SOURCING',
          crmStage: 'PROSPECT',
          winProbability: 15,
          targetFobValue: valUsd,
          weightedValueUsd: Math.round(valUsd * 0.15),
          isCustomLead: true,
          lastUpdatedMillis: Date.now(),
          title: alertLeadTitle,
          contactId: `cnt-alt-${sanitizeIdPart(alert.id).slice(0, 20)}`,
          contactName: normEmail.split('@')[0].slice(0, 60) || 'Subscriber',
          companyName: compName,
          email: normEmail.slice(0, 160),
          phoneWhatsapp: '',
          commodityInterest: `${alert.commodityLabel} (${alert.category})`.slice(0, 200),
          stage: 'New Lead',
          priority: 'Medium',
          dealValueUsd: valUsd,
          followUpDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          source: 'Price Alert',
          notes: `Subscribed to ${alert.triggerDirection} trigger @ ${alert.thresholdValue} (${alert.channel}).`,
          createdAt: now,
          updatedAt: now,
        });
        existingLeadKeys.add(alertKey);
        leadsAdded++;
        ops++;
      }
    }

    if (ops > 0) {
      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'crmContacts/crmLeads sync');
      }
    }

    return { contactsAdded, leadsAdded };
  };

  return (
    <BuyerAuthContext.Provider
      value={{
        user,
        isAdminUser,
        authReady,
        signingIn,
        authError,
        dataLoading,
        dataError,
        profile,
        rfqs,
        shipments,
        tradeDocuments,
        priceAlerts,
        allRfqs,
        allShipments,
        allTradeDocuments,
        allPriceAlerts,
        allBuyers,
        crmContacts,
        crmLeads,
        crmEmails,
        crmTasks,
        marketConfig,
        canonicalProfile,
        unifiedTradeBook,
        duplicateAudit,
        crmActivities,
        kpiSummary,
        lastSyncedAt,
        signInWithGoogle,
        signOutBuyer,
        saveNewRfqToFirestore,
        createPriceAlert,
        togglePriceAlertStatus,
        deletePriceAlert,
        updateBuyerProfile,
        updateRfqDetails,
        appendShipmentNote,
        archiveTradeDocument,
        adminUpdateRfqStatus,
        adminReviewRfq,
        adminUpdateRfq,
        adminDeleteRfq,
        adminCreateShipment,
        adminUpdateShipmentStage,
        adminUpdateShipmentDetails,
        adminDeleteShipment,
        adminCreateTradeDocument,
        adminVerifyTradeDocument,
        adminReviewTradeDocument,
        adminUpdateTradeDocument,
        adminDeleteTradeDocument,
        adminSaveMarketConfig,
        adminToggleBankReadiness,
        adminCreateCrmContact,
        adminUpdateCrmContact,
        adminDeleteCrmContact,
        adminCreateCrmLead,
        adminUpdateCrmLead,
        adminDeleteCrmLead,
        adminCreateCrmEmail,
        adminUpdateCrmEmail,
        adminDeleteCrmEmail,
        adminSyncWebActivityToCrm,
        adminUpsertIntelLead,
        adminMoveLeadStage,
        adminLogActivity,
        adminCreateTask,
        adminToggleTask,
        adminRescheduleTask,
        adminDeleteTask,
        adminImportAndroidRecords,
        adminImportCsvRecords,
        adminTestFirestoreConnection,
        adminSyncSeedCatalogToCloud,
        adminIssueTradeDocument,
        adminCreateRfqFromLead,
      }}
    >
      {children}
    </BuyerAuthContext.Provider>
  );
}

export function useBuyerAuth() {
  const ctx = useContext(BuyerAuthContext);
  if (!ctx) {
    throw new Error('useBuyerAuth must be used inside a BuyerAuthProvider');
  }
  return ctx;
}
